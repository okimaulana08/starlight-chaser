import React, { useEffect, useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import {
  ArrowRight,
  CheckCircle2,
  Crown,
  Lock,
  ShoppingBag,
  Sparkles,
  X,
} from 'lucide-react';
import {
  FACTION_CONSTELLATION_POINTS,
  MAX_CONSTELLATION_LEVEL,
  computeConstellationAccountBonus,
  getHeroConstellationNodes,
  type ConstellationNodeDef,
} from '../data/constellations';
import { FACTIONS } from '../data/factions';
import { resolveHeroVisuals } from '../data/heroes';
import type { ShopCategory } from '../data/materials';
import { audioManager } from '../engine/AudioManager';
import { computeHeroStats } from '../engine/CombatMath';
import { usePlayerStore } from '../store/usePlayerStore';
import type { HeroDef, OwnedHeroState } from '../types/game';
import { ArtImage } from './ArtImage';
import { GameIcon } from './GameIcon';
import { AnimatedNumber, CornerFiligree, RpgButton } from './RpgKit';
import { RarityCrest, RoleBadge } from './RoleBadge';

interface ConstellationModalProps {
  open: boolean;
  hero: HeroDef;
  owned: OwnedHeroState;
  onClose: () => void;
  onUpgraded: (newLevel: number, message: string) => void;
  onOpenShop: (tab: ShopCategory) => void;
}

const STARFIELD_DOTS = Array.from({ length: 42 }, (_, i) => ({
  id: i,
  x: ((i * 37 + 11) % 94) + 3,
  y: ((i * 53 + 17) % 92) + 4,
  size: i % 5 === 0 ? 3 : i % 3 === 0 ? 2 : 1.3,
  delay: (i % 7) * 0.45,
}));

const TIER_BADGE_NOTE: Record<HeroDef['tier'], string> = {
  R: 'R Tier Constellation • Max +6% Base Stats • +0.5% Account C6',
  SR: 'SR Tier Constellation • Max +12% Base Stats • +1.0% Account C6',
  SSR: 'SSR Tier Constellation • Max +21% Base Stats • +1.5% Account C6',
  UR: 'UR Sovereign Constellation • Max +30% Base Stats • +4% Squad Aura • +2.5% Account C6',
};

export const ConstellationModal: React.FC<ConstellationModalProps> = ({
  open,
  hero,
  owned,
  onClose,
  onUpgraded,
  onOpenShop,
}) => {
  const {
    gold,
    squadIds,
    roster,
    activePetId,
    ownedPets,
    equipmentInventory,
    unlockedCodexIds,
    relicRanks,
    upgradeConstellation,
  } = usePlayerStore();

  const curLevel = owned.constellation ?? 0;
  const nodes = useMemo(() => getHeroConstellationNodes(hero), [hero]);
  const starPoints = FACTION_CONSTELLATION_POINTS[hero.faction];
  const factionDef = FACTIONS[hero.faction];
  const visuals = resolveHeroVisuals(hero, owned);
  const activeOwnedPet = activePetId && ownedPets?.[activePetId] ? ownedPets[activePetId] : null;
  const accountMastery = useMemo(() => computeConstellationAccountBonus(roster), [roster]);

  const [selectedIdx, setSelectedIdx] = useState<number>(() =>
    Math.min(MAX_CONSTELLATION_LEVEL, curLevel + 1),
  );
  const [igniteBurstNode, setIgniteBurstNode] = useState<number | null>(null);

  useEffect(() => {
    if (open) {
      setSelectedIdx(Math.min(MAX_CONSTELLATION_LEVEL, curLevel + 1));
      setIgniteBurstNode(null);
    }
  }, [open, hero.id, curLevel]);

  const selectedNode: ConstellationNodeDef =
    nodes.find((n) => n.index === selectedIdx) ?? nodes[0];

  const isSelectedUnlocked = selectedNode.index <= curLevel;
  const isSelectedNext = selectedNode.index === curLevel + 1;
  const isSelectedFuture = selectedNode.index > curLevel + 1;

  const currentStats = useMemo(
    () =>
      computeHeroStats(
        hero,
        owned,
        equipmentInventory,
        squadIds,
        unlockedCodexIds.length,
        relicRanks,
        { roster, activePet: activeOwnedPet },
      ),
    [hero, owned, equipmentInventory, squadIds, unlockedCodexIds.length, relicRanks, roster, activeOwnedPet],
  );

  const previewTargetLevel = isSelectedUnlocked
    ? curLevel
    : isSelectedNext
      ? curLevel + 1
      : selectedNode.index;

  const previewStats = useMemo(() => {
    if (previewTargetLevel <= curLevel) return currentStats;
    const simulatedOwned: OwnedHeroState = {
      ...owned,
      constellation: previewTargetLevel,
    };
    const simulatedRoster = {
      ...roster,
      [hero.id]: simulatedOwned,
    };
    return computeHeroStats(
      hero,
      simulatedOwned,
      equipmentInventory,
      squadIds,
      unlockedCodexIds.length,
      relicRanks,
      { roster: simulatedRoster, activePet: activeOwnedPet },
    );
  }, [
    hero,
    owned,
    roster,
    previewTargetLevel,
    curLevel,
    currentStats,
    equipmentInventory,
    squadIds,
    unlockedCodexIds.length,
    relicRanks,
    activeOwnedPet,
  ]);

  const shardsMet = owned.shards >= selectedNode.shardsCost;
  const goldMet = gold >= selectedNode.goldCost;
  const canIgniteSelected = isSelectedNext && shardsMet && goldMet;

  const accentHex = hero.tier === 'UR' ? '#e879f9' : hero.themeColor;

  const handleIgnite = () => {
    if (!canIgniteSelected) return;
    const targetNum = selectedNode.index;
    const res = upgradeConstellation(hero.id);
    if (res.ok && res.newLevel) {
      audioManager.playSfx('ssr_reveal');
      audioManager.playSfx('ult_chime', 0.06);
      setIgniteBurstNode(targetNum);
      onUpgraded(res.newLevel, res.message);
      window.setTimeout(() => {
        setIgniteBurstNode(null);
      }, 1100);
    }
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="fixed inset-0 z-50 bg-[#02040d]/88 backdrop-blur-md flex items-center justify-center p-2.5 sm:p-4 select-none overflow-y-auto"
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.93, y: 18 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 12 }}
            transition={{ type: 'spring', stiffness: 360, damping: 28 }}
            onClick={(e) => e.stopPropagation()}
            className="relative rpg-panel w-full max-w-5xl max-h-[93dvh] flex flex-col overflow-hidden border-cyan-300/60 shadow-[0_28px_80px_rgba(0,0,0,0.95),0_0_55px_rgba(56,232,255,0.22)]"
          >
            <CornerFiligree color={accentHex} size={12} opacity={0.9} />

            {/* HEADER */}
            <div className="shrink-0 px-4 sm:px-5 py-3 border-b border-cyan-400/25 bg-gradient-to-r from-[#09122b] via-[#101230] to-[#080d20] flex flex-wrap items-center justify-between gap-2.5">
              <div className="flex items-center gap-3 min-w-0">
                <div
                  className="relative w-11 h-11 rounded-xl overflow-hidden border-2 shrink-0 bg-slate-950 shadow-lg"
                  style={{ borderColor: accentHex }}
                >
                  <ArtImage
                    kind="HERO"
                    id={hero.id}
                    src={visuals.card}
                    alt={hero.name}
                    className="w-full h-full object-cover object-top"
                  />
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <RarityCrest tier={hero.tier} size="xs" />
                    <RoleBadge role={hero.role} variant="medallion" size="sm" />
                    <span className="text-[10px] font-display font-black uppercase tracking-[0.22em] text-cyan-300">
                      ✦ STARLIGHT CONSTELLATION
                    </span>
                  </div>
                  <div className="flex items-center gap-2 mt-0.5">
                    <h2 className="font-display text-lg sm:text-xl font-black text-white leading-tight truncate">
                      {hero.name}
                    </h2>
                    <span
                      className="px-2 py-0.5 rounded-full text-[10px] font-mono font-black border"
                      style={{
                        borderColor: curLevel >= 6 ? '#fde047' : `${accentHex}99`,
                        backgroundColor:
                          curLevel >= 6 ? 'rgba(253,224,71,0.18)' : `${accentHex}22`,
                        color: curLevel >= 6 ? '#fef08a' : '#e0f2fe',
                      }}
                    >
                      C{curLevel} / {MAX_CONSTELLATION_LEVEL}
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                {/* Owned Shards Counter Pill */}
                <div className="px-2.5 py-1 rounded-xl bg-slate-950/90 border border-cyan-400/45 flex items-center gap-1.5 text-xs font-mono font-bold text-cyan-200">
                  <div
                    className="w-5 h-5 rounded-full overflow-hidden border shrink-0"
                    style={{ borderColor: accentHex }}
                  >
                    <ArtImage
                      kind="HERO"
                      id={hero.id}
                      src={visuals.card}
                      alt={hero.name}
                      className="w-full h-full object-cover object-top"
                    />
                  </div>
                  <span>{owned.shards}</span>
                  <span className="text-[10px] text-slate-400 font-sans">Shards</span>
                </div>

                {/* Gold Counter Pill */}
                <div className="hidden sm:flex px-2.5 py-1 rounded-xl bg-slate-950/90 border border-amber-400/35 items-center gap-1 text-xs font-mono font-bold text-amber-200">
                  <GameIcon name="gold" className="w-4 h-4" />
                  <span>{gold.toLocaleString()}</span>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    audioManager.playSfx('button');
                    onClose();
                  }}
                  className="p-2 rounded-xl bg-slate-900/90 border border-slate-700 text-slate-300 hover:text-amber-300 transition"
                  aria-label="Close Constellation"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* BODY: LEFT INTERACTIVE STAR CHART + RIGHT STAR INSPECTOR */}
            <div className="flex-1 min-h-0 overflow-y-auto lg:overflow-hidden grid grid-cols-1 lg:grid-cols-12">
              {/* LEFT (7 cols): CELESTIAL CONSTELLATION SKY ALTAR */}
              <div className="lg:col-span-7 relative min-h-[340px] sm:min-h-[410px] flex flex-col justify-between overflow-hidden border-b lg:border-b-0 lg:border-r border-cyan-400/20">
                {/* Deep Cosmic Nebula Sky */}
                <div
                  className="pointer-events-none absolute inset-0"
                  style={{
                    background: `radial-gradient(ellipse 75% 70% at 50% 48%, ${accentHex}28 0%, rgba(11,18,46,0.92) 52%, rgba(3,5,16,0.99) 100%)`,
                  }}
                />

                {/* Rotating Sacred Astrolabe Celestial Ring */}
                <div className="pointer-events-none absolute inset-0 flex items-center justify-center overflow-hidden opacity-30">
                  <div
                    className="w-[340px] h-[340px] sm:w-[440px] sm:h-[440px] rounded-full border border-dashed animate-spin"
                    style={{
                      borderColor: `${accentHex}88`,
                      animationDuration: '48s',
                    }}
                  />
                  <div
                    className="absolute w-[230px] h-[230px] sm:w-[300px] sm:h-[300px] rounded-full border border-cyan-300/35 animate-spin"
                    style={{
                      animationDuration: '32s',
                      animationDirection: 'reverse',
                    }}
                  />
                </div>

                {/* Twinkling Cosmic Starfield Dots */}
                <div className="pointer-events-none absolute inset-0">
                  {STARFIELD_DOTS.map((dot) => (
                    <span
                      key={dot.id}
                      className="absolute rounded-full bg-white animate-pulse"
                      style={{
                        left: `${dot.x}%`,
                        top: `${dot.y}%`,
                        width: `${dot.size}px`,
                        height: `${dot.size}px`,
                        opacity: 0.45,
                        animationDelay: `${dot.delay}s`,
                      }}
                    />
                  ))}
                </div>

                {/* Ethereal Ghostly Hero Standing Silhouette in the Nebula */}
                <div className="pointer-events-none absolute inset-0 flex items-end justify-center overflow-hidden">
                  <ArtImage
                    kind="HERO"
                    id={hero.id}
                    src={visuals.standing}
                    alt={hero.name}
                    className="h-[92%] w-auto object-contain opacity-[0.22] select-none"
                    style={{
                      filter: `drop-shadow(0 0 36px ${accentHex}) saturate(1.25)`,
                    }}
                  />
                </div>

                {/* Top Floating Faction Constellation Crest */}
                <div className="relative z-20 px-4 pt-3 flex items-center justify-between gap-2">
                  <div
                    className="px-2.5 py-1 rounded-full bg-slate-950/80 border text-[10px] font-display font-black uppercase tracking-[0.2em] backdrop-blur-sm"
                    style={{
                      borderColor: `${factionDef.color}70`,
                      color: factionDef.color,
                    }}
                  >
                    ✦ {factionDef.name} Star Chart
                  </div>
                  <div className="px-2.5 py-1 rounded-full bg-slate-950/80 border border-white/15 text-[10px] font-mono text-slate-300 backdrop-blur-sm">
                    Tap any star (C1–C6) to inspect
                  </div>
                </div>

                {/* Interactive Constellation Canvas (SVG Ley-Lines + 6 Clickable Star Medallions) */}
                <div className="relative z-20 flex-1 min-h-[250px] sm:min-h-[300px] mx-2 sm:mx-4">
                  {/* Connecting Cosmic Constellation Arcs */}
                  <svg
                    viewBox="0 0 100 100"
                    preserveAspectRatio="none"
                    className="pointer-events-none absolute inset-0 w-full h-full"
                  >
                    <defs>
                      <filter id="constStarGlow" x="-30%" y="-30%" width="160%" height="160%">
                        <feGaussianBlur stdDeviation="1.4" result="blur" />
                        <feMerge>
                          <feMergeNode in="blur" />
                          <feMergeNode in="SourceGraphic" />
                        </feMerge>
                      </filter>
                    </defs>

                    {starPoints.slice(0, -1).map((p1, idx) => {
                      const p2 = starPoints[idx + 1];
                      const lit = curLevel >= idx + 2;
                      const nextLink = curLevel === idx + 1;
                      return (
                        <g key={idx}>
                          {lit && (
                            <line
                              x1={p1.x}
                              y1={p1.y}
                              x2={p2.x}
                              y2={p2.y}
                              stroke={accentHex}
                              strokeWidth="1.9"
                              strokeOpacity="0.45"
                              filter="url(#constStarGlow)"
                            />
                          )}
                          <line
                            x1={p1.x}
                            y1={p1.y}
                            x2={p2.x}
                            y2={p2.y}
                            stroke={lit ? '#fef08a' : nextLink ? '#38e8ff' : '#64748b'}
                            strokeWidth={lit ? '0.85' : '0.55'}
                            strokeOpacity={lit ? '0.95' : nextLink ? '0.75' : '0.42'}
                            strokeDasharray={lit ? undefined : '2 2'}
                            className={nextLink ? 'animate-pulse' : undefined}
                          />
                        </g>
                      );
                    })}

                    {/* Closing Celestial Halo Line when C6 Pinnacle is Complete! */}
                    {curLevel >= 6 && (
                      <line
                        x1={starPoints[5].x}
                        y1={starPoints[5].y}
                        x2={starPoints[0].x}
                        y2={starPoints[0].y}
                        stroke="#fde047"
                        strokeWidth="0.9"
                        strokeOpacity="0.65"
                        strokeDasharray="1.8 1.8"
                        filter="url(#constStarGlow)"
                      />
                    )}
                  </svg>

                  {/* 6 Clickable Star Medallion Nodes */}
                  {nodes.map((node, idx) => {
                    const pt = starPoints[idx] ?? { x: 50, y: 50 };
                    const unlocked = node.index <= curLevel;
                    const isNext = node.index === curLevel + 1;
                    const isSel = selectedNode.index === node.index;
                    const readyNow = isNext && owned.shards >= node.shardsCost && gold >= node.goldCost;
                    const bursting = igniteBurstNode === node.index;

                    return (
                      <button
                        key={node.code}
                        type="button"
                        onClick={() => {
                          audioManager.playSfx('button');
                          setSelectedIdx(node.index);
                        }}
                        style={{
                          left: `${pt.x}%`,
                          top: `${pt.y}%`,
                        }}
                        className={`group absolute -translate-x-1/2 -translate-y-1/2 flex flex-col items-center transition-transform duration-200 ${
                          isSel ? 'scale-115 z-30' : 'hover:scale-110 z-20'
                        }`}
                      >
                        {/* Ignition Shockwave Burst Animation */}
                        {bursting && (
                          <motion.span
                            initial={{ scale: 0.5, opacity: 1 }}
                            animate={{ scale: 3.1, opacity: 0 }}
                            transition={{ duration: 0.85, ease: 'easeOut' }}
                            className="pointer-events-none absolute w-14 h-14 rounded-full border-2 border-amber-200"
                            style={{
                              boxShadow: `0 0 36px ${accentHex}, 0 0 24px #fde047`,
                            }}
                          />
                        )}

                        {/* Outer Beacon Halo */}
                        {(unlocked || readyNow || isSel) && (
                          <span
                            className={`pointer-events-none absolute -inset-2.5 rounded-full blur-md transition-opacity ${
                              readyNow ? 'animate-pulse opacity-90' : isSel ? 'opacity-85' : 'opacity-50'
                            }`}
                            style={{
                              background:
                                node.index === 6 && unlocked
                                  ? 'linear-gradient(135deg, #fde047, #e879f9, #38e8ff)'
                                  : readyNow
                                    ? '#34d399'
                                    : accentHex,
                            }}
                          />
                        )}

                        {/* Sculpted Star Diamond / Medallion */}
                        <div
                          className={`relative w-12 h-12 sm:w-14 sm:h-14 rounded-full border-2 flex items-center justify-center transition shadow-[0_8px_24px_rgba(0,0,0,0.85)] ${
                            unlocked
                              ? 'bg-gradient-to-br from-amber-300/35 via-slate-950/90 to-fuchsia-500/35 text-amber-200'
                              : isNext
                                ? readyNow
                                  ? 'bg-emerald-950/90 border-emerald-300 text-emerald-200 ring-2 ring-amber-300/75'
                                  : 'bg-slate-950/95 border-cyan-300/80 text-cyan-200'
                                : 'bg-slate-950/85 border-slate-700 text-slate-500'
                          } ${isSel ? 'ring-2 ring-white/90' : ''}`}
                          style={{
                            borderColor: unlocked
                              ? node.index === 6
                                ? '#fde047'
                                : accentHex
                              : undefined,
                          }}
                        >
                          {unlocked ? (
                            node.index === 6 ? (
                              <Crown className="w-6 h-6 text-amber-200 drop-shadow-[0_0_12px_rgba(253,224,71,0.95)]" />
                            ) : (
                              <Sparkles
                                className="w-5 h-5 sm:w-6 sm:h-6 drop-shadow-[0_0_10px_rgba(255,255,255,0.85)]"
                                style={{ color: '#fef08a' }}
                              />
                            )
                          ) : isNext ? (
                            <span className="font-display text-sm sm:text-base font-black">
                              {node.code}
                            </span>
                          ) : (
                            <Lock className="w-4 h-4 text-slate-500" />
                          )}

                          {/* Status Mini Pip */}
                          {unlocked && (
                            <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-emerald-400 border border-slate-950 flex items-center justify-center">
                              <CheckCircle2 className="w-3 h-3 text-slate-950" />
                            </span>
                          )}
                          {readyNow && (
                            <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-amber-300 border border-slate-950 text-slate-950 text-[9px] font-black flex items-center justify-center animate-bounce">
                              !
                            </span>
                          )}
                        </div>

                        {/* Star Code + Short Name Pill */}
                        <div
                          className={`mt-1 px-2 py-0.5 rounded-full text-[9px] sm:text-[10px] font-display font-black uppercase tracking-wider border backdrop-blur-md whitespace-nowrap shadow-md ${
                            isSel
                              ? 'bg-amber-300 text-slate-950 border-white'
                              : unlocked
                                ? 'bg-slate-950/90 text-amber-200 border-amber-300/60'
                                : isNext
                                  ? 'bg-slate-950/90 text-cyan-200 border-cyan-400/60'
                                  : 'bg-slate-950/80 text-slate-400 border-slate-700/80'
                          }`}
                        >
                          {node.code} • {node.name.split(' ')[0]}
                        </div>
                      </button>
                    );
                  })}
                </div>

                {/* Bottom Cosmic Account Mastery Footer */}
                <div className="relative z-20 px-4 pb-3 pt-2 bg-gradient-to-t from-slate-950/95 via-slate-950/75 to-transparent flex flex-wrap items-center justify-between gap-2 text-[10px]">
                  <div className="flex items-center gap-1.5 text-amber-200 font-bold">
                    <Crown className="w-3.5 h-3.5 text-amber-300 shrink-0" />
                    <span>
                      Account C6 Mastery:{' '}
                      <strong className="font-mono text-emerald-300">
                        +{(accountMastery.totalPct * 100).toFixed(1)}% Global ATK &amp; HP
                      </strong>{' '}
                      ({accountMastery.c6Count} C6 Chaser{accountMastery.c6Count === 1 ? '' : 's'})
                    </span>
                  </div>
                  <div className="text-cyan-300/90 font-semibold">
                    Max C6 Surplus Dupes → <strong>2× Star Dust</strong>
                  </div>
                </div>
              </div>

              {/* RIGHT (5 cols): SELECTED STAR DETAILS, LIVE STAT DIFF & IGNITION CONSOLE */}
              <div className="lg:col-span-5 p-4 flex flex-col justify-between gap-3 bg-[#070b1a]/95 lg:overflow-y-auto">
                <div className="space-y-3">
                  {/* Tier Balance Transparency Banner */}
                  <div className="px-2.5 py-1.5 rounded-xl bg-slate-950/90 border border-white/10 text-[10px] font-semibold text-slate-300 flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-amber-300 shrink-0" />
                    <span>{TIER_BADGE_NOTE[hero.tier]}</span>
                  </div>

                  {/* Selected Constellation Node Card */}
                  <div
                    className="relative rpg-ornate-card p-3.5 space-y-2.5 overflow-hidden"
                    style={{
                      borderColor: isSelectedUnlocked ? '#fde04788' : `${accentHex}75`,
                      borderLeft: `4px solid ${isSelectedUnlocked ? '#fde047' : accentHex}`,
                    }}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="flex items-center gap-1.5">
                          <span
                            className="px-2 py-0.5 rounded text-[10px] font-mono font-black border bg-slate-950"
                            style={{ borderColor: accentHex, color: accentHex }}
                          >
                            {selectedNode.code}
                          </span>
                          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                            {selectedNode.subtitle}
                          </span>
                        </div>
                        <h3 className="font-display text-lg font-black text-white mt-1 leading-tight">
                          {selectedNode.name}
                        </h3>
                      </div>
                      <span
                        className={`shrink-0 px-2 py-0.5 rounded-full text-[9px] font-display font-black uppercase tracking-wider border ${
                          isSelectedUnlocked
                            ? 'bg-emerald-500/20 border-emerald-400/60 text-emerald-200'
                            : isSelectedNext
                              ? 'bg-amber-400/20 border-amber-300/70 text-amber-200'
                              : 'bg-slate-900 border-slate-700 text-slate-400'
                        }`}
                      >
                        {isSelectedUnlocked
                          ? '✦ Active'
                          : isSelectedNext
                            ? 'Next Star'
                            : `Requires C${selectedNode.index - 1}`}
                      </span>
                    </div>

                    {/* Star Perk Effects List */}
                    <ul className="space-y-1.5 pt-1 border-t border-white/10">
                      {selectedNode.effectsSummary.map((line, i) => (
                        <li
                          key={i}
                          className="flex items-start gap-2 text-xs text-slate-100 leading-snug"
                        >
                          <span
                            className="mt-0.5 text-[10px] shrink-0"
                            style={{ color: isSelectedUnlocked ? '#34d399' : '#fde047' }}
                          >
                            ✦
                          </span>
                          <span>{line}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  {/* Live Stat Preview (Current -> Preview Target) */}
                  {!isSelectedUnlocked && (
                    <div className="rounded-2xl bg-slate-950/85 border border-cyan-400/25 p-3 space-y-2">
                      <div className="flex items-center justify-between text-[10px]">
                        <span className="font-display font-black uppercase tracking-wider text-cyan-300">
                          {isSelectedNext
                            ? `Stat Surge Preview (C${curLevel} → C${curLevel + 1})`
                            : `Cumulative Preview (C${curLevel} → C${selectedNode.index})`}
                        </span>
                        <span className="font-mono font-black text-amber-300 flex items-center gap-1">
                          PWR {currentStats.powerRating.toLocaleString()}
                          <ArrowRight className="w-3 h-3" />
                          <AnimatedNumber
                            value={previewStats.powerRating}
                            className="text-emerald-300"
                          />
                        </span>
                      </div>
                      <div className="grid grid-cols-4 gap-1.5 text-center pt-1.5 border-t border-white/10">
                        <div>
                          <div className="text-[9px] uppercase text-slate-400 font-bold">HP</div>
                          <div className="font-mono text-[10px] text-slate-400">
                            {currentStats.maxHp.toLocaleString()}
                          </div>
                          <div className="font-mono text-[11px] font-black text-emerald-400">
                            → {previewStats.maxHp.toLocaleString()}
                          </div>
                        </div>
                        <div>
                          <div className="text-[9px] uppercase text-slate-400 font-bold">ATK</div>
                          <div className="font-mono text-[10px] text-slate-400">
                            {currentStats.atk.toLocaleString()}
                          </div>
                          <div className="font-mono text-[11px] font-black text-amber-300">
                            → {previewStats.atk.toLocaleString()}
                          </div>
                        </div>
                        <div>
                          <div className="text-[9px] uppercase text-slate-400 font-bold">DEF</div>
                          <div className="font-mono text-[10px] text-slate-400">
                            {currentStats.def.toLocaleString()}
                          </div>
                          <div className="font-mono text-[11px] font-black text-sky-300">
                            → {previewStats.def.toLocaleString()}
                          </div>
                        </div>
                        <div>
                          <div className="text-[9px] uppercase text-slate-400 font-bold">CRIT</div>
                          <div className="font-mono text-[10px] text-slate-400">
                            {Math.round(currentStats.critRate * 100)}%
                          </div>
                          <div className="font-mono text-[11px] font-black text-orange-300">
                            → {Math.round(previewStats.critRate * 100)}%
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Ignition Requirements (Hero Shards + Gold) */}
                  {!isSelectedUnlocked && (
                    <div className="grid grid-cols-2 gap-2.5">
                      <div
                        className={`rounded-xl p-2.5 border-2 flex items-center gap-2.5 ${
                          shardsMet
                            ? 'bg-emerald-950/25 border-emerald-400/55'
                            : 'bg-rose-950/25 border-rose-500/50'
                        }`}
                      >
                        <div
                          className="w-10 h-10 rounded-xl overflow-hidden border-2 shrink-0 bg-slate-950"
                          style={{ borderColor: accentHex }}
                        >
                          <ArtImage
                            kind="HERO"
                            id={hero.id}
                            src={visuals.card}
                            alt={hero.name}
                            className="w-full h-full object-cover object-top"
                          />
                        </div>
                        <div className="min-w-0">
                          <div className="text-[10px] font-display font-bold text-white truncate">
                            {hero.name} Shards
                          </div>
                          <div
                            className={`font-mono text-sm font-black ${
                              shardsMet ? 'text-emerald-300' : 'text-rose-400'
                            }`}
                          >
                            {owned.shards} / {selectedNode.shardsCost}
                          </div>
                        </div>
                      </div>

                      <div
                        className={`rounded-xl p-2.5 border-2 flex items-center gap-2.5 ${
                          goldMet
                            ? 'bg-emerald-950/25 border-emerald-400/55'
                            : 'bg-rose-950/25 border-rose-500/50'
                        }`}
                      >
                        <div className="w-10 h-10 rounded-xl border border-amber-400/60 bg-amber-400/15 flex items-center justify-center shrink-0">
                          <GameIcon name="gold" className="w-7 h-7" />
                        </div>
                        <div className="min-w-0">
                          <div className="text-[10px] font-display font-bold text-white">Gold</div>
                          <div
                            className={`font-mono text-xs font-black truncate ${
                              goldMet ? 'text-emerald-300' : 'text-rose-400'
                            }`}
                          >
                            {gold.toLocaleString()} / {selectedNode.goldCost.toLocaleString()}
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Quick Shortcut to Star Dust Shard Exchange when short on Shards */}
                  {!isSelectedUnlocked && !shardsMet && (
                    <div className="flex items-center justify-between gap-2 px-3 py-2 rounded-xl bg-cyan-950/35 border border-cyan-400/35 text-[11px]">
                      <span className="text-cyan-100/90">
                        Earn Shards from Summon Dupes or exchange Star Dust in the Shop!
                      </span>
                      <button
                        type="button"
                        onClick={() => {
                          audioManager.playSfx('button');
                          onClose();
                          onOpenShop('AWAKEN');
                        }}
                        className="shrink-0 px-2.5 py-1 rounded-lg bg-amber-400/20 border border-amber-300/60 text-amber-200 font-display font-black uppercase text-[10px] flex items-center gap-1 hover:bg-amber-400/30 transition"
                      >
                        <ShoppingBag className="w-3 h-3" /> Shard Shop
                      </button>
                    </div>
                  )}
                </div>

                {/* ACTION FOOTER */}
                <div className="pt-3 border-t border-white/10 flex items-center justify-between gap-2">
                  <RpgButton variant="slate" size="md" onClick={onClose}>
                    Close
                  </RpgButton>

                  {curLevel >= MAX_CONSTELLATION_LEVEL ? (
                    <span className="px-4 py-2 rounded-xl bg-gradient-to-r from-amber-400/25 via-fuchsia-500/25 to-cyan-400/25 border border-amber-300/75 text-amber-200 font-display font-black text-xs uppercase tracking-wider flex items-center gap-1.5">
                      <Crown className="w-4 h-4 text-amber-300" /> ★ C6 CONSTELLATION MAXED
                    </span>
                  ) : isSelectedUnlocked ? (
                    <RpgButton
                      variant="cyan"
                      size="md"
                      onClick={() => {
                        audioManager.playSfx('button');
                        setSelectedIdx(curLevel + 1);
                      }}
                      className="font-display font-black uppercase tracking-wider"
                    >
                      Jump to Next Star (C{curLevel + 1}) →
                    </RpgButton>
                  ) : isSelectedFuture ? (
                    <span className="px-3.5 py-2 rounded-xl bg-slate-900 border border-slate-700 text-slate-400 font-display font-bold text-xs uppercase flex items-center gap-1.5">
                      <Lock className="w-3.5 h-3.5" /> Ignite C{selectedNode.index - 1} First
                    </span>
                  ) : (
                    <RpgButton
                      variant="gold"
                      size="md"
                      disabled={!canIgniteSelected}
                      onClick={handleIgnite}
                      className="font-display font-black uppercase tracking-wider px-5"
                    >
                      <Sparkles className="w-4 h-4" /> Ignite {selectedNode.code} Star
                    </RpgButton>
                  )}
                </div>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
