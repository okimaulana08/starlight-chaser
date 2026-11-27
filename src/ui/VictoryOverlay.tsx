import React, { useEffect, useMemo, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import gsap from 'gsap';
import {
  Crown,
  Heart,
  RotateCcw,
  Skull,
  Sparkles,
  Star,
  ChevronRight,
} from 'lucide-react';
import {
  EQUIPMENT_SETS,
  RARITY_COLORS,
  formatStatValue,
  getEnhancedMainStatValue,
} from '../data/equipment';
import { HERO_MAP } from '../data/heroes';
import { MATERIAL_META, factionToEssenceKey } from '../data/materials';
import { RELIC_MAP } from '../data/relics';
import { audioManager } from '../engine/AudioManager';
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

interface VictoryOverlayProps {
  result: CombatLootSummary;
  heroesSnapshot: HeroCombatSnapshot[];
  nextStageCode?: string;
  onNextStage?: () => void;
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
  onReplay,
  onExit,
}) => {
  const [selectedGear, setSelectedGear] = useState<EquipmentInstance | null>(
    result.droppedEquipment[0] ?? null,
  );
  const [selectedRelic, setSelectedRelic] = useState<DroppedRelicSummary | null>(
    result.droppedRelics?.[0] ?? null,
  );

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

      {/* Rotating Sunburst Light Rays on Victory */}
      {result.victory && (
        <div
          className="pointer-events-none absolute -left-24 top-1/2 -translate-y-1/2 w-[900px] h-[900px] opacity-20 animate-spin"
          style={{
            animationDuration: '38s',
            background:
              'repeating-conic-gradient(from 0deg, rgba(253,224,71,0.55) 0deg 8deg, transparent 8deg 24deg)',
          }}
        />
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

          {result.isFirstClear && result.victory && (
            <div className="px-3 py-1 rounded-lg bg-gradient-to-r from-amber-400/25 to-cyan-400/25 border border-amber-300 text-amber-200 text-[10px] sm:text-xs font-black uppercase tracking-[0.18em] shrink-0">
              ★ FIRST CLEAR BONUS!
            </div>
          )}
        </div>

        {/* 2. DEDICATED SCROLLABLE MIDDLE STAGE (Never Collides With Bottom Action Buttons!) */}
        <div className="ls-victory-body flex-1 min-h-0 overflow-y-auto px-4 sm:px-6 py-3 sm:py-4">
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
                  return (
                    <motion.div
                      key={entry.heroId}
                      initial={{ opacity: 0, x: 18 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ duration: 0.35, delay: 0.1 + idx * 0.07 }}
                      className="rpg-ornate-card flex items-center gap-2.5 px-2.5 py-2 backdrop-blur-sm overflow-hidden"
                      style={{
                        borderColor: idx === 0 ? 'rgba(253,224,71,0.65)' : `${h.themeColor}55`,
                        borderLeft: `3px solid ${accent}`,
                      }}
                    >
                      <CornerFiligree color={accent} size={6} opacity={0.45} />
                      <div className="relative w-10 h-10 shrink-0 rounded-lg overflow-hidden border border-white/25 shadow-md">
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
                        <div className="flex items-center justify-between text-xs mb-1">
                          <span className="font-bold text-white truncate">{h.name}</span>
                          <AnimatedNumber
                            value={entry.dmg}
                            startFromZero
                            duration={0.85}
                            className="text-sm font-bold text-amber-300"
                          />
                        </div>
                        <RpgProgressBar
                          value={entry.dmg}
                          max={maxDmg}
                          animateFromZero
                          delay={0.18 + idx * 0.08}
                          heightClass="h-2.5"
                          gradient={
                            idx === 0
                              ? 'linear-gradient(90deg, #f59e0b 0%, #fde047 65%, #fffbeb 100%)'
                              : `linear-gradient(90deg, ${h.themeColor}cc 0%, #fde047 100%)`
                          }
                          glowColor={idx === 0 ? 'rgba(253,224,71,0.65)' : `${h.themeColor}55`}
                        />
                        {entry.heal > 0 && (
                          <div className="text-[10px] font-mono font-bold text-emerald-400 mt-1 flex items-center gap-1">
                            <Heart className="w-2.5 h-2.5" /> Heal {entry.heal.toLocaleString()}
                          </div>
                        )}
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
                    {
                      label: 'Crystals',
                      val: `+${result.crystalsEarned}`,
                      color: '#38e8ff',
                      icon: <GameIcon name="crystal" className="w-7 h-7" />,
                    },
                    {
                      label: 'EXP',
                      val: `×${result.expPotionsEarned}`,
                      color: '#34d399',
                      icon: <MaterialIcon material="expPotions" className="w-7 h-7" />,
                    },
                    {
                      label: 'Stones',
                      val: `×${result.forgeStonesEarned}`,
                      color: '#a78bfa',
                      icon: <MaterialIcon material="forgeStones" className="w-7 h-7" />,
                    },
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
        </div>

        {/* 3. PINNED BOTTOM HEROIC ACTION BAR (Zero Overlap Guaranteed!) */}
        <div className="ls-victory-footer shrink-0 flex flex-wrap items-center justify-end gap-2 sm:gap-3 px-4 sm:px-6 py-2.5 sm:py-3.5 bg-slate-950/90 backdrop-blur-md border-t border-amber-400/25 safe-bottom">
          <button
            onClick={() => {
              audioManager.playSfx('button');
              onReplay();
            }}
            className="rpg-blade px-4 sm:px-5 py-2 sm:py-2.5 text-white font-display font-extrabold text-xs sm:text-sm uppercase tracking-[0.14em] flex items-center gap-1.5"
          >
            <RotateCcw className="w-4 h-4 text-cyan-300" /> Replay
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
                Lobby
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
              Continue <ChevronRight className="w-4 h-4 sm:w-5 sm:h-5" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
