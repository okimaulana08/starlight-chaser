import React, { useEffect, useMemo, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import gsap from 'gsap';
import {
  BarChart3,
  ChevronRight,
  Crown,
  Flame,
  Heart,
  RotateCcw,
  Shield,
  Skull,
  Sparkles,
  Star,
  Swords,
  Wind,
  Zap,
} from 'lucide-react';
import {
  EQUIPMENT_SETS,
  RARITY_COLORS,
  formatStatValue,
  getEnhancedMainStatValue,
} from '../data/equipment';
import { HERO_MAP } from '../data/heroes';
import {
  MATERIAL_META,
  factionToEssenceKey,
  getExpToNextLevel,
} from '../data/materials';
import { RELIC_MAP } from '../data/relics';
import { audioManager } from '../engine/AudioManager';
import { usePlayerStore } from '../store/usePlayerStore';
import type {
  CombatLootSummary,
  DroppedRelicSummary,
  EquipmentInstance,
  Faction,
  HeroCombatSnapshot,
} from '../types/game';
import { ArtImage } from './ArtImage';
import { EquipIcon, GameIcon, MaterialIcon } from './GameIcon';
import {
  AnimatedNumber,
  CornerFiligree,
  RpgLootTile,
  RpgProgressBar,
} from './RpgKit';

/** Crisp bespoke rising double-chevron + sparkle SVG emblem for Level Up callouts */
const LevelUpSvgIcon: React.FC<{ className?: string }> = ({ className = 'w-3 h-3' }) => (
  <svg viewBox="0 0 20 20" fill="none" className={className} aria-hidden="true">
    <path
      d="M4.5 13.5L10 8L15.5 13.5"
      stroke="currentColor"
      strokeWidth="2.4"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <path
      d="M4.5 8.5L10 3L15.5 8.5"
      stroke="currentColor"
      strokeWidth="2.4"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <circle cx="10" cy="16.2" r="1.6" fill="currentColor" />
  </svg>
);

interface VictoryOverlayProps {
  result: CombatLootSummary;
  heroesSnapshot: HeroCombatSnapshot[];
  nextStageCode?: string;
  onNextStage?: () => void;
  canReplay?: boolean;
  exitLabel?: string;
  onReplay: () => void;
  onExit: () => void;
}

/**
 * Full-Screen Cinematic Anime RPG Victory / Defeat Stage (Grand Chase Mobile / Epic Seven style):
 * - Animated sunburst golden radiance & 3 Star-Rating Stars
 * - Full-height MVP Champion standing showcase with victory quote & crown
 * - Visual portrait contribution bars (no gray admin boxes)
 * - Gleaming square RPG treasure loot slots with tap-to-inspect gear tooltip
 */
export const VictoryOverlay: React.FC<VictoryOverlayProps> = ({
  result,
  heroesSnapshot,
  nextStageCode,
  onNextStage,
  canReplay = true,
  exitLabel = 'Lobby',
  onReplay,
  onExit,
}) => {
  const roster = usePlayerStore((s) => s.roster);
  const [selectedGear, setSelectedGear] = useState<EquipmentInstance | null>(
    result.droppedEquipment[0] ?? null,
  );
  const [selectedRelic, setSelectedRelic] = useState<DroppedRelicSummary | null>(
    result.droppedRelics?.[0] ?? null,
  );
  const [activeTab, setActiveTab] = useState<'SUMMARY' | 'REPORT'>('SUMMARY');
  const [reportMetric, setReportMetric] = useState<'DPS' | 'HEAL' | 'TANK' | 'CRIT_BREAK'>('DPS');

  const safeDurationSec = Math.max(1, result.durationSec);
  const battleReport = useMemo(() => {
    if (result.battleReport) return result.battleReport;
    const heroes = Object.entries(result.damageByHero).map(([heroId, dmg]) => ({
      heroId,
      damageDealt: dmg,
      healingDone: result.healingByHero[heroId] ?? 0,
      damageTaken: 0,
      shieldGranted: 0,
      critHits: 0,
      totalHits: 0,
      staggerDealt: 0,
      ultCasts: 0,
    }));
    return {
      heroes,
      totalDamage: heroes.reduce((s, h) => s + h.damageDealt, 0),
      totalHealing: heroes.reduce((s, h) => s + h.healingDone, 0),
      totalDamageTaken: 0,
      maxCombo: 0,
      perfectDodges: 0,
      bossBreaks: 0,
      linkBursts: 0,
    };
  }, [result]);

  const heroEntries = useMemo(() => {
    const entries = Object.entries(result.damageByHero).map(([heroId, dmg]) => ({
      heroId,
      dmg,
      heal: result.healingByHero[heroId] ?? 0,
      score: dmg + (result.healingByHero[heroId] ?? 0) * 1.15,
    }));
    entries.sort((a, b) => b.score - a.score);
    return entries;
  }, [result]);

  const mvpId = heroEntries[0]?.heroId ?? 'vaelen';
  const mvpHero = HERO_MAP[mvpId] ?? HERO_MAP.vaelen;
  const maxDmg = Math.max(1, ...heroEntries.map((e) => e.dmg));

  const aliveCount = heroesSnapshot.filter((h) => h.alive).length;
  const starCount = !result.victory ? 0 : aliveCount >= 4 ? 3 : aliveCount >= 3 ? 2 : 1;

  // GSAP 3-Star Victory Slam Choreography (overshoot bounce slam one-by-one!)
  const starsRef = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    if (!result.victory || !starsRef.current) return;
    const starEls = starsRef.current.querySelectorAll('.victory-star-earned');
    if (starEls.length === 0) return;
    const ctx = gsap.context(() => {
      gsap.fromTo(
        starEls,
        { scale: 2.6, opacity: 0, rotate: -32, y: -14 },
        {
          scale: 1,
          opacity: 1,
          rotate: 0,
          y: 0,
          duration: 0.48,
          stagger: 0.16,
          ease: 'back.out(2.1)',
          clearProps: 'transform',
        },
      );
    }, starsRef);
    return () => ctx.revert();
  }, [result.victory, starCount]);

  const formatClock = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  };

  return (
    <div className="fixed inset-0 z-50 overflow-hidden select-none flex flex-col">
      {/* LAYER 0: Dramatic Full-Bleed Sunburst / Crimson Defeat Atmosphere */}
      <div
        className="absolute inset-0 backdrop-blur-md"
        style={{
          background: result.victory
            ? 'radial-gradient(circle at 28% 42%, rgba(245,200,76,0.34) 0%, rgba(16,24,58,0.92) 52%, rgba(5,7,18,0.97) 100%)'
            : 'radial-gradient(circle at 30% 40%, rgba(225,29,72,0.3) 0%, rgba(18,10,28,0.94) 55%, rgba(5,6,14,0.98) 100%)',
        }}
      />

      {/* Fullscreen Rotating Sunburst Light Rays on Victory (scales cleanly to 4K & ultrawide!) */}
      {result.victory && (
        <div className="pointer-events-none absolute inset-0 overflow-hidden">
          <div className="absolute left-[28%] top-[46%] -translate-x-1/2 -translate-y-1/2">
            <div
              className="w-[300vmax] h-[300vmax] opacity-20 animate-spin"
              style={{
                animationDuration: '38s',
                background:
                  'repeating-conic-gradient(from 0deg, rgba(253,224,71,0.55) 0deg 8deg, transparent 8deg 24deg)',
              }}
            />
          </div>
        </div>
      )}

      {/* Diagonal Celestial Accent Slash */}
      <div
        className="pointer-events-none absolute inset-x-0 top-0 h-1.5"
        style={{
          background: result.victory
            ? 'linear-gradient(90deg, transparent, #fde047, #38e8ff, #f5c84c, transparent)'
            : 'linear-gradient(90deg, transparent, #f43f5e, #a855f7, transparent)',
        }}
      />

      {/* MAIN CONTENT STAGE — Bulletproof 3-Tier Non-Overlapping Layout (Header / Scrollable Body / Pinned Footer) */}
      <div className="relative z-10 w-full h-full max-w-6xl mx-auto flex flex-col overflow-hidden">
        {/* 1. PINNED TOP VICTORY BANNER + 3 STARS */}
        <div className="ls-victory-header shrink-0 flex flex-wrap items-center justify-between gap-2 px-4 sm:px-6 pt-3 sm:pt-4 pb-2 border-b border-amber-400/25 bg-slate-950/45 backdrop-blur-sm">
          <div className="flex items-center gap-3 sm:gap-4 min-w-0">
            {result.victory ? (
              <div ref={starsRef} className="flex items-center gap-1 shrink-0">
                {[1, 2, 3].map((n) => (
                  <Star
                    key={n}
                    className={`w-6 h-6 sm:w-8 sm:h-8 transition-colors ${
                      n <= starCount
                        ? 'victory-star-earned text-amber-300 fill-amber-400 drop-shadow-[0_0_18px_rgba(245,200,76,0.95)]'
                        : 'text-slate-700'
                    } ${n === 2 ? '-translate-y-1 scale-110' : ''}`}
                  />
                ))}
              </div>
            ) : (
              <Skull className="w-8 h-8 text-rose-400 drop-shadow-[0_0_16px_rgba(244,63,94,0.75)] shrink-0" />
            )}
            <div className="min-w-0">
              <div
                className={`text-[9px] sm:text-xs font-black uppercase tracking-[0.24em] truncate ${
                  result.victory ? 'text-cyan-300' : 'text-rose-400'
                }`}
              >
                {result.stageName} • TIME {formatClock(result.durationSec)}
              </div>
              <h1
                className={`font-display text-2xl sm:text-4xl font-black tracking-[0.16em] leading-none mt-0.5 ${
                  result.victory ? 'text-white text-glow-gold' : 'text-rose-200'
                }`}
              >
                {result.victory ? 'VICTORY' : 'DEFEAT'}
              </h1>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {result.isFirstClear && result.victory && (
              <div className="px-3 py-1 rounded-lg bg-gradient-to-r from-amber-400/25 to-cyan-400/25 border border-amber-300 text-amber-200 text-[10px] sm:text-xs font-black uppercase tracking-[0.18em]">
                ★ FIRST CLEAR!
              </div>
            )}

            {/* SUMMARY vs BATTLE REPORT VIEW SWITCHER */}
            <div className="flex items-center rounded-xl bg-slate-950/90 border border-white/15 p-0.5">
              <button
                type="button"
                onClick={() => {
                  audioManager.playSfx('button');
                  setActiveTab('SUMMARY');
                }}
                className={`px-2.5 sm:px-3 py-1 rounded-lg text-[10px] sm:text-xs font-display font-black uppercase tracking-wider flex items-center gap-1 transition ${
                  activeTab === 'SUMMARY'
                    ? 'bg-amber-400/25 text-amber-200 border border-amber-300/60'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <Sparkles className="w-3 h-3" />
                <span>Spoils</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  audioManager.playSfx('button');
                  setActiveTab('REPORT');
                }}
                className={`px-2.5 sm:px-3 py-1 rounded-lg text-[10px] sm:text-xs font-display font-black uppercase tracking-wider flex items-center gap-1 transition ${
                  activeTab === 'REPORT'
                    ? 'bg-cyan-400/25 text-cyan-200 border border-cyan-300/70 shadow-[0_0_12px_rgba(56,232,255,0.3)]'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <BarChart3 className="w-3 h-3" />
                <span>Battle Report</span>
              </button>
            </div>
          </div>
        </div>

        {/* 2. DEDICATED SCROLLABLE MIDDLE STAGE (Never Collides With Bottom Action Buttons!) */}
        <div className="ls-victory-body flex-1 min-h-0 overflow-y-auto px-4 sm:px-6 py-3 sm:py-4">
          {activeTab === 'REPORT' ? (
            <motion.div
              key="battle-report-view"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.25 }}
              className="space-y-4 max-w-4xl mx-auto pb-2"
            >
              {/* Combat Telemetry Highlights Strip */}
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                {[
                  {
                    label: 'Squad DPS',
                    val: `${Math.round(battleReport.totalDamage / safeDurationSec).toLocaleString()}/s`,
                    sub: `${battleReport.totalDamage.toLocaleString()} Total`,
                    color: 'text-amber-300',
                    icon: <Swords className="w-3.5 h-3.5 text-amber-300" />,
                  },
                  {
                    label: 'Max Combo',
                    val: `${battleReport.maxCombo} HITS`,
                    sub: `Time ${formatClock(result.durationSec)}`,
                    color: 'text-cyan-300',
                    icon: <Flame className="w-3.5 h-3.5 text-orange-400" />,
                  },
                  {
                    label: 'Link Bursts',
                    val: `${battleReport.linkBursts}`,
                    sub: 'Dual Ult Chains',
                    color: 'text-fuchsia-300',
                    icon: <Sparkles className="w-3.5 h-3.5 text-fuchsia-300" />,
                  },
                  {
                    label: 'Perfect Dodges',
                    val: `${battleReport.perfectDodges}`,
                    sub: 'Starlight Reflex',
                    color: 'text-sky-300',
                    icon: <Wind className="w-3.5 h-3.5 text-sky-300" />,
                  },
                  {
                    label: 'Boss Breaks',
                    val: `${battleReport.bossBreaks}`,
                    sub: 'Stagger Shatters',
                    color: 'text-emerald-300',
                    icon: <Zap className="w-3.5 h-3.5 text-emerald-300" />,
                  },
                ].map((stat) => (
                  <div
                    key={stat.label}
                    className="rpg-ornate-card px-3 py-2.5 flex flex-col justify-between bg-slate-950/70"
                  >
                    <div className="flex items-center justify-between gap-1 text-[9px] font-display font-black uppercase tracking-[0.16em] text-slate-400">
                      <span>{stat.label}</span>
                      {stat.icon}
                    </div>
                    <div className={`font-mono text-base sm:text-lg font-black mt-1 ${stat.color}`}>
                      {stat.val}
                    </div>
                    <div className="text-[10px] text-slate-400 truncate">{stat.sub}</div>
                  </div>
                ))}
              </div>

              {/* Metric Category Filter Tabs */}
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="text-[10px] font-display font-black uppercase tracking-[0.24em] text-cyan-300 flex items-center gap-1.5">
                  <BarChart3 className="w-3.5 h-3.5" /> Per-Hero Combat Telemetry
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {(
                    [
                      { key: 'DPS', label: 'Damage & DPS', icon: <Swords className="w-3 h-3" /> },
                      { key: 'HEAL', label: 'Healing', icon: <Heart className="w-3 h-3" /> },
                      { key: 'TANK', label: 'Tank / Shield', icon: <Shield className="w-3 h-3" /> },
                      { key: 'CRIT_BREAK', label: 'Crit & Break', icon: <Zap className="w-3 h-3" /> },
                    ] as const
                  ).map((m) => (
                    <button
                      key={m.key}
                      type="button"
                      onClick={() => {
                        audioManager.playSfx('button');
                        setReportMetric(m.key);
                      }}
                      className={`px-2.5 py-1 rounded-lg border text-[10px] sm:text-xs font-display font-bold uppercase tracking-wider flex items-center gap-1.5 transition ${
                        reportMetric === m.key
                          ? 'bg-cyan-500/20 border-cyan-300 text-cyan-100'
                          : 'bg-slate-950/75 border-white/10 text-slate-400 hover:text-white'
                      }`}
                    >
                      {m.icon}
                      <span>{m.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Per-Hero Animated Horizontal Telemetry Bars */}
              <div className="space-y-2">
                {(() => {
                  const getVal = (h: (typeof battleReport.heroes)[number]) => {
                    if (reportMetric === 'DPS') return h.damageDealt;
                    if (reportMetric === 'HEAL') return h.healingDone;
                    if (reportMetric === 'TANK') return h.damageTaken + h.shieldGranted;
                    return h.staggerDealt;
                  };
                  const sorted = [...battleReport.heroes].sort((a, b) => getVal(b) - getVal(a));
                  const maxMetric = Math.max(1, ...sorted.map(getVal));
                  const totalMetric = Math.max(1, sorted.reduce((s, h) => s + getVal(h), 0));

                  return sorted.map((row, idx) => {
                    const def = HERO_MAP[row.heroId];
                    if (!def) return null;
                    const val = getVal(row);
                    const sharePct = Math.round((val / totalMetric) * 100);
                    const dps = Math.round(row.damageDealt / safeDurationSec);
                    const critPct =
                      row.totalHits > 0 ? Math.round((row.critHits / row.totalHits) * 100) : 0;

                    const barGradient =
                      reportMetric === 'DPS'
                        ? `linear-gradient(90deg, ${def.themeColor}cc 0%, #fde047 100%)`
                        : reportMetric === 'HEAL'
                          ? 'linear-gradient(90deg, #059669 0%, #34d399 65%, #a7f3d0 100%)'
                          : reportMetric === 'TANK'
                            ? 'linear-gradient(90deg, #0284c7 0%, #38bdf8 65%, #bae6fd 100%)'
                            : 'linear-gradient(90deg, #d97706 0%, #f59e0b 55%, #38e8ff 100%)';

                    return (
                      <motion.div
                        key={`${reportMetric}_${row.heroId}`}
                        initial={{ opacity: 0, x: -14 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ duration: 0.28, delay: idx * 0.06 }}
                        className="rpg-ornate-card px-3 py-2 flex items-center gap-3 bg-slate-950/75"
                        style={{
                          borderLeft: `4px solid ${def.themeColor}`,
                        }}
                      >
                        <div className="relative w-10 h-10 rounded-xl overflow-hidden border border-white/25 shrink-0">
                          <ArtImage
                            kind="HERO"
                            id={row.heroId}
                            src={def.assets.card}
                            alt={def.name}
                            className="w-full h-full object-cover object-top"
                          />
                          {row.heroId === mvpId && (
                            <span className="absolute bottom-0 inset-x-0 bg-amber-400 text-slate-950 text-[7px] font-display font-black text-center">
                              MVP
                            </span>
                          )}
                        </div>

                        <div className="flex-1 min-w-0 space-y-1.5">
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <div className="flex items-center gap-2 min-w-0">
                              <span className="font-display font-extrabold text-sm text-white truncate">
                                {def.name}
                              </span>
                              <span className="px-1.5 py-0.5 rounded bg-slate-900 border border-white/15 text-[9px] font-bold uppercase text-slate-300">
                                {def.role}
                              </span>
                              {row.ultCasts > 0 && (
                                <span className="px-1.5 py-0.5 rounded bg-amber-500/15 border border-amber-400/50 text-[9px] font-mono font-bold text-amber-200">
                                  ULT ×{row.ultCasts}
                                </span>
                              )}
                            </div>

                            <div className="font-mono text-xs sm:text-sm font-black text-white flex items-center gap-2 shrink-0">
                              {reportMetric === 'DPS' && (
                                <>
                                  <span className="text-amber-300">{row.damageDealt.toLocaleString()}</span>
                                  <span className="text-[11px] text-cyan-300">({dps.toLocaleString()}/s)</span>
                                </>
                              )}
                              {reportMetric === 'HEAL' && (
                                <span className="text-emerald-300">+{row.healingDone.toLocaleString()} HP</span>
                              )}
                              {reportMetric === 'TANK' && (
                                <>
                                  <span className="text-sky-300">{row.damageTaken.toLocaleString()} Taken</span>
                                  {row.shieldGranted > 0 && (
                                    <span className="text-[11px] text-cyan-200">
                                      • {row.shieldGranted.toLocaleString()} Shield
                                    </span>
                                  )}
                                </>
                              )}
                              {reportMetric === 'CRIT_BREAK' && (
                                <>
                                  <span className="text-amber-300">{critPct}% CRIT</span>
                                  <span className="text-[11px] text-cyan-300">
                                    • {row.staggerDealt} Break
                                  </span>
                                </>
                              )}
                              <span className="px-1.5 py-0.5 rounded bg-white/10 text-[10px] text-slate-200">
                                {sharePct}%
                              </span>
                            </div>
                          </div>

                          <RpgProgressBar
                            value={val}
                            max={maxMetric}
                            animateFromZero
                            delay={0.05 + idx * 0.05}
                            heightClass="h-3"
                            gradient={barGradient}
                            glowColor={`${def.themeColor}66`}
                          />

                          <div className="flex flex-wrap items-center gap-x-4 gap-y-0.5 text-[10px] font-mono text-slate-400">
                            <span>DMG: <strong className="text-amber-200">{row.damageDealt.toLocaleString()}</strong></span>
                            <span>HEAL: <strong className="text-emerald-300">{row.healingDone.toLocaleString()}</strong></span>
                            <span>TAKEN: <strong className="text-sky-300">{row.damageTaken.toLocaleString()}</strong></span>
                            <span>CRIT: <strong className="text-yellow-200">{critPct}%</strong> ({row.critHits}/{row.totalHits})</span>
                            <span>BREAK: <strong className="text-cyan-300">{row.staggerDealt}</strong></span>
                          </div>
                        </div>
                      </motion.div>
                    );
                  });
                })()}
              </div>
            </motion.div>
          ) : (
          <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 sm:gap-5 items-center min-h-full">
            {/* LEFT: FULL-HEIGHT MVP HERO SHOWCASE */}
            <motion.div
              initial={{ opacity: 0, x: -24, scale: 0.94 }}
              animate={{ opacity: 1, x: 0, scale: 1 }}
              transition={{ type: 'spring', stiffness: 260, damping: 24 }}
              className="sm:col-span-4 lg:col-span-5 relative flex flex-col items-center justify-center"
            >
              <div className="ls-victory-mvp relative h-[180px] sm:h-[240px] lg:h-[380px] aspect-[3/4] animate-breathe flex items-end justify-center">
                <ArtImage
                  kind="HERO"
                  id={mvpHero.id}
                  src={mvpHero.assets.standing}
                  alt={mvpHero.name}
                  className={
                    mvpHero.assets.standing.includes('/assets/standing/')
                      ? 'h-full w-auto object-contain object-bottom drop-shadow-[0_14px_30px_rgba(0,0,0,0.9)]'
                      : 'w-full h-full object-cover object-top hero-radial-feather drop-shadow-[0_14px_36px_rgba(0,0,0,0.85)]'
                  }
                />
                {/* Tilted MVP Crown Badge */}
                <div className="absolute -top-2 -left-2 sm:-left-3 -rotate-6 px-3 py-0.5 rounded-lg bg-gradient-to-r from-amber-300 via-yellow-300 to-amber-500 border border-amber-100 text-slate-950 font-display font-black text-[10px] sm:text-xs uppercase tracking-[0.16em] shadow-[0_0_24px_rgba(245,200,76,0.9)] flex items-center gap-1">
                  <Crown className="w-3.5 h-3.5" /> BATTLE MVP
                </div>
              </div>

              {/* Floating Sculpted Victory Quote Plaque */}
              <div className="rpg-ornate-card -mt-5 relative z-10 w-full max-w-xs sm:max-w-sm px-3.5 py-2 text-center backdrop-blur-md">
                <CornerFiligree color="#f5c84c" size={8} opacity={0.7} />
                <div className="font-display font-extrabold text-sm sm:text-base text-amber-300 tracking-wider truncate">
                  {mvpHero.name}{' '}
                  <span className="text-[11px] font-sans font-semibold text-slate-300">
                    — {mvpHero.title}
                  </span>
                </div>
                <p className="ls-hide text-[11px] text-slate-200 italic mt-0.5 line-clamp-2">
                  "{mvpHero.quote}"
                </p>
              </div>
            </motion.div>

            {/* RIGHT: SQUAD DAMAGE BARS + GLEAMING RPG TREASURE SPOILS */}
            <div className="sm:col-span-8 lg:col-span-7 flex flex-col gap-3 sm:gap-4 pb-2">
            {/* Compact Sculpted Squad Contribution Meter */}
            <div className="space-y-2">
              <div className="text-[10px] font-display font-black uppercase tracking-[0.26em] text-amber-300/95 flex items-center gap-2">
                <GameIcon name="battle" className="w-4 h-4" /> Strike Squad Performance
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {heroEntries.map((entry, idx) => {
                  const h = HERO_MAP[entry.heroId];
                  if (!h) return null;
                  const accent = idx === 0 ? '#fde047' : h.themeColor;
                  const expRes = result.heroExpResults?.[entry.heroId];
                  const owned = roster[entry.heroId];
                  const curLevel = expRes?.newLevel ?? owned?.level ?? 1;
                  const curExp = expRes?.newExp ?? owned?.exp ?? 0;
                  const expToNext = expRes?.expToNext ?? getExpToNextLevel(curLevel);
                  const levelsGained = expRes?.levelsGained ?? 0;
                  const expGained = expRes?.expGained ?? 0;
                  const atLevelCap = expRes?.atLevelCap ?? false;

                  return (
                    <motion.div
                      key={entry.heroId}
                      initial={{ opacity: 0, x: 18 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ duration: 0.35, delay: 0.1 + idx * 0.07 }}
                      className="rpg-ornate-card flex items-center gap-2.5 px-2.5 py-2 backdrop-blur-sm overflow-hidden"
                      style={{
                        borderColor:
                          levelsGained > 0
                            ? 'rgba(52,211,153,0.75)'
                            : idx === 0
                              ? 'rgba(253,224,71,0.65)'
                              : `${h.themeColor}55`,
                        borderLeft: `3px solid ${levelsGained > 0 ? '#34d399' : accent}`,
                      }}
                    >
                      <CornerFiligree color={levelsGained > 0 ? '#34d399' : accent} size={6} opacity={0.5} />
                      <div className="relative w-11 h-11 shrink-0 rounded-lg overflow-hidden border border-white/25 shadow-md">
                        <ArtImage
                          kind="HERO"
                          id={entry.heroId}
                          src={h.assets.card}
                          alt={h.name}
                          className="w-full h-full object-cover object-top"
                        />
                        {idx === 0 && (
                          <span className="absolute bottom-0 inset-x-0 bg-gradient-to-r from-amber-400 to-yellow-300 text-slate-950 text-[7px] font-display font-black text-center">
                            MVP
                          </span>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        {/* Row 1: Hero Name + Current Level + Lv. UP Badge | EXP Ratio (e.g. 1,283 / 5,000) */}
                        <div className="flex items-center justify-between gap-1.5 mb-1">
                          <div className="flex items-center gap-1.5 min-w-0 flex-wrap">
                            <span className="font-bold text-xs text-white truncate">{h.name}</span>
                            <span className="px-1.5 py-0.5 rounded bg-slate-900/95 border border-cyan-400/45 font-mono text-[10px] font-black text-cyan-200 leading-none shrink-0">
                              Lv.{curLevel}
                            </span>
                            {levelsGained > 0 && (
                              <motion.span
                                initial={{ scale: 0.45, opacity: 0, y: 4 }}
                                animate={{ scale: 1, opacity: 1, y: 0 }}
                                transition={{
                                  type: 'spring',
                                  stiffness: 420,
                                  damping: 18,
                                  delay: 0.32 + idx * 0.09,
                                }}
                                className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full bg-gradient-to-r from-emerald-400 via-lime-300 to-amber-300 text-slate-950 font-display font-black text-[9px] uppercase tracking-wider leading-none shadow-[0_0_14px_rgba(52,211,153,0.85)] shrink-0"
                              >
                                <LevelUpSvgIcon className="w-3 h-3" />
                                <span>Lv. UP +{levelsGained}</span>
                              </motion.span>
                            )}
                          </div>

                          <div className="font-mono text-[11px] font-bold text-amber-200 shrink-0 tabular-nums">
                            {result.victory ? (
                              <>
                                <AnimatedNumber
                                  value={curExp}
                                  startFromZero
                                  duration={0.85}
                                  className="text-[11px] font-black text-amber-300"
                                />
                                <span className="text-slate-400"> / {expToNext.toLocaleString()}</span>
                              </>
                            ) : (
                              <>
                                <AnimatedNumber
                                  value={entry.dmg}
                                  startFromZero
                                  duration={0.85}
                                  className="text-[11px] font-black text-amber-300"
                                />
                                <span className="text-slate-400"> / {maxDmg.toLocaleString()}</span>
                              </>
                            )}
                          </div>
                        </div>

                        {/* Row 2: EXP Progress Bar (or DMG contribution bar on Defeat) */}
                        <RpgProgressBar
                          value={result.victory ? (atLevelCap ? expToNext : curExp) : entry.dmg}
                          max={result.victory ? expToNext : maxDmg}
                          animateFromZero
                          delay={0.18 + idx * 0.08}
                          heightClass="h-2.5"
                          gradient={
                            levelsGained > 0
                              ? 'linear-gradient(90deg, #10b981 0%, #a3e635 58%, #fde047 100%)'
                              : result.victory
                                ? 'linear-gradient(90deg, #06b6d4 0%, #38e8ff 55%, #fde047 100%)'
                                : `linear-gradient(90deg, ${h.themeColor}cc 0%, #fde047 100%)`
                          }
                          glowColor={
                            levelsGained > 0
                              ? 'rgba(52,211,153,0.75)'
                              : idx === 0
                                ? 'rgba(253,224,71,0.6)'
                                : `${h.themeColor}55`
                          }
                        />

                        {/* Row 3: +EXP Gained + Combat DMG / Heal Summary */}
                        <div className="flex items-center justify-between gap-2 mt-1 text-[10px] font-mono">
                          <div className="flex items-center gap-2 text-slate-300">
                            <span className="inline-flex items-center gap-0.5 text-amber-200/90 font-bold">
                              <Swords className="w-2.5 h-2.5 text-amber-400" />
                              {entry.dmg.toLocaleString()}
                            </span>
                            {entry.heal > 0 && (
                              <span className="inline-flex items-center gap-0.5 text-emerald-400 font-bold">
                                <Heart className="w-2.5 h-2.5" />
                                {entry.heal.toLocaleString()}
                              </span>
                            )}
                          </div>
                          {result.victory && (
                            <span
                              className={`font-bold ${
                                atLevelCap
                                  ? 'text-fuchsia-300'
                                  : levelsGained > 0
                                    ? 'text-emerald-300'
                                    : 'text-cyan-300'
                              }`}
                            >
                              {atLevelCap
                                ? `CAP Lv.${expRes?.levelCap ?? curLevel}`
                                : `+${expGained.toLocaleString()} EXP`}
                            </span>
                          )}
                        </div>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            </div>

            {/* RPG TREASURE SPOILS TILE GRID */}
            {result.victory ? (
              <div className="space-y-2.5">
                <div className="text-[10px] font-display font-black uppercase tracking-[0.26em] text-cyan-300 flex items-center gap-2">
                  <Sparkles className="w-3.5 h-3.5" /> Spoils Acquired
                </div>

                {/* Sculpted Beveled RPG Treasure Loot Slots */}
                <div className="flex flex-wrap gap-2">
                  {[
                    {
                      label: 'Gold',
                      val: `+${result.goldEarned.toLocaleString()}`,
                      color: '#f5c84c',
                      icon: <GameIcon name="gold" className="w-7 h-7" />,
                    },
                    ...(result.crystalsEarned > 0
                      ? [
                          {
                            label: 'Crystals',
                            val: `+${result.crystalsEarned}`,
                            color: '#38e8ff',
                            icon: <GameIcon name="crystal" className="w-7 h-7" />,
                          },
                        ]
                      : []),
                    ...(result.expPotionsEarned > 0
                      ? [
                          {
                            label: 'EXP',
                            val: `×${result.expPotionsEarned}`,
                            color: '#34d399',
                            icon: <MaterialIcon material="expPotions" className="w-7 h-7" />,
                          },
                        ]
                      : []),
                    ...(result.bondGiftsEarned > 0
                      ? [
                          {
                            label: 'Bond',
                            val: `×${result.bondGiftsEarned}`,
                            color: '#fb7185',
                            icon: <MaterialIcon material="bondGifts" className="w-7 h-7" />,
                          },
                        ]
                      : []),
                    ...(result.forgeStonesEarned > 0
                      ? [
                          {
                            label: 'Stones',
                            val: `×${result.forgeStonesEarned}`,
                            color: '#a78bfa',
                            icon: <MaterialIcon material="forgeStones" className="w-7 h-7" />,
                          },
                        ]
                      : []),
                    ...(result.starIronIngotsEarned > 0
                      ? [
                          {
                            label: 'Star-Iron',
                            val: `×${result.starIronIngotsEarned}`,
                            color: '#38bdf8',
                            icon: <MaterialIcon material="starIronIngots" className="w-7 h-7" />,
                          },
                        ]
                      : []),
                    ...(result.astralAnvilCoresEarned > 0
                      ? [
                          {
                            label: 'Anvil Core',
                            val: `×${result.astralAnvilCoresEarned}`,
                            color: '#f5c84c',
                            icon: <MaterialIcon material="astralAnvilCores" className="w-7 h-7" />,
                          },
                        ]
                      : []),
                    ...(result.starCoresEarned > 0
                      ? [
                          {
                            label: 'Star Core',
                            val: `×${result.starCoresEarned}`,
                            color: '#e879f9',
                            icon: <MaterialIcon material="starCores" className="w-7 h-7" />,
                          },
                        ]
                      : []),
                    ...(result.relicFragmentsEarned > 0
                      ? [
                          {
                            label: 'Relic Frag',
                            val: `×${result.relicFragmentsEarned}`,
                            color: '#22d3ee',
                            icon: <GameIcon name="relic" className="w-7 h-7" />,
                          },
                        ]
                      : []),
                    ...(Object.entries(result.essencesEarned ?? {}) as Array<[Faction, number]>)
                      .filter(([, qty]) => qty > 0)
                      .map(([fac, qty]) => {
                        const key = factionToEssenceKey(fac);
                        const meta = MATERIAL_META[key];
                        return {
                          label: meta.shortName,
                          val: `×${qty}`,
                          color: meta.color,
                          icon: <MaterialIcon material={key} className="w-7 h-7" />,
                        };
                      }),
                  ].map((mat, i) => (
                    <RpgLootTile
                      key={`${mat.label}_${i}`}
                      color={mat.color}
                      subLabel={mat.label}
                      bottomLabel={mat.val}
                      index={i}
                    >
                      {mat.icon}
                    </RpgLootTile>
                  ))}

                  {/* Dropped Starlight Relics (Boss/Mini-Boss Earned Drops!) */}
                  {(result.droppedRelics ?? []).map((dr, i) => {
                    const relic = RELIC_MAP[dr.relicId];
                    if (!relic) return null;
                    const col =
                      relic.tier === 'SSR' ? '#f5c84c' : relic.tier === 'SR' ? '#c084fc' : '#38bdf8';
                    const isSel = selectedRelic?.relicId === dr.relicId;
                    return (
                      <RpgLootTile
                        key={`${dr.relicId}_${i}`}
                        color={col}
                        topTag={dr.isNew ? 'NEW!' : `R${dr.newRank}`}
                        bottomLabel={relic.tier}
                        selected={isSel}
                        index={8 + i}
                        title={relic.name}
                        onClick={() => {
                          setSelectedRelic(dr);
                          setSelectedGear(null);
                          audioManager.playSfx('ssr_reveal');
                        }}
                      >
                        <ArtImage
                          kind="RELIC"
                          id={relic.id}
                          src={relic.assetCard}
                          alt={relic.name}
                          className="w-10 h-10 rounded object-cover"
                        />
                      </RpgLootTile>
                    );
                  })}

                  {/* Dropped Equipment Beveled Treasure Tiles (Tap to Inspect!) */}
                  {result.droppedEquipment.map((eq, i) => {
                    const col = RARITY_COLORS[eq.rarity];
                    const isSel = !selectedRelic && selectedGear?.uid === eq.uid;
                    return (
                      <RpgLootTile
                        key={eq.uid}
                        color={col}
                        topTag={eq.rarity.slice(0, 3)}
                        bottomLabel={eq.setId.split('_')[0]}
                        selected={isSel}
                        index={10 + i}
                        title={eq.name}
                        onClick={() => {
                          setSelectedRelic(null);
                          setSelectedGear(eq);
                          audioManager.playSfx('button');
                        }}
                      >
                        <EquipIcon slot={eq.slot} className="w-9 h-9 sm:w-10 sm:h-10" />
                      </RpgLootTile>
                    );
                  })}
                </div>

                {/* Selected Dropped Relic Tooltip Plaque */}
                {selectedRelic && RELIC_MAP[selectedRelic.relicId] && (() => {
                  const relic = RELIC_MAP[selectedRelic.relicId];
                  const col =
                    relic.tier === 'SSR' ? '#f5c84c' : relic.tier === 'SR' ? '#c084fc' : '#38bdf8';
                  return (
                    <motion.div
                      key={relic.id}
                      initial={{ opacity: 0, y: 6 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="rpg-ornate-card flex flex-wrap items-center justify-between gap-2 px-3.5 py-2.5 overflow-hidden"
                      style={{
                        borderColor: `${col}aa`,
                        borderLeft: `4px solid ${col}`,
                      }}
                    >
                      <CornerFiligree color={col} size={7} opacity={0.75} />
                      <div className="flex items-center gap-3 min-w-0 flex-1">
                        <div
                          className="w-11 h-14 rounded-lg overflow-hidden border-2 shrink-0"
                          style={{ borderColor: col }}
                        >
                          <ArtImage
                            kind="RELIC"
                            id={relic.id}
                            src={relic.assetCard}
                            alt={relic.name}
                            className="w-full h-full object-cover"
                          />
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span
                              className="px-2 py-0.5 rounded-full text-[9px] font-display font-black uppercase border"
                              style={{ color: col, borderColor: `${col}88`, backgroundColor: `${col}20` }}
                            >
                              ★ {selectedRelic.isNew ? 'NEW RELIC DROP' : `REFINED RANK ${selectedRelic.newRank}`}
                            </span>
                            <span className="font-display font-bold text-sm sm:text-base text-white">
                              {relic.name}
                            </span>
                          </div>
                          <p className="text-xs text-cyan-200 mt-1 leading-snug">{relic.passiveDesc}</p>
                        </div>
                      </div>
                    </motion.div>
                  );
                })()}

                {/* Sculpted Selected Loot Gear Tooltip Plaque */}
                {!selectedRelic && selectedGear && (
                  <motion.div
                    key={selectedGear.uid}
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="rpg-ornate-card flex flex-wrap items-center justify-between gap-2 px-3.5 py-2.5 overflow-hidden"
                    style={{
                      borderColor: `${RARITY_COLORS[selectedGear.rarity]}88`,
                      borderLeft: `4px solid ${RARITY_COLORS[selectedGear.rarity]}`,
                    }}
                  >
                    <CornerFiligree color={RARITY_COLORS[selectedGear.rarity]} size={7} opacity={0.65} />
                    <div className="flex items-center gap-3">
                      <div
                        className="w-11 h-11 rounded-xl bg-slate-900 border-2 flex items-center justify-center shrink-0"
                        style={{
                          borderColor: `${RARITY_COLORS[selectedGear.rarity]}aa`,
                          boxShadow: `inset 0 0 14px ${RARITY_COLORS[selectedGear.rarity]}33`,
                        }}
                      >
                        <EquipIcon slot={selectedGear.slot} className="w-8 h-8" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span
                            className="px-2 py-0.5 rounded-full text-[9px] font-display font-black uppercase border"
                            style={{
                              color: RARITY_COLORS[selectedGear.rarity],
                              borderColor: `${RARITY_COLORS[selectedGear.rarity]}66`,
                              backgroundColor: `${RARITY_COLORS[selectedGear.rarity]}18`,
                            }}
                          >
                            {selectedGear.rarity} {selectedGear.slot}
                          </span>
                          <span className="font-display font-bold text-sm sm:text-base text-white">
                            {selectedGear.name}
                          </span>
                        </div>
                        <div className="text-xs text-slate-300 flex flex-wrap gap-x-3 mt-1 font-mono font-bold">
                          <span className="text-amber-300">
                            {formatStatValue(
                              selectedGear.mainStat.stat,
                              getEnhancedMainStatValue(selectedGear),
                            )}
                          </span>
                          {selectedGear.subStats.map((s, i) => (
                            <span key={i} className="text-slate-300">
                              {formatStatValue(s.stat, s.value)}
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>
                    <span className="px-2.5 py-1 rounded-full bg-cyan-500/10 border border-cyan-400/35 text-[10px] font-display uppercase tracking-wider font-bold text-cyan-200">
                      {EQUIPMENT_SETS[selectedGear.setId].name}
                    </span>
                  </motion.div>
                )}
              </div>
            ) : (
              <div className="bg-rose-950/40 border-l-4 border-l-rose-500 p-4 text-xs text-rose-100 leading-relaxed">
                <strong className="uppercase tracking-wider text-rose-300 block mb-1">
                  Tactical Recovery Advice
                </strong>
                Level up your Chasers, enhance gear at the Blacksmith Forge (+15), or bring a{' '}
                <strong className="text-amber-300">STUN_CANCEL</strong> hero (Vaelen, Draven,
                Titus) to interrupt Boss casts and trigger Broken (+25% DMG).
              </div>
            )}
            </div>
          </div>
          )}
        </div>

        {/* 3. PINNED BOTTOM HEROIC ACTION BAR (Zero Overlap Guaranteed!) */}
        <div className="ls-victory-footer shrink-0 flex flex-wrap items-center justify-end gap-2 sm:gap-3 px-4 sm:px-6 py-2.5 sm:py-3.5 bg-slate-950/90 backdrop-blur-md border-t border-amber-400/25 safe-bottom">
          <button
            disabled={!canReplay}
            onClick={() => {
              if (!canReplay) return;
              audioManager.playSfx('button');
              onReplay();
            }}
            className={`rpg-blade px-4 sm:px-5 py-2 sm:py-2.5 font-display font-extrabold text-xs sm:text-sm uppercase tracking-[0.14em] flex items-center gap-1.5 ${
              canReplay ? 'text-white' : 'text-slate-500 opacity-50 cursor-not-allowed'
            }`}
          >
            <RotateCcw className="w-4 h-4 text-cyan-300" />
            {canReplay ? 'Replay' : 'No Entries Left'}
          </button>
          {result.victory && onNextStage && nextStageCode ? (
            <>
              <button
                onClick={() => {
                  audioManager.playSfx('button');
                  onExit();
                }}
                className="rpg-blade px-4 sm:px-5 py-2 sm:py-2.5 text-slate-200 font-display font-extrabold text-xs sm:text-sm uppercase tracking-[0.14em]"
              >
                {exitLabel}
              </button>
              <button
                onClick={() => {
                  audioManager.playSfx('button');
                  onNextStage();
                }}
                className="rpg-battle-cta px-6 sm:px-9 py-2 sm:py-2.5 text-slate-950 font-display font-black text-xs sm:text-sm uppercase tracking-[0.16em] flex items-center gap-2"
              >
                <GameIcon name="battle" className="w-5 h-5" />
                <span>Next Stage ({nextStageCode})</span>
                <ChevronRight className="w-4 h-4 sm:w-5 sm:h-5" />
              </button>
            </>
          ) : (
            <button
              onClick={() => {
                audioManager.playSfx('button');
                onExit();
              }}
              className="rpg-battle-cta px-7 sm:px-10 py-2 sm:py-2.5 text-slate-950 font-display font-black text-xs sm:text-sm uppercase tracking-[0.18em] flex items-center gap-2"
            >
              {result.isDungeon ? `Back to ${exitLabel}` : 'Continue'}{' '}
              <ChevronRight className="w-4 h-4 sm:w-5 sm:h-5" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
