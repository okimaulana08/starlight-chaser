import React, { useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import {
  Crown,
  Heart,
  Lock,
  RefreshCw,
  ShoppingBag,
  Sparkles,
  Star,
  Trash2,
  TrendingUp,
  Unlock,
  Users,
  Wand2,
} from 'lucide-react';
import {
  MAX_CONSTELLATION_LEVEL,
  getConstellationNodeCost,
} from '../data/constellations';
import {
  EQUIPMENT_SETS,
  EQUIPMENT_SLOTS,
  RARITY_COLORS,
  formatStatValue,
  getEnhancedMainStatValue,
} from '../data/equipment';
import { FACTIONS } from '../data/factions';
import { HEROES, HERO_MAP, resolveHeroVisuals } from '../data/heroes';
import {
  getAwakeningCost,
  getHeroLevelCap,
  getLevelUpCost,
  getTranscendenceCost,
} from '../data/materials';
import {
  MAX_PET_LEVEL,
  MAX_PET_RANK,
  PETS,
  formatPetAuraSummary,
  getPetLevelUpCost,
} from '../data/pets';
import { RELIC_MAP } from '../data/relics';
import { audioManager } from '../engine/AudioManager';
import { computeHeroStats, getSquadSynergyPills } from '../engine/CombatMath';
import { MAX_RELIC_RANK, usePlayerStore } from '../store/usePlayerStore';
import { getEnhanceCost, getSalvageYield } from '../systems/ForgeSystem';
import type { DungeonId, EquipmentSlot, Faction } from '../types/game';
import { ArtImage } from './ArtImage';
import { ConstellationModal } from './ConstellationModal';
import { EquipIcon, GameIcon, MaterialIcon } from './GameIcon';
import { GearReforgeModal } from './GearReforgeModal';
import { AwakenModal, LevelUpModal, TranscendModal } from './HeroGrowthModals';
import { PartyManagerModal } from './PartyManagerModal';
import {
  AnimatedNumber,
  CornerFiligree,
  RpgBackButton,
  RpgButton,
  RpgEquipSlot,
  RpgTabs,
} from './RpgKit';
import { RarityCrest, RoleBadge } from './RoleBadge';
import { SkillInspector } from './SkillInspector';
import { StarlightBackdrop } from './StarlightBackdrop';

interface SquadScreenProps {
  onBack: () => void;
  onOpenShop: (initialTab?: 'GROWTH' | 'AWAKEN' | 'FORGE' | 'RELIC') => void;
  onOpenDungeon?: (dungeonId: DungeonId, faction?: Faction) => void;
  onOpenGacha?: () => void;
}

export const SquadScreen: React.FC<SquadScreenProps> = ({
  onBack,
  onOpenShop,
  onOpenDungeon,
  onOpenGacha,
}) => {
  const {
    gold,
    expPotions,
    forgeStones,
    starIronIngots,
    astralAnvilCores,
    starCores,
    factionEssences,
    bondGifts,
    squadIds,
    partyPresets,
    activePresetIndex,
    roster,
    ownedRelics,
    relicRanks,
    ownedPets,
    activePetId,
    equipmentInventory,
    unlockedCodexIds,
    giveBondGift,
    equipRelic,
    equipGear,
    equipPet,
    levelUpPet,
    toggleHeroTranscendedVisual,
    toggleGearLock,
    autoEquipBestGear,
    batchSalvageGear,
    enhanceGear,
    salvageGear,
  } = usePlayerStore();

  const [selectedHeroId, setSelectedHeroId] = useState<string>(squadIds[0]);
  const [rightTab, setRightTab] = useState<'GEAR' | 'RELIC' | 'PETS' | 'SKILLS'>('GEAR');
  const [activeSlot, setActiveSlot] = useState<EquipmentSlot>('WEAPON');
  const [showBatchSalvage, setShowBatchSalvage] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{ text: string; tone: 'ok' | 'warn' } | null>(null);
  const [upgradePulse, setUpgradePulse] = useState<{ id: number; label: string; color: string } | null>(null);
  const [showPartyModal, setShowPartyModal] = useState(false);
  const [showAwakenModal, setShowAwakenModal] = useState(false);
  const [showLevelUpModal, setShowLevelUpModal] = useState(false);
  const [showTranscendModal, setShowTranscendModal] = useState(false);
  const [showConstellationModal, setShowConstellationModal] = useState(false);
  const [reforgeTargetUid, setReforgeTargetUid] = useState<string | null>(null);

  const showNotice = (text: string, tone: 'ok' | 'warn' = 'ok') => {
    setStatusMessage({ text, tone });
    window.setTimeout(() => setStatusMessage(null), 3000);
  };

  const triggerUpgradeFx = (label: string, color: string) => {
    setUpgradePulse({ id: Date.now() + Math.random(), label, color });
    window.setTimeout(() => setUpgradePulse(null), 900);
  };

  const ownedList = useMemo(() => HEROES.filter((h) => Boolean(roster[h.id])), [roster]);
  const heroDef = HERO_MAP[selectedHeroId] ?? HERO_MAP[squadIds[0]];
  const ownedHero = roster[heroDef.id] ?? roster[squadIds[0]];
  const heroVisuals = resolveHeroVisuals(heroDef, ownedHero);
  const activePreset = partyPresets[activePresetIndex] ?? partyPresets[0];
  const petsMap = ownedPets ?? {};
  const ownedPetCount = Object.keys(petsMap).length;
  const activeOwnedPet = activePetId && petsMap[activePetId] ? petsMap[activePetId] : null;

  const computed = useMemo(
    () =>
      computeHeroStats(
        heroDef,
        ownedHero,
        equipmentInventory,
        squadIds,
        unlockedCodexIds.length,
        relicRanks,
        { roster, activePet: activeOwnedPet },
      ),
    [
      heroDef,
      ownedHero,
      equipmentInventory,
      squadIds,
      unlockedCodexIds.length,
      relicRanks,
      roster,
      activeOwnedPet,
    ],
  );

  const synergyPills = useMemo(
    () => getSquadSynergyPills(squadIds, roster, activePetId, petsMap),
    [squadIds, roster, activePetId, petsMap],
  );
  const equippedUidForSlot = ownedHero.equippedGear[activeSlot];
  const equippedItemForSlot =
    equipmentInventory.find((e) => e.uid === equippedUidForSlot) ?? null;
  const candidateGear = equipmentInventory
    .filter((e) => e.slot === activeSlot)
    .sort((a, b) => {
      const rank = { LEGENDARY: 4, EPIC: 3, RARE: 2, COMMON: 1 };
      return rank[b.rarity] - rank[a.rarity] || b.enhanceLevel - a.enhanceLevel;
    });

  const salvageableCommonCount = useMemo(
    () =>
      equipmentInventory.filter((e) => !e.equippedHeroId && !e.locked && e.rarity === 'COMMON')
        .length,
    [equipmentInventory],
  );
  const salvageableLowCount = useMemo(
    () =>
      equipmentInventory.filter(
        (e) => !e.equippedHeroId && !e.locked && (e.rarity === 'COMMON' || e.rarity === 'RARE'),
      ).length,
    [equipmentInventory],
  );
  const salvageableEpicZeroCount = useMemo(
    () =>
      equipmentInventory.filter(
        (e) =>
          !e.equippedHeroId &&
          !e.locked &&
          (e.rarity === 'COMMON' ||
            e.rarity === 'RARE' ||
            (e.rarity === 'EPIC' && e.enhanceLevel === 0)),
      ).length,
    [equipmentInventory],
  );
  const reforgeTargetItem = useMemo(
    () =>
      reforgeTargetUid
        ? equipmentInventory.find((e) => e.uid === reforgeTargetUid) ?? null
        : null,
    [reforgeTargetUid, equipmentInventory],
  );
  const recommendedSetLabel =
    heroDef.role === 'TANK'
      ? 'Aegis Bastion / Chrono'
      : heroDef.role === 'HEALER'
        ? 'Verdant Grace / Chrono'
        : heroDef.role === 'MAGE'
          ? 'Astral Surge / Ashen Fury'
          : heroDef.role === 'RANGER'
            ? 'Ashen Fury / Vanguard'
            : 'Vanguard / Ashen Fury';

  const levelCap = getHeroLevelCap(ownedHero.awakening, Boolean(ownedHero.transcended));
  const lv1Cost = getLevelUpCost(
    ownedHero.level,
    1,
    ownedHero.awakening,
    Boolean(ownedHero.transcended),
  );
  const awakenCost = getAwakeningCost(ownedHero.awakening, heroDef.tier);
  const transcendCost = getTranscendenceCost(heroDef.tier);
  const ownedHeroEssence = factionEssences[heroDef.faction] ?? 0;

  const canLevelUpQuick =
    ownedHero.level < levelCap &&
    !lv1Cost.atAwakenCap &&
    expPotions >= lv1Cost.potions &&
    gold >= lv1Cost.gold;
  const canAwakenWithMats = Boolean(
    awakenCost &&
      ownedHeroEssence >= awakenCost.essences &&
      starCores >= awakenCost.starCores &&
      gold >= awakenCost.gold,
  );
  const canAwakenReady = canAwakenWithMats;
  const canTranscendReady = Boolean(
    !ownedHero.transcended &&
      ownedHero.awakening >= 6 &&
      heroDef.transcendence?.enabled &&
      transcendCost &&
      ownedHeroEssence >= transcendCost.essences &&
      starCores >= transcendCost.starCores &&
      astralAnvilCores >= transcendCost.astralAnvilCores &&
      gold >= transcendCost.gold,
  );
  const constellationLevel = ownedHero.constellation ?? 0;
  const nextConstellationCost = getConstellationNodeCost(heroDef.tier, constellationLevel + 1);
  const canConstellationReady = Boolean(
    nextConstellationCost &&
      ownedHero.shards >= nextConstellationCost.shards &&
      gold >= nextConstellationCost.gold,
  );
  const showTranscendButton =
    ownedHero.awakening >= 6 && (heroDef.tier === 'UR' || heroDef.tier === 'SSR');

  const handleEnhance = (uid: string) => {
    const res = enhanceGear(uid);
    showNotice(res.message, res.ok && res.succeeded ? 'ok' : 'warn');
    audioManager.playSfx(res.ok && res.succeeded ? 'forge' : 'button');
    if (res.ok && res.succeeded) triggerUpgradeFx('FORGE ENHANCED!', '#f5c84c');
  };

  return (
    <div className="relative w-full h-full flex flex-col overflow-hidden select-none">
      <StarlightBackdrop variant="FORGE" accentColor={heroDef.themeColor} />

      {/* FLOATING TOP BAR (Back + Manage Party CTA + Deployed Ribbon + Resource Pills) */}
      <div className="relative z-20 flex flex-wrap items-center justify-between gap-2 px-3 sm:px-5 safe-top pb-2">
        <div className="flex items-center gap-2 overflow-x-auto max-w-full pb-0.5">
          <RpgBackButton onClick={onBack} />

          {/* Prominent Manage Party / 3-Preset Button */}
          <RpgButton
            variant="gold"
            size="sm"
            onClick={() => {
              setShowPartyModal(true);
              audioManager.playSfx('button');
            }}
            className="shrink-0 font-display font-black uppercase tracking-wider"
          >
            <Users className="w-3.5 h-3.5" />
            <span>Manage Party</span>
            <span className="px-1.5 py-0.5 rounded bg-slate-950/30 font-mono text-[9px]">
              P{activePresetIndex + 1}
            </span>
          </RpgButton>

          {/* Compact Active Preset Formation Ribbon */}
          <div className="flex items-center gap-1 sm:gap-1.5 shrink-0">
            {squadIds.map((hid, idx) => {
              const h = HERO_MAP[hid];
              if (!h) return null;
              const isSel = hid === heroDef.id;
              return (
                <motion.button
                  key={`${hid}_${idx}`}
                  whileHover={{ y: -1 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => {
                    setSelectedHeroId(hid);
                    audioManager.playSfx('button');
                  }}
                  className={`flex items-center gap-1.5 pr-2 pl-1 py-1 rounded-xl border transition shrink-0 ${
                    isSel
                      ? 'bg-gradient-to-r from-amber-400/25 to-amber-500/10 border-amber-300 shadow-[0_0_16px_rgba(245,200,76,0.38)]'
                      : 'bg-slate-950/80 border-slate-700/80 hover:border-amber-400/50'
                  }`}
                >
                  <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg overflow-hidden border border-white/25">
                    <ArtImage
                      kind="HERO"
                      id={hid}
                      src={resolveHeroVisuals(h, roster[hid]).card}
                      alt={h.name}
                      className="w-full h-full object-cover object-top"
                    />
                  </div>
                  <div className="text-left hidden md:block">
                    <div className="text-[10px] font-bold text-white leading-none">{h.name}</div>
                    <div className="text-[9px] text-amber-300 font-mono font-bold mt-0.5">
                      S{idx + 1}
                    </div>
                  </div>
                </motion.button>
              );
            })}
          </div>

          {synergyPills.map((syn) => (
            <span
              key={syn.id}
              title={`${syn.label}: ${syn.desc}`}
              className="hidden sm:inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-black uppercase border bg-slate-950/85 shrink-0"
              style={{
                borderColor: syn.color,
                color: syn.color,
              }}
            >
              <Crown className="w-3 h-3" />
              <span>{syn.shortLabel}</span>
            </span>
          ))}
        </div>

        <div className="flex items-center gap-1.5 text-[10px] sm:text-[11px] font-mono overflow-x-auto max-w-full">
          <span
            className="rpg-panel-subtle px-2.5 py-1 text-amber-300 font-bold flex items-center gap-1.5 shrink-0"
            title="Gold"
          >
            <GameIcon name="gold" className="w-4 h-4" />
            <span>{gold.toLocaleString()}</span>
          </span>
          <span
            className="rpg-panel-subtle px-2.5 py-1 text-emerald-300 font-bold flex items-center gap-1.5 shrink-0"
            title="Starlight EXP Elixirs"
          >
            <MaterialIcon material="expPotions" className="w-4 h-4" />
            <span>{expPotions}</span>
          </span>
          <span
            className="rpg-panel-subtle px-2.5 py-1 text-violet-300 font-bold flex items-center gap-1.5 shrink-0"
            title="Forge Stones (Tier 1)"
          >
            <MaterialIcon material="forgeStones" className="w-4 h-4" />
            <span>{forgeStones}</span>
          </span>
          <span
            className="rpg-panel-subtle px-2.5 py-1 text-sky-300 font-bold flex items-center gap-1.5 shrink-0"
            title="Star-Iron Ingots (Tier 2, +6 to +15)"
          >
            <MaterialIcon material="starIronIngots" className="w-4 h-4" />
            <span>{starIronIngots}</span>
          </span>
          <span
            className="rpg-panel-subtle px-2.5 py-1 text-amber-200 font-bold hidden sm:flex items-center gap-1.5 shrink-0"
            title="Astral Anvil Cores (Tier 3, +11 to +15)"
          >
            <MaterialIcon material="astralAnvilCores" className="w-4 h-4" />
            <span>{astralAnvilCores}</span>
          </span>
          <button
            onClick={() => {
              audioManager.playSfx('button');
              onOpenShop(rightTab === 'RELIC' ? 'RELIC' : rightTab === 'GEAR' ? 'FORGE' : 'AWAKEN');
            }}
            className="rpg-panel-subtle hover:border-amber-300 px-2.5 py-1 text-amber-200 font-display font-black uppercase flex items-center gap-1 shrink-0 transition"
            title="Buy Growth, Awaken & Forge Materials"
          >
            <ShoppingBag className="w-3.5 h-3.5 text-amber-300" />
            <span>Shop</span>
          </button>
        </div>
      </div>

      {/* HERO PEDESTAL STAGE + ROSTER RAIL + FORGE/RELIC/SKILL CONSOLE */}
      <main className="relative z-10 flex-1 grid grid-cols-1 sm:grid-cols-12 gap-2.5 sm:gap-3 px-3 sm:px-4 safe-bottom min-h-0 overflow-y-auto sm:overflow-hidden">
        {/* LEFT RAIL: Vertical Owned Chaser Selector */}
        <aside className="sm:col-span-3 lg:col-span-2 rpg-panel p-2 flex flex-row sm:flex-col gap-1.5 overflow-x-auto sm:overflow-y-auto">
          <div className="hidden sm:flex items-center justify-between px-1 pb-1 border-b border-slate-800/80 text-[10px]">
            <span className="font-display font-bold uppercase tracking-wider text-slate-400">
              Roster ({ownedList.length})
            </span>
            <span className="font-mono text-amber-300 font-bold truncate max-w-[90px]">
              {activePreset.name}
            </span>
          </div>
          {ownedList.map((h) => {
            const own = roster[h.id];
            const inSquadIdx = squadIds.indexOf(h.id);
            const active = h.id === heroDef.id;
            return (
              <div
                key={h.id}
                onClick={() => {
                  setSelectedHeroId(h.id);
                  audioManager.playSfx('button');
                }}
                className={`shrink-0 w-36 sm:w-full flex items-center gap-2 p-1.5 rounded-xl border cursor-pointer transition ${
                  active
                    ? 'bg-amber-500/20 border-amber-300'
                    : 'bg-slate-950/70 border-slate-800 hover:border-slate-600'
                }`}
              >
                <div className="relative w-10 h-12 rounded-lg overflow-hidden border border-white/15 shrink-0">
                  <ArtImage
                    kind="HERO"
                    id={h.id}
                    src={resolveHeroVisuals(h, own).card}
                    alt={h.name}
                    className="w-full h-full object-cover object-top"
                  />
                  <span
                    className="absolute bottom-0 inset-x-0 text-[8px] font-black text-center bg-black/85"
                    style={{ color: h.themeColor }}
                  >
                    {h.tier}
                  </span>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-1">
                    <div className="text-xs font-bold text-white truncate">{h.name}</div>
                    {(own.constellation ?? 0) > 0 && (
                      <span className="shrink-0 px-1 py-[1px] rounded bg-cyan-500/20 border border-cyan-300/55 text-[8px] font-mono font-black text-cyan-200">
                        C{own.constellation}
                      </span>
                    )}
                  </div>
                  <div className="text-[10px] font-mono text-amber-300">
                    Lv.{own.level} • ★{own.awakening}
                  </div>
                  {inSquadIdx !== -1 ? (
                    <span className="inline-block mt-0.5 px-1.5 py-0.5 rounded bg-emerald-500/20 border border-emerald-400/40 text-[8px] font-black text-emerald-300">
                      PARTY S{inSquadIdx + 1}
                    </span>
                  ) : (
                    <span className="text-[9px] text-slate-500 font-semibold">Reserve</span>
                  )}
                </div>
              </div>
            );
          })}
        </aside>

        {/* CENTER STAGE: Standing Hero Pedestal + Orbiting Gear Slots & Balanced Growth */}
        <section className="sm:col-span-4 lg:col-span-5 relative flex flex-col justify-between gap-2 min-h-0 overflow-y-auto sm:overflow-hidden">
          <div className="relative flex-1 flex flex-col items-center justify-end min-h-[200px] sm:min-h-0 pb-2">
            <div
              className="absolute bottom-[18%] w-48 sm:w-60 md:w-72 h-48 sm:h-60 md:h-72 rounded-full blur-3xl opacity-35"
              style={{ background: heroDef.themeColor }}
            />
            <div className="pointer-events-none absolute bottom-1 w-44 sm:w-56 md:w-64 h-12 flex items-center justify-center">
              <div
                className="w-full h-9 rounded-full border-2 opacity-60 animate-pulse"
                style={{
                  borderColor: heroDef.themeColor,
                  boxShadow: `0 0 24px ${heroDef.themeColor}88, inset 0 0 14px ${heroDef.themeColor}55`,
                }}
              />
              <div className="absolute w-32 sm:w-40 h-5 rounded-full bg-black/60 blur-md" />
            </div>

            {upgradePulse && (
              <div
                key={upgradePulse.id}
                className="pointer-events-none absolute inset-0 flex items-center justify-center z-20"
              >
                <div
                  className="w-36 h-36 rounded-full border-4 animate-upgrade-burst"
                  style={{
                    borderColor: upgradePulse.color,
                    boxShadow: `0 0 40px ${upgradePulse.color}`,
                  }}
                />
                <div
                  className="absolute top-1/3 px-4 py-1 rounded-full bg-slate-950/95 border-2 font-display font-black text-xs sm:text-sm uppercase tracking-[0.2em] shadow-2xl animate-combo-pop"
                  style={{ borderColor: upgradePulse.color, color: upgradePulse.color }}
                >
                  ✦ {upgradePulse.label}
                </div>
              </div>
            )}

            <motion.div
              key={`${heroDef.id}_${heroVisuals.isTranscendedVisual ? 'tr' : 'base'}`}
              initial={{ opacity: 0, x: -16, scale: 0.96 }}
              animate={{ opacity: 1, x: 0, scale: 1 }}
              transition={{ type: 'spring', stiffness: 320, damping: 26 }}
              className="relative z-10 h-[195px] sm:h-[46dvh] md:h-[325px] max-h-[360px] flex items-end justify-center animate-breathe"
            >
              <ArtImage
                kind="HERO"
                id={heroDef.id}
                src={heroVisuals.standing}
                alt={heroDef.name}
                className={
                  heroVisuals.standing.includes('/assets/standing/')
                    ? 'h-full w-auto object-contain object-bottom'
                    : 'w-full h-full object-cover object-top hero-radial-feather'
                }
                style={
                  heroVisuals.standing.includes('/assets/standing/')
                    ? {
                        filter: heroVisuals.isTranscendedVisual
                          ? 'drop-shadow(0 16px 28px rgba(4,6,16,0.95)) drop-shadow(0 0 26px rgba(253,224,71,0.68)) drop-shadow(0 0 18px rgba(232,121,249,0.58))'
                          : `drop-shadow(0 14px 24px rgba(4,6,16,0.9)) drop-shadow(0 0 16px ${heroDef.themeColor}44)`,
                      }
                    : undefined
                }
              />
            </motion.div>

            {/* Hero Name & Awakening / Transcendence Crest Overlay */}
            <div
              className="absolute top-0 left-0 rpg-ornate-card px-3 py-2 backdrop-blur-md"
              style={{
                borderLeft: `3px solid ${ownedHero.transcended ? '#fde047' : heroDef.themeColor}`,
              }}
            >
              <CornerFiligree
                color={ownedHero.transcended ? '#fde047' : heroDef.themeColor}
                size={7}
                opacity={0.75}
              />
              <div className="flex items-center flex-wrap gap-1.5">
                <RarityCrest tier={heroDef.tier} size="sm" />
                <RoleBadge role={heroDef.role} variant="pill" size="sm" />
                {ownedHero.transcended && (
                  <span className="px-1.5 py-0.5 rounded bg-gradient-to-r from-amber-300 to-fuchsia-300 text-slate-950 font-display font-black text-[8px] uppercase tracking-widest">
                    ❖ TRANSCENDED
                  </span>
                )}
              </div>
              <h2 className="font-display text-xl sm:text-2xl font-black text-white text-glow-gold leading-tight mt-1">
                {heroDef.name}
              </h2>
              {ownedHero.transcended && (
                <div className="text-[9px] font-serif-italic italic text-amber-200 leading-none mb-0.5">
                  {heroVisuals.title}
                </div>
              )}
              <div className="flex items-center gap-0.5 mt-0.5">
                {Array.from({ length: 6 }, (_, i) => (
                  <Star
                    key={i}
                    className={`w-3 h-3 ${
                      i < ownedHero.awakening
                        ? ownedHero.transcended
                          ? 'text-amber-300 fill-amber-300 drop-shadow-[0_0_8px_rgba(253,224,71,0.95)]'
                          : 'text-fuchsia-400 fill-fuchsia-400 drop-shadow-[0_0_6px_rgba(232,121,249,0.8)]'
                        : 'text-slate-700'
                    }`}
                  />
                ))}
                <span className="ml-2 text-xs font-mono font-bold text-cyan-300">
                  Lv.{ownedHero.level}/{levelCap}
                </span>
              </div>
              <div className="flex flex-wrap items-center gap-1.5 mt-0.5">
                <div className="text-[11px] font-extrabold text-amber-300">
                  PWR <AnimatedNumber value={computed.powerRating} className="text-sm font-bold text-amber-200" />
                </div>
                <button
                  type="button"
                  onClick={() => {
                    audioManager.playSfx('button');
                    setShowConstellationModal(true);
                  }}
                  className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded border text-[9px] font-display font-black uppercase tracking-wider transition ${
                    constellationLevel >= MAX_CONSTELLATION_LEVEL
                      ? 'bg-amber-400/20 border-amber-300/80 text-amber-200 shadow-[0_0_10px_rgba(253,224,71,0.35)]'
                      : canConstellationReady
                        ? 'bg-cyan-500/25 border-cyan-300/85 text-cyan-100 shadow-[0_0_10px_rgba(56,232,255,0.45)] animate-pulse'
                        : 'bg-slate-900/90 border-cyan-400/45 text-cyan-200 hover:bg-cyan-500/20'
                  }`}
                  title="Open Starlight Constellation Altar (Hero Shards)"
                >
                  <span>✦ C{constellationLevel}/{MAX_CONSTELLATION_LEVEL}</span>
                </button>
                {ownedHero.transcended && heroDef.transcendence?.enabled && (
                  <button
                    type="button"
                    onClick={() => {
                      toggleHeroTranscendedVisual(heroDef.id);
                      audioManager.playSfx('button');
                    }}
                    className="px-1.5 py-0.5 rounded bg-slate-900/90 border border-amber-300/60 text-[9px] font-display font-bold text-amber-200 hover:bg-amber-400/20 transition"
                    title="Toggle Transcended Empyrean Visual vs Classic Skin"
                  >
                    {heroVisuals.isTranscendedVisual ? '❖ Empyrean' : 'Classic'}
                  </button>
                )}
              </div>
            </div>

            {/* Ornate Equipment & Relic Medallion Sockets */}
            <div className="mt-2 w-full grid grid-cols-5 gap-1.5 sm:mt-0 sm:w-auto sm:absolute sm:right-1 sm:top-2 sm:flex sm:flex-col sm:gap-1.5 z-20">
              {EQUIPMENT_SLOTS.map((slot) => {
                const item = equipmentInventory.find((e) => e.uid === ownedHero.equippedGear[slot]);
                const sel = rightTab === 'GEAR' && activeSlot === slot;
                return (
                  <RpgEquipSlot
                    key={slot}
                    slot={slot}
                    item={item}
                    selected={sel}
                    onClick={() => {
                      setRightTab('GEAR');
                      setActiveSlot(slot);
                    }}
                  />
                );
              })}

              <RpgEquipSlot
                isRelic
                relicName={
                  ownedHero.equippedRelicId
                    ? `${RELIC_MAP[ownedHero.equippedRelicId]?.name.split(' ')[0]} R${relicRanks[ownedHero.equippedRelicId] ?? 1}`
                    : null
                }
                selected={rightTab === 'RELIC'}
                onClick={() => setRightTab('RELIC')}
              />
            </div>
          </div>

          {/* Bottom Pedestal Growth & Biome Awakening Console */}
          <div className="relative rpg-panel p-2.5 sm:p-3 space-y-2 overflow-hidden">
            <CornerFiligree color="#f5c84c" size={9} opacity={0.55} />

            {/* Live Stats Bar */}
            <div className="grid grid-cols-4 gap-2 text-center bg-slate-950/80 rounded-xl p-1.5 sm:p-2 border border-amber-400/20 shadow-[inset_0_2px_10px_rgba(0,0,0,0.65)]">
              <div>
                <div className="text-[9px] font-display font-bold tracking-widest text-slate-400 uppercase">HP</div>
                <AnimatedNumber value={computed.maxHp} className="text-xs sm:text-sm font-bold text-emerald-300" />
              </div>
              <div>
                <div className="text-[9px] font-display font-bold tracking-widest text-slate-400 uppercase">ATK</div>
                <AnimatedNumber value={computed.atk} className="text-xs sm:text-sm font-bold text-amber-300" />
              </div>
              <div>
                <div className="text-[9px] font-display font-bold tracking-widest text-slate-400 uppercase">DEF</div>
                <AnimatedNumber value={computed.def} className="text-xs sm:text-sm font-bold text-sky-300" />
              </div>
              <div>
                <div className="text-[9px] font-display font-bold tracking-widest text-slate-400 uppercase">CRIT</div>
                <div className="font-mono text-xs sm:text-sm font-bold text-orange-300">
                  {(computed.critRate * 100).toFixed(0)}%
                </div>
              </div>
            </div>

            {/* Growth Action Buttons (2x2 Grid: Level Up, Awaken/Transcend, Constellation, Bond) */}
            <div className="grid grid-cols-2 gap-1.5 sm:gap-2">
              <RpgButton
                variant="emerald"
                size="sm"
                onClick={() => {
                  audioManager.playSfx('button');
                  setShowLevelUpModal(true);
                }}
                className="relative font-display font-black uppercase tracking-wider"
              >
                <TrendingUp className="w-3.5 h-3.5" />
                <span>{lv1Cost.atAwakenCap ? `Cap Lv.${levelCap}` : 'Level Up'}</span>
                {canLevelUpQuick && (
                  <span className="w-2 h-2 rounded-full bg-emerald-300 shadow-[0_0_8px_rgba(52,211,153,0.95)]" />
                )}
              </RpgButton>
              {showTranscendButton ? (
                <RpgButton
                  variant="gold"
                  size="sm"
                  onClick={() => {
                    audioManager.playSfx('button');
                    setShowTranscendModal(true);
                  }}
                  className="relative font-display font-black uppercase tracking-wider"
                >
                  <Crown className="w-3.5 h-3.5" />
                  <span>
                    {ownedHero.transcended
                      ? '❖ Transcended'
                      : heroDef.transcendence?.enabled
                        ? '❖ Transcend'
                        : 'Transcend Soon'}
                  </span>
                  {canTranscendReady && (
                    <span className="w-2 h-2 rounded-full bg-white shadow-[0_0_10px_rgba(255,255,255,0.95)] animate-pulse" />
                  )}
                </RpgButton>
              ) : (
                <RpgButton
                  variant="violet"
                  size="sm"
                  onClick={() => {
                    audioManager.playSfx('button');
                    setShowAwakenModal(true);
                  }}
                  className="relative font-display font-black uppercase tracking-wider"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>{awakenCost ? `Awaken ★${awakenCost.nextStar}` : 'MAX ★6'}</span>
                  {canAwakenReady && (
                    <span className="w-2 h-2 rounded-full bg-amber-300 shadow-[0_0_8px_rgba(253,224,71,0.95)] animate-pulse" />
                  )}
                </RpgButton>
              )}
              <RpgButton
                variant={constellationLevel >= MAX_CONSTELLATION_LEVEL ? 'gold' : 'cyan'}
                size="sm"
                onClick={() => {
                  audioManager.playSfx('button');
                  setShowConstellationModal(true);
                }}
                className="relative font-display font-black uppercase tracking-wider"
              >
                <span className="text-xs leading-none">✦</span>
                <span>
                  {constellationLevel >= MAX_CONSTELLATION_LEVEL
                    ? `Constellation C${MAX_CONSTELLATION_LEVEL}`
                    : `Constellation C${constellationLevel}/${MAX_CONSTELLATION_LEVEL}`}
                </span>
                {canConstellationReady && (
                  <span className="w-2 h-2 rounded-full bg-amber-300 shadow-[0_0_9px_rgba(253,224,71,0.95)] animate-pulse" />
                )}
              </RpgButton>
              <RpgButton
                variant="rose"
                size="sm"
                onClick={() => {
                  if (giveBondGift(heroDef.id)) {
                    audioManager.playSfx('heal');
                    triggerUpgradeFx('BOND INCREASED ♥', '#fb7185');
                  } else {
                    showNotice(
                      ownedHero.bondLevel >= 10
                        ? 'Bond already Max Lv.10!'
                        : 'No Bond Gifts left — buy in Shop or clear stages!',
                      'warn',
                    );
                  }
                }}
                className="font-display font-black uppercase tracking-wider"
              >
                <Heart className="w-3.5 h-3.5" /> Bond ({bondGifts})
              </RpgButton>
            </div>

            {statusMessage && (
              <div
                className={`text-[11px] font-bold px-2.5 py-1 rounded-lg border ${
                  statusMessage.tone === 'ok'
                    ? 'bg-emerald-950/70 border-emerald-400/45 text-emerald-200'
                    : 'bg-amber-950/70 border-amber-400/45 text-amber-200'
                }`}
              >
                {statusMessage.text}
              </div>
            )}
          </div>
        </section>

        {/* RIGHT CONSOLE: Blacksmith Anvil Forge (+15), Earned Relics & Interactive Skill Inspector */}
        <section className="relative sm:col-span-5 rpg-panel p-3 sm:p-4 flex flex-col min-h-0 overflow-hidden">
          <CornerFiligree color="#f5c84c" size={9} opacity={0.5} />
          <div className="mb-3">
            <RpgTabs
              layoutId="squad-right-tabs"
              fullWidth
              value={rightTab}
              onChange={setRightTab}
              items={[
                { key: 'GEAR', label: 'Forge', icon: 'forge' },
                { key: 'RELIC', label: `Relics (${ownedRelics.length})`, icon: 'relic', accent: 'cyan' },
                { key: 'PETS', label: `🐾 Pets (${ownedPetCount})`, accent: 'cyan' },
                { key: 'SKILLS', label: 'Skills', icon: 'heroes' },
              ]}
            />
          </div>

          {rightTab === 'GEAR' && (
            <div className="flex-1 flex flex-col gap-2.5 min-h-0">
              {/* Smart Gear QoL Toolbar: Auto-Equip Best + Batch Salvage */}
              <div className="flex flex-wrap items-center justify-between gap-2">
                <RpgButton
                  variant="cyan"
                  size="xs"
                  onClick={() => {
                    const res = autoEquipBestGear(heroDef.id);
                    audioManager.playSfx(res.changedSlots > 0 ? 'forge' : 'button');
                    showNotice(res.message, res.changedSlots > 0 ? 'ok' : 'warn');
                    if (res.changedSlots > 0) {
                      triggerUpgradeFx('AUTO-EQUIPPED BEST!', '#38e8ff');
                    }
                  }}
                  className="font-display font-black uppercase tracking-wider"
                >
                  <Wand2 className="w-3.5 h-3.5" /> Auto-Equip Best
                </RpgButton>

                <button
                  type="button"
                  onClick={() => {
                    audioManager.playSfx('button');
                    setShowBatchSalvage((v) => !v);
                  }}
                  className={`px-2.5 py-1.5 rounded-lg border text-[10px] font-display font-black uppercase tracking-wider flex items-center gap-1.5 transition ${
                    showBatchSalvage
                      ? 'bg-rose-500/20 border-rose-400 text-rose-200'
                      : 'bg-slate-950/85 border-slate-700 hover:border-rose-400/60 text-slate-300 hover:text-rose-200'
                  }`}
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Batch Salvage ({salvageableEpicZeroCount})</span>
                </button>
              </div>

              {showBatchSalvage && (
                <div className="rounded-xl bg-rose-950/35 border border-rose-500/45 p-2.5 flex flex-wrap items-center justify-between gap-2 text-[11px]">
                  <span className="text-rose-200/90 font-semibold">
                    Locked, equipped &amp; enhanced (+1+) Epic gear are protected:
                  </span>
                  <div className="flex flex-wrap items-center gap-1.5">
                    <RpgButton
                      variant="slate"
                      size="xs"
                      disabled={salvageableCommonCount === 0}
                      onClick={() => {
                        const res = batchSalvageGear('COMMON');
                        audioManager.playSfx(res.ok ? 'forge' : 'button');
                        showNotice(res.message, res.ok ? 'ok' : 'warn');
                        if (res.ok) setShowBatchSalvage(false);
                      }}
                    >
                      Common ({salvageableCommonCount})
                    </RpgButton>
                    <RpgButton
                      variant="rose"
                      size="xs"
                      disabled={salvageableLowCount === 0}
                      onClick={() => {
                        const res = batchSalvageGear('RARE');
                        audioManager.playSfx(res.ok ? 'forge' : 'button');
                        showNotice(res.message, res.ok ? 'ok' : 'warn');
                        if (res.ok) setShowBatchSalvage(false);
                      }}
                    >
                      Common + Rare ({salvageableLowCount})
                    </RpgButton>
                    <RpgButton
                      variant="rose"
                      size="xs"
                      disabled={salvageableEpicZeroCount === 0}
                      onClick={() => {
                        const res = batchSalvageGear('EPIC');
                        audioManager.playSfx(res.ok ? 'forge' : 'button');
                        showNotice(res.message, res.ok ? 'ok' : 'warn');
                        if (res.ok) setShowBatchSalvage(false);
                      }}
                    >
                      Up to Epic +0 ({salvageableEpicZeroCount})
                    </RpgButton>
                  </div>
                </div>
              )}

              <div className="rounded-xl bg-slate-950/75 border border-amber-400/20 px-3 py-2 text-[11px] flex flex-wrap items-center justify-between gap-1.5">
                <div>
                  <span className="text-slate-400 uppercase font-display font-bold text-[9px] tracking-widest mr-2">
                    Active Sets:
                  </span>
                  {computed.activeSets.length === 0 ? (
                    <span className="text-slate-400">Equip 2 or 4 matching pieces</span>
                  ) : (
                    computed.activeSets.map(({ setId, count }) => (
                      <span
                        key={setId}
                        className="mr-2 font-bold"
                        style={{ color: EQUIPMENT_SETS[setId].color }}
                      >
                        {EQUIPMENT_SETS[setId].name} ({count}pc)
                      </span>
                    ))
                  )}
                </div>
                <span className="text-[10px] text-cyan-300/90 font-semibold">
                  Rec: {recommendedSetLabel}
                </span>
              </div>

              {equippedItemForSlot && (
                <div
                  className="rpg-ornate-card p-3 overflow-hidden space-y-2"
                  style={{
                    borderColor: `${RARITY_COLORS[equippedItemForSlot.rarity]}aa`,
                    boxShadow: `0 8px 22px rgba(0,0,0,0.6), inset 0 0 20px ${RARITY_COLORS[equippedItemForSlot.rarity]}18`,
                  }}
                >
                  <CornerFiligree color={RARITY_COLORS[equippedItemForSlot.rarity]} size={8} opacity={0.75} />
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-start gap-2.5 min-w-0">
                      <div
                        className="w-12 h-12 rounded-xl bg-slate-900 border-2 flex items-center justify-center shrink-0 mt-0.5"
                        style={{
                          borderColor: `${RARITY_COLORS[equippedItemForSlot.rarity]}aa`,
                          boxShadow: `inset 0 0 14px ${RARITY_COLORS[equippedItemForSlot.rarity]}33`,
                        }}
                      >
                        <EquipIcon slot={equippedItemForSlot.slot} className="w-10 h-10" />
                      </div>
                      <div className="min-w-0">
                        <div
                          className="text-[10px] font-display font-black uppercase tracking-widest"
                          style={{ color: RARITY_COLORS[equippedItemForSlot.rarity] }}
                        >
                          {equippedItemForSlot.rarity} • {activeSlot}
                        </div>
                        <div className="font-display font-bold text-sm text-white truncate">
                          {equippedItemForSlot.name} +{equippedItemForSlot.enhanceLevel}
                        </div>
                        <div className="text-sm font-mono font-bold text-amber-300 mt-0.5">
                          {formatStatValue(
                            equippedItemForSlot.mainStat.stat,
                            getEnhancedMainStatValue(equippedItemForSlot),
                          )}
                        </div>
                        <div className="flex flex-wrap gap-x-2.5 text-[11px] font-mono text-slate-300 mt-0.5">
                          {equippedItemForSlot.subStats.map((s, i) => (
                            <span key={i}>{formatStatValue(s.stat, s.value)}</span>
                          ))}
                        </div>
                      </div>
                    </div>

                    <div className="flex flex-col items-end gap-1.5 shrink-0">
                      <div className="flex items-center gap-1.5">
                        {(equippedItemForSlot.rarity === 'EPIC' ||
                          equippedItemForSlot.rarity === 'LEGENDARY') && (
                          <RpgButton
                            variant="cyan"
                            size="sm"
                            onClick={() => {
                              audioManager.playSfx('button');
                              setReforgeTargetUid(equippedItemForSlot.uid);
                            }}
                            title="Reforge Substats using Astral Anvil Cores (Lock up to 1 stat)"
                            className="font-display font-black uppercase"
                          >
                            <RefreshCw className="w-3.5 h-3.5" />
                            <span>Reforge</span>
                          </RpgButton>
                        )}
                        <RpgButton
                          variant="gold"
                          size="sm"
                          disabled={equippedItemForSlot.enhanceLevel >= 15}
                          onClick={() => handleEnhance(equippedItemForSlot.uid)}
                          className="font-display font-black uppercase"
                        >
                          <GameIcon name="forge" className="w-4 h-4" />
                          {equippedItemForSlot.enhanceLevel >= 15
                            ? 'MAX +15'
                            : `Forge +${equippedItemForSlot.enhanceLevel + 1}`}
                        </RpgButton>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => {
                            toggleGearLock(equippedItemForSlot.uid);
                            audioManager.playSfx('button');
                          }}
                          title={equippedItemForSlot.locked ? 'Unlock Gear' : 'Lock Gear (prevents accidental salvage)'}
                          className={`px-2 py-0.5 rounded-md border text-[10px] font-bold flex items-center gap-1 transition ${
                            equippedItemForSlot.locked
                              ? 'bg-amber-400/20 border-amber-300/70 text-amber-200'
                              : 'bg-slate-900 border-slate-700 text-slate-400 hover:text-amber-200'
                          }`}
                        >
                          {equippedItemForSlot.locked ? (
                            <Lock className="w-3 h-3" />
                          ) : (
                            <Unlock className="w-3 h-3" />
                          )}
                          <span>{equippedItemForSlot.locked ? 'Locked' : 'Lock'}</span>
                        </button>
                        <button
                          onClick={() => equipGear(heroDef.id, activeSlot, null)}
                          className="text-[10px] uppercase tracking-wider font-bold text-slate-400 hover:text-rose-300 transition"
                        >
                          Unequip
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Tiered Forge Material Cost Strip */}
                  {equippedItemForSlot.enhanceLevel < 15 && (() => {
                    const cost = getEnhanceCost(equippedItemForSlot);
                    return (
                      <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-white/10 text-[10px] font-mono">
                        <div className="flex items-center gap-2.5 flex-wrap">
                          <span className={gold >= cost.gold ? 'text-amber-300 font-bold' : 'text-rose-300 font-bold'}>
                            {cost.gold.toLocaleString()}g
                          </span>
                          <span className={`inline-flex items-center gap-1 font-bold ${forgeStones >= cost.forgeStones ? 'text-violet-300' : 'text-rose-300'}`}>
                            <MaterialIcon material="forgeStones" className="w-3.5 h-3.5" />
                            {forgeStones}/{cost.forgeStones}
                          </span>
                          {cost.starIronIngots > 0 && (
                            <span className={`inline-flex items-center gap-1 font-bold ${starIronIngots >= cost.starIronIngots ? 'text-sky-300' : 'text-rose-300'}`}>
                              <MaterialIcon material="starIronIngots" className="w-3.5 h-3.5" />
                              {starIronIngots}/{cost.starIronIngots}
                            </span>
                          )}
                          {cost.astralAnvilCores > 0 && (
                            <span className={`inline-flex items-center gap-1 font-bold ${astralAnvilCores >= cost.astralAnvilCores ? 'text-amber-200' : 'text-rose-300'}`}>
                              <MaterialIcon material="astralAnvilCores" className="w-3.5 h-3.5" />
                              {astralAnvilCores}/{cost.astralAnvilCores}
                            </span>
                          )}
                        </div>
                        <span
                          className={`px-1.5 py-0.5 rounded font-bold ${
                            cost.effectiveSuccessRate >= 1
                              ? 'bg-emerald-500/15 text-emerald-300'
                              : 'bg-amber-500/15 text-amber-300'
                          }`}
                        >
                          Rate {Math.round(cost.effectiveSuccessRate * 100)}%
                          {(equippedItemForSlot.forgePity ?? 0) > 0 && ' (+Pity)'}
                        </span>
                      </div>
                    );
                  })()}
                </div>
              )}

              {/* Slot Inventory */}
              <div className="space-y-1.5 overflow-y-auto pr-1 flex-1">
                {candidateGear.map((eq) => {
                  const isEquippedHere = eq.uid === equippedUidForSlot;
                  const wearerHero = eq.equippedHeroId ? HERO_MAP[eq.equippedHeroId] : null;
                  const wearerOwned = eq.equippedHeroId ? roster[eq.equippedHeroId] : null;
                  const wornByOther = Boolean(wearerHero && !isEquippedHere);
                  const salvage = getSalvageYield(eq);
                  return (
                    <div
                      key={eq.uid}
                      className={`rounded-xl p-2.5 border transition flex items-center justify-between gap-2 ${
                        isEquippedHere
                          ? 'bg-emerald-950/25 border-emerald-400/60 shadow-[0_0_14px_rgba(52,211,153,0.14)]'
                          : wornByOther
                            ? 'bg-cyan-950/20 border-cyan-400/45 hover:border-cyan-300/80'
                            : 'bg-slate-950/80 border-slate-700/70 hover:border-amber-400/45'
                      }`}
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div
                          className="relative w-10 h-10 rounded-xl bg-slate-900 border flex items-center justify-center shrink-0"
                          style={{
                            borderColor: `${RARITY_COLORS[eq.rarity]}88`,
                            boxShadow: `inset 0 0 10px ${RARITY_COLORS[eq.rarity]}28`,
                          }}
                        >
                          <EquipIcon slot={eq.slot} className="w-8 h-8" />
                          {wearerHero && (
                            <div
                              className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full overflow-hidden border-[1.5px] bg-slate-950 shadow-md"
                              style={{
                                borderColor: isEquippedHere ? '#34d399' : wearerHero.themeColor,
                              }}
                              title={`Equipped by ${wearerHero.name}`}
                            >
                              <ArtImage
                                kind="HERO"
                                id={wearerHero.id}
                                src={resolveHeroVisuals(wearerHero, wearerOwned).card}
                                alt={wearerHero.name}
                                className="w-full h-full object-cover object-top"
                              />
                            </div>
                          )}
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span
                              className="text-xs font-bold truncate"
                              style={{ color: RARITY_COLORS[eq.rarity] }}
                            >
                              {eq.name} +{eq.enhanceLevel}
                            </span>
                            <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-slate-900 border border-slate-700 text-slate-300 shrink-0">
                              {EQUIPMENT_SETS[eq.setId].name.replace(' Set', '')}
                            </span>
                          </div>
                          <div className="flex items-center gap-2 flex-wrap mt-0.5">
                            <span className="text-xs font-mono font-bold text-amber-200">
                              {formatStatValue(eq.mainStat.stat, getEnhancedMainStatValue(eq))}
                            </span>
                            {wearerHero && (
                              <span
                                className={`inline-flex items-center gap-1 pl-0.5 pr-2 py-0.5 rounded-full text-[9px] font-display font-black uppercase tracking-wider border ${
                                  isEquippedHere
                                    ? 'bg-emerald-500/20 border-emerald-400/60 text-emerald-200'
                                    : 'bg-cyan-500/20 border-cyan-400/65 text-cyan-200'
                                }`}
                              >
                                <span
                                  className="w-3.5 h-3.5 rounded-full overflow-hidden border shrink-0 bg-slate-950"
                                  style={{ borderColor: wearerHero.themeColor }}
                                >
                                  <ArtImage
                                    kind="HERO"
                                    id={wearerHero.id}
                                    src={resolveHeroVisuals(wearerHero, wearerOwned).card}
                                    alt={wearerHero.name}
                                    className="w-full h-full object-cover object-top"
                                  />
                                </span>
                                <span>
                                  {isEquippedHere ? `On ${wearerHero.name}` : `Used by ${wearerHero.name}`}
                                </span>
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0">
                        {(eq.rarity === 'EPIC' || eq.rarity === 'LEGENDARY') && (
                          <button
                            type="button"
                            onClick={() => {
                              audioManager.playSfx('button');
                              setReforgeTargetUid(eq.uid);
                            }}
                            title="Reforge Substats"
                            className="p-1.5 rounded-lg border bg-cyan-950/60 border-cyan-400/55 text-cyan-300 hover:border-cyan-200 hover:text-white transition"
                          >
                            <RefreshCw className="w-3.5 h-3.5" />
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => {
                            toggleGearLock(eq.uid);
                            audioManager.playSfx('button');
                          }}
                          title={eq.locked ? 'Unlock Gear' : 'Lock Gear (protect from salvage)'}
                          className={`p-1.5 rounded-lg border transition ${
                            eq.locked
                              ? 'bg-amber-400/20 border-amber-300/75 text-amber-300'
                              : 'bg-slate-900/90 border-slate-700 text-slate-500 hover:text-amber-200'
                          }`}
                        >
                          {eq.locked ? <Lock className="w-3.5 h-3.5" /> : <Unlock className="w-3.5 h-3.5" />}
                        </button>
                        {!isEquippedHere ? (
                          <RpgButton
                            variant={wornByOther ? 'gold' : 'cyan'}
                            size="xs"
                            title={
                              wearerHero
                                ? `Transfer from ${wearerHero.name} to ${heroDef.name}`
                                : `Equip on ${heroDef.name}`
                            }
                            onClick={() => {
                              equipGear(heroDef.id, activeSlot, eq.uid);
                              audioManager.playSfx('button');
                            }}
                          >
                            {wornByOther ? 'Swap' : 'Equip'}
                          </RpgButton>
                        ) : (
                          <span className="px-2.5 py-1 rounded-lg bg-emerald-500/20 border border-emerald-400/45 text-emerald-300 text-[10px] font-black">
                            EQUIPPED
                          </span>
                        )}
                        {!eq.equippedHeroId && !eq.locked && (
                          <RpgButton
                            variant="slate"
                            size="xs"
                            onClick={() => {
                              salvageGear(eq.uid);
                              audioManager.playSfx('button');
                            }}
                            title={`Salvage for +${salvage.gold}g, +${salvage.forgeStones} Stones${salvage.starIronIngots ? `, +${salvage.starIronIngots} Ingots` : ''}${salvage.astralAnvilCores ? `, +${salvage.astralAnvilCores} Anvil Core` : ''}`}
                            className="!px-2 hover:!border-rose-400 hover:!text-rose-200"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </RpgButton>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {rightTab === 'RELIC' && (
            <div className="flex-1 space-y-2.5 overflow-y-auto pr-1">
              {ownedRelics.length === 0 ? (
                <div className="rpg-ornate-card p-5 text-center space-y-3 border-cyan-400/40">
                  <CornerFiligree color="#38e8ff" size={8} opacity={0.65} />
                  <div className="w-14 h-14 mx-auto rounded-2xl bg-cyan-500/15 border border-cyan-400/50 flex items-center justify-center">
                    <GameIcon name="relic" className="w-9 h-9" />
                  </div>
                  <div>
                    <h3 className="font-display text-base font-black text-white">
                      No Starlight Relics Acquired Yet
                    </h3>
                    <p className="text-xs text-slate-300 mt-1 leading-relaxed">
                      Relics are earned through combat exploration! Clear{' '}
                      <strong className="text-amber-300">Stage 1-4 (Mini-Boss)</strong> for your
                      first guaranteed Relic, challenge{' '}
                      <strong className="text-fuchsia-300">Region Bosses (X-12)</strong> for SR &
                      SSR Relics, or craft any Relic using Boss Fragments in the Relic Vault.
                    </p>
                  </div>
                  <div className="flex justify-center">
                    <RpgButton
                      variant="cyan"
                      size="sm"
                      onClick={() => {
                        audioManager.playSfx('button');
                        onOpenShop('RELIC');
                      }}
                    >
                      <ShoppingBag className="w-3.5 h-3.5" /> Open Relic Vault (Shop)
                    </RpgButton>
                  </div>
                </div>
              ) : (
                ownedRelics.map((rid) => {
                  const r = RELIC_MAP[rid];
                  if (!r) return null;
                  const equippedHere = ownedHero.equippedRelicId === rid;
                  const wearerId =
                    Object.keys(roster).find((hid) => roster[hid]?.equippedRelicId === rid) ?? null;
                  const wearerHero = wearerId ? HERO_MAP[wearerId] : null;
                  const wearerOwned = wearerId ? roster[wearerId] : null;
                  const wornByOther = Boolean(wearerHero && !equippedHere);
                  const rank = relicRanks[rid] ?? 1;
                  const rankPct = (rank - 1) * 15;
                  return (
                    <div
                      key={rid}
                      className={`rounded-xl p-3 border flex gap-3 items-center transition ${
                        equippedHere
                          ? 'bg-amber-500/15 border-amber-400 shadow-[0_0_16px_rgba(245,200,76,0.2)]'
                          : wornByOther
                            ? 'bg-cyan-950/25 border-cyan-400/55 hover:border-cyan-300'
                            : 'bg-slate-950/80 border-slate-700/75 hover:border-amber-400/40'
                      }`}
                    >
                      <div className="relative w-16 aspect-[3/4] rounded-lg overflow-hidden border border-white/20 shrink-0">
                        <ArtImage
                          kind="RELIC"
                          id={rid}
                          src={r.assetCard}
                          alt={r.name}
                          className="w-full h-full object-cover"
                        />
                        {wearerHero && (
                          <div
                            className="absolute top-1 right-1 w-6 h-6 rounded-full overflow-hidden border-2 bg-slate-950 shadow-[0_2px_8px_rgba(0,0,0,0.9)]"
                            style={{
                              borderColor: equippedHere ? '#fde047' : wearerHero.themeColor,
                            }}
                            title={`Equipped by ${wearerHero.name}`}
                          >
                            <ArtImage
                              kind="HERO"
                              id={wearerHero.id}
                              src={resolveHeroVisuals(wearerHero, wearerOwned).card}
                              alt={wearerHero.name}
                              className="w-full h-full object-cover object-top"
                            />
                          </div>
                        )}
                        <span className="absolute bottom-0 inset-x-0 bg-black/85 text-[9px] font-mono font-black text-center text-cyan-300">
                          R{rank}/{MAX_RELIC_RANK}
                        </span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="text-[10px] font-display font-black text-amber-300">
                            {r.tier}
                          </span>
                          <span className="font-display font-bold text-sm text-white truncate">
                            {r.name}
                          </span>
                          {rank > 1 && (
                            <span className="px-1.5 py-0.5 rounded bg-cyan-500/20 border border-cyan-400/40 text-[9px] font-mono font-bold text-cyan-200">
                              +{rankPct}% Stats
                            </span>
                          )}
                        </div>
                        {wearerHero && (
                          <div className="mt-1">
                            <span
                              className={`inline-flex items-center gap-1.5 pl-0.5 pr-2 py-0.5 rounded-full text-[9px] font-display font-black uppercase tracking-wider border ${
                                equippedHere
                                  ? 'bg-emerald-500/20 border-emerald-400/60 text-emerald-200'
                                  : 'bg-cyan-500/20 border-cyan-400/65 text-cyan-200'
                              }`}
                            >
                              <span
                                className="w-4 h-4 rounded-full overflow-hidden border shrink-0 bg-slate-950"
                                style={{ borderColor: wearerHero.themeColor }}
                              >
                                <ArtImage
                                  kind="HERO"
                                  id={wearerHero.id}
                                  src={resolveHeroVisuals(wearerHero, wearerOwned).card}
                                  alt={wearerHero.name}
                                  className="w-full h-full object-cover object-top"
                                />
                              </span>
                              <span>
                                {equippedHere
                                  ? `Equipped on ${wearerHero.name}`
                                  : `Used by ${wearerHero.name}`}
                              </span>
                            </span>
                          </div>
                        )}
                        <p className="text-xs text-slate-300 mt-1 leading-snug">{r.passiveDesc}</p>
                        <div className="mt-2">
                          <RpgButton
                            variant={equippedHere ? 'rose' : wornByOther ? 'cyan' : 'gold'}
                            size="xs"
                            onClick={() => {
                              equipRelic(heroDef.id, equippedHere ? null : rid);
                              audioManager.playSfx('button');
                            }}
                            className="uppercase font-display font-black"
                          >
                            {equippedHere
                              ? 'Unequip'
                              : wearerHero
                                ? `Swap from ${wearerHero.name}`
                                : 'Equip Relic'}
                          </RpgButton>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          )}

          {rightTab === 'PETS' && (
            <div className="flex-1 space-y-2.5 overflow-y-auto pr-1">
              {ownedPetCount === 0 ? (
                <div className="rpg-ornate-card p-5 text-center space-y-3 border-cyan-400/45">
                  <CornerFiligree color="#38e8ff" size={8} opacity={0.65} />
                  <div className="text-3xl">🐾</div>
                  <div>
                    <h3 className="font-display text-base font-black text-white">
                      No Starlight Companion Pets Yet
                    </h3>
                    <p className="text-xs text-slate-300 mt-1 leading-relaxed">
                      Summon <strong className="text-amber-300">Aetherion (SSR)</strong>,{' '}
                      <strong className="text-orange-300">Cinderfang (SR)</strong>, or{' '}
                      <strong className="text-cyan-300">Lumina (R)</strong> from the Pet Sanctuary!
                      Equipped Pets grant squad-wide auras and cast auto-skills in combat.
                    </p>
                  </div>
                  {onOpenGacha && (
                    <div className="flex justify-center">
                      <RpgButton
                        variant="cyan"
                        size="sm"
                        onClick={() => {
                          audioManager.playSfx('button');
                          onOpenGacha();
                        }}
                      >
                        <Sparkles className="w-3.5 h-3.5" /> Open Pet Summon →
                      </RpgButton>
                    </div>
                  )}
                </div>
              ) : (
                PETS.map((pet) => {
                  const owned = petsMap[pet.id];
                  if (!owned) return null;
                  const isEquipped = activePetId === pet.id;
                  const auraPills = formatPetAuraSummary(pet, owned);
                  const lv1 = getPetLevelUpCost(owned.level, 1);
                  const lv5 = getPetLevelUpCost(owned.level, 5);
                  const canLv1 =
                    owned.level < MAX_PET_LEVEL && expPotions >= lv1.potions && gold >= lv1.gold;
                  const canLv5 =
                    owned.level < MAX_PET_LEVEL && expPotions >= lv5.potions && gold >= lv5.gold;
                  return (
                    <div
                      key={pet.id}
                      className={`rounded-xl p-3 border flex flex-col gap-2 transition ${
                        isEquipped
                          ? 'bg-cyan-500/15 border-cyan-300 shadow-[0_0_20px_rgba(56,232,255,0.22)]'
                          : 'bg-slate-950/80 border-slate-700/75 hover:border-cyan-400/45'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div
                          className="relative w-16 h-16 rounded-xl border-2 shrink-0 flex items-center justify-center bg-slate-900/90 overflow-hidden p-1"
                          style={{ borderColor: `${pet.themeColor}aa` }}
                        >
                          <ArtImage
                            kind="PET"
                            id={pet.id}
                            src={pet.assets.sprite}
                            alt={pet.name}
                            className="w-full h-full object-contain"
                          />
                          <span className="absolute bottom-0 inset-x-0 bg-black/85 text-[8px] font-mono font-black text-center text-cyan-200">
                            R{owned.rank}/{MAX_PET_RANK}
                          </span>
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <RarityCrest tier={pet.tier} size="xs" />
                            <span className="font-display font-black text-sm text-white truncate">
                              {pet.name}
                            </span>
                            <span className="text-[10px] font-mono font-bold text-cyan-300">
                              Lv.{owned.level}/{MAX_PET_LEVEL}
                            </span>
                          </div>
                          <div className="flex flex-wrap gap-1 mt-1">
                            {auraPills.map((pill) => (
                              <span
                                key={pill}
                                className="px-1.5 py-0.5 rounded bg-amber-400/15 border border-amber-300/40 text-[9px] font-mono font-bold text-amber-200"
                              >
                                {pill}
                              </span>
                            ))}
                          </div>
                          <p className="text-[11px] text-slate-300 mt-1 leading-snug">
                            <strong className="text-cyan-300">{pet.activeSkill.name}</strong> ({pet.activeSkill.cooldown}s):{' '}
                            {pet.activeSkill.description}
                          </p>
                        </div>
                      </div>
                      <div className="flex flex-wrap items-center justify-between gap-2 pt-1.5 border-t border-white/10">
                        <div className="flex items-center gap-1.5">
                          <RpgButton
                            variant="emerald"
                            size="xs"
                            disabled={!canLv1}
                            onClick={() => {
                              const res = levelUpPet(pet.id, 1);
                              showNotice(res.message, res.ok ? 'ok' : 'warn');
                              audioManager.playSfx(res.ok ? 'forge' : 'button');
                            }}
                          >
                            +1 Lv ({lv1.potions}🍼 {lv1.gold}g)
                          </RpgButton>
                          {owned.level <= MAX_PET_LEVEL - 2 && (
                            <RpgButton
                              variant="slate"
                              size="xs"
                              disabled={!canLv5}
                              onClick={() => {
                                const res = levelUpPet(pet.id, 5);
                                showNotice(res.message, res.ok ? 'ok' : 'warn');
                                audioManager.playSfx(res.ok ? 'forge' : 'button');
                              }}
                            >
                              +5 Lv
                            </RpgButton>
                          )}
                        </div>
                        <RpgButton
                          variant={isEquipped ? 'rose' : 'cyan'}
                          size="xs"
                          onClick={() => {
                            equipPet(isEquipped ? null : pet.id);
                            audioManager.playSfx('button');
                            showNotice(
                              isEquipped
                                ? `${pet.name} unequipped from squad.`
                                : `${pet.name} deployed as active Squad Companion!`,
                              'ok',
                            );
                          }}
                          className="uppercase font-display font-black"
                        >
                          {isEquipped ? 'Unequip Pet' : 'Deploy Pet'}
                        </RpgButton>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          )}

          {rightTab === 'SKILLS' && <SkillInspector hero={heroDef} owned={ownedHero} />}
        </section>
      </main>

      <PartyManagerModal open={showPartyModal} onClose={() => setShowPartyModal(false)} />

      <AwakenModal
        open={showAwakenModal}
        hero={heroDef}
        owned={ownedHero}
        onClose={() => setShowAwakenModal(false)}
        onAwakened={(nextStar, msg) => {
          triggerUpgradeFx(`AWAKENED ★${nextStar}!`, '#e879f9');
          showNotice(msg, 'ok');
        }}
        onSwitchToTranscend={() => setShowTranscendModal(true)}
        onOpenShop={onOpenShop}
        onOpenDungeon={onOpenDungeon}
      />

      <LevelUpModal
        open={showLevelUpModal}
        hero={heroDef}
        owned={ownedHero}
        onClose={() => setShowLevelUpModal(false)}
        onLeveledUp={(newLevel, msg) => {
          triggerUpgradeFx(`LEVEL ${newLevel}!`, '#34d399');
          showNotice(msg, 'ok');
        }}
        onSwitchToAwaken={() => setShowAwakenModal(true)}
        onSwitchToTranscend={() => setShowTranscendModal(true)}
        onOpenShop={onOpenShop}
        onOpenDungeon={onOpenDungeon}
      />

      <TranscendModal
        open={showTranscendModal}
        hero={heroDef}
        owned={ownedHero}
        onClose={() => setShowTranscendModal(false)}
        onTranscended={(msg) => {
          triggerUpgradeFx('❖ TRANSCENDED! ❖', '#fde047');
          showNotice(msg, 'ok');
        }}
        onOpenShop={onOpenShop}
        onOpenDungeon={onOpenDungeon}
      />

      <ConstellationModal
        open={showConstellationModal}
        hero={heroDef}
        owned={ownedHero}
        onClose={() => setShowConstellationModal(false)}
        onUpgraded={(newLevel, msg) => {
          triggerUpgradeFx(`✦ CONSTELLATION C${newLevel}!`, '#38e8ff');
          showNotice(msg, 'ok');
        }}
        onOpenShop={onOpenShop}
      />

      <GearReforgeModal
        open={Boolean(reforgeTargetItem)}
        item={reforgeTargetItem}
        onClose={() => setReforgeTargetUid(null)}
        onApplied={(msg) => {
          triggerUpgradeFx('✦ SUBSTATS REFORGED!', '#38e8ff');
          showNotice(msg, 'ok');
        }}
      />
    </div>
  );
};
