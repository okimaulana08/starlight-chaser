import React, { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { ArrowRight, Check, Lock, RefreshCw, Sparkles, Unlock, X } from 'lucide-react';
import {
  EQUIPMENT_SETS,
  RARITY_COLORS,
  formatStatValue,
  getEnhancedMainStatValue,
} from '../data/equipment';
import { audioManager } from '../engine/AudioManager';
import { usePlayerStore } from '../store/usePlayerStore';
import { getReforgeCost } from '../systems/ForgeSystem';
import type { EquipmentInstance, EquipmentSubStat } from '../types/game';
import { EquipIcon, MaterialIcon } from './GameIcon';
import { CornerFiligree, RpgButton } from './RpgKit';

interface GearReforgeModalProps {
  open: boolean;
  item: EquipmentInstance | null;
  onClose: () => void;
  onApplied?: (msg: string) => void;
}

export const GearReforgeModal: React.FC<GearReforgeModalProps> = ({
  open,
  item,
  onClose,
  onApplied,
}) => {
  const gold = usePlayerStore((s) => s.gold);
  const forgeStones = usePlayerStore((s) => s.forgeStones);
  const starIronIngots = usePlayerStore((s) => s.starIronIngots);
  const astralAnvilCores = usePlayerStore((s) => s.astralAnvilCores);
  const rollGearReforge = usePlayerStore((s) => s.rollGearReforge);
  const applyGearReforge = usePlayerStore((s) => s.applyGearReforge);

  const [lockedIndex, setLockedIndex] = useState<number | null>(null);
  const [candidate, setCandidate] = useState<EquipmentSubStat[] | null>(null);
  const [feedback, setFeedback] = useState<{ text: string; ok: boolean } | null>(null);

  useEffect(() => {
    setLockedIndex(null);
    setCandidate(null);
    setFeedback(null);
  }, [item?.uid, open]);

  if (!item) return null;

  const cost = getReforgeCost(item, lockedIndex);
  const canAfford =
    cost.eligible &&
    gold >= cost.gold &&
    forgeStones >= cost.forgeStones &&
    starIronIngots >= cost.starIronIngots &&
    astralAnvilCores >= cost.astralAnvilCores;

  const handleRoll = () => {
    const res = rollGearReforge(item.uid, lockedIndex);
    audioManager.playSfx(res.ok ? 'forge' : 'button');
    if (res.ok && res.candidateSubStats) {
      setCandidate(res.candidateSubStats);
      setFeedback({ text: 'New substats forged! Choose Keep Old or Apply New.', ok: true });
    } else {
      setFeedback({ text: res.message, ok: false });
    }
  };

  const handleApply = () => {
    if (!candidate) return;
    const res = applyGearReforge(item.uid, candidate);
    audioManager.playSfx(res.ok ? 'ssr_reveal' : 'button');
    if (res.ok) {
      setCandidate(null);
      setFeedback({ text: res.message, ok: true });
      onApplied?.(res.message);
    } else {
      setFeedback({ text: res.message, ok: false });
    }
  };

  const handleKeepOld = () => {
    audioManager.playSfx('button');
    setCandidate(null);
    setFeedback({ text: 'Kept original substats.', ok: true });
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="fixed inset-0 z-50 bg-[#030510]/85 backdrop-blur-md flex items-center justify-center p-2.5 sm:p-4 select-none"
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.93, y: 16 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 12 }}
            transition={{ type: 'spring', stiffness: 360, damping: 28 }}
            onClick={(e) => e.stopPropagation()}
            className="relative rpg-panel w-full max-w-lg max-h-[90dvh] flex flex-col overflow-hidden border-cyan-400/60 shadow-[0_24px_76px_rgba(0,0,0,0.92)]"
          >
            <CornerFiligree color="#38e8ff" size={10} opacity={0.85} />

            {/* HEADER */}
            <div className="shrink-0 px-4 py-3 border-b border-cyan-400/25 bg-slate-950/85 flex items-center justify-between gap-2">
              <div className="flex items-center gap-2.5 min-w-0">
                <div
                  className="w-10 h-10 rounded-xl bg-slate-900 border-2 flex items-center justify-center shrink-0"
                  style={{ borderColor: RARITY_COLORS[item.rarity] }}
                >
                  <EquipIcon slot={item.slot} className="w-8 h-8" />
                </div>
                <div className="min-w-0">
                  <div className="text-[10px] font-display font-black uppercase tracking-[0.2em] text-cyan-300">
                    ASTRAL ANVIL • SUBSTAT REFORGE
                  </div>
                  <h2 className="font-display text-base font-black text-white truncate">
                    {item.name} +{item.enhanceLevel}
                  </h2>
                </div>
              </div>
              <button
                onClick={onClose}
                className="p-1.5 rounded-xl bg-slate-900 border border-slate-700 text-slate-300 hover:text-cyan-300 transition"
                aria-label="Close Reforge"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* BODY */}
            <div className="flex-1 min-h-0 overflow-y-auto p-4 space-y-3.5">
              {/* Item Main Stat Bar */}
              <div className="rounded-xl bg-slate-950/80 border border-white/10 px-3 py-2 flex items-center justify-between text-xs">
                <span className="font-bold text-slate-300">
                  {EQUIPMENT_SETS[item.setId].name} •{' '}
                  <span style={{ color: RARITY_COLORS[item.rarity] }}>{item.rarity}</span>
                </span>
                <span className="font-mono font-black text-amber-300">
                  Main: {formatStatValue(item.mainStat.stat, getEnhancedMainStatValue(item))}
                </span>
              </div>

              <div className="text-[11px] text-slate-300 leading-relaxed">
                Reroll substats while preserving your <strong className="text-amber-300">+{item.enhanceLevel}</strong>{' '}
                enhancement tier &amp; bonus rolls. Click any substat below to{' '}
                <strong className="text-cyan-300">🔒 Lock up to 1 line</strong> before reforging.
              </div>

              {/* CURRENT vs CANDIDATE SUBSTATS */}
              <div className={`grid gap-2.5 ${candidate ? 'grid-cols-1 sm:grid-cols-2' : 'grid-cols-1'}`}>
                {/* CURRENT SUBSTATS */}
                <div className="rounded-xl bg-slate-950/85 border border-white/15 p-3 space-y-2">
                  <div className="text-[10px] font-display font-black uppercase tracking-widest text-slate-400">
                    Current Substats (Tap to Lock 1)
                  </div>
                  <div className="space-y-1.5">
                    {item.subStats.map((sub, idx) => {
                      const isLocked = lockedIndex === idx;
                      return (
                        <button
                          key={`${sub.stat}_${idx}`}
                          type="button"
                          disabled={Boolean(candidate)}
                          onClick={() => {
                            audioManager.playSfx('button');
                            setLockedIndex(isLocked ? null : idx);
                          }}
                          className={`w-full px-2.5 py-1.5 rounded-lg border flex items-center justify-between text-xs font-mono font-bold transition ${
                            isLocked
                              ? 'bg-amber-400/20 border-amber-300 text-amber-200 shadow-[0_0_12px_rgba(245,200,76,0.22)]'
                              : 'bg-slate-900/90 border-slate-700/80 text-slate-200 hover:border-cyan-400/60'
                          } ${candidate ? 'cursor-default opacity-85' : 'cursor-pointer'}`}
                        >
                          <span>{formatStatValue(sub.stat, sub.value)}</span>
                          <span className="inline-flex items-center gap-1 text-[9px] font-display uppercase">
                            {isLocked ? (
                              <>
                                <Lock className="w-3 h-3 text-amber-300" /> Locked
                              </>
                            ) : (
                              <>
                                <Unlock className="w-3 h-3 text-slate-500" /> Lock
                              </>
                            )}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* NEW CANDIDATE SUBSTATS */}
                {candidate && (
                  <motion.div
                    initial={{ opacity: 0, x: 10 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="rounded-xl bg-cyan-950/35 border-2 border-cyan-300/80 p-3 space-y-2 shadow-[0_0_24px_rgba(56,232,255,0.22)]"
                  >
                    <div className="text-[10px] font-display font-black uppercase tracking-widest text-cyan-300 flex items-center gap-1">
                      <Sparkles className="w-3.5 h-3.5" /> New Reforged Roll
                    </div>
                    <div className="space-y-1.5">
                      {candidate.map((sub, idx) => {
                        const isLocked = lockedIndex === idx;
                        return (
                          <div
                            key={`${sub.stat}_${idx}`}
                            className={`px-2.5 py-1.5 rounded-lg border flex items-center justify-between text-xs font-mono font-black ${
                              isLocked
                                ? 'bg-amber-400/15 border-amber-300/70 text-amber-200'
                                : 'bg-cyan-500/15 border-cyan-300/60 text-cyan-100'
                            }`}
                          >
                            <span>{formatStatValue(sub.stat, sub.value)}</span>
                            <span className="text-[9px] font-display uppercase">
                              {isLocked ? '🔒 Kept' : 'NEW'}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </motion.div>
                )}
              </div>

              {/* COST BAR */}
              <div className="rounded-xl bg-slate-950/90 border border-white/10 p-3 space-y-1.5">
                <div className="flex items-center justify-between text-[10px] font-display font-black uppercase tracking-wider text-slate-400">
                  <span>Reforge Material Cost</span>
                  {lockedIndex !== null && (
                    <span className="text-amber-300">Precision Lock (+1 Anvil Core)</span>
                  )}
                </div>
                <div className="flex flex-wrap items-center gap-3 text-xs font-mono font-bold">
                  <span className={gold >= cost.gold ? 'text-amber-300' : 'text-rose-400'}>
                    {cost.gold.toLocaleString()}g
                  </span>
                  <span
                    className={`inline-flex items-center gap-1 ${forgeStones >= cost.forgeStones ? 'text-violet-300' : 'text-rose-400'}`}
                  >
                    <MaterialIcon material="forgeStones" className="w-3.5 h-3.5" />
                    {forgeStones}/{cost.forgeStones}
                  </span>
                  <span
                    className={`inline-flex items-center gap-1 ${starIronIngots >= cost.starIronIngots ? 'text-sky-300' : 'text-rose-400'}`}
                  >
                    <MaterialIcon material="starIronIngots" className="w-3.5 h-3.5" />
                    {starIronIngots}/{cost.starIronIngots}
                  </span>
                  <span
                    className={`inline-flex items-center gap-1 ${astralAnvilCores >= cost.astralAnvilCores ? 'text-amber-200' : 'text-rose-400'}`}
                  >
                    <MaterialIcon material="astralAnvilCores" className="w-3.5 h-3.5" />
                    {astralAnvilCores}/{cost.astralAnvilCores}
                  </span>
                </div>
              </div>

              {feedback && (
                <div
                  className={`px-3 py-2 rounded-xl border text-xs font-bold ${
                    feedback.ok
                      ? 'bg-emerald-950/70 border-emerald-400/50 text-emerald-200'
                      : 'bg-rose-950/70 border-rose-400/50 text-rose-200'
                  }`}
                >
                  {feedback.text}
                </div>
              )}
            </div>

            {/* FOOTER ACTIONS */}
            <div className="shrink-0 px-4 py-3 border-t border-white/10 bg-slate-950/85 flex flex-wrap items-center justify-end gap-2">
              {candidate ? (
                <>
                  <RpgButton variant="slate" size="sm" onClick={handleKeepOld}>
                    Keep Old
                  </RpgButton>
                  <RpgButton
                    variant="cyan"
                    size="sm"
                    disabled={!canAfford}
                    onClick={handleRoll}
                    className="font-display font-black uppercase"
                  >
                    <RefreshCw className="w-3.5 h-3.5" /> Roll Again
                  </RpgButton>
                  <RpgButton
                    variant="gold"
                    size="sm"
                    onClick={handleApply}
                    className="font-display font-black uppercase"
                  >
                    <Check className="w-3.5 h-3.5" /> Apply New <ArrowRight className="w-3.5 h-3.5" />
                  </RpgButton>
                </>
              ) : (
                <>
                  <RpgButton variant="slate" size="sm" onClick={onClose}>
                    Close
                  </RpgButton>
                  <RpgButton
                    variant="cyan"
                    size="sm"
                    disabled={!canAfford}
                    onClick={handleRoll}
                    className="font-display font-black uppercase tracking-wider"
                  >
                    <RefreshCw className="w-3.5 h-3.5" /> Reforge Substats
                  </RpgButton>
                </>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
