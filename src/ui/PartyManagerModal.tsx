import React, { useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import {
  ArrowLeftRight,
  Check,
  Crown,
  Edit3,
  Shield,
  Sparkles,
  Users,
  Wand2,
  X,
} from 'lucide-react';
import { FACTIONS } from '../data/factions';
import { HEROES, HERO_MAP } from '../data/heroes';
import { audioManager } from '../engine/AudioManager';
import { computeHeroStats, getActiveFactionBonuses } from '../engine/CombatMath';
import { usePlayerStore } from '../store/usePlayerStore';
import type { Role } from '../types/game';
import { ArtImage } from './ArtImage';
import { AnimatedNumber, CornerFiligree, RpgButton } from './RpgKit';
import { RarityCrest, RoleBadge } from './RoleBadge';

interface PartyManagerModalProps {
  open: boolean;
  onClose: () => void;
}

const SLOT_LABELS = [
  { short: 'S1', title: 'Frontline', hint: 'Lead / Tank' },
  { short: 'S2', title: 'Vanguard', hint: 'Primary DPS' },
  { short: 'S3', title: 'Flanker', hint: 'Sub-DPS / CC' },
  { short: 'S4', title: 'Support', hint: 'Healer / Buffer' },
];

const ROLE_FILTERS: Array<'ALL' | Role> = ['ALL', 'TANK', 'ASSAULT', 'RANGER', 'MAGE', 'HEALER'];

export const PartyManagerModal: React.FC<PartyManagerModalProps> = ({ open, onClose }) => {
  const {
    partyPresets,
    activePresetIndex,
    roster,
    equipmentInventory,
    unlockedCodexIds,
    relicRanks,
    selectPreset,
    renamePreset,
    setPresetSlot,
    swapPresetSlots,
    autoFillPreset,
  } = usePlayerStore();

  const [selectedSlot, setSelectedSlot] = useState<number>(0);
  const [roleFilter, setRoleFilter] = useState<'ALL' | Role>('ALL');
  const [sortBy, setSortBy] = useState<'PWR' | 'LV' | 'TIER'>('PWR');
  const [editingName, setEditingName] = useState(false);
  const [draftName, setDraftName] = useState('');

  const activePreset = partyPresets[activePresetIndex] ?? partyPresets[0];
  const currentHeroIds = activePreset.heroIds;

  const powerMap = useMemo(() => {
    const map: Record<string, number> = {};
    for (const h of HEROES) {
      const own = roster[h.id];
      if (!own) continue;
      map[h.id] = computeHeroStats(
        h,
        own,
        equipmentInventory,
        currentHeroIds,
        unlockedCodexIds.length,
        relicRanks,
      ).powerRating;
    }
    return map;
  }, [roster, equipmentInventory, currentHeroIds, unlockedCodexIds.length, relicRanks]);

  const totalPower = useMemo(
    () => currentHeroIds.reduce((sum, id) => sum + (powerMap[id] ?? 0), 0),
    [currentHeroIds, powerMap],
  );

  const factionBonuses = useMemo(
    () => getActiveFactionBonuses(currentHeroIds),
    [currentHeroIds],
  );

  const roleCounts = useMemo(() => {
    const counts: Record<Role, number> = {
      TANK: 0,
      ASSAULT: 0,
      RANGER: 0,
      MAGE: 0,
      HEALER: 0,
    };
    for (const id of currentHeroIds) {
      const def = HERO_MAP[id];
      if (def) counts[def.role] += 1;
    }
    return counts;
  }, [currentHeroIds]);

  const filteredRoster = useMemo(() => {
    const tierOrder = { UR: 4, SSR: 3, SR: 2, R: 1 };
    return HEROES.filter((h) => Boolean(roster[h.id]))
      .filter((h) => roleFilter === 'ALL' || h.role === roleFilter)
      .sort((a, b) => {
        if (sortBy === 'PWR') return (powerMap[b.id] ?? 0) - (powerMap[a.id] ?? 0);
        if (sortBy === 'LV') return (roster[b.id]?.level ?? 0) - (roster[a.id]?.level ?? 0);
        return tierOrder[b.tier] - tierOrder[a.tier] || (powerMap[b.id] ?? 0) - (powerMap[a.id] ?? 0);
      });
  }, [roster, roleFilter, sortBy, powerMap]);

  const handleSlotClick = (slotIdx: number) => {
    audioManager.playSfx('button');
    if (selectedSlot === slotIdx) return;
    setSelectedSlot(slotIdx);
  };

  const handleHeroPick = (heroId: string) => {
    const existingIdx = currentHeroIds.indexOf(heroId);
    if (existingIdx === selectedSlot) {
      audioManager.playSfx('button');
      return;
    }
    if (existingIdx !== -1) {
      swapPresetSlots(activePresetIndex, existingIdx, selectedSlot);
    } else {
      setPresetSlot(activePresetIndex, selectedSlot, heroId);
    }
    audioManager.playSfx('forge');
  };

  const beginRename = () => {
    setDraftName(activePreset.name);
    setEditingName(true);
  };

  const commitRename = () => {
    if (draftName.trim()) {
      renamePreset(activePresetIndex, draftName);
    }
    setEditingName(false);
    audioManager.playSfx('button');
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="fixed inset-0 z-50 bg-[#030510]/85 backdrop-blur-md flex items-center justify-center p-2 sm:p-4 select-none"
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.94, y: 16 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 12 }}
            transition={{ type: 'spring', stiffness: 360, damping: 28 }}
            onClick={(e) => e.stopPropagation()}
            className="relative rpg-panel w-full max-w-5xl max-h-[92dvh] flex flex-col overflow-hidden border-amber-400/55 shadow-[0_24px_60px_rgba(0,0,0,0.85)]"
          >
            <CornerFiligree color="#f5c84c" size={11} opacity={0.75} />

            {/* TOP HEADER + 3 PRESET TABS */}
            <div className="shrink-0 px-3 sm:px-5 pt-3 sm:pt-4 pb-2.5 border-b border-amber-400/20 bg-slate-950/65 flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-amber-400/25 to-cyan-500/20 border border-amber-300/60 flex items-center justify-center">
                  <Users className="w-5 h-5 text-amber-300" />
                </div>
                <div>
                  <h2 className="font-display text-base sm:text-xl font-black text-white tracking-[0.12em] text-glow-gold leading-none">
                    PARTY FORMATION
                  </h2>
                  <p className="text-[10px] sm:text-xs text-slate-300 mt-0.5">
                    Tap a slot (S1–S4), then tap any Chaser below to deploy or swap
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <RpgButton
                  variant="cyan"
                  size="sm"
                  onClick={() => {
                    autoFillPreset(activePresetIndex);
                    audioManager.playSfx('ssr_reveal');
                  }}
                >
                  <Wand2 className="w-3.5 h-3.5" /> Auto-Fill Best
                </RpgButton>
                <button
                  onClick={() => {
                    audioManager.playSfx('button');
                    onClose();
                  }}
                  className="p-2 rounded-xl bg-slate-900/90 border border-slate-700 text-slate-300 hover:text-amber-300 hover:border-amber-400/60 transition"
                  title="Close Party Manager"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* 3-SLOT PARTY PRESET BAR + TOTAL POWER & SYNERGIES */}
            <div className="shrink-0 px-3 sm:px-5 py-2.5 bg-slate-950/45 border-b border-slate-800/80 flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-1.5 flex-wrap">
                {partyPresets.map((preset, idx) => {
                  const presetIdx = idx as 0 | 1 | 2;
                  const active = activePresetIndex === presetIdx;
                  return (
                    <button
                      key={preset.id}
                      onClick={() => {
                        setEditingName(false);
                        selectPreset(presetIdx);
                        audioManager.playSfx('button');
                      }}
                      className={`relative px-3 py-1.5 rounded-xl text-xs font-display font-bold tracking-wider transition flex items-center gap-1.5 border ${
                        active
                          ? 'text-slate-950 border-amber-200 shadow-[0_0_18px_rgba(245,200,76,0.45)]'
                          : 'bg-slate-900/85 border-slate-700/80 text-slate-300 hover:border-amber-400/50 hover:text-white'
                      }`}
                    >
                      {active && (
                        <motion.span
                          layoutId="party-preset-pill"
                          transition={{ type: 'spring', stiffness: 420, damping: 32 }}
                          className="absolute inset-0 rounded-xl bg-gradient-to-r from-amber-300 via-yellow-300 to-amber-400 -z-0"
                        />
                      )}
                      <span className="relative z-10 font-mono font-black text-[10px] opacity-80">
                        P{idx + 1}
                      </span>
                      <span className="relative z-10">{preset.name}</span>
                    </button>
                  );
                })}

                {editingName ? (
                  <div className="flex items-center gap-1 bg-slate-950 border border-amber-400/60 rounded-xl px-2 py-1">
                    <input
                      value={draftName}
                      onChange={(e) => setDraftName(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') commitRename();
                        if (e.key === 'Escape') setEditingName(false);
                      }}
                      maxLength={18}
                      autoFocus
                      className="bg-transparent text-xs text-white font-bold outline-none w-28"
                      placeholder="Preset name..."
                    />
                    <button
                      onClick={commitRename}
                      className="text-emerald-400 hover:text-emerald-300"
                      title="Save Name"
                    >
                      <Check className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={beginRename}
                    className="px-2 py-1.5 rounded-xl bg-slate-900/75 border border-slate-700/75 text-slate-300 hover:text-amber-300 hover:border-amber-400/50 text-[10px] font-bold flex items-center gap-1 transition"
                    title="Rename Active Preset"
                  >
                    <Edit3 className="w-3 h-3" /> Rename
                  </button>
                )}
              </div>

              {/* Total Squad Power & Synergy Readout */}
              <div className="flex flex-wrap items-center gap-2">
                {factionBonuses.map((fb) => (
                  <span
                    key={fb.faction}
                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-display font-black uppercase border bg-slate-950/90"
                    style={{
                      borderColor: FACTIONS[fb.faction].color,
                      color: FACTIONS[fb.faction].color,
                    }}
                  >
                    <Crown className="w-3 h-3" />
                    {FACTIONS[fb.faction].name.split(' ')[0]} ({fb.count}/3)
                  </span>
                ))}
                <div className="px-3 py-1 rounded-xl bg-slate-950/90 border border-amber-400/35 flex items-center gap-2">
                  <span className="text-[10px] font-display uppercase tracking-widest text-slate-400 font-bold">
                    Squad PWR
                  </span>
                  <AnimatedNumber
                    value={totalPower}
                    className="text-sm sm:text-base font-black text-amber-300"
                  />
                </div>
              </div>
            </div>

            {/* BODY: 4 FORMATION PEDESTAL CARDS + OWNED CHASER GRID */}
            <div className="flex-1 min-h-0 overflow-y-auto p-3 sm:p-5 space-y-4">
              {/* 4 ACTIVE FORMATION SLOTS */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-3">
                {currentHeroIds.map((hid, idx) => {
                  const hero = HERO_MAP[hid];
                  const owned = roster[hid];
                  if (!hero || !owned) return null;
                  const isSel = selectedSlot === idx;
                  const meta = SLOT_LABELS[idx];

                  return (
                    <motion.div
                      key={`${activePresetIndex}_${idx}`}
                      layout
                      whileHover={{ y: -2 }}
                      onClick={() => handleSlotClick(idx)}
                      className={`relative rounded-2xl p-2.5 border-2 cursor-pointer transition overflow-hidden ${
                        isSel
                          ? 'bg-gradient-to-b from-amber-500/20 via-slate-900/90 to-slate-950 border-amber-300 shadow-[0_0_24px_rgba(245,200,76,0.38)]'
                          : 'bg-slate-950/85 border-slate-700/80 hover:border-amber-400/50'
                      }`}
                    >
                      <CornerFiligree
                        color={isSel ? '#fde047' : hero.themeColor}
                        size={7}
                        opacity={isSel ? 0.9 : 0.45}
                      />

                      {/* Slot Position Ribbon */}
                      <div className="flex items-center justify-between gap-1 mb-2">
                        <span
                          className={`px-2 py-0.5 rounded-full text-[9px] font-display font-black uppercase tracking-wider ${
                            isSel
                              ? 'bg-amber-300 text-slate-950'
                              : 'bg-slate-900 text-amber-200 border border-amber-400/30'
                          }`}
                        >
                          {meta.short} • {meta.title}
                        </span>
                        {!isSel && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              swapPresetSlots(activePresetIndex, selectedSlot, idx);
                              setSelectedSlot(idx);
                              audioManager.playSfx('forge');
                            }}
                            className="px-1.5 py-0.5 rounded-lg bg-slate-900 border border-cyan-400/40 text-cyan-300 hover:bg-cyan-500/20 text-[9px] font-bold flex items-center gap-0.5 transition"
                            title={`Swap with Slot ${selectedSlot + 1}`}
                          >
                            <ArrowLeftRight className="w-2.5 h-2.5" /> Swap
                          </button>
                        )}
                      </div>

                      {/* Hero Portrait + Stats */}
                      <div className="flex items-center gap-2.5">
                        <div
                          className="relative w-14 h-16 sm:w-16 sm:h-20 rounded-xl overflow-hidden border-2 shrink-0 bg-slate-900"
                          style={{ borderColor: hero.themeColor }}
                        >
                          <ArtImage
                            kind="HERO"
                            id={hero.id}
                            src={hero.assets.card}
                            alt={hero.name}
                            className="w-full h-full object-cover object-top"
                          />
                          <span className="absolute bottom-0 inset-x-0 bg-black/85 text-[9px] font-mono font-bold text-center text-amber-300">
                            Lv.{owned.level}
                          </span>
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center flex-wrap gap-1 mb-0.5">
                            <RarityCrest tier={hero.tier} size="xs" />
                            <RoleBadge role={hero.role} variant="medallion" size="sm" />
                          </div>
                          <div className="font-display font-black text-sm sm:text-base text-white truncate">
                            {hero.name}
                          </div>
                          <div
                            className="text-[10px] font-bold truncate"
                            style={{ color: FACTIONS[hero.faction].color }}
                          >
                            {FACTIONS[hero.faction].name.split(' ')[0]} • ★{owned.awakening}
                          </div>
                          <div className="mt-1 text-[11px] font-mono font-bold text-amber-300">
                            PWR {(powerMap[hero.id] ?? 0).toLocaleString()}
                          </div>
                        </div>
                      </div>

                      {isSel && (
                        <div className="mt-2 pt-1.5 border-t border-amber-400/25 text-[10px] font-bold text-amber-200 flex items-center justify-center gap-1">
                          <Sparkles className="w-3 h-3" /> Editing Slot {idx + 1} — Pick Hero Below
                        </div>
                      )}
                    </motion.div>
                  );
                })}
              </div>

              {/* ROLE COVERAGE + FILTER & SORT BAR */}
              <div className="flex flex-wrap items-center justify-between gap-2 pt-1 border-t border-slate-800/80">
                <div className="flex items-center gap-1 flex-wrap">
                  {ROLE_FILTERS.map((rf) => {
                    const active = roleFilter === rf;
                    return (
                      <button
                        key={rf}
                        onClick={() => {
                          setRoleFilter(rf);
                          audioManager.playSfx('button');
                        }}
                        className={`px-2.5 py-1 rounded-lg text-[10px] font-display font-black uppercase tracking-wider border transition ${
                          active
                            ? 'bg-cyan-400/20 border-cyan-300 text-cyan-200'
                            : 'bg-slate-950/75 border-slate-800 text-slate-400 hover:text-white'
                        }`}
                      >
                        {rf}
                      </button>
                    );
                  })}
                </div>

                <div className="flex items-center gap-2 text-[10px]">
                  <span className="hidden sm:inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-950/80 border border-slate-800 text-slate-300">
                    <Shield className="w-3 h-3 text-sky-300" />
                    Tank {roleCounts.TANK} • Healer {roleCounts.HEALER} • DPS{' '}
                    {roleCounts.ASSAULT + roleCounts.RANGER + roleCounts.MAGE}
                  </span>
                  <div className="flex items-center gap-1 bg-slate-950/85 border border-slate-800 rounded-lg p-0.5">
                    {(['PWR', 'LV', 'TIER'] as const).map((s) => (
                      <button
                        key={s}
                        onClick={() => setSortBy(s)}
                        className={`px-2 py-0.5 rounded text-[10px] font-bold transition ${
                          sortBy === s
                            ? 'bg-amber-400 text-slate-950'
                            : 'text-slate-400 hover:text-white'
                        }`}
                      >
                        {s}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* OWNED CHASERS SELECTION GRID */}
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2">
                {filteredRoster.map((hero) => {
                  const own = roster[hero.id];
                  const inSlotIdx = currentHeroIds.indexOf(hero.id);
                  const isTargetSlot = inSlotIdx === selectedSlot;

                  return (
                    <motion.button
                      key={hero.id}
                      whileHover={{ y: -2, scale: 1.015 }}
                      whileTap={{ scale: 0.96 }}
                      onClick={() => handleHeroPick(hero.id)}
                      className={`relative rounded-xl p-2 border text-left transition flex items-center gap-2 overflow-hidden ${
                        isTargetSlot
                          ? 'bg-amber-500/20 border-amber-300 shadow-[0_0_14px_rgba(245,200,76,0.3)]'
                          : inSlotIdx !== -1
                            ? 'bg-emerald-950/35 border-emerald-500/55 hover:border-amber-300'
                            : 'bg-slate-950/85 border-slate-800 hover:border-cyan-400/70'
                      }`}
                    >
                      <div
                        className="relative w-11 h-14 rounded-lg overflow-hidden border shrink-0 bg-slate-900"
                        style={{ borderColor: `${hero.themeColor}aa` }}
                      >
                        <ArtImage
                          kind="HERO"
                          id={hero.id}
                          src={hero.assets.card}
                          alt={hero.name}
                          className="w-full h-full object-cover object-top"
                        />
                        <span
                          className="absolute bottom-0 inset-x-0 text-[8px] font-black text-center bg-black/85"
                          style={{ color: hero.themeColor }}
                        >
                          {hero.tier}
                        </span>
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="font-display font-bold text-xs text-white truncate">
                          {hero.name}
                        </div>
                        <div className="text-[10px] font-mono text-amber-300">
                          Lv.{own.level} • ★{own.awakening}
                        </div>
                        <div className="text-[9px] font-mono text-slate-400">
                          PWR {(powerMap[hero.id] ?? 0).toLocaleString()}
                        </div>
                        <div className="mt-0.5">
                          {inSlotIdx !== -1 ? (
                            <span
                              className={`inline-block px-1.5 py-0.5 rounded text-[8px] font-black uppercase ${
                                isTargetSlot
                                  ? 'bg-amber-300 text-slate-950'
                                  : 'bg-emerald-500/25 text-emerald-300 border border-emerald-400/40'
                              }`}
                            >
                              {isTargetSlot ? `ACTIVE S${inSlotIdx + 1}` : `IN SLOT S${inSlotIdx + 1}`}
                            </span>
                          ) : (
                            <span className="inline-block px-1.5 py-0.5 rounded bg-cyan-500/15 border border-cyan-400/35 text-cyan-200 text-[8px] font-bold uppercase">
                              + Deploy S{selectedSlot + 1}
                            </span>
                          )}
                        </div>
                      </div>
                    </motion.button>
                  );
                })}
              </div>
            </div>

            {/* FOOTER CONFIRMATION */}
            <div className="shrink-0 px-4 sm:px-5 py-2.5 bg-slate-950/90 border-t border-amber-400/20 flex items-center justify-between gap-2">
              <div className="text-[11px] text-slate-300">
                Active Preset:{' '}
                <strong className="text-amber-300 font-display uppercase">
                  P{activePresetIndex + 1} — {activePreset.name}
                </strong>
              </div>
              <RpgButton
                variant="gold"
                size="md"
                onClick={() => {
                  audioManager.playSfx('button');
                  onClose();
                }}
                className="font-display font-black uppercase tracking-wider px-6"
              >
                <Check className="w-4 h-4" /> Save Formation
              </RpgButton>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
