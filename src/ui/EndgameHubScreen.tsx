import React, { useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import {
  Activity,
  CheckCircle2,
  Compass,
  Crown,
  Flame,
  Heart,
  Lock,
  RefreshCw,
  Shield,
  Skull,
  Sparkles,
  Swords,
  Target,
  Timer,
  Trophy,
  Users,
  Zap,
} from 'lucide-react';
import { getCurrentWeekKey } from '../data/commissions';
import { FACTIONS } from '../data/factions';
import { HERO_MAP, resolveHeroVisuals } from '../data/heroes';
import {
  ASTRAL_BLESSING_MAP,
  WEEKLY_LABYRINTH_MILESTONES,
  encodeLabyrinthStageId,
} from '../data/labyrinth';
import { SANDBOX_TARGET_PRESETS, encodeSandboxStageId } from '../data/sandbox';
import {
  RAID_TIER_CONFIGS,
  WEEKLY_RAID_MILESTONES,
  WORLD_BOSSES,
  WORLD_BOSS_MAP,
  encodeWorldBossStageId,
  getFeaturedWorldBossId,
  getRaidRankForScore,
  isRaidTierUnlocked,
} from '../data/worldBoss';
import { audioManager } from '../engine/AudioManager';
import { computeHeroStats, getActivePetPower } from '../engine/CombatMath';
import { usePlayerStore } from '../store/usePlayerStore';
import type {
  LabyrinthNodeState,
  RaidDifficultyTier,
  SandboxDurationSec,
  SandboxTargetMode,
  WorldBossId,
} from '../types/game';
import { ArtImage } from './ArtImage';
import { GameIcon } from './GameIcon';
import { PartyManagerModal } from './PartyManagerModal';
import { RewardItemStrip } from './RewardItemTile';
import {
  CornerFiligree,
  RpgBackButton,
  RpgButton,
  RpgProgressBar,
  RpgTabs,
} from './RpgKit';
import { StarlightBackdrop } from './StarlightBackdrop';

export type EndgameTab = 'RAID' | 'LABYRINTH' | 'SANDBOX';

interface EndgameHubScreenProps {
  initialTab?: EndgameTab;
  onBack: () => void;
  onDeployEndgame: (stageId: string, activeTab: EndgameTab) => void;
}

const NODE_TYPE_META: Record<
  LabyrinthNodeState['type'],
  { label: string; color: string; badge: string }
> = {
  COMBAT: { label: 'Skirmish', color: '#38e8ff', badge: '⚔️ COMBAT' },
  ELITE: { label: 'Elite Guardian', color: '#fb923c', badge: '💀 ELITE' },
  ALTAR: { label: 'Blessing Altar', color: '#e879f9', badge: '✨ ALTAR' },
  REST: { label: 'Celestial Spring', color: '#34d399', badge: '💚 REST' },
  TREASURE: { label: 'Star Vault', color: '#f5c84c', badge: '👑 VAULT' },
  BOSS: { label: 'Labyrinth Sovereign', color: '#f43f5e', badge: '🔥 BOSS' },
};

const BLESSING_RARITY_COLOR = {
  COMMON: '#38e8ff',
  RARE: '#e879f9',
  MYTHIC: '#fde047',
};

export const EndgameHubScreen: React.FC<EndgameHubScreenProps> = ({
  initialTab = 'RAID',
  onBack,
  onDeployEndgame,
}) => {
  const player = usePlayerStore();
  const [tab, setTab] = useState<EndgameTab>(initialTab);
  const [showPartyModal, setShowPartyModal] = useState(false);
  const [notice, setNotice] = useState<{ text: string; ok: boolean } | null>(null);

  const weekKey = getCurrentWeekKey();
  const featuredBossId = getFeaturedWorldBossId(weekKey);

  // World Boss Raid local selector state
  const [selectedBossId, setSelectedBossId] = useState<WorldBossId>(featuredBossId);
  const [selectedRaidTier, setSelectedRaidTier] = useState<RaidDifficultyTier>(1);

  // Labyrinth Rest choice modal
  const [pendingRestNodeId, setPendingRestNodeId] = useState<string | null>(null);

  // Sandbox configurator state
  const [sandboxTarget, setSandboxTarget] = useState<SandboxTargetMode>('SINGLE_BOSS');
  const [sandboxDuration, setSandboxDuration] = useState<SandboxDurationSec>(60);
  const [sandboxPassive, setSandboxPassive] = useState<boolean>(true);

  const notify = (text: string, ok = true) => {
    setNotice({ text, ok });
    window.setTimeout(() => setNotice(null), 3500);
  };

  const petsMap = player.ownedPets ?? {};
  const activeOwnedPet =
    player.activePetId && petsMap[player.activePetId] ? petsMap[player.activePetId] : null;

  const squadPower = useMemo(
    () =>
      player.squadIds.reduce((sum, id) => {
        const def = HERO_MAP[id];
        const owned = player.roster[id];
        if (!def || !owned) return sum;
        return (
          sum +
          computeHeroStats(
            def,
            owned,
            player.equipmentInventory,
            player.squadIds,
            player.unlockedCodexIds.length,
            player.relicRanks,
            { roster: player.roster, activePet: activeOwnedPet },
          ).powerRating
        );
      }, 0) + getActivePetPower(player.activePetId, petsMap),
    [
      player.squadIds,
      player.roster,
      player.equipmentInventory,
      player.unlockedCodexIds.length,
      player.relicRanks,
      activeOwnedPet,
      player.activePetId,
      petsMap,
    ],
  );

  // World Boss Raid state
  const sameRaidWeek = player.raidWeekKey === weekKey;
  const weeklyBestScore = sameRaidWeek ? (player.raidWeeklyBestScore ?? 0) : 0;
  const bestByBoss = sameRaidWeek ? (player.raidBestScoreByBoss ?? {}) : {};
  const claimedRaidMs = sameRaidWeek ? (player.claimedRaidMilestones ?? []) : [];
  const raidAttempts = player.getRaidAttemptsLeft();
  const activeBoss = WORLD_BOSS_MAP[selectedBossId];
  const activeTierCfg =
    RAID_TIER_CONFIGS.find((t) => t.tier === selectedRaidTier) ?? RAID_TIER_CONFIGS[0];
  const currentRank = getRaidRankForScore(weeklyBestScore);

  const claimableRaidCount = WEEKLY_RAID_MILESTONES.filter(
    (m) => weeklyBestScore >= m.score && !claimedRaidMs.includes(m.score),
  ).length;

  // Starlight Labyrinth state
  const sameLabWeek = player.labyrinthWeekKey === weekKey;
  const labWeeklyClears = sameLabWeek ? (player.labyrinthWeeklyClears ?? 0) : 0;
  const claimedLabMs = sameLabWeek ? (player.claimedLabyrinthMilestones ?? []) : [];
  const labRun = player.labyrinthRun;
  const claimableLabCount = WEEKLY_LABYRINTH_MILESTONES.filter(
    (m) => labWeeklyClears >= m.clears && !claimedLabMs.includes(m.clears),
  ).length;

  const labNodesByDepth = useMemo(() => {
    if (!labRun) return [];
    const grouped: LabyrinthNodeState[][] = [];
    for (let d = 0; d <= 5; d++) {
      grouped.push(labRun.nodes.filter((n) => n.depth === d));
    }
    return grouped;
  }, [labRun]);

  const bgAsset =
    tab === 'RAID'
      ? '/assets/environments/env_world_boss_raid.webp'
      : '/assets/environments/env_labyrinth_rift.webp';
  const accentColor =
    tab === 'RAID' ? activeBoss.themeColor : tab === 'LABYRINTH' ? '#c084fc' : '#38e8ff';

  const handleLabyrinthNodeClick = (node: LabyrinthNodeState) => {
    if (!labRun) return;
    if (labRun.pendingBlessingChoices.length > 0) {
      notify('Choose 1 of your 3 Astral Blessings below first!', false);
      return;
    }
    if (!labRun.availableNodeIds.includes(node.id)) return;
    audioManager.playSfx('button');

    if (node.type === 'COMBAT' || node.type === 'ELITE' || node.type === 'BOSS') {
      onDeployEndgame(encodeLabyrinthStageId(node.id), 'LABYRINTH');
      return;
    }
    if (node.type === 'REST') {
      setPendingRestNodeId(node.id);
      return;
    }
    const res = player.resolveLabyrinthNonCombatNode(node.id);
    audioManager.playSfx(res.ok ? 'ssr_reveal' : 'button');
    notify(res.message, res.ok);
  };

  return (
    <div className="relative w-full h-full flex flex-col overflow-hidden select-none">
      <StarlightBackdrop
        variant="LOBBY"
        accentColor={accentColor}
        bgAsset={bgAsset}
        moteColors={tab === 'RAID' ? ['#f5c84c', '#f43f5e'] : ['#38e8ff', '#e879f9']}
      />

      {/* TOP HEADER BAR */}
      <div className="relative z-20 flex flex-wrap items-center justify-between gap-2 px-3 sm:px-5 safe-top pb-2 bg-slate-950/65 backdrop-blur-md border-b border-amber-400/25">
        <div className="flex items-center gap-2.5 min-w-0">
          <RpgBackButton onClick={onBack} />
          <div className="min-w-0">
            <div className="text-[9px] sm:text-[10px] font-display font-black uppercase tracking-[0.22em] text-amber-300 leading-none">
              ENDGAME SANCTUM • {weekKey}
            </div>
            <h1 className="font-display text-base sm:text-xl font-black text-white text-glow-gold leading-tight truncate">
              {tab === 'RAID'
                ? 'ABYSSAL WORLD BOSS RAID'
                : tab === 'LABYRINTH'
                  ? 'STARLIGHT LABYRINTH'
                  : 'ASTRAL TRAINING SANDBOX'}
            </h1>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <RpgTabs<EndgameTab>
            layoutId="endgame-hub-tabs"
            value={tab}
            onChange={(t) => {
              audioManager.playSfx('button');
              setTab(t);
            }}
            items={[
              {
                key: 'RAID',
                label: claimableRaidCount > 0 ? `World Boss (${claimableRaidCount})` : 'World Boss',
                icon: 'battle',
                accent: 'gold',
              },
              {
                key: 'LABYRINTH',
                label: claimableLabCount > 0 ? `Labyrinth (${claimableLabCount})` : 'Labyrinth',
                icon: 'worldmap',
                accent: 'cyan',
              },
              {
                key: 'SANDBOX',
                label: 'DPS Sandbox',
                icon: 'forge',
                accent: 'cyan',
              },
            ]}
          />

          <RpgButton
            variant="slate"
            size="sm"
            onClick={() => {
              audioManager.playSfx('button');
              setShowPartyModal(true);
            }}
            className="font-display font-black uppercase"
          >
            <Users className="w-3.5 h-3.5 text-amber-300" />
            <span className="hidden md:inline">Squad</span>
            <span className="font-mono text-cyan-300">{squadPower.toLocaleString()}</span>
          </RpgButton>
        </div>
      </div>

      {/* TOAST FEEDBACK */}
      {notice && (
        <div
          className={`relative z-30 mx-4 mt-2 px-4 py-2 rounded-xl border text-xs font-bold flex items-center gap-2 ${
            notice.ok
              ? 'bg-emerald-950/90 border-emerald-400/65 text-emerald-200'
              : 'bg-amber-950/90 border-amber-400/65 text-amber-200'
          }`}
        >
          <Sparkles className="w-4 h-4 shrink-0" />
          <span>{notice.text}</span>
        </div>
      )}

      {/* MAIN CONTENT AREA */}
      <div className="relative z-10 flex-1 min-h-0 overflow-y-auto px-3 sm:px-5 py-3 safe-bottom">
        {/* ================================================================ */}
        {/* MODE 1: ABYSSAL WORLD BOSS RAID (90-SECOND SCORE ATTACK)         */}
        {/* ================================================================ */}
        {tab === 'RAID' && (
          <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-3.5">
            {/* LEFT 7 COLS: Boss Selector + Colossal Boss Showcase + Deploy Bar */}
            <div className="lg:col-span-7 flex flex-col gap-3">
              {/* 3 Rotating Colossal World Boss Selector Pills */}
              <div className="grid grid-cols-3 gap-2">
                {WORLD_BOSSES.map((b) => {
                  const selected = b.id === selectedBossId;
                  const isFeatured = b.id === featuredBossId;
                  const bossBest = bestByBoss[b.id] ?? 0;
                  return (
                    <button
                      key={b.id}
                      type="button"
                      onClick={() => {
                        audioManager.playSfx('button');
                        setSelectedBossId(b.id);
                      }}
                      className={`relative rounded-2xl p-2.5 border-2 text-left transition overflow-hidden flex items-center gap-2.5 ${
                        selected
                          ? 'bg-slate-900/90 shadow-[0_0_24px_rgba(245,200,76,0.3)]'
                          : 'bg-slate-950/80 border-white/12 hover:border-amber-300/50 opacity-85'
                      }`}
                      style={{
                        borderColor: selected ? b.themeColor : undefined,
                      }}
                    >
                      {isFeatured && (
                        <span className="absolute bottom-1.5 right-2 px-1.5 py-0.5 rounded bg-gradient-to-r from-amber-400 to-rose-500 text-[8px] font-display font-black uppercase text-slate-950 shadow">
                          +25% SCORE
                        </span>
                      )}
                      <div
                        className="w-12 h-12 rounded-xl border bg-slate-950/90 flex items-center justify-center shrink-0 overflow-hidden p-0.5"
                        style={{ borderColor: `${b.themeColor}88` }}
                      >
                        <img
                          src={b.spriteAsset}
                          alt={b.name}
                          className="w-full h-full object-contain"
                          draggable={false}
                        />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="font-display font-black text-xs sm:text-sm text-white truncate">
                          {b.name}
                        </div>
                        <div className="text-[9px] text-slate-400 truncate">{b.subtitle}</div>
                        <div className="font-mono text-[10px] font-bold mt-0.5" style={{ color: b.themeColor }}>
                          Best: {bossBest.toLocaleString()}
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>

              {/* MONUMENTAL WORLD BOSS SHOWCASE STAGE */}
              <div
                className="relative rpg-panel rounded-2xl overflow-hidden border-2 p-4 sm:p-5 flex flex-col justify-between min-h-[340px]"
                style={{ borderColor: `${activeBoss.themeColor}aa` }}
              >
                <CornerFiligree color={activeBoss.themeColor} size={11} opacity={0.85} />
                <img
                  src="/assets/ui/card_endgame_raid.webp"
                  alt="Abyssal Raid Banner"
                  className="absolute inset-0 w-full h-full object-cover opacity-35"
                  draggable={false}
                />
                <div
                  className="absolute inset-0"
                  style={{
                    background: `radial-gradient(circle at 75% 42%, ${activeBoss.themeColor}38 0%, rgba(8,10,26,0.92) 66%)`,
                  }}
                />

                {/* Top info + Colossal Boss Artwork */}
                <div className="relative z-10 grid grid-cols-1 sm:grid-cols-12 gap-3 items-center">
                  <div className="sm:col-span-7 space-y-2.5">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span
                        className="px-2.5 py-0.5 rounded-full text-[9px] font-display font-black uppercase tracking-[0.16em] border bg-slate-950/90"
                        style={{ borderColor: activeBoss.themeColor, color: activeBoss.themeColor }}
                      >
                        90S INFINITE-BAR SCORE ATTACK
                      </span>
                      {selectedBossId === featuredBossId && (
                        <span className="px-2 py-0.5 rounded-full bg-amber-400/25 border border-amber-300 text-amber-200 text-[9px] font-display font-black uppercase">
                          ★ WEEKLY FEATURED (+25% SCORE)
                        </span>
                      )}
                    </div>

                    <div>
                      <h2 className="font-display text-2xl sm:text-3xl font-black text-white text-glow-gold leading-none">
                        {activeBoss.name}
                      </h2>
                      <div className="text-xs font-bold text-amber-200 mt-0.5">
                        {activeBoss.title}
                      </div>
                    </div>

                    <p className="text-xs text-slate-300 leading-relaxed">{activeBoss.lore}</p>

                    {/* Faction Weakness Badges (+35% DMG) */}
                    <div className="rounded-xl bg-slate-950/85 border border-white/15 p-2.5 space-y-1.5">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-[10px] font-display font-black uppercase tracking-wider text-amber-300">
                          Faction Weakness (+35% DMG &amp; +25% Break)
                        </span>
                      </div>
                      <div className="flex items-center gap-2 flex-wrap">
                        {activeBoss.weakFactions.map((fac) => (
                          <span
                            key={fac}
                            className="px-2.5 py-1 rounded-lg border text-[10px] font-display font-black uppercase tracking-wider bg-slate-900"
                            style={{
                              borderColor: FACTIONS[fac].color,
                              color: FACTIONS[fac].color,
                            }}
                          >
                            ★ {FACTIONS[fac].name}
                          </span>
                        ))}
                      </div>
                      <div className="text-[10px] text-slate-300 leading-snug">
                        {activeBoss.signatureMechanic}
                      </div>
                    </div>
                  </div>

                  {/* Colossal Floating Boss Sprite */}
                  <div className="sm:col-span-5 flex items-center justify-center">
                    <motion.img
                      key={activeBoss.id}
                      initial={{ opacity: 0, scale: 0.9, y: 12 }}
                      animate={{ opacity: 1, scale: 1, y: [0, -8, 0] }}
                      transition={{
                        opacity: { duration: 0.35 },
                        y: { duration: 3.4, repeat: Infinity, ease: 'easeInOut' },
                      }}
                      src={activeBoss.spriteAsset}
                      alt={activeBoss.name}
                      draggable={false}
                      className="w-52 h-52 sm:w-64 sm:h-64 object-contain"
                      style={{
                        filter: `drop-shadow(0 16px 28px rgba(0,0,0,0.9)) drop-shadow(0 0 24px ${activeBoss.themeColor}66)`,
                      }}
                    />
                  </div>
                </div>

                {/* Intensity Tier Selector + Deploy CTA */}
                <div className="relative z-10 mt-4 pt-3 border-t border-white/15 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="grid grid-cols-3 gap-1.5 flex-1">
                    {RAID_TIER_CONFIGS.map((t) => {
                      const unlocked = isRaidTierUnlocked(t.tier, player.clearedStages);
                      const active = t.tier === selectedRaidTier && unlocked;
                      return (
                        <button
                          key={t.tier}
                          type="button"
                          onClick={() => {
                            audioManager.playSfx('button');
                            if (!unlocked) {
                              notify(`Locked: ${t.unlockLabel ?? 'Advance Campaign to unlock.'}`, false);
                              return;
                            }
                            setSelectedRaidTier(t.tier);
                          }}
                          className={`rounded-xl px-2.5 py-1.5 border text-left transition ${
                            !unlocked
                              ? 'bg-slate-950/60 border-white/10 opacity-55 cursor-not-allowed'
                              : active
                                ? 'bg-slate-900/95 shadow-lg'
                                : 'bg-slate-950/75 border-white/10 opacity-80 hover:opacity-100'
                          }`}
                          style={{ borderColor: active ? t.color : undefined }}
                        >
                          <div className="flex items-center justify-between gap-1">
                            <span
                              className="font-display font-black text-[10px] uppercase leading-none truncate"
                              style={{ color: unlocked ? t.color : '#94a3b8' }}
                            >
                              {t.label}
                            </span>
                            {!unlocked && <Lock className="w-3 h-3 text-slate-400 shrink-0" />}
                          </div>
                          <div className="font-mono text-[9px] text-slate-300 mt-0.5 truncate">
                            {unlocked
                              ? `${t.scoreMultiplier}× Score • PWR ${(t.recommendedPower / 1000).toFixed(0)}k`
                              : t.unlockLabel ?? 'Locked'}
                          </div>
                        </button>
                      );
                    })}
                  </div>

                  <div className="flex flex-col items-end gap-1 shrink-0">
                    <RpgButton
                      variant="gold"
                      size="md"
                      onClick={() => {
                        audioManager.playSfx('button');
                        onDeployEndgame(
                          encodeWorldBossStageId(selectedBossId, selectedRaidTier),
                          'RAID',
                        );
                      }}
                      className="font-display font-black uppercase tracking-wider px-5"
                    >
                      <Swords className="w-4 h-4" />
                      <span>
                        {raidAttempts.left > 0
                          ? `Challenge Raid (${raidAttempts.left}/${raidAttempts.max})`
                          : 'Challenge (Score Attack)'}
                      </span>
                    </RpgButton>
                    <span className="text-[9px] text-slate-400 font-mono">
                      Rec PWR {activeTierCfg.recommendedPower.toLocaleString()} • 90s Timed Battle
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* RIGHT 5 COLS: Weekly Score Rank + 6 Visual-Icon Milestone Chests */}
            <div className="lg:col-span-5 rpg-panel rounded-2xl p-4 flex flex-col gap-3 border-amber-400/45">
              <CornerFiligree color="#f5c84c" size={9} opacity={0.75} />

              <div className="flex items-center justify-between gap-2 pb-2 border-b border-white/10">
                <div>
                  <div className="text-[10px] font-display font-black uppercase tracking-[0.18em] text-amber-300">
                    WEEKLY RAID SCORE RANKING
                  </div>
                  <div className="font-mono text-2xl font-black text-white mt-0.5">
                    {weeklyBestScore.toLocaleString()}{' '}
                    <span className="text-xs font-sans text-slate-400">PTS</span>
                  </div>
                </div>
                <div
                  className="px-3.5 py-2 rounded-xl border-2 text-center"
                  style={{
                    borderColor: currentRank.color,
                    background: currentRank.badgeBg,
                  }}
                >
                  <div className="text-[9px] font-display font-black uppercase text-slate-200">
                    RANK
                  </div>
                  <div
                    className="font-display text-sm font-black uppercase tracking-wider"
                    style={{ color: currentRank.color }}
                  >
                    {currentRank.label}
                  </div>
                </div>
              </div>

              {/* 6 Weekly Score Milestone Rewards with Visual RPG Item Icon Tiles */}
              <div className="space-y-2 flex-1 overflow-y-auto pr-0.5">
                {WEEKLY_RAID_MILESTONES.map((ms) => {
                  const isClaimed = claimedRaidMs.includes(ms.score);
                  const isReady = weeklyBestScore >= ms.score && !isClaimed;
                  return (
                    <div
                      key={ms.score}
                      className={`rounded-xl p-2.5 border flex items-center justify-between gap-2 transition ${
                        isReady
                          ? 'bg-amber-500/18 border-amber-300 shadow-[0_0_18px_rgba(245,200,76,0.28)]'
                          : isClaimed
                            ? 'bg-emerald-950/25 border-emerald-400/40 opacity-70'
                            : 'bg-slate-950/80 border-white/10'
                      }`}
                    >
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                          <Trophy className="w-3.5 h-3.5 shrink-0" style={{ color: ms.color }} />
                          <span
                            className="font-display font-black text-xs uppercase"
                            style={{ color: ms.color }}
                          >
                            {ms.rankLabel}
                          </span>
                          <span className="font-mono text-[10px] font-bold text-slate-300">
                            {(ms.score / 1000).toLocaleString()}K PTS
                          </span>
                        </div>
                        <div className="mt-1.5">
                          <RewardItemStrip reward={ms.reward} size="xs" claimed={isClaimed} />
                        </div>
                      </div>

                      <div className="shrink-0">
                        {isClaimed ? (
                          <span className="px-2.5 py-1 rounded-lg bg-emerald-500/15 border border-emerald-400/50 text-emerald-300 text-[9px] font-display font-black uppercase flex items-center gap-1">
                            <CheckCircle2 className="w-3 h-3" /> Done
                          </span>
                        ) : (
                          <RpgButton
                            variant={isReady ? 'gold' : 'slate'}
                            size="xs"
                            disabled={!isReady}
                            onClick={() => {
                              const res = player.claimRaidMilestone(ms.score);
                              audioManager.playSfx(res.ok ? 'ssr_reveal' : 'button');
                              notify(res.message, res.ok);
                            }}
                            className="font-display font-black uppercase"
                          >
                            {isReady ? 'Claim' : 'Locked'}
                          </RpgButton>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* ================================================================ */}
        {/* MODE 2: STARLIGHT LABYRINTH (ROGUELIKE WEEKLY EXPEDITION)        */}
        {/* ================================================================ */}
        {tab === 'LABYRINTH' && (
          <div className="max-w-7xl mx-auto space-y-3.5">
            {/* Illustrated Hero Header Banner */}
            <div className="relative rounded-2xl overflow-hidden border-2 border-fuchsia-400/60 p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <img
                src="/assets/ui/card_endgame_labyrinth.webp"
                alt="Starlight Labyrinth"
                className="absolute inset-0 w-full h-full object-cover opacity-45"
                draggable={false}
              />
              <div
                className="absolute inset-0"
                style={{
                  background:
                    'linear-gradient(95deg, rgba(8,10,28,0.95) 0%, rgba(28,14,56,0.8) 55%, rgba(16,24,52,0.45) 100%)',
                }}
              />
              <div className="relative z-10 space-y-1 max-w-xl">
                <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-fuchsia-500/20 border border-fuchsia-300/70 text-[10px] font-display font-black uppercase tracking-[0.18em] text-fuchsia-200">
                  <Compass className="w-3 h-3" /> ROGUELIKE BRANCHING EXPEDITION • {labWeeklyClears}/3 WEEKLY CLEARS
                </div>
                <h2 className="font-display text-xl sm:text-2xl font-black text-white text-glow-gold leading-tight">
                  Starlight Astral Labyrinth
                </h2>
                <p className="text-xs text-slate-200 leading-relaxed">
                  Navigate a 6-layer branching rift! Your squad&apos;s HP persists between battles.
                  Clear encounters &amp; Altars to draft stacking{' '}
                  <strong className="text-amber-300">Astral Blessings</strong> that supercharge your
                  combat skills, Crits, and Link Bursts!
                </p>
              </div>
              <div className="relative z-10 flex items-center gap-2 shrink-0">
                <RpgButton
                  variant={labRun && !labRun.completed ? 'cyan' : 'gold'}
                  size="md"
                  onClick={() => {
                    audioManager.playSfx('ssr_reveal');
                    player.startOrResetLabyrinthRun(squadPower);
                    notify('New Starlight Labyrinth Expedition charted! Select Depth 1 to begin.');
                  }}
                  className="font-display font-black uppercase tracking-wider"
                >
                  <RefreshCw className="w-4 h-4" />
                  <span>{labRun ? 'New Expedition Run' : 'Start Expedition'}</span>
                </RpgButton>
              </div>
            </div>

            {/* PENDING 1-OF-3 ASTRAL BLESSING DRAFT DRAWER */}
            {labRun && labRun.pendingBlessingChoices.length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                className="rpg-panel rounded-2xl p-4 border-2 border-amber-300 shadow-[0_0_32px_rgba(253,224,71,0.3)] space-y-3"
              >
                <div className="flex items-center justify-between gap-2">
                  <div>
                    <div className="text-[10px] font-display font-black uppercase tracking-[0.2em] text-amber-300">
                      ASTRAL BLESSING DRAFT
                    </div>
                    <h3 className="font-display text-lg font-black text-white">
                      Choose 1 of 3 Blessings to Bind to Your Squad
                    </h3>
                  </div>
                  <Sparkles className="w-6 h-6 text-amber-300 animate-spin" style={{ animationDuration: '4s' }} />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {labRun.pendingBlessingChoices.map((bid) => {
                    const b = ASTRAL_BLESSING_MAP[bid];
                    if (!b) return null;
                    const rColor = BLESSING_RARITY_COLOR[b.rarity];
                    return (
                      <motion.button
                        key={b.id}
                        type="button"
                        whileHover={{ y: -3, scale: 1.02 }}
                        whileTap={{ scale: 0.97 }}
                        onClick={() => {
                          const res = player.pickLabyrinthBlessing(b.id);
                          audioManager.playSfx('ssr_reveal');
                          notify(res.message, res.ok);
                        }}
                        className="relative rounded-2xl p-3.5 border-2 text-left transition flex flex-col justify-between gap-2.5 overflow-hidden"
                        style={{
                          borderColor: rColor,
                          background: `radial-gradient(circle at 50% 15%, ${rColor}30 0%, rgba(10,14,34,0.96) 68%)`,
                        }}
                      >
                        <CornerFiligree color={rColor} size={8} opacity={0.8} />
                        <div className="space-y-1.5">
                          <div className="flex items-center justify-between gap-1">
                            <span
                              className="px-2 py-0.5 rounded-full text-[9px] font-display font-black uppercase border"
                              style={{ borderColor: rColor, color: rColor }}
                            >
                              {b.rarity} • {b.category}
                            </span>
                            <Sparkles className="w-4 h-4" style={{ color: rColor }} />
                          </div>
                          <div className="font-display font-black text-sm text-white">
                            {b.name}
                          </div>
                          <p className="text-xs text-slate-200 leading-snug">{b.desc}</p>
                        </div>
                        <div
                          className="text-[10px] font-display font-black uppercase tracking-wider text-center py-1.5 rounded-lg border"
                          style={{
                            borderColor: `${rColor}99`,
                            backgroundColor: `${rColor}22`,
                            color: rColor,
                          }}
                        >
                          Select Blessing →
                        </div>
                      </motion.button>
                    );
                  })}
                </div>
              </motion.div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-3.5">
              {/* LEFT 8 COLS: 6-Layer Interactive Branching Labyrinth Map */}
              <div className="lg:col-span-8 rpg-panel rounded-2xl p-4 border-cyan-400/45 space-y-3">
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <div className="font-display font-black text-xs uppercase tracking-[0.18em] text-cyan-300 flex items-center gap-1.5">
                    <Compass className="w-4 h-4" /> Expedition Map (Depth 1 → Sovereign Boss)
                  </div>
                  {labRun?.completed && (
                    <span className="px-2.5 py-1 rounded-full bg-emerald-500/20 border border-emerald-300 text-emerald-200 text-[10px] font-display font-black uppercase">
                      ★ EXPEDITION CLEARED! Start a New Run anytime
                    </span>
                  )}
                </div>

                {!labRun ? (
                  <div className="py-12 text-center space-y-3">
                    <div className="text-sm text-slate-300">
                      No active Starlight Labyrinth expedition yet.
                    </div>
                    <RpgButton
                      variant="gold"
                      size="md"
                      onClick={() => {
                        audioManager.playSfx('ssr_reveal');
                        player.startOrResetLabyrinthRun(squadPower);
                      }}
                      className="mx-auto font-display font-black uppercase"
                    >
                      <Sparkles className="w-4 h-4" /> Launch Expedition Run
                    </RpgButton>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-2.5">
                    {labNodesByDepth.map((colNodes, depthIdx) => (
                      <div key={depthIdx} className="flex flex-col justify-center gap-2.5">
                        <div className="text-center font-mono text-[9px] font-black uppercase tracking-widest text-slate-400">
                          {depthIdx === 5 ? 'FINAL' : `DEPTH ${depthIdx + 1}`}
                        </div>
                        {colNodes.map((node) => {
                          const meta = NODE_TYPE_META[node.type];
                          const isAvailable =
                            !labRun.completed &&
                            labRun.pendingBlessingChoices.length === 0 &&
                            labRun.availableNodeIds.includes(node.id);
                          const isCleared = node.cleared;

                          return (
                            <motion.button
                              key={node.id}
                              type="button"
                              disabled={!isAvailable}
                              whileHover={isAvailable ? { y: -3, scale: 1.03 } : undefined}
                              whileTap={isAvailable ? { scale: 0.96 } : undefined}
                              onClick={() => handleLabyrinthNodeClick(node)}
                              className={`relative rounded-xl p-2.5 border-2 text-left transition flex flex-col justify-between gap-1.5 min-h-[108px] ${
                                isAvailable
                                  ? 'shadow-[0_0_22px_rgba(56,232,255,0.4)] cursor-pointer'
                                  : isCleared
                                    ? 'bg-emerald-950/35 border-emerald-400/50 opacity-80 cursor-default'
                                    : 'bg-slate-950/75 border-white/10 opacity-50 cursor-default'
                              }`}
                              style={{
                                borderColor: isAvailable ? meta.color : undefined,
                                background: isAvailable
                                  ? `radial-gradient(circle at 50% 20%, ${meta.color}36 0%, rgba(10,16,38,0.96) 72%)`
                                  : undefined,
                              }}
                            >
                              <div className="flex items-center justify-between gap-1">
                                <span
                                  className="text-[8px] font-display font-black uppercase tracking-wider"
                                  style={{ color: isCleared ? '#34d399' : meta.color }}
                                >
                                  {meta.badge}
                                </span>
                                {isCleared && (
                                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                                )}
                              </div>
                              <div>
                                <div className="font-display font-bold text-[11px] text-white leading-tight">
                                  {node.title}
                                </div>
                                <div className="text-[9px] text-slate-300 leading-snug mt-0.5 line-clamp-2">
                                  {node.subtitle}
                                </div>
                              </div>
                              {isAvailable && (
                                <div
                                  className="text-[8px] font-display font-black uppercase tracking-wider text-center py-0.5 rounded bg-slate-950/85 border"
                                  style={{ borderColor: `${meta.color}99`, color: meta.color }}
                                >
                                  ENTER →
                                </div>
                              )}
                            </motion.button>
                          );
                        })}
                      </div>
                    ))}
                  </div>
                )}

                {/* PERSISTENT SQUAD HP STATUS + ACTIVE BLESSINGS STRIP */}
                {labRun && (
                  <div className="pt-3 border-t border-white/10 grid grid-cols-1 md:grid-cols-2 gap-3">
                    {/* Carry-over Squad HP */}
                    <div className="rounded-xl bg-slate-950/80 border border-white/10 p-2.5 space-y-2">
                      <div className="text-[10px] font-display font-black uppercase tracking-wider text-emerald-300 flex items-center gap-1">
                        <Heart className="w-3.5 h-3.5" /> Squad Expedition Vitality
                      </div>
                      <div className="grid grid-cols-2 gap-1.5">
                        {player.squadIds.map((hid) => {
                          const h = HERO_MAP[hid];
                          const own = player.roster[hid];
                          if (!h || !own) return null;
                          const ratio = labRun.heroHpRatios[hid] ?? 1;
                          const pct = Math.round(ratio * 100);
                          return (
                            <div
                              key={hid}
                              className="flex items-center gap-2 px-2 py-1 rounded-lg bg-slate-900/90 border border-white/10"
                            >
                              <div className="w-7 h-7 rounded-md overflow-hidden border border-white/20 shrink-0">
                                <ArtImage
                                  kind="HERO"
                                  id={hid}
                                  src={resolveHeroVisuals(h, own).card}
                                  alt={h.name}
                                  className={`w-full h-full object-cover object-top ${pct <= 0 ? 'grayscale opacity-45' : ''}`}
                                />
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center justify-between text-[10px]">
                                  <span className="font-bold text-white truncate">{h.name}</span>
                                  <span
                                    className={`font-mono font-black ${
                                      pct <= 0
                                        ? 'text-rose-400'
                                        : pct < 45
                                          ? 'text-amber-300'
                                          : 'text-emerald-300'
                                    }`}
                                  >
                                    {pct <= 0 ? 'KO' : `${pct}%`}
                                  </span>
                                </div>
                                <RpgProgressBar
                                  value={pct}
                                  max={100}
                                  heightClass="h-1.5"
                                  gradient={
                                    pct < 40
                                      ? 'linear-gradient(90deg, #f43f5e, #fb923c)'
                                      : 'linear-gradient(90deg, #10b981, #34d399)'
                                  }
                                />
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    {/* Active Astral Blessings */}
                    <div className="rounded-xl bg-slate-950/80 border border-white/10 p-2.5 space-y-2">
                      <div className="text-[10px] font-display font-black uppercase tracking-wider text-fuchsia-300 flex items-center gap-1">
                        <Sparkles className="w-3.5 h-3.5" /> Active Blessings ({labRun.activeBlessingIds.length})
                      </div>
                      {labRun.activeBlessingIds.length === 0 ? (
                        <div className="text-[11px] text-slate-400 py-2">
                          Clear nodes or visit Altars to stack combat-changing Astral Blessings!
                        </div>
                      ) : (
                        <div className="flex flex-wrap gap-1.5 max-h-[84px] overflow-y-auto">
                          {labRun.activeBlessingIds.map((bid, idx) => {
                            const b = ASTRAL_BLESSING_MAP[bid];
                            if (!b) return null;
                            const col = BLESSING_RARITY_COLOR[b.rarity];
                            return (
                              <span
                                key={`${bid}_${idx}`}
                                title={b.desc}
                                className="px-2 py-0.5 rounded-lg border text-[10px] font-bold bg-slate-900"
                                style={{ borderColor: `${col}88`, color: col }}
                              >
                                ✦ {b.name}
                              </span>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* RIGHT 4 COLS: Weekly Labyrinth Clear Rewards */}
              <div className="lg:col-span-4 rpg-panel rounded-2xl p-4 border-fuchsia-400/45 space-y-3">
                <CornerFiligree color="#e879f9" size={9} opacity={0.75} />
                <div>
                  <div className="text-[10px] font-display font-black uppercase tracking-[0.18em] text-fuchsia-300">
                    WEEKLY EXPEDITION REWARDS
                  </div>
                  <div className="font-display text-lg font-black text-white">
                    {labWeeklyClears} / 3 Full Clears This Week
                  </div>
                </div>

                <div className="space-y-2.5">
                  {WEEKLY_LABYRINTH_MILESTONES.map((ms) => {
                    const isClaimed = claimedLabMs.includes(ms.clears);
                    const isReady = labWeeklyClears >= ms.clears && !isClaimed;
                    return (
                      <div
                        key={ms.clears}
                        className={`rounded-xl p-3 border space-y-2 ${
                          isReady
                            ? 'bg-fuchsia-500/20 border-fuchsia-300 shadow-[0_0_18px_rgba(232,121,249,0.3)]'
                            : isClaimed
                              ? 'bg-emerald-950/25 border-emerald-400/40 opacity-70'
                              : 'bg-slate-950/80 border-white/10'
                        }`}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <div>
                            <div className="font-display font-bold text-xs text-white">
                              {ms.label}
                            </div>
                            <div className="font-mono text-[10px] text-fuchsia-300">
                              {Math.min(ms.clears, labWeeklyClears)}/{ms.clears} Boss Clears
                            </div>
                          </div>
                          {isClaimed ? (
                            <span className="px-2 py-0.5 rounded bg-emerald-500/15 border border-emerald-400/50 text-emerald-300 text-[9px] font-display font-black uppercase">
                              Claimed
                            </span>
                          ) : (
                            <RpgButton
                              variant={isReady ? 'gold' : 'slate'}
                              size="xs"
                              disabled={!isReady}
                              onClick={() => {
                                const res = player.claimLabyrinthMilestone(ms.clears);
                                audioManager.playSfx(res.ok ? 'ssr_reveal' : 'button');
                                notify(res.message, res.ok);
                              }}
                              className="font-display font-black uppercase"
                            >
                              {isReady ? 'Claim' : 'Locked'}
                            </RpgButton>
                          )}
                        </div>
                        <RewardItemStrip reward={ms.reward} size="xs" claimed={isClaimed} />
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ================================================================ */}
        {/* MODE 3: ASTRAL TRAINING SANDBOX (FREE LIVE DPS METER LAB)        */}
        {/* ================================================================ */}
        {tab === 'SANDBOX' && (
          <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-4">
            {/* LEFT 5 COLS: Astral Resonance Monolith Showcase */}
            <div className="lg:col-span-5 rpg-panel rounded-2xl p-5 border-2 border-cyan-400/65 flex flex-col items-center justify-between text-center relative overflow-hidden">
              <CornerFiligree color="#38e8ff" size={11} opacity={0.85} />
              <div
                className="pointer-events-none absolute inset-0"
                style={{
                  background:
                    'radial-gradient(circle at 50% 42%, rgba(56,232,255,0.22) 0%, rgba(7,11,26,0.95) 68%)',
                }}
              />
              <div className="relative z-10 space-y-1">
                <span className="px-2.5 py-0.5 rounded-full bg-cyan-500/20 border border-cyan-300/70 text-[10px] font-display font-black uppercase tracking-[0.18em] text-cyan-200">
                  0 COST • UNLIMITED BENCHMARK LAB
                </span>
                <h2 className="font-display text-2xl font-black text-white text-glow-gold pt-1">
                  Astral Resonance Monolith
                </h2>
                <p className="text-xs text-slate-300">
                  Benchmark Constellation C1–C6, UR Sovereign Auras, Relics, Pets &amp; Reforged Gear
                  with a Live Real-Time DPS Meter!
                </p>
              </div>

              <motion.img
                animate={{ y: [0, -10, 0] }}
                transition={{ duration: 3.2, repeat: Infinity, ease: 'easeInOut' }}
                src="/assets/enemies/boss_training_monolith.webp"
                alt="Astral Resonance Monolith"
                draggable={false}
                className="relative z-10 w-56 h-56 sm:w-64 sm:h-64 object-contain my-2"
                style={{
                  filter:
                    'drop-shadow(0 16px 26px rgba(0,0,0,0.9)) drop-shadow(0 0 26px rgba(56,232,255,0.55))',
                }}
              />

              <div className="relative z-10 w-full flex items-center justify-center gap-2 text-[10px] font-mono text-cyan-200">
                <span className="px-2.5 py-1 rounded-lg bg-slate-950/90 border border-cyan-400/40">
                  <Activity className="w-3 h-3 inline mr-1" />
                  Live Per-Hero DPS Bar
                </span>
                <span className="px-2.5 py-1 rounded-lg bg-slate-950/90 border border-amber-400/40 text-amber-200">
                  <Zap className="w-3 h-3 inline mr-1" />
                  Full Battle Report
                </span>
              </div>
            </div>

            {/* RIGHT 7 COLS: Simulation Parameters & Launch */}
            <div className="lg:col-span-7 rpg-panel rounded-2xl p-5 border-cyan-400/45 flex flex-col justify-between gap-4">
              <div className="space-y-4">
                {/* Target Formation Preset */}
                <div className="space-y-2">
                  <div className="text-[10px] font-display font-black uppercase tracking-[0.18em] text-cyan-300 flex items-center gap-1.5">
                    <Target className="w-3.5 h-3.5" /> 1. Select Target Formation
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                    {SANDBOX_TARGET_PRESETS.map((p) => {
                      const active = p.mode === sandboxTarget;
                      return (
                        <button
                          key={p.mode}
                          type="button"
                          onClick={() => {
                            audioManager.playSfx('button');
                            setSandboxTarget(p.mode);
                          }}
                          className={`rounded-xl p-3 border-2 text-left transition space-y-1 ${
                            active
                              ? 'bg-slate-900/95 shadow-[0_0_20px_rgba(56,232,255,0.28)]'
                              : 'bg-slate-950/80 border-white/10 opacity-80 hover:opacity-100'
                          }`}
                          style={{ borderColor: active ? p.color : undefined }}
                        >
                          <div
                            className="font-display font-black text-xs uppercase"
                            style={{ color: p.color }}
                          >
                            {p.label}
                          </div>
                          <div className="text-[10px] font-bold text-white">{p.subtitle}</div>
                          <div className="text-[10px] text-slate-400 leading-snug">{p.desc}</div>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Test Timer + Enemy Aggression */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="rounded-xl bg-slate-950/80 border border-white/10 p-3 space-y-2">
                    <div className="text-[10px] font-display font-black uppercase tracking-wider text-amber-300 flex items-center gap-1.5">
                      <Timer className="w-3.5 h-3.5" /> 2. Simulation Duration
                    </div>
                    <div className="grid grid-cols-3 gap-1.5">
                      {([30, 60, 0] as SandboxDurationSec[]).map((sec) => {
                        const active = sandboxDuration === sec;
                        return (
                          <button
                            key={sec}
                            type="button"
                            onClick={() => {
                              audioManager.playSfx('button');
                              setSandboxDuration(sec);
                            }}
                            className={`py-2 rounded-lg border font-mono text-xs font-black transition ${
                              active
                                ? 'bg-amber-400/20 border-amber-300 text-amber-200'
                                : 'bg-slate-900 border-white/10 text-slate-400 hover:text-white'
                            }`}
                          >
                            {sec === 0 ? '∞ Endless' : `${sec}s`}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <div className="rounded-xl bg-slate-950/80 border border-white/10 p-3 space-y-2">
                    <div className="text-[10px] font-display font-black uppercase tracking-wider text-emerald-300 flex items-center gap-1.5">
                      <Shield className="w-3.5 h-3.5" /> 3. Dummy Counter-Attack
                    </div>
                    <div className="grid grid-cols-2 gap-1.5">
                      <button
                        type="button"
                        onClick={() => {
                          audioManager.playSfx('button');
                          setSandboxPassive(true);
                        }}
                        className={`py-2 px-2 rounded-lg border text-xs font-bold transition ${
                          sandboxPassive
                            ? 'bg-emerald-500/20 border-emerald-300 text-emerald-200'
                            : 'bg-slate-900 border-white/10 text-slate-400 hover:text-white'
                        }`}
                      >
                        Passive (0 DMG)
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          audioManager.playSfx('button');
                          setSandboxPassive(false);
                        }}
                        className={`py-2 px-2 rounded-lg border text-xs font-bold transition ${
                          !sandboxPassive
                            ? 'bg-rose-500/20 border-rose-300 text-rose-200'
                            : 'bg-slate-900 border-white/10 text-slate-400 hover:text-white'
                        }`}
                      >
                        Active (Test Tank)
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              <div className="pt-3 border-t border-white/10 flex flex-wrap items-center justify-between gap-3">
                <div className="text-xs text-slate-300">
                  Active Squad PWR:{' '}
                  <strong className="font-mono text-cyan-300">{squadPower.toLocaleString()}</strong> •
                  Free Entry (No Tickets, No Save Mutation)
                </div>
                <RpgButton
                  variant="cyan"
                  size="md"
                  onClick={() => {
                    audioManager.playSfx('button');
                    onDeployEndgame(
                      encodeSandboxStageId(sandboxTarget, sandboxDuration, sandboxPassive),
                      'SANDBOX',
                    );
                  }}
                  className="font-display font-black uppercase tracking-wider px-6"
                >
                  <Activity className="w-4 h-4" /> Enter DPS Sandbox
                </RpgButton>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* LABYRINTH REST SHRINE CHOICE MODAL */}
      <AnimatePresence>
        {pendingRestNodeId && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setPendingRestNodeId(null)}
            className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4"
          >
            <motion.div
              initial={{ scale: 0.92, y: 12 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.94 }}
              onClick={(e) => e.stopPropagation()}
              className="rpg-panel max-w-md w-full p-5 border-2 border-emerald-400/75 space-y-4"
            >
              <div className="text-center space-y-1">
                <div className="text-[10px] font-display font-black uppercase tracking-[0.2em] text-emerald-300">
                  CELESTIAL SPRING SANCTUARY
                </div>
                <h3 className="font-display text-xl font-black text-white">
                  Choose Your Recovery Blessing
                </h3>
              </div>
              <div className="grid grid-cols-1 gap-2.5">
                <RpgButton
                  variant="emerald"
                  size="md"
                  onClick={() => {
                    const res = player.resolveLabyrinthNonCombatNode(pendingRestNodeId, 'HEAL');
                    audioManager.playSfx('ssr_reveal');
                    notify(res.message, res.ok);
                    setPendingRestNodeId(null);
                  }}
                  className="w-full font-display font-black uppercase py-3"
                >
                  <Heart className="w-4 h-4" /> Restore +55% Max HP to Living Squad
                </RpgButton>
                <RpgButton
                  variant="cyan"
                  size="md"
                  onClick={() => {
                    const res = player.resolveLabyrinthNonCombatNode(pendingRestNodeId, 'REVIVE');
                    audioManager.playSfx('ssr_reveal');
                    notify(res.message, res.ok);
                    setPendingRestNodeId(null);
                  }}
                  className="w-full font-display font-black uppercase py-3"
                >
                  <Sparkles className="w-4 h-4" /> Revive 1 Fallen Hero (65% HP) + 25% Team Heal
                </RpgButton>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <PartyManagerModal open={showPartyModal} onClose={() => setShowPartyModal(false)} />
    </div>
  );
};
