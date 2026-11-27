import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ArrowLeft,
  ChevronRight,
  Crown,
  Lock,
  Maximize2,
  Minus,
  Plus,
  ShieldAlert,
  Skull,
  Sparkles,
  Star,
  Swords,
  Users,
  X,
} from 'lucide-react';
import { ENEMY_MAP } from '../data/enemies';
import { EQUIPMENT_SETS } from '../data/equipment';
import { FACTIONS } from '../data/factions';
import { HERO_MAP } from '../data/heroes';
import { MATERIAL_META, factionToEssenceKey } from '../data/materials';
import { RELIC_MAP } from '../data/relics';
import { REGION_LINKS, REGION_MAP, REGIONS } from '../data/regions';
import {
  getHighestUnlockedStage,
  getStagesByRegion,
  isRegionUnlocked,
  isStageUnlocked,
  STAGE_MAP,
  STAGES,
} from '../data/stages';
import { audioManager } from '../engine/AudioManager';
import { computeHeroStats } from '../engine/CombatMath';
import { usePlayerStore } from '../store/usePlayerStore';
import type { RegionDef } from '../types/game';
import { ArtImage } from './ArtImage';
import { GameIcon, MaterialIcon } from './GameIcon';
import { PartyManagerModal } from './PartyManagerModal';

interface WorldMapOverlayProps {
  squadPower: number;
  onClose: () => void;
  onDeploy: (stageId: string) => void;
}

const MAP_ASPECT = 16 / 9;

/**
 * 12 Scenic S-Curve Adventure Trail coordinates (in % of the Region Trail Canvas)
 * climbing from bottom-left (Stage X-1) across two Elite gates (X-4, X-8) to the Boss Summit (X-12).
 */
const STAGE_TRAIL_NODES: Array<{ x: number; y: number }> = [
  { x: 13, y: 82 }, // X-1
  { x: 37, y: 86 }, // X-2
  { x: 62, y: 81 }, // X-3
  { x: 86, y: 73 }, // X-4 (Mini-Boss Elite)
  { x: 81, y: 52 }, // X-5
  { x: 58, y: 55 }, // X-6
  { x: 35, y: 50 }, // X-7
  { x: 13, y: 44 }, // X-8 (Mini-Boss Elite)
  { x: 21, y: 22 }, // X-9
  { x: 44, y: 25 }, // X-10
  { x: 66, y: 19 }, // X-11
  { x: 87, y: 20 }, // X-12 (Region Boss Summit)
];

function getRegionEmblemSrc(region: RegionDef, unlocked: boolean): string {
  if (!unlocked) return '/assets/icons/region_seal.webp';
  return `/assets/icons/region_${region.chapter}.webp`;
}

function buildCurvedPath(x1: number, y1: number, x2: number, y2: number, bend = 0.14): string {
  const mx = (x1 + x2) / 2;
  const my = (y1 + y2) / 2;
  const dx = x2 - x1;
  const dy = y2 - y1;
  const cx = mx - dy * bend;
  const cy = my + dx * bend;
  return `M ${x1} ${y1} Q ${cx} ${cy} ${x2} ${y2}`;
}

export const WorldMapOverlay: React.FC<WorldMapOverlayProps> = ({
  squadPower: initialSquadPower,
  onClose,
  onDeploy,
}) => {
  const {
    clearedStages,
    selectedStageId,
    setSelectedStage,
    squadIds,
    partyPresets,
    activePresetIndex,
    selectPreset,
    roster,
    equipmentInventory,
    unlockedCodexIds,
    relicRanks,
    favoriteHeroId,
  } = usePlayerStore();
  const [showPartyModal, setShowPartyModal] = useState(false);

  const squadPower = useMemo(() => {
    const computed = squadIds.reduce((sum, id) => {
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
    }, 0);
    return computed || initialSquadPower;
  }, [squadIds, roster, equipmentInventory, unlockedCodexIds.length, relicRanks, initialSquadPower]);

  const safeInitialStage = useMemo(() => {
    const saved = STAGE_MAP[selectedStageId];
    if (saved && isStageUnlocked(saved, clearedStages)) return saved;
    return getHighestUnlockedStage(clearedStages);
  }, [selectedStageId, clearedStages]);

  const [viewMode, setViewMode] = useState<'CONTINENT' | 'REGION'>('CONTINENT');
  const [focusedRegionId, setFocusedRegionId] = useState<string>(safeInitialStage.regionId);
  const [pickedStageId, setPickedStageId] = useState<string>(safeInitialStage.id);

  // Interactive Full-Screen Pan & Zoom state for the 16:9 Painted Overworld Atlas
  const viewportRef = useRef<HTMLDivElement | null>(null);
  const [vpSize, setVpSize] = useState<{ w: number; h: number }>({
    w: typeof window !== 'undefined' ? window.innerWidth : 1280,
    h: typeof window !== 'undefined' ? window.innerHeight : 800,
  });
  const [zoom, setZoom] = useState<number>(1.0);
  const [pan, setPan] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const dragRef = useRef<{
    active: boolean;
    moved: boolean;
    startX: number;
    startY: number;
    originX: number;
    originY: number;
  }>({ active: false, moved: false, startX: 0, startY: 0, originX: 0, originY: 0 });

  useEffect(() => {
    const update = () => {
      const el = viewportRef.current;
      setVpSize({
        w: el ? el.clientWidth : window.innerWidth,
        h: el ? el.clientHeight : window.innerHeight,
      });
    };
    update();
    window.addEventListener('resize', update);
    return () => window.removeEventListener('resize', update);
  }, []);

  const baseMapW = Math.max(vpSize.w, vpSize.h * MAP_ASPECT);
  const baseMapH = baseMapW / MAP_ASPECT;
  const scaledW = baseMapW * zoom;
  const scaledH = baseMapH * zoom;

  const clampPan = useCallback(
    (nx: number, ny: number, targetZoom = zoom) => {
      const sw = baseMapW * targetZoom;
      const sh = baseMapH * targetZoom;
      const minX = Math.min(0, vpSize.w - sw);
      const minY = Math.min(0, vpSize.h - sh);
      return {
        x: Math.max(minX, Math.min(0, nx)),
        y: Math.max(minY, Math.min(0, ny)),
      };
    },
    [baseMapW, baseMapH, vpSize.w, vpSize.h, zoom],
  );

  const focusCameraOn = useCallback(
    (pctX: number, pctY: number, targetZoom = zoom) => {
      const sw = baseMapW * targetZoom;
      const sh = baseMapH * targetZoom;
      const targetX = vpSize.w * 0.5 - (pctX / 100) * sw;
      const targetY = vpSize.h * 0.44 - (pctY / 100) * sh;
      setPan(clampPan(targetX, targetY, targetZoom));
    },
    [baseMapW, baseMapH, vpSize.w, vpSize.h, zoom, clampPan],
  );

  useEffect(() => {
    if (vpSize.w < 768) {
      focusCameraOn(22, 48, 1.0);
    } else {
      setPan(clampPan((vpSize.w - baseMapW) * 0.5, (vpSize.h - baseMapH) * 0.5, 1.0));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [vpSize.w, vpSize.h]);

  const focusedRegion: RegionDef = REGION_MAP[focusedRegionId] ?? REGIONS[0];
  const focusedRegionUnlocked = isRegionUnlocked(focusedRegion.id, clearedStages);
  const prevRegionForFocused =
    focusedRegion.chapter > 1 ? REGION_MAP[`region_${focusedRegion.chapter - 1}`] : null;
  const prevRegionClearedCount = prevRegionForFocused
    ? getStagesByRegion(prevRegionForFocused.id).filter((s) => clearedStages.includes(s.id)).length
    : 0;

  const regionStages = useMemo(() => getStagesByRegion(focusedRegion.id), [focusedRegion.id]);

  const activeStage = useMemo(() => {
    const found = regionStages.find((s) => s.id === pickedStageId);
    if (found) return found;
    const unlockedList = regionStages.filter((s) => isStageUnlocked(s, clearedStages));
    return unlockedList[unlockedList.length - 1] ?? regionStages[0];
  }, [regionStages, pickedStageId, clearedStages]);

  const frontierStageId = useMemo(() => {
    const firstUnclear = regionStages.find(
      (s) => isStageUnlocked(s, clearedStages) && !clearedStages.includes(s.id),
    );
    return firstUnclear?.id ?? regionStages[regionStages.length - 1]?.id;
  }, [regionStages, clearedStages]);

  const leaderHero = HERO_MAP[squadIds[1] ?? squadIds[0] ?? favoriteHeroId] ?? HERO_MAP.vaelen;

  const totalPlayableStages = STAGES.length; // 120 stages (10 regions × 12)
  const totalCleared = clearedStages.length;
  const unlockedRegionsCount = useMemo(
    () => REGIONS.filter((r) => isRegionUnlocked(r.id, clearedStages)).length,
    [clearedStages],
  );

  const getRegionClearedCount = (regionId: string) =>
    getStagesByRegion(regionId).filter((s) => clearedStages.includes(s.id)).length;

  const selectRegionOnAtlas = (region: RegionDef) => {
    audioManager.playSfx('button');
    setFocusedRegionId(region.id);
    if (vpSize.w < 960 || zoom > 1.02) {
      focusCameraOn(region.mapPos.x, region.mapPos.y, zoom);
    }
  };

  const enterRegion = (region: RegionDef) => {
    if (!isRegionUnlocked(region.id, clearedStages)) {
      selectRegionOnAtlas(region);
      return;
    }
    audioManager.playSfx('button');
    setFocusedRegionId(region.id);
    const stages = getStagesByRegion(region.id);
    const frontier =
      stages.find((s) => isStageUnlocked(s, clearedStages) && !clearedStages.includes(s.id)) ??
      stages[stages.length - 1] ??
      stages[0];
    if (frontier) setPickedStageId(frontier.id);
    setViewMode('REGION');
  };

  const adjustZoom = (delta: number) => {
    const nextZ = Number(Math.max(1.0, Math.min(1.75, zoom + delta)).toFixed(2));
    setZoom(nextZ);
    focusCameraOn(focusedRegion.mapPos.x, focusedRegion.mapPos.y, nextZ);
  };

  const resetCamera = () => {
    setZoom(1.0);
    if (vpSize.w < 768) {
      focusCameraOn(22, 48, 1.0);
    } else {
      setPan(clampPan((vpSize.w - baseMapW) * 0.5, (vpSize.h - baseMapH) * 0.5, 1.0));
    }
  };

  const onPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if ((e.target as HTMLElement).closest('button')) return;
    dragRef.current = {
      active: true,
      moved: false,
      startX: e.clientX,
      startY: e.clientY,
      originX: pan.x,
      originY: pan.y,
    };
    setIsDragging(true);
  };

  const onPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!dragRef.current.active) return;
    const dx = e.clientX - dragRef.current.startX;
    const dy = e.clientY - dragRef.current.startY;
    if (Math.hypot(dx, dy) > 4) dragRef.current.moved = true;
    setPan(clampPan(dragRef.current.originX + dx, dragRef.current.originY + dy));
  };

  const endDrag = () => {
    dragRef.current.active = false;
    setIsDragging(false);
  };

  const activeStageUnlocked = activeStage ? isStageUnlocked(activeStage, clearedStages) : false;
  const isDanger = activeStage ? squadPower < activeStage.recommendedPower * 0.8 : false;

  const stageEnemyIds = useMemo(() => {
    if (!activeStage) return [];
    const set = new Set<string>();
    for (const w of activeStage.waves) {
      for (const sp of w.spawns) set.add(sp.enemyId);
    }
    return Array.from(set);
  }, [activeStage]);

  return (
    <div className="fixed inset-0 z-50 w-screen h-[100dvh] overflow-hidden bg-[#050a18] select-none">
      {/* ========================================================================== */}
      {/* VIEW A: FULL-SCREEN LIVING PAINTED WORLD ATLAS OF AETHERIA (10 REGIONS)    */}
      {/* ========================================================================== */}
      {viewMode === 'CONTINENT' && (
        <div
          ref={viewportRef}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={endDrag}
          onPointerCancel={endDrag}
          onPointerLeave={endDrag}
          onWheel={(e) => {
            if (Math.abs(e.deltaY) > 10) {
              adjustZoom(e.deltaY < 0 ? 0.15 : -0.15);
            }
          }}
          className={`relative w-full h-full overflow-hidden touch-none ${
            isDragging ? 'cursor-grabbing' : 'cursor-grab'
          }`}
        >
          {/* ASPECT-LOCKED 16:9 WORLD STAGE */}
          <div
            style={{
              width: `${scaledW}px`,
              height: `${scaledH}px`,
              transform: `translate3d(${pan.x}px, ${pan.y}px, 0)`,
              transition: isDragging
                ? 'none'
                : 'transform 0.45s cubic-bezier(0.22, 1, 0.36, 1), width 0.35s ease, height 0.35s ease',
            }}
            className="relative will-change-transform"
          >
            {/* 1. Hand-Painted Fantasy Overworld Illustration */}
            <img
              src="/assets/environments/bg_worldmap_aetheria.webp"
              alt="World of Aetheria"
              draggable={false}
              className="w-full h-full object-fill pointer-events-none brightness-[0.98] contrast-[1.04] saturate-[1.06]"
            />

            {/* 2. Subtle Edge Cinematic Vignette */}
            <div
              className="pointer-events-none absolute inset-0"
              style={{
                background:
                  'radial-gradient(ellipse 88% 82% at 45% 48%, transparent 52%, rgba(4, 8, 22, 0.56) 100%)',
              }}
            />

            {/* 3. Seamless Eastern Twilight Fog-of-War Mist */}
            <div
              className="pointer-events-none absolute inset-0 animate-fog-swirl"
              style={{
                background:
                  'radial-gradient(ellipse 46% 78% at 88% 48%, rgba(28, 12, 64, 0.4) 0%, rgba(12, 10, 34, 0.22) 52%, transparent 86%)',
              }}
            />

            {/* 4. Soft Drifting Cloud Wisps */}
            <div className="pointer-events-none absolute inset-0 overflow-hidden">
              <div
                className="absolute top-[10%] left-[32%] w-[26%] h-[16%] rounded-full blur-2xl animate-cloud-drift"
                style={{ background: 'rgba(224, 242, 254, 0.24)' }}
              />
              <div
                className="absolute bottom-[14%] left-[48%] w-[24%] h-[14%] rounded-full blur-2xl animate-cloud-drift"
                style={{ background: 'rgba(224, 242, 254, 0.18)', animationDelay: '-9s' }}
              />
            </div>

            {/* 5. Curved Animated Golden Ley-Line Routes Connecting All 10 Regions */}
            <svg
              viewBox="0 0 1000 562.5"
              preserveAspectRatio="none"
              className="pointer-events-none absolute inset-0 w-full h-full z-10"
            >
              <defs>
                <filter id="leyGlow" x="-20%" y="-20%" width="140%" height="140%">
                  <feGaussianBlur stdDeviation="2.8" result="b" />
                  <feMerge>
                    <feMergeNode in="b" />
                    <feMergeNode in="SourceGraphic" />
                  </feMerge>
                </filter>
              </defs>
              {REGION_LINKS.map(([fromId, toId], idx) => {
                const a = REGION_MAP[fromId];
                const b = REGION_MAP[toId];
                if (!a || !b) return null;
                const bothOpen =
                  isRegionUnlocked(a.id, clearedStages) && isRegionUnlocked(b.id, clearedStages);
                const d = buildCurvedPath(
                  a.mapPos.x * 10,
                  a.mapPos.y * 5.625,
                  b.mapPos.x * 10,
                  b.mapPos.y * 5.625,
                  idx % 2 === 0 ? 0.12 : -0.12,
                );
                return (
                  <g key={`${fromId}_${toId}`}>
                    {bothOpen && (
                      <path
                        d={d}
                        fill="none"
                        stroke="#f5c84c"
                        strokeOpacity="0.35"
                        strokeWidth="6.5"
                        strokeLinecap="round"
                        filter="url(#leyGlow)"
                      />
                    )}
                    <path
                      d={d}
                      fill="none"
                      stroke={bothOpen ? '#fef08a' : '#a78bfa'}
                      strokeOpacity={bothOpen ? 0.92 : 0.34}
                      strokeWidth={bothOpen ? 2.6 : 1.7}
                      strokeDasharray={bothOpen ? '9 9' : '4 8'}
                      strokeLinecap="round"
                      className={bothOpen ? 'animate-leyline' : undefined}
                    />
                  </g>
                );
              })}
            </svg>

            {/* 6. 10 Sculpted RPG Region Landmark Pins (Dynamic Sequential Unlock!) */}
            {REGIONS.map((region) => {
              const regionUnlocked = isRegionUnlocked(region.id, clearedStages);
              const isSelected = focusedRegion.id === region.id;
              const clearedInRegion = getRegionClearedCount(region.id);
              const pct = clearedInRegion / region.stageCount;
              const allCleared = regionUnlocked && clearedInRegion >= region.stageCount;
              const ringCircumference = 2 * Math.PI * 26;

              return (
                <button
                  key={region.id}
                  onClick={(e) => {
                    e.stopPropagation();
                    if (isSelected && regionUnlocked) {
                      enterRegion(region);
                    } else {
                      selectRegionOnAtlas(region);
                    }
                  }}
                  onDoubleClick={(e) => {
                    e.stopPropagation();
                    enterRegion(region);
                  }}
                  style={{
                    left: `${region.mapPos.x}%`,
                    top: `${region.mapPos.y}%`,
                  }}
                  className={`group absolute -translate-x-1/2 -translate-y-1/2 flex flex-col items-center transition-transform duration-200 ${
                    isSelected ? 'scale-110 z-30' : 'hover:scale-105 z-20'
                  }`}
                >
                  <div className={`relative ${isSelected && regionUnlocked ? 'animate-pin-bob' : ''}`}>
                    {regionUnlocked && (
                      <div
                        className={`pointer-events-none absolute -inset-2 rounded-full blur-md transition-opacity ${
                          isSelected ? 'opacity-85' : 'opacity-40 group-hover:opacity-75'
                        }`}
                        style={{ background: region.themeColor }}
                      />
                    )}

                    <div
                      className={`relative w-11 h-11 sm:w-14 sm:h-14 rounded-full flex items-center justify-center transition ${
                        regionUnlocked
                          ? 'bg-slate-950/90 shadow-[0_8px_24px_rgba(0,0,0,0.85)]'
                          : 'bg-slate-950/75 opacity-80 hover:opacity-100'
                      }`}
                    >
                      {regionUnlocked && (
                        <svg
                          viewBox="0 0 60 60"
                          className="pointer-events-none absolute -inset-1 w-[calc(100%+8px)] h-[calc(100%+8px)] -rotate-90"
                        >
                          <circle
                            cx="30"
                            cy="30"
                            r="26"
                            fill="none"
                            stroke="rgba(15, 23, 42, 0.85)"
                            strokeWidth="4"
                          />
                          <circle
                            cx="30"
                            cy="30"
                            r="26"
                            fill="none"
                            stroke={isSelected ? '#fde047' : region.themeColor}
                            strokeWidth="3.5"
                            strokeLinecap="round"
                            strokeDasharray={ringCircumference}
                            strokeDashoffset={ringCircumference * (1 - Math.max(0.08, pct))}
                          />
                        </svg>
                      )}

                      <img
                        src={getRegionEmblemSrc(region, regionUnlocked)}
                        alt={region.name}
                        draggable={false}
                        className={`w-9 h-9 sm:w-12 sm:h-12 object-contain drop-shadow-[0_2px_6px_rgba(0,0,0,0.9)] ${
                          !regionUnlocked ? 'opacity-80' : ''
                        }`}
                      />

                      <span
                        className="absolute -top-1 -left-1.5 px-1.5 py-0.5 rounded text-[8px] font-display font-black uppercase bg-slate-950 border shadow-md leading-none"
                        style={{
                          borderColor: regionUnlocked ? region.themeColor : '#64748b',
                          color: regionUnlocked ? region.themeColor : '#94a3b8',
                        }}
                      >
                        CH.{region.chapter}
                      </span>

                      {regionUnlocked && (
                        <span className="absolute -bottom-1.5 px-1.5 py-0.5 rounded-full bg-slate-950 border border-amber-400/80 text-[8px] sm:text-[9px] font-mono font-black text-amber-200 leading-none flex items-center gap-0.5 shadow-lg">
                          {allCleared ? (
                            <Crown className="w-2.5 h-2.5 text-amber-300" />
                          ) : (
                            <Star className="w-2 h-2 text-amber-300 fill-amber-300" />
                          )}
                          {clearedInRegion}/{region.stageCount}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Sculpted Rounded RPG Ribbon Banner */}
                  <div
                    className={`mt-1.5 px-2.5 py-0.5 rounded-full text-[9px] sm:text-[10px] font-display font-black tracking-[0.08em] uppercase whitespace-nowrap border shadow-[0_4px_14px_rgba(0,0,0,0.85)] backdrop-blur-md transition ${
                      regionUnlocked
                        ? isSelected
                          ? 'bg-gradient-to-r from-amber-400 via-yellow-300 to-amber-400 text-slate-950 border-amber-100'
                          : 'bg-slate-950/90 text-white border-amber-400/50 group-hover:border-amber-300'
                        : isSelected
                          ? 'bg-violet-950/95 text-violet-200 border-violet-400/80'
                          : 'bg-slate-950/80 text-slate-300 border-slate-600/60'
                    }`}
                  >
                    {region.name}
                  </div>
                </button>
              );
            })}
          </div>

          {/* FLOATING FULL-SCREEN RPG CHROME */}
          <div className="pointer-events-none absolute top-0 inset-x-0 z-40 flex items-start justify-between gap-2 safe-area-pad sm:p-3 ls-compact-pad">
            <div className="pointer-events-auto flex items-center gap-2">
              <button
                onClick={() => {
                  audioManager.playSfx('button');
                  onClose();
                }}
                className="rpg-blade px-3 py-1.5 text-xs font-display font-extrabold uppercase tracking-wider text-white flex items-center gap-1.5"
              >
                <ArrowLeft className="w-4 h-4 text-amber-300" />
                <span className="hidden sm:inline">Lobby</span>
              </button>

              <div className="rpg-panel-subtle px-3 py-1 flex items-center gap-2 border-l-4 border-l-amber-400">
                <GameIcon name="worldmap" className="w-6 h-6 sm:w-7 sm:h-7" />
                <div>
                  <div className="text-[8px] sm:text-[9px] font-black uppercase tracking-[0.22em] text-cyan-300 leading-none">
                    {unlockedRegionsCount} / 10 REALMS UNLOCKED • 120 STAGES
                  </div>
                  <h1 className="font-display text-xs sm:text-lg font-black text-white text-glow-gold leading-tight">
                    WORLD OF AETHERIA
                  </h1>
                </div>
              </div>
            </div>

            <div className="pointer-events-auto flex items-center gap-1.5">
              <div className="hidden md:flex items-center gap-2 rpg-panel-subtle px-3 py-1.5 text-[11px] font-mono">
                <Star className="w-3.5 h-3.5 text-amber-300 fill-amber-300" />
                <span className="font-black text-amber-200">
                  {totalCleared}/{totalPlayableStages}
                </span>
                <span className="text-slate-600">|</span>
                <span className="text-cyan-300 font-bold">PWR {squadPower.toLocaleString()}</span>
              </div>

              <div className="flex items-center rounded-xl overflow-hidden bg-slate-950/85 border border-amber-400/35 backdrop-blur-md">
                <button
                  onClick={() => adjustZoom(-0.2)}
                  className="p-1.5 sm:p-2 text-slate-200 hover:text-amber-300 transition"
                  title="Zoom Out"
                >
                  <Minus className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={resetCamera}
                  className="p-1.5 sm:p-2 border-x border-slate-700/80 text-slate-200 hover:text-cyan-300 transition"
                  title="Reset Map View"
                >
                  <Maximize2 className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => adjustZoom(0.2)}
                  className="p-1.5 sm:p-2 text-slate-200 hover:text-amber-300 transition"
                  title="Zoom In"
                >
                  <Plus className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>

          {/* Bottom Floating Region Dossier & Quick-Jump Compass */}
          <div className="pointer-events-none absolute bottom-0 inset-x-0 z-40 safe-area-pad sm:p-3 ls-compact-pad flex flex-col items-center gap-1.5">
            {/* Compact Floating 1–10 Quick-Jump Strip */}
            <div className="pointer-events-auto flex items-center gap-1 max-w-full overflow-x-auto px-2 py-1 bg-slate-950/85 border border-amber-400/25 backdrop-blur-md rounded-full">
              {REGIONS.map((r) => {
                const open = isRegionUnlocked(r.id, clearedStages);
                const sel = r.id === focusedRegion.id;
                return (
                  <button
                    key={r.id}
                    onClick={() => selectRegionOnAtlas(r)}
                    className={`shrink-0 px-2.5 py-0.5 sm:py-1 rounded-full text-[10px] font-display font-black uppercase tracking-wider flex items-center gap-1 transition ${
                      sel
                        ? 'bg-amber-400 text-slate-950 shadow-[0_0_14px_rgba(245,200,76,0.7)]'
                        : open
                          ? 'text-slate-200 hover:bg-white/10'
                          : 'text-slate-500 hover:text-slate-300'
                    }`}
                  >
                    {!open && <Lock className="w-2.5 h-2.5" />}
                    <span>{r.chapter}</span>
                    <span className="hidden lg:inline">{r.name.split(' ')[0]}</span>
                  </button>
                );
              })}
            </div>

            {/* Floating Selected Region Card */}
            <div className="pointer-events-auto rpg-panel w-full max-w-4xl px-3 sm:px-4 py-2 sm:py-2.5 flex flex-col sm:flex-row sm:items-center justify-between gap-2 sm:gap-3 border-amber-400/45">
              <div className="flex items-center gap-2.5 sm:gap-3 min-w-0 flex-1">
                <img
                  src={getRegionEmblemSrc(focusedRegion, focusedRegionUnlocked)}
                  alt={focusedRegion.name}
                  className="w-10 h-10 sm:w-12 sm:h-12 object-contain shrink-0 drop-shadow-[0_4px_12px_rgba(0,0,0,0.8)]"
                />
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <span
                      className="px-2 py-0.5 rounded text-[9px] font-black uppercase border bg-black/80"
                      style={{
                        borderColor: focusedRegion.themeColor,
                        color: focusedRegion.themeColor,
                      }}
                    >
                      CHAPTER {focusedRegion.chapter}
                    </span>
                    {focusedRegion.faction !== 'VOID' && (
                      <span className="text-[10px] font-bold uppercase text-slate-300 hidden md:inline ls-hide">
                        {FACTIONS[focusedRegion.faction].name}
                      </span>
                    )}
                    <span className="text-[10px] font-mono text-amber-300 font-bold">
                      PWR {focusedRegion.recommendedPowerRange[0].toLocaleString()}–
                      {focusedRegion.recommendedPowerRange[1].toLocaleString()}
                    </span>
                    <span className="text-[10px] text-fuchsia-300 font-bold flex items-center gap-1">
                      <Skull className="w-3 h-3" /> {focusedRegion.bossName}
                    </span>
                  </div>
                  <h2 className="font-display text-sm sm:text-lg font-black text-white leading-tight truncate mt-0.5">
                    {focusedRegion.name}{' '}
                    <span className="text-xs font-serif-italic italic font-normal text-amber-200/85 hidden sm:inline">
                      — {focusedRegion.subtitle}
                    </span>
                  </h2>
                  <p className="ls-hide text-[11px] text-slate-300 line-clamp-1 sm:line-clamp-2 mt-0.5">
                    {focusedRegion.lore}
                  </p>
                </div>
              </div>

              <div className="shrink-0">
                {focusedRegionUnlocked ? (
                  <button
                    onClick={() => enterRegion(focusedRegion)}
                    className="rpg-battle-cta w-full sm:w-auto px-5 sm:px-7 py-2 sm:py-2.5 text-slate-950 font-display font-black text-xs sm:text-sm uppercase tracking-[0.14em] flex items-center justify-center gap-2"
                  >
                    <GameIcon name="battle" className="w-5 h-5" />
                    <span>Enter Region</span>
                    <ChevronRight className="w-4 h-4" />
                  </button>
                ) : (
                  <div className="w-full sm:w-auto px-4 py-2 rounded-xl bg-slate-950/90 border border-violet-500/50 text-violet-200 text-[11px] font-bold flex items-center justify-center gap-2">
                    <Lock className="w-4 h-4 text-violet-400 shrink-0" />
                    <span className="truncate max-w-[260px]">
                      Clear Ch.{focusedRegion.chapter - 1} ({prevRegionClearedCount}/12) to Unlock
                    </span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================== */}
      {/* VIEW B: SCENIC WINDING 12-STAGE ADVENTURE PATH (ZOOMED BIOME PANORAMA!)    */}
      {/* ========================================================================== */}
      {viewMode === 'REGION' && activeStage && (
        <div className="relative w-full h-full flex flex-col overflow-hidden">
          {/* LAYER 0: Bespoke Hand-Painted Region Biome Panorama Backdrop */}
          <div className="pointer-events-none absolute inset-0 overflow-hidden">
            <img
              src={focusedRegion.arenaAsset}
              alt={focusedRegion.name}
              className="w-full h-full object-cover scale-105 transition-all duration-700"
              style={{
                filter: 'brightness(0.58) saturate(1.16) contrast(1.06)',
              }}
            />
            <div
              className="absolute inset-0"
              style={{
                background: `radial-gradient(ellipse 75% 70% at 38% 50%, ${focusedRegion.themeColor}22 0%, rgba(5, 9, 24, 0.72) 68%, rgba(4, 7, 18, 0.92) 100%)`,
              }}
            />
            <div
              className="absolute top-[12%] left-[18%] w-[40%] h-[20%] rounded-full blur-3xl animate-cloud-drift"
              style={{ background: `${focusedRegion.themeColor}24` }}
            />
          </div>

          {/* LAYER 1: Floating Top Region Bar */}
          <div className="relative z-20 shrink-0 flex items-center justify-between gap-2 safe-area-pad sm:px-4 sm:py-2 ls-compact-pad">
            <div className="flex items-center gap-2 min-w-0">
              <button
                onClick={() => {
                  audioManager.playSfx('button');
                  setViewMode('CONTINENT');
                }}
                className="rpg-blade px-3 py-1.5 text-xs font-display font-extrabold uppercase tracking-wider text-white flex items-center gap-1.5 shrink-0"
              >
                <ArrowLeft className="w-4 h-4 text-amber-300" />
                <span className="hidden sm:inline">World Map</span>
              </button>

              <div
                className="rpg-panel-subtle px-2.5 sm:px-3 py-1 flex items-center gap-2 border-l-4 min-w-0"
                style={{ borderLeftColor: focusedRegion.themeColor }}
              >
                <img
                  src={getRegionEmblemSrc(focusedRegion, true)}
                  alt={focusedRegion.name}
                  className="w-7 h-7 object-contain shrink-0"
                />
                <div className="min-w-0">
                  <div
                    className="text-[8px] sm:text-[9px] font-black uppercase tracking-[0.2em] truncate leading-none"
                    style={{ color: focusedRegion.themeColor }}
                  >
                    CHAPTER {focusedRegion.chapter} • {focusedRegion.subtitle}
                  </div>
                  <h2 className="font-display text-xs sm:text-lg font-black text-white text-glow-gold leading-tight truncate">
                    {focusedRegion.name.toUpperCase()}
                  </h2>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <div className="hidden sm:flex items-center gap-2 rpg-panel-subtle px-2.5 py-1 text-xs">
                <Sparkles className="w-3.5 h-3.5" style={{ color: focusedRegion.themeColor }} />
                <div className="w-20 h-2 rounded-full bg-slate-900 overflow-hidden">
                  <div
                    className="h-full transition-all"
                    style={{
                      width: `${(getRegionClearedCount(focusedRegion.id) / focusedRegion.stageCount) * 100}%`,
                      background: focusedRegion.themeColor,
                    }}
                  />
                </div>
                <span className="font-mono font-black text-amber-300">
                  {getRegionClearedCount(focusedRegion.id)}/{focusedRegion.stageCount}
                </span>
              </div>
              <button
                onClick={() => {
                  audioManager.playSfx('button');
                  onClose();
                }}
                className="rpg-panel-subtle p-1.5 sm:p-2 text-slate-200 hover:text-amber-300 transition"
                title="Close to Lobby"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* LAYER 2: SIDE-BY-SIDE ON LANDSCAPE & DESKTOP (`sm:grid-cols-12`), STACKED ON PORTRAIT! */}
          <div className="relative z-10 flex-1 grid grid-cols-1 sm:grid-cols-12 gap-2.5 sm:gap-4 px-3 sm:px-4 safe-bottom min-h-0 overflow-y-auto sm:overflow-hidden">
            {/* LEFT (7 cols on sm+): Winding S-Curve RPG Adventure Roadmap */}
            <div className="sm:col-span-7 relative min-h-[340px] sm:min-h-0 flex items-center justify-center">
              <div className="relative w-full h-full max-w-3xl min-h-[320px] sm:min-h-0">
                <svg
                  viewBox="0 0 1000 600"
                  preserveAspectRatio="none"
                  className="pointer-events-none absolute inset-0 w-full h-full z-10"
                >
                  <defs>
                    <filter id="trailGlow">
                      <feGaussianBlur stdDeviation="4" result="b" />
                      <feMerge>
                        <feMergeNode in="b" />
                        <feMergeNode in="SourceGraphic" />
                      </feMerge>
                    </filter>
                  </defs>
                  {regionStages.slice(0, -1).map((stage, idx) => {
                    const p1 = STAGE_TRAIL_NODES[idx];
                    const p2 = STAGE_TRAIL_NODES[idx + 1];
                    if (!p1 || !p2) return null;
                    const nextStage = regionStages[idx + 1];
                    const segOpen = isStageUnlocked(nextStage, clearedStages);
                    const bend = idx === 3 || idx === 7 ? 0.28 : idx % 2 === 0 ? 0.1 : -0.1;
                    const d = buildCurvedPath(
                      p1.x * 10,
                      p1.y * 6,
                      p2.x * 10,
                      p2.y * 6,
                      bend,
                    );
                    return (
                      <g key={stage.id}>
                        <path
                          d={d}
                          fill="none"
                          stroke={segOpen ? focusedRegion.themeColor : '#1e293b'}
                          strokeOpacity={segOpen ? 0.45 : 0.65}
                          strokeWidth={segOpen ? 10 : 6}
                          strokeLinecap="round"
                          filter={segOpen ? 'url(#trailGlow)' : undefined}
                        />
                        <path
                          d={d}
                          fill="none"
                          stroke={segOpen ? '#fef08a' : '#64748b'}
                          strokeOpacity={segOpen ? 0.95 : 0.55}
                          strokeWidth={segOpen ? 3.5 : 2.5}
                          strokeDasharray={segOpen ? '10 8' : '6 8'}
                          strokeLinecap="round"
                          className={segOpen ? 'animate-leyline' : undefined}
                        />
                      </g>
                    );
                  })}
                </svg>

                {regionStages.map((stage, idx) => {
                  const pos = STAGE_TRAIL_NODES[idx] ?? { x: 50, y: 50 };
                  const unlocked = isStageUnlocked(stage, clearedStages);
                  const cleared = clearedStages.includes(stage.id);
                  const selected = activeStage.id === stage.id;
                  const isFrontier = frontierStageId === stage.id;

                  return (
                    <button
                      key={stage.id}
                      onClick={() => {
                        audioManager.playSfx('button');
                        setPickedStageId(stage.id);
                        if (unlocked) setSelectedStage(stage.id);
                      }}
                      style={{
                        left: `${pos.x}%`,
                        top: `${pos.y}%`,
                      }}
                      className={`group absolute -translate-x-1/2 -translate-y-1/2 flex flex-col items-center transition-transform duration-200 ${
                        selected ? 'scale-110 z-30' : 'hover:scale-105 z-20'
                      }`}
                    >
                      {isFrontier && (
                        <div className="pointer-events-none absolute -top-9 sm:-top-11 left-1/2 animate-frontier-bounce flex flex-col items-center z-40">
                          <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full overflow-hidden border-2 border-cyan-300 shadow-[0_0_16px_rgba(56,232,255,0.9)] bg-slate-950">
                            <ArtImage
                              kind="HERO"
                              id={leaderHero.id}
                              src={leaderHero.assets.card}
                              alt={leaderHero.name}
                              className="w-full h-full object-cover object-top"
                            />
                          </div>
                          <span className="w-0 h-0 border-l-[4px] border-r-[4px] border-t-[5px] border-l-transparent border-r-transparent border-t-cyan-300 -mt-0.5" />
                        </div>
                      )}

                      {stage.isBossStage ? (
                        <div
                          className={`relative w-12 h-12 md:w-16 md:h-16 rounded-full border-2 flex items-center justify-center overflow-hidden shadow-[0_0_26px_rgba(217,70,239,0.75)] transition ${
                            selected
                              ? 'border-amber-300 ring-2 ring-fuchsia-400 bg-fuchsia-950'
                              : unlocked
                                ? 'border-fuchsia-400 bg-fuchsia-950/90'
                                : 'border-slate-600 bg-slate-950/90 opacity-75'
                          }`}
                        >
                          <img
                            src={focusedRegion.bossAsset}
                            alt={focusedRegion.bossName}
                            className={`w-10 h-10 md:w-14 md:h-14 object-contain ${
                              !unlocked ? 'grayscale opacity-50' : ''
                            }`}
                          />
                          {!unlocked && (
                            <div className="absolute inset-0 bg-black/55 flex items-center justify-center">
                              <Lock className="w-3.5 h-3.5 text-slate-300" />
                            </div>
                          )}
                          <span className="absolute -bottom-0.5 inset-x-0 bg-fuchsia-600 text-white text-[7px] font-black uppercase text-center leading-tight py-0.5">
                            BOSS
                          </span>
                        </div>
                      ) : stage.isMiniBoss ? (() => {
                        const eliteSpawn = stage.waves[stage.waves.length - 1]?.spawns.find(
                          (sp) => ENEMY_MAP[sp.enemyId]?.isMiniBoss,
                        );
                        const eliteDef = eliteSpawn ? ENEMY_MAP[eliteSpawn.enemyId] : ENEMY_MAP.armored_golem;
                        return (
                        <div
                          className={`relative w-10 h-10 md:w-14 md:h-14 rounded-full border-2 flex items-center justify-center overflow-hidden shadow-[0_0_18px_rgba(249,115,22,0.55)] transition ${
                            selected
                              ? 'border-amber-300 ring-2 ring-orange-400 bg-orange-950'
                              : unlocked
                                ? 'border-orange-400 bg-slate-950/95'
                                : 'border-slate-700 bg-slate-950/85 opacity-70'
                          }`}
                        >
                          <ArtImage
                            kind="ENEMY"
                            id={eliteDef.id}
                            src={eliteDef.assetKey}
                            alt={eliteDef.name}
                            className={`w-8 h-8 md:w-11 md:h-11 object-contain ${
                              !unlocked ? 'grayscale opacity-45' : ''
                            }`}
                          />
                          {!unlocked && (
                            <div className="absolute inset-0 bg-black/55 flex items-center justify-center">
                              <Lock className="w-3 h-3 text-slate-300" />
                            </div>
                          )}
                          <span className="absolute -top-1 -right-1 p-0.5 rounded-full bg-orange-500 text-slate-950">
                            <Crown className="w-2.5 h-2.5" />
                          </span>
                        </div>
                        );
                      })() : (
                        <div
                          className={`relative w-8 h-8 md:w-11 md:h-11 rounded-full border-2 flex items-center justify-center shadow-[0_6px_16px_rgba(0,0,0,0.85)] transition ${
                            selected
                              ? 'bg-gradient-to-br from-amber-300 via-yellow-400 to-amber-600 border-white text-slate-950 shadow-[0_0_24px_rgba(253,224,71,0.9)]'
                              : cleared
                                ? 'bg-slate-950/95 border-emerald-400 text-emerald-300'
                                : unlocked
                                  ? 'bg-slate-950/95 text-white'
                                  : 'bg-slate-950/80 border-slate-700 text-slate-500'
                          }`}
                          style={{
                            borderColor:
                              !selected && !cleared && unlocked
                                ? focusedRegion.themeColor
                                : undefined,
                          }}
                        >
                          {!unlocked ? (
                            <Lock className="w-3 h-3 text-slate-500" />
                          ) : (
                            <Swords
                              className={`w-3.5 h-3.5 md:w-4 md:h-4 ${
                                selected ? 'text-slate-950' : cleared ? 'text-emerald-300' : 'text-amber-200'
                              }`}
                            />
                          )}
                        </div>
                      )}

                      <div
                        className={`mt-0.5 px-1.5 py-0.5 rounded text-[8px] sm:text-[9px] font-display font-black tracking-wider leading-none border backdrop-blur-sm ${
                          selected
                            ? 'bg-amber-400 text-slate-950 border-amber-100'
                            : unlocked
                              ? 'bg-slate-950/90 text-white border-slate-700'
                              : 'bg-slate-950/75 text-slate-500 border-slate-800'
                        }`}
                      >
                        {stage.code}
                      </div>

                      {cleared && (
                        <div className="flex items-center gap-0.5 mt-0.5">
                          {[0, 1, 2].map((s) => (
                            <Star
                              key={s}
                              className="w-2 h-2 sm:w-2.5 sm:h-2.5 text-amber-300 fill-amber-400"
                            />
                          ))}
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* RIGHT (5 cols on sm+): Floating Tactical Briefing & DEPLOY Console */}
            <div className="sm:col-span-5 flex items-center min-h-0">
              <div className="rpg-panel w-full p-2.5 lg:p-4 flex flex-col justify-between gap-2 lg:gap-3 border-amber-400/45 max-h-full overflow-y-auto">
                <div className="space-y-1.5 lg:space-y-2.5">
                  <div>
                    <div className="flex flex-wrap items-center gap-1.5">
                      <span
                        className="px-2 py-0.5 rounded text-[9px] font-black uppercase bg-black/80 border"
                        style={{
                          borderColor: activeStage.isBossStage
                            ? '#e879f9'
                            : focusedRegion.themeColor,
                          color: activeStage.isBossStage ? '#f0abfc' : focusedRegion.themeColor,
                        }}
                      >
                        STAGE {activeStage.code}
                      </span>
                      {activeStage.isBossStage && (
                        <span className="px-2 py-0.5 rounded text-[9px] font-black uppercase bg-fuchsia-600 text-white">
                          REGION BOSS
                        </span>
                      )}
                      {activeStage.isMiniBoss && (
                        <span className="px-2 py-0.5 rounded text-[9px] font-black uppercase bg-orange-500 text-slate-950">
                          ELITE
                        </span>
                      )}
                      <span className="text-[10px] font-mono font-bold text-slate-400">
                        Threat ×{activeStage.enemyScale.toFixed(2)}
                      </span>
                    </div>
                    <h3 className="font-display text-base lg:text-xl font-black text-white mt-0.5 leading-tight">
                      {activeStage.name}
                    </h3>
                    <div className="ls-hide font-serif-italic italic text-xs lg:text-sm text-amber-300/90 font-bold">
                      {activeStage.subtitle}
                    </div>
                    <p className="ls-hide text-xs text-slate-300 mt-1 leading-relaxed">
                      {activeStage.description}
                    </p>
                  </div>

                  {/* Power Comparison Gauge */}
                  <div
                    className={`p-2 sm:p-2.5 rounded-lg border flex items-center justify-between gap-2 ${
                      isDanger
                        ? 'bg-rose-950/45 border-rose-500/60'
                        : 'bg-emerald-950/35 border-emerald-500/45'
                    }`}
                  >
                    <div>
                      <div className="text-[8px] sm:text-[9px] uppercase tracking-widest text-slate-400 font-bold">
                        Recommended PWR
                      </div>
                      <div className="font-mono text-sm sm:text-base font-black text-white">
                        {activeStage.recommendedPower.toLocaleString()}
                      </div>
                    </div>
                    <div className="text-right">
                      <div
                        className={`text-[9px] sm:text-[10px] font-black uppercase flex items-center justify-end gap-1 ${
                          isDanger ? 'text-rose-300' : 'text-emerald-300'
                        }`}
                      >
                        {isDanger && <ShieldAlert className="w-3 h-3" />}
                        {isDanger ? 'HIGH THREAT' : 'SQUAD READY'}
                      </div>
                      <div className="font-mono text-[11px] text-cyan-300 font-bold">
                        Yours: {squadPower.toLocaleString()}
                      </div>
                    </div>
                  </div>

                  {/* Hostile Forces */}
                  <div className="flex flex-wrap gap-1.5">
                    {stageEnemyIds.map((eid) => {
                      const enemy = ENEMY_MAP[eid];
                      if (!enemy) return null;
                      return (
                        <div
                          key={eid}
                          className="flex items-center gap-1.5 rounded-lg bg-slate-950/90 border border-slate-700/80 pr-2 pl-1 py-0.5"
                        >
                          <div className="w-7 h-7 rounded bg-slate-900 border border-fuchsia-500/35 flex items-center justify-center overflow-hidden">
                            <ArtImage
                              kind="ENEMY"
                              id={eid}
                              src={enemy.assetKey}
                              alt={enemy.name}
                              className="w-full h-full object-contain p-0.5"
                            />
                          </div>
                          <div>
                            <div className="text-[10px] font-bold text-white leading-none">
                              {enemy.isBoss && activeStage.bossNameOverride
                                ? activeStage.bossNameOverride
                                : enemy.name}
                            </div>
                            <div className="text-[8px] text-fuchsia-300 uppercase mt-0.5">
                              {enemy.isBoss ? 'BOSS' : enemy.isMiniBoss ? 'ELITE' : 'MINION'}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* Biome Rewards & Drop Table Preview */}
                  <div className="space-y-1.5">
                    <div className="grid grid-cols-2 gap-1.5 text-[11px]">
                      <div className="rounded-lg bg-slate-950/90 border border-slate-800 px-2 py-1 flex items-center gap-1.5">
                        <GameIcon name="crystal" className="w-4 h-4 sm:w-5 sm:h-5" />
                        <div className="font-mono font-bold text-cyan-300">
                          +
                          {clearedStages.includes(activeStage.id)
                            ? 40
                            : activeStage.firstClearCrystals}
                        </div>
                      </div>
                      <div className="rounded-lg bg-slate-950/90 border border-slate-800 px-2 py-1 flex items-center gap-1.5">
                        <GameIcon name="gold" className="w-4 h-4 sm:w-5 sm:h-5" />
                        <div className="font-mono font-bold text-amber-300 truncate">
                          {activeStage.rewards.gold[0].toLocaleString()}+
                        </div>
                      </div>
                      <div className="rounded-lg bg-slate-950/90 border border-slate-800 px-2 py-1 flex items-center gap-1.5 min-w-0">
                        <MaterialIcon
                          material={factionToEssenceKey(activeStage.rewards.primaryEssence)}
                          className="w-4 h-4 sm:w-5 sm:h-5 shrink-0"
                        />
                        <div className="font-mono font-bold text-amber-200 truncate text-[10px]">
                          {MATERIAL_META[factionToEssenceKey(activeStage.rewards.primaryEssence)].shortName} ×
                          {activeStage.rewards.primaryEssenceQty[0]}–{activeStage.rewards.primaryEssenceQty[1]}
                        </div>
                      </div>
                      <div className="rounded-lg bg-slate-950/90 border border-slate-800 px-2 py-1 flex items-center gap-1.5 min-w-0">
                        <GameIcon name="forge" className="w-4 h-4 sm:w-5 sm:h-5 shrink-0" />
                        <div className="font-mono font-bold text-violet-300 truncate text-[10px]">
                          ×{activeStage.rewards.equipmentDrops}{' '}
                          {activeStage.rewards.targetSetIds.length <= 2
                            ? activeStage.rewards.targetSetIds
                                .map((id) => EQUIPMENT_SETS[id].name.split(' ')[0])
                                .join('/')
                            : 'All Sets'}
                        </div>
                      </div>
                    </div>

                    {/* Tiered Forge / Star Core / Relic Drop Tags */}
                    <div className="flex flex-wrap gap-1 text-[9px] font-bold">
                      {activeStage.rewards.starIronIngots && (
                        <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-sky-950/80 border border-sky-400/40 text-sky-200">
                          <MaterialIcon material="starIronIngots" className="w-3 h-3" /> Star-Iron
                        </span>
                      )}
                      {activeStage.rewards.astralAnvilCores && (
                        <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-amber-950/80 border border-amber-400/40 text-amber-200">
                          <MaterialIcon material="astralAnvilCores" className="w-3 h-3" /> Anvil Core
                        </span>
                      )}
                      {activeStage.rewards.starCores && (
                        <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-fuchsia-950/80 border border-fuchsia-400/40 text-fuchsia-200">
                          <MaterialIcon material="starCores" className="w-3 h-3" /> Star Core
                        </span>
                      )}
                      {activeStage.rewards.relicFragments && (
                        <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-cyan-950/80 border border-cyan-400/45 text-cyan-200">
                          <GameIcon name="relic" className="w-3 h-3" />
                          Relic Frags ×{activeStage.rewards.relicFragments[0]}–{activeStage.rewards.relicFragments[1]}
                        </span>
                      )}
                      {activeStage.rewards.guaranteedFirstClearRelicId &&
                        !clearedStages.includes(activeStage.id) && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-gradient-to-r from-amber-400/25 to-cyan-400/25 border border-amber-300 text-amber-200">
                            ★ 1st Clear Relic:{' '}
                            {RELIC_MAP[activeStage.rewards.guaranteedFirstClearRelicId]?.name}
                          </span>
                        )}
                      {(!activeStage.rewards.guaranteedFirstClearRelicId ||
                        clearedStages.includes(activeStage.id)) &&
                        (activeStage.rewards.relicDropChance ?? 0) > 0 && (
                          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-amber-500/15 border border-amber-400/45 text-amber-200">
                            Relic Drop {Math.round((activeStage.rewards.relicDropChance ?? 0) * 100)}%
                          </span>
                        )}
                    </div>
                  </div>

                  {/* Pre-Battle Quick Party Preset Bar (P1 / P2 / P3 + Edit Party) */}
                  <div className="rounded-xl bg-slate-950/85 border border-amber-400/25 p-2 space-y-1.5">
                    <div className="flex items-center justify-between gap-1.5">
                      <div className="flex items-center gap-1">
                        {partyPresets.map((pr, i) => {
                          const idx = i as 0 | 1 | 2;
                          const active = activePresetIndex === idx;
                          return (
                            <button
                              key={pr.id}
                              onClick={() => {
                                selectPreset(idx);
                                audioManager.playSfx('button');
                              }}
                              className={`px-2 py-0.5 rounded-lg text-[9px] font-display font-black uppercase border transition ${
                                active
                                  ? 'bg-amber-400 text-slate-950 border-amber-200'
                                  : 'bg-slate-900 text-slate-300 border-slate-700 hover:border-amber-400/50'
                              }`}
                            >
                              P{i + 1}
                            </button>
                          );
                        })}
                        <span className="text-[10px] font-bold text-amber-200 ml-1 truncate max-w-[100px]">
                          {partyPresets[activePresetIndex]?.name}
                        </span>
                      </div>
                      <button
                        onClick={() => {
                          setShowPartyModal(true);
                          audioManager.playSfx('button');
                        }}
                        className="px-2 py-0.5 rounded-lg bg-cyan-500/15 border border-cyan-400/45 text-cyan-200 hover:bg-cyan-500/25 text-[9px] font-display font-black uppercase flex items-center gap-1 transition"
                      >
                        <Users className="w-3 h-3" /> Edit Party
                      </button>
                    </div>
                    <div className="flex items-center gap-1.5">
                      {squadIds.map((hid, i) => {
                        const h = HERO_MAP[hid];
                        if (!h) return null;
                        return (
                          <div
                            key={`${hid}_${i}`}
                            className="flex-1 flex items-center gap-1 bg-slate-900/90 border border-slate-800 rounded-lg p-1 min-w-0"
                          >
                            <div
                              className="w-6 h-6 rounded overflow-hidden border shrink-0"
                              style={{ borderColor: h.themeColor }}
                            >
                              <ArtImage
                                kind="HERO"
                                id={hid}
                                src={h.assets.card}
                                alt={h.name}
                                className="w-full h-full object-cover object-top"
                              />
                            </div>
                            <span className="text-[9px] font-bold text-white truncate">
                              {h.name}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>

                {/* DEPLOY CTA */}
                <div className="pt-1.5 border-t border-amber-400/20">
                  {activeStageUnlocked ? (
                    <button
                      onClick={() => {
                        audioManager.playSfx('button');
                        setSelectedStage(activeStage.id);
                        onDeploy(activeStage.id);
                      }}
                      className="rpg-battle-cta w-full py-2.5 sm:py-3 px-5 text-slate-950 font-display font-black text-sm sm:text-base uppercase tracking-[0.18em] flex items-center justify-center gap-2"
                    >
                      <GameIcon name="battle" className="w-5 h-5 sm:w-6 sm:h-6" />
                      <span>DEPLOY {activeStage.code}</span>
                    </button>
                  ) : (
                    <div className="w-full py-2.5 px-4 rounded-xl bg-slate-950 border border-slate-700 text-center text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center justify-center gap-2">
                      <Lock className="w-4 h-4 text-slate-500" />
                      <span>
                        Clear Stage {activeStage.chapter}-{activeStage.stageNumber - 1} to Unlock
                      </span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      <PartyManagerModal open={showPartyModal} onClose={() => setShowPartyModal(false)} />
    </div>
  );
};
