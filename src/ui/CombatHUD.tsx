import React, { useEffect, useRef, useState } from 'react';
import {
  Activity,
  AlertTriangle,
  Crosshair,
  Crown,
  Flag,
  Flame,
  Heart,
  LogOut,
  Pause,
  Play,
  Settings,
  Shield,
  Sparkles,
  Swords,
  Timer,
  Trophy,
  Volume2,
  VolumeX,
  Wind,
  Zap,
} from 'lucide-react';
import { parseDungeonStageId, resolveAnyStageDef } from '../data/dungeons';
import { FACTIONS } from '../data/factions';
import { HERO_MAP } from '../data/heroes';
import { SPIRE_MAX_FLOOR, encodeSpireStageId, parseSpireStageId } from '../data/spire';
import {
  CAMPAIGN_DIFFICULTY_MAP,
  getCampaignStageById,
  getNextStageId,
  isStageUnlocked,
} from '../data/stages';
import { getFallbackCardSvg } from '../engine/AssetManager';
import { audioManager } from '../engine/AudioManager';
import { CombatEngine } from '../engine/CombatEngine';
import { getSquadSynergyPills } from '../engine/CombatMath';
import { useCombatStore } from '../store/useCombatStore';
import { usePlayerStore } from '../store/usePlayerStore';
import { useSettingsStore } from '../store/useSettingsStore';
import type { SkillDef } from '../types/game';
import { BossBanterOverlay } from './BossBanterOverlay';
import { GameIcon } from './GameIcon';
import { LinkBurstOverlay } from './LinkBurstOverlay';
import { ROLE_META } from './RoleBadge';
import { SettingsModal } from './SettingsModal';
import { UltimateCutInOverlay } from './UltimateCutInOverlay';
import { VictoryOverlay } from './VictoryOverlay';

interface CombatHUDProps {
  stageId: string;
  onSelectStage: (stageId: string) => void;
  onExit: () => void;
}

const PortraitImg: React.FC<{ heroId: string; src: string; className?: string }> = ({
  heroId,
  src,
  className,
}) => {
  const [failed, setFailed] = useState(false);
  return (
    <img
      src={failed ? getFallbackCardSvg('HERO', heroId) : src}
      onError={() => setFailed(true)}
      alt={heroId}
      className={className}
    />
  );
};

function renderSkillGlyph(skill: SkillDef, cls = 'w-4 h-4') {
  if (skill.effects.includes('HEAL')) return <Heart className={cls} />;
  if (skill.effects.includes('SHIELD') || skill.effects.includes('PROVOKE'))
    return <Shield className={cls} />;
  if (skill.effects.includes('BURN') || skill.effects.includes('BURN_DETONATE'))
    return <Flame className={cls} />;
  if (skill.effects.includes('GATHER') || skill.effects.includes('FREEZE'))
    return <Sparkles className={cls} />;
  if (skill.aimType === 'DASH') return <Wind className={cls} />;
  if (skill.aimType === 'LINE') return <Crosshair className={cls} />;
  return <Swords className={cls} />;
}

export const CombatHUD: React.FC<CombatHUDProps> = ({ stageId, onSelectStage, onExit }) => {
  const hostRef = useRef<HTMLDivElement | null>(null);
  const engineRef = useRef<CombatEngine | null>(null);
  const [runSeed, setRunSeed] = useState(0);
  const [showCombatSettings, setShowCombatSettings] = useState(false);
  const { muted, toggleMuted, enableUltCutIn, setEnableUltCutIn } = useSettingsStore();
  const clearedStages = usePlayerStore((s) => s.clearedStages);
  const squadIds = usePlayerStore((s) => s.squadIds);
  const roster = usePlayerStore((s) => s.roster);
  const activePetId = usePlayerStore((s) => s.activePetId);
  const ownedPets = usePlayerStore((s) => s.ownedPets);
  const getDungeonEntriesLeft = usePlayerStore((s) => s.getDungeonEntriesLeft);
  const getRaidAttemptsLeft = usePlayerStore((s) => s.getRaidAttemptsLeft);
  const parsedDungeon = parseDungeonStageId(stageId);
  const parsedSpireFloor = parseSpireStageId(stageId);
  const isDungeonStage = Boolean(parsedDungeon);
  const isSpireStage = parsedSpireFloor !== null;
  const resolvedStageDef = resolveAnyStageDef(stageId);
  const isWorldBossStage = Boolean(resolvedStageDef.isWorldBoss);
  const isLabyrinthStage = Boolean(resolvedStageDef.isLabyrinth);
  const isSandboxStage = Boolean(resolvedStageDef.isSandbox);
  const isEndgameMode = isWorldBossStage || isLabyrinthStage || isSandboxStage;
  const weakFactionMetas = (resolvedStageDef.raidWeakFactions ?? [])
    .map((f) => FACTIONS[f])
    .filter(Boolean);
  const activeSynergies = getSquadSynergyPills(squadIds, roster, activePetId, ownedPets);
  const dungeonCanReplay = parsedDungeon
    ? getDungeonEntriesLeft(parsedDungeon.dungeonId).canEnter
    : true;
  const canReplayBattle = isLabyrinthStage
    ? false
    : isWorldBossStage
      ? getRaidAttemptsLeft().left > 0
      : dungeonCanReplay;
  const nextStageId =
    isDungeonStage || isSpireStage || isEndgameMode ? null : getNextStageId(stageId);
  const candidateNext = nextStageId ? getCampaignStageById(nextStageId) : null;
  const nextStage =
    candidateNext && isStageUnlocked(candidateNext, clearedStages) ? candidateNext : null;
  const worldDiffCfg =
    resolvedStageDef.difficulty && resolvedStageDef.difficulty !== 'NORMAL'
      ? CAMPAIGN_DIFFICULTY_MAP[resolvedStageDef.difficulty]
      : null;
  const nextSpireFloor =
    isSpireStage && parsedSpireFloor < SPIRE_MAX_FLOOR ? parsedSpireFloor + 1 : null;

  const {
    paused,
    speedMultiplier,
    stageName,
    waveIndex,
    totalWaves,
    elapsedSec,
    sp,
    maxSp,
    ultGauge,
    maxUltGauge,
    globalUltCd,
    autoMove,
    autoSkill,
    fps,
    comboCount,
    comboDecayRatio,
    evadeCd,
    evadeMaxCd,
    inDangerZone,
    perfectDodgeId,
    perfectDodgeActive,
    bossWarning,
    waveBanner,
    touchJoystick,
    aiming,
    heroes,
    activePet,
    boss,
    activeBanter,
    linkWindow,
    bannerToast,
    combatResult,
    isWorldBoss,
    isSandbox,
    raidTimeRemaining,
    raidTimeLimitSec,
    raidTotalScore,
    raidBarsCleared,
    raidRankLabel,
    raidRankColor,
    sandboxDurationSec,
    liveDpsEntries,
    liveTotalDamage,
    liveSquadDps,
    toggleAutoMove,
    toggleAutoSkill,
    toggleSpeed,
    togglePause,
  } = useCombatStore();

  useEffect(() => {
    if (!hostRef.current) return;
    // Clear any stale Victory/Defeat banner synchronously before async PixiJS WebGL boot
    useCombatStore.getState().setCombatResult(null);
    const engine = new CombatEngine(hostRef.current, stageId);
    engineRef.current = engine;
    engine.init();

    return () => {
      engine.destroy();
      engineRef.current = null;
      useCombatStore.getState().setCombatResult(null);
    };
  }, [stageId, runSeed]);

  const formatClock = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  };

  const spSegments = Array.from({ length: maxSp }, (_, i) => Math.max(0, Math.min(1, sp - i)));
  const shortStageCode = stageName.split(' ')[0];

  const handleTriggerSkill = (heroId: string, slot: 1 | 2 | 'ULT') => {
    engineRef.current?.requestSkillAim(heroId, slot);
  };

  const handleSquadEvade = () => {
    engineRef.current?.triggerSquadEvade();
  };

  const evadeReady = evadeCd <= 0 && !combatResult;
  const evadeCdPct = evadeMaxCd > 0 ? Math.min(100, (evadeCd / evadeMaxCd) * 100) : 0;

  return (
    <div className="relative w-full h-full overflow-hidden bg-[#060916]">
      {/* Layer 1: Touch-Ready PixiJS 2.5D Battlefield */}
      <div ref={hostRef} className="absolute inset-0 w-full h-full cursor-crosshair touch-canvas" />

      {/* Layer 2: Authentic Grand Chase Mobile Floating Action HUD */}
      <div className="pointer-events-none absolute inset-0 flex flex-col justify-between safe-area-pad sm:p-2.5 ls-compact-pad">
        {/* TOP HUD STRIP */}
        <div className="flex flex-col gap-1">
          <div className="flex items-center justify-between gap-1.5">
            {/* Minimal Floating Stage Plaque */}
            <div
              className="pointer-events-auto rpg-panel-subtle px-2.5 py-1 flex items-center gap-1.5 sm:gap-2.5 border-l-4 min-w-0"
              style={{
                borderLeftColor: isWorldBossStage
                  ? '#fb7185'
                  : isLabyrinthStage
                    ? '#a78bfa'
                    : isSandboxStage
                      ? '#22d3ee'
                      : worldDiffCfg
                        ? worldDiffCfg.themeColor
                        : '#fbbf24',
              }}
            >
              {isWorldBossStage && (
                <span className="px-1.5 py-0.5 rounded text-[8px] sm:text-[9px] font-display font-black uppercase tracking-wider border border-rose-400/75 bg-rose-950/90 text-rose-200 shrink-0">
                  RAID
                </span>
              )}
              {isLabyrinthStage && (
                <span className="px-1.5 py-0.5 rounded text-[8px] sm:text-[9px] font-display font-black uppercase tracking-wider border border-violet-400/75 bg-violet-950/90 text-violet-200 shrink-0">
                  LABYRINTH
                </span>
              )}
              {isSandboxStage && (
                <span className="px-1.5 py-0.5 rounded text-[8px] sm:text-[9px] font-display font-black uppercase tracking-wider border border-cyan-400/75 bg-cyan-950/90 text-cyan-200 shrink-0">
                  DPS LAB
                </span>
              )}
              {worldDiffCfg && !isEndgameMode && (
                <span
                  className="px-1.5 py-0.5 rounded text-[8px] sm:text-[9px] font-display font-black uppercase tracking-wider border bg-slate-950/90 shrink-0"
                  style={{
                    borderColor: worldDiffCfg.themeColor,
                    color: worldDiffCfg.themeColor,
                  }}
                >
                  {worldDiffCfg.shortLabel} {worldDiffCfg.label}
                </span>
              )}
              <div className="text-[10px] sm:text-[11px] font-display font-extrabold tracking-wider text-amber-300 uppercase truncate">
                <span className="sm:hidden">{shortStageCode}</span>
                <span className="hidden sm:inline">{stageName}</span>
              </div>
              <span className="text-slate-600">|</span>
              {!isWorldBossStage && !isSandboxStage && (
                <span className="text-[10px] sm:text-[11px] font-bold text-white shrink-0">
                  W{waveIndex}/{totalWaves}
                </span>
              )}
              <span className="font-mono text-[10px] sm:text-[11px] text-cyan-300 shrink-0">
                {isWorldBossStage && raidTimeLimitSec > 0
                  ? formatClock(Math.max(0, Math.ceil(raidTimeRemaining)))
                  : isSandboxStage && sandboxDurationSec > 0
                    ? formatClock(Math.max(0, Math.ceil(raidTimeRemaining)))
                    : formatClock(elapsedSec)}
              </span>
              <span className="font-mono text-[10px] text-emerald-400 hidden md:inline ls-hide shrink-0">
                {fps} FPS
              </span>
              {weakFactionMetas.map((wf) => (
                <span
                  key={wf.id}
                  title={`World Boss Weak to ${wf.name}: +35% DMG & +25% Break DMG`}
                  className="hidden lg:inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[9px] font-display font-black uppercase border shrink-0"
                  style={{
                    color: wf.color,
                    borderColor: `${wf.color}99`,
                    backgroundColor: `${wf.color}1c`,
                  }}
                >
                  <Trophy className="w-2.5 h-2.5" />
                  WEAK: {wf.name} +35%
                </span>
              ))}
              {/* Active Faction Resonance & Spire Modifier Badges */}
              {activeSynergies.map((syn) => (
                <span
                  key={syn.id}
                  title={`${syn.label}: ${syn.desc}`}
                  className="hidden lg:inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[9px] font-display font-black uppercase border shrink-0"
                  style={{
                    color: syn.color,
                    borderColor: `${syn.color}88`,
                    backgroundColor: `${syn.color}18`,
                  }}
                >
                  <Crown className="w-2.5 h-2.5" />
                  {syn.shortLabel}
                </span>
              ))}
              {resolvedStageDef.spireModifier && (
                <span
                  title={`${resolvedStageDef.spireModifier.name}: ${resolvedStageDef.spireModifier.desc}`}
                  className="hidden xl:inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[9px] font-display font-black uppercase border shrink-0"
                  style={{
                    color: resolvedStageDef.spireModifier.color,
                    borderColor: `${resolvedStageDef.spireModifier.color}88`,
                    backgroundColor: `${resolvedStageDef.spireModifier.color}18`,
                  }}
                >
                  <Zap className="w-2.5 h-2.5" />
                  {resolvedStageDef.spireModifier.name}
                </span>
              )}
              {resolvedStageDef.worldModifier && (
                <span
                  title={`${resolvedStageDef.worldModifier.name}: ${resolvedStageDef.worldModifier.desc}`}
                  className="hidden xl:inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[9px] font-display font-black uppercase border shrink-0"
                  style={{
                    color: resolvedStageDef.worldModifier.color,
                    borderColor: `${resolvedStageDef.worldModifier.color}88`,
                    backgroundColor: `${resolvedStageDef.worldModifier.color}18`,
                  }}
                >
                  <Flame className="w-2.5 h-2.5" />
                  {resolvedStageDef.worldModifier.name}
                </span>
              )}
            </div>

            {/* Rounded Tactile Auto, Speed 1x/2x & Pause Controls */}
            <div className="pointer-events-auto flex items-center gap-1 sm:gap-1.5 shrink-0">
              <button
                onClick={() => {
                  audioManager.playSfx('button');
                  toggleSpeed();
                }}
                title="Toggle Battle Speed (1x / 2x)"
                className={`px-2 sm:px-2.5 py-1 rounded-full text-[9px] sm:text-[10px] font-mono font-black uppercase tracking-wider border transition whitespace-nowrap ${
                  speedMultiplier === 2
                    ? 'bg-amber-400/25 border-amber-300 text-amber-200 shadow-[0_0_12px_rgba(245,200,76,0.5)]'
                    : 'bg-slate-950/90 border-slate-700 text-slate-300 hover:text-white'
                }`}
              >
                {speedMultiplier}×
              </button>
              <button
                onClick={toggleAutoMove}
                className={`px-2.5 py-1 rounded-full text-[9px] sm:text-[10px] font-black uppercase tracking-wider border transition whitespace-nowrap ${
                  autoMove
                    ? 'bg-slate-950/95 border-cyan-300 text-cyan-200 shadow-[0_0_12px_rgba(56,232,255,0.45)]'
                    : 'bg-slate-950/90 border-slate-700 text-slate-300 hover:text-white'
                }`}
              >
                <span className="sm:hidden">MOVE {autoMove ? 'ON' : 'OFF'}</span>
                <span className="hidden sm:inline">AUTO MOVE {autoMove ? 'ON' : 'OFF'}</span>
              </button>
              <button
                onClick={toggleAutoSkill}
                className={`px-2.5 py-1 rounded-full text-[9px] sm:text-[10px] font-black uppercase tracking-wider border transition whitespace-nowrap ${
                  autoSkill
                    ? 'bg-slate-950/95 border-amber-300 text-amber-200 shadow-[0_0_12px_rgba(245,200,76,0.45)]'
                    : 'bg-slate-950/90 border-slate-700 text-slate-300 hover:text-white'
                }`}
              >
                <span className="sm:hidden">SKILL {autoSkill ? 'ON' : 'OFF'}</span>
                <span className="hidden sm:inline">AUTO SKILL {autoSkill ? 'ON' : 'OFF'}</span>
              </button>
              <button
                onClick={() => {
                  audioManager.playSfx('button');
                  setEnableUltCutIn(!(enableUltCutIn ?? true));
                }}
                title={
                  (enableUltCutIn ?? true)
                    ? 'Ultimate Cut-In ON (click to switch to fast left-side callout banner)'
                    : 'Ultimate Cut-In OFF (showing fast left-side callout banner)'
                }
                className={`px-2 sm:px-2.5 py-1 rounded-full text-[9px] sm:text-[10px] font-black uppercase tracking-wider border transition whitespace-nowrap ${
                  (enableUltCutIn ?? true)
                    ? 'bg-slate-950/95 border-fuchsia-300 text-fuchsia-200 shadow-[0_0_12px_rgba(232,121,249,0.4)]'
                    : 'bg-slate-950/90 border-slate-700 text-slate-400 hover:text-white'
                }`}
              >
                <span className="sm:hidden">CUT {(enableUltCutIn ?? true) ? 'ON' : 'OFF'}</span>
                <span className="hidden sm:inline">CUT-IN {(enableUltCutIn ?? true) ? 'ON' : 'OFF'}</span>
              </button>
              <button
                onClick={() => toggleMuted()}
                className="rounded-full bg-slate-950/90 border border-slate-700 p-1.5 text-slate-200 hover:text-white"
                title="Toggle Sound"
              >
                {muted ? <VolumeX className="w-3.5 h-3.5" /> : <Volume2 className="w-3.5 h-3.5" />}
              </button>
              <button
                onClick={togglePause}
                className="rounded-full bg-slate-950/90 border border-slate-700 p-1.5 text-slate-200 hover:text-white"
                title="Pause"
              >
                {paused ? <Play className="w-3.5 h-3.5" /> : <Pause className="w-3.5 h-3.5" />}
              </button>
              <button
                onClick={onExit}
                className="rounded-full bg-slate-950/90 border border-rose-500/50 p-1.5 text-rose-300 hover:text-rose-100"
                title="Retreat"
              >
                <LogOut className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Ornate Gilded RPG Boss Gauge */}
          {boss && (
            <div className="w-full max-w-lg mx-auto rpg-panel px-3 py-1.5 border-fuchsia-400/55 shadow-[0_0_28px_rgba(217,70,239,0.28)]">
              <div className="flex items-center justify-between gap-2 text-xs mb-1">
                <div className="flex items-center gap-1.5 min-w-0">
                  <span className="px-1.5 py-0.5 rounded bg-fuchsia-600 text-[9px] font-black uppercase text-white shrink-0">
                    PH.{boss.phase}
                  </span>
                  {boss.enraged && (
                    <span className="px-1.5 py-0.5 rounded bg-rose-600 border border-amber-300/80 text-[9px] font-black uppercase text-white animate-pulse shrink-0 shadow-[0_0_12px_rgba(244,63,94,0.85)]">
                      ENRAGED
                    </span>
                  )}
                  <span className="font-display font-extrabold text-xs sm:text-sm text-white tracking-wider truncate">
                    {boss.name}
                  </span>
                  {boss.burnStacks > 0 && (
                    <span className="flex items-center gap-0.5 text-[10px] text-orange-400 font-black shrink-0">
                      <Flame className="w-3 h-3" />×{boss.burnStacks}
                    </span>
                  )}
                  {boss.defShredActive && (
                    <span className="px-1.5 py-0.5 rounded bg-amber-500/25 border border-amber-400/60 text-amber-200 text-[9px] font-black uppercase shrink-0">
                      DEF↓
                    </span>
                  )}
                  {boss.isBroken && (
                    <span className="px-1.5 py-0.5 rounded bg-cyan-300 text-slate-950 text-[9px] font-black uppercase animate-pulse shrink-0">
                      BROKEN +50% ({boss.brokenTimer}s)
                    </span>
                  )}
                </div>
                <span className="font-mono text-[10px] sm:text-[11px] text-fuchsia-200 font-bold shrink-0">
                  {boss.hp.toLocaleString()} / {boss.maxHp.toLocaleString()}
                </span>
              </div>

              <div className="relative h-2.5 w-full rounded-full bg-slate-950 overflow-hidden border border-amber-400/45">
                <div
                  className="h-full transition-all duration-100 bg-gradient-to-r from-rose-600 via-fuchsia-500 to-amber-400"
                  style={{ width: `${Math.max(0, (boss.hp / boss.maxHp) * 100)}%` }}
                />
                <div className="pointer-events-none absolute inset-0 grid grid-cols-10">
                  {Array.from({ length: 10 }, (_, i) => (
                    <div key={i} className="border-r border-black/35" />
                  ))}
                </div>
              </div>

              {/* Boss Stagger / Break Gauge Bar */}
              {boss.maxBreakGauge > 0 && (
                <div className="mt-1 flex items-center gap-2">
                  <span
                    className={`text-[9px] font-display font-black uppercase tracking-wider shrink-0 ${
                      boss.isBroken ? 'text-cyan-300 animate-pulse' : 'text-amber-300'
                    }`}
                  >
                    {boss.isBroken ? 'BROKEN' : 'BREAK'}
                  </span>
                  <div className="flex-1 h-1.5 rounded-full bg-slate-950 overflow-hidden border border-amber-400/50">
                    <div
                      className={`h-full transition-all duration-100 ${
                        boss.isBroken
                          ? 'bg-gradient-to-r from-cyan-300 via-sky-400 to-amber-200'
                          : 'bg-gradient-to-r from-amber-500 via-yellow-400 to-amber-200'
                      }`}
                      style={{
                        width: `${
                          boss.isBroken
                            ? Math.max(0, (boss.brokenTimer / Math.max(0.1, boss.brokenMaxTimer)) * 100)
                            : Math.max(0, (boss.breakGauge / boss.maxBreakGauge) * 100)
                        }%`,
                      }}
                    />
                  </div>
                  <span
                    className={`text-[9px] font-mono font-black shrink-0 ${
                      boss.isBroken ? 'text-cyan-200' : 'text-amber-200'
                    }`}
                  >
                    {boss.isBroken
                      ? `+50% DMG`
                      : `${Math.round((boss.breakGauge / boss.maxBreakGauge) * 100)}%`}
                  </span>
                </div>
              )}

              {boss.hitShield > 0 && (
                <div className="mt-1 flex items-center gap-2">
                  <Shield className="w-3 h-3 text-cyan-300 shrink-0" />
                  <div className="flex-1 h-1.5 rounded-full bg-slate-950 overflow-hidden border border-cyan-400/50">
                    <div
                      className="h-full bg-gradient-to-r from-cyan-400 to-fuchsia-400 transition-all duration-75"
                      style={{ width: `${(boss.hitShield / boss.maxHitShield) * 100}%` }}
                    />
                  </div>
                  <span className="text-[10px] font-mono font-black text-cyan-300">
                    {boss.hitShield} HITS
                  </span>
                </div>
              )}

              {boss.isCasting && (
                <div className="mt-1">
                  <div className="flex items-center justify-between text-[10px] font-black mb-0.5">
                    <span
                      className={`flex items-center gap-1 uppercase tracking-wider truncate ${
                        boss.castCancelable ? 'text-amber-300 animate-pulse' : 'text-rose-400'
                      }`}
                    >
                      <AlertTriangle className="w-3 h-3 shrink-0" />
                      {boss.castName}
                      {boss.castCancelable && ' — STUN TO CANCEL!'}
                    </span>
                    <span className="font-mono text-amber-200 shrink-0">
                      {Math.round(boss.castProgress * 100)}%
                    </span>
                  </div>
                  <div className="h-2 w-full rounded-full bg-slate-950 overflow-hidden border border-amber-400/75">
                    <div
                      className={`h-full transition-all duration-75 ${
                        boss.castCancelable
                          ? 'bg-gradient-to-r from-amber-400 via-orange-500 to-red-500'
                          : 'bg-rose-600'
                      }`}
                      style={{ width: `${boss.castProgress * 100}%` }}
                    />
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* UPPER EVENT TOAST & AIM PROMPT */}
        <div className="flex flex-col items-center gap-1 mt-1 mb-auto pointer-events-none px-2">
          {bannerToast && (
            <div
              className={`px-4 sm:px-6 py-1 rounded-full bg-slate-950/90 border border-amber-400/75 text-amber-300 font-display font-bold text-[11px] sm:text-sm tracking-[0.14em] uppercase text-center shadow-[0_4px_20px_rgba(0,0,0,0.85)] ${
                boss ? 'ls-hide' : ''
              }`}
            >
              {bannerToast}
            </div>
          )}
          {aiming && (
            <div className="px-4 py-1 rounded-full bg-cyan-950/95 border border-cyan-400 text-cyan-200 text-[10px] sm:text-[11px] font-extrabold tracking-wider uppercase text-center shadow-[0_0_20px_rgba(56,232,255,0.45)]">
              SLOW-MO 0.35× • {aiming.skillName} — TAP / DRAG ARENA TO CAST
            </div>
          )}
        </div>

        {/* GRAND CHASE MOBILE–STYLE FLOATING BOTTOM COMBAT DECK */}
        <div className="relative flex flex-col items-center gap-1.5 pb-0.5">
          {/* Soft atmospheric floor fade (no rigid box!) */}
          <div className="pointer-events-none fixed inset-x-0 bottom-0 h-28 sm:h-24 bg-gradient-to-t from-[#040714]/85 via-[#040714]/35 to-transparent -z-10" />

          {/* STARLIGHT LINK WINDOW COUNTDOWN STRIP (Cast another Hero's ULT for +35% Link Burst!) */}
          {linkWindow && !combatResult && (
            <div className="pointer-events-none px-3.5 py-1 rounded-full bg-gradient-to-r from-slate-950/95 via-indigo-950/95 to-slate-950/95 border border-amber-300/85 shadow-[0_0_24px_rgba(253,224,71,0.5)] flex items-center gap-2.5 max-w-xl">
              <Sparkles className="w-3.5 h-3.5 text-amber-300 animate-spin shrink-0" style={{ animationDuration: '3s' }} />
              <span className="font-display text-[10px] sm:text-xs font-black uppercase tracking-[0.16em] text-amber-200 whitespace-nowrap">
                LINK WINDOW ({linkWindow.remaining.toFixed(1)}s)
              </span>
              <div className="w-16 sm:w-24 h-1.5 rounded-full bg-slate-900 overflow-hidden border border-amber-300/40 shrink-0">
                <div
                  className="h-full bg-gradient-to-r from-cyan-300 via-amber-300 to-fuchsia-400 transition-all duration-75"
                  style={{ width: `${Math.min(100, (linkWindow.remaining / linkWindow.maxDuration) * 100)}%` }}
                />
              </div>
              <span className="hidden sm:inline text-[10px] font-bold text-cyan-200 truncate">
                Chain another Hero&apos;s ULT for +35% Link Burst!
              </span>
            </div>
          )}

          {/* Floating Arched SP Crystal Capsule & Party Chaser Energy Bar */}
          <div className="pointer-events-auto w-full max-w-3xl flex items-center gap-2 sm:gap-3 px-2.5 sm:px-3.5 py-1 rounded-full bg-slate-950/85 border border-cyan-400/35 backdrop-blur-md shadow-[0_6px_22px_rgba(0,0,0,0.75)]">
            {/* SP Orb Counter + 10 Faceted Cyan Crystals */}
            <div className="flex items-center gap-1.5 flex-1 min-w-0">
              <div className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-cyan-500/20 border border-cyan-300/60 shrink-0">
                <Zap className="w-3 h-3 text-cyan-300 fill-cyan-300" />
                <span className="font-mono text-[10px] sm:text-[11px] font-black text-white leading-none">
                  {sp.toFixed(1)}
                </span>
              </div>
              <div className="grid grid-cols-10 gap-1 flex-1">
                {spSegments.map((fill, i) => (
                  <div
                    key={i}
                    className="h-2 sm:h-2.5 rounded-full bg-slate-900/90 border border-cyan-400/35 overflow-hidden shadow-inner"
                  >
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-cyan-400 via-sky-300 to-white transition-all duration-75"
                      style={{
                        width: `${fill * 100}%`,
                        boxShadow: fill >= 1 ? '0 0 8px rgba(56,232,255,0.85)' : undefined,
                      }}
                    />
                  </div>
                ))}
              </div>
            </div>

            <div className="w-px h-4 bg-slate-700/80 shrink-0" />

            {/* Party Chaser Ultimate Energy Bar (2-Charge 90-cap for Link Burst Chaining!) */}
            <div className="flex items-center gap-1.5 w-32 sm:w-48 shrink-0">
              <GameIcon name="summon" className="w-4 h-4 sm:w-5 sm:h-5" />
              <div className="relative flex-1 h-2 sm:h-2.5 rounded-full bg-slate-900/95 border border-amber-400/50 overflow-hidden">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-amber-500 via-yellow-300 to-fuchsia-400 transition-all duration-100"
                  style={{
                    width: `${Math.min(100, (ultGauge / maxUltGauge) * 100)}%`,
                    boxShadow:
                      ultGauge >= 45 ? '0 0 12px rgba(253,224,71,0.95)' : undefined,
                  }}
                />
                {/* 45-Gauge (1× SSR ULT) Mid-Charge Divider Tick */}
                <div className="pointer-events-none absolute inset-y-0 left-1/2 w-[1.5px] bg-slate-950/85" />
              </div>
              <span
                className={`font-mono text-[10px] sm:text-[11px] font-black shrink-0 ${
                  ultGauge >= 90
                    ? 'text-fuchsia-300'
                    : ultGauge >= 45
                      ? 'text-amber-300'
                      : 'text-amber-200/80'
                }`}
              >
                {Math.floor(ultGauge)}/{maxUltGauge}
              </span>
            </div>
          </div>

          {/* 4 FLOATING GRAND CHASE HERO CLUSTERS (Zero-Overlap Math for 390x844, 844x390 & 1280x800!) */}
          <div className="pointer-events-auto grid grid-cols-2 sm:grid-cols-4 gap-1.5 lg:gap-3 w-full max-w-5xl px-0.5">
            {heroes.map((h, idx) => {
              const def = HERO_MAP[h.heroId];
              if (!def) return null;
              const s1 = def.skills[0];
              const s2 = def.skills[1];
              const s1Ready = h.alive && h.cd1 <= 0 && sp >= s1.spCost;
              const s2Ready = h.alive && h.cd2 <= 0 && sp >= s2.spCost;
              const isLinkPartnerEligible = Boolean(
                linkWindow && linkWindow.partnerHeroId !== h.heroId,
              );
              const onUltCd = h.ultCd > 0;
              const onGlobalLock = !onUltCd && globalUltCd > 0 && !isLinkPartnerEligible;
              const ultReady =
                h.alive && !onUltCd && !onGlobalLock && ultGauge >= h.ultGaugeCost;
              const isLinkReady = Boolean(ultReady && isLinkPartnerEligible);
              const ultPct = Math.min(100, Math.round((ultGauge / h.ultGaugeCost) * 100));
              const ultCdPct =
                h.maxUltCd > 0 ? Math.min(100, (h.ultCd / h.maxUltCd) * 100) : 0;
              const key1 = idx * 2 + 1;
              const key2 = idx * 2 + 2;
              const roleMeta = ROLE_META[def.role];

              return (
                <div
                  key={h.heroId}
                  className={`relative min-w-0 flex items-center justify-between gap-1 lg:gap-2 px-1.5 lg:px-2.5 py-1 rounded-full bg-gradient-to-r from-slate-950/90 via-slate-900/75 to-slate-950/85 backdrop-blur-md border transition ${
                    !h.alive
                      ? 'opacity-40 grayscale border-slate-800'
                      : ultReady
                        ? 'border-amber-300/90 shadow-[0_0_22px_rgba(245,200,76,0.48)]'
                        : 'border-white/15 shadow-[0_8px_20px_rgba(0,0,0,0.65)]'
                  }`}
                >
                  {/* Circular Hero Portrait Medallion + Integrated Curved HP/Shield Pill */}
                  <div className="relative flex flex-col items-center shrink-0">
                    <div
                      className={`relative w-10 h-10 lg:w-14 lg:h-14 rounded-full p-[2px] ${
                        ultReady ? 'animate-pulse' : ''
                      }`}
                      style={{
                        background: ultReady
                          ? 'linear-gradient(135deg, #fde047, #f472b6, #38e8ff)'
                          : `linear-gradient(135deg, ${h.themeColor}, rgba(15,23,42,0.95))`,
                        boxShadow: ultReady
                          ? '0 0 18px rgba(253,224,71,0.85)'
                          : `0 0 12px ${h.themeColor}44`,
                      }}
                    >
                      <div className="w-full h-full rounded-full overflow-hidden bg-slate-950">
                        <PortraitImg
                          heroId={h.heroId}
                          src={h.cardAsset ?? def.assets.card}
                          className="w-full h-full object-cover object-top"
                        />
                      </div>

                      {/* Tiny Class Emblem Badge (Top-Left of Portrait Ring) */}
                      <img
                        src={roleMeta.asset}
                        alt={roleMeta.label}
                        className="absolute -top-1 -left-1 w-4 h-4 lg:w-5 lg:h-5 object-contain drop-shadow-[0_1px_4px_rgba(0,0,0,0.95)]"
                      />

                      {/* Passive Stack Pill (Top-Right of Portrait Ring) */}
                      {h.stacksLabel && (
                        <span className="absolute -top-1 -right-1 px-1 rounded-full bg-slate-950 border border-cyan-400 text-[7px] lg:text-[8px] font-mono font-black text-cyan-200 leading-tight">
                          {h.stacksCount}
                        </span>
                      )}
                    </div>

                    {/* Curved HP + Shield Bar Tucked Right Under Portrait Chin */}
                    <div className="-mt-2 relative z-10 w-11 lg:w-16 bg-slate-950/95 border border-white/20 rounded-full px-1 py-[1.5px] shadow-md">
                      <div className="h-1 lg:h-1.5 w-full rounded-full bg-slate-800 relative overflow-hidden">
                        <div
                          className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-emerald-300 transition-all duration-100"
                          style={{ width: `${Math.max(0, (h.hp / h.maxHp) * 100)}%` }}
                        />
                        {h.shield > 0 && (
                          <div
                            className="absolute inset-y-0 left-0 rounded-full bg-sky-300/85"
                            style={{ width: `${Math.min(100, (h.shield / h.maxHp) * 100)}%` }}
                          />
                        )}
                      </div>
                      <div className="text-[7px] lg:text-[8px] font-display font-bold text-white truncate text-center leading-none mt-[1px]">
                        {h.name}
                      </div>
                    </div>
                  </div>

                  {/* 3 Glowing Circular Grand Chase Skill Orbs (S1, S2, ULT) */}
                  <div className="flex items-center gap-1 lg:gap-1.5 shrink-0">
                    {[
                      { slot: 1 as const, sk: s1, ready: s1Ready, cd: h.cd1, maxCd: h.maxCd1, key: key1 },
                      { slot: 2 as const, sk: s2, ready: s2Ready, cd: h.cd2, maxCd: h.maxCd2, key: key2 },
                    ].map(({ slot, sk, ready, cd, maxCd, key }) => {
                      const isAimingThis = aiming?.heroId === h.heroId && aiming.skillSlot === slot;
                      const cdPct = maxCd > 0 ? Math.min(100, (cd / maxCd) * 100) : 0;

                      return (
                        <button
                          key={slot}
                          disabled={!ready}
                          onClick={() => handleTriggerSkill(h.heroId, slot)}
                          title={`${sk.name} (${sk.spCost} SP): ${sk.description}`}
                          className={`gc-skill-orb w-8 h-8 lg:w-12 lg:h-12 flex flex-col items-center justify-center border-2 ${
                            isAimingThis
                              ? 'bg-cyan-500/45 border-cyan-200 ring-2 ring-cyan-300 text-white scale-105'
                              : ready
                                ? 'border-amber-300/80 text-white'
                                : 'bg-slate-950/90 border-slate-700/80 text-slate-600 cursor-not-allowed'
                          }`}
                          style={
                            ready && !isAimingThis
                              ? {
                                  background: `radial-gradient(circle at 32% 28%, ${h.themeColor}66 0%, rgba(16,24,52,0.95) 68%, rgba(6,10,24,0.98) 100%)`,
                                  borderColor: h.themeColor,
                                  boxShadow: `0 4px 14px rgba(0,0,0,0.78), 0 0 12px ${h.themeColor}44, inset 0 2px 3px rgba(255,255,255,0.32)`,
                                }
                              : undefined
                          }
                        >
                          {/* Desktop Hotkey Micro-Pill */}
                          <span className="hidden lg:flex ls-hide absolute -top-1 -left-1 w-4 h-4 rounded-full bg-slate-950 border border-slate-600 text-[8px] font-mono font-bold text-slate-300 items-center justify-center">
                            {key}
                          </span>

                          {/* Glowing Skill Emblem */}
                          <div style={{ color: ready ? '#ffffff' : undefined }}>
                            {renderSkillGlyph(sk, 'w-3.5 h-3.5 lg:w-5 lg:h-5')}
                          </div>

                          {/* Radial Conic Cooldown Sweep */}
                          {cd > 0 && (
                            <div
                              className="absolute inset-0 rounded-full flex items-center justify-center"
                              style={{
                                background: `conic-gradient(rgba(3, 7, 18, 0.86) ${cdPct}%, rgba(3, 7, 18, 0.25) 0)`,
                              }}
                            >
                              <span className="font-mono text-[9px] lg:text-xs font-black text-amber-300 drop-shadow-[0_1px_4px_rgba(0,0,0,1)]">
                                {cd}
                              </span>
                            </div>
                          )}

                          {/* Floating Cyan SP Cost Crystal Orb */}
                          <span className="absolute -bottom-1 -right-0.5 w-3.5 h-3.5 lg:w-4 lg:h-4 rounded-full bg-slate-950 border border-cyan-300 text-[7px] lg:text-[8px] font-mono font-black text-cyan-200 flex items-center justify-center shadow">
                            {sk.spCost}
                          </span>
                        </button>
                      );
                    })}

                    {/* Ultimate Chaser Starlight Burst Orb */}
                    <button
                      disabled={!ultReady}
                      onClick={() => handleTriggerSkill(h.heroId, 'ULT')}
                      title={
                        isLinkReady
                          ? `STARLIGHT LINK BURST READY! Cast ${def.ultimate.name} to trigger +35% Link Burst!`
                          : onUltCd
                            ? `ULTIMATE COOLDOWN: ${def.ultimate.name} ready in ${h.ultCd.toFixed(1)}s (${h.ultGaugeCost} Gauge · ${Math.round(h.maxUltCd)}s CD)`
                            : `ULTIMATE: ${def.ultimate.name} (${h.ultGaugeCost} Gauge · ${Math.round(h.maxUltCd)}s CD)`
                      }
                      className={`relative gc-skill-orb w-8 h-8 lg:w-12 lg:h-12 flex flex-col items-center justify-center border-2 ${
                        isLinkReady
                          ? 'bg-gradient-to-br from-cyan-300 via-amber-300 to-fuchsia-500 border-white text-slate-950 shadow-[0_0_26px_rgba(56,232,255,0.95)] scale-105 animate-pulse'
                          : ultReady
                            ? 'bg-gradient-to-br from-amber-300 via-orange-400 to-fuchsia-600 border-amber-100 text-slate-950 shadow-[0_0_20px_rgba(253,224,71,0.9)] animate-pulse'
                            : onUltCd
                              ? 'bg-slate-950/95 border-amber-500/45 text-slate-500 cursor-not-allowed'
                              : 'bg-slate-950/90 border-slate-700/80 text-slate-500 cursor-not-allowed'
                      }`}
                      style={
                        !ultReady && !onUltCd
                          ? {
                              background: `conic-gradient(rgba(245,200,76,0.28) ${ultPct}%, rgba(8,12,28,0.95) 0)`,
                            }
                          : undefined
                      }
                    >
                      <Sparkles
                        className={`w-3 h-3 lg:w-4 lg:h-4 ${
                          ultReady ? 'text-slate-950 fill-slate-950' : 'text-amber-400/55'
                        }`}
                      />
                      <span
                        className={`text-[6.5px] lg:text-[8px] font-black uppercase leading-none mt-0.5 ${
                          ultReady ? 'text-slate-950' : 'text-amber-200/75 font-mono'
                        }`}
                      >
                        {isLinkReady
                          ? 'LINK!'
                          : ultReady
                            ? 'ULT!'
                            : onGlobalLock && ultGauge >= h.ultGaugeCost
                              ? `${globalUltCd.toFixed(1)}s`
                              : `${ultPct}%`}
                      </span>

                      {/* Radial Conic Ultimate Cooldown Overlay */}
                      {onUltCd && (
                        <div
                          className="absolute inset-0 rounded-full flex items-center justify-center"
                          style={{
                            background: `conic-gradient(rgba(3, 7, 18, 0.90) ${ultCdPct}%, rgba(3, 7, 18, 0.35) 0)`,
                          }}
                        >
                          <span className="font-mono text-[9px] lg:text-xs font-black text-amber-300 drop-shadow-[0_1px_4px_rgba(0,0,0,1)]">
                            {h.ultCd >= 10 ? `${Math.ceil(h.ultCd)}s` : h.ultCd.toFixed(1)}
                          </span>
                        </div>
                      )}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* LIVE REAL-TIME DPS METER & WORLD BOSS SCORE PANEL (Top-Left Floating) */}
      {(isWorldBoss || isSandbox) && !combatResult && (
        <div className="pointer-events-none fixed left-2.5 sm:left-3 top-[50px] sm:top-[56px] z-20 w-[212px] sm:w-[252px] flex flex-col gap-1.5">
          {/* Raid Countdown + Score / Sandbox DPS Summary Card */}
          <div
            className="rounded-xl bg-[#070b1a]/88 backdrop-blur-md border px-2.5 py-2 shadow-[0_10px_28px_rgba(0,0,0,0.75)]"
            style={{
              borderColor: isWorldBoss ? `${raidRankColor}88` : 'rgba(34,211,238,0.45)',
            }}
          >
            {isWorldBoss ? (
              <>
                <div className="flex items-center justify-between gap-1.5">
                  <div className="flex items-center gap-1 text-[10px] font-display font-black uppercase tracking-wider text-rose-300">
                    <Timer className="w-3.5 h-3.5 text-rose-400" />
                    <span
                      className={`font-mono text-xs ${
                        raidTimeRemaining <= 15 ? 'text-rose-400 animate-pulse' : 'text-white'
                      }`}
                    >
                      {formatClock(Math.max(0, Math.ceil(raidTimeRemaining)))}
                    </span>
                  </div>
                  <span className="px-1.5 py-0.5 rounded bg-amber-500/20 border border-amber-300/50 text-[9px] font-mono font-black text-amber-200">
                    BAR ×{raidBarsCleared + 1}
                  </span>
                  <span
                    className="px-1.5 py-0.5 rounded text-[9px] font-display font-black uppercase border"
                    style={{
                      color: raidRankColor,
                      borderColor: `${raidRankColor}88`,
                      backgroundColor: `${raidRankColor}22`,
                    }}
                  >
                    {raidRankLabel}
                  </span>
                </div>
                <div className="mt-1 flex items-baseline justify-between gap-1">
                  <span className="text-[9px] font-bold uppercase tracking-wider text-slate-400">
                    RAID SCORE
                  </span>
                  <span className="font-mono text-base sm:text-lg font-black text-amber-300 leading-none drop-shadow-[0_0_10px_rgba(251,191,36,0.5)]">
                    {Math.round(raidTotalScore).toLocaleString()}
                  </span>
                </div>
                <div className="mt-0.5 flex items-center justify-between text-[9px] font-mono text-cyan-300/90">
                  <span>SQUAD DPS</span>
                  <span className="font-black">
                    {Math.round(liveSquadDps).toLocaleString()} /s
                  </span>
                </div>
              </>
            ) : (
              <>
                <div className="flex items-center justify-between gap-1.5">
                  <div className="flex items-center gap-1 text-[10px] font-display font-black uppercase tracking-wider text-cyan-300">
                    <Activity className="w-3.5 h-3.5 text-cyan-300" />
                    <span>LIVE DPS METER</span>
                  </div>
                  <span className="px-1.5 py-0.5 rounded bg-slate-900/90 border border-cyan-400/40 text-[9px] font-mono font-black text-cyan-200">
                    {sandboxDurationSec > 0
                      ? formatClock(Math.max(0, Math.ceil(raidTimeRemaining)))
                      : `∞ ${formatClock(elapsedSec)}`}
                  </span>
                </div>
                <div className="mt-1 flex items-baseline justify-between gap-1">
                  <span className="text-[9px] font-bold uppercase tracking-wider text-slate-400">
                    SQUAD DPS
                  </span>
                  <span className="font-mono text-base sm:text-lg font-black text-cyan-200 leading-none drop-shadow-[0_0_10px_rgba(34,211,238,0.5)]">
                    {Math.round(liveSquadDps).toLocaleString()} /s
                  </span>
                </div>
                <div className="mt-0.5 flex items-center justify-between text-[9px] font-mono text-slate-300">
                  <span>TOTAL DMG</span>
                  <span className="font-black text-amber-200">
                    {Math.round(liveTotalDamage).toLocaleString()}
                  </span>
                </div>
              </>
            )}

            {/* Per-Hero Live DPS Bars */}
            {liveDpsEntries.length > 0 && (
              <div className="mt-2 pt-1.5 border-t border-white/10 space-y-1">
                {liveDpsEntries.map((entry) => {
                  const topDmg = Math.max(1, liveDpsEntries[0]?.totalDamage ?? 1);
                  const barPct = Math.max(4, Math.min(100, (entry.totalDamage / topDmg) * 100));
                  return (
                    <div key={entry.heroId} className="space-y-0.5">
                      <div className="flex items-center justify-between gap-1 text-[9px] leading-none">
                        <span
                          className="font-display font-extrabold uppercase truncate max-w-[92px]"
                          style={{ color: entry.themeColor }}
                        >
                          {entry.name}
                        </span>
                        <div className="flex items-center gap-1.5 font-mono shrink-0">
                          <span className="text-white font-bold">
                            {entry.dps >= 1000
                              ? `${(entry.dps / 1000).toFixed(1)}k`
                              : Math.round(entry.dps)}
                            /s
                          </span>
                          <span className="text-slate-400 w-7 text-right">
                            {Math.round(entry.sharePct)}%
                          </span>
                        </div>
                      </div>
                      <div className="h-1.5 w-full rounded-full bg-slate-900/95 overflow-hidden border border-white/5">
                        <div
                          className="h-full rounded-full transition-all duration-150"
                          style={{
                            width: `${barPct}%`,
                            background: `linear-gradient(90deg, ${entry.themeColor}, #ffffffcc)`,
                          }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Instant Finish & Report CTA in DPS Sandbox */}
            {isSandbox && (
              <button
                onClick={() => {
                  audioManager.playSfx('button');
                  engineRef.current?.forceFinishCurrentBattle();
                }}
                className="pointer-events-auto mt-2 w-full py-1.5 px-2.5 rounded-lg bg-gradient-to-r from-cyan-500/25 via-sky-500/25 to-amber-500/25 hover:from-cyan-400/35 hover:to-amber-400/35 border border-cyan-300/65 text-[10px] font-display font-black uppercase tracking-wider text-cyan-100 flex items-center justify-center gap-1.5 transition shadow-[0_0_14px_rgba(34,211,238,0.28)]"
              >
                <Flag className="w-3 h-3 text-amber-300" />
                Finish &amp; Report
              </button>
            )}
          </div>
        </div>
      )}

      {/* TACTILE SQUAD EVADE & ACTIVE COMPANION PET ORB (Right Edge Above Hero Dock) */}
      {!combatResult && !paused && (
        <div className="fixed right-3 sm:right-5 bottom-[126px] sm:bottom-[104px] z-30 flex flex-col items-center gap-2">
          {activePet && (
            <div
              title={`🐾 ${activePet.name} (R${activePet.rank} Lv.${activePet.level}) — Auto-Skill: ${activePet.skillName} (${activePet.cd <= 0.2 ? 'CASTING!' : `ready in ${activePet.cd.toFixed(1)}s`})`}
              className="relative w-11 h-11 sm:w-12 sm:h-12 rounded-full p-[2px] bg-slate-950/90 border-2 shadow-xl flex items-center justify-center overflow-hidden"
              style={{
                borderColor: activePet.themeColor,
                boxShadow: `0 0 18px ${activePet.themeColor}66`,
              }}
            >
              <img
                src={activePet.spriteAsset}
                alt={activePet.name}
                className="w-9 h-9 sm:w-10 sm:h-10 object-contain"
              />
              {activePet.cd > 0.2 && (
                <div
                  className="absolute inset-0 rounded-full flex items-center justify-center"
                  style={{
                    background: `conic-gradient(rgba(3, 7, 18, 0.84) ${Math.min(100, (activePet.cd / Math.max(1, activePet.maxCd)) * 100)}%, rgba(3, 7, 18, 0.15) 0)`,
                  }}
                >
                  <span className="font-mono text-[10px] font-black text-cyan-200 drop-shadow-[0_1px_4px_rgba(0,0,0,1)]">
                    {Math.ceil(activePet.cd)}s
                  </span>
                </div>
              )}
              <span className="absolute -bottom-0.5 inset-x-0 text-center bg-black/85 text-[7px] font-display font-black text-amber-200 leading-tight">
                🐾 R{activePet.rank}
              </span>
            </div>
          )}
          <button
            disabled={!evadeReady}
            onClick={handleSquadEvade}
            title="Squad Evade (Shift): Coordinated blink-dodge. Trigger inside enemy red telegraphs for PERFECT DODGE Bullet-Time (+1.5 SP, +8 Ult, +25% Crit)!"
            className={`relative gc-skill-orb w-12 h-12 sm:w-14 sm:h-14 flex flex-col items-center justify-center border-2 transition-all ${
              evadeReady && inDangerZone
                ? 'bg-gradient-to-br from-cyan-300 via-sky-400 to-amber-300 border-white text-slate-950 scale-110 shadow-[0_0_28px_rgba(56,232,255,0.95)]'
                : evadeReady
                  ? 'bg-gradient-to-br from-slate-900/95 via-cyan-950/90 to-slate-950 border-cyan-300/85 text-cyan-200 shadow-[0_0_18px_rgba(56,232,255,0.45)] hover:border-amber-300'
                  : 'bg-slate-950/90 border-slate-700/80 text-slate-500 cursor-not-allowed'
            }`}
          >
            {evadeReady && inDangerZone && (
              <span className="pointer-events-none absolute -inset-1.5 rounded-full border-2 border-cyan-300 animate-ping opacity-80" />
            )}
            <Wind className={`w-4 h-4 sm:w-5 sm:h-5 ${evadeReady && inDangerZone ? 'text-slate-950' : ''}`} />
            <span className="font-display font-black text-[8px] sm:text-[9px] uppercase tracking-wider leading-none mt-0.5">
              {evadeReady && inDangerZone ? 'DODGE!' : 'EVADE'}
            </span>
            {!evadeReady && (
              <div
                className="absolute inset-0 rounded-full flex items-center justify-center"
                style={{
                  background: `conic-gradient(rgba(3, 7, 18, 0.88) ${evadeCdPct}%, rgba(3, 7, 18, 0.25) 0)`,
                }}
              >
                <span className="font-mono text-xs font-black text-cyan-300 drop-shadow-[0_1px_4px_rgba(0,0,0,1)]">
                  {evadeCd}
                </span>
              </div>
            )}
            <span className="hidden sm:flex ls-hide absolute -top-1.5 -left-1.5 px-1.5 py-0.5 rounded-full bg-slate-950 border border-cyan-400/60 text-[7px] font-mono font-bold text-cyan-200 leading-none">
              SHIFT
            </span>
          </button>
        </div>
      )}

      {/* STARLIGHT REFLEX — PERFECT DODGE CINEMATIC CALLOUT & EDGE FLASH */}
      {perfectDodgeActive && !combatResult && (
        <div
          key={perfectDodgeId}
          className="pointer-events-none fixed inset-0 z-40 flex items-start justify-center pt-[16%] sm:pt-[14%]"
        >
          <div
            className="absolute inset-0 animate-pulse"
            style={{
              background:
                'radial-gradient(circle at 50% 50%, transparent 45%, rgba(56,232,255,0.28) 85%, rgba(253,224,71,0.34) 100%)',
            }}
          />
          <div className="relative animate-wave-slash px-6 py-2 rounded-full bg-slate-950/90 border-2 border-cyan-300 shadow-[0_0_36px_rgba(56,232,255,0.85)] text-center">
            <div className="font-display font-black text-base sm:text-2xl uppercase tracking-[0.26em] text-cyan-200 drop-shadow-[0_0_16px_rgba(56,232,255,0.95)]">
              ✦ STARLIGHT REFLEX — PERFECT DODGE! ✦
            </div>
            <div className="text-[10px] sm:text-xs font-mono font-black uppercase tracking-[0.2em] text-amber-300 mt-0.5">
              +1.5 SP • +8 ULT GAUGE • +25% CRIT RATE
            </div>
          </div>
        </div>
      )}

      {/* DYNAMIC ANIME HIT COMBO COUNTER (Top-Right Floating) */}
      {comboCount >= 2 && !combatResult && (
        <div className="pointer-events-none fixed right-3 sm:right-6 top-[20%] sm:top-[22%] z-30 flex flex-col items-end">
          <div
            key={comboCount}
            className="animate-combo-pop flex items-baseline gap-1.5"
          >
            <span
              className={`font-display font-black leading-none drop-shadow-[0_4px_14px_rgba(0,0,0,0.95)] ${
                comboCount >= 25
                  ? 'text-4xl sm:text-6xl text-fuchsia-300'
                  : comboCount >= 10
                    ? 'text-3xl sm:text-5xl text-amber-300'
                    : 'text-2xl sm:text-4xl text-cyan-200'
              }`}
              style={{
                textShadow:
                  comboCount >= 25
                    ? '0 0 24px rgba(232,121,249,0.95)'
                    : comboCount >= 10
                      ? '0 0 20px rgba(253,224,71,0.9)'
                      : '0 0 16px rgba(56,232,255,0.85)',
              }}
            >
              {comboCount}
            </span>
            <span className="font-display text-xs sm:text-base font-black uppercase tracking-[0.2em] text-white">
              HITS
            </span>
          </div>
          <div className="text-[9px] sm:text-[10px] font-black uppercase tracking-[0.24em] text-amber-200">
            {comboCount >= 25
              ? '★ STARLIGHT OVERDRIVE!!'
              : comboCount >= 10
                ? 'BLAZING COMBO!'
                : 'CHAIN COMBO'}
          </div>
          <div className="mt-1 w-24 sm:w-32 h-1 rounded-full bg-slate-950/85 overflow-hidden border border-white/20">
            <div
              className={`h-full transition-all duration-75 ${
                comboCount >= 25
                  ? 'bg-gradient-to-r from-fuchsia-500 via-amber-300 to-cyan-300'
                  : comboCount >= 10
                    ? 'bg-gradient-to-r from-amber-500 to-yellow-200'
                    : 'bg-gradient-to-r from-cyan-500 to-sky-200'
              }`}
              style={{ width: `${Math.round(comboDecayRatio * 100)}%` }}
            />
          </div>
        </div>
      )}

      {/* CINEMATIC WAVE TRANSITION RIBBON */}
      {waveBanner && !bossWarning && !combatResult && (
        <div className="pointer-events-none fixed inset-x-0 top-[36%] z-30 flex justify-center">
          <div
            key={waveBanner}
            className="animate-wave-slash px-8 sm:px-14 py-2 bg-gradient-to-r from-transparent via-slate-950/95 to-transparent border-y-2 border-cyan-400/80 shadow-[0_0_32px_rgba(56,232,255,0.4)]"
          >
            <span className="font-display text-xl sm:text-3xl font-black uppercase tracking-[0.3em] text-white text-glow-cyan">
              {waveBanner}
            </span>
          </div>
        </div>
      )}

      {/* CINEMATIC ⚠ WARNING: BOSS APPROACHING ⚠ OVERLAY */}
      {bossWarning && !combatResult && (
        <div
          key={bossWarning.id}
          className="pointer-events-none fixed inset-x-0 top-1/2 -translate-y-1/2 z-40 animate-boss-warning"
        >
          <div className="h-3 w-full hazard-stripes border-y border-amber-300/70" />
          <div className="w-full py-3 sm:py-5 bg-gradient-to-r from-rose-950/90 via-[#1a0510]/95 to-rose-950/90 backdrop-blur-sm text-center shadow-[0_0_60px_rgba(225,29,72,0.7)]">
            <div className="flex items-center justify-center gap-2 text-amber-300 text-[10px] sm:text-xs font-black uppercase tracking-[0.36em]">
              <AlertTriangle className="w-4 h-4 text-rose-400 animate-pulse" />
              <span>WARNING • BOSS APPROACHING</span>
              <AlertTriangle className="w-4 h-4 text-rose-400 animate-pulse" />
            </div>
            <div className="font-display text-2xl sm:text-5xl font-black uppercase tracking-[0.16em] text-white drop-shadow-[0_4px_20px_rgba(244,63,94,0.95)] mt-1">
              {bossWarning.name}
            </div>
            <div className="text-[11px] sm:text-sm font-serif-italic italic text-rose-200 tracking-widest">
              {bossWarning.title}
            </div>
          </div>
          <div className="h-3 w-full hazard-stripes border-y border-amber-300/70" />
        </div>
      )}

      {/* FLOATING TRANSLUCENT MOBILE VIRTUAL JOYSTICK */}
      {touchJoystick && !combatResult && (
        <div className="pointer-events-none fixed inset-0 z-30">
          <div
            className="absolute -translate-x-1/2 -translate-y-1/2 w-24 h-24 rounded-full border-2 border-cyan-300/55 bg-slate-950/35 backdrop-blur-[2px] shadow-[0_0_24px_rgba(56,232,255,0.28)]"
            style={{ left: touchJoystick.originX, top: touchJoystick.originY }}
          />
          <div
            className="absolute -translate-x-1/2 -translate-y-1/2 w-11 h-11 rounded-full bg-gradient-to-br from-cyan-300/90 to-amber-300/85 border-2 border-white shadow-[0_0_18px_rgba(56,232,255,0.85)]"
            style={{ left: touchJoystick.knobX, top: touchJoystick.knobY }}
          />
        </div>
      )}

      {/* PRE-BOSS ANIME VN CONFRONTATION BANTER OVERLAY */}
      {activeBanter && !combatResult && (
        <BossBanterOverlay
          banter={activeBanter}
          onComplete={() => engineRef.current?.dismissBossBanter()}
        />
      )}

      {/* 4-Phase Anime Ultimate Cut-In & Impact Flash + Dual-Hero Link Burst Banner */}
      <UltimateCutInOverlay />
      <LinkBurstOverlay />

      {/* PAUSE OVERLAY */}
      {paused && !combatResult && (
        <div className="fixed inset-0 z-40 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="rpg-panel p-5 sm:p-6 max-w-sm w-full text-center border-amber-400/40">
            <h3 className="font-display text-2xl font-extrabold text-white tracking-wider mb-1">
              BATTLE PAUSED
            </h3>
            <p className="text-xs text-amber-300 mb-5">{stageName}</p>
            <div className="flex flex-col gap-2.5">
              <button
                onClick={togglePause}
                className="rpg-battle-cta w-full py-3 text-slate-950 font-display font-black uppercase tracking-widest"
              >
                Resume Battle
              </button>
              <button
                onClick={() => {
                  audioManager.playSfx('button');
                  setShowCombatSettings(true);
                }}
                className="rpg-blade w-full py-2.5 text-amber-200 font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-1.5"
              >
                <Settings className="w-3.5 h-3.5" /> Audio & Combat Settings
              </button>
              <button
                onClick={() => {
                  useCombatStore.getState().resetForStage(stageId, `${resolvedStageDef.code} ${resolvedStageDef.name}`, resolvedStageDef.waves.length);
                  setRunSeed((s) => s + 1);
                }}
                className="rpg-blade w-full py-2.5 text-white font-bold text-xs uppercase tracking-wider"
              >
                Restart Stage
              </button>
              <button
                onClick={onExit}
                className="w-full py-2.5 rounded-xl bg-rose-950/75 border border-rose-500/50 text-rose-200 font-bold text-xs uppercase tracking-wider hover:bg-rose-900/75"
              >
                {isWorldBossStage
                  ? 'Return to World Boss Raid'
                  : isLabyrinthStage
                    ? 'Return to Starlight Labyrinth'
                    : isSandboxStage
                      ? 'Return to DPS Sandbox'
                      : isSpireStage
                        ? 'Return to Astral Spire'
                        : isDungeonStage
                          ? 'Return to Rift Dungeons'
                          : 'Retreat to Command Deck'}
              </button>
            </div>
          </div>
        </div>
      )}

      <SettingsModal
        open={showCombatSettings}
        combatOnlyMode
        onClose={() => setShowCombatSettings(false)}
      />

      {/* CINEMATIC FULL-SCREEN MVP VICTORY / DEFEAT STAGE */}
      {combatResult && (
        <VictoryOverlay
          result={combatResult}
          heroesSnapshot={heroes}
          nextStageCode={nextSpireFloor ? `Floor ${nextSpireFloor}` : nextStage?.code}
          onNextStage={
            nextSpireFloor
              ? () => onSelectStage(encodeSpireStageId(nextSpireFloor))
              : nextStage
                ? () => onSelectStage(nextStage.id)
                : undefined
          }
          canReplay={canReplayBattle}
          exitLabel={
            isWorldBossStage
              ? 'Raid Hub'
              : isLabyrinthStage
                ? 'Labyrinth Map'
                : isSandboxStage
                  ? 'DPS Lab'
                  : isSpireStage
                    ? 'Astral Spire'
                    : isDungeonStage
                      ? 'Dungeons'
                      : 'Lobby'
          }
          onReplay={() => {
            useCombatStore.getState().resetForStage(stageId, `${resolvedStageDef.code} ${resolvedStageDef.name}`, resolvedStageDef.waves.length);
            setRunSeed((s) => s + 1);
          }}
          onExit={onExit}
        />
      )}
    </div>
  );
};
