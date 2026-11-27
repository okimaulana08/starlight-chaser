import React, { useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import {
  Crown,
  Heart,
  ShoppingBag,
  Sparkles,
  Star,
  Trash2,
  TrendingUp,
  Users,
} from 'lucide-react';
import {
  EQUIPMENT_SETS,
  EQUIPMENT_SLOTS,
  RARITY_COLORS,
  formatStatValue,
  getEnhancedMainStatValue,
} from '../data/equipment';
import { FACTIONS } from '../data/factions';
import { HEROES, HERO_MAP } from '../data/heroes';
import {
  getAwakeningCost,
  getHeroLevelCap,
  getLevelUpCost,
} from '../data/materials';
import { RELIC_MAP } from '../data/relics';
import { audioManager } from '../engine/AudioManager';
import { computeHeroStats, getActiveFactionBonuses } from '../engine/CombatMath';
import { MAX_RELIC_RANK, usePlayerStore } from '../store/usePlayerStore';
import { getEnhanceCost, getSalvageYield } from '../systems/ForgeSystem';
import type { EquipmentSlot } from '../types/game';
import { ArtImage } from './ArtImage';
import { EquipIcon, GameIcon, MaterialIcon } from './GameIcon';
import { AwakenModal, LevelUpModal } from './HeroGrowthModals';
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
}

export const SquadScreen: React.FC<SquadScreenProps> = ({ onBack, onOpenShop }) => {
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
    equipmentInventory,
    unlockedCodexIds,
    giveBondGift,
    equipRelic,
    equipGear,
    enhanceGear,
    salvageGear,
  } = usePlayerStore();

  const [selectedHeroId, setSelectedHeroId] = useState<string>(squadIds[0]);
  const [rightTab, setRightTab] = useState<'GEAR' | 'RELIC' | 'SKILLS'>('GEAR');
  const [activeSlot, setActiveSlot] = useState<EquipmentSlot>('WEAPON');
  const [statusMessage, setStatusMessage] = useState<{ text: string; tone: 'ok' | 'warn' } | null>(null);
  const [upgradePulse, setUpgradePulse] = useState<{ id: number; label: string; color: string } | null>(null);
  const [showPartyModal, setShowPartyModal] = useState(false);
  const [showAwakenModal, setShowAwakenModal] = useState(false);
  const [showLevelUpModal, setShowLevelUpModal] = useState(false);

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
  const activePreset = partyPresets[activePresetIndex] ?? partyPresets[0];

  const computed = useMemo(
    () =>
      computeHeroStats(
        heroDef,
        ownedHero,
        equipmentInventory,
        squadIds,
        unlockedCodexIds.length,
        relicRanks,
      ),
    [heroDef, ownedHero, equipmentInventory, squadIds, unlockedCodexIds.length, relicRanks],
  );

  const factionBonuses = useMemo(() => getActiveFactionBonuses(squadIds), [squadIds]);
  const equippedUidForSlot = ownedHero.equippedGear[activeSlot];
  const equippedItemForSlot =
    equipmentInventory.find((e) => e.uid === equippedUidForSlot) ?? null;
  const candidateGear = equipmentInventory
    .filter((e) => e.slot === activeSlot)
    .sort((a, b) => {
      const rank = { LEGENDARY: 4, EPIC: 3, RARE: 2, COMMON: 1 };
      return rank[b.rarity] - rank[a.rarity] || b.enhanceLevel - a.enhanceLevel;
    });

  const levelCap = getHeroLevelCap(ownedHero.awakening);
  const lv1Cost = getLevelUpCost(ownedHero.level, 1, ownedHero.awakening);
  const awakenCost = getAwakeningCost(ownedHero.awakening, heroDef.tier);
  const ownedHeroEssence = factionEssences[heroDef.faction] ?? 0;

  const canLevelUpQuick =
    ownedHero.level < 80 &&
    !lv1Cost.atAwakenCap &&
    expPotions >= lv1Cost.potions &&
    gold >= lv1Cost.gold;
  const canAwakenWithMats = Boolean(
    awakenCost &&
      ownedHeroEssence >= awakenCost.essences &&
      starCores >= awakenCost.starCores &&
      gold >= awakenCost.gold,
  );
  const canAwakenWithShards = Boolean(
    awakenCost && ownedHero.shards >= awakenCost.shardAltCost && gold >= awakenCost.shardAltGold,
  );
  const canAwakenReady = canAwakenWithMats || canAwakenWithShards;

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
                      src={h.assets.card}
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

          {factionBonuses.map((fb) => (
            <span
              key={fb.faction}
              className="hidden 2xl:inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-black uppercase border bg-slate-950/85 shrink-0"
              style={{
                borderColor: FACTIONS[fb.faction].color,
                color: FACTIONS[fb.faction].color,
              }}
            >
              <Crown className="w-3 h-3" />
              {FACTIONS[fb.faction].name.split(' ')[0]} ({fb.count})
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
                    src={h.assets.card}
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
                  <div className="text-xs font-bold text-white truncate">{h.name}</div>
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
              key={heroDef.id}
              initial={{ opacity: 0, x: -16, scale: 0.96 }}
              animate={{ opacity: 1, x: 0, scale: 1 }}
              transition={{ type: 'spring', stiffness: 320, damping: 26 }}
              className="relative z-10 h-[195px] sm:h-[46dvh] md:h-[325px] max-h-[360px] flex items-end justify-center animate-breathe"
            >
              <ArtImage
                kind="HERO"
                id={heroDef.id}
                src={heroDef.assets.standing}
                alt={heroDef.name}
                className={
                  heroDef.assets.standing.includes('/assets/standing/')
                    ? 'h-full w-auto object-contain object-bottom'
                    : 'w-full h-full object-cover object-top hero-radial-feather'
                }
                style={
                  heroDef.assets.standing.includes('/assets/standing/')
                    ? {
                        filter: `drop-shadow(0 14px 24px rgba(4,6,16,0.9)) drop-shadow(0 0 16px ${heroDef.themeColor}44)`,
                      }
                    : undefined
                }
              />
            </motion.div>

            {/* Hero Name & Awakening Crest Overlay */}
            <div
              className="absolute top-0 left-0 rpg-ornate-card px-3 py-2 backdrop-blur-md"
              style={{ borderLeft: `3px solid ${heroDef.themeColor}` }}
            >
              <CornerFiligree color={heroDef.themeColor} size={7} opacity={0.65} />
              <div className="flex items-center gap-1.5">
                <RarityCrest tier={heroDef.tier} size="sm" />
                <RoleBadge role={heroDef.role} variant="pill" size="sm" />
              </div>
              <h2 className="font-display text-xl sm:text-2xl font-black text-white text-glow-gold leading-tight mt-1">
                {heroDef.name}
              </h2>
              <div className="flex items-center gap-0.5 mt-0.5">
                {Array.from({ length: 6 }, (_, i) => (
                  <Star
                    key={i}
                    className={`w-3 h-3 ${
                      i < ownedHero.awakening
                        ? 'text-fuchsia-400 fill-fuchsia-400 drop-shadow-[0_0_6px_rgba(232,121,249,0.8)]'
                        : 'text-slate-700'
                    }`}
                  />
                ))}
                <span className="ml-2 text-xs font-mono font-bold text-cyan-300">
                  Lv.{ownedHero.level}/{levelCap}
                </span>
              </div>
              <div className="text-[11px] font-extrabold text-amber-300 mt-0.5">
                PWR <AnimatedNumber value={computed.powerRating} className="text-sm font-bold text-amber-200" />
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

            {/* Growth Action Buttons (Popup Modals for Level Up & Awakening!) */}
            <div className="grid grid-cols-3 gap-2">
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
                { key: 'SKILLS', label: 'Skills', icon: 'heroes' },
              ]}
            />
          </div>

          {rightTab === 'GEAR' && (
            <div className="flex-1 flex flex-col gap-3 min-h-0">
              <div className="rounded-xl bg-slate-950/75 border border-amber-400/20 px-3 py-2 text-[11px]">
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
                      <button
                        onClick={() => equipGear(heroDef.id, activeSlot, null)}
                        className="text-[10px] uppercase tracking-wider font-bold text-slate-400 hover:text-rose-300 transition"
                      >
                        Unequip
                      </button>
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
                  const salvage = getSalvageYield(eq);
                  return (
                    <div
                      key={eq.uid}
                      className="rounded-xl p-2.5 bg-slate-950/80 border border-slate-700/70 hover:border-amber-400/45 transition flex items-center justify-between gap-2"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div
                          className="w-10 h-10 rounded-xl bg-slate-900 border flex items-center justify-center shrink-0"
                          style={{
                            borderColor: `${RARITY_COLORS[eq.rarity]}88`,
                            boxShadow: `inset 0 0 10px ${RARITY_COLORS[eq.rarity]}28`,
                          }}
                        >
                          <EquipIcon slot={eq.slot} className="w-8 h-8" />
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5">
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
                          <div className="text-xs font-mono font-bold text-amber-200">
                            {formatStatValue(eq.mainStat.stat, getEnhancedMainStatValue(eq))}
                          </div>
                          {eq.equippedHeroId && eq.equippedHeroId !== heroDef.id && (
                            <div className="text-[10px] text-cyan-300">
                              Worn by {HERO_MAP[eq.equippedHeroId]?.name}
                            </div>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0">
                        {!isEquippedHere ? (
                          <RpgButton
                            variant="cyan"
                            size="xs"
                            onClick={() => {
                              equipGear(heroDef.id, activeSlot, eq.uid);
                              audioManager.playSfx('button');
                            }}
                          >
                            Equip
                          </RpgButton>
                        ) : (
                          <span className="px-2.5 py-1 rounded-lg bg-emerald-500/20 border border-emerald-400/45 text-emerald-300 text-[10px] font-black">
                            EQUIPPED
                          </span>
                        )}
                        {!eq.equippedHeroId && (
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
                  const rank = relicRanks[rid] ?? 1;
                  const rankPct = (rank - 1) * 15;
                  return (
                    <div
                      key={rid}
                      className={`rounded-xl p-3 border flex gap-3 items-center transition ${
                        equippedHere
                          ? 'bg-amber-500/15 border-amber-400 shadow-[0_0_16px_rgba(245,200,76,0.2)]'
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
                        <p className="text-xs text-slate-300 mt-1 leading-snug">{r.passiveDesc}</p>
                        <div className="mt-2">
                          <RpgButton
                            variant={equippedHere ? 'rose' : 'gold'}
                            size="xs"
                            onClick={() => {
                              equipRelic(heroDef.id, equippedHere ? null : rid);
                              audioManager.playSfx('button');
                            }}
                            className="uppercase font-display font-black"
                          >
                            {equippedHere ? 'Unequip' : 'Equip Relic'}
                          </RpgButton>
                        </div>
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
        onOpenShop={onOpenShop}
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
        onOpenShop={onOpenShop}
      />
    </div>
  );
};
