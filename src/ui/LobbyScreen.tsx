import React, { useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import {
  ClipboardList,
  Crown,
  Download,
  Heart,
  Image as ImageIcon,
  MessageSquare,
  RefreshCw,
  Settings,
  Sparkles,
  Users,
  Volume2,
  VolumeX,
} from 'lucide-react';
import { DAILY_DUNGEON_FREE_ENTRIES, DUNGEONS } from '../data/dungeons';
import { ENEMIES } from '../data/enemies';
import { HEROES, HERO_MAP, resolveHeroVisuals } from '../data/heroes';
import { getHeroLobbyLines } from '../data/heroVoiceLines';
import { PETS, PET_MAP } from '../data/pets';
import { RELICS } from '../data/relics';
import { REGION_MAP, REGIONS } from '../data/regions';
import { SPIRE_MAX_FLOOR } from '../data/spire';
import {
  CAMPAIGN_DIFFICULTIES,
  CAMPAIGN_DIFFICULTY_MAP,
  encodeRegionChestKey,
  getCampaignStageById,
  getHighestUnlockedStage,
  getStagesByRegion,
  isDifficultyUnlocked,
  isStageUnlocked,
} from '../data/stages';
import { audioManager } from '../engine/AudioManager';
import {
  computeHeroStats,
  getActivePetPower,
  getSquadSynergyPills,
} from '../engine/CombatMath';
import { usePwaInstall } from '../hooks/usePwaInstall';
import { CODEX_MILESTONES, DAILY_SUPPLY_COOLDOWN_MS, usePlayerStore } from '../store/usePlayerStore';
import { useSettingsStore } from '../store/useSettingsStore';
import type { DungeonId, Faction, ScreenId } from '../types/game';
import { ArtImage } from './ArtImage';
import { CommissionsModal } from './CommissionsModal';
import { GameIcon } from './GameIcon';
import { Live2DLobbyStage } from './Live2DLobbyStage';
import { PartyManagerModal } from './PartyManagerModal';
import { RarityCrest, RoleBadge } from './RoleBadge';
import { SettingsModal } from './SettingsModal';
import { StarlightBackdrop } from './StarlightBackdrop';
import { WorldMapOverlay } from './WorldMapOverlay';

interface LobbyScreenProps {
  onNavigate: (screen: ScreenId) => void;
  onStartCombat: (stageId: string) => void;
  onOpenDungeon: (dungeonId?: DungeonId, faction?: Faction) => void;
}

const ModeArtBanner: React.FC<{ primarySrc: string; fallbackSrc: string; alt: string }> = ({
  primarySrc,
  fallbackSrc,
  alt,
}) => {
  const [fallback, setFallback] = useState(false);
  return (
    <img
      src={fallback ? fallbackSrc : primarySrc}
      alt={alt}
      onError={() => {
        if (!fallback) setFallback(true);
      }}
      className="absolute inset-0 w-full h-full object-cover object-center group-hover:scale-105 transition duration-500"
      draggable={false}
    />
  );
};

export const LobbyScreen: React.FC<LobbyScreenProps> = ({
  onNavigate,
  onStartCombat,
  onOpenDungeon,
}) => {
  const {
    commanderName,
    favoriteHeroId,
    setFavoriteHero,
    gold,
    starlightCrystals,
    squadIds,
    partyPresets,
    activePresetIndex,
    roster,
    relicRanks,
    ownedPets,
    activePetId,
    equipmentInventory,
    unlockedCodexIds,
    claimedCodexMilestones,
    claimedRegionChests,
    clearedStages,
    selectedStageId,
    selectedDifficulty,
    lastDailySupplyAt,
    dungeonTickets,
    dungeonEntriesUsed,
    dungeonResetDay,
    spireHighestFloor,
    getDungeonEntriesLeft,
    getClaimableCommissionsCount,
    claimDailySupply,
  } = usePlayerStore();

  const { muted, toggleMuted, lobbySceneId, setLobbySceneId } = useSettingsStore();
  const { canInstall, promptInstall } = usePwaInstall();
  const [showMap, setShowMap] = useState(false);
  const [showPartyModal, setShowPartyModal] = useState(false);
  const [showCommissions, setShowCommissions] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showDialogue, setShowDialogue] = useState(true);
  const [lineIndex, setLineIndex] = useState(0);
  const [tapPulseKey, setTapPulseKey] = useState(0);
  const [tapHearts, setTapHearts] = useState<Array<{ id: number; dx: number; dy: number; isHeart: boolean }>>([]);
  const [supplyToast, setSupplyToast] = useState<string | null>(null);
  const [parallax, setParallax] = useState({ x: 0, y: 0 });

  const totalDungeonFreeLeft = useMemo(
    () => DUNGEONS.reduce((sum, d) => sum + getDungeonEntriesLeft(d.id).freeLeft, 0),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [dungeonEntriesUsed, dungeonResetDay, getDungeonEntriesLeft],
  );
  const totalDungeonDailyMax = DUNGEONS.length * DAILY_DUNGEON_FREE_ENTRIES;

  const ownedHeroIds = Object.keys(roster);
  const displayHeroId = roster[favoriteHeroId] ? favoriteHeroId : squadIds[0];
  const displayHero = HERO_MAP[displayHeroId] ?? HERO_MAP.vaelen;
  const displayOwned = roster[displayHero.id];
  const displayVisuals = resolveHeroVisuals(displayHero, displayOwned);
  const petsMap = ownedPets ?? {};
  const activeOwnedPet = activePetId && petsMap[activePetId] ? petsMap[activePetId] : null;
  const activePetDef = activeOwnedPet ? PET_MAP[activeOwnedPet.petId] ?? null : null;
  const activePreset = partyPresets[activePresetIndex] ?? partyPresets[0];
  const dailySupplyReady = Date.now() - (lastDailySupplyAt ?? 0) >= DAILY_SUPPLY_COOLDOWN_MS;

  const squadPower = useMemo(
    () =>
      squadIds.reduce((sum, id) => {
        const def = HERO_MAP[id];
        const owned = roster[id];
        if (!def || !owned) return sum;
        return (
          sum +
          computeHeroStats(
            def,
            owned,
            equipmentInventory,
            squadIds,
            unlockedCodexIds.length,
            relicRanks,
            { roster, activePet: activeOwnedPet },
          ).powerRating
        );
      }, 0) + getActivePetPower(activePetId, petsMap),
    [
      squadIds,
      roster,
      equipmentInventory,
      unlockedCodexIds.length,
      relicRanks,
      activeOwnedPet,
      activePetId,
      petsMap,
    ],
  );

  const synergyPills = useMemo(
    () => getSquadSynergyPills(squadIds, roster, activePetId, petsMap),
    [squadIds, roster, activePetId, petsMap],
  );
  const claimableCommissions = getClaimableCommissionsCount();
  const claimableCodex = CODEX_MILESTONES.some(
    (m) => unlockedCodexIds.length >= m.threshold && !claimedCodexMilestones.includes(m.threshold),
  );
  const hasClaimableRegionChest = useMemo(
    () =>
      CAMPAIGN_DIFFICULTIES.some((diffCfg) => {
        if (!isDifficultyUnlocked(diffCfg.id, clearedStages)) return false;
        return REGIONS.some((r) => {
          const chestKey = encodeRegionChestKey(r.id, diffCfg.id);
          if ((claimedRegionChests ?? []).includes(chestKey)) return false;
          const stages = getStagesByRegion(r.id, diffCfg.id);
          return stages.length > 0 && stages.every((s) => clearedStages.includes(s.id));
        });
      }),
    [clearedStages, claimedRegionChests],
  );

  // Respect active Campaign World Level & strict sequential progression
  const activeDifficulty =
    selectedDifficulty && isDifficultyUnlocked(selectedDifficulty, clearedStages)
      ? selectedDifficulty
      : 'NORMAL';
  const activeDifficultyCfg = CAMPAIGN_DIFFICULTY_MAP[activeDifficulty];

  const selectedStage = useMemo(() => {
    const saved = getCampaignStageById(selectedStageId);
    if (
      saved &&
      (saved.difficulty ?? 'NORMAL') === activeDifficulty &&
      isStageUnlocked(saved, clearedStages)
    ) {
      return saved;
    }
    return getHighestUnlockedStage(clearedStages, activeDifficulty);
  }, [selectedStageId, clearedStages, activeDifficulty]);

  const selectedRegion = REGION_MAP[selectedStage.regionId] ?? REGIONS[0];

  // Dynamic Lobby Scene presets: Aurelia Citadel + Active Chapter + unlocked/scenic Chapter Skies!
  const lobbySceneOptions = useMemo(() => {
    const unlockedChapterIds = new Set<string>(['region_1', 'region_2', 'region_3', selectedRegion.id]);
    for (const r of REGIONS) {
      const stages = getStagesByRegion(r.id);
      if (stages.length > 0 && isStageUnlocked(stages[0], clearedStages)) {
        unlockedChapterIds.add(r.id);
      }
    }
    const opts: Array<{ id: string; label: string; bgAsset: string; motes: [string, string] }> = [
      {
        id: 'CITADEL',
        label: 'Aurelia Citadel',
        bgAsset: '/assets/environments/bg_lobby_aurelia.webp',
        motes: ['#fde047', '#7dd3fc'],
      },
      {
        id: 'AUTO_CHAPTER',
        label: `Auto • Ch.${selectedRegion.chapter}`,
        bgAsset: selectedRegion.arenaAsset,
        motes: [
          selectedRegion.themeColor,
          `#${selectedRegion.ambientMoteColors[1].toString(16).padStart(6, '0')}`,
        ],
      },
    ];
    for (const r of REGIONS) {
      if (!unlockedChapterIds.has(r.id)) continue;
      opts.push({
        id: r.id,
        label: `Ch.${r.chapter} ${r.name}`,
        bgAsset: r.arenaAsset,
        motes: [
          r.themeColor,
          `#${r.ambientMoteColors[1].toString(16).padStart(6, '0')}`,
        ],
      });
    }
    return opts;
  }, [clearedStages, selectedRegion]);

  const activeLobbyScene =
    lobbySceneOptions.find((o) => o.id === lobbySceneId) ?? lobbySceneOptions[0];

  const cycleLobbyScene = () => {
    const idx = lobbySceneOptions.findIndex((o) => o.id === activeLobbyScene.id);
    const next = lobbySceneOptions[(idx + 1) % lobbySceneOptions.length];
    if (next) {
      setLobbySceneId(next.id);
      audioManager.playSfx('button');
    }
  };

  const heroLines = useMemo(
    () => getHeroLobbyLines(displayHero.id, displayOwned?.bondLevel ?? 1),
    [displayHero.id, displayOwned?.bondLevel],
  );
  const currentDialogueText = heroLines[lineIndex % heroLines.length] ?? displayHero.quote;

  const handleHeroTapReaction = () => {
    setShowDialogue(true);
    setLineIndex((i) => (i + 1) % heroLines.length);
    const burstKey = Date.now() + Math.random();
    setTapPulseKey(burstKey);
    const newParticles = Array.from({ length: 7 }, (_, i) => ({
      id: burstKey + i,
      dx: (i - 3) * 28 + (Math.random() - 0.5) * 24,
      dy: -(75 + Math.random() * 90),
      isHeart: i % 2 === 0,
    }));
    setTapHearts(newParticles);
    window.setTimeout(() => {
      setTapHearts((prev) => prev.filter((p) => p.id < burstKey || p.id >= burstKey + 10));
    }, 950);
    audioManager.playSynthSfx('lobby_tap');
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const nx = (e.clientX / window.innerWidth - 0.5) * 2;
    const ny = (e.clientY / window.innerHeight - 0.5) * 2;
    setParallax({ x: nx, y: ny });
  };

  const cycleFavorite = () => {
    const idx = ownedHeroIds.indexOf(displayHero.id);
    const nextId = ownedHeroIds[(idx + 1) % ownedHeroIds.length];
    if (nextId) {
      setFavoriteHero(nextId);
      setLineIndex(0);
      setShowDialogue(true);
      audioManager.playSfx('button');
    }
  };

  return (
    <div
      onMouseMove={handleMouseMove}
      className="relative w-full h-full overflow-hidden select-none"
    >
      {/* LAYER 0: Dynamic Chapter / Citadel Sky Terrace + Biome-Matched Animated Embers */}
      <StarlightBackdrop
        variant="LOBBY"
        accentColor={displayHero.themeColor}
        bgAsset={activeLobbyScene.bgAsset}
        moteColors={activeLobbyScene.motes}
      />

      {/* LAYER 1: Full-Height Interactive Standing Anime Champion (Tap for Reaction & Voice Lines!) */}
      {displayHero.assets.standing.includes('/assets/standing/') ? (
        <div
          className="pointer-events-none absolute inset-0 sm:inset-y-0 sm:left-0 sm:w-[58%] md:w-[62%] flex items-end justify-center sm:justify-start sm:pl-4 md:pl-10 lg:pl-14 z-10 overflow-hidden pb-36 sm:pb-8 md:pb-10"
          style={{
            transform: `translate3d(${parallax.x * -12}px, ${parallax.y * -5}px, 0)`,
            transition: 'transform 0.18s ease-out',
          }}
        >
          {/* Ambient Faction Backlight Halo behind shoulders (pulses brightly on Hero tap!) */}
          <motion.div
            key={`aura_${tapPulseKey}`}
            initial={{ scale: 1.28, opacity: 0.78 }}
            animate={{ scale: 1, opacity: 0.42 }}
            transition={{ duration: 0.65, ease: 'easeOut' }}
            className="absolute bottom-[20%] left-1/2 -translate-x-1/2 sm:translate-x-0 sm:left-[12%] w-[280px] sm:w-[380px] md:w-[460px] h-[280px] sm:h-[380px] md:h-[460px] rounded-full blur-3xl"
            style={{
              background: `radial-gradient(circle, ${displayHero.themeColor}cc 0%, transparent 70%)`,
            }}
          />

          {/* Illuminated Celestial Magic Rune Pedestal beneath Hero's Boots */}
          <div className="absolute bottom-[34%] sm:bottom-5 md:bottom-7 left-1/2 -translate-x-1/2 sm:translate-x-0 sm:left-[8%] md:left-[12%] w-[260px] sm:w-[360px] md:w-[440px] h-[72px] sm:h-[96px] flex items-center justify-center">
            <div
              className="absolute inset-0 rounded-full opacity-55 blur-xl"
              style={{
                background: `radial-gradient(ellipse at center, ${displayHero.themeColor}88 0%, transparent 72%)`,
              }}
            />
            <div
              className="w-[88%] h-[68%] rounded-full border-2 opacity-55 animate-pulse"
              style={{
                borderColor: displayHero.themeColor,
                boxShadow: `0 0 28px ${displayHero.themeColor}88, inset 0 0 20px ${displayHero.themeColor}55`,
              }}
            />
            <div className="absolute w-[62%] h-[42%] rounded-full bg-black/55 blur-md" />
          </div>

          {/* Live2D-Style Breathing, Wind-Sway, Specular Glint & Elemental Aura Standing Champion! */}
          <div className="relative flex items-end justify-center">
            {/* Floating Tap Reaction Hearts & Faction Sparkles */}
            <AnimatePresence>
              {tapHearts.map((p) => (
                <motion.div
                  key={p.id}
                  initial={{ opacity: 0.95, x: 0, y: -220, scale: 0.5 }}
                  animate={{ opacity: 0, x: p.dx, y: -220 + p.dy, scale: 1.25 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.88, ease: 'easeOut' }}
                  className="pointer-events-none absolute bottom-12 left-1/2 z-30"
                  style={{ color: p.isHeart ? '#fb7185' : displayHero.themeColor }}
                >
                  {p.isHeart ? (
                    <Heart className="w-4 h-4 fill-rose-400 drop-shadow-[0_0_8px_rgba(251,113,133,0.9)]" />
                  ) : (
                    <Sparkles className="w-4 h-4 drop-shadow-[0_0_10px_rgba(253,224,71,0.95)]" />
                  )}
                </motion.div>
              ))}
            </AnimatePresence>

            <Live2DLobbyStage
              heroId={displayHero.id}
              heroName={displayHero.name}
              src={displayVisuals.standing}
              faction={displayHero.faction}
              tier={displayHero.tier}
              transcended={Boolean(displayOwned?.transcended)}
              themeColor={displayOwned?.transcended ? '#fde047' : displayHero.themeColor}
              parallaxX={parallax.x}
              parallaxY={parallax.y}
              tapPulseKey={tapPulseKey}
              onTap={handleHeroTapReaction}
            />

            {/* Floating Active Companion Pet beside Lobby Champion! */}
            {activePetDef && activeOwnedPet && (
              <motion.button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  audioManager.playSfx('ult_chime', 0.12);
                  setSupplyToast(
                    `🐾 ${activePetDef.name} (R${activeOwnedPet.rank} Lv.${activeOwnedPet.level}): "${activePetDef.quote}"`,
                  );
                  window.setTimeout(() => setSupplyToast(null), 2800);
                }}
                animate={{ y: [0, -12, 0] }}
                transition={{ duration: 3.1, repeat: Infinity, ease: 'easeInOut' }}
                title={`${activePetDef.name} — ${activePetDef.activeSkill.name}`}
                className="pointer-events-auto absolute right-2 sm:-right-8 bottom-[36%] sm:bottom-[30%] z-30 flex flex-col items-center group focus:outline-none"
              >
                <div
                  className="pointer-events-none absolute inset-0 rounded-full blur-2xl opacity-55 group-hover:opacity-85 transition"
                  style={{ background: activePetDef.themeColor }}
                />
                <ArtImage
                  kind="PET"
                  id={activePetDef.id}
                  src={activePetDef.assets.sprite}
                  alt={activePetDef.name}
                  className="relative w-20 h-20 sm:w-28 sm:h-28 md:w-32 md:h-32 object-contain group-hover:scale-110 transition-transform"
                  style={{
                    filter: `drop-shadow(0 12px 20px rgba(0,0,0,0.9)) drop-shadow(0 0 18px ${activePetDef.themeColor}88)`,
                  }}
                />
                <span
                  className="relative -mt-1 px-2 py-0.5 rounded-full bg-slate-950/90 border text-[9px] font-display font-black uppercase tracking-wider text-white shadow-lg"
                  style={{ borderColor: `${activePetDef.themeColor}99` }}
                >
                  🐾 {activePetDef.name} R{activeOwnedPet.rank}
                </span>
              </motion.button>
            )}
          </div>
        </div>
      ) : (
        /* Seamless Full-Bleed Splash Art fallback for heroes without transparent standing art yet */
        <div
          className="pointer-events-none absolute inset-0 sm:inset-y-0 sm:left-0 sm:w-[66%] md:w-[68%] z-10 overflow-hidden"
          style={{
            transform: `translate3d(${parallax.x * -10}px, ${parallax.y * -5}px, 0)`,
            transition: 'transform 0.18s ease-out',
            WebkitMaskImage:
              'linear-gradient(to right, rgba(0,0,0,1) 0%, rgba(0,0,0,0.96) 54%, rgba(0,0,0,0.45) 78%, rgba(0,0,0,0) 98%)',
            maskImage:
              'linear-gradient(to right, rgba(0,0,0,1) 0%, rgba(0,0,0,0.96) 54%, rgba(0,0,0,0.45) 78%, rgba(0,0,0,0) 98%)',
          }}
        >
          <div
            className="relative w-full h-full animate-breathe cursor-pointer pointer-events-auto"
            onClick={handleHeroTapReaction}
          >
            <ArtImage
              kind="HERO"
              id={displayHero.id}
              src={displayHero.assets.standing}
              alt={displayHero.name}
              className="w-full h-full object-cover object-top"
            />
            <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-[#060916]/90 via-transparent to-[#060916]/40" />
          </div>
        </div>
      )}

      {/* LAYER 2: Floating Responsive Anime RPG HUD (Portrait, Mobile Landscape & Desktop!) */}
      <div className="relative z-20 w-full h-full flex flex-col justify-between safe-area-pad sm:p-3 md:p-5 ls-compact-pad pointer-events-none">
        {/* TOP FLOATING CORNERS */}
        <div className="flex items-start justify-between gap-2">
          {/* Top-Left: Commander Crest */}
          <div className="pointer-events-auto flex items-center gap-2 sm:gap-2.5 rpg-panel-subtle px-2.5 sm:px-3.5 py-1 sm:py-1.5 border-l-4 border-l-amber-400 min-w-0">
            <GameIcon name="summon" className="w-6 h-6 sm:w-8 sm:h-8" />
            <div className="pl-0.5 min-w-0">
              <div className="font-display text-xs sm:text-sm md:text-base font-extrabold tracking-[0.12em] sm:tracking-[0.16em] text-white text-glow-gold leading-none truncate">
                STARLIGHT CHASERS
              </div>
              <div className="flex items-center gap-1.5 text-[10px] sm:text-[11px] text-slate-300 mt-0.5">
                <span className="font-bold text-amber-300 hidden md:inline">{commanderName}</span>
                <span className="text-slate-500 hidden md:inline">◆</span>
                <span className="font-mono text-cyan-300 font-bold">
                  PWR {squadPower.toLocaleString()}
                </span>
              </div>
            </div>
          </div>

          {/* Top-Right: Resource Capsules + PWA Install + Audio */}
          <div className="pointer-events-auto flex items-center justify-end gap-1.5 sm:gap-2 shrink-0">
            <div className="rpg-panel-subtle px-2 sm:px-3 py-1 sm:py-1.5 flex items-center gap-1.5 text-[11px] sm:text-xs font-bold">
              <GameIcon name="crystal" className="w-4 h-4 sm:w-5 sm:h-5" />
              <span className="font-mono text-white">{starlightCrystals.toLocaleString()}</span>
            </div>
            <div className="rpg-panel-subtle px-2 sm:px-3 py-1 sm:py-1.5 hidden xs:flex sm:flex items-center gap-1.5 text-[11px] sm:text-xs font-bold">
              <GameIcon name="gold" className="w-4 h-4 sm:w-5 sm:h-5" />
              <span className="font-mono text-amber-200">{gold.toLocaleString()}</span>
            </div>
            {canInstall && (
              <button
                onClick={() => {
                  audioManager.playSfx('button');
                  promptInstall();
                }}
                className="rpg-panel-subtle border-cyan-400/70 px-2.5 py-1 sm:py-1.5 text-[11px] font-black uppercase tracking-wider text-cyan-200 flex items-center gap-1 hover:bg-cyan-500/20"
                title="Install Starlight Chasers PWA"
              >
                <Download className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Install</span>
              </button>
            )}
            <button
              onClick={() => {
                const res = claimDailySupply();
                setSupplyToast(res.message);
                window.setTimeout(() => setSupplyToast(null), 3000);
                audioManager.playSfx(res.ok ? 'ssr_reveal' : 'button');
              }}
              title="Claim 4h Commander Supply Dispatch (Gold, Crystals, EXP, Stones & Essences)"
              className={`rpg-panel-subtle hover:border-amber-400 px-2 sm:px-3 py-1 sm:py-1.5 text-[11px] font-extrabold uppercase flex items-center gap-1.5 transition relative ${
                dailySupplyReady ? 'text-amber-300 border-amber-400/60' : 'text-slate-400'
              }`}
            >
              <GameIcon name="supply" className="w-4 h-4 sm:w-5 sm:h-5" />
              <span className="hidden md:inline">{dailySupplyReady ? 'Daily Supply' : 'Supply'}</span>
              {dailySupplyReady && (
                <span className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.9)] animate-pulse" />
              )}
            </button>
            <button
              onClick={() => {
                audioManager.playSfx('button');
                setShowCommissions(true);
              }}
              className={`relative rpg-panel-subtle px-2 sm:px-3 py-1 sm:py-1.5 text-[10px] sm:text-xs font-display font-black uppercase tracking-wider flex items-center gap-1 transition ${
                claimableCommissions > 0
                  ? 'border-amber-300/90 text-amber-200 hover:bg-amber-400/20 shadow-[0_0_16px_rgba(245,200,76,0.35)]'
                  : 'text-slate-200 hover:border-amber-400/70 hover:text-amber-200'
              }`}
              title="Chaser Commissions — Daily Quests & Commander Milestones"
            >
              <ClipboardList className="w-3.5 h-3.5 text-amber-300" />
              <span className="hidden md:inline">Quests</span>
              {claimableCommissions > 0 && (
                <span className="absolute -top-1.5 -right-1.5 min-w-[18px] h-[18px] px-1 rounded-full bg-rose-500 border border-amber-200 text-white text-[9px] font-mono font-black flex items-center justify-center shadow-[0_0_10px_rgba(244,63,94,0.9)] animate-pulse">
                  {claimableCommissions}
                </span>
              )}
            </button>
            <button
              onClick={() => toggleMuted()}
              className="rpg-panel-subtle p-1.5 sm:p-2 text-slate-200 hover:text-amber-300 transition"
              title="Toggle Music & SFX"
            >
              {muted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
            </button>
            <button
              onClick={() => {
                audioManager.playSfx('button');
                setShowSettings(true);
              }}
              className="rpg-panel-subtle p-1.5 sm:p-2 text-slate-200 hover:text-amber-300 hover:border-amber-400/70 transition"
              title="Game Settings, Manual Save, Export & Import"
              aria-label="Open Settings"
            >
              <Settings className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* MIDDLE LAYER: Speech Ribbon (Left) + Sculpted RPG Command Crests (Right) */}
        <div className="flex-1 flex flex-col sm:flex-row items-stretch sm:items-center justify-end sm:justify-between gap-2 my-1 min-h-0">
          {/* Left Floating Interactive Hero Dialogue, Hero Switcher & Dynamic Chapter Scene Switcher */}
          <div className="flex flex-col items-start justify-end sm:h-full sm:pb-2 sm:pl-1 max-w-xs md:max-w-sm">
            {showDialogue && (
              <motion.button
                type="button"
                onClick={handleHeroTapReaction}
                key={`dlg_${displayHero.id}_${lineIndex}`}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.22 }}
                title="Tap to hear another line"
                className="pointer-events-auto hidden md:block ls-hide text-left rpg-panel-subtle hover:border-cyan-300/60 px-3.5 py-2.5 mb-2 border-l-2 border-l-cyan-400 transition"
              >
                <div className="flex items-center justify-between gap-2 mb-1">
                  <div className="flex items-center gap-1.5 min-w-0">
                    <RarityCrest tier={displayHero.tier} size="xs" />
                    <RoleBadge role={displayHero.role} variant="medallion" size="sm" />
                    <span className="font-display font-bold text-sm text-white truncate">
                      {displayHero.name}
                    </span>
                    <span className="text-[10px] text-amber-300/90 uppercase truncate">
                      • {displayVisuals.title}
                    </span>
                  </div>
                  <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full bg-rose-500/20 border border-rose-400/50 text-[9px] font-mono font-bold text-rose-200 shrink-0">
                    <Heart className="w-2.5 h-2.5 fill-rose-400 text-rose-400" />
                    Lv.{displayOwned?.bondLevel ?? 1}
                  </span>
                </div>
                <p className="text-xs text-slate-200 italic leading-snug flex items-start gap-1.5">
                  <MessageSquare className="w-3.5 h-3.5 text-cyan-300 shrink-0 mt-0.5" />
                  <span>“{currentDialogueText}”</span>
                </p>
                <div className="mt-1 flex items-center justify-between text-[9px] text-slate-400">
                  <span>Tap hero to interact</span>
                  <span className="font-mono text-cyan-300/80">
                    {(lineIndex % heroLines.length) + 1}/{heroLines.length}
                  </span>
                </div>
              </motion.button>
            )}

            <div className="flex flex-wrap items-center gap-1.5">
              <button
                onClick={cycleFavorite}
                className="pointer-events-auto rpg-panel-subtle hover:border-amber-400/80 px-2.5 py-1 text-[10px] sm:text-[11px] font-bold uppercase tracking-wider text-slate-200 hover:text-amber-300 flex items-center gap-1.5 transition"
                title="Switch displayed Lobby Hero"
              >
                <RefreshCw className="w-3 h-3 text-cyan-300" />
                <span>
                  {displayHero.name} Lv.{displayOwned?.level ?? 1} ({ownedHeroIds.length}/{HEROES.length})
                </span>
              </button>

              <button
                onClick={cycleLobbyScene}
                className="pointer-events-auto rpg-panel-subtle hover:border-cyan-400/80 px-2.5 py-1 text-[10px] sm:text-[11px] font-bold uppercase tracking-wider text-cyan-200 hover:text-white flex items-center gap-1.5 transition"
                title="Cycle Living Lobby Backdrop Scene (Citadel / Auto Chapter / Unlocked Chapters)"
              >
                <ImageIcon className="w-3 h-3 text-amber-300" />
                <span className="max-w-[130px] truncate">{activeLobbyScene.label}</span>
              </button>
            </div>
          </div>

          {/* Right Side Sculpted RPG Crest Menu Cards (4 Core Menus: Heroes, Shop, Summon, Codex) */}
          <div className="pointer-events-auto sm:ml-auto grid grid-cols-4 sm:flex sm:flex-col items-stretch gap-1.5 sm:gap-2 w-full sm:w-[250px] md:w-[345px] ls-tight-gap">
            {/* Crest Card 1: Heroes & Forge */}
            <button
              onClick={() => {
                audioManager.playSfx('button');
                onNavigate('SQUAD');
              }}
              className="rpg-blade px-2 sm:px-3.5 py-2 sm:py-2 md:py-2.5 text-left flex flex-col sm:flex-row items-center justify-between gap-1 group"
            >
              <div className="flex flex-col sm:flex-row items-center gap-1 sm:gap-3">
                <div className="relative flex items-center justify-center shrink-0">
                  <div className="absolute inset-0 rounded-full bg-amber-400/25 blur-md group-hover:bg-amber-400/45 transition" />
                  <GameIcon
                    name="heroes"
                    className="relative w-8 h-8 sm:w-8 sm:h-8 md:w-10 md:h-10 group-hover:scale-110 transition"
                  />
                </div>
                <div className="text-center sm:text-left">
                  <div className="font-display font-black text-[10px] sm:text-xs md:text-base tracking-wider text-white group-hover:text-amber-300 leading-tight">
                    HEROES
                  </div>
                  <div className="hidden md:block ls-hide text-[11px] text-slate-400">
                    Growth • +15 Forge • Relics
                  </div>
                </div>
              </div>
              <span className="hidden sm:inline px-2 py-0.5 rounded-full bg-amber-400/15 border border-amber-400/40 font-mono text-[10px] font-bold text-amber-200">
                {ownedHeroIds.length}/{HEROES.length}
              </span>
            </button>

            {/* Crest Card 2: Starlight Shop Emporium */}
            <button
              onClick={() => {
                audioManager.playSfx('button');
                onNavigate('SHOP');
              }}
              className="rpg-blade px-2 sm:px-3.5 py-2 sm:py-2 md:py-2.5 text-left flex flex-col sm:flex-row items-center justify-between gap-1 group border-emerald-400/45 hover:border-emerald-300"
            >
              <div className="flex flex-col sm:flex-row items-center gap-1 sm:gap-3">
                <div className="relative flex items-center justify-center shrink-0">
                  <div className="absolute inset-0 rounded-full bg-emerald-400/25 blur-md group-hover:bg-emerald-400/45 transition" />
                  <GameIcon
                    name="shop"
                    className="relative w-8 h-8 sm:w-8 sm:h-8 md:w-10 md:h-10 group-hover:scale-110 transition"
                  />
                </div>
                <div className="text-center sm:text-left">
                  <div className="font-display font-black text-[10px] sm:text-xs md:text-base tracking-wider text-white group-hover:text-emerald-300 leading-tight">
                    SHOP
                  </div>
                  <div className="hidden md:block ls-hide text-[11px] text-emerald-200/75">
                    Awaken • EXP • Forge • Relic Vault
                  </div>
                </div>
              </div>
              <span className="hidden sm:inline px-2 py-0.5 rounded-full bg-emerald-400/15 border border-emerald-400/40 font-mono text-[10px] font-bold text-emerald-200">
                OPEN
              </span>
            </button>

            {/* Crest Card 3: Starlight Summon */}
            <button
              onClick={() => {
                audioManager.playSfx('button');
                onNavigate('GACHA');
              }}
              className="rpg-blade px-2 sm:px-3.5 py-2 sm:py-2 md:py-2.5 text-left flex flex-col sm:flex-row items-center justify-between gap-1 group border-cyan-400/50 hover:border-cyan-300"
            >
              <div className="flex flex-col sm:flex-row items-center gap-1 sm:gap-3">
                <div className="relative flex items-center justify-center shrink-0">
                  <div className="absolute inset-0 rounded-full bg-cyan-400/25 blur-md group-hover:bg-cyan-400/45 transition" />
                  <GameIcon
                    name="summon"
                    className="relative w-8 h-8 sm:w-8 sm:h-8 md:w-10 md:h-10 group-hover:scale-110 transition"
                  />
                </div>
                <div className="text-center sm:text-left">
                  <div className="font-display font-black text-[10px] sm:text-xs md:text-base tracking-wider text-white group-hover:text-cyan-300 leading-tight">
                    SUMMON
                  </div>
                  <div className="hidden md:block ls-hide text-[11px] text-fuchsia-200/90 font-semibold">
                    ❖ UR Event &amp; 🐾 Pet Summon
                  </div>
                </div>
              </div>
              <span className="hidden sm:inline px-2 py-0.5 rounded-full bg-cyan-400/20 border border-cyan-400/50 text-[10px] font-mono font-extrabold text-cyan-200">
                {Math.floor(starlightCrystals / 160)}×
              </span>
            </button>

            {/* Crest Card 4: Starlight Codex */}
            <button
              onClick={() => {
                audioManager.playSfx('button');
                onNavigate('CODEX');
              }}
              className="rpg-blade px-2 sm:px-3.5 py-2 sm:py-2 md:py-2.5 text-left flex flex-col sm:flex-row items-center justify-between gap-1 group relative border-fuchsia-400/45 hover:border-fuchsia-300"
            >
              <div className="flex flex-col sm:flex-row items-center gap-1 sm:gap-3">
                <div className="relative flex items-center justify-center shrink-0">
                  <div className="absolute inset-0 rounded-full bg-fuchsia-400/25 blur-md group-hover:bg-fuchsia-400/45 transition" />
                  <GameIcon
                    name="codex"
                    className="relative w-8 h-8 sm:w-8 sm:h-8 md:w-10 md:h-10 group-hover:scale-110 transition"
                  />
                </div>
                <div className="text-center sm:text-left">
                  <div className="font-display font-black text-[10px] sm:text-xs md:text-base tracking-wider text-white group-hover:text-fuchsia-300 leading-tight">
                    CODEX
                  </div>
                  <div className="hidden md:block ls-hide text-[11px] text-slate-400">
                    +{Math.floor(unlockedCodexIds.length / 5)}% Global Account Stats
                  </div>
                </div>
              </div>
              {claimableCodex ? (
                <span className="sm:static absolute top-1.5 right-1.5 w-5 h-5 rounded-full bg-rose-500 text-white text-[10px] font-black flex items-center justify-center animate-pulse shadow-[0_0_12px_rgba(244,63,94,0.85)]">
                  !
                </span>
              ) : (
                <span className="hidden sm:inline px-2 py-0.5 rounded-full bg-fuchsia-400/15 border border-fuchsia-400/40 font-mono text-[10px] text-fuchsia-200">
                  {unlockedCodexIds.length}/{HEROES.length + PETS.length + RELICS.length + ENEMIES.length}
                </span>
              )}
            </button>
          </div>
        </div>

        {/* BOTTOM DOCK: Active Squad Emblem Strip + Royal Gold Sculpted BATTLE Crest */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-end justify-between gap-2 sm:gap-3 mt-1">
          {/* Active Deployed Squad Portraits — Opens Dedicated 3-Preset Party Manager! */}
          <button
            onClick={() => {
              audioManager.playSfx('button');
              setShowPartyModal(true);
            }}
            className="pointer-events-auto rpg-panel-subtle px-2.5 sm:px-3 py-1.5 flex items-center justify-between sm:justify-start gap-2.5 hover:border-amber-400/80 transition group"
          >
            <div className="flex items-center gap-1.5">
              {squadIds.map((hid, idx) => {
                const h = HERO_MAP[hid];
                if (!h) return null;
                return (
                  <div
                    key={`${hid}_${idx}`}
                    className="relative w-9 h-9 sm:w-9 sm:h-9 md:w-11 md:h-11 rounded-lg overflow-hidden border-2 bg-slate-950 shadow-md"
                    style={{ borderColor: h.themeColor }}
                  >
                    <ArtImage
                      kind="HERO"
                      id={hid}
                      src={resolveHeroVisuals(h, roster[hid]).card}
                      alt={h.name}
                      className="w-full h-full object-cover object-top"
                    />
                    <span className="absolute bottom-0 inset-x-0 bg-black/85 text-[8px] font-mono font-bold text-center text-amber-300 leading-tight">
                      {roster[hid]?.level ?? 1}
                    </span>
                  </div>
                );
              })}
              {activePetDef && activeOwnedPet && (
                <div
                  className="relative w-9 h-9 sm:w-9 sm:h-9 md:w-11 md:h-11 rounded-full overflow-hidden border-2 bg-slate-950 shadow-md p-0.5 flex items-center justify-center"
                  style={{ borderColor: activePetDef.themeColor }}
                  title={`Companion Pet: ${activePetDef.name} (R${activeOwnedPet.rank} Lv.${activeOwnedPet.level})`}
                >
                  <ArtImage
                    kind="PET"
                    id={activePetDef.id}
                    src={activePetDef.assets.sprite}
                    alt={activePetDef.name}
                    className="w-full h-full object-contain"
                  />
                  <span className="absolute bottom-0 inset-x-0 bg-black/85 text-[7px] font-mono font-bold text-center text-cyan-200 leading-tight">
                    R{activeOwnedPet.rank}
                  </span>
                </div>
              )}
            </div>
            <div className="text-right sm:text-left pr-1">
              <div className="text-[9px] uppercase tracking-widest text-amber-300 font-black flex items-center justify-end sm:justify-start gap-1 leading-none">
                <Users className="w-3 h-3" />
                <span>
                  P{activePresetIndex + 1}: {activePreset.name}
                </span>
              </div>
              {synergyPills.length > 0 ? (
                <div className="flex items-center justify-end sm:justify-start gap-1 text-[11px] font-bold mt-1">
                  <Crown
                    className="w-3 h-3"
                    style={{ color: synergyPills[0].color }}
                  />
                  <span style={{ color: synergyPills[0].color }}>
                    {synergyPills[0].shortLabel}
                  </span>
                </div>
              ) : (
                <div className="text-[11px] text-cyan-200 font-bold mt-0.5 group-hover:text-amber-200">
                  Manage Party →
                </div>
              )}
            </div>
          </button>

          {/* Illustrated Art-Style Mode Cards: RIFT DUNGEONS + ASTRAL SPIRE + CAMPAIGN */}
          <div className="pointer-events-auto grid grid-cols-3 sm:flex items-stretch gap-1.5 sm:gap-2.5 w-full sm:w-auto sm:ml-auto">
            {/* Art Card 1: Dedicated Farming Dungeons Button */}
            <button
              onClick={() => {
                audioManager.playSfx('button');
                onOpenDungeon('GOLD_VAULT');
              }}
              className="relative h-[68px] sm:h-[74px] md:h-[86px] sm:w-[162px] md:w-[196px] rounded-2xl overflow-hidden border-2 border-fuchsia-400/75 hover:border-cyan-300 shadow-[0_10px_28px_rgba(0,0,0,0.75),0_0_22px_rgba(192,132,252,0.3)] text-left group transition-transform hover:-translate-y-0.5 active:scale-[0.98]"
            >
              <ModeArtBanner
                primarySrc="/assets/ui/card_rift_dungeons.webp"
                fallbackSrc="/assets/environments/env_region_9.webp"
                alt="Rift Dungeons"
              />
              <div
                className="absolute inset-0"
                style={{
                  background:
                    'linear-gradient(100deg, rgba(8,6,24,0.92) 0%, rgba(15,10,38,0.68) 54%, rgba(16,12,42,0.18) 100%)',
                }}
              />
              <div className="absolute inset-x-0 top-0 h-[2px] bg-gradient-to-r from-fuchsia-400 via-cyan-300 to-transparent opacity-90" />

              <div className="relative z-10 h-full px-2.5 sm:px-3.5 py-2 flex flex-col justify-between">
                <div className="flex items-center justify-between gap-1">
                  <span className="text-[8px] sm:text-[9px] font-display font-black uppercase tracking-[0.16em] text-fuchsia-300 leading-none truncate">
                    FARMING
                  </span>
                  <span className="px-1.5 py-0.5 rounded-md bg-slate-950/85 border border-fuchsia-400/60 font-mono text-[8px] sm:text-[9px] font-black text-cyan-200 leading-none shrink-0">
                    {totalDungeonFreeLeft}/{totalDungeonDailyMax}
                    {(dungeonTickets ?? 0) > 0 && ` +${dungeonTickets}`}
                  </span>
                </div>
                <div>
                  <div className="font-display text-xs sm:text-base md:text-lg font-black tracking-[0.1em] text-white drop-shadow-[0_2px_10px_rgba(192,132,252,0.85)] leading-none group-hover:text-cyan-200 transition truncate">
                    DUNGEONS
                  </div>
                  <div className="hidden sm:block ls-hide text-[9px] md:text-[10px] font-bold text-fuchsia-100/85 mt-0.5 truncate">
                    Gold • EXP • Forge • Relic
                  </div>
                </div>
              </div>
            </button>

            {/* Art Card 2: Astral Spire 50-Floor Endless Tower */}
            <button
              onClick={() => {
                audioManager.playSfx('button');
                onNavigate('SPIRE');
              }}
              className="relative h-[68px] sm:h-[74px] md:h-[86px] sm:w-[162px] md:w-[196px] rounded-2xl overflow-hidden border-2 border-cyan-400/80 hover:border-amber-300 shadow-[0_10px_28px_rgba(0,0,0,0.75),0_0_22px_rgba(56,232,255,0.28)] text-left group transition-transform hover:-translate-y-0.5 active:scale-[0.98]"
            >
              <ModeArtBanner
                primarySrc="/assets/environments/env_region_2.webp"
                fallbackSrc="/assets/environments/env_region_10.webp"
                alt="Astral Spire"
              />
              <div
                className="absolute inset-0"
                style={{
                  background:
                    'linear-gradient(100deg, rgba(5,12,30,0.92) 0%, rgba(10,20,48,0.68) 54%, rgba(12,24,52,0.2) 100%)',
                }}
              />
              <div className="absolute inset-x-0 top-0 h-[2px] bg-gradient-to-r from-cyan-300 via-amber-300 to-transparent opacity-90" />

              <div className="relative z-10 h-full px-2.5 sm:px-3.5 py-2 flex flex-col justify-between">
                <div className="flex items-center justify-between gap-1">
                  <span className="text-[8px] sm:text-[9px] font-display font-black uppercase tracking-[0.16em] text-cyan-300 leading-none truncate">
                    120F TOWER
                  </span>
                  <span className="px-1.5 py-0.5 rounded-md bg-slate-950/85 border border-cyan-400/60 font-mono text-[8px] sm:text-[9px] font-black text-amber-200 leading-none shrink-0">
                    F{spireHighestFloor ?? 0}/{SPIRE_MAX_FLOOR}
                  </span>
                </div>
                <div>
                  <div className="font-display text-xs sm:text-base md:text-lg font-black tracking-[0.1em] text-white drop-shadow-[0_2px_10px_rgba(56,232,255,0.85)] leading-none group-hover:text-amber-200 transition truncate">
                    SPIRE
                  </div>
                  <div className="hidden sm:block ls-hide text-[9px] md:text-[10px] font-bold text-cyan-100/85 mt-0.5 truncate">
                    Boss Gauntlet • Daily Tribute
                  </div>
                </div>
              </div>
            </button>

            {/* Art Card 3: Dedicated Campaign Battle Button */}
            <button
              onClick={() => {
                audioManager.playSfx('button');
                setShowMap(true);
              }}
              className="relative h-[68px] sm:h-[74px] md:h-[86px] sm:w-[196px] md:w-[242px] rounded-2xl overflow-hidden border-2 border-amber-300/90 hover:border-yellow-200 shadow-[0_10px_30px_rgba(0,0,0,0.8),0_0_26px_rgba(245,200,76,0.4)] text-left group transition-transform hover:-translate-y-0.5 active:scale-[0.98]"
            >
              <ModeArtBanner
                primarySrc="/assets/ui/card_campaign_battle.webp"
                fallbackSrc="/assets/environments/env_aurelia_floor.webp"
                alt="Campaign Battle"
              />
              <div
                className="absolute inset-0"
                style={{
                  background:
                    'linear-gradient(100deg, rgba(12,9,24,0.92) 0%, rgba(18,14,32,0.62) 55%, rgba(28,18,12,0.12) 100%)',
                }}
              />
              <div className="absolute inset-x-0 top-0 h-[2px] bg-gradient-to-r from-amber-300 via-yellow-200 to-transparent opacity-95" />

              {hasClaimableRegionChest && (
                <span className="absolute top-1.5 right-2 z-20 px-2 py-0.5 rounded-full bg-rose-600 border border-amber-200 text-white text-[8px] sm:text-[9px] font-display font-black uppercase tracking-wider shadow-lg flex items-center gap-1 animate-bounce">
                  <GameIcon name="reward_chest" className="w-3 h-3" /> Chest!
                </span>
              )}

              <div className="relative z-10 h-full px-3 sm:px-4 py-2 flex flex-col justify-between">
                <div className="text-[8px] sm:text-[9px] font-display font-black uppercase tracking-[0.18em] text-amber-300 flex items-center gap-1 leading-none truncate pr-14">
                  <GameIcon name="worldmap" className="w-3.5 h-3.5" />
                  {activeDifficulty !== 'NORMAL' && (
                    <span
                      className="px-1.5 py-0.5 rounded bg-slate-950/90 border text-[7px] font-black tracking-wider shrink-0"
                      style={{
                        borderColor: activeDifficultyCfg.themeColor,
                        color: activeDifficultyCfg.themeColor,
                      }}
                    >
                      {activeDifficultyCfg.label}
                    </span>
                  )}
                  <span className="truncate">
                    CH.{selectedRegion.chapter} {selectedRegion.name.toUpperCase()}
                  </span>
                </div>
                <div className="flex items-end justify-between gap-2">
                  <div className="min-w-0">
                    <div className="font-display text-base sm:text-xl md:text-2xl font-black tracking-[0.14em] text-white text-glow-gold leading-none group-hover:text-amber-200 transition">
                      CAMPAIGN
                    </div>
                    <div className="ls-hide text-[9px] md:text-[10px] font-bold text-amber-100/90 mt-0.5 truncate">
                      {selectedStage.code} {selectedStage.name}
                    </div>
                  </div>
                  <div className="w-8 h-8 md:w-10 md:h-10 rounded-full bg-slate-950/85 border-2 border-amber-300/90 p-1 flex items-center justify-center shrink-0 shadow-[0_0_16px_rgba(245,200,76,0.55)]">
                    <GameIcon
                      name="battle"
                      className="w-full h-full group-hover:scale-110 transition"
                    />
                  </div>
                </div>
              </div>
            </button>
          </div>
        </div>
      </div>

      {supplyToast && (
        <div className="fixed top-16 left-1/2 -translate-x-1/2 z-50 px-4 py-2 rounded-xl bg-slate-950/95 border border-amber-400/70 text-amber-200 text-xs font-bold shadow-2xl">
          {supplyToast}
        </div>
      )}

      <PartyManagerModal open={showPartyModal} onClose={() => setShowPartyModal(false)} />
      <CommissionsModal open={showCommissions} onClose={() => setShowCommissions(false)} />
      <SettingsModal open={showSettings} onClose={() => setShowSettings(false)} />

      {showMap && (
        <WorldMapOverlay
          squadPower={squadPower}
          onClose={() => setShowMap(false)}
          onDeploy={(stageId) => {
            setShowMap(false);
            onStartCombat(stageId);
          }}
        />
      )}
    </div>
  );
};
