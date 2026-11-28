import React, { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { CalendarDays, CheckCircle2, Crown, Gift, Sparkles, X } from 'lucide-react';
import { STARFALL_CHECKIN_DAYS, formatCheckInDayTags, type CheckInDayDef } from '../data/checkIn';
import { EQUIPMENT_SETS, RARITY_COLORS, formatStatValue, getEnhancedMainStatValue } from '../data/equipment';
import { audioManager } from '../engine/AudioManager';
import { usePlayerStore } from '../store/usePlayerStore';
import type { EquipmentInstance } from '../types/game';
import { EquipIcon, GameIcon } from './GameIcon';
import { CornerFiligree, RpgButton } from './RpgKit';

interface CheckInModalProps {
  open: boolean;
  onClose: () => void;
}

export const CheckInModal: React.FC<CheckInModalProps> = ({ open, onClose }) => {
  const getCheckInStatus = usePlayerStore((s) => s.getCheckInStatus);
  const claimDailyCheckIn = usePlayerStore((s) => s.claimDailyCheckIn);
  const checkInCycle = usePlayerStore((s) => s.checkInCycle);
  const checkInClaimedDays = usePlayerStore((s) => s.checkInClaimedDays);
  const checkInLastClaimDate = usePlayerStore((s) => s.checkInLastClaimDate);

  const [notice, setNotice] = useState<string | null>(null);
  const [recentGear, setRecentGear] = useState<EquipmentInstance | null>(null);

  // Recompute reactively when check-in store fields change
  void checkInCycle;
  void checkInClaimedDays;
  void checkInLastClaimDate;
  const status = getCheckInStatus();

  const handleClaim = () => {
    const res = claimDailyCheckIn();
    audioManager.playSfx(res.ok ? 'ssr_reveal' : 'button');
    setNotice(res.message);
    if (res.droppedGear) {
      setRecentGear(res.droppedGear);
    }
    window.setTimeout(() => setNotice(null), 4000);
  };

  const regularDays = STARFALL_CHECKIN_DAYS.slice(0, 6);
  const grandDay = STARFALL_CHECKIN_DAYS[6];

  const renderDayCard = (def: CheckInDayDef) => {
    const isClaimed = status.claimedInCycle.includes(def.day);
    const isCurrent = status.nextClaimableDay === def.day && status.canClaimToday;
    const tags = formatCheckInDayTags(def);

    return (
      <div
        key={def.day}
        onClick={() => {
          if (isCurrent) handleClaim();
        }}
        className={`relative rounded-xl p-3 border flex flex-col justify-between gap-2 transition ${
          isCurrent
            ? 'bg-gradient-to-b from-amber-500/25 to-slate-950/90 border-amber-300 shadow-[0_0_24px_rgba(253,224,71,0.38)] cursor-pointer hover:-translate-y-0.5'
            : isClaimed
              ? 'bg-emerald-950/25 border-emerald-400/45 opacity-80'
              : 'bg-slate-950/80 border-white/10 opacity-85'
        }`}
      >
        <div className="flex items-center justify-between gap-1">
          <span
            className="px-2 py-0.5 rounded-full text-[9px] font-display font-black uppercase tracking-wider border"
            style={{
              borderColor: isCurrent ? '#fde047' : `${def.accentColor}66`,
              color: isCurrent ? '#fef08a' : def.accentColor,
              backgroundColor: isCurrent ? 'rgba(245,200,76,0.2)' : 'rgba(15,23,42,0.85)',
            }}
          >
            DAY {def.day}
          </span>
          {isClaimed ? (
            <span className="inline-flex items-center gap-0.5 text-[9px] font-display font-black text-emerald-300 uppercase">
              <CheckCircle2 className="w-3.5 h-3.5" /> Done
            </span>
          ) : isCurrent ? (
            <span className="px-1.5 py-0.5 rounded bg-rose-500 text-white text-[8px] font-display font-black uppercase animate-pulse">
              TODAY
            </span>
          ) : (
            <Gift className="w-3.5 h-3.5 text-slate-600" />
          )}
        </div>

        <div>
          <div className="font-display font-black text-xs text-white leading-tight">{def.title}</div>
          <div className="text-[10px] text-slate-400 leading-tight mt-0.5">{def.subtitle}</div>
        </div>

        <div className="flex flex-wrap gap-1 pt-1 border-t border-white/10">
          {tags.map((tag) => (
            <span
              key={tag}
              className="px-1.5 py-0.5 rounded bg-slate-900/90 border border-white/10 text-[9px] font-mono font-bold text-amber-200"
            >
              {tag}
            </span>
          ))}
        </div>
      </div>
    );
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
            className="relative rpg-panel w-full max-w-2xl max-h-[90dvh] flex flex-col overflow-hidden border-amber-400/65 shadow-[0_24px_76px_rgba(0,0,0,0.92)]"
          >
            <CornerFiligree color="#fde047" size={11} opacity={0.9} />

            {/* HEADER */}
            <div className="shrink-0 px-4 sm:px-5 pt-3.5 pb-3 border-b border-amber-400/25 bg-gradient-to-r from-amber-950/50 via-slate-950/85 to-fuchsia-950/45 flex items-center justify-between gap-2">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-10 h-10 rounded-xl bg-amber-400/20 border border-amber-300/70 flex items-center justify-center shrink-0 shadow-[0_0_16px_rgba(245,200,76,0.35)]">
                  <CalendarDays className="w-5 h-5 text-amber-300" />
                </div>
                <div className="min-w-0">
                  <div className="text-[10px] font-display font-black uppercase tracking-[0.22em] text-amber-300">
                    CYCLE {status.activeCycle} • {status.claimedInCycle.length}/7 DAYS CLAIMED
                  </div>
                  <h2 className="font-display text-lg sm:text-xl font-black text-white leading-tight truncate">
                    7-Day Starfall Check-In
                  </h2>
                </div>
              </div>

              <button
                onClick={() => {
                  audioManager.playSfx('button');
                  onClose();
                }}
                className="p-2 rounded-xl bg-slate-900 border border-slate-700 text-slate-300 hover:text-amber-300 transition"
                aria-label="Close Check-In Calendar"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {notice && (
              <div className="mx-4 sm:mx-5 mt-3 px-3.5 py-2 rounded-xl bg-emerald-950/85 border border-emerald-400/65 text-emerald-200 text-xs font-bold flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-amber-300 shrink-0" />
                <span>{notice}</span>
              </div>
            )}

            {recentGear && (
              <div className="mx-4 sm:mx-5 mt-2 px-3.5 py-2.5 rounded-xl bg-amber-950/45 border border-amber-400/60 flex items-center justify-between gap-2">
                <div className="flex items-center gap-2.5 min-w-0">
                  <div
                    className="w-9 h-9 rounded-lg bg-slate-900 border flex items-center justify-center shrink-0"
                    style={{ borderColor: RARITY_COLORS[recentGear.rarity] }}
                  >
                    <EquipIcon slot={recentGear.slot} className="w-7 h-7" />
                  </div>
                  <div className="min-w-0">
                    <div className="text-[10px] font-display font-black uppercase text-amber-300">
                      Crate Unlocked • {EQUIPMENT_SETS[recentGear.setId].name}
                    </div>
                    <div className="text-xs font-bold text-white truncate">
                      {recentGear.name} ({formatStatValue(recentGear.mainStat.stat, getEnhancedMainStatValue(recentGear))})
                    </div>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setRecentGear(null)}
                  className="text-[10px] font-bold text-slate-300 hover:text-white"
                >
                  Dismiss
                </button>
              </div>
            )}

            {/* BODY */}
            <div className="flex-1 min-h-0 overflow-y-auto px-4 sm:px-5 py-4 space-y-3">
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                {regularDays.map((def) => renderDayCard(def))}
              </div>

              {/* DAY 7 GRAND JACKPOT SPOTLIGHT */}
              {grandDay && (() => {
                const isClaimed = status.claimedInCycle.includes(7);
                const isCurrent = status.nextClaimableDay === 7 && status.canClaimToday;
                const tags = formatCheckInDayTags(grandDay);
                return (
                  <div
                    onClick={() => {
                      if (isCurrent) handleClaim();
                    }}
                    className={`relative rounded-2xl p-4 border-2 flex flex-col sm:flex-row sm:items-center justify-between gap-3 transition overflow-hidden ${
                      isCurrent
                        ? 'bg-gradient-to-r from-amber-500/25 via-fuchsia-600/20 to-amber-500/20 border-amber-300 shadow-[0_0_32px_rgba(253,224,71,0.45)] cursor-pointer'
                        : isClaimed
                          ? 'bg-emerald-950/30 border-emerald-400/50 opacity-80'
                          : 'bg-gradient-to-r from-amber-950/45 via-slate-950/90 to-fuchsia-950/40 border-amber-400/55'
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-12 h-12 rounded-2xl bg-amber-400/20 border-2 border-amber-300/80 flex items-center justify-center shrink-0 shadow-[0_0_20px_rgba(245,200,76,0.45)]">
                        <Crown className="w-6 h-6 text-amber-300" />
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="px-2 py-0.5 rounded-full bg-amber-400/25 border border-amber-300 text-[10px] font-display font-black text-amber-200 uppercase tracking-wider">
                            DAY 7 GRAND REWARD
                          </span>
                          {isClaimed && (
                            <span className="inline-flex items-center gap-1 text-[10px] font-display font-black text-emerald-300 uppercase">
                              <CheckCircle2 className="w-3.5 h-3.5" /> Claimed
                            </span>
                          )}
                        </div>
                        <div className="font-display font-black text-base text-white mt-0.5">
                          {grandDay.title}
                        </div>
                        <div className="text-[11px] text-amber-100/85">{grandDay.subtitle}</div>
                        <div className="flex flex-wrap gap-1.5 mt-2">
                          {tags.map((tag) => (
                            <span
                              key={tag}
                              className="px-2 py-0.5 rounded-lg bg-slate-950/85 border border-amber-300/45 text-[10px] font-mono font-black text-amber-200 flex items-center gap-1"
                            >
                              {tag.includes('Crystals') && <GameIcon name="crystal" className="w-3 h-3" />}
                              {tag}
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>

                    {isCurrent && (
                      <RpgButton
                        variant="gold"
                        size="md"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleClaim();
                        }}
                        className="shrink-0 font-display font-black uppercase tracking-wider"
                      >
                        <Sparkles className="w-4 h-4" /> Claim Jackpot
                      </RpgButton>
                    )}
                  </div>
                );
              })()}
            </div>

            {/* FOOTER */}
            <div className="shrink-0 px-4 sm:px-5 py-3 border-t border-white/10 bg-slate-950/85 flex flex-wrap items-center justify-between gap-2">
              <span className="text-[11px] text-slate-400">
                {status.canClaimToday
                  ? `Day ${status.nextClaimableDay} reward is ready to claim!`
                  : 'Today’s Starfall Check-In claimed! Return tomorrow for the next milestone.'}
              </span>
              <div className="flex items-center gap-2">
                {status.canClaimToday && (
                  <RpgButton
                    variant="gold"
                    size="sm"
                    onClick={handleClaim}
                    className="font-display font-black uppercase tracking-wider"
                  >
                    <Sparkles className="w-3.5 h-3.5" /> Claim Day {status.nextClaimableDay}
                  </RpgButton>
                )}
                <RpgButton variant="slate" size="sm" onClick={onClose}>
                  Close
                </RpgButton>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
