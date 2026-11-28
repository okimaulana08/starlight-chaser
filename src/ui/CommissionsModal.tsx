import React, { useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import {
  CalendarClock,
  CheckCircle2,
  ClipboardList,
  Gift,
  Sparkles,
  Trophy,
  X,
} from 'lucide-react';
import {
  DAILY_ACTIVITY_MILESTONES,
  DAILY_COMMISSIONS,
  PERMANENT_COMMISSIONS,
  WEEKLY_ACTIVITY_MILESTONES,
  WEEKLY_COMMISSIONS,
  computeDailyActivityPoints,
  computeWeeklyActivityPoints,
  formatCommissionRewardTags,
  getCurrentWeekKey,
} from '../data/commissions';
import { audioManager } from '../engine/AudioManager';
import { usePlayerStore } from '../store/usePlayerStore';
import { CornerFiligree, RpgButton, RpgProgressBar, RpgTabs } from './RpgKit';

interface CommissionsModalProps {
  open: boolean;
  onClose: () => void;
}

function getTodayKey(): string {
  const d = new Date();
  return `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;
}

const CATEGORY_BADGE: Record<string, { label: string; color: string }> = {
  CAMPAIGN: { label: 'CAMPAIGN', color: '#f5c84c' },
  SPIRE: { label: 'SPIRE', color: '#38e8ff' },
  DUNGEON: { label: 'DUNGEON', color: '#e879f9' },
  GROWTH: { label: 'GROWTH', color: '#34d399' },
};

export const CommissionsModal: React.FC<CommissionsModalProps> = ({ open, onClose }) => {
  const player = usePlayerStore();
  const [tab, setTab] = useState<'DAILY' | 'WEEKLY' | 'MILESTONES'>('DAILY');
  const [notice, setNotice] = useState<string | null>(null);

  const flashNotice = (msg: string) => {
    setNotice(msg);
    window.setTimeout(() => setNotice(null), 3200);
  };

  const today = getTodayKey();
  const sameDay = player.commissionResetDay === today;
  const dailyProgressMap = sameDay ? (player.dailyCommissionProgress ?? {}) : {};
  const claimedDaily = sameDay ? (player.claimedDailyCommissions ?? []) : [];
  const claimedActivity = sameDay ? (player.claimedActivityMilestones ?? []) : [];

  const weekKey = getCurrentWeekKey();
  const sameWeek = player.weeklyCommissionResetKey === weekKey;
  const weeklyProgressMap = sameWeek ? (player.weeklyCommissionProgress ?? {}) : {};
  const claimedWeekly = sameWeek ? (player.claimedWeeklyCommissions ?? []) : [];
  const claimedWeeklyMs = sameWeek ? (player.claimedWeeklyMilestones ?? []) : [];

  const claimedPermanent = player.claimedPermanentCommissions ?? [];

  const activityPts = useMemo(() => computeDailyActivityPoints(claimedDaily), [claimedDaily]);
  const weeklyPts = useMemo(() => computeWeeklyActivityPoints(claimedWeekly), [claimedWeekly]);
  const claimableCount = player.getClaimableCommissionsCount();

  const dailyReadyCount = useMemo(() => {
    let n = 0;
    for (const c of DAILY_COMMISSIONS) {
      if ((dailyProgressMap[c.id] ?? 0) >= c.target && !claimedDaily.includes(c.id)) n += 1;
    }
    for (const ms of DAILY_ACTIVITY_MILESTONES) {
      if (activityPts >= ms.points && !claimedActivity.includes(ms.points)) n += 1;
    }
    return n;
  }, [dailyProgressMap, claimedDaily, activityPts, claimedActivity]);

  const weeklyReadyCount = useMemo(() => {
    let n = 0;
    for (const w of WEEKLY_COMMISSIONS) {
      if ((weeklyProgressMap[w.id] ?? 0) >= w.target && !claimedWeekly.includes(w.id)) n += 1;
    }
    for (const ms of WEEKLY_ACTIVITY_MILESTONES) {
      if (weeklyPts >= ms.points && !claimedWeeklyMs.includes(ms.points)) n += 1;
    }
    return n;
  }, [weeklyProgressMap, claimedWeekly, weeklyPts, claimedWeeklyMs]);

  const milestoneReadyCount = useMemo(() => {
    let n = 0;
    for (const m of PERMANENT_COMMISSIONS) {
      if (m.getProgress(player) >= m.target && !claimedPermanent.includes(m.id)) n += 1;
    }
    return n;
  }, [player, claimedPermanent]);

  const sortedMilestones = useMemo(() => {
    return [...PERMANENT_COMMISSIONS].sort((a, b) => {
      const aClaimed = claimedPermanent.includes(a.id);
      const bClaimed = claimedPermanent.includes(b.id);
      const aReady = !aClaimed && a.getProgress(player) >= a.target;
      const bReady = !bClaimed && b.getProgress(player) >= b.target;
      if (aReady !== bReady) return aReady ? -1 : 1;
      if (aClaimed !== bClaimed) return aClaimed ? 1 : -1;
      return 0;
    });
  }, [player, claimedPermanent]);

  const handleClaimAll = () => {
    const res = player.claimAllCommissions();
    audioManager.playSfx(res.ok ? 'ssr_reveal' : 'button');
    flashNotice(res.message);
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
            className="relative rpg-panel w-full max-w-2xl max-h-[88dvh] flex flex-col overflow-hidden border-amber-400/55 shadow-[0_24px_72px_rgba(0,0,0,0.92)]"
          >
            <CornerFiligree color="#f5c84c" size={11} opacity={0.85} />

            {/* HEADER */}
            <div className="shrink-0 px-4 sm:px-5 pt-3.5 pb-3 border-b border-amber-400/25 bg-slate-950/80 flex items-center justify-between gap-2">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-10 h-10 rounded-xl bg-amber-400/15 border border-amber-300/60 flex items-center justify-center shrink-0">
                  <ClipboardList className="w-5 h-5 text-amber-300" />
                </div>
                <div className="min-w-0">
                  <div className="text-[10px] font-display font-black uppercase tracking-[0.22em] text-amber-300">
                    STARLIGHT DISPATCH BOARD
                  </div>
                  <h2 className="font-display text-lg sm:text-xl font-black text-white leading-tight truncate">
                    Chaser Commissions
                  </h2>
                </div>
              </div>

              <div className="flex items-center gap-2">
                {claimableCount > 0 && (
                  <RpgButton
                    variant="gold"
                    size="sm"
                    onClick={handleClaimAll}
                    className="font-display font-black uppercase tracking-wider"
                  >
                    <Sparkles className="w-3.5 h-3.5" /> Claim All ({claimableCount})
                  </RpgButton>
                )}
                <button
                  onClick={() => {
                    audioManager.playSfx('button');
                    onClose();
                  }}
                  className="p-2 rounded-xl bg-slate-900 border border-slate-700 text-slate-300 hover:text-amber-300 transition"
                  aria-label="Close Commissions"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* TABS */}
            <div className="shrink-0 px-4 sm:px-5 pt-3 pb-2 bg-slate-950/45 border-b border-white/10">
              <RpgTabs<'DAILY' | 'WEEKLY' | 'MILESTONES'>
                layoutId="commissions-tabs"
                value={tab}
                onChange={(t) => {
                  audioManager.playSfx('button');
                  setTab(t);
                }}
                items={[
                  {
                    key: 'DAILY',
                    label: dailyReadyCount > 0 ? `Daily (${dailyReadyCount})` : 'Daily',
                    accent: 'gold',
                  },
                  {
                    key: 'WEEKLY',
                    label: weeklyReadyCount > 0 ? `Weekly (${weeklyReadyCount})` : 'Weekly',
                    accent: 'cyan',
                  },
                  {
                    key: 'MILESTONES',
                    label:
                      milestoneReadyCount > 0
                        ? `Milestones (${milestoneReadyCount})`
                        : `Milestones (${claimedPermanent.length}/${PERMANENT_COMMISSIONS.length})`,
                    accent: 'cyan',
                  },
                ]}
              />
            </div>

            {notice && (
              <div className="mx-4 sm:mx-5 mt-3 px-3.5 py-2 rounded-xl bg-emerald-950/80 border border-emerald-400/60 text-emerald-200 text-xs font-bold flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>{notice}</span>
              </div>
            )}

            {/* SCROLLABLE BODY */}
            <div className="flex-1 min-h-0 overflow-y-auto px-4 sm:px-5 py-4 space-y-3.5">
              {tab === 'DAILY' && (
                <>
                  {/* DAILY ACTIVITY BAR & 4 TREASURE CHEST MILESTONES */}
                  <div className="rpg-ornate-card p-3.5 space-y-3 border-amber-400/40 bg-slate-950/70">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-display font-black uppercase tracking-[0.18em] text-amber-300 flex items-center gap-1.5">
                        <Gift className="w-4 h-4" /> Daily Activity Chests
                      </span>
                      <span className="font-mono font-black text-white">
                        <span className="text-amber-300">{activityPts}</span> / 100 PTS
                      </span>
                    </div>

                    <RpgProgressBar
                      value={activityPts}
                      max={100}
                      heightClass="h-2.5"
                      gradient="linear-gradient(90deg, #38bdf8 0%, #f5c84c 60%, #e879f9 100%)"
                    />

                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1">
                      {DAILY_ACTIVITY_MILESTONES.map((ms) => {
                        const isClaimed = claimedActivity.includes(ms.points);
                        const isReady = activityPts >= ms.points && !isClaimed;
                        const tags = formatCommissionRewardTags(ms.reward);
                        return (
                          <button
                            key={ms.points}
                            type="button"
                            disabled={!isReady}
                            onClick={() => {
                              const res = player.claimActivityMilestone(ms.points);
                              audioManager.playSfx(res.ok ? 'ssr_reveal' : 'button');
                              flashNotice(res.message);
                            }}
                            className={`rounded-xl p-2 text-left border transition ${
                              isClaimed
                                ? 'bg-emerald-950/35 border-emerald-400/45 opacity-80'
                                : isReady
                                  ? 'bg-amber-500/20 border-amber-300 shadow-[0_0_16px_rgba(253,224,71,0.45)] animate-pulse cursor-pointer'
                                  : 'bg-slate-950/80 border-white/10 opacity-75 cursor-default'
                            }`}
                          >
                            <div className="flex items-center justify-between gap-1 text-[10px] font-mono font-black">
                              <span className={isReady ? 'text-amber-200' : 'text-cyan-300'}>
                                {ms.points} PTS
                              </span>
                              {isClaimed ? (
                                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                              ) : (
                                <Gift className={`w-3.5 h-3.5 ${isReady ? 'text-amber-300' : 'text-slate-500'}`} />
                              )}
                            </div>
                            <div className="text-[10px] font-bold text-white truncate mt-0.5">
                              {ms.label}
                            </div>
                            <div className="text-[9px] text-slate-300 truncate mt-0.5">
                              {tags.join(' • ')}
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* DAILY QUEST LIST */}
                  <div className="space-y-2">
                    {DAILY_COMMISSIONS.map((c) => {
                      const prog = Math.min(c.target, dailyProgressMap[c.id] ?? 0);
                      const isClaimed = claimedDaily.includes(c.id);
                      const isReady = prog >= c.target && !isClaimed;
                      const tags = formatCommissionRewardTags(c.reward);

                      return (
                        <div
                          key={c.id}
                          className={`rounded-xl p-3 border flex flex-wrap items-center justify-between gap-3 transition ${
                            isReady
                              ? 'bg-amber-500/12 border-amber-300/80 shadow-[0_0_18px_rgba(245,200,76,0.18)]'
                              : isClaimed
                                ? 'bg-slate-950/55 border-emerald-500/30 opacity-75'
                                : 'bg-slate-950/80 border-white/10'
                          }`}
                        >
                          <div className="flex-1 min-w-[200px] space-y-1.5">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="font-display font-bold text-sm text-white">
                                {c.title}
                              </span>
                              <span className="px-1.5 py-0.5 rounded bg-cyan-500/15 border border-cyan-400/45 font-mono text-[9px] font-black text-cyan-200">
                                +{c.activityPoints} PTS
                              </span>
                            </div>
                            <div className="text-[11px] text-slate-300">{c.desc}</div>
                            <div className="flex items-center gap-2 flex-wrap">
                              <div className="flex-1 min-w-[110px] max-w-[180px]">
                                <RpgProgressBar
                                  value={prog}
                                  max={c.target}
                                  heightClass="h-1.5"
                                  gradient={
                                    prog >= c.target
                                      ? 'linear-gradient(90deg, #10b981, #fde047)'
                                      : 'linear-gradient(90deg, #06b6d4, #38e8ff)'
                                  }
                                />
                              </div>
                              <span className="font-mono text-[10px] font-bold text-slate-300">
                                {prog}/{c.target}
                              </span>
                              <span className="text-[10px] font-bold text-amber-200">
                                • {tags.join(' • ')}
                              </span>
                            </div>
                          </div>

                          <div className="shrink-0">
                            {isClaimed ? (
                              <span className="px-3 py-1.5 rounded-lg bg-emerald-500/15 border border-emerald-400/45 text-emerald-300 text-[10px] font-display font-black uppercase flex items-center gap-1">
                                <CheckCircle2 className="w-3.5 h-3.5" /> Claimed
                              </span>
                            ) : (
                              <RpgButton
                                variant={isReady ? 'gold' : 'slate'}
                                size="xs"
                                disabled={!isReady}
                                onClick={() => {
                                  const res = player.claimDailyCommission(c.id);
                                  audioManager.playSfx(res.ok ? 'forge' : 'button');
                                  flashNotice(res.message);
                                }}
                                className="font-display font-black uppercase px-3.5"
                              >
                                {isReady ? 'Claim' : 'In Progress'}
                              </RpgButton>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </>
              )}

              {tab === 'WEEKLY' && (
                <>
                  {/* WEEKLY ACTIVITY BAR & 4 SOVEREIGN WEEKLY CHESTS */}
                  <div className="rpg-ornate-card p-3.5 space-y-3 border-fuchsia-400/45 bg-slate-950/75">
                    <div className="flex items-center justify-between text-xs gap-2">
                      <span className="font-display font-black uppercase tracking-[0.16em] text-fuchsia-300 flex items-center gap-1.5">
                        <CalendarClock className="w-4 h-4" /> Weekly Sovereign Chests ({weekKey})
                      </span>
                      <span className="font-mono font-black text-white">
                        <span className="text-fuchsia-300">{weeklyPts}</span> / 100 PTS
                      </span>
                    </div>

                    <RpgProgressBar
                      value={weeklyPts}
                      max={100}
                      heightClass="h-2.5"
                      gradient="linear-gradient(90deg, #a855f7 0%, #38e8ff 55%, #fde047 100%)"
                    />

                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1">
                      {WEEKLY_ACTIVITY_MILESTONES.map((ms) => {
                        const isClaimed = claimedWeeklyMs.includes(ms.points);
                        const isReady = weeklyPts >= ms.points && !isClaimed;
                        const tags = formatCommissionRewardTags(ms.reward);
                        return (
                          <button
                            key={ms.points}
                            type="button"
                            disabled={!isReady}
                            onClick={() => {
                              const res = player.claimWeeklyActivityMilestone(ms.points);
                              audioManager.playSfx(res.ok ? 'ssr_reveal' : 'button');
                              flashNotice(res.message);
                            }}
                            className={`rounded-xl p-2 text-left border transition ${
                              isClaimed
                                ? 'bg-emerald-950/35 border-emerald-400/45 opacity-80'
                                : isReady
                                  ? 'bg-fuchsia-500/25 border-fuchsia-300 shadow-[0_0_18px_rgba(232,121,249,0.48)] animate-pulse cursor-pointer'
                                  : 'bg-slate-950/80 border-white/10 opacity-75 cursor-default'
                            }`}
                          >
                            <div className="flex items-center justify-between gap-1 text-[10px] font-mono font-black">
                              <span className={isReady ? 'text-fuchsia-200' : 'text-cyan-300'}>
                                {ms.points} PTS
                              </span>
                              {isClaimed ? (
                                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                              ) : (
                                <Gift className={`w-3.5 h-3.5 ${isReady ? 'text-fuchsia-300' : 'text-slate-500'}`} />
                              )}
                            </div>
                            <div className="text-[10px] font-bold text-white truncate mt-0.5">
                              {ms.label}
                            </div>
                            <div className="text-[9px] text-slate-300 leading-tight mt-0.5 line-clamp-2">
                              {tags.join(' • ')}
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* WEEKLY QUEST LIST */}
                  <div className="space-y-2">
                    {WEEKLY_COMMISSIONS.map((w) => {
                      const prog = Math.min(w.target, weeklyProgressMap[w.id] ?? 0);
                      const isClaimed = claimedWeekly.includes(w.id);
                      const isReady = prog >= w.target && !isClaimed;
                      const tags = formatCommissionRewardTags(w.reward);

                      return (
                        <div
                          key={w.id}
                          className={`rounded-xl p-3 border flex flex-wrap items-center justify-between gap-3 transition ${
                            isReady
                              ? 'bg-fuchsia-500/15 border-fuchsia-300/80 shadow-[0_0_18px_rgba(232,121,249,0.2)]'
                              : isClaimed
                                ? 'bg-slate-950/55 border-emerald-500/30 opacity-75'
                                : 'bg-slate-950/80 border-white/10'
                          }`}
                        >
                          <div className="flex-1 min-w-[200px] space-y-1.5">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="font-display font-bold text-sm text-white">
                                {w.title}
                              </span>
                              <span className="px-1.5 py-0.5 rounded bg-fuchsia-500/20 border border-fuchsia-400/50 font-mono text-[9px] font-black text-fuchsia-200">
                                +{w.activityPoints} PTS
                              </span>
                            </div>
                            <div className="text-[11px] text-slate-300">{w.desc}</div>
                            <div className="flex items-center gap-2 flex-wrap">
                              <div className="flex-1 min-w-[110px] max-w-[180px]">
                                <RpgProgressBar
                                  value={prog}
                                  max={w.target}
                                  heightClass="h-1.5"
                                  gradient={
                                    prog >= w.target
                                      ? 'linear-gradient(90deg, #10b981, #e879f9)'
                                      : 'linear-gradient(90deg, #9333ea, #38e8ff)'
                                  }
                                />
                              </div>
                              <span className="font-mono text-[10px] font-bold text-slate-300">
                                {prog}/{w.target}
                              </span>
                              <span className="text-[10px] font-bold text-amber-200">
                                • {tags.join(' • ')}
                              </span>
                            </div>
                          </div>

                          <div className="shrink-0">
                            {isClaimed ? (
                              <span className="px-3 py-1.5 rounded-lg bg-emerald-500/15 border border-emerald-400/45 text-emerald-300 text-[10px] font-display font-black uppercase flex items-center gap-1">
                                <CheckCircle2 className="w-3.5 h-3.5" /> Claimed
                              </span>
                            ) : (
                              <RpgButton
                                variant={isReady ? 'gold' : 'slate'}
                                size="xs"
                                disabled={!isReady}
                                onClick={() => {
                                  const res = player.claimWeeklyCommission(w.id);
                                  audioManager.playSfx(res.ok ? 'ssr_reveal' : 'button');
                                  flashNotice(res.message);
                                }}
                                className="font-display font-black uppercase px-3.5"
                              >
                                {isReady ? 'Claim' : 'In Progress'}
                              </RpgButton>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </>
              )}

              {tab === 'MILESTONES' && (
                <div className="space-y-2">
                  {sortedMilestones.map((m) => {
                    const prog = Math.min(m.target, m.getProgress(player));
                    const isClaimed = claimedPermanent.includes(m.id);
                    const isReady = prog >= m.target && !isClaimed;
                    const tags = formatCommissionRewardTags(m.reward);
                    const cat = m.category ? CATEGORY_BADGE[m.category] : null;

                    return (
                      <div
                        key={m.id}
                        className={`rounded-xl p-3 border flex flex-wrap items-center justify-between gap-3 transition ${
                          isReady
                            ? 'bg-cyan-500/12 border-cyan-300/80 shadow-[0_0_18px_rgba(56,232,255,0.18)]'
                            : isClaimed
                              ? 'bg-slate-950/55 border-emerald-500/30 opacity-70'
                              : 'bg-slate-950/80 border-white/10'
                        }`}
                      >
                        <div className="flex-1 min-w-[200px] space-y-1.5">
                          <div className="flex items-center gap-2 flex-wrap">
                            <Trophy className="w-4 h-4 text-amber-300 shrink-0" />
                            <span className="font-display font-bold text-sm text-white">
                              {m.title}
                            </span>
                            {cat && (
                              <span
                                className="px-1.5 py-0.5 rounded text-[8px] font-display font-black uppercase border bg-slate-950/85"
                                style={{ borderColor: `${cat.color}66`, color: cat.color }}
                              >
                                {cat.label}
                              </span>
                            )}
                          </div>
                          <div className="text-[11px] text-slate-300">{m.desc}</div>
                          <div className="flex items-center gap-2 flex-wrap">
                            <div className="flex-1 min-w-[110px] max-w-[180px]">
                              <RpgProgressBar
                                value={prog}
                                max={m.target}
                                heightClass="h-1.5"
                                gradient="linear-gradient(90deg, #38e8ff, #f5c84c)"
                              />
                            </div>
                            <span className="font-mono text-[10px] font-bold text-slate-300">
                              {prog}/{m.target}
                            </span>
                            <span className="text-[10px] font-bold text-amber-200">
                              • {tags.join(' • ')}
                            </span>
                          </div>
                        </div>

                        <div className="shrink-0">
                          {isClaimed ? (
                            <span className="px-3 py-1.5 rounded-lg bg-emerald-500/15 border border-emerald-400/45 text-emerald-300 text-[10px] font-display font-black uppercase flex items-center gap-1">
                              <CheckCircle2 className="w-3.5 h-3.5" /> Claimed
                            </span>
                          ) : (
                            <RpgButton
                              variant={isReady ? 'cyan' : 'slate'}
                              size="xs"
                              disabled={!isReady}
                              onClick={() => {
                                const res = player.claimPermanentCommission(m.id);
                                audioManager.playSfx(res.ok ? 'ssr_reveal' : 'button');
                                flashNotice(res.message);
                              }}
                              className="font-display font-black uppercase px-3.5"
                            >
                              {isReady ? 'Claim' : 'Locked'}
                            </RpgButton>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* FOOTER */}
            <div className="shrink-0 px-4 sm:px-5 py-3 border-t border-white/10 bg-slate-950/80 flex items-center justify-between gap-2">
              <span className="text-[11px] text-slate-400">
                {tab === 'WEEKLY'
                  ? 'Weekly Commissions reset every Monday at 00:00 local time.'
                  : tab === 'MILESTONES'
                    ? 'Permanent Endgame Achievements spanning Campaign Hell, Spire 120F & Rift TX.'
                    : 'Daily Commissions reset automatically at midnight local time.'}
              </span>
              <RpgButton variant="slate" size="sm" onClick={onClose}>
                Close
              </RpgButton>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
