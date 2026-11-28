import React, { useEffect, useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import {
  ArrowRight,
  CheckCircle2,
  Crown,
  Lock,
  ShoppingBag,
  Sparkles,
  Star,
  Swords,
  TrendingUp,
  X,
} from 'lucide-react';
import { FACTIONS } from '../data/factions';
import { resolveHeroVisuals } from '../data/heroes';
import {
  MATERIAL_META,
  factionToEssenceKey,
  getAwakeningCost,
  getExpToNextLevel,
  getHeroLevelCap,
  getLevelUpCost,
  getTranscendenceCost,
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
  onSwitchToTranscend?: () => void;
  onOpenShop: (tab: ShopCategory) => void;
  onOpenDungeon?: (dungeonId: DungeonId, faction?: Faction) => void;
}

export const AwakenModal: React.FC<AwakenModalProps> = ({
  open,
  hero,
  owned,
  onClose,
  onAwakened,
  onSwitchToTranscend,
  onOpenShop,
  onOpenDungeon,
}) => {
  const {
    gold,
    starCores,
    factionEssences,
    squadIds,
    roster,
    activePetId,
    ownedPets,
    equipmentInventory,
    unlockedCodexIds,
    relicRanks,
    awakenHero,
  } = usePlayerStore();

  const cost = getAwakeningCost(owned.awakening, hero.tier);
  const visuals = resolveHeroVisuals(hero, owned);
  const essenceKey = factionToEssenceKey(hero.faction);
  const essenceMeta = MATERIAL_META[essenceKey];
  const ownedEssence = factionEssences[hero.faction] ?? 0;
  const activeOwnedPet = activePetId && ownedPets?.[activePetId] ? ownedPets[activePetId] : null;

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

  const nextStats = useMemo(() => {
    if (!cost) return currentStats;
    return computeHeroStats(
      hero,
      { ...owned, awakening: owned.awakening + 1 },
      equipmentInventory,
      squadIds,
      unlockedCodexIds.length,
      relicRanks,
      { roster, activePet: activeOwnedPet },
    );
  }, [hero, owned, cost, currentStats, equipmentInventory, squadIds, unlockedCodexIds.length, relicRanks, roster, activeOwnedPet]);

  const matsMet = Boolean(
    cost &&
      ownedEssence >= cost.essences &&
      starCores >= cost.starCores &&
      gold >= cost.gold,
  );
  const canAwakenNow = Boolean(cost && matsMet);

  const handleConfirm = () => {
    if (!cost || !canAwakenNow) return;
    const res = awakenHero(hero.id);
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
                      src={visuals.card}
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
                {hero.transcendence?.enabled && !owned.transcended && onSwitchToTranscend && (
                  <div className="p-3 rounded-xl bg-gradient-to-r from-amber-500/20 via-fuchsia-500/20 to-cyan-500/20 border border-amber-300/65 text-xs text-amber-100 space-y-2">
                    <div className="font-display font-black uppercase tracking-wider text-amber-200">
                      ❖ TRANSCENDENCE UNLOCKED! ❖
                    </div>
                    <div>
                      Evolve {hero.name} into <strong>{hero.transcendence.formTitle}</strong> for upgraded visuals & Max Lv.100!
                    </div>
                    <RpgButton
                      variant="gold"
                      size="md"
                      onClick={() => {
                        audioManager.playSfx('ssr_reveal');
                        onClose();
                        onSwitchToTranscend();
                      }}
                      className="font-display font-black uppercase tracking-wider"
                    >
                      <Crown className="w-4 h-4" /> Open Transcendence Ritual →
                    </RpgButton>
                  </div>
                )}
                {hero.tier === 'SSR' && !hero.transcendence?.enabled && (
                  <div className="px-3 py-2 rounded-xl bg-slate-900/80 border border-amber-400/35 text-[11px] text-amber-200/90">
                    ❖ SSR Hero Transcendence coming in a future update (UR Sovereign Transcendence is live now!).
                  </div>
                )}
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

                {/* Required Materials Grid with Green/Red Ratios (Pure Material Farming!) */}
                <div>
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <span className="text-[10px] font-display font-black uppercase tracking-[0.2em] text-slate-400">
                      Required Awakening Materials
                    </span>
                    <span className="text-[9px] text-cyan-300/85 font-semibold">
                      ✦ Hero Shards are used for Constellation C1–C6
                    </span>
                  </div>
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
  onSwitchToTranscend?: () => void;
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
  onSwitchToTranscend,
  onOpenShop,
  onOpenDungeon,
}) => {
  const {
    gold,
    expPotions,
    squadIds,
    roster,
    activePetId,
    ownedPets,
    equipmentInventory,
    unlockedCodexIds,
    relicRanks,
    levelUpHero,
  } = usePlayerStore();

  const [step, setStep] = useState<1 | 5 | 'MAX'>(1);

  const activeOwnedPet = activePetId && ownedPets?.[activePetId] ? ownedPets[activePetId] : null;
  const levelCap = getHeroLevelCap(owned.awakening, Boolean(owned.transcended));
  const remainingToCap = Math.max(0, levelCap - owned.level);
  const requestedLevels = step === 'MAX' ? Math.max(1, remainingToCap) : step;
  const cost = getLevelUpCost(owned.level, requestedLevels, owned.awakening, Boolean(owned.transcended));

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
      { roster, activePet: activeOwnedPet },
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
    roster,
    activeOwnedPet,
  ]);

  const absoluteCap = owned.transcended ? 100 : 80;
  const atAbsoluteMax = owned.level >= absoluteCap;
  const visuals = resolveHeroVisuals(hero, owned);
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
                      src={visuals.card}
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
                  MAXIMUM LEVEL {absoluteCap} REACHED!
                </div>
                {!owned.transcended && owned.awakening >= 6 && hero.transcendence?.enabled && onSwitchToTranscend && (
                  <div className="p-3 rounded-xl bg-gradient-to-r from-amber-500/20 via-fuchsia-500/20 to-cyan-500/20 border border-amber-300/60 text-xs text-amber-100 space-y-2">
                    <div>
                      Break past Lv.80! Transcend <strong>{hero.name}</strong> to unlock <strong>Max Lv.100</strong> and upgraded Empyrean visuals!
                    </div>
                    <RpgButton
                      variant="gold"
                      size="md"
                      onClick={() => {
                        audioManager.playSfx('ssr_reveal');
                        onClose();
                        onSwitchToTranscend();
                      }}
                    >
                      <Crown className="w-4 h-4" /> Transcend Now →
                    </RpgButton>
                  </div>
                )}
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

interface TranscendModalProps {
  open: boolean;
  hero: HeroDef;
  owned: OwnedHeroState;
  onClose: () => void;
  onTranscended: (message: string) => void;
  onOpenShop: (tab: ShopCategory) => void;
  onOpenDungeon?: (dungeonId: DungeonId, faction?: Faction) => void;
}

export const TranscendModal: React.FC<TranscendModalProps> = ({
  open,
  hero,
  owned,
  onClose,
  onTranscended,
  onOpenShop,
  onOpenDungeon,
}) => {
  const {
    gold,
    starCores,
    astralAnvilCores,
    factionEssences,
    squadIds,
    roster,
    activePetId,
    ownedPets,
    equipmentInventory,
    unlockedCodexIds,
    relicRanks,
    transcendHero,
    toggleHeroTranscendedVisual,
  } = usePlayerStore();

  const tr = hero.transcendence;
  const cost = getTranscendenceCost(hero.tier);
  const essenceKey = factionToEssenceKey(hero.faction);
  const essenceMeta = MATERIAL_META[essenceKey];
  const ownedEssence = factionEssences[hero.faction] ?? 0;
  const activeOwnedPet = activePetId && ownedPets?.[activePetId] ? ownedPets[activePetId] : null;

  const [showCelebration, setShowCelebration] = useState(false);

  useEffect(() => {
    if (!open || !cost) return;
    setShowCelebration(false);
  }, [open, hero.id]); // eslint-disable-line react-hooks/exhaustive-deps

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

  const transcendedStats = useMemo(
    () =>
      computeHeroStats(
        hero,
        { ...owned, transcended: true },
        equipmentInventory,
        squadIds,
        unlockedCodexIds.length,
        relicRanks,
        {
          roster: { ...roster, [hero.id]: { ...owned, transcended: true } },
          activePet: activeOwnedPet,
        },
      ),
    [hero, owned, equipmentInventory, squadIds, unlockedCodexIds.length, relicRanks, roster, activeOwnedPet],
  );

  const matsMet = Boolean(
    cost &&
      ownedEssence >= cost.essences &&
      starCores >= cost.starCores &&
      astralAnvilCores >= cost.astralAnvilCores &&
      gold >= cost.gold,
  );
  const canTranscendNow = Boolean(
    tr?.enabled &&
      owned.awakening >= 6 &&
      !owned.transcended &&
      cost &&
      matsMet,
  );

  const handleConfirm = () => {
    if (!canTranscendNow) return;
    const res = transcendHero(hero.id);
    if (res.ok) {
      audioManager.playSfx('ssr_reveal');
      audioManager.playSfx('ult_impact', 0.08);
      setShowCelebration(true);
      onTranscended(res.message);
    }
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={showCelebration ? undefined : onClose}
          className="fixed inset-0 z-50 bg-[#030510]/88 backdrop-blur-md flex items-center justify-center p-3 sm:p-4 select-none overflow-y-auto"
        >
          {showCelebration && tr ? (
            <motion.div
              initial={{ opacity: 0, scale: 0.85 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0 }}
              onClick={onClose}
              className="relative w-full max-w-2xl rounded-3xl p-6 sm:p-8 border-2 border-amber-300 bg-gradient-to-b from-[#1a0b2e] via-[#090d22] to-[#050712] text-center overflow-hidden shadow-[0_0_90px_rgba(253,224,71,0.5),0_0_120px_rgba(232,121,249,0.45)] cursor-pointer"
            >
              <div
                className="pointer-events-none absolute inset-0 opacity-35 animate-spin"
                style={{
                  animationDuration: '18s',
                  background:
                    'repeating-conic-gradient(from 0deg, rgba(253,224,71,0.55) 0deg 6deg, rgba(232,121,249,0.45) 6deg 12deg, transparent 12deg 24deg)',
                }}
              />
              <div className="relative z-10 flex flex-col items-center gap-3">
                <span className="px-4 py-1 rounded-full bg-gradient-to-r from-amber-300 via-yellow-200 to-fuchsia-300 text-slate-950 font-display font-black text-xs uppercase tracking-[0.26em] shadow-[0_0_24px_rgba(253,224,71,0.9)]">
                  ❖ EMPYREAN TRANSCENDENCE COMPLETE ❖
                </span>
                <motion.div
                  initial={{ scale: 0.75, y: 24 }}
                  animate={{ scale: 1, y: 0 }}
                  transition={{ type: 'spring', stiffness: 200, damping: 18 }}
                  className="h-[44dvh] max-h-[380px] flex items-end justify-center my-1"
                >
                  <ArtImage
                    kind="HERO"
                    id={hero.id}
                    src={tr.assets.standing}
                    alt={tr.formTitle}
                    className="h-full w-auto object-contain"
                    style={{
                      filter:
                        'drop-shadow(0 20px 36px rgba(0,0,0,0.95)) drop-shadow(0 0 36px rgba(253,224,71,0.8)) drop-shadow(0 0 24px rgba(232,121,249,0.75))',
                    }}
                  />
                </motion.div>
                <h2 className="font-display text-3xl sm:text-4xl font-black text-white text-glow-gold leading-none">
                  {hero.name}
                </h2>
                <div className="font-serif-italic italic text-sm sm:text-base text-amber-200">
                  {tr.formTitle}
                </div>
                <p className="text-xs text-slate-200 max-w-md italic">“{tr.quote}”</p>
                <div className="flex flex-wrap items-center justify-center gap-2 text-[11px] font-mono font-bold">
                  <span className="px-2.5 py-1 rounded-full bg-amber-400/20 border border-amber-300/70 text-amber-200">
                    MAX LV.100 UNLOCKED
                  </span>
                  <span className="px-2.5 py-1 rounded-full bg-fuchsia-500/20 border border-fuchsia-300/70 text-fuchsia-200">
                    +20% BASE STATS
                  </span>
                  <span className="px-2.5 py-1 rounded-full bg-cyan-500/20 border border-cyan-300/70 text-cyan-200">
                    VISUAL EVOLVED
                  </span>
                </div>
                <RpgButton variant="gold" size="md" onClick={onClose} className="mt-2 px-8">
                  Enter Empyrean Form →
                </RpgButton>
              </div>
            </motion.div>
          ) : (
            <motion.div
              initial={{ opacity: 0, scale: 0.92, y: 16 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.94, y: 10 }}
              transition={{ type: 'spring', stiffness: 360, damping: 28 }}
              onClick={(e) => e.stopPropagation()}
              className="relative rpg-panel w-full max-w-2xl max-h-[92dvh] overflow-y-auto border-amber-300/70 shadow-[0_24px_70px_rgba(0,0,0,0.92),0_0_50px_rgba(253,224,71,0.22)]"
            >
              <CornerFiligree color="#fde047" size={12} opacity={0.9} />

              {/* Header */}
              <div className="px-4 sm:px-5 pt-4 pb-3 border-b border-amber-300/30 bg-gradient-to-r from-amber-500/10 via-fuchsia-500/15 to-slate-950/90 flex items-center justify-between gap-2">
                <div className="flex items-center gap-2.5">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-300/30 via-fuchsia-500/30 to-cyan-400/25 border border-amber-200 flex items-center justify-center">
                    <Crown className="w-5 h-5 text-amber-200" />
                  </div>
                  <div>
                    <div className="flex items-center gap-1.5">
                      <RarityCrest tier={hero.tier} size="xs" />
                      <span className="text-[10px] font-display font-black uppercase tracking-[0.22em] text-amber-200">
                        ❖ Hero Transcendence Ritual
                      </span>
                    </div>
                    <h3 className="font-display text-lg sm:text-xl font-black text-white leading-tight">
                      {hero.name} — {tr?.formTitle ?? 'Transcended Form'}
                    </h3>
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

              {!tr?.enabled ? (
                <div className="p-6 text-center space-y-3">
                  <Crown className="w-12 h-12 mx-auto text-amber-300/70" />
                  <div className="font-display text-xl font-black text-amber-200">
                    SSR TRANSCENDENCE COMING SOON
                  </div>
                  <p className="text-xs text-slate-300 max-w-md mx-auto">
                    Transcendence visual evolutions are unlocked exclusively for UR & SSR Chasers after Awakening ★6. Currently live for <strong>UR Astraea, UR Velaris &amp; UR Malakhia</strong>!
                  </p>
                  <RpgButton variant="slate" size="md" onClick={onClose}>
                    Close
                  </RpgButton>
                </div>
              ) : owned.transcended ? (
                <div className="p-5 space-y-4">
                  <div className="flex flex-col sm:flex-row items-center gap-4 rounded-2xl p-4 bg-gradient-to-r from-amber-500/15 via-fuchsia-500/15 to-slate-950/90 border border-amber-300/60">
                    <div className="w-28 h-36 rounded-xl overflow-hidden border-2 border-amber-300 shrink-0 shadow-[0_0_24px_rgba(253,224,71,0.45)]">
                      <ArtImage
                        kind="HERO"
                        id={hero.id}
                        src={tr.assets.card}
                        alt={tr.formTitle}
                        className="w-full h-full object-cover object-top"
                      />
                    </div>
                    <div className="text-center sm:text-left space-y-1.5">
                      <span className="inline-block px-2.5 py-0.5 rounded-full bg-gradient-to-r from-amber-300 to-fuchsia-300 text-slate-950 font-display font-black text-[10px] uppercase tracking-widest">
                        ❖ TRANSCENDED ACTIVE
                      </span>
                      <div className="font-display text-xl font-black text-white">{tr.formTitle}</div>
                      <p className="text-xs text-slate-200 leading-relaxed">{tr.summary}</p>
                      <div className="pt-1 flex flex-wrap items-center justify-center sm:justify-start gap-2">
                        <RpgButton
                          variant="gold"
                          size="sm"
                          onClick={() => {
                            toggleHeroTranscendedVisual(hero.id);
                            audioManager.playSfx('button');
                          }}
                        >
                          Visual Mode: {(owned.useTranscendedVisual ?? true) ? '❖ Empyrean Skin' : 'Classic Skin'} (Toggle)
                        </RpgButton>
                      </div>
                    </div>
                  </div>
                  <div className="flex justify-end">
                    <RpgButton variant="slate" size="md" onClick={onClose}>
                      Close
                    </RpgButton>
                  </div>
                </div>
              ) : (
                <div className="p-4 sm:p-5 space-y-4">
                  {/* Dramatic Visual Evolution Comparison: Classic -> Transcended Empyrean Archon */}
                  <div className="flex items-center justify-center gap-3 sm:gap-5 rounded-2xl p-3.5 bg-slate-950/85 border border-amber-300/35">
                    <div className="flex flex-col items-center gap-1">
                      <div className="w-24 h-32 sm:w-28 sm:h-36 rounded-xl overflow-hidden border border-slate-600 opacity-85">
                        <ArtImage
                          kind="HERO"
                          id={hero.id}
                          src={hero.assets.card}
                          alt="Classic Form"
                          className="w-full h-full object-cover object-top"
                        />
                      </div>
                      <span className="text-[10px] font-display font-bold uppercase text-slate-400">
                        Base ★6 Form
                      </span>
                    </div>
                    <div className="flex flex-col items-center gap-1 text-amber-300">
                      <ArrowRight className="w-7 h-7 animate-pulse" />
                      <span className="text-[9px] font-display font-black uppercase tracking-widest text-fuchsia-300">
                        EVOLVE
                      </span>
                    </div>
                    <div className="flex flex-col items-center gap-1">
                      <div className="relative w-28 h-36 sm:w-32 sm:h-40 rounded-xl overflow-hidden border-2 border-amber-300 shadow-[0_0_32px_rgba(253,224,71,0.6),0_0_24px_rgba(232,121,249,0.5)]">
                        <ArtImage
                          kind="HERO"
                          id={hero.id}
                          src={tr.assets.card}
                          alt="Transcended Form"
                          className="w-full h-full object-cover object-top"
                        />
                        <span className="absolute top-1 inset-x-1 text-center py-0.5 rounded bg-gradient-to-r from-amber-300 to-fuchsia-300 text-slate-950 font-display font-black text-[8px] uppercase tracking-wider">
                          ❖ VISUAL UPGRADED
                        </span>
                      </div>
                      <span className="text-[10px] font-display font-black uppercase text-amber-200">
                        Empyrean Archon
                      </span>
                    </div>
                  </div>

                  {/* Stat & Ability Surge Preview */}
                  <div className="rounded-2xl bg-slate-950/80 border border-fuchsia-400/30 p-3 space-y-2">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-display font-bold uppercase tracking-wider text-slate-400">
                        Level Cap & Power Surge
                      </span>
                      <span className="font-mono font-black text-white flex items-center gap-1.5">
                        Lv.80 <ArrowRight className="w-3.5 h-3.5 text-amber-300" />
                        <span className="text-amber-300">Lv.{tr.maxLevelCap}</span>
                      </span>
                    </div>
                    <div className="grid grid-cols-4 gap-2 text-center pt-1.5 border-t border-white/10">
                      <div>
                        <div className="text-[9px] uppercase text-slate-400 font-bold">HP</div>
                        <div className="font-mono text-[11px] text-slate-400">{currentStats.maxHp.toLocaleString()}</div>
                        <div className="font-mono text-xs font-black text-emerald-400">→ {transcendedStats.maxHp.toLocaleString()}</div>
                      </div>
                      <div>
                        <div className="text-[9px] uppercase text-slate-400 font-bold">ATK</div>
                        <div className="font-mono text-[11px] text-slate-400">{currentStats.atk.toLocaleString()}</div>
                        <div className="font-mono text-xs font-black text-amber-300">→ {transcendedStats.atk.toLocaleString()}</div>
                      </div>
                      <div>
                        <div className="text-[9px] uppercase text-slate-400 font-bold">CRIT</div>
                        <div className="font-mono text-[11px] text-slate-400">{Math.round(currentStats.critRate * 100)}%</div>
                        <div className="font-mono text-xs font-black text-orange-300">→ {Math.round(transcendedStats.critRate * 100)}%</div>
                      </div>
                      <div>
                        <div className="text-[9px] uppercase text-slate-400 font-bold">PWR</div>
                        <div className="font-mono text-[11px] text-slate-400">{currentStats.powerRating.toLocaleString()}</div>
                        <div className="font-mono text-xs font-black text-fuchsia-300">→ {transcendedStats.powerRating.toLocaleString()}</div>
                      </div>
                    </div>
                    <div className="mt-1 px-3 py-2 rounded-xl bg-gradient-to-r from-amber-500/15 via-fuchsia-500/20 to-cyan-500/15 border border-amber-300/45 text-[11px] text-amber-100 leading-relaxed">
                      <strong className="text-amber-200 uppercase block text-[10px] tracking-wider">
                        ❖ Empyrean Evolution Unlocks:
                      </strong>
                      {tr.summary}
                    </div>
                  </div>

                  {owned.awakening < 6 ? (
                    <div className="p-3 rounded-xl bg-rose-950/40 border border-rose-500/50 text-center text-xs text-rose-200 font-bold">
                      <Lock className="w-4 h-4 inline mr-1.5" />
                      Reach Maximum Awakening ★6 first (Current: ★{owned.awakening}/6).
                    </div>
                  ) : cost && (
                    <>
                      <div>
                        <div className="flex items-center justify-between gap-2 mb-2">
                          <span className="text-[10px] font-display font-black uppercase tracking-[0.2em] text-amber-200/90">
                            Required Transcendence Materials
                          </span>
                          <span className="text-[9px] text-cyan-300/85 font-semibold">
                            ✦ Hero Shards are used for Constellation C1–C6
                          </span>
                        </div>
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                          <RequirementCard
                            icon={<MaterialIcon material={essenceKey} className="w-8 h-8" />}
                            label={essenceMeta.name}
                            owned={ownedEssence}
                            required={cost.essences}
                            accentColor={essenceMeta.color}
                          />
                          <RequirementCard
                            icon={<MaterialIcon material="starCores" className="w-8 h-8" />}
                            label="Starlight Core"
                            owned={starCores}
                            required={cost.starCores}
                            accentColor="#e879f9"
                          />
                          <RequirementCard
                            icon={<MaterialIcon material="astralAnvilCores" className="w-8 h-8" />}
                            label="Anvil Core"
                            owned={astralAnvilCores}
                            required={cost.astralAnvilCores}
                            accentColor="#f5c84c"
                          />
                          <RequirementCard
                            icon={<GameIcon name="gold" className="w-8 h-8" />}
                            label="Gold"
                            owned={gold}
                            required={cost.gold}
                            accentColor="#f5c84c"
                            formatNumbers
                          />
                        </div>
                      </div>

                      {!canTranscendNow && (
                        <div className="flex flex-wrap items-center justify-between gap-2 px-3 py-2 rounded-xl bg-amber-950/35 border border-amber-400/35 text-[11px]">
                          <span className="text-amber-200/90">
                            Need endgame materials? Farm Dungeons or visit the Starlight Shop.
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
                    </>
                  )}

                  <div className="flex items-center justify-end gap-2 pt-2 border-t border-white/10">
                    <RpgButton variant="slate" size="md" onClick={onClose}>
                      Cancel
                    </RpgButton>
                    <RpgButton
                      variant="gold"
                      size="md"
                      disabled={!canTranscendNow}
                      onClick={handleConfirm}
                      className="font-display font-black uppercase tracking-wider px-5"
                    >
                      <Crown className="w-4 h-4" /> ❖ Transcend Now
                    </RpgButton>
                  </div>
                </div>
              )}
            </motion.div>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
};
