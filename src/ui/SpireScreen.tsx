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
  SPIRE_STRATA,
  encodeSpireStageId,
  getSpireFloorInfo,
  getSpireStratumForFloor,
} from '../data/spire';
import { audioManager } from '../engine/AudioManager';
import {
  computeHeroStats,
  getActivePetPower,
  getSquadSynergyPills,
} from '../engine/CombatMath';
import { usePlayerStore } from '../store/usePlayerStore';
import { GameIcon, MaterialIcon } from './GameIcon';
import { PartyManagerModal } from './PartyManagerModal';
import { CornerFiligree, RpgBackButton, RpgButton, RpgLootTile } from './RpgKit';
import { StarlightBackdrop } from './StarlightBackdrop';

interface SpireScreenProps {
  onBack: () => void;
  onDeploySpire: (stageId: string) => void;
}

function getTodayKey(): string {
  const d = new Date();
  return `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;
}

export const SpireScreen: React.FC<SpireScreenProps> = ({ onBack, onDeploySpire }) => {
  const {
    squadIds,
    roster,
    relicRanks,
    ownedPets,
    activePetId,
    equipmentInventory,
    unlockedCodexIds,
    spireHighestFloor,
    spireLastSweepDay,
    sweepSpireDaily,
  } = usePlayerStore();

  const highest = spireHighestFloor ?? 0;
  const frontierFloor = Math.min(SPIRE_MAX_FLOOR, highest + 1);
  const initialStratumIdx = getSpireStratumForFloor(frontierFloor).index;
  const initialSubSectorIdx = Math.min(
    3,
    Math.floor((frontierFloor - SPIRE_STRATA[initialStratumIdx].floorStart) / 10),
  );

  const [stratumIdx, setStratumIdx] = useState<0 | 1 | 2>(initialStratumIdx);
  const [subSectorIdx, setSubSectorIdx] = useState<number>(initialSubSectorIdx);
  const [selectedFloor, setSelectedFloor] = useState<number>(frontierFloor);
  const [showPartyModal, setShowPartyModal] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  const notify = (msg: string) => {
    setToast(msg);
    window.setTimeout(() => setToast(null), 3400);
  };

  const petsMap = ownedPets ?? {};
  const activeOwnedPet = activePetId && petsMap[activePetId] ? petsMap[activePetId] : null;

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
            { roster, activePet: activeOwnedPet },
          ).powerRating
        );
      }, 0) + getActivePetPower(activePetId, petsMap),
    [
      squadIds,
      roster,
      equipmentInventory,
      unlockedCodexIds.length,
      relicRanks,
      activeOwnedPet,
      activePetId,
      petsMap,
    ],
  );

  const synergyPills = useMemo(
    () => getSquadSynergyPills(squadIds, roster, activePetId, petsMap),
    [squadIds, roster, activePetId, petsMap],
  );
  const floorInfo = useMemo(() => getSpireFloorInfo(selectedFloor), [selectedFloor]);
  const floorUnlocked = selectedFloor <= frontierFloor;
  const floorCleared = selectedFloor <= highest;
  const dailyTributeReady = highest >= 1 && spireLastSweepDay !== getTodayKey();
  const powerReady = squadPower >= floorInfo.recommendedPower * 0.88;

  const activeStratum = SPIRE_STRATA[stratumIdx] ?? SPIRE_STRATA[0];
  const subSectors = useMemo(
    () =>
      Array.from({ length: 4 }, (_, i) => {
        const start = activeStratum.floorStart + i * 10;
        const end = Math.min(activeStratum.floorEnd, start + 9);
        return { label: `F${start}–${end}`, start, end };
      }),
    [activeStratum.floorStart, activeStratum.floorEnd],
  );

  const currentSubSector = subSectors[subSectorIdx] ?? subSectors[0];
  const sectorFloors = useMemo(
    () =>
      Array.from({ length: currentSubSector.end - currentSubSector.start + 1 }, (_, i) =>
        getSpireFloorInfo(currentSubSector.start + i),
      ),
    [currentSubSector.start, currentSubSector.end],
  );

  const handleSelectStratum = (idx: 0 | 1 | 2) => {
    audioManager.playSfx('button');
    setStratumIdx(idx);
    setSubSectorIdx(0);
    setSelectedFloor(SPIRE_STRATA[idx].floorStart);
  };

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
              ENDGAME 120-FLOOR ASCENSION TOWER • 💎 EVERY 5F / 10F BOSS
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
          {/* LEFT: 3-STRATUM + 120-FLOOR TOWER LADDER */}
          <div className="lg:col-span-5 rpg-panel p-3.5 space-y-3 border-cyan-400/35">
            {/* 3 Stratum Tabs (Normal F1-40 | Hard F41-80 | Hell F81-120) */}
            <div className="grid grid-cols-3 gap-1.5">
              {SPIRE_STRATA.map((st) => {
                const active = stratumIdx === st.index;
                return (
                  <button
                    key={st.id}
                    type="button"
                    onClick={() => handleSelectStratum(st.index)}
                    className={`px-2 py-1.5 rounded-xl border text-center transition ${
                      active
                        ? 'bg-slate-900 shadow-lg'
                        : 'bg-slate-950/75 border-slate-800 text-slate-400 hover:text-white'
                    }`}
                    style={{
                      borderColor: active ? st.color : undefined,
                      boxShadow: active ? `0 0 14px ${st.color}44` : undefined,
                    }}
                  >
                    <div
                      className="text-[10px] font-display font-black uppercase tracking-wider leading-tight"
                      style={{ color: active ? st.color : undefined }}
                    >
                      {st.shortLabel}
                    </div>
                    <div className="text-[8px] font-bold uppercase text-slate-400 mt-0.5">
                      {st.id} SCALE
                    </div>
                  </button>
                );
              })}
            </div>

            {/* 10-Floor Sub-Sector Selector */}
            <div className="flex items-center justify-between gap-2">
              <div className="text-[10px] font-display font-black uppercase tracking-[0.2em] text-cyan-300 flex items-center gap-1.5">
                <Trophy className="w-3.5 h-3.5 text-amber-300" /> Floors
              </div>
              <div className="flex items-center gap-1">
                {subSectors.map((s, idx) => (
                  <button
                    key={s.label}
                    type="button"
                    onClick={() => {
                      audioManager.playSfx('button');
                      setSubSectorIdx(idx);
                    }}
                    className={`px-2 py-1 rounded-lg text-[10px] font-mono font-black border transition ${
                      subSectorIdx === idx
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
                        : fl.isMajorBossFloor
                          ? 'bg-gradient-to-br from-rose-950/50 to-amber-950/30 border-amber-400/55 hover:border-amber-300'
                          : fl.isBossFloor
                            ? 'bg-rose-950/30 border-rose-400/45 hover:border-amber-300/70'
                            : isLocked
                              ? 'bg-slate-950/60 border-slate-800/80 opacity-60 hover:opacity-85'
                              : 'bg-slate-950/85 border-white/15 hover:border-cyan-400/60'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-1.5">
                      <span className="font-display font-black text-sm text-white flex items-center gap-1">
                        {fl.isBossFloor && (
                          <Crown
                            className={`w-3.5 h-3.5 ${fl.isMajorBossFloor ? 'text-amber-300' : 'text-rose-300'}`}
                          />
                        )}
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
                      <span>PWR {(fl.recommendedPower / 1000).toFixed(0)}k</span>
                      {!isCleared && fl.firstClearCrystals > 0 ? (
                        <span
                          className={`font-black ${fl.isMajorBossFloor ? 'text-amber-300' : 'text-sky-300'}`}
                        >
                          +{fl.firstClearCrystals}💎
                        </span>
                      ) : (
                        <span className="text-slate-500 font-semibold">MATS</span>
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
                className="w-full h-full object-cover object-center transition-all duration-500"
                style={{
                  filter:
                    floorInfo.stratum.id === 'HELL'
                      ? 'brightness(0.66) contrast(1.22) saturate(1.45) hue-rotate(-32deg)'
                      : floorInfo.stratum.id === 'HARD'
                        ? 'brightness(0.78) contrast(1.14) saturate(1.3) hue-rotate(-14deg)'
                        : undefined,
                }}
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
                    className="px-2 py-0.5 rounded-full text-[9px] font-display font-black uppercase tracking-[0.16em] bg-slate-950/90 border"
                    style={{
                      borderColor: floorInfo.stratum.color,
                      color: floorInfo.stratum.color,
                    }}
                  >
                    {floorInfo.stratum.name}
                  </span>
                  <span
                    className="px-2.5 py-0.5 rounded-full text-[10px] font-display font-black uppercase tracking-[0.18em] bg-slate-950/90 border"
                    style={{
                      borderColor: floorInfo.modifier.color,
                      color: floorInfo.modifier.color,
                    }}
                  >
                    {floorInfo.isMajorBossFloor
                      ? '👑 10F SOVEREIGN GEM MILESTONE'
                      : floorInfo.isBossFloor
                        ? '✦ 5F BOSS GEM MILESTONE'
                        : `FLOOR ${floorInfo.floor} TRIAL`}
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
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="text-[10px] font-display font-black uppercase tracking-[0.22em] text-cyan-300 flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5" />{' '}
                      {floorCleared ? 'Floor Clear Rewards (Repeat)' : 'First-Clear Ascension Rewards'}
                    </div>
                    {floorInfo.firstClearCrystals === 0 && (
                      <span className="text-[10px] font-semibold text-slate-400">
                        💎 Crystals awarded on every 5th &amp; 10th Boss Floor
                      </span>
                    )}
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {!floorCleared && floorInfo.firstClearCrystals > 0 && (
                      <RpgLootTile
                        color="#38e8ff"
                        subLabel="Crystals"
                        bottomLabel={`+${floorInfo.firstClearCrystals}`}
                        topTag={floorInfo.isMajorBossFloor ? '10F' : '5F'}
                        index={0}
                      >
                        <GameIcon name="crystal" className="w-8 h-8" />
                      </RpgLootTile>
                    )}
                    <RpgLootTile
                      color="#f5c84c"
                      subLabel="Gold"
                      bottomLabel={`+${floorInfo.goldRange[0].toLocaleString()}`}
                      index={1}
                    >
                      <GameIcon name="gold" className="w-8 h-8" />
                    </RpgLootTile>
                    <RpgLootTile
                      color="#34d399"
                      subLabel="EXP"
                      bottomLabel={`×${floorInfo.expPotions}+`}
                      index={2}
                    >
                      <MaterialIcon material="expPotions" className="w-8 h-8" />
                    </RpgLootTile>
                    <RpgLootTile
                      color="#22d3ee"
                      subLabel="Relic Frag"
                      bottomLabel={`×${floorInfo.relicFragments}+`}
                      index={3}
                    >
                      <GameIcon name="relic" className="w-8 h-8" />
                    </RpgLootTile>
                    <RpgLootTile
                      color="#a78bfa"
                      subLabel="Stones"
                      bottomLabel={`×${floorInfo.forgeStones}+`}
                      index={4}
                    >
                      <MaterialIcon material="forgeStones" className="w-8 h-8" />
                    </RpgLootTile>
                    {floorInfo.starCores > 0 && (
                      <RpgLootTile
                        color="#e879f9"
                        subLabel="Star Core"
                        bottomLabel={`×${floorInfo.starCores}`}
                        index={5}
                      >
                        <MaterialIcon material="starCores" className="w-8 h-8" />
                      </RpgLootTile>
                    )}
                    {floorInfo.astralAnvilCores > 0 && (
                      <RpgLootTile
                        color="#f5c84c"
                        subLabel="Anvil"
                        bottomLabel={`×${floorInfo.astralAnvilCores}`}
                        index={6}
                      >
                        <MaterialIcon material="astralAnvilCores" className="w-8 h-8" />
                      </RpgLootTile>
                    )}
                  </div>
                </div>
              </div>

              {/* DEPLOY CTA */}
              <div className="pt-3 border-t border-white/10 flex flex-wrap items-center justify-between gap-3">
                <div className="text-xs text-slate-400">
                  Unlimited free attempts • Conquer 5F &amp; 10F Boss Milestones for Starlight Crystals up to F120!
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
                      <span>Clear F{floorInfo.floor - 1} First</span>
                    </>
                  )}
                </RpgButton>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* TOAST */}
      {toast && (
        <div className="fixed bottom-5 left-1/2 -translate-x-1/2 z-50 px-4 py-2 rounded-xl bg-slate-950/95 border border-cyan-400/70 text-xs font-bold text-cyan-100 shadow-2xl">
          {toast}
        </div>
      )}

      <PartyManagerModal open={showPartyModal} onClose={() => setShowPartyModal(false)} />
    </div>
  );
};
