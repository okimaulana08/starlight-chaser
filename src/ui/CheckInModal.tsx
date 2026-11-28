import React, { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Check, Crown, Sparkles, Star, X } from 'lucide-react';
import { STARFALL_CHECKIN_DAYS, type CheckInDayDef } from '../data/checkIn';
import {
  EQUIPMENT_SETS,
  RARITY_COLORS,
  formatStatValue,
  getEnhancedMainStatValue,
} from '../data/equipment';
import { audioManager } from '../engine/AudioManager';
import { usePlayerStore } from '../store/usePlayerStore';
import type { EquipmentInstance } from '../types/game';
import { EquipIcon } from './GameIcon';
import { RewardItemTile, buildVisualRewards } from './RewardItemTile';
import { CornerFiligree, RpgButton } from './RpgKit';

interface CheckInModalProps {
  open: boolean;
  onClose: () => void;
}

const SPARKLE_SEEDS = [
  { left: '8%', top: '18%', delay: '0s', size: 4 },
  { left: '24%', top: '72%', delay: '0.7s', size: 3 },
  { left: '46%', top: '26%', delay: '1.3s', size: 5 },
  { left: '68%', top: '60%', delay: '0.4s', size: 3.5 },
  { left: '84%', top: '22%', delay: '1.1s', size: 4.5 },
  { left: '92%', top: '78%', delay: '1.8s', size: 3 },
];

export const CheckInModal: React.FC<CheckInModalProps> = ({ open, onClose }) => {
  const getCheckInStatus = usePlayerStore((s) => s.getCheckInStatus);
  const claimDailyCheckIn = usePlayerStore((s) => s.claimDailyCheckIn);
  const checkInCycle = usePlayerStore((s) => s.checkInCycle);
  const checkInClaimedDays = usePlayerStore((s) => s.checkInClaimedDays);
  const checkInLastClaimDate = usePlayerStore((s) => s.checkInLastClaimDate);

  const [notice, setNotice] = useState<string | null>(null);
  const [recentGear, setRecentGear] = useState<EquipmentInstance | null>(null);
  const [bannerFallback, setBannerFallback] = useState(false);

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

  const renderDayCard = (def: CheckInDayDef, idx: number) => {
    const isClaimed = status.claimedInCycle.includes(def.day);
    const isCurrent = status.nextClaimableDay === def.day && status.canClaimToday;
    const entries = buildVisualRewards(def.reward, {
      allFactionEssences: def.allFactionEssences,
    });
    const primary = entries[0];
    const secondary = entries.slice(1);

    return (
      <motion.div
        key={def.day}
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: idx * 0.04, duration: 0.28 }}
        whileHover={isCurrent ? { y: -3, scale: 1.02 } : { y: -1 }}
        whileTap={isCurrent ? { scale: 0.97 } : undefined}
        onClick={() => {
          if (isCurrent) handleClaim();
        }}
        className={`relative rounded-2xl overflow-hidden border-2 flex flex-col justify-between transition ${
          isCurrent
            ? 'border-amber-300 shadow-[0_0_28px_rgba(253,224,71,0.48)] cursor-pointer'
            : isClaimed
              ? 'border-emerald-400/50'
              : 'border-white/15 hover:border-amber-300/45'
        }`}
        style={{
          background: isCurrent
            ? `radial-gradient(circle at 50% 24%, ${def.accentColor}48 0%, rgba(30, 22, 58, 0.96) 55%, rgba(9, 13, 32, 0.99) 100%)`
            : isClaimed
              ? 'linear-gradient(165deg, rgba(6, 40, 34, 0.82) 0%, rgba(7, 14, 28, 0.95) 100%)'
              : `radial-gradient(circle at 50% 20%, ${def.accentColor}22 0%, rgba(14, 20, 46, 0.94) 58%, rgba(7, 10, 24, 0.98) 100%)`,
        }}
      >
        <CornerFiligree
          color={isCurrent ? '#fde047' : isClaimed ? '#34d399' : def.accentColor}
          size={7}
          opacity={isCurrent ? 0.95 : 0.45}
        />

        {/* Top Day Ribbon Header */}
        <div
          className="relative z-10 px-2.5 py-1.5 flex items-center justify-between border-b border-white/10"
          style={{
            background: isCurrent
              ? 'linear-gradient(90deg, rgba(245,200,76,0.34), rgba(232,121,249,0.22))'
              : `linear-gradient(90deg, ${def.accentColor}26, transparent)`,
          }}
        >
          <span
            className="font-display font-black text-[10px] tracking-[0.16em] uppercase"
            style={{ color: isCurrent ? '#fef08a' : def.accentColor }}
          >
            DAY {def.day}
          </span>
          {isCurrent ? (
            <span className="px-1.5 py-0.5 rounded-full bg-gradient-to-r from-amber-300 to-yellow-200 text-slate-950 text-[8px] font-display font-black uppercase tracking-wider shadow-[0_0_10px_rgba(253,224,71,0.9)] animate-pulse">
              CLAIM!
            </span>
          ) : isClaimed ? (
            <span className="inline-flex items-center gap-0.5 text-[9px] font-display font-black text-emerald-300 uppercase">
              <Check className="w-3 h-3 stroke-[3]" /> Done
            </span>
          ) : (
            <Star className="w-3 h-3 text-slate-500/70" />
          )}
        </div>

        {/* Center Visual Item Showcase (Big Hero Icon + Secondary Item Slots!) */}
        <div className="relative z-10 px-2.5 py-3 flex flex-col items-center justify-center gap-2">
          {/* Ambient glow halo behind centerpiece item */}
          <div
            className="pointer-events-none absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-20 h-20 rounded-full blur-2xl opacity-45"
            style={{ background: def.accentColor }}
          />

          <div className="relative z-10 flex items-end justify-center gap-1.5 flex-wrap">
            {primary && <RewardItemTile entry={primary} size="md" claimed={isClaimed} />}
            {secondary.map((sec) => (
              <RewardItemTile key={sec.key} entry={sec} size="sm" claimed={isClaimed} />
            ))}
          </div>

          <div className="relative z-10 text-center leading-tight">
            <div className="font-display font-bold text-[11px] text-white truncate max-w-[155px]">
              {def.title}
            </div>
          </div>
        </div>

        {/* Iconic Mobile-Game Angled CLAIMED Wax Stamp Overlay */}
        {isClaimed && (
          <div className="pointer-events-none absolute inset-0 z-20 flex items-center justify-center bg-slate-950/28">
            <div className="-rotate-12 px-3 py-1 rounded-lg border-2 border-emerald-300/90 bg-emerald-950/90 text-emerald-200 font-display font-black text-[10px] tracking-[0.2em] uppercase shadow-[0_4px_18px_rgba(16,185,129,0.5)] flex items-center gap-1">
              <Check className="w-3.5 h-3.5 stroke-[3]" /> CLAIMED
            </div>
          </div>
        )}
      </motion.div>
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
          className="fixed inset-0 z-50 bg-[#030510]/86 backdrop-blur-md flex items-center justify-center p-2.5 sm:p-4 select-none"
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.92, y: 18 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.94, y: 12 }}
            transition={{ type: 'spring', stiffness: 360, damping: 28 }}
            onClick={(e) => e.stopPropagation()}
            className="relative rpg-panel w-full max-w-3xl max-h-[92dvh] flex flex-col overflow-hidden border-2 border-amber-300/75 shadow-[0_28px_90px_rgba(0,0,0,0.94),0_0_50px_rgba(245,200,76,0.22)]"
          >
            <CornerFiligree color="#fde047" size={12} opacity={0.95} />

            {/* ILLUSTRATED MOBILE-GAME SANCTUARY HEADER BANNER + STANDING HERO MASCOT */}
            <div className="relative shrink-0 h-[116px] sm:h-[132px] overflow-hidden border-b border-amber-300/45">
              {/* Scenic Background Art */}
              <img
                src={
                  bannerFallback
                    ? '/assets/environments/bg_lobby_aurelia.webp'
                    : '/assets/ui/bg_checkin_sanctuary.webp'
                }
                onError={() => {
                  if (!bannerFallback) setBannerFallback(true);
                }}
                alt="Starfall Sanctuary"
                className="absolute inset-0 w-full h-full object-cover object-center scale-105"
                draggable={false}
              />
              {/* Atmospheric gradient veil */}
              <div
                className="absolute inset-0"
                style={{
                  background:
                    'linear-gradient(95deg, rgba(8,10,28,0.94) 0%, rgba(18,14,48,0.78) 48%, rgba(28,16,58,0.38) 100%)',
                }}
              />
              {/* Twinkling floating sparkles */}
              {SPARKLE_SEEDS.map((sp, i) => (
                <span
                  key={i}
                  className="pointer-events-none absolute rounded-full bg-amber-200 animate-pulse"
                  style={{
                    left: sp.left,
                    top: sp.top,
                    width: sp.size,
                    height: sp.size,
                    animationDelay: sp.delay,
                    boxShadow: '0 0 10px #fde047',
                  }}
                />
              ))}

              {/* Standing Celestial Mascot (Astraea welcoming the Commander!) */}
              <img
                src="/assets/standing/standing_astraea.webp"
                alt="Astraea"
                draggable={false}
                className="pointer-events-none hidden sm:block absolute -right-2 -top-4 h-[230px] object-contain opacity-95 drop-shadow-[0_0_24px_rgba(245,200,76,0.5)]"
              />

              {/* Header Content */}
              <div className="relative z-10 h-full px-4 sm:px-6 flex items-center justify-between gap-3">
                <div className="space-y-1.5 max-w-[78%] sm:max-w-[66%]">
                  <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-amber-400/20 border border-amber-300/75 text-[10px] font-display font-black uppercase tracking-[0.2em] text-amber-200 shadow-[0_0_14px_rgba(245,200,76,0.35)]">
                    <Sparkles className="w-3 h-3 text-amber-300" />
                    <span>CYCLE {status.activeCycle} • STARFALL ATTENDANCE</span>
                  </div>
                  <h2 className="font-display text-xl sm:text-2xl font-black text-white tracking-wider text-glow-gold leading-none">
                    7-DAY STARFALL CHECK-IN
                  </h2>
                  <div className="flex items-center gap-2 pt-0.5">
                    {/* Visual 7-Star Progress Pips */}
                    <div className="flex items-center gap-1">
                      {[1, 2, 3, 4, 5, 6, 7].map((d) => {
                        const done = status.claimedInCycle.includes(d);
                        const active = status.nextClaimableDay === d && status.canClaimToday;
                        return (
                          <span
                            key={d}
                            className={`h-2 rounded-full transition-all ${
                              done
                                ? 'w-5 bg-gradient-to-r from-emerald-400 to-amber-300 shadow-[0_0_8px_rgba(52,211,153,0.8)]'
                                : active
                                  ? 'w-5 bg-amber-300 animate-pulse shadow-[0_0_10px_rgba(253,224,71,0.9)]'
                                  : 'w-2.5 bg-slate-600/70'
                            }`}
                          />
                        );
                      })}
                    </div>
                    <span className="font-mono text-[11px] font-black text-amber-200">
                      {status.claimedInCycle.length}/7
                    </span>
                  </div>
                </div>

                <button
                  onClick={() => {
                    audioManager.playSfx('button');
                    onClose();
                  }}
                  className="self-start mt-3 p-2 rounded-xl bg-slate-950/85 border border-amber-300/45 text-slate-200 hover:text-amber-300 hover:border-amber-300 transition shadow-lg"
                  aria-label="Close Check-In Calendar"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
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
                    className="w-10 h-10 rounded-xl bg-slate-900 border-2 flex items-center justify-center shrink-0"
                    style={{ borderColor: RARITY_COLORS[recentGear.rarity] }}
                  >
                    <EquipIcon slot={recentGear.slot} className="w-8 h-8" />
                  </div>
                  <div className="min-w-0">
                    <div className="text-[10px] font-display font-black uppercase text-amber-300">
                      Crate Unlocked • {EQUIPMENT_SETS[recentGear.setId].name}
                    </div>
                    <div className="text-xs font-bold text-white truncate">
                      {recentGear.name} (
                      {formatStatValue(recentGear.mainStat.stat, getEnhancedMainStatValue(recentGear))})
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

            {/* BODY: 6 RICH VISUAL DAY CARDS + ROYAL DAY 7 JACKPOT */}
            <div
              className="flex-1 min-h-0 overflow-y-auto px-4 sm:px-5 py-4 space-y-3.5"
              style={{
                background:
                  'radial-gradient(ellipse 80% 60% at 50% 0%, rgba(88, 28, 135, 0.24) 0%, rgba(6, 9, 22, 0.96) 72%)',
              }}
            >
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 sm:gap-3">
                {regularDays.map((def, i) => renderDayCard(def, i))}
              </div>

              {/* DAY 7 GRAND JACKPOT ROYAL BANNER CARD */}
              {grandDay &&
                (() => {
                  const isClaimed = status.claimedInCycle.includes(7);
                  const isCurrent = status.nextClaimableDay === 7 && status.canClaimToday;
                  const entries = buildVisualRewards(grandDay.reward);

                  return (
                    <motion.div
                      whileHover={isCurrent ? { scale: 1.01, y: -2 } : undefined}
                      onClick={() => {
                        if (isCurrent) handleClaim();
                      }}
                      className={`relative rounded-2xl p-3.5 sm:p-4 border-2 flex flex-col sm:flex-row sm:items-center justify-between gap-3.5 overflow-hidden transition ${
                        isCurrent
                          ? 'border-amber-200 shadow-[0_0_38px_rgba(253,224,71,0.52)] cursor-pointer'
                          : isClaimed
                            ? 'border-emerald-400/55 opacity-85'
                            : 'border-amber-400/75 shadow-[0_12px_32px_rgba(0,0,0,0.65)]'
                      }`}
                      style={{
                        background:
                          'linear-gradient(110deg, rgba(120, 53, 15, 0.55) 0%, rgba(88, 28, 135, 0.48) 50%, rgba(28, 18, 56, 0.94) 100%)',
                      }}
                    >
                      <CornerFiligree color="#fde047" size={10} opacity={0.95} />

                      {/* Radial golden starburst behind Day 7 */}
                      <div
                        className="pointer-events-none absolute -left-8 top-1/2 -translate-y-1/2 w-56 h-56 rounded-full blur-3xl opacity-40"
                        style={{
                          background: 'radial-gradient(circle, #fde047 0%, #e879f9 55%, transparent 75%)',
                        }}
                      />

                      <div className="relative z-10 flex items-center gap-3 min-w-0">
                        <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-amber-300/30 to-fuchsia-500/25 border-2 border-amber-300 flex items-center justify-center shrink-0 shadow-[0_0_22px_rgba(245,200,76,0.55)]">
                          <Crown className="w-6 h-6 text-amber-200" />
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="px-2.5 py-0.5 rounded-full bg-gradient-to-r from-amber-300 to-yellow-200 text-slate-950 text-[9px] font-display font-black uppercase tracking-[0.16em]">
                              DAY 7 GRAND JACKPOT
                            </span>
                            {isClaimed && (
                              <span className="inline-flex items-center gap-1 text-[10px] font-display font-black text-emerald-300 uppercase">
                                <Check className="w-3.5 h-3.5 stroke-[3]" /> Claimed
                              </span>
                            )}
                          </div>
                          <div className="font-display font-black text-base sm:text-lg text-white text-glow-gold mt-0.5 leading-tight">
                            {grandDay.title}
                          </div>
                          <div className="text-[11px] text-amber-100/85">{grandDay.subtitle}</div>
                        </div>
                      </div>

                      {/* Oversized Visual Item Tiles for Day 7 */}
                      <div className="relative z-10 flex items-center gap-2 flex-wrap sm:justify-end">
                        {entries.map((entry) => (
                          <RewardItemTile
                            key={entry.key}
                            entry={entry}
                            size="md"
                            claimed={isClaimed}
                          />
                        ))}
                        {isCurrent && (
                          <RpgButton
                            variant="gold"
                            size="md"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleClaim();
                            }}
                            className="ml-1 shrink-0 font-display font-black uppercase tracking-wider"
                          >
                            <Sparkles className="w-4 h-4" /> Claim
                          </RpgButton>
                        )}
                      </div>
                    </motion.div>
                  );
                })()}
            </div>

            {/* FOOTER */}
            <div className="shrink-0 px-4 sm:px-5 py-3 border-t border-amber-400/25 bg-slate-950/92 flex flex-wrap items-center justify-between gap-2">
              <span className="text-[11px] text-slate-300">
                {status.canClaimToday
                  ? `Tap Day ${status.nextClaimableDay} or press Claim below to receive today’s Starfall Gift!`
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
