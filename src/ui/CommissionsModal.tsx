import React, { useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import {
  CalendarClock,
  Check,
  CheckCircle2,
  Flame,
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
  getCurrentWeekKey,
  type ActivityMilestoneDef,
} from '../data/commissions';
import { audioManager } from '../engine/AudioManager';
import { usePlayerStore } from '../store/usePlayerStore';
import { GameIcon, type GameIconName } from './GameIcon';
import { RewardItemStrip } from './RewardItemTile';
import { CornerFiligree, RpgButton, RpgProgressBar, RpgTabs } from './RpgKit';

interface CommissionsModalProps {
  open: boolean;
  onClose: () => void;
}

function getTodayKey(): string {
  const d = new Date();
  return `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;
}

const CATEGORY_META: Record<
  string,
  { label: string; color: string; icon: GameIconName }
> = {
  CAMPAIGN: { label: 'CAMPAIGN', color: '#f5c84c', icon: 'worldmap' },
  SPIRE: { label: 'SPIRE', color: '#38e8ff', icon: 'battle' },
  DUNGEON: { label: 'DUNGEON', color: '#e879f9', icon: 'dungeon_ticket' },
  GROWTH: { label: 'GROWTH', color: '#34d399', icon: 'heroes' },
};

function getQuestVisualMeta(id: string): { icon: GameIconName; color: string } {
  if (id.includes('forge')) return { icon: 'forge', color: '#f5c84c' };
  if (id.includes('summon') || id.includes('supply')) return { icon: 'summon', color: '#38e8ff' };
  if (id.includes('spire')) return { icon: 'codex', color: '#22d3ee' };
  if (id.includes('dungeon')) return { icon: 'dungeon_ticket', color: '#e879f9' };
  if (id.includes('link') || id.includes('combo') || id.includes('boss')) {
    return { icon: 'relic', color: '#fb923c' };
  }
  return { icon: 'battle', color: '#fde047' };
}

export const CommissionsModal: React.FC<CommissionsModalProps> = ({ open, onClose }) => {
  const player = usePlayerStore();
  const [tab, setTab] = useState<'DAILY' | 'WEEKLY' | 'MILESTONES'>('DAILY');
  const [milestoneFilter, setMilestoneFilter] = useState<'ALL' | 'CAMPAIGN' | 'SPIRE' | 'DUNGEON' | 'GROWTH'>('ALL');
  const [notice, setNotice] = useState<string | null>(null);
  const [bannerFallback, setBannerFallback] = useState(false);

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
    const filtered =
      milestoneFilter === 'ALL'
        ? PERMANENT_COMMISSIONS
        : PERMANENT_COMMISSIONS.filter((m) => m.category === milestoneFilter);
    return [...filtered].sort((a, b) => {
      const aClaimed = claimedPermanent.includes(a.id);
      const bClaimed = claimedPermanent.includes(b.id);
      const aReady = !aClaimed && a.getProgress(player) >= a.target;
      const bReady = !bClaimed && b.getProgress(player) >= b.target;
      if (aReady !== bReady) return aReady ? -1 : 1;
      if (aClaimed !== bClaimed) return aClaimed ? 1 : -1;
      return 0;
    });
  }, [player, claimedPermanent, milestoneFilter]);

  const handleClaimAll = () => {
    const res = player.claimAllCommissions();
    audioManager.playSfx(res.ok ? 'ssr_reveal' : 'button');
    flashNotice(res.message);
  };

  const renderActivityChestTrack = (
    title: string,
    pts: number,
    milestones: ActivityMilestoneDef[],
    claimedList: number[],
    accent: 'gold' | 'fuchsia',
    onClaimChest: (points: number) => void,
  ) => {
    const isGold = accent === 'gold';
    const primaryColor = isGold ? '#f5c84c' : '#e879f9';

    return (
      <div
        className="relative rounded-2xl p-3.5 sm:p-4 border overflow-hidden space-y-3"
        style={{
          borderColor: isGold ? 'rgba(245,200,76,0.5)' : 'rgba(232,121,249,0.5)',
          background: isGold
            ? 'linear-gradient(140deg, rgba(66, 38, 12, 0.42) 0%, rgba(12, 18, 42, 0.94) 52%, rgba(8, 12, 28, 0.98) 100%)'
            : 'linear-gradient(140deg, rgba(74, 20, 96, 0.44) 0%, rgba(12, 18, 42, 0.94) 52%, rgba(8, 12, 28, 0.98) 100%)',
        }}
      >
        <CornerFiligree color={primaryColor} size={8} opacity={0.75} />

        <div className="relative z-10 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <div
              className="w-8 h-8 rounded-xl border flex items-center justify-center shrink-0"
              style={{
                borderColor: `${primaryColor}88`,
                backgroundColor: `${primaryColor}20`,
              }}
            >
              {isGold ? (
                <Flame className="w-4 h-4 text-amber-300" />
              ) : (
                <CalendarClock className="w-4 h-4 text-fuchsia-300" />
              )}
            </div>
            <div>
              <div
                className="font-display font-black text-xs uppercase tracking-[0.16em]"
                style={{ color: primaryColor }}
              >
                {title}
              </div>
              <div className="text-[10px] text-slate-300">
                Complete commissions to unlock visual treasure chests
              </div>
            </div>
          </div>

          <div className="px-3 py-1 rounded-xl bg-slate-950/90 border border-white/15 font-mono text-xs font-black text-white">
            <span style={{ color: primaryColor }}>{pts}</span>
            <span className="text-slate-400"> / 100 PTS</span>
          </div>
        </div>

        {/* Glowing Activity Track Progress Gauge */}
        <RpgProgressBar
          value={pts}
          max={100}
          heightClass="h-3"
          gradient={
            isGold
              ? 'linear-gradient(90deg, #38e8ff 0%, #f5c84c 55%, #fde047 100%)'
              : 'linear-gradient(90deg, #a855f7 0%, #38e8ff 55%, #e879f9 100%)'
          }
          glowColor={isGold ? 'rgba(245,200,76,0.55)' : 'rgba(232,121,249,0.55)'}
        />

        {/* 4 Illustrated Treasure Chest Nodes with Visual Reward Item Icons */}
        <div className="relative z-10 grid grid-cols-2 sm:grid-cols-4 gap-2 pt-0.5">
          {milestones.map((ms) => {
            const isClaimed = claimedList.includes(ms.points);
            const isReady = pts >= ms.points && !isClaimed;
            return (
              <motion.button
                key={ms.points}
                type="button"
                disabled={!isReady}
                whileHover={isReady ? { y: -2, scale: 1.02 } : undefined}
                whileTap={isReady ? { scale: 0.96 } : undefined}
                onClick={() => onClaimChest(ms.points)}
                className={`relative rounded-xl p-2.5 text-left border transition flex flex-col justify-between gap-2 overflow-hidden ${
                  isClaimed
                    ? 'bg-emerald-950/35 border-emerald-400/45 opacity-75'
                    : isReady
                      ? isGold
                        ? 'bg-amber-500/20 border-amber-300 shadow-[0_0_20px_rgba(253,224,71,0.45)] cursor-pointer'
                        : 'bg-fuchsia-500/22 border-fuchsia-300 shadow-[0_0_20px_rgba(232,121,249,0.45)] cursor-pointer'
                      : 'bg-slate-950/80 border-white/10 opacity-90 cursor-default'
                }`}
              >
                <div className="flex items-center justify-between gap-1">
                  <div className="flex items-center gap-1.5 min-w-0">
                    <div
                      className={`relative w-8 h-8 rounded-lg flex items-center justify-center shrink-0 border ${
                        isReady
                          ? 'bg-amber-400/25 border-amber-300 animate-bounce'
                          : isClaimed
                            ? 'bg-emerald-500/15 border-emerald-400/50'
                            : 'bg-slate-900 border-white/10'
                      }`}
                    >
                      <GameIcon
                        name="reward_chest"
                        className={`w-6 h-6 ${isClaimed ? 'opacity-50 grayscale' : ''}`}
                      />
                      {isClaimed && (
                        <Check className="absolute w-4 h-4 text-emerald-300 stroke-[3] drop-shadow" />
                      )}
                    </div>
                    <div className="min-w-0">
                      <div
                        className="font-mono text-[10px] font-black leading-none"
                        style={{ color: isReady ? '#fef08a' : primaryColor }}
                      >
                        {ms.points} PTS
                      </div>
                      <div className="text-[10px] font-bold text-white truncate mt-0.5">
                        {ms.label}
                      </div>
                    </div>
                  </div>
                  {isReady && (
                    <span className="px-1.5 py-0.5 rounded bg-amber-300 text-slate-950 text-[8px] font-display font-black uppercase">
                      OPEN
                    </span>
                  )}
                </div>

                {/* Visual Item Icons inside Chest Preview */}
                <RewardItemStrip reward={ms.reward} size="xs" claimed={isClaimed} />
              </motion.button>
            );
          })}
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
          className="fixed inset-0 z-50 bg-[#030510]/86 backdrop-blur-md flex items-center justify-center p-2.5 sm:p-4 select-none"
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.93, y: 16 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 12 }}
            transition={{ type: 'spring', stiffness: 360, damping: 28 }}
            onClick={(e) => e.stopPropagation()}
            className="relative rpg-panel w-full max-w-3xl max-h-[90dvh] flex flex-col overflow-hidden border-2 border-amber-400/65 shadow-[0_26px_84px_rgba(0,0,0,0.94)]"
          >
            <CornerFiligree color="#f5c84c" size={12} opacity={0.9} />

            {/* SCENIC ILLUSTRATED GUILD DISPATCH BANNER HEADER */}
            <div className="relative shrink-0 h-[104px] sm:h-[114px] overflow-hidden border-b border-amber-400/35">
              <img
                src={
                  bannerFallback
                    ? '/assets/environments/bg_lobby_aurelia.webp'
                    : '/assets/ui/bg_checkin_sanctuary.webp'
                }
                onError={() => {
                  if (!bannerFallback) setBannerFallback(true);
                }}
                alt="Starlight Guild Dispatch"
                className="absolute inset-0 w-full h-full object-cover object-center"
                draggable={false}
              />
              <div
                className="absolute inset-0"
                style={{
                  background:
                    'linear-gradient(95deg, rgba(6,10,26,0.94) 0%, rgba(14,20,48,0.82) 55%, rgba(20,14,48,0.52) 100%)',
                }}
              />

              {/* Subtle Standing Vaelen Advisor Art on Right */}
              <img
                src="/assets/standing/standing_vaelen.webp"
                alt="Commander Vaelen"
                draggable={false}
                className="pointer-events-none hidden sm:block absolute right-12 -top-3 h-[215px] object-contain opacity-80 drop-shadow-[0_0_20px_rgba(56,232,255,0.45)]"
              />

              <div className="relative z-10 h-full px-4 sm:px-6 flex items-center justify-between gap-2">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-amber-400/25 to-cyan-500/20 border-2 border-amber-300/75 flex items-center justify-center shrink-0 shadow-[0_0_20px_rgba(245,200,76,0.4)]">
                    <GameIcon name="codex" className="w-8 h-8" />
                  </div>
                  <div className="min-w-0">
                    <div className="text-[10px] font-display font-black uppercase tracking-[0.22em] text-amber-300">
                      STARLIGHT GUILD DISPATCH BOARD
                    </div>
                    <h2 className="font-display text-xl sm:text-2xl font-black text-white text-glow-gold leading-tight truncate">
                      Chaser Commissions
                    </h2>
                    <div className="text-[11px] text-slate-300 hidden sm:block">
                      Daily Missions • Weekly Sovereign Chests • Endgame Commander Milestones
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
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
                    className="p-2 rounded-xl bg-slate-950/85 border border-amber-300/40 text-slate-200 hover:text-amber-300 transition shadow-lg"
                    aria-label="Close Commissions"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>

            {/* TABS + MILESTONE CATEGORY FILTER */}
            <div className="shrink-0 px-4 sm:px-5 pt-3 pb-2.5 bg-slate-950/75 border-b border-white/10 flex flex-wrap items-center justify-between gap-2">
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
                    icon: 'battle',
                    accent: 'gold',
                  },
                  {
                    key: 'WEEKLY',
                    label: weeklyReadyCount > 0 ? `Weekly (${weeklyReadyCount})` : 'Weekly',
                    icon: 'reward_chest',
                    accent: 'cyan',
                  },
                  {
                    key: 'MILESTONES',
                    label:
                      milestoneReadyCount > 0
                        ? `Milestones (${milestoneReadyCount})`
                        : `Milestones (${claimedPermanent.length}/${PERMANENT_COMMISSIONS.length})`,
                    icon: 'summon',
                    accent: 'cyan',
                  },
                ]}
              />

              {tab === 'MILESTONES' && (
                <div className="flex items-center gap-1 flex-wrap">
                  {(['ALL', 'CAMPAIGN', 'SPIRE', 'DUNGEON', 'GROWTH'] as const).map((cat) => {
                    const active = milestoneFilter === cat;
                    return (
                      <button
                        key={cat}
                        type="button"
                        onClick={() => {
                          audioManager.playSfx('button');
                          setMilestoneFilter(cat);
                        }}
                        className={`px-2 py-1 rounded-lg text-[9px] font-display font-black uppercase tracking-wider border transition ${
                          active
                            ? 'bg-cyan-400/20 border-cyan-300 text-cyan-200'
                            : 'bg-slate-900/80 border-white/10 text-slate-400 hover:text-white'
                        }`}
                      >
                        {cat}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            {notice && (
              <div className="mx-4 sm:mx-5 mt-3 px-3.5 py-2 rounded-xl bg-emerald-950/80 border border-emerald-400/60 text-emerald-200 text-xs font-bold flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>{notice}</span>
              </div>
            )}

            {/* SCROLLABLE BODY */}
            <div
              className="flex-1 min-h-0 overflow-y-auto px-4 sm:px-5 py-4 space-y-3.5"
              style={{
                background:
                  'radial-gradient(ellipse 80% 50% at 50% 0%, rgba(14, 30, 68, 0.35) 0%, rgba(5, 8, 20, 0.96) 75%)',
              }}
            >
              {tab === 'DAILY' && (
                <>
                  {renderActivityChestTrack(
                    'Daily Activity Chests',
                    activityPts,
                    DAILY_ACTIVITY_MILESTONES,
                    claimedActivity,
                    'gold',
                    (points) => {
                      const res = player.claimActivityMilestone(points);
                      audioManager.playSfx(res.ok ? 'ssr_reveal' : 'button');
                      flashNotice(res.message);
                    },
                  )}

                  {/* DAILY QUEST CARDS WITH VISUAL ICON MEDALLIONS + VISUAL REWARD ITEM TILES */}
                  <div className="space-y-2.5">
                    {DAILY_COMMISSIONS.map((c) => {
                      const prog = Math.min(c.target, dailyProgressMap[c.id] ?? 0);
                      const isClaimed = claimedDaily.includes(c.id);
                      const isReady = prog >= c.target && !isClaimed;
                      const meta = getQuestVisualMeta(c.id);

                      return (
                        <div
                          key={c.id}
                          className={`relative rounded-2xl p-3 border-l-4 border flex flex-col sm:flex-row sm:items-center justify-between gap-3 transition overflow-hidden ${
                            isReady
                              ? 'bg-gradient-to-r from-amber-500/18 via-slate-900/90 to-slate-950/95 border-amber-300/85 shadow-[0_0_22px_rgba(245,200,76,0.2)]'
                              : isClaimed
                                ? 'bg-slate-950/55 border-emerald-500/35 opacity-70'
                                : 'bg-gradient-to-r from-slate-900/90 via-slate-950/90 to-slate-950/95 border-white/12 hover:border-amber-300/40'
                          }`}
                          style={{
                            borderLeftColor: isClaimed ? '#34d399' : isReady ? '#fde047' : meta.color,
                          }}
                        >
                          <div className="flex items-center gap-3 flex-1 min-w-0">
                            {/* Quest Category Crest Medallion */}
                            <div
                              className="w-11 h-11 rounded-xl border flex items-center justify-center shrink-0"
                              style={{
                                borderColor: `${meta.color}77`,
                                background: `radial-gradient(circle, ${meta.color}2e 0%, rgba(10,14,32,0.95) 72%)`,
                              }}
                            >
                              <GameIcon name={meta.icon} className="w-7 h-7" />
                            </div>

                            <div className="flex-1 min-w-0 space-y-1">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="font-display font-bold text-sm text-white">
                                  {c.title}
                                </span>
                                <span className="px-1.5 py-0.5 rounded-md bg-amber-400/15 border border-amber-300/45 font-mono text-[9px] font-black text-amber-200">
                                  +{c.activityPoints} PTS
                                </span>
                              </div>
                              <div className="text-[11px] text-slate-300 leading-snug">{c.desc}</div>
                              <div className="flex items-center gap-2 pt-0.5">
                                <div className="flex-1 max-w-[190px]">
                                  <RpgProgressBar
                                    value={prog}
                                    max={c.target}
                                    heightClass="h-2"
                                    gradient={
                                      prog >= c.target
                                        ? 'linear-gradient(90deg, #10b981, #fde047)'
                                        : 'linear-gradient(90deg, #0284c7, #38e8ff)'
                                    }
                                  />
                                </div>
                                <span className="font-mono text-[10px] font-black text-cyan-200">
                                  {prog}/{c.target}
                                </span>
                              </div>
                            </div>
                          </div>

                          {/* Visual Reward Item Slots + Claim CTA */}
                          <div className="flex items-center justify-between sm:justify-end gap-2.5 shrink-0 pl-14 sm:pl-0">
                            <RewardItemStrip reward={c.reward} size="sm" claimed={isClaimed} />

                            {isClaimed ? (
                              <span className="px-3 py-1.5 rounded-xl bg-emerald-500/15 border border-emerald-400/50 text-emerald-300 text-[10px] font-display font-black uppercase flex items-center gap-1">
                                <CheckCircle2 className="w-3.5 h-3.5" /> Done
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
                                className="font-display font-black uppercase px-3.5 py-2"
                              >
                                {isReady ? 'Claim' : 'Active'}
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
                  {renderActivityChestTrack(
                    `Weekly Sovereign Chests (${weekKey})`,
                    weeklyPts,
                    WEEKLY_ACTIVITY_MILESTONES,
                    claimedWeeklyMs,
                    'fuchsia',
                    (points) => {
                      const res = player.claimWeeklyActivityMilestone(points);
                      audioManager.playSfx(res.ok ? 'ssr_reveal' : 'button');
                      flashNotice(res.message);
                    },
                  )}

                  {/* WEEKLY QUEST CARDS WITH VISUAL ICON MEDALLIONS + VISUAL REWARD ITEM TILES */}
                  <div className="space-y-2.5">
                    {WEEKLY_COMMISSIONS.map((w) => {
                      const prog = Math.min(w.target, weeklyProgressMap[w.id] ?? 0);
                      const isClaimed = claimedWeekly.includes(w.id);
                      const isReady = prog >= w.target && !isClaimed;
                      const meta = getQuestVisualMeta(w.id);

                      return (
                        <div
                          key={w.id}
                          className={`relative rounded-2xl p-3 border-l-4 border flex flex-col sm:flex-row sm:items-center justify-between gap-3 transition overflow-hidden ${
                            isReady
                              ? 'bg-gradient-to-r from-fuchsia-500/20 via-slate-900/90 to-slate-950/95 border-fuchsia-300/85 shadow-[0_0_22px_rgba(232,121,249,0.22)]'
                              : isClaimed
                                ? 'bg-slate-950/55 border-emerald-500/35 opacity-70'
                                : 'bg-gradient-to-r from-slate-900/90 via-slate-950/90 to-slate-950/95 border-white/12 hover:border-fuchsia-300/40'
                          }`}
                          style={{
                            borderLeftColor: isClaimed ? '#34d399' : isReady ? '#e879f9' : meta.color,
                          }}
                        >
                          <div className="flex items-center gap-3 flex-1 min-w-0">
                            <div
                              className="w-11 h-11 rounded-xl border flex items-center justify-center shrink-0"
                              style={{
                                borderColor: `${meta.color}77`,
                                background: `radial-gradient(circle, ${meta.color}2e 0%, rgba(10,14,32,0.95) 72%)`,
                              }}
                            >
                              <GameIcon name={meta.icon} className="w-7 h-7" />
                            </div>

                            <div className="flex-1 min-w-0 space-y-1">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="font-display font-bold text-sm text-white">
                                  {w.title}
                                </span>
                                <span className="px-1.5 py-0.5 rounded-md bg-fuchsia-500/20 border border-fuchsia-400/50 font-mono text-[9px] font-black text-fuchsia-200">
                                  +{w.activityPoints} PTS
                                </span>
                              </div>
                              <div className="text-[11px] text-slate-300 leading-snug">{w.desc}</div>
                              <div className="flex items-center gap-2 pt-0.5">
                                <div className="flex-1 max-w-[190px]">
                                  <RpgProgressBar
                                    value={prog}
                                    max={w.target}
                                    heightClass="h-2"
                                    gradient={
                                      prog >= w.target
                                        ? 'linear-gradient(90deg, #10b981, #e879f9)'
                                        : 'linear-gradient(90deg, #9333ea, #38e8ff)'
                                    }
                                  />
                                </div>
                                <span className="font-mono text-[10px] font-black text-fuchsia-200">
                                  {prog}/{w.target}
                                </span>
                              </div>
                            </div>
                          </div>

                          <div className="flex items-center justify-between sm:justify-end gap-2.5 shrink-0 pl-14 sm:pl-0">
                            <RewardItemStrip reward={w.reward} size="sm" claimed={isClaimed} />

                            {isClaimed ? (
                              <span className="px-3 py-1.5 rounded-xl bg-emerald-500/15 border border-emerald-400/50 text-emerald-300 text-[10px] font-display font-black uppercase flex items-center gap-1">
                                <CheckCircle2 className="w-3.5 h-3.5" /> Done
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
                                className="font-display font-black uppercase px-3.5 py-2"
                              >
                                {isReady ? 'Claim' : 'Active'}
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
                <div className="space-y-2.5">
                  {sortedMilestones.map((m) => {
                    const prog = Math.min(m.target, m.getProgress(player));
                    const isClaimed = claimedPermanent.includes(m.id);
                    const isReady = prog >= m.target && !isClaimed;
                    const cat = m.category ? CATEGORY_META[m.category] : CATEGORY_META.CAMPAIGN;

                    return (
                      <div
                        key={m.id}
                        className={`relative rounded-2xl p-3 border-l-4 border flex flex-col sm:flex-row sm:items-center justify-between gap-3 transition overflow-hidden ${
                          isReady
                            ? 'bg-gradient-to-r from-cyan-500/18 via-slate-900/90 to-slate-950/95 border-cyan-300/85 shadow-[0_0_22px_rgba(56,232,255,0.22)]'
                            : isClaimed
                              ? 'bg-slate-950/55 border-emerald-500/35 opacity-68'
                              : 'bg-gradient-to-r from-slate-900/90 via-slate-950/90 to-slate-950/95 border-white/12 hover:border-cyan-300/35'
                        }`}
                        style={{
                          borderLeftColor: isClaimed ? '#34d399' : isReady ? '#38e8ff' : cat.color,
                        }}
                      >
                        <div className="flex items-center gap-3 flex-1 min-w-0">
                          <div
                            className="relative w-11 h-11 rounded-xl border flex items-center justify-center shrink-0"
                            style={{
                              borderColor: `${cat.color}88`,
                              background: `radial-gradient(circle, ${cat.color}30 0%, rgba(10,14,32,0.95) 74%)`,
                            }}
                          >
                            <GameIcon name={cat.icon} className="w-7 h-7" />
                            <Trophy
                              className="absolute -bottom-1 -right-1 w-3.5 h-3.5 drop-shadow"
                              style={{ color: cat.color }}
                            />
                          </div>

                          <div className="flex-1 min-w-0 space-y-1">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="font-display font-bold text-sm text-white">
                                {m.title}
                              </span>
                              <span
                                className="px-1.5 py-0.5 rounded text-[8px] font-display font-black uppercase border bg-slate-950/90"
                                style={{ borderColor: `${cat.color}66`, color: cat.color }}
                              >
                                {cat.label}
                              </span>
                            </div>
                            <div className="text-[11px] text-slate-300 leading-snug">{m.desc}</div>
                            <div className="flex items-center gap-2 pt-0.5">
                              <div className="flex-1 max-w-[190px]">
                                <RpgProgressBar
                                  value={prog}
                                  max={m.target}
                                  heightClass="h-2"
                                  gradient="linear-gradient(90deg, #38e8ff, #f5c84c)"
                                />
                              </div>
                              <span className="font-mono text-[10px] font-black text-amber-200">
                                {prog}/{m.target}
                              </span>
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center justify-between sm:justify-end gap-2.5 shrink-0 pl-14 sm:pl-0">
                          <RewardItemStrip reward={m.reward} size="sm" claimed={isClaimed} />

                          {isClaimed ? (
                            <span className="px-3 py-1.5 rounded-xl bg-emerald-500/15 border border-emerald-400/50 text-emerald-300 text-[10px] font-display font-black uppercase flex items-center gap-1">
                              <CheckCircle2 className="w-3.5 h-3.5" /> Done
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
                              className="font-display font-black uppercase px-3.5 py-2"
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
            <div className="shrink-0 px-4 sm:px-5 py-3 border-t border-amber-400/20 bg-slate-950/90 flex items-center justify-between gap-2">
              <span className="text-[11px] text-slate-300">
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
