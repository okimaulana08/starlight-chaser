import React, { useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import {
  CheckCircle2,
  Crown,
  Gift,
  Lock,
  Sparkles,
  Swords,
  Trophy,
  Users,
  Zap,
} from 'lucide-react';
import { HERO_MAP } from '../data/heroes';
import {
  SPIRE_MAX_FLOOR,
  encodeSpireStageId,
  getSpireFloorInfo,
} from '../data/spire';
import { audioManager } from '../engine/AudioManager';
import { computeHeroStats, getSquadSynergyPills } from '../engine/CombatMath';
import { usePlayerStore } from '../store/usePlayerStore';
import { GameIcon, MaterialIcon } from './GameIcon';
import { PartyManagerModal } from './PartyManagerModal';
import { CornerFiligree, RpgBackButton, RpgButton, RpgLootTile } from './RpgKit';
import { StarlightBackdrop } from './StarlightBackdrop';

interface SpireScreenProps {
  onBack: () => void;
  onDeploySpire: (stageId: string) => void;
}

const SECTORS = [
  { label: 'F1–10', start: 1, end: 10 },
  { label: 'F11–20', start: 11, end: 20 },
  { label: 'F21–30', start: 21, end: 30 },
  { label: 'F31–40', start: 31, end: 40 },
  { label: 'F41–50', start: 41, end: 50 },
];

function getTodayKey(): string {
  const d = new Date();
  return `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;
}

export const SpireScreen: React.FC<SpireScreenProps> = ({ onBack, onDeploySpire }) => {
  const {
    squadIds,
    roster,
    relicRanks,
    equipmentInventory,
    unlockedCodexIds,
    spireHighestFloor,
    spireLastSweepDay,
    sweepSpireDaily,
  } = usePlayerStore();

  const highest = spireHighestFloor ?? 0;
  const frontierFloor = Math.min(SPIRE_MAX_FLOOR, highest + 1);
  const initialSectorIdx = Math.min(4, Math.floor((frontierFloor - 1) / 10));

  const [sectorIdx, setSectorIdx] = useState<number>(initialSectorIdx);
  const [selectedFloor, setSelectedFloor] = useState<number>(frontierFloor);
  const [showPartyModal, setShowPartyModal] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  const notify = (msg: string) => {
    setToast(msg);
    window.setTimeout(() => setToast(null), 3400);
  };

  const squadPower = useMemo(
    () =>
      squadIds.reduce((sum, id) => {
        const def = HERO_MAP[id];
        const own = roster[id];
        if (!def || !own) return sum;
        return (
          sum +
          computeHeroStats(
            def,
            own,
            equipmentInventory,
            squadIds,
            unlockedCodexIds.length,
            relicRanks,
          ).powerRating
        );
      }, 0),
    [squadIds, roster, equipmentInventory, unlockedCodexIds.length, relicRanks],
  );

  const synergyPills = useMemo(() => getSquadSynergyPills(squadIds), [squadIds]);
  const floorInfo = useMemo(() => getSpireFloorInfo(selectedFloor), [selectedFloor]);
  const floorUnlocked = selectedFloor <= frontierFloor;
  const floorCleared = selectedFloor <= highest;
  const dailyTributeReady = highest >= 1 && spireLastSweepDay !== getTodayKey();
  const powerReady = squadPower >= floorInfo.recommendedPower * 0.88;

  const sector = SECTORS[sectorIdx] ?? SECTORS[0];
  const sectorFloors = useMemo(
    () =>
      Array.from({ length: sector.end - sector.start + 1 }, (_, i) =>
        getSpireFloorInfo(sector.start + i),
      ),
    [sector.start, sector.end],
  );

  const handleDailyTribute = () => {
    const res = sweepSpireDaily();
    audioManager.playSfx(res.ok ? 'victory' : 'button');
    notify(res.message);
  };

  const handleDeploy = () => {
    if (!floorUnlocked) {
      audioManager.playSfx('button');
      notify(`Clear Floor ${selectedFloor - 1} first to unlock Floor ${selectedFloor}!`);
      return;
    }
    audioManager.playSfx('button');
    onDeploySpire(encodeSpireStageId(selectedFloor));
  };

  return (
    <div className="relative w-full h-full overflow-hidden select-none flex flex-col">
      <StarlightBackdrop variant="CODEX" accentColor={floorInfo.themeColor} />

      {/* TOP HEADER */}
      <div className="relative z-20 shrink-0 px-3 sm:px-5 py-2.5 sm:py-3 border-b border-cyan-400/25 bg-slate-950/75 backdrop-blur-md flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2.5 min-w-0">
          <RpgBackButton onClick={onBack} />
          <div className="min-w-0">
            <div className="text-[9px] sm:text-[10px] font-display font-black uppercase tracking-[0.24em] text-cyan-300 leading-none">
              ENDGAME 50-FLOOR ASCENSION TOWER
            </div>
            <h1 className="font-display text-base sm:text-xl font-black text-white text-glow-gold leading-tight truncate flex items-center gap-2">
              <span>Astral Spire</span>
              <span className="px-2 py-0.5 rounded-full bg-amber-400/20 border border-amber-300/60 font-mono text-[11px] text-amber-200">
                Cleared {highest}/{SPIRE_MAX_FLOOR}
              </span>
            </h1>
          </div>
        </div>

        <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
          <RpgButton
            variant={dailyTributeReady ? 'emerald' : 'slate'}
            size="sm"
            onClick={handleDailyTribute}
            className="relative font-display font-black uppercase tracking-wider"
          >
            <Gift className="w-3.5 h-3.5" />
            <span>
              {highest < 1
                ? 'Daily Tribute (Clear F1)'
                : dailyTributeReady
                  ? `Claim Daily Tribute (F${highest})`
                  : 'Tribute Claimed'}
            </span>
            {dailyTributeReady && (
              <span className="w-2 h-2 rounded-full bg-emerald-300 animate-ping" />
            )}
          </RpgButton>

          <button
            onClick={() => {
              audioManager.playSfx('button');
              setShowPartyModal(true);
            }}
            className="rpg-panel-subtle hover:border-amber-400 px-2.5 py-1.5 text-xs font-bold text-cyan-200 flex items-center gap-1.5 transition"
          >
            <Users className="w-3.5 h-3.5 text-amber-300" />
            <span className="font-mono">PWR {squadPower.toLocaleString()}</span>
          </button>
        </div>
      </div>

      {/* MAIN TWO-PANE BODY */}
      <div className="relative z-20 flex-1 min-h-0 overflow-y-auto px-3 sm:px-5 py-3 sm:py-4">
        <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-4 pb-4">
          {/* LEFT: 50-FLOOR SECTOR TABS + TOWER LADDER */}
          <div className="lg:col-span-5 rpg-panel p-3.5 space-y-3 border-cyan-400/35">
            <div className="flex items-center justify-between gap-2">
              <div className="text-[10px] font-display font-black uppercase tracking-[0.2em] text-cyan-300 flex items-center gap-1.5">
                <Trophy className="w-3.5 h-3.5 text-amber-300" /> Tower Floors
              </div>
              <div className="flex items-center gap-1">
                {SECTORS.map((s, idx) => (
                  <button
                    key={s.label}
                    type="button"
                    onClick={() => {
                      audioManager.playSfx('button');
                      setSectorIdx(idx);
                    }}
                    className={`px-2 py-1 rounded-lg text-[10px] font-mono font-black border transition ${
                      sectorIdx === idx
                        ? 'bg-cyan-400/25 border-cyan-300 text-cyan-100'
                        : 'bg-slate-950/80 border-slate-700 text-slate-400 hover:text-white'
                    }`}
                  >
                    {s.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              {sectorFloors.map((fl) => {
                const isSelected = fl.floor === selectedFloor;
                const isCleared = fl.floor <= highest;
                const isFrontier = fl.floor === frontierFloor;
                const isLocked = fl.floor > frontierFloor;

                return (
                  <motion.button
                    key={fl.floor}
                    whileHover={{ scale: 1.015 }}
                    whileTap={{ scale: 0.985 }}
                    onClick={() => {
                      audioManager.playSfx('button');
                      setSelectedFloor(fl.floor);
                    }}
                    className={`relative rounded-xl p-2.5 text-left border transition overflow-hidden ${
                      isSelected
                        ? 'bg-gradient-to-br from-cyan-500/25 via-slate-900 to-amber-500/15 border-amber-300 shadow-[0_0_20px_rgba(253,224,71,0.3)]'
                        : fl.isBossFloor
                          ? 'bg-rose-950/30 border-rose-400/45 hover:border-amber-300/70'
                          : isLocked
                            ? 'bg-slate-950/60 border-slate-800/80 opacity-60 hover:opacity-85'
                            : 'bg-slate-950/85 border-white/15 hover:border-cyan-400/60'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-1.5">
                      <span className="font-display font-black text-sm text-white flex items-center gap-1">
                        {fl.isBossFloor && <Crown className="w-3.5 h-3.5 text-amber-300" />}
                        <span>Floor {fl.floor}</span>
                      </span>
                      {isCleared ? (
                        <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                      ) : isFrontier ? (
                        <span className="px-1.5 py-0.5 rounded bg-cyan-400 text-slate-950 font-display font-black text-[8px] uppercase">
                          NEXT
                        </span>
                      ) : (
                        <Lock className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                      )}
                    </div>
                    <div
                      className="text-[10px] font-bold truncate mt-1"
                      style={{ color: fl.modifier.color }}
                    >
                      {fl.isBossFloor ? fl.bossName : fl.modifier.name}
                    </div>
                    <div className="flex items-center justify-between text-[9px] font-mono text-slate-400 mt-1">
                      <span>PWR {fl.recommendedPower.toLocaleString()}</span>
                      {!isCleared && (
                        <span className="text-sky-300 font-bold">+{fl.firstClearCrystals}💎</span>
                      )}
                    </div>
                  </motion.button>
                );
              })}
            </div>
          </div>

          {/* RIGHT: SELECTED FLOOR TACTICAL BRIEFING */}
          <div className="lg:col-span-7 rpg-panel overflow-hidden border-amber-400/40 flex flex-col">
            <CornerFiligree color={floorInfo.themeColor} size={10} opacity={0.75} />

            {/* Scenic Biome Header Banner */}
            <div className="relative h-44 sm:h-52 overflow-hidden border-b border-white/10">
              <img
                src={floorInfo.arenaAsset}
                alt={floorInfo.title}
                className="w-full h-full object-cover object-center"
                draggable={false}
              />
              <div
                className="absolute inset-0"
                style={{
                  background:
                    'linear-gradient(0deg, rgba(6,9,22,0.98) 0%, rgba(6,9,22,0.58) 55%, rgba(6,9,22,0.28) 100%)',
                }}
              />

              {/* Boss Portrait Preview on Milestone Floors */}
              {floorInfo.isBossFloor && floorInfo.bossAsset && (
                <img
                  src={floorInfo.bossAsset}
                  alt={floorInfo.bossName}
                  className="pointer-events-none absolute right-3 bottom-0 h-[92%] w-auto object-contain drop-shadow-[0_12px_24px_rgba(0,0,0,0.95)]"
                  draggable={false}
                />
              )}

              <div className="absolute inset-x-0 bottom-0 p-4 sm:p-5 pr-36 sm:pr-44">
                <div className="flex items-center gap-2 flex-wrap mb-1">
                  <span
                    className="px-2.5 py-0.5 rounded-full text-[10px] font-display font-black uppercase tracking-[0.18em] bg-slate-950/90 border"
                    style={{
                      borderColor: floorInfo.modifier.color,
                      color: floorInfo.modifier.color,
                    }}
                  >
                    {floorInfo.isBossFloor ? '👑 MILESTONE BOSS FLOOR' : `FLOOR ${floorInfo.floor} TRIAL`}
                  </span>
                  {floorCleared && (
                    <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 border border-emerald-400/60 text-emerald-200 text-[10px] font-display font-black uppercase">
                      ★ CLEARED
                    </span>
                  )}
                </div>
                <h2 className="font-display text-xl sm:text-3xl font-black text-white text-glow-gold leading-tight">
                  {floorInfo.title}
                </h2>
                <div className="mt-1.5 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-950/85 border border-white/15 text-xs">
                  <Zap className="w-3.5 h-3.5 shrink-0" style={{ color: floorInfo.modifier.color }} />
                  <span className="font-bold text-white">{floorInfo.modifier.name}:</span>
                  <span className="text-slate-300">{floorInfo.modifier.desc}</span>
                </div>
              </div>
            </div>

            {/* Floor Details & Rewards */}
            <div className="p-4 sm:p-5 space-y-4 flex-1 flex flex-col justify-between">
              <div className="space-y-4">
                {/* Power & Active Faction Resonance Strip */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  <div className="rounded-xl bg-slate-950/80 border border-white/10 p-3 flex items-center justify-between">
                    <div>
                      <div className="text-[9px] uppercase font-display font-black tracking-widest text-slate-400">
                        Recommended Power
                      </div>
                      <div className="font-mono text-base font-black text-amber-300 mt-0.5">
                        {floorInfo.recommendedPower.toLocaleString()}
                      </div>
                    </div>
                    <span
                      className={`px-2 py-0.5 rounded-full text-[10px] font-display font-black uppercase border ${
                        powerReady
                          ? 'bg-emerald-500/15 border-emerald-400/60 text-emerald-300'
                          : 'bg-rose-500/15 border-rose-400/60 text-rose-300'
                      }`}
                    >
                      {powerReady ? 'Squad Ready' : 'High Risk'}
                    </span>
                  </div>

                  <div className="rounded-xl bg-slate-950/80 border border-white/10 p-3">
                    <div className="text-[9px] uppercase font-display font-black tracking-widest text-slate-400">
                      Active Squad Resonance
                    </div>
                    <div className="flex flex-wrap gap-1.5 mt-1">
                      {synergyPills.length === 0 ? (
                        <span className="text-xs text-slate-400">Bring 2+ same faction or 4 distinct</span>
                      ) : (
                        synergyPills.map((p) => (
                          <span
                            key={p.id}
                            title={p.desc}
                            className="px-2 py-0.5 rounded-full text-[10px] font-display font-black uppercase border"
                            style={{
                              color: p.color,
                              borderColor: `${p.color}88`,
                              backgroundColor: `${p.color}18`,
                            }}
                          >
                            {p.shortLabel}
                          </span>
                        ))
                      )}
                    </div>
                  </div>
                </div>

                {/* First-Clear & Repeat Spoils */}
                <div className="space-y-2">
                  <div className="text-[10px] font-display font-black uppercase tracking-[0.22em] text-cyan-300 flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5" />{' '}
                    {floorCleared ? 'Floor Clear Rewards (Repeat)' : 'First-Clear Ascension Rewards'}
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <RpgLootTile
                      color="#38e8ff"
                      subLabel="Crystals"
                      bottomLabel={floorCleared ? '+40' : `+${floorInfo.firstClearCrystals}`}
                      topTag={floorCleared ? undefined : '1ST'}
                      index={0}
                    >
                      <GameIcon name="crystal" className="w-8 h-8" />
                    </RpgLootTile>
                    <RpgLootTile
                      color="#f5c84c"
                      subLabel="Gold"
                      bottomLabel={`+${floorInfo.goldRange[0].toLocaleString()}`}
                      index={1}
                    >
                      <GameIcon name="gold" className="w-8 h-8" />
                    </RpgLootTile>
                    <RpgLootTile
                      color="#22d3ee"
                      subLabel="Relic Frag"
                      bottomLabel={`×${floorInfo.relicFragments}+`}
                      index={2}
                    >
                      <GameIcon name="relic" className="w-8 h-8" />
                    </RpgLootTile>
                    <RpgLootTile
                      color="#a78bfa"
                      subLabel="Stones"
                      bottomLabel={`×${floorInfo.forgeStones}+`}
                      index={3}
                    >
                      <MaterialIcon material="forgeStones" className="w-8 h-8" />
                    </RpgLootTile>
                    {floorInfo.starCores > 0 && (
                      <RpgLootTile
                        color="#e879f9"
                        subLabel="Star Core"
                        bottomLabel={`×${floorInfo.starCores}`}
                        index={4}
                      >
                        <MaterialIcon material="starCores" className="w-8 h-8" />
                      </RpgLootTile>
                    )}
                  </div>
                </div>
              </div>

              {/* DEPLOY CTA */}
              <div className="pt-3 border-t border-white/10 flex flex-wrap items-center justify-between gap-3">
                <div className="text-xs text-slate-400">
                  Unlimited free attempts • Conquer Boss Milestones every 5 Floors for massive rewards!
                </div>
                <RpgButton
                  variant={floorUnlocked ? 'gold' : 'slate'}
                  size="md"
                  disabled={!floorUnlocked}
                  onClick={handleDeploy}
                  className="font-display font-black uppercase tracking-[0.16em] px-6 py-3 ml-auto"
                >
                  {floorUnlocked ? (
                    <>
                      <Swords className="w-4 h-4" />
                      <span>
                        {floorCleared ? `Replay Floor ${floorInfo.floor}` : `Ascend Floor ${floorInfo.floor}`}
                      </span>
                    </>
                  ) : (
                    <>
                      <Lock className="w-4 h-4" />
                      <span>Clear Floor {floorInfo.floor - 1} First</span>
                    </>
                  )}
                </RpgButton>
              </div>
            </div>
          </div>
        </div>
      </div>

      {toast && (
        <div className="fixed top-16 left-1/2 -translate-x-1/2 z-50 px-4 py-2 rounded-xl bg-slate-950/95 border border-emerald-400/70 text-emerald-200 text-xs font-bold shadow-2xl">
          {toast}
        </div>
      )}

      <PartyManagerModal open={showPartyModal} onClose={() => setShowPartyModal(false)} />
    </div>
  );
};
