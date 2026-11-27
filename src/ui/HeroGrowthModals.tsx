import React, { useEffect, useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import {
  ArrowRight,
  CheckCircle2,
  Lock,
  ShoppingBag,
  Sparkles,
  Star,
  Swords,
  TrendingUp,
  X,
} from 'lucide-react';
import { FACTIONS } from '../data/factions';
import {
  MATERIAL_META,
  factionToEssenceKey,
  getAwakeningCost,
  getExpToNextLevel,
  getHeroLevelCap,
  getLevelUpCost,
  type ShopCategory,
} from '../data/materials';
import { audioManager } from '../engine/AudioManager';
import { computeHeroStats } from '../engine/CombatMath';
import { usePlayerStore } from '../store/usePlayerStore';
import type { DungeonId, Faction, HeroDef, OwnedHeroState } from '../types/game';
import { ArtImage } from './ArtImage';
import { GameIcon, MaterialIcon } from './GameIcon';
import { CornerFiligree, RpgButton } from './RpgKit';
import { RarityCrest, RoleBadge } from './RoleBadge';

interface RequirementCardProps {
  icon: React.ReactNode;
  label: string;
  sublabel?: string;
  owned: number;
  required: number;
  accentColor: string;
  formatNumbers?: boolean;
}

const RequirementCard: React.FC<RequirementCardProps> = ({
  icon,
  label,
  sublabel,
  owned,
  required,
  accentColor,
  formatNumbers = false,
}) => {
  const met = owned >= required;
  return (
    <div
      className={`relative rounded-2xl p-3 border-2 flex flex-col items-center text-center gap-1.5 transition overflow-hidden ${
        met
          ? 'bg-emerald-950/25 border-emerald-400/55 shadow-[0_0_16px_rgba(52,211,153,0.16)]'
          : 'bg-rose-950/25 border-rose-500/50 shadow-[0_0_14px_rgba(244,63,94,0.14)]'
      }`}
    >
      <div
        className="w-12 h-12 rounded-xl border flex items-center justify-center shrink-0"
        style={{
          borderColor: `${accentColor}88`,
          background: `radial-gradient(circle, ${accentColor}28 0%, rgba(7,10,24,0.95) 78%)`,
        }}
      >
        {icon}
      </div>
      <div className="text-[11px] font-display font-bold text-white leading-tight truncate max-w-full">
        {label}
      </div>
      <div
        className={`font-mono text-sm font-black tracking-tight ${
          met ? 'text-emerald-400' : 'text-rose-400'
        }`}
      >
        {formatNumbers ? owned.toLocaleString() : owned} /{' '}
        {formatNumbers ? required.toLocaleString() : required}
      </div>
      {sublabel && (
        <div className="text-[9px] text-slate-400 leading-tight line-clamp-1">{sublabel}</div>
      )}
    </div>
  );
};

interface AwakenModalProps {
  open: boolean;
  hero: HeroDef;
  owned: OwnedHeroState;
  onClose: () => void;
  onAwakened: (nextStar: number, message: string) => void;
  onOpenShop: (tab: ShopCategory) => void;
  onOpenDungeon?: (dungeonId: DungeonId, faction?: Faction) => void;
}

export const AwakenModal: React.FC<AwakenModalProps> = ({
  open,
  hero,
  owned,
  onClose,
  onAwakened,
  onOpenShop,
  onOpenDungeon,
}) => {
  const {
    gold,
    starCores,
    factionEssences,
    squadIds,
    equipmentInventory,
    unlockedCodexIds,
    relicRanks,
    awakenHero,
  } = usePlayerStore();

  const cost = getAwakeningCost(owned.awakening, hero.tier);
  const essenceKey = factionToEssenceKey(hero.faction);
  const essenceMeta = MATERIAL_META[essenceKey];
  const ownedEssence = factionEssences[hero.faction] ?? 0;

  const [mode, setMode] = useState<'MATERIALS' | 'SHARDS'>('MATERIALS');

  useEffect(() => {
    if (!open || !cost) return;
    if (owned.shards >= cost.shardAltCost && gold >= cost.shardAltGold) {
      setMode('SHARDS');
    } else {
      setMode('MATERIALS');
    }
  }, [open, hero.id, owned.awakening]); // eslint-disable-line react-hooks/exhaustive-deps

  const currentStats = useMemo(
    () =>
      computeHeroStats(
        hero,
        owned,
        equipmentInventory,
        squadIds,
        unlockedCodexIds.length,
        relicRanks,
      ),
    [hero, owned, equipmentInventory, squadIds, unlockedCodexIds.length, relicRanks],
  );

  const nextStats = useMemo(() => {
    if (!cost) return currentStats;
    return computeHeroStats(
      hero,
      { ...owned, awakening: owned.awakening + 1 },
      equipmentInventory,
      squadIds,
      unlockedCodexIds.length,
      relicRanks,
    );
  }, [hero, owned, cost, currentStats, equipmentInventory, squadIds, unlockedCodexIds.length, relicRanks]);

  const matsMet = Boolean(
    cost &&
      ownedEssence >= cost.essences &&
      starCores >= cost.starCores &&
      gold >= cost.gold,
  );
  const shardsMet = Boolean(
    cost && owned.shards >= cost.shardAltCost && gold >= cost.shardAltGold,
  );
  const canAwakenNow = Boolean(cost && (mode === 'MATERIALS' ? matsMet : shardsMet));

  const handleConfirm = () => {
    if (!cost || !canAwakenNow) return;
    const res = awakenHero(hero.id, mode);
    if (res.ok) {
      audioManager.playSfx('ssr_reveal');
      onAwakened(cost.nextStar, res.message ?? `Awakened ★${cost.nextStar}!`);
      onClose();
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
          className="fixed inset-0 z-50 bg-[#030510]/80 backdrop-blur-md flex items-center justify-center p-3 sm:p-4 select-none"
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.92, y: 16 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.94, y: 10 }}
            transition={{ type: 'spring', stiffness: 360, damping: 28 }}
            onClick={(e) => e.stopPropagation()}
            className="relative rpg-panel w-full max-w-lg overflow-hidden border-fuchsia-400/55 shadow-[0_24px_64px_rgba(0,0,0,0.9)]"
          >
            <CornerFiligree color="#e879f9" size={11} opacity={0.8} />

            {/* Header */}
            <div className="px-4 sm:px-5 pt-4 pb-3 border-b border-fuchsia-400/25 bg-slate-950/70 flex items-center justify-between gap-2">
              <div className="flex items-center gap-3 min-w-0">
                <div
                  className="w-12 h-14 rounded-xl overflow-hidden border-2 shrink-0 bg-slate-900"
                  style={{ borderColor: hero.themeColor }}
                >
                  <ArtImage
                    kind="HERO"
                    id={hero.id}
                    src={hero.assets.card}
                    alt={hero.name}
                    className="w-full h-full object-cover object-top"
                  />
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5">
                    <RarityCrest tier={hero.tier} size="xs" />
                    <RoleBadge role={hero.role} variant="medallion" size="sm" />
                    <span className="text-[10px] font-display font-black uppercase tracking-[0.18em] text-fuchsia-300">
                      Hero Awakening
                    </span>
                  </div>
                  <h3 className="font-display text-lg sm:text-xl font-black text-white truncate">
                    {hero.name}
                  </h3>
                  <div className="flex items-center gap-1 mt-0.5">
                    {Array.from({ length: 6 }, (_, i) => (
                      <Star
                        key={i}
                        className={`w-3.5 h-3.5 ${
                          i < owned.awakening
                            ? 'text-fuchsia-400 fill-fuchsia-400'
                            : cost && i === owned.awakening
                              ? 'text-amber-300 animate-pulse'
                              : 'text-slate-700'
                        }`}
                      />
                    ))}
                    {cost && (
                      <span className="ml-1.5 text-xs font-mono font-black text-amber-300">
                        ★{owned.awakening} → ★{cost.nextStar}
                      </span>
                    )}
                  </div>
                </div>
              </div>
              <button
                onClick={() => {
                  audioManager.playSfx('button');
                  onClose();
                }}
                className="p-2 rounded-xl bg-slate-900/90 border border-slate-700 text-slate-300 hover:text-amber-300 transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {!cost ? (
              <div className="p-6 text-center space-y-3">
                <CheckCircle2 className="w-12 h-12 mx-auto text-emerald-400" />
                <div className="font-display text-xl font-black text-amber-300">
                  MAXIMUM AWAKENING ★6 REACHED!
                </div>
                <p className="text-xs text-slate-300">
                  {hero.name} has unlocked full celestial potential (Max Lv.80, +60% Base Stats, +10% Skill DMG & +15% Ultimate DMG).
                </p>
                <RpgButton variant="slate" size="md" onClick={onClose}>
                  Close
                </RpgButton>
              </div>
            ) : (
              <div className="p-4 sm:p-5 space-y-4">
                {/* Stat Preview Before -> After */}
                <div className="rounded-2xl bg-slate-950/80 border border-fuchsia-400/25 p-3 space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-display font-bold uppercase tracking-wider text-slate-400">
                      Max Level Cap
                    </span>
                    <span className="font-mono font-black text-white flex items-center gap-1.5">
                      Lv.{getHeroLevelCap(owned.awakening)}
                      <ArrowRight className="w-3.5 h-3.5 text-fuchsia-400" />
                      <span className="text-emerald-300">Lv.{cost.nextLevelCap}</span>
                    </span>
                  </div>
                  <div className="grid grid-cols-3 gap-2 text-center pt-1.5 border-t border-white/10">
                    <div>
                      <div className="text-[9px] uppercase text-slate-400 font-bold">HP</div>
                      <div className="font-mono text-xs font-bold text-slate-300">
                        {currentStats.maxHp.toLocaleString()}
                      </div>
                      <div className="font-mono text-xs font-black text-emerald-400">
                        → {nextStats.maxHp.toLocaleString()}
                      </div>
                    </div>
                    <div>
                      <div className="text-[9px] uppercase text-slate-400 font-bold">ATK</div>
                      <div className="font-mono text-xs font-bold text-slate-300">
                        {currentStats.atk.toLocaleString()}
                      </div>
                      <div className="font-mono text-xs font-black text-amber-300">
                        → {nextStats.atk.toLocaleString()}
                      </div>
                    </div>
                    <div>
                      <div className="text-[9px] uppercase text-slate-400 font-bold">DEF</div>
                      <div className="font-mono text-xs font-bold text-slate-300">
                        {currentStats.def.toLocaleString()}
                      </div>
                      <div className="font-mono text-xs font-black text-sky-300">
                        → {nextStats.def.toLocaleString()}
                      </div>
                    </div>
                  </div>
                  {cost.milestoneUnlock && (
                    <div className="mt-1 px-2.5 py-1.5 rounded-xl bg-gradient-to-r from-amber-500/20 to-fuchsia-500/20 border border-amber-300/50 text-center text-[11px] font-display font-black text-amber-200">
                      ★ MILESTONE UNLOCK: {cost.milestoneUnlock}
                    </div>
                  )}
                </div>

                {/* Method Toggle (Biome Materials vs Hero Shards) */}
                <div className="grid grid-cols-2 gap-1.5 p-1 rounded-xl bg-slate-950/90 border border-slate-800">
                  <button
                    onClick={() => {
                      setMode('MATERIALS');
                      audioManager.playSfx('button');
                    }}
                    className={`py-1.5 rounded-lg text-[11px] font-display font-black uppercase tracking-wider transition ${
                      mode === 'MATERIALS'
                        ? 'bg-fuchsia-500/25 border border-fuchsia-400 text-fuchsia-200'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    Biome Materials
                  </button>
                  <button
                    onClick={() => {
                      setMode('SHARDS');
                      audioManager.playSfx('button');
                    }}
                    className={`py-1.5 rounded-lg text-[11px] font-display font-black uppercase tracking-wider transition ${
                      mode === 'SHARDS'
                        ? 'bg-cyan-500/25 border border-cyan-400 text-cyan-200'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    Hero Shards ({owned.shards}/{cost.shardAltCost})
                  </button>
                </div>

                {/* Required Materials Grid with Green/Red Ratios */}
                <div>
                  <div className="text-[10px] font-display font-black uppercase tracking-[0.2em] text-slate-400 mb-2">
                    Required Materials
                  </div>
                  {mode === 'MATERIALS' ? (
                    <div className="grid grid-cols-3 gap-2.5">
                      <RequirementCard
                        icon={<MaterialIcon material={essenceKey} className="w-9 h-9" />}
                        label={essenceMeta.name}
                        sublabel={FACTIONS[hero.faction].name.split(' ')[0]}
                        owned={ownedEssence}
                        required={cost.essences}
                        accentColor={essenceMeta.color}
                      />
                      <RequirementCard
                        icon={<MaterialIcon material="starCores" className="w-9 h-9" />}
                        label="Starlight Core"
                        sublabel="Mini-Boss / Boss"
                        owned={starCores}
                        required={cost.starCores}
                        accentColor="#e879f9"
                      />
                      <RequirementCard
                        icon={<GameIcon name="gold" className="w-9 h-9" />}
                        label="Gold"
                        sublabel="Campaign & Shop"
                        owned={gold}
                        required={cost.gold}
                        accentColor="#f5c84c"
                        formatNumbers
                      />
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 gap-2.5">
                      <RequirementCard
                        icon={
                          <div className="w-9 h-9 rounded-lg overflow-hidden border border-cyan-300/70">
                            <ArtImage
                              kind="HERO"
                              id={hero.id}
                              src={hero.assets.card}
                              alt={hero.name}
                              className="w-full h-full object-cover object-top"
                            />
                          </div>
                        }
                        label={`${hero.name} Shards`}
                        sublabel="Summon Dupes / Shop"
                        owned={owned.shards}
                        required={cost.shardAltCost}
                        accentColor="#38e8ff"
                      />
                      <RequirementCard
                        icon={<GameIcon name="gold" className="w-9 h-9" />}
                        label="Gold"
                        sublabel="50% Gold Discount"
                        owned={gold}
                        required={cost.shardAltGold}
                        accentColor="#f5c84c"
                        formatNumbers
                      />
                    </div>
                  )}
                </div>

                {/* Dungeon & Shop Shortcut when Missing Materials */}
                {!canAwakenNow && (
                  <div className="flex flex-wrap items-center justify-between gap-2 px-3 py-2 rounded-xl bg-amber-950/35 border border-amber-400/35 text-[11px]">
                    <span className="text-amber-200/90">
                      Missing materials? Farm {essenceMeta.shortName} in Sanctum Dungeon or visit Shop.
                    </span>
                    <div className="flex items-center gap-1.5 shrink-0">
                      {onOpenDungeon && (
                        <button
                          onClick={() => {
                            audioManager.playSfx('button');
                            onClose();
                            onOpenDungeon('AWAKEN_SANCTUM', hero.faction);
                          }}
                          className="px-2.5 py-1 rounded-lg bg-fuchsia-500/20 border border-fuchsia-400/60 text-fuchsia-200 font-display font-black uppercase text-[10px] flex items-center gap-1 hover:bg-fuchsia-500/30 transition"
                        >
                          <Swords className="w-3 h-3" /> Dungeon
                        </button>
                      )}
                      <button
                        onClick={() => {
                          audioManager.playSfx('button');
                          onClose();
                          onOpenShop('AWAKEN');
                        }}
                        className="px-2.5 py-1 rounded-lg bg-amber-400/20 border border-amber-300/60 text-amber-200 font-display font-black uppercase text-[10px] flex items-center gap-1 hover:bg-amber-400/30 transition"
                      >
                        <ShoppingBag className="w-3 h-3" /> Shop
                      </button>
                    </div>
                  </div>
                )}

                {/* Footer CTA */}
                <div className="flex items-center justify-end gap-2 pt-2 border-t border-white/10">
                  <RpgButton variant="slate" size="md" onClick={onClose}>
                    Cancel
                  </RpgButton>
                  <RpgButton
                    variant="violet"
                    size="md"
                    disabled={!canAwakenNow}
                    onClick={handleConfirm}
                    className="font-display font-black uppercase tracking-wider px-5"
                  >
                    <Sparkles className="w-4 h-4" /> Awaken Now
                  </RpgButton>
                </div>
              </div>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

interface LevelUpModalProps {
  open: boolean;
  hero: HeroDef;
  owned: OwnedHeroState;
  onClose: () => void;
  onLeveledUp: (newLevel: number, message: string) => void;
  onSwitchToAwaken: () => void;
  onOpenShop: (tab: ShopCategory) => void;
  onOpenDungeon?: (dungeonId: DungeonId, faction?: Faction) => void;
}

export const LevelUpModal: React.FC<LevelUpModalProps> = ({
  open,
  hero,
  owned,
  onClose,
  onLeveledUp,
  onSwitchToAwaken,
  onOpenShop,
  onOpenDungeon,
}) => {
  const {
    gold,
    expPotions,
    squadIds,
    equipmentInventory,
    unlockedCodexIds,
    relicRanks,
    levelUpHero,
  } = usePlayerStore();

  const [step, setStep] = useState<1 | 5 | 'MAX'>(1);

  const levelCap = getHeroLevelCap(owned.awakening);
  const remainingToCap = Math.max(0, levelCap - owned.level);
  const requestedLevels = step === 'MAX' ? Math.max(1, remainingToCap) : step;
  const cost = getLevelUpCost(owned.level, requestedLevels, owned.awakening);

  const currentStats = useMemo(
    () =>
      computeHeroStats(
        hero,
        owned,
        equipmentInventory,
        squadIds,
        unlockedCodexIds.length,
        relicRanks,
      ),
    [hero, owned, equipmentInventory, squadIds, unlockedCodexIds.length, relicRanks],
  );

  const previewTargetLevel = owned.level + cost.actualLevels;
  const nextStats = useMemo(() => {
    if (cost.actualLevels <= 0) return currentStats;
    return computeHeroStats(
      hero,
      { ...owned, level: previewTargetLevel },
      equipmentInventory,
      squadIds,
      unlockedCodexIds.length,
      relicRanks,
    );
  }, [
    hero,
    owned,
    cost.actualLevels,
    previewTargetLevel,
    currentStats,
    equipmentInventory,
    squadIds,
    unlockedCodexIds.length,
    relicRanks,
  ]);

  const atAbsoluteMax = owned.level >= 80;
  const canLevelNow =
    !atAbsoluteMax &&
    !cost.atAwakenCap &&
    cost.actualLevels > 0 &&
    expPotions >= cost.potions &&
    gold >= cost.gold;

  const handleConfirm = () => {
    if (!canLevelNow) return;
    const res = levelUpHero(hero.id, cost.actualLevels);
    if (res.ok) {
      audioManager.playSfx('forge');
      onLeveledUp(previewTargetLevel, res.message ?? `Level ${previewTargetLevel}!`);
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
          className="fixed inset-0 z-50 bg-[#030510]/80 backdrop-blur-md flex items-center justify-center p-3 sm:p-4 select-none"
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.92, y: 16 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.94, y: 10 }}
            transition={{ type: 'spring', stiffness: 360, damping: 28 }}
            onClick={(e) => e.stopPropagation()}
            className="relative rpg-panel w-full max-w-lg overflow-hidden border-emerald-400/55 shadow-[0_24px_64px_rgba(0,0,0,0.9)]"
          >
            <CornerFiligree color="#34d399" size={11} opacity={0.8} />

            {/* Header */}
            <div className="px-4 sm:px-5 pt-4 pb-3 border-b border-emerald-400/25 bg-slate-950/70 flex items-center justify-between gap-2">
              <div className="flex items-center gap-3 min-w-0">
                <div
                  className="w-12 h-14 rounded-xl overflow-hidden border-2 shrink-0 bg-slate-900"
                  style={{ borderColor: hero.themeColor }}
                >
                  <ArtImage
                    kind="HERO"
                    id={hero.id}
                    src={hero.assets.card}
                    alt={hero.name}
                    className="w-full h-full object-cover object-top"
                  />
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5">
                    <RarityCrest tier={hero.tier} size="xs" />
                    <span className="text-[10px] font-display font-black uppercase tracking-[0.18em] text-emerald-300">
                      Hero Level Up
                    </span>
                  </div>
                  <h3 className="font-display text-lg sm:text-xl font-black text-white truncate">
                    {hero.name}
                  </h3>
                  <div className="text-xs font-mono font-black text-cyan-300 flex items-center gap-1.5">
                    <span>Lv.{owned.level}</span>
                    {!atAbsoluteMax && !cost.atAwakenCap && (
                      <>
                        <ArrowRight className="w-3.5 h-3.5 text-emerald-400" />
                        <span className="text-emerald-300">Lv.{previewTargetLevel}</span>
                      </>
                    )}
                    <span className="text-slate-400 font-normal">(Cap Lv.{levelCap})</span>
                  </div>
                  {!atAbsoluteMax && (
                    <div className="text-[10px] font-mono text-amber-200/85 mt-0.5">
                      Battle EXP: {(owned.exp ?? 0).toLocaleString()} /{' '}
                      {getExpToNextLevel(owned.level).toLocaleString()}
                    </div>
                  )}
                </div>
              </div>
              <button
                onClick={() => {
                  audioManager.playSfx('button');
                  onClose();
                }}
                className="p-2 rounded-xl bg-slate-900/90 border border-slate-700 text-slate-300 hover:text-amber-300 transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {atAbsoluteMax ? (
              <div className="p-6 text-center space-y-3">
                <CheckCircle2 className="w-12 h-12 mx-auto text-emerald-400" />
                <div className="font-display text-xl font-black text-emerald-300">
                  MAXIMUM LEVEL 80 REACHED!
                </div>
                <RpgButton variant="slate" size="md" onClick={onClose}>
                  Close
                </RpgButton>
              </div>
            ) : cost.atAwakenCap ? (
              <div className="p-5 text-center space-y-4">
                <div className="w-14 h-14 mx-auto rounded-2xl bg-fuchsia-500/15 border border-fuchsia-400/50 flex items-center justify-center">
                  <Lock className="w-7 h-7 text-fuchsia-300" />
                </div>
                <div>
                  <div className="font-display text-lg font-black text-amber-300">
                    AWAKENING CAP REACHED (Lv.{levelCap})
                  </div>
                  <p className="text-xs text-slate-300 mt-1 leading-relaxed">
                    Awaken <strong className="text-white">{hero.name}</strong> to{' '}
                    <strong className="text-fuchsia-300">★{owned.awakening + 1}</strong> to unlock
                    up to <strong className="text-emerald-300">Lv.{levelCap + 10}</strong> and gain
                    +10% Base Stats!
                  </p>
                </div>
                <div className="flex items-center justify-center gap-2">
                  <RpgButton variant="slate" size="md" onClick={onClose}>
                    Close
                  </RpgButton>
                  <RpgButton
                    variant="violet"
                    size="md"
                    onClick={() => {
                      audioManager.playSfx('button');
                      onClose();
                      onSwitchToAwaken();
                    }}
                    className="font-display font-black uppercase tracking-wider"
                  >
                    <Sparkles className="w-4 h-4" /> Awaken ★{owned.awakening + 1} →
                  </RpgButton>
                </div>
              </div>
            ) : (
              <div className="p-4 sm:p-5 space-y-4">
                {/* Level Increment Selector */}
                <div className="grid grid-cols-3 gap-1.5 p-1 rounded-xl bg-slate-950/90 border border-slate-800">
                  {([1, 5, 'MAX'] as const).map((opt) => {
                    const active = step === opt;
                    const label =
                      opt === 'MAX' ? `Max (+${remainingToCap})` : `+${opt} Lv`;
                    return (
                      <button
                        key={String(opt)}
                        onClick={() => {
                          setStep(opt);
                          audioManager.playSfx('button');
                        }}
                        className={`py-1.5 rounded-lg text-[11px] font-display font-black uppercase tracking-wider transition ${
                          active
                            ? 'bg-emerald-500/25 border border-emerald-400 text-emerald-200'
                            : 'text-slate-400 hover:text-white'
                        }`}
                      >
                        {label}
                      </button>
                    );
                  })}
                </div>

                {/* Before -> After Stat Preview */}
                <div className="rounded-2xl bg-slate-950/80 border border-emerald-400/25 p-3 grid grid-cols-4 gap-2 text-center">
                  <div>
                    <div className="text-[9px] uppercase text-slate-400 font-bold">HP</div>
                    <div className="font-mono text-[11px] text-slate-400">
                      {currentStats.maxHp.toLocaleString()}
                    </div>
                    <div className="font-mono text-xs font-black text-emerald-400">
                      → {nextStats.maxHp.toLocaleString()}
                    </div>
                  </div>
                  <div>
                    <div className="text-[9px] uppercase text-slate-400 font-bold">ATK</div>
                    <div className="font-mono text-[11px] text-slate-400">
                      {currentStats.atk.toLocaleString()}
                    </div>
                    <div className="font-mono text-xs font-black text-amber-300">
                      → {nextStats.atk.toLocaleString()}
                    </div>
                  </div>
                  <div>
                    <div className="text-[9px] uppercase text-slate-400 font-bold">DEF</div>
                    <div className="font-mono text-[11px] text-slate-400">
                      {currentStats.def.toLocaleString()}
                    </div>
                    <div className="font-mono text-xs font-black text-sky-300">
                      → {nextStats.def.toLocaleString()}
                    </div>
                  </div>
                  <div>
                    <div className="text-[9px] uppercase text-slate-400 font-bold">PWR</div>
                    <div className="font-mono text-[11px] text-slate-400">
                      {currentStats.powerRating.toLocaleString()}
                    </div>
                    <div className="font-mono text-xs font-black text-cyan-300">
                      → {nextStats.powerRating.toLocaleString()}
                    </div>
                  </div>
                </div>

                {/* Required Materials Grid with Green/Red Ratios */}
                <div>
                  <div className="text-[10px] font-display font-black uppercase tracking-[0.2em] text-slate-400 mb-2">
                    Required Items (+{cost.actualLevels} Lv)
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <RequirementCard
                      icon={<MaterialIcon material="expPotions" className="w-9 h-9" />}
                      label="Starlight EXP Elixir"
                      sublabel="Campaign Drops & Shop"
                      owned={expPotions}
                      required={cost.potions}
                      accentColor="#34d399"
                    />
                    <RequirementCard
                      icon={<GameIcon name="gold" className="w-9 h-9" />}
                      label="Gold"
                      sublabel="Campaign Drops & Shop"
                      owned={gold}
                      required={cost.gold}
                      accentColor="#f5c84c"
                      formatNumbers
                    />
                  </div>
                </div>

                {!canLevelNow && (
                  <div className="flex flex-wrap items-center justify-between gap-2 px-3 py-2 rounded-xl bg-amber-950/35 border border-amber-400/35 text-[11px]">
                    <span className="text-amber-200/90">
                      Need more EXP Elixirs or Gold? Raid Rift Dungeons or visit Shop!
                    </span>
                    <div className="flex items-center gap-1.5 shrink-0">
                      {onOpenDungeon && (
                        <button
                          onClick={() => {
                            audioManager.playSfx('button');
                            onClose();
                            onOpenDungeon(expPotions < cost.potions ? 'EXP_CRUCIBLE' : 'GOLD_VAULT');
                          }}
                          className="px-2.5 py-1 rounded-lg bg-emerald-500/20 border border-emerald-400/60 text-emerald-200 font-display font-black uppercase text-[10px] flex items-center gap-1 hover:bg-emerald-500/30 transition"
                        >
                          <Swords className="w-3 h-3" /> Dungeon
                        </button>
                      )}
                      <button
                        onClick={() => {
                          audioManager.playSfx('button');
                          onClose();
                          onOpenShop('GROWTH');
                        }}
                        className="px-2.5 py-1 rounded-lg bg-amber-400/20 border border-amber-300/60 text-amber-200 font-display font-black uppercase text-[10px] flex items-center gap-1 hover:bg-amber-400/30 transition"
                      >
                        <ShoppingBag className="w-3 h-3" /> Shop
                      </button>
                    </div>
                  </div>
                )}

                {/* Footer CTA */}
                <div className="flex items-center justify-end gap-2 pt-2 border-t border-white/10">
                  <RpgButton variant="slate" size="md" onClick={onClose}>
                    Close
                  </RpgButton>
                  <RpgButton
                    variant="emerald"
                    size="md"
                    disabled={!canLevelNow}
                    onClick={handleConfirm}
                    className="font-display font-black uppercase tracking-wider px-5"
                  >
                    <TrendingUp className="w-4 h-4" /> Level Up Now
                  </RpgButton>
                </div>
              </div>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
