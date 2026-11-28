import React, { useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import {
  CheckCircle2,
  FastForward,
  Lock,
  ShoppingBag,
  Sparkles,
  Star,
  Swords,
  Users,
  X,
} from 'lucide-react';
import {
  DAILY_DUNGEON_FREE_ENTRIES,
  DUNGEONS,
  DUNGEON_MAP,
  buildDungeonStageDef,
  encodeDungeonStageId,
  getDungeonTierStarKey,
  isDungeonTierUnlocked,
} from '../data/dungeons';
import {
  EQUIPMENT_SET_LIST,
  EQUIPMENT_SETS,
  RARITY_COLORS,
  formatStatValue,
  getEnhancedMainStatValue,
} from '../data/equipment';
import { FACTIONS } from '../data/factions';
import { HERO_MAP } from '../data/heroes';
import {
  MATERIAL_META,
  factionToEssenceKey,
  getExpToNextLevel,
} from '../data/materials';
import { RELIC_MAP } from '../data/relics';
import { audioManager } from '../engine/AudioManager';
import { computeHeroStats, getActivePetPower } from '../engine/CombatMath';
import { usePlayerStore } from '../store/usePlayerStore';
import type {
  CombatLootSummary,
  DungeonDef,
  DungeonId,
  DungeonTierNumber,
  EquipmentSetId,
  Faction,
} from '../types/game';
import { ArtImage } from './ArtImage';
import { EquipIcon, GameIcon, MaterialIcon } from './GameIcon';
import { PartyManagerModal } from './PartyManagerModal';
import {
  CornerFiligree,
  RpgBackButton,
  RpgButton,
  RpgLootTile,
  RpgProgressBar,
} from './RpgKit';
import { StarlightBackdrop } from './StarlightBackdrop';

interface DungeonScreenProps {
  initialDungeonId?: DungeonId;
  initialFaction?: Faction;
  onBack: () => void;
  onDeployDungeon: (stageId: string) => void;
  onOpenShop: (tab: 'GROWTH' | 'AWAKEN' | 'FORGE' | 'RELIC') => void;
}

const DungeonBannerImg: React.FC<{
  dungeon: DungeonDef;
  className?: string;
}> = ({ dungeon, className = '' }) => {
  const [useFallback, setUseFallback] = useState(false);
  return (
    <img
      src={useFallback ? dungeon.fallbackBanner : dungeon.artBanner}
      alt={dungeon.name}
      onError={() => {
        if (!useFallback) setUseFallback(true);
      }}
      className={className}
      draggable={false}
    />
  );
};

export const DungeonScreen: React.FC<DungeonScreenProps> = ({
  initialDungeonId = 'GOLD_VAULT',
  initialFaction = 'SOLARIS',
  onBack,
  onDeployDungeon,
  onOpenShop,
}) => {
  const {
    squadIds,
    roster,
    relicRanks,
    ownedPets,
    activePetId,
    equipmentInventory,
    unlockedCodexIds,
    clearedStages,
    dungeonTickets,
    dungeonBestStars,
    getDungeonEntriesLeft,
    sweepDungeonTier,
    sweepDungeonMulti,
  } = usePlayerStore();

  const [selectedDungeonId, setSelectedDungeonId] = useState<DungeonId>(initialDungeonId);
  const [selectedTier, setSelectedTier] = useState<DungeonTierNumber>(1);
  const [targetFaction, setTargetFaction] = useState<Faction>(initialFaction);
  const [targetSetId, setTargetSetId] = useState<EquipmentSetId>('VANGUARD');
  const [showPartyModal, setShowPartyModal] = useState(false);
  const [sweepResult, setSweepResult] = useState<CombatLootSummary | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  const dungeon = DUNGEON_MAP[selectedDungeonId] ?? DUNGEONS[0];
  const tierDef = dungeon.tiers[selectedTier - 1] ?? dungeon.tiers[0];
  const tierUnlocked = isDungeonTierUnlocked(tierDef, clearedStages);
  const starKey = getDungeonTierStarKey(selectedDungeonId, selectedTier);
  const bestStars = dungeonBestStars?.[starKey] ?? 0;
  const entryInfo = getDungeonEntriesLeft(selectedDungeonId);

  const petsMap = ownedPets ?? {};
  const activeOwnedPet = activePetId && petsMap[activePetId] ? petsMap[activePetId] : null;

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

  const previewStage = useMemo(
    () =>
      buildDungeonStageDef(selectedDungeonId, selectedTier, {
        faction: targetFaction,
        setId: targetSetId,
      }),
    [selectedDungeonId, selectedTier, targetFaction, targetSetId],
  );

  const notify = (msg: string) => {
    setToast(msg);
    window.setTimeout(() => setToast(null), 3000);
  };

  const handleSelectDungeon = (id: DungeonId) => {
    audioManager.playSfx('button');
    setSelectedDungeonId(id);
    // Auto-pick highest unlocked tier for smooth farming UX!
    const d = DUNGEON_MAP[id];
    let highest: DungeonTierNumber = 1;
    for (const t of d.tiers) {
      if (isDungeonTierUnlocked(t, clearedStages)) highest = t.tier;
    }
    setSelectedTier(highest);
  };

  const handleDeploy = () => {
    if (!tierUnlocked) {
      notify(`Locked — ${tierDef.unlockLabel}`);
      audioManager.playSfx('button');
      return;
    }
    if (!entryInfo.canEnter) {
      notify('No daily entries or Rift Tickets left today! Grab Tickets in the Shop.');
      audioManager.playSfx('button');
      return;
    }
    audioManager.playSfx('button');
    const stageId = encodeDungeonStageId(selectedDungeonId, selectedTier, {
      faction: targetFaction,
      setId: targetSetId,
    });
    onDeployDungeon(stageId);
  };

  const handleSweep = () => {
    if (!tierUnlocked) return;
    const res = sweepDungeonTier(selectedDungeonId, selectedTier, {
      faction: targetFaction,
      setId: targetSetId,
    });
    if (res.ok && res.summary) {
      audioManager.playSfx('victory');
      setSweepResult(res.summary);
    } else {
      audioManager.playSfx('button');
      notify(res.message);
    }
  };

  const multiSweepRuns = Math.min(5, entryInfo.freeLeft > 0 ? entryInfo.freeLeft : entryInfo.tickets);
  const handleMultiSweep = () => {
    if (!tierUnlocked || multiSweepRuns < 2) return;
    const res = sweepDungeonMulti(selectedDungeonId, selectedTier, multiSweepRuns, {
      faction: targetFaction,
      setId: targetSetId,
    });
    if (res.ok && res.summary) {
      audioManager.playSfx('victory');
      setSweepResult(res.summary);
    } else {
      audioManager.playSfx('button');
      notify(res.message);
    }
  };

  const powerReady = squadPower >= tierDef.recommendedPower * 0.9;
  const r = previewStage.rewards;

  return (
    <div className="relative w-full h-full overflow-hidden select-none flex flex-col">
      <StarlightBackdrop variant="CODEX" accentColor={dungeon.accentColor} />

      {/* TOP HEADER BAR */}
      <div className="relative z-20 shrink-0 px-3 sm:px-5 py-2.5 sm:py-3 border-b border-amber-400/25 bg-slate-950/75 backdrop-blur-md flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2.5 min-w-0">
          <RpgBackButton onClick={onBack} />
          <div className="min-w-0">
            <div className="text-[9px] sm:text-[10px] font-display font-black uppercase tracking-[0.24em] text-fuchsia-300 leading-none">
              STARLIGHT FARMING TRIALS • 3 FREE RUNS / DUNGEON DAILY
            </div>
            <h1 className="font-display text-base sm:text-xl font-black text-white text-glow-gold leading-tight truncate">
              Rift Dungeons
            </h1>
          </div>
        </div>

        <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
          <div className="rpg-panel-subtle px-2.5 py-1 flex items-center gap-1.5 text-xs font-bold border-fuchsia-400/45">
            <GameIcon name="dungeon_ticket" className="w-4 h-4 sm:w-5 sm:h-5" />
            <span className="text-[10px] text-slate-400 uppercase hidden sm:inline">Tickets</span>
            <span className="font-mono font-black text-fuchsia-200">{dungeonTickets ?? 0}</span>
          </div>
          <button
            onClick={() => {
              audioManager.playSfx('button');
              setShowPartyModal(true);
            }}
            className="rpg-panel-subtle hover:border-amber-400 px-2.5 py-1 text-xs font-bold text-cyan-200 flex items-center gap-1.5 transition"
          >
            <Users className="w-3.5 h-3.5 text-amber-300" />
            <span className="font-mono">PWR {squadPower.toLocaleString()}</span>
          </button>
          <button
            onClick={() => {
              audioManager.playSfx('button');
              onOpenShop('GROWTH');
            }}
            className="rpg-panel-subtle hover:border-emerald-400 px-2.5 py-1 text-xs font-bold text-emerald-200 flex items-center gap-1.5 transition"
          >
            <ShoppingBag className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Buy Tickets</span>
          </button>
        </div>
      </div>

      {/* MAIN TWO-PANE BODY */}
      <div className="relative z-20 flex-1 min-h-0 overflow-y-auto px-3 sm:px-5 py-3 sm:py-4">
        <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-3.5 sm:gap-4 pb-4">
          {/* LEFT: 5 ILLUSTRATED DUNGEON CARDS */}
          <div className="lg:col-span-5 space-y-2.5">
            {DUNGEONS.map((d) => {
              const active = d.id === selectedDungeonId;
              const info = getDungeonEntriesLeft(d.id);
              return (
                <motion.button
                  key={d.id}
                  whileHover={{ scale: 1.01 }}
                  whileTap={{ scale: 0.99 }}
                  onClick={() => handleSelectDungeon(d.id)}
                  className={`relative w-full h-[94px] sm:h-[104px] rounded-2xl overflow-hidden text-left border-2 transition group ${
                    active
                      ? 'shadow-[0_0_28px_rgba(245,200,76,0.35)]'
                      : 'border-white/15 opacity-85 hover:opacity-100'
                  }`}
                  style={{
                    borderColor: active ? d.accentColor : undefined,
                  }}
                >
                  {/* Full-Bleed Painted Banner Art */}
                  <DungeonBannerImg
                    dungeon={d}
                    className="absolute inset-0 w-full h-full object-cover object-center group-hover:scale-105 transition duration-500"
                  />
                  {/* Readability Gradient Overlay */}
                  <div
                    className="absolute inset-0"
                    style={{
                      background: active
                        ? `linear-gradient(90deg, rgba(6,9,22,0.95) 0%, rgba(6,9,22,0.72) 58%, rgba(6,9,22,0.22) 100%)`
                        : `linear-gradient(90deg, rgba(6,9,22,0.94) 0%, rgba(6,9,22,0.76) 60%, rgba(6,9,22,0.42) 100%)`,
                    }}
                  />
                  <div
                    className="absolute left-0 top-0 bottom-0 w-1.5"
                    style={{ background: d.accentColor }}
                  />

                  <div className="relative z-10 h-full px-3.5 py-2.5 flex flex-col justify-between">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <span
                          className="inline-block px-2 py-0.5 rounded-full text-[9px] font-display font-black uppercase tracking-[0.18em] bg-slate-950/85 border"
                          style={{ borderColor: `${d.accentColor}99`, color: d.accentColor }}
                        >
                          {d.badge}
                        </span>
                        <h3 className="font-display text-base sm:text-lg font-black text-white leading-tight mt-0.5 drop-shadow-[0_2px_6px_rgba(0,0,0,0.9)]">
                          {d.name}
                        </h3>
                      </div>

                      <div
                        className={`px-2 py-0.5 rounded-lg font-mono text-[10px] font-black border shrink-0 backdrop-blur-sm ${
                          info.freeLeft > 0
                            ? 'bg-emerald-950/80 border-emerald-400/65 text-emerald-300'
                            : info.tickets > 0
                              ? 'bg-fuchsia-950/80 border-fuchsia-400/65 text-fuchsia-200'
                              : 'bg-slate-950/85 border-slate-700 text-slate-400'
                        }`}
                      >
                        {info.freeLeft > 0
                          ? `${info.freeLeft}/${DAILY_DUNGEON_FREE_ENTRIES} FREE`
                          : info.tickets > 0
                            ? `TICKET (${info.tickets})`
                            : '0/3 DONE'}
                      </div>
                    </div>

                    <div className="text-[11px] font-semibold text-slate-200/95 truncate drop-shadow">
                      {d.primaryRewardLabel}
                    </div>
                  </div>
                </motion.button>
              );
            })}
          </div>

          {/* RIGHT: TRIAL DOSSIER, TARGET SELECTOR, TIERS & REWARDS */}
          <div className="lg:col-span-7 flex flex-col gap-3">
            <div className="rpg-panel overflow-hidden border-amber-400/40 relative">
              <CornerFiligree color={dungeon.accentColor} size={11} opacity={0.85} />

              {/* Hero Banner Header */}
              <div className="relative h-36 sm:h-44 overflow-hidden border-b border-white/15">
                <DungeonBannerImg
                  dungeon={dungeon}
                  className="absolute inset-0 w-full h-full object-cover object-center"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-[#070a18] via-[#070a18]/65 to-transparent" />
                <div className="relative z-10 h-full p-4 flex flex-col justify-end">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <div
                        className="text-[10px] font-display font-black uppercase tracking-[0.22em]"
                        style={{ color: dungeon.accentColor }}
                      >
                        {dungeon.badge} • {dungeon.subtitle}
                      </div>
                      <h2 className="font-display text-xl sm:text-2xl font-black text-white text-glow-gold">
                        {dungeon.name}
                      </h2>
                    </div>
                    <div className="px-3 py-1.5 rounded-xl bg-slate-950/85 border border-white/15 text-right">
                      <div className="text-[9px] font-display font-bold uppercase tracking-wider text-slate-400">
                        Daily Attempts
                      </div>
                      <div className="font-mono text-sm font-black text-emerald-300">
                        {entryInfo.freeLeft} / {DAILY_DUNGEON_FREE_ENTRIES} Free
                        {entryInfo.freeLeft === 0 && entryInfo.tickets > 0 && (
                          <span className="text-fuchsia-300 ml-1.5">• {entryInfo.tickets} Tix</span>
                        )}
                      </div>
                    </div>
                  </div>
                  <p className="text-xs text-slate-200/90 mt-1.5 leading-snug max-w-2xl">
                    {dungeon.description}
                  </p>
                </div>
              </div>

              <div className="p-4 space-y-4">
                {/* TARGET FACTION SELECTOR (Sanctum of Pillars) */}
                {dungeon.supportsFactionSelect && (
                  <div className="space-y-1.5">
                    <div className="text-[10px] font-display font-black uppercase tracking-[0.2em] text-fuchsia-300">
                      Attune Pillar — Select Target Faction Essence
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                      {(['SOLARIS', 'ASTRAL', 'VERDANT', 'ASHEN'] as Faction[]).map((fac) => {
                        const fDef = FACTIONS[fac];
                        const matKey = factionToEssenceKey(fac);
                        const active = targetFaction === fac;
                        return (
                          <button
                            key={fac}
                            onClick={() => {
                              audioManager.playSfx('button');
                              setTargetFaction(fac);
                            }}
                            className={`px-2.5 py-2 rounded-xl border-2 flex items-center gap-2 transition text-left ${
                              active
                                ? 'bg-slate-900/95 shadow-lg'
                                : 'bg-slate-950/70 border-slate-800 hover:border-slate-600 opacity-80'
                            }`}
                            style={{ borderColor: active ? fDef.color : undefined }}
                          >
                            <MaterialIcon material={matKey} className="w-7 h-7" />
                            <div className="min-w-0">
                              <div
                                className="font-display text-xs font-black truncate"
                                style={{ color: fDef.color }}
                              >
                                {MATERIAL_META[matKey].shortName}
                              </div>
                              <div className="text-[9px] text-slate-400 truncate">
                                {fDef.name.split(' ')[0]}
                              </div>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* TARGET GEAR SET SELECTOR (Ferrum Foundry) */}
                {dungeon.supportsSetSelect && (
                  <div className="space-y-1.5">
                    <div className="text-[10px] font-display font-black uppercase tracking-[0.2em] text-orange-300">
                      Forge Blueprint — Select Target Equipment Set
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                      {EQUIPMENT_SET_LIST.map((setDef) => {
                        const active = targetSetId === setDef.id;
                        return (
                          <button
                            key={setDef.id}
                            onClick={() => {
                              audioManager.playSfx('button');
                              setTargetSetId(setDef.id);
                            }}
                            className={`px-2.5 py-2 rounded-xl border-2 text-left transition ${
                              active
                                ? 'bg-slate-900/95 shadow-lg'
                                : 'bg-slate-950/70 border-slate-800 hover:border-slate-600 opacity-80'
                            }`}
                            style={{ borderColor: active ? setDef.color : undefined }}
                          >
                            <div
                              className="font-display text-xs font-black truncate"
                              style={{ color: setDef.color }}
                            >
                              {setDef.name}
                            </div>
                            <div className="text-[10px] text-slate-300 truncate">
                              2pc: {setDef.bonus2Desc}
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* 10 DIFFICULTY TIERS (I–V NORMAL • VI–VIII HARD • IX–X HELL) */}
                <div className="space-y-2">
                  <div className="flex flex-wrap items-center justify-between gap-2 text-[10px] font-display font-black uppercase tracking-[0.2em] text-amber-300">
                    <span>Select Difficulty Tier (I – X)</span>
                    <div className="flex items-center gap-2 font-mono text-[9px]">
                      <span className="text-amber-300">I–V WL1</span>
                      <span className="text-orange-400">VI–VIII WL2</span>
                      <span className="text-rose-400">IX–X WL3</span>
                      <span className="text-slate-600">|</span>
                      <span className="text-slate-400">
                        Rec. PWR:{' '}
                        <strong className={powerReady ? 'text-emerald-400' : 'text-rose-400'}>
                          {tierDef.recommendedPower.toLocaleString()}
                        </strong>
                      </span>
                    </div>
                  </div>
                  <div className="grid grid-cols-5 gap-1.5 sm:gap-2">
                    {dungeon.tiers.map((t) => {
                      const unlocked = isDungeonTierUnlocked(t, clearedStages);
                      const active = selectedTier === t.tier;
                      const stars = dungeonBestStars?.[getDungeonTierStarKey(dungeon.id, t.tier)] ?? 0;
                      const isHellTier = t.worldDifficultyTag === 'HELL';
                      const isHardTier = t.worldDifficultyTag === 'HARD';
                      const tagLabel = isHellTier ? 'WL3' : isHardTier ? 'WL2' : 'WL1';
                      return (
                        <button
                          key={t.tier}
                          onClick={() => {
                            audioManager.playSfx('button');
                            setSelectedTier(t.tier);
                          }}
                          className={`relative rounded-xl px-1.5 py-2 border-2 text-center transition flex flex-col items-center gap-0.5 ${
                            active
                              ? isHellTier
                                ? 'bg-rose-500/20 border-rose-400 shadow-[0_0_16px_rgba(244,63,94,0.4)]'
                                : isHardTier
                                  ? 'bg-orange-500/20 border-orange-400 shadow-[0_0_16px_rgba(249,115,22,0.35)]'
                                  : 'bg-amber-400/15 border-amber-300 shadow-[0_0_16px_rgba(245,200,76,0.3)]'
                              : unlocked
                                ? isHellTier
                                  ? 'bg-rose-950/35 border-rose-500/45 hover:border-rose-300'
                                  : isHardTier
                                    ? 'bg-orange-950/30 border-orange-500/40 hover:border-orange-300'
                                    : 'bg-slate-950/80 border-slate-700 hover:border-amber-400/60'
                                : 'bg-slate-950/55 border-slate-800/80 opacity-60 hover:opacity-85'
                          }`}
                        >
                          <span
                            className={`absolute top-1 right-1 text-[7px] font-display font-black uppercase px-1 rounded ${
                              isHellTier
                                ? 'bg-rose-500/25 text-rose-300'
                                : isHardTier
                                  ? 'bg-orange-500/25 text-orange-300'
                                  : 'bg-amber-500/15 text-amber-300/80'
                            }`}
                          >
                            {tagLabel}
                          </span>
                          <div className="flex items-center gap-1 mt-1">
                            {!unlocked && <Lock className="w-2.5 h-2.5 text-slate-500" />}
                            <span
                              className={`font-display text-xs sm:text-sm font-black ${
                                active
                                  ? isHellTier
                                    ? 'text-rose-200'
                                    : isHardTier
                                      ? 'text-orange-200'
                                      : 'text-amber-300'
                                  : unlocked
                                    ? 'text-white'
                                    : 'text-slate-500'
                              }`}
                            >
                              T{t.roman}
                            </span>
                          </div>
                          <div className="font-mono text-[9px] text-slate-400">
                            {t.recommendedPower >= 100000
                              ? `${Math.round(t.recommendedPower / 1000)}k`
                              : `${(t.recommendedPower / 1000).toFixed(1)}k`}
                          </div>
                          <div className="flex items-center gap-0.5 mt-0.5">
                            {[1, 2, 3].map((n) => (
                              <Star
                                key={n}
                                className={`w-2.5 h-2.5 ${
                                  n <= stars
                                    ? 'text-amber-300 fill-amber-400'
                                    : 'text-slate-700'
                                }`}
                              />
                            ))}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                  {!tierUnlocked && (
                    <div className="px-3 py-1.5 rounded-xl bg-rose-950/45 border border-rose-500/45 text-xs text-rose-200 flex items-center gap-2">
                      <Lock className="w-3.5 h-3.5 text-rose-400 shrink-0" />
                      <span>Unlock Requirement: <strong>{tierDef.unlockLabel}</strong></span>
                    </div>
                  )}
                </div>

                {/* EXPECTED SPOILS PREVIEW */}
                <div className="space-y-2">
                  <div className="text-[10px] font-display font-black uppercase tracking-[0.2em] text-cyan-300 flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5" /> Tier {tierDef.roman} Trial Rewards
                    {(previewStage.combatExpMultiplier ?? 1) > 1 && (
                      <span className="ml-auto px-2 py-0.5 rounded-full bg-emerald-500/20 border border-emerald-400/60 text-emerald-300 text-[9px]">
                        +{Math.round(((previewStage.combatExpMultiplier ?? 1) - 1) * 100)}% HERO BATTLE EXP
                      </span>
                    )}
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <RpgLootTile
                      color="#f5c84c"
                      subLabel="Gold"
                      bottomLabel={`${r.gold[0].toLocaleString()}-${r.gold[1].toLocaleString()}`}
                      index={0}
                    >
                      <GameIcon name="gold" className="w-8 h-8" />
                    </RpgLootTile>

                    {r.expPotions[1] > 0 && (
                      <RpgLootTile
                        color="#34d399"
                        subLabel="EXP"
                        bottomLabel={`×${r.expPotions[0]}-${r.expPotions[1]}`}
                        index={1}
                      >
                        <MaterialIcon material="expPotions" className="w-8 h-8" />
                      </RpgLootTile>
                    )}

                    {r.bondGiftsRange && r.bondGiftsRange[1] > 0 && (
                      <RpgLootTile
                        color="#fb7185"
                        subLabel="Bond"
                        bottomLabel={`×${r.bondGiftsRange[0]}-${r.bondGiftsRange[1]}`}
                        index={2}
                      >
                        <MaterialIcon material="bondGifts" className="w-8 h-8" />
                      </RpgLootTile>
                    )}

                    {r.primaryEssenceQty[1] > 0 && (
                      <RpgLootTile
                        color={FACTIONS[targetFaction].color}
                        subLabel={MATERIAL_META[factionToEssenceKey(targetFaction)].shortName}
                        bottomLabel={`×${r.primaryEssenceQty[0]}-${r.primaryEssenceQty[1]}`}
                        index={3}
                      >
                        <MaterialIcon material={factionToEssenceKey(targetFaction)} className="w-8 h-8" />
                      </RpgLootTile>
                    )}

                    {r.starCores && (
                      <RpgLootTile
                        color="#e879f9"
                        subLabel="Star Core"
                        bottomLabel={`×${r.starCores[0]}-${r.starCores[1]}`}
                        index={4}
                      >
                        <MaterialIcon material="starCores" className="w-8 h-8" />
                      </RpgLootTile>
                    )}

                    {r.forgeStones[1] > 0 && (
                      <RpgLootTile
                        color="#a78bfa"
                        subLabel="Stones"
                        bottomLabel={`×${r.forgeStones[0]}-${r.forgeStones[1]}`}
                        index={5}
                      >
                        <MaterialIcon material="forgeStones" className="w-8 h-8" />
                      </RpgLootTile>
                    )}

                    {r.starIronIngots && (
                      <RpgLootTile
                        color="#38bdf8"
                        subLabel="Star-Iron"
                        bottomLabel={`×${r.starIronIngots[0]}-${r.starIronIngots[1]}`}
                        index={6}
                      >
                        <MaterialIcon material="starIronIngots" className="w-8 h-8" />
                      </RpgLootTile>
                    )}

                    {r.astralAnvilCores && (
                      <RpgLootTile
                        color="#f5c84c"
                        subLabel="Anvil"
                        bottomLabel={`×${r.astralAnvilCores[0]}-${r.astralAnvilCores[1]}`}
                        index={7}
                      >
                        <MaterialIcon material="astralAnvilCores" className="w-8 h-8" />
                      </RpgLootTile>
                    )}

                    {r.equipmentDrops > 0 && (
                      <RpgLootTile
                        color={EQUIPMENT_SETS[targetSetId].color}
                        topTag={`${r.equipmentDrops}×`}
                        bottomLabel={EQUIPMENT_SETS[targetSetId].name.split(' ')[0]}
                        index={8}
                      >
                        <EquipIcon slot="WEAPON" className="w-9 h-9" />
                      </RpgLootTile>
                    )}

                    {r.relicFragments && (
                      <RpgLootTile
                        color="#22d3ee"
                        subLabel="Relic Frag"
                        bottomLabel={`×${r.relicFragments[0]}-${r.relicFragments[1]}`}
                        index={9}
                      >
                        <GameIcon name="relic" className="w-8 h-8" />
                      </RpgLootTile>
                    )}

                    {(r.relicDropChance ?? 0) > 0 && (
                      <RpgLootTile
                        color="#f5c84c"
                        topTag={`${Math.round((r.relicDropChance ?? 0) * 100)}%`}
                        bottomLabel="SR/SSR Relic"
                        index={10}
                      >
                        <GameIcon name="relic" className="w-8 h-8" />
                      </RpgLootTile>
                    )}
                  </div>
                </div>

                {/* DEPLOY & QUICK SWEEP ACTIONS */}
                <div className="pt-3 border-t border-white/10 flex flex-wrap items-center justify-between gap-2.5">
                  <div className="text-[11px] text-slate-400">
                    Defeat NEVER consumes entries or tickets.{' '}
                    {bestStars >= 3 ? (
                      <span className="text-emerald-300 font-bold">★★★ Quick Sweep Unlocked!</span>
                    ) : (
                      <span>Clear with ★★★ to unlock Quick Sweep.</span>
                    )}
                  </div>

                  <div className="flex items-center gap-2 ml-auto flex-wrap justify-end">
                    <RpgButton
                      variant="cyan"
                      size="md"
                      disabled={!tierUnlocked || bestStars < 3 || !entryInfo.canEnter}
                      onClick={handleSweep}
                      className="font-display font-black uppercase tracking-wider"
                    >
                      <FastForward className="w-4 h-4" /> Sweep 1×
                    </RpgButton>
                    {bestStars >= 3 && multiSweepRuns >= 2 && (
                      <RpgButton
                        variant="emerald"
                        size="md"
                        disabled={!tierUnlocked || !entryInfo.canEnter}
                        onClick={handleMultiSweep}
                        className="font-display font-black uppercase tracking-wider"
                      >
                        <FastForward className="w-4 h-4" /> Sweep ×{multiSweepRuns}
                      </RpgButton>
                    )}
                    <RpgButton
                      variant="gold"
                      size="md"
                      disabled={!tierUnlocked || !entryInfo.canEnter}
                      onClick={handleDeploy}
                      className="font-display font-black uppercase tracking-wider px-5"
                    >
                      <Swords className="w-4 h-4" />
                      {entryInfo.freeLeft > 0
                        ? `Deploy (${entryInfo.freeLeft}/${DAILY_DUNGEON_FREE_ENTRIES})`
                        : entryInfo.tickets > 0
                          ? 'Deploy (1 Ticket)'
                          : 'No Entries Left'}
                    </RpgButton>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* TOAST */}
      {toast && (
        <div className="fixed top-16 left-1/2 -translate-x-1/2 z-50 px-4 py-2 rounded-xl bg-slate-950/95 border border-amber-400/70 text-amber-200 text-xs font-bold shadow-2xl">
          {toast}
        </div>
      )}

      {/* QUICK SWEEP RESULT MODAL */}
      <AnimatePresence>
        {sweepResult && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setSweepResult(null)}
            className="fixed inset-0 z-50 bg-[#030510]/85 backdrop-blur-md flex items-center justify-center p-3 sm:p-4"
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.92, y: 16 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.94, y: 10 }}
              onClick={(e) => e.stopPropagation()}
              className="relative rpg-panel w-full max-w-xl overflow-hidden border-emerald-400/60"
            >
              <CornerFiligree color="#34d399" size={10} opacity={0.85} />
              <div className="px-4 py-3 border-b border-emerald-400/25 bg-slate-950/80 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                  <div>
                    <div className="text-[10px] font-display font-black uppercase tracking-[0.2em] text-emerald-300">
                      ★★★ INSTANT QUICK SWEEP COMPLETE
                    </div>
                    <h3 className="font-display text-base sm:text-lg font-black text-white">
                      {sweepResult.stageName}
                    </h3>
                  </div>
                </div>
                <button
                  onClick={() => setSweepResult(null)}
                  className="p-1.5 rounded-lg bg-slate-900 border border-slate-700 text-slate-300 hover:text-amber-300"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="p-4 space-y-4 max-h-[75dvh] overflow-y-auto">
                {/* Squad EXP Gain */}
                {sweepResult.heroExpResults && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {Object.values(sweepResult.heroExpResults).map((expRes) => {
                      const h = HERO_MAP[expRes.heroId];
                      if (!h) return null;
                      return (
                        <div
                          key={expRes.heroId}
                          className="rounded-xl bg-slate-950/80 border border-white/10 p-2 flex items-center gap-2"
                        >
                          <div className="w-9 h-9 rounded-lg overflow-hidden border border-white/20 shrink-0">
                            <ArtImage
                              kind="HERO"
                              id={h.id}
                              src={h.assets.card}
                              alt={h.name}
                              className="w-full h-full object-cover object-top"
                            />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between gap-1 text-[11px] mb-1">
                              <span className="font-bold text-white flex items-center gap-1 truncate">
                                {h.name}
                                <span className="px-1 rounded bg-slate-900 border border-cyan-400/40 font-mono text-[9px] text-cyan-200">
                                  Lv.{expRes.newLevel}
                                </span>
                                {expRes.levelsGained > 0 && (
                                  <span className="px-1.5 py-0.5 rounded-full bg-emerald-400 text-slate-950 font-display font-black text-[8px]">
                                    Lv. UP +{expRes.levelsGained}
                                  </span>
                                )}
                              </span>
                              <span className="font-mono text-[10px] text-amber-200 shrink-0">
                                {expRes.newExp.toLocaleString()} / {getExpToNextLevel(expRes.newLevel).toLocaleString()}
                              </span>
                            </div>
                            <RpgProgressBar
                              value={expRes.newExp}
                              max={expRes.expToNext}
                              heightClass="h-1.5"
                              gradient="linear-gradient(90deg, #06b6d4 0%, #fde047 100%)"
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* Spoils Tiles */}
                <div className="flex flex-wrap gap-2">
                  {sweepResult.goldEarned > 0 && (
                    <RpgLootTile color="#f5c84c" subLabel="Gold" bottomLabel={`+${sweepResult.goldEarned.toLocaleString()}`} index={0}>
                      <GameIcon name="gold" className="w-8 h-8" />
                    </RpgLootTile>
                  )}
                  {sweepResult.expPotionsEarned > 0 && (
                    <RpgLootTile color="#34d399" subLabel="EXP" bottomLabel={`×${sweepResult.expPotionsEarned}`} index={1}>
                      <MaterialIcon material="expPotions" className="w-8 h-8" />
                    </RpgLootTile>
                  )}
                  {sweepResult.bondGiftsEarned > 0 && (
                    <RpgLootTile color="#fb7185" subLabel="Bond" bottomLabel={`×${sweepResult.bondGiftsEarned}`} index={2}>
                      <MaterialIcon material="bondGifts" className="w-8 h-8" />
                    </RpgLootTile>
                  )}
                  {Object.entries(sweepResult.essencesEarned).map(([fac, qty], i) =>
                    qty ? (
                      <RpgLootTile
                        key={fac}
                        color={FACTIONS[fac as Faction].color}
                        subLabel={MATERIAL_META[factionToEssenceKey(fac as Faction)].shortName}
                        bottomLabel={`×${qty}`}
                        index={3 + i}
                      >
                        <MaterialIcon material={factionToEssenceKey(fac as Faction)} className="w-8 h-8" />
                      </RpgLootTile>
                    ) : null,
                  )}
                  {sweepResult.starCoresEarned > 0 && (
                    <RpgLootTile color="#e879f9" subLabel="Star Core" bottomLabel={`×${sweepResult.starCoresEarned}`} index={5}>
                      <MaterialIcon material="starCores" className="w-8 h-8" />
                    </RpgLootTile>
                  )}
                  {sweepResult.forgeStonesEarned > 0 && (
                    <RpgLootTile color="#a78bfa" subLabel="Stones" bottomLabel={`×${sweepResult.forgeStonesEarned}`} index={6}>
                      <MaterialIcon material="forgeStones" className="w-8 h-8" />
                    </RpgLootTile>
                  )}
                  {sweepResult.starIronIngotsEarned > 0 && (
                    <RpgLootTile color="#38bdf8" subLabel="Star-Iron" bottomLabel={`×${sweepResult.starIronIngotsEarned}`} index={7}>
                      <MaterialIcon material="starIronIngots" className="w-8 h-8" />
                    </RpgLootTile>
                  )}
                  {sweepResult.astralAnvilCoresEarned > 0 && (
                    <RpgLootTile color="#f5c84c" subLabel="Anvil" bottomLabel={`×${sweepResult.astralAnvilCoresEarned}`} index={8}>
                      <MaterialIcon material="astralAnvilCores" className="w-8 h-8" />
                    </RpgLootTile>
                  )}
                  {sweepResult.relicFragmentsEarned > 0 && (
                    <RpgLootTile color="#22d3ee" subLabel="Relic Frag" bottomLabel={`×${sweepResult.relicFragmentsEarned}`} index={9}>
                      <GameIcon name="relic" className="w-8 h-8" />
                    </RpgLootTile>
                  )}
                  {sweepResult.droppedRelics.map((dr, i) => {
                    const rel = RELIC_MAP[dr.relicId];
                    if (!rel) return null;
                    return (
                      <RpgLootTile
                        key={`${dr.relicId}_${i}`}
                        color="#f5c84c"
                        topTag={dr.isNew ? 'NEW' : `R${dr.newRank}`}
                        bottomLabel={rel.name.split(' ')[0]}
                        index={10 + i}
                      >
                        <GameIcon name="relic" className="w-8 h-8" />
                      </RpgLootTile>
                    );
                  })}
                </div>

                {/* Dropped Gear Spotlight */}
                {sweepResult.droppedEquipment.length > 0 && (
                  <div className="space-y-1.5">
                    {sweepResult.droppedEquipment.map((gear) => (
                      <div
                        key={gear.uid}
                        className="rounded-xl bg-slate-950/85 border border-white/15 px-3 py-2 flex items-center gap-2.5"
                        style={{ borderLeft: `3px solid ${RARITY_COLORS[gear.rarity]}` }}
                      >
                        <EquipIcon slot={gear.slot} className="w-7 h-7" />
                        <div className="min-w-0 flex-1">
                          <div className="text-xs font-bold text-white truncate">
                            <span style={{ color: RARITY_COLORS[gear.rarity] }}>{gear.rarity}</span>{' '}
                            {gear.name}
                          </div>
                          <div className="text-[10px] font-mono text-amber-200 truncate">
                            {formatStatValue(gear.mainStat.stat, getEnhancedMainStatValue(gear))}
                            {gear.subStats.map((s) => ` • ${formatStatValue(s.stat, s.value)}`).join('')}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                <div className="flex items-center justify-end gap-2 pt-2 border-t border-white/10">
                  {entryInfo.canEnter && (
                    <RpgButton variant="cyan" size="sm" onClick={handleSweep}>
                      <FastForward className="w-3.5 h-3.5" /> Sweep Again
                    </RpgButton>
                  )}
                  <RpgButton variant="gold" size="sm" onClick={() => setSweepResult(null)}>
                    Awesome!
                  </RpgButton>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <PartyManagerModal open={showPartyModal} onClose={() => setShowPartyModal(false)} />
    </div>
  );
};
