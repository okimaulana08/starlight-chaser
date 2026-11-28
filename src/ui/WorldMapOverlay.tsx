import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import {
  ArrowLeft,
  CheckCircle2,
  ChevronRight,
  Crown,
  FastForward,
  Flame,
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
import {
  EQUIPMENT_SETS,
  RARITY_COLORS,
  formatStatValue,
  getEnhancedMainStatValue,
} from '../data/equipment';
import { FACTIONS } from '../data/factions';
import { HERO_MAP } from '../data/heroes';
import { MATERIAL_META, factionToEssenceKey, getExpToNextLevel } from '../data/materials';
import { RELIC_MAP } from '../data/relics';
import { REGION_LINKS, REGION_MAP, REGIONS } from '../data/regions';
import {
  CAMPAIGN_DIFFICULTIES,
  CAMPAIGN_DIFFICULTY_MAP,
  encodeRegionChestKey,
  getAllStagesForDifficulty,
  getCampaignStageById,
  getHighestUnlockedStage,
  getRegionRecommendedPowerRange,
  getStagesByRegion,
  isDifficultyUnlocked,
  isRegionUnlocked,
  isStageUnlocked,
  parseCampaignStageId,
  STAGES,
} from '../data/stages';
import { audioManager } from '../engine/AudioManager';
import { computeHeroStats, getActivePetPower } from '../engine/CombatMath';
import { usePlayerStore } from '../store/usePlayerStore';
import type { CampaignDifficulty, CombatLootSummary, Faction, RegionDef } from '../types/game';
import { ArtImage } from './ArtImage';
import { EquipIcon, GameIcon, MaterialIcon } from './GameIcon';
import { PartyManagerModal } from './PartyManagerModal';
import { RegionChestModal } from './RegionChestModal';
import { CornerFiligree, RpgButton, RpgLootTile, RpgProgressBar } from './RpgKit';

interface WorldMapOverlayProps {
  squadPower: number;
  onClose: () => void;
  onDeploy: (stageId: string) => void;
}

const MAP_ASPECT = 16 / 9;

const WORLD_WEATHER_PARTICLES = Array.from({ length: 24 }, (_, i) => ({
  id: i,
  left: ((i * 37 + 7) % 94) + 3,
  top: ((i * 53 + 11) % 88) + 6,
  size: i % 4 === 0 ? 5 : i % 2 === 0 ? 3.5 : 2.5,
  duration: 4.5 + (i % 6) * 1.15,
  delay: -(i * 0.65),
  alt: i % 3 === 0,
}));

const VOID_FISSURES_SVG: string[] = [
  'M 860 96 L 785 168 L 732 214 L 664 252 L 598 298',
  'M 860 96 L 826 196 L 802 276 L 848 352 L 882 435',
  'M 732 214 L 640 198 L 548 164 L 468 188',
  'M 598 298 L 512 342 L 430 330 L 352 384',
  'M 802 276 L 704 334 L 642 406 L 568 468',
  'M 468 188 L 380 226 L 318 205',
];

const WORLD_ERA_TITLES: Record<CampaignDifficulty, { title: string; subtitle: string; color: string }> = {
  NORMAL: {
    title: 'WL 1 • AGE OF DAWNLIGHT',
    subtitle: 'Clear skies over Aetheria • Standard Campaign Realm',
    color: '#fde047',
  },
  HARD: {
    title: 'WL 2 • TWILIGHT RIFT SURGE',
    subtitle: 'Crimson Dusk descends • 2× Gold • Epic & Legendary Drops',
    color: '#fb923c',
  },
  HELL: {
    title: 'WL 3 • BLOOD-ECLIPSE ABYSS',
    subtitle: 'Reality fractures under the Total Eclipse • 3.2× Gold • Transcendence Loot',
    color: '#fb7185',
  },
};

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
    claimedRegionChests,
    selectedStageId,
    selectedDifficulty,
    setSelectedStage,
    setSelectedDifficulty,
    squadIds,
    partyPresets,
    activePresetIndex,
    selectPreset,
    roster,
    equipmentInventory,
    unlockedCodexIds,
    relicRanks,
    ownedPets,
    activePetId,
    favoriteHeroId,
    sweepCampaignStage,
  } = usePlayerStore();
  const [showPartyModal, setShowPartyModal] = useState(false);
  const [showChestModal, setShowChestModal] = useState(false);
  const [sweepResult, setSweepResult] = useState<CombatLootSummary | null>(null);
  const [lastSweepCount, setLastSweepCount] = useState<1 | 5>(1);

  const [worldDifficulty, setWorldDifficulty] = useState<CampaignDifficulty>(() => {
    const candidate =
      selectedDifficulty ?? parseCampaignStageId(selectedStageId).difficulty ?? 'NORMAL';
    return isDifficultyUnlocked(candidate, clearedStages) ? candidate : 'NORMAL';
  });
  const [worldShiftFx, setWorldShiftFx] = useState<{ id: number; diff: CampaignDifficulty } | null>(null);
  const activeDiffCfg = CAMPAIGN_DIFFICULTY_MAP[worldDifficulty];
  const activeDiffUnlocked = isDifficultyUnlocked(worldDifficulty, clearedStages);

  const petsMap = ownedPets ?? {};
  const activeOwnedPet = activePetId && petsMap[activePetId] ? petsMap[activePetId] : null;

  const squadPower = useMemo(() => {
    const computed =
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
      }, 0) + getActivePetPower(activePetId, petsMap);
    return computed || initialSquadPower;
  }, [
    squadIds,
    roster,
    equipmentInventory,
    unlockedCodexIds.length,
    relicRanks,
    activeOwnedPet,
    activePetId,
    petsMap,
    initialSquadPower,
  ]);

  const safeInitialStage = useMemo(() => {
    const saved = getCampaignStageById(selectedStageId);
    if (
      saved &&
      (saved.difficulty ?? 'NORMAL') === worldDifficulty &&
      isStageUnlocked(saved, clearedStages)
    ) {
      return saved;
    }
    return getHighestUnlockedStage(clearedStages, worldDifficulty);
  }, [selectedStageId, clearedStages, worldDifficulty]);

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
  const focusedRegionUnlocked = isRegionUnlocked(focusedRegion.id, clearedStages, worldDifficulty);
  const prevRegionForFocused =
    focusedRegion.chapter > 1 ? REGION_MAP[`region_${focusedRegion.chapter - 1}`] : null;
  const prevRegionClearedCount = prevRegionForFocused
    ? getStagesByRegion(prevRegionForFocused.id, worldDifficulty).filter((s) =>
        clearedStages.includes(s.id),
      ).length
    : 0;

  const regionStages = useMemo(
    () => getStagesByRegion(focusedRegion.id, worldDifficulty),
    [focusedRegion.id, worldDifficulty],
  );

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

  const totalPlayableStages = STAGES.length; // 120 stages per World Level (360 total across WL 1-3!)
  const diffStages = useMemo(
    () => getAllStagesForDifficulty(worldDifficulty),
    [worldDifficulty],
  );
  const totalCleared = useMemo(
    () => diffStages.filter((s) => clearedStages.includes(s.id)).length,
    [diffStages, clearedStages],
  );
  const unlockedRegionsCount = useMemo(
    () => REGIONS.filter((r) => isRegionUnlocked(r.id, clearedStages, worldDifficulty)).length,
    [clearedStages, worldDifficulty],
  );

  const getRegionClearedCount = (regionId: string) =>
    getStagesByRegion(regionId, worldDifficulty).filter((s) => clearedStages.includes(s.id)).length;

  const handleSwitchDifficulty = (nextDiff: CampaignDifficulty) => {
    if (nextDiff === worldDifficulty) return;
    audioManager.playSfx(nextDiff === 'HELL' ? 'ult_chime' : nextDiff === 'HARD' ? 'forge' : 'button');
    setWorldDifficulty(nextDiff);
    const fxId = Date.now() + Math.random();
    setWorldShiftFx({ id: fxId, diff: nextDiff });
    window.setTimeout(() => {
      setWorldShiftFx((cur) => (cur?.id === fxId ? null : cur));
    }, 950);
    const unlocked = isDifficultyUnlocked(nextDiff, clearedStages);
    if (unlocked) {
      setSelectedDifficulty(nextDiff);
      const nextRegStages = getStagesByRegion(focusedRegion.id, nextDiff);
      const regOpen = isRegionUnlocked(focusedRegion.id, clearedStages, nextDiff);
      if (regOpen && nextRegStages.length > 0) {
        const frontier =
          nextRegStages.find((s) => isStageUnlocked(s, clearedStages) && !clearedStages.includes(s.id)) ??
          nextRegStages[nextRegStages.length - 1] ??
          nextRegStages[0];
        if (frontier) {
          setPickedStageId(frontier.id);
          setSelectedStage(frontier.id);
        }
      } else {
        const highest = getHighestUnlockedStage(clearedStages, nextDiff);
        setFocusedRegionId(highest.regionId);
        setPickedStageId(highest.id);
        setSelectedStage(highest.id);
        if (viewMode === 'REGION') setViewMode('CONTINENT');
      }
    } else if (viewMode === 'REGION') {
      setViewMode('CONTINENT');
    }
  };

  const renderWorldLevelSwitcher = (compact = false) => (
    <div
      className="flex items-center gap-0.5 sm:gap-1 p-0.5 rounded-xl bg-slate-950/90 border border-white/15 backdrop-blur-md shadow-[0_6px_20px_rgba(0,0,0,0.75)]"
      role="tablist"
      aria-label="Campaign World Level"
    >
      {CAMPAIGN_DIFFICULTIES.map((cfg) => {
        const isSel = worldDifficulty === cfg.id;
        const unlocked = isDifficultyUnlocked(cfg.id, clearedStages);
        return (
          <button
            key={cfg.id}
            type="button"
            onClick={() => handleSwitchDifficulty(cfg.id)}
            title={
              unlocked
                ? `${cfg.shortLabel} ${cfg.label} (${cfg.subtitle}) — ${cfg.rewardHighlight}`
                : `${cfg.shortLabel} ${cfg.label} (Locked) — ${cfg.unlockLabel}`
            }
            className={`relative px-2 sm:px-2.5 py-1 rounded-lg font-display font-black uppercase tracking-wider flex items-center gap-1 transition whitespace-nowrap ${
              compact ? 'text-[9px] sm:text-[10px]' : 'text-[9px] sm:text-[11px]'
            } ${
              isSel
                ? 'text-white shadow-md border'
                : unlocked
                  ? 'text-slate-300 hover:text-white hover:bg-white/5 border border-transparent'
                  : 'text-slate-500 hover:text-slate-300 border border-transparent'
            }`}
            style={
              isSel
                ? {
                    borderColor: cfg.themeColor,
                    background:
                      cfg.id === 'HELL'
                        ? 'linear-gradient(135deg, rgba(225,29,72,0.45), rgba(147,51,234,0.4))'
                        : cfg.id === 'HARD'
                          ? 'linear-gradient(135deg, rgba(249,115,22,0.42), rgba(225,29,72,0.28))'
                          : 'linear-gradient(135deg, rgba(245,200,76,0.34), rgba(234,179,8,0.18))',
                    boxShadow: `0 0 16px ${cfg.themeColor}55`,
                  }
                : undefined
            }
          >
            {!unlocked ? (
              <Lock className="w-2.5 h-2.5 shrink-0 opacity-80" />
            ) : cfg.id === 'HELL' ? (
              <Skull className="w-3 h-3 shrink-0" style={{ color: cfg.themeColor }} />
            ) : cfg.id === 'HARD' ? (
              <Flame className="w-3 h-3 shrink-0" style={{ color: cfg.themeColor }} />
            ) : (
              <Star className="w-2.5 h-2.5 shrink-0 fill-amber-300 text-amber-300" />
            )}
            <span className="hidden md:inline text-[8px] font-mono opacity-80">
              {cfg.shortLabel}
            </span>
            <span>{cfg.label}</span>
          </button>
        );
      })}
    </div>
  );

  const selectRegionOnAtlas = (region: RegionDef) => {
    audioManager.playSfx('button');
    setFocusedRegionId(region.id);
    if (vpSize.w < 960 || zoom > 1.02) {
      focusCameraOn(region.mapPos.x, region.mapPos.y, zoom);
    }
  };

  const enterRegion = (region: RegionDef) => {
    if (!isRegionUnlocked(region.id, clearedStages, worldDifficulty)) {
      selectRegionOnAtlas(region);
      return;
    }
    audioManager.playSfx('button');
    setFocusedRegionId(region.id);
    const stages = getStagesByRegion(region.id, worldDifficulty);
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
            {/* 1. Hand-Painted Fantasy Overworld Illustration (Dramatic 3-Era Recolor by World Level!) */}
            <img
              src="/assets/environments/bg_worldmap_aetheria.webp"
              alt="World of Aetheria"
              draggable={false}
              className={`w-full h-full object-fill pointer-events-none transition-all duration-700 ${
                worldShiftFx?.diff === 'HELL' ? 'animate-world-shake' : ''
              }`}
              style={{
                filter:
                  worldDifficulty === 'HELL'
                    ? 'grayscale(0.46) sepia(0.62) hue-rotate(-52deg) saturate(2.18) brightness(0.58) contrast(1.34)'
                    : worldDifficulty === 'HARD'
                      ? 'sepia(0.42) saturate(1.55) brightness(0.76) contrast(1.18) hue-rotate(-20deg)'
                      : 'brightness(1.0) contrast(1.05) saturate(1.08)',
              }}
            />

            {/* 2A. True Color-Grading Multiply Veil (Transforms Ocean, Forests & Sky per Difficulty!) */}
            <div
              className="pointer-events-none absolute inset-0 transition-all duration-700"
              style={{
                mixBlendMode: worldDifficulty === 'NORMAL' ? 'normal' : 'multiply',
                background:
                  worldDifficulty === 'HELL'
                    ? 'radial-gradient(ellipse 88% 82% at 45% 48%, rgba(136,19,55,0.62) 0%, rgba(59,7,54,0.82) 64%, rgba(10,2,18,0.95) 100%)'
                    : worldDifficulty === 'HARD'
                      ? 'linear-gradient(150deg, rgba(194,65,12,0.56) 0%, rgba(136,19,55,0.48) 54%, rgba(46,16,66,0.72) 100%)'
                      : 'radial-gradient(ellipse 88% 82% at 45% 48%, transparent 54%, rgba(4, 8, 22, 0.52) 100%)',
              }}
            />

            {/* 2B. Secondary Blend Highlight Layer (Dawn Sunbeams / Twilight Ember Glow / Blood-Eclipse Radiance) */}
            <div
              className="pointer-events-none absolute inset-0 transition-all duration-700"
              style={{
                mixBlendMode: worldDifficulty === 'HARD' ? 'color' : 'screen',
                background:
                  worldDifficulty === 'HELL'
                    ? 'radial-gradient(circle at 86% 18%, rgba(244,63,94,0.46) 0%, rgba(168,85,247,0.22) 32%, transparent 62%)'
                    : worldDifficulty === 'HARD'
                      ? 'radial-gradient(ellipse 90% 80% at 48% 42%, rgba(251,146,60,0.34), rgba(159,18,57,0.44))'
                      : 'linear-gradient(128deg, rgba(254,240,138,0.16) 0%, rgba(186,230,253,0.06) 28%, transparent 56%)',
              }}
            />

            {/* 2C. Periodic Sky Lightning Flash (Hard Dusk Thunder / Hell Void Lightning) */}
            {worldDifficulty !== 'NORMAL' && (
              <div
                className="pointer-events-none absolute inset-0 animate-world-lightning"
                style={{
                  mixBlendMode: 'screen',
                  background:
                    worldDifficulty === 'HELL'
                      ? 'radial-gradient(circle at 84% 22%, rgba(244,63,94,0.65) 0%, rgba(192,132,252,0.28) 38%, transparent 72%)'
                      : 'radial-gradient(circle at 38% 28%, rgba(251,146,60,0.48) 0%, rgba(245,158,11,0.18) 38%, transparent 68%)',
                }}
              />
            )}

            {/* 3. Seamless Eastern Twilight / Abyssal Mist */}
            <div
              className="pointer-events-none absolute inset-0 animate-fog-swirl transition-all duration-700"
              style={{
                background:
                  worldDifficulty === 'HELL'
                    ? 'radial-gradient(ellipse 58% 84% at 86% 44%, rgba(190, 18, 60, 0.5) 0%, rgba(59, 7, 100, 0.36) 48%, transparent 86%)'
                    : worldDifficulty === 'HARD'
                      ? 'radial-gradient(ellipse 52% 80% at 86% 46%, rgba(194, 65, 12, 0.42) 0%, rgba(88, 28, 135, 0.28) 52%, transparent 86%)'
                      : 'radial-gradient(ellipse 46% 78% at 88% 48%, rgba(28, 12, 64, 0.38) 0%, rgba(12, 10, 34, 0.2) 52%, transparent 86%)',
              }}
            />

            {/* 4. Dynamic Era Cloud Wisps (White Dawn / Amber Storm / Crimson-Void Smoke) */}
            <div className="pointer-events-none absolute inset-0 overflow-hidden">
              <div
                className="absolute top-[10%] left-[32%] w-[28%] h-[18%] rounded-full blur-2xl animate-cloud-drift transition-colors duration-700"
                style={{
                  background:
                    worldDifficulty === 'HELL'
                      ? 'rgba(159, 18, 57, 0.34)'
                      : worldDifficulty === 'HARD'
                        ? 'rgba(251, 146, 60, 0.3)'
                        : 'rgba(224, 242, 254, 0.24)',
                  animationDuration: worldDifficulty === 'HELL' ? '14s' : worldDifficulty === 'HARD' ? '18s' : '26s',
                }}
              />
              <div
                className="absolute bottom-[14%] left-[46%] w-[26%] h-[16%] rounded-full blur-2xl animate-cloud-drift transition-colors duration-700"
                style={{
                  background:
                    worldDifficulty === 'HELL'
                      ? 'rgba(126, 34, 206, 0.34)'
                      : worldDifficulty === 'HARD'
                        ? 'rgba(220, 38, 38, 0.24)'
                        : 'rgba(224, 242, 254, 0.18)',
                  animationDelay: '-9s',
                  animationDuration: worldDifficulty === 'HELL' ? '16s' : worldDifficulty === 'HARD' ? '20s' : '28s',
                }}
              />
            </div>

            {/* 4B. Dynamic Floating Weather Particles (Starlight Motes / Rising Embers / Crimson Ash + Void Sparks) */}
            <div className="pointer-events-none absolute inset-0 overflow-hidden z-[8]">
              {WORLD_WEATHER_PARTICLES.map((p) => {
                const isHell = worldDifficulty === 'HELL';
                const isHard = worldDifficulty === 'HARD';
                const animClass = isHell && !p.alt ? 'animate-world-ash' : 'animate-world-ember';
                const color = isHell
                  ? p.alt
                    ? '#e879f9'
                    : '#fb7185'
                  : isHard
                    ? p.alt
                      ? '#fde047'
                      : '#fb923c'
                    : p.alt
                      ? '#bae6fd'
                      : '#fde047';
                return (
                  <span
                    key={p.id}
                    className={`absolute rounded-full ${animClass}`}
                    style={{
                      left: `${p.left}%`,
                      top: isHell && !p.alt ? `${(p.top % 35)}%` : `${55 + (p.top % 45)}%`,
                      width: `${isHell ? p.size + 1 : p.size}px`,
                      height: `${isHell ? p.size + 1 : p.size}px`,
                      backgroundColor: color,
                      boxShadow: `0 0 ${isHell ? 12 : isHard ? 9 : 7}px ${color}`,
                      animationDuration: `${isHell ? p.duration * 0.72 : isHard ? p.duration * 0.85 : p.duration * 1.4}s`,
                      animationDelay: `${p.delay}s`,
                    }}
                  />
                );
              })}
            </div>

            {/* 5. Curved Animated Ley-Line Routes + Hard Rift Surge Rings + Hell Blood Eclipse & Void Fissures */}
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
                <radialGradient id="bloodEclipseCorona" cx="50%" cy="50%" r="50%">
                  <stop offset="0%" stopColor="#09030e" stopOpacity="0.98" />
                  <stop offset="48%" stopColor="#09030e" stopOpacity="0.96" />
                  <stop offset="56%" stopColor="#fb7185" stopOpacity="0.95" />
                  <stop offset="72%" stopColor="#e11d48" stopOpacity="0.55" />
                  <stop offset="100%" stopColor="#a855f7" stopOpacity="0" />
                </radialGradient>
              </defs>

              {/* WL 2 HARD: Subtle Rift Surge Shock Rings pulsing across the central sea */}
              {worldDifficulty === 'HARD' && (
                <g opacity="0.55">
                  <circle cx="400" cy="230" r="95" fill="none" stroke="#fb923c" strokeWidth="1.4" strokeDasharray="8 12" />
                  <circle cx="670" cy="300" r="115" fill="none" stroke="#f97316" strokeWidth="1.3" strokeDasharray="6 10" />
                  <circle cx="860" cy="115" r="78" fill="none" stroke="#fdba74" strokeWidth="1.6" strokeDasharray="4 8" />
                </g>
              )}

              {/* WL 3 HELL: Monumental Blood Eclipse in Eastern Sky + Glowing Dimensional Void Fissures */}
              {worldDifficulty === 'HELL' && (
                <g>
                  <g className="animate-world-eclipse" style={{ transformOrigin: '860px 96px' }}>
                    <circle cx="860" cy="96" r="88" fill="url(#bloodEclipseCorona)" />
                    <circle cx="860" cy="96" r="46" fill="none" stroke="#fda4af" strokeWidth="2.2" filter="url(#leyGlow)" />
                    <circle cx="860" cy="96" r="64" fill="none" stroke="#c084fc" strokeWidth="1.1" strokeDasharray="5 7" opacity="0.7" />
                  </g>
                  <g className="animate-world-fissure" filter="url(#leyGlow)">
                    {VOID_FISSURES_SVG.map((fp, fi) => (
                      <g key={fi}>
                        <path d={fp} fill="none" stroke="#be123c" strokeWidth="5.2" strokeOpacity="0.45" strokeLinecap="round" strokeLinejoin="round" />
                        <path d={fp} fill="none" stroke="#fda4af" strokeWidth="1.6" strokeOpacity="0.88" strokeLinecap="round" strokeLinejoin="round" />
                      </g>
                    ))}
                  </g>
                </g>
              )}
              {REGION_LINKS.map(([fromId, toId], idx) => {
                const a = REGION_MAP[fromId];
                const b = REGION_MAP[toId];
                if (!a || !b) return null;
                const bothOpen =
                  isRegionUnlocked(a.id, clearedStages, worldDifficulty) &&
                  isRegionUnlocked(b.id, clearedStages, worldDifficulty);
                const d = buildCurvedPath(
                  a.mapPos.x * 10,
                  a.mapPos.y * 5.625,
                  b.mapPos.x * 10,
                  b.mapPos.y * 5.625,
                  idx % 2 === 0 ? 0.12 : -0.12,
                );
                const activeGlowColor =
                  worldDifficulty === 'HELL'
                    ? '#f43f5e'
                    : worldDifficulty === 'HARD'
                      ? '#f97316'
                      : '#f5c84c';
                const activeLineColor =
                  worldDifficulty === 'HELL'
                    ? '#fda4af'
                    : worldDifficulty === 'HARD'
                      ? '#fdba74'
                      : '#fef08a';
                return (
                  <g key={`${fromId}_${toId}`}>
                    {bothOpen && (
                      <path
                        d={d}
                        fill="none"
                        stroke={activeGlowColor}
                        strokeOpacity="0.4"
                        strokeWidth="6.5"
                        strokeLinecap="round"
                        filter="url(#leyGlow)"
                      />
                    )}
                    <path
                      d={d}
                      fill="none"
                      stroke={bothOpen ? activeLineColor : '#a78bfa'}
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

            {/* 6. 10 Sculpted RPG Region Landmark Pins (Dynamic Sequential Unlock per World Level!) */}
            {REGIONS.map((region) => {
              const regionUnlocked = isRegionUnlocked(region.id, clearedStages, worldDifficulty);
              const isSelected = focusedRegion.id === region.id;
              const clearedInRegion = getRegionClearedCount(region.id);
              const pct = clearedInRegion / region.stageCount;
              const allCleared = regionUnlocked && clearedInRegion >= region.stageCount;
              const chestKey = encodeRegionChestKey(region.id, worldDifficulty);
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

                      {allCleared && !(claimedRegionChests ?? []).includes(chestKey) && (
                        <span
                          className="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-gradient-to-br from-amber-300 to-yellow-500 border-2 border-white flex items-center justify-center shadow-[0_0_16px_rgba(253,224,71,0.95)] animate-bounce"
                          title="Region Completion Reward Chest Ready!"
                        >
                          <GameIcon name="reward_chest" className="w-4 h-4" />
                        </span>
                      )}

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
          <div className="pointer-events-none absolute top-0 inset-x-0 z-40 flex flex-col gap-1.5 safe-area-pad sm:p-3 ls-compact-pad">
            <div className="flex flex-wrap items-center justify-between gap-2">
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

                <div
                  className="rpg-panel-subtle px-3 py-1 flex items-center gap-2 border-l-4"
                  style={{ borderLeftColor: activeDiffCfg.themeColor }}
                >
                  <GameIcon name="worldmap" className="w-6 h-6 sm:w-7 sm:h-7" />
                  <div>
                    <div
                      className="text-[8px] sm:text-[9px] font-black uppercase tracking-[0.22em] leading-none"
                      style={{ color: activeDiffCfg.themeColor }}
                    >
                      {activeDiffCfg.shortLabel} {activeDiffCfg.label} • {unlockedRegionsCount}/10 REALMS
                    </div>
                    <h1 className="font-display text-xs sm:text-lg font-black text-white text-glow-gold leading-tight">
                      WORLD OF AETHERIA
                    </h1>
                  </div>
                </div>
              </div>

              {/* CAMPAIGN WORLD LEVEL SELECTOR (WL 1 NORMAL | WL 2 HARD | WL 3 HELL) */}
              <div className="pointer-events-auto order-3 sm:order-2 w-full sm:w-auto flex justify-center">
                {renderWorldLevelSwitcher(false)}
              </div>

              <div className="pointer-events-auto order-2 sm:order-3 flex items-center gap-1.5">
                <div className="hidden lg:flex items-center gap-2 rpg-panel-subtle px-3 py-1.5 text-[11px] font-mono">
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

            {/* WORLD LEVEL AFFIX & UNLOCK BANNER (Shown for Hard & Hell) */}
            {worldDifficulty !== 'NORMAL' && (
              <div className="flex justify-center">
                <div
                  className="pointer-events-auto px-3 py-1 rounded-full bg-slate-950/90 backdrop-blur-md border text-[10px] sm:text-[11px] font-bold flex flex-wrap items-center justify-center gap-x-2 gap-y-0.5 shadow-xl max-w-3xl"
                  style={{
                    borderColor: `${activeDiffCfg.themeColor}88`,
                    boxShadow: `0 0 20px ${activeDiffCfg.themeColor}33`,
                  }}
                >
                  {!activeDiffUnlocked ? (
                    <>
                      <span className="inline-flex items-center gap-1 font-display font-black uppercase tracking-wider text-rose-300">
                        <Lock className="w-3 h-3" /> {activeDiffCfg.shortLabel} {activeDiffCfg.label} LOCKED
                      </span>
                      <span className="text-slate-300">• {activeDiffCfg.unlockLabel}</span>
                      <span className="hidden md:inline text-amber-200/90">
                        • Preview: {activeDiffCfg.rewardHighlight}
                      </span>
                    </>
                  ) : (
                    <>
                      <span
                        className="inline-flex items-center gap-1 font-display font-black uppercase tracking-wider"
                        style={{ color: activeDiffCfg.themeColor }}
                      >
                        {worldDifficulty === 'HELL' ? (
                          <Skull className="w-3 h-3" />
                        ) : (
                          <Flame className="w-3 h-3" />
                        )}
                        {activeDiffCfg.worldModifier?.name ?? activeDiffCfg.subtitle}
                      </span>
                      <span className="text-slate-200">{activeDiffCfg.rewardHighlight}</span>
                    </>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Bottom Floating Region Dossier & Quick-Jump Compass */}
          <div className="pointer-events-none absolute bottom-0 inset-x-0 z-40 safe-area-pad sm:p-3 ls-compact-pad flex flex-col items-center gap-1.5">
            {/* Compact Floating 1–10 Quick-Jump Strip */}
            <div className="pointer-events-auto flex items-center gap-1 max-w-full overflow-x-auto px-2 py-1 bg-slate-950/85 border border-amber-400/25 backdrop-blur-md rounded-full">
              {REGIONS.map((r) => {
                const open = isRegionUnlocked(r.id, clearedStages, worldDifficulty);
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
            {(() => {
              const pwrRange = getRegionRecommendedPowerRange(focusedRegion, worldDifficulty);
              const focusedCleared = getRegionClearedCount(focusedRegion.id);
              const chestKey = encodeRegionChestKey(focusedRegion.id, worldDifficulty);
              const chestClaimed = (claimedRegionChests ?? []).includes(chestKey);
              const chestReady = focusedCleared >= focusedRegion.stageCount && !chestClaimed;
              return (
                <div
                  className="pointer-events-auto rpg-panel w-full max-w-4xl px-3 sm:px-4 py-2 sm:py-2.5 flex flex-col sm:flex-row sm:items-center justify-between gap-2 sm:gap-3"
                  style={{ borderColor: `${activeDiffCfg.themeColor}70` }}
                >
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
                        {worldDifficulty !== 'NORMAL' && (
                          <span
                            className="px-2 py-0.5 rounded text-[9px] font-display font-black uppercase border bg-black/80"
                            style={{
                              borderColor: activeDiffCfg.themeColor,
                              color: activeDiffCfg.themeColor,
                            }}
                          >
                            {activeDiffCfg.shortLabel} {activeDiffCfg.label}
                          </span>
                        )}
                        {focusedRegion.faction !== 'VOID' && (
                          <span className="text-[10px] font-bold uppercase text-slate-300 hidden md:inline ls-hide">
                            {FACTIONS[focusedRegion.faction].name}
                          </span>
                        )}
                        <span className="text-[10px] font-mono text-amber-300 font-bold">
                          PWR {pwrRange[0].toLocaleString()}–{pwrRange[1].toLocaleString()}
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

                  <div className="shrink-0 flex items-center gap-2">
                    <button
                      onClick={() => {
                        audioManager.playSfx('button');
                        setShowChestModal(true);
                      }}
                      className={`relative px-3 py-2 rounded-xl border font-display font-black text-[10px] sm:text-xs uppercase tracking-wider flex items-center gap-1.5 transition shrink-0 ${
                        chestReady
                          ? 'bg-gradient-to-r from-amber-400/25 to-yellow-300/20 border-amber-300 text-amber-200 shadow-[0_0_18px_rgba(245,200,76,0.5)] animate-pulse'
                          : chestClaimed
                            ? 'bg-emerald-950/60 border-emerald-500/45 text-emerald-300'
                            : 'bg-slate-950/85 border-amber-400/35 text-amber-200 hover:border-amber-300'
                      }`}
                      title="Region Completion Reward Chest"
                    >
                      <GameIcon name="reward_chest" className="w-5 h-5" />
                      <span className="hidden md:inline">
                        {chestReady
                          ? 'Claim Chest!'
                          : chestClaimed
                            ? 'Claimed'
                            : `${focusedCleared}/${focusedRegion.stageCount}`}
                      </span>
                      {chestReady && (
                        <span className="absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full bg-rose-500 text-white text-[9px] font-black flex items-center justify-center">
                          !
                        </span>
                      )}
                    </button>

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
                          {!activeDiffUnlocked
                            ? activeDiffCfg.unlockLabel
                            : `Clear ${activeDiffCfg.label} Ch.${focusedRegion.chapter - 1} (${prevRegionClearedCount}/12)`}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              );
            })()}
          </div>
        </div>
      )}

      {/* ========================================================================== */}
      {/* VIEW B: SCENIC WINDING 12-STAGE ADVENTURE PATH (ZOOMED BIOME PANORAMA!)    */}
      {/* ========================================================================== */}
      {viewMode === 'REGION' && activeStage && (
        <div className="relative w-full h-full flex flex-col overflow-hidden">
          {/* LAYER 0: Bespoke Hand-Painted Region Biome Panorama Backdrop (Synced to World Level Atmosphere!) */}
          <div className="pointer-events-none absolute inset-0 overflow-hidden">
            <img
              src={focusedRegion.arenaAsset}
              alt={focusedRegion.name}
              className="w-full h-full object-cover scale-105 transition-all duration-700"
              style={{
                filter:
                  worldDifficulty === 'HELL'
                    ? 'grayscale(0.42) sepia(0.58) hue-rotate(-48deg) saturate(2.05) brightness(0.46) contrast(1.3)'
                    : worldDifficulty === 'HARD'
                      ? 'sepia(0.38) saturate(1.48) brightness(0.52) contrast(1.16) hue-rotate(-18deg)'
                      : 'brightness(0.6) saturate(1.16) contrast(1.06)',
              }}
            />
            <div
              className="absolute inset-0 transition-all duration-700"
              style={{
                mixBlendMode: worldDifficulty === 'NORMAL' ? 'normal' : 'multiply',
                background:
                  worldDifficulty === 'HELL'
                    ? `radial-gradient(ellipse 78% 72% at 38% 50%, rgba(190,18,60,0.52) 0%, rgba(46,7,54,0.82) 66%, rgba(8,2,16,0.96) 100%)`
                    : worldDifficulty === 'HARD'
                      ? `radial-gradient(ellipse 78% 72% at 38% 50%, rgba(194,65,12,0.46) 0%, rgba(56,14,28,0.78) 66%, rgba(6,6,18,0.94) 100%)`
                      : `radial-gradient(ellipse 75% 70% at 38% 50%, ${focusedRegion.themeColor}22 0%, rgba(5, 9, 24, 0.72) 68%, rgba(4, 7, 18, 0.92) 100%)`,
              }}
            />
            <div
              className="absolute top-[12%] left-[18%] w-[42%] h-[22%] rounded-full blur-3xl animate-cloud-drift"
              style={{
                background:
                  worldDifficulty === 'HELL'
                    ? 'rgba(244,63,94,0.28)'
                    : worldDifficulty === 'HARD'
                      ? 'rgba(251,146,60,0.26)'
                      : `${focusedRegion.themeColor}24`,
              }}
            />
            {WORLD_WEATHER_PARTICLES.slice(0, 14).map((p) => {
              const isHell = worldDifficulty === 'HELL';
              const isHard = worldDifficulty === 'HARD';
              const color = isHell
                ? p.alt
                  ? '#e879f9'
                  : '#fb7185'
                : isHard
                  ? '#fb923c'
                  : focusedRegion.themeColor;
              return (
                <span
                  key={`reg_p_${p.id}`}
                  className={`absolute rounded-full ${isHell && !p.alt ? 'animate-world-ash' : 'animate-world-ember'}`}
                  style={{
                    left: `${p.left}%`,
                    top: isHell && !p.alt ? `${p.top % 30}%` : `${60 + (p.top % 40)}%`,
                    width: `${p.size}px`,
                    height: `${p.size}px`,
                    backgroundColor: color,
                    boxShadow: `0 0 10px ${color}`,
                    animationDuration: `${isHell ? p.duration * 0.75 : p.duration}s`,
                    animationDelay: `${p.delay}s`,
                  }}
                />
              );
            })}
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

            <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
              <div className="hidden md:block">{renderWorldLevelSwitcher(true)}</div>
              {(() => {
                const regCleared = getRegionClearedCount(focusedRegion.id);
                const chestKey = encodeRegionChestKey(focusedRegion.id, worldDifficulty);
                const chestClaimed = (claimedRegionChests ?? []).includes(chestKey);
                const chestReady = regCleared >= focusedRegion.stageCount && !chestClaimed;
                return (
                  <button
                    onClick={() => {
                      audioManager.playSfx('button');
                      setShowChestModal(true);
                    }}
                    className={`relative flex items-center gap-2 rpg-panel-subtle px-2.5 py-1 text-xs transition ${
                      chestReady
                        ? 'border-amber-300 bg-amber-500/20 shadow-[0_0_18px_rgba(245,200,76,0.5)] animate-pulse'
                        : chestClaimed
                          ? 'border-emerald-400/50 bg-emerald-950/45'
                          : 'hover:border-amber-300'
                    }`}
                    title="View / Claim Area Completion Reward Chest"
                  >
                    <GameIcon name="reward_chest" className="w-5 h-5" />
                    <div className="hidden sm:flex items-center gap-2">
                      <div className="w-16 h-2 rounded-full bg-slate-900 overflow-hidden">
                        <div
                          className="h-full transition-all"
                          style={{
                            width: `${(regCleared / focusedRegion.stageCount) * 100}%`,
                            background: chestReady ? '#fde047' : focusedRegion.themeColor,
                          }}
                        />
                      </div>
                      <span
                        className={`font-mono font-black ${
                          chestClaimed ? 'text-emerald-300' : 'text-amber-300'
                        }`}
                      >
                        {chestReady
                          ? 'CLAIM!'
                          : chestClaimed
                            ? '✓ 12/12'
                            : `${regCleared}/${focusedRegion.stageCount}`}
                      </span>
                    </div>
                    {chestReady && (
                      <span className="absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full bg-rose-500 text-white text-[9px] font-black flex items-center justify-center">
                        !
                      </span>
                    )}
                  </button>
                );
              })()}
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
                      {worldDifficulty !== 'NORMAL' && (
                        <span
                          className="px-2 py-0.5 rounded text-[9px] font-display font-black uppercase border bg-black/85 flex items-center gap-1"
                          style={{
                            borderColor: activeDiffCfg.themeColor,
                            color: activeDiffCfg.themeColor,
                          }}
                          title={activeDiffCfg.worldModifier?.desc}
                        >
                          {worldDifficulty === 'HELL' ? (
                            <Skull className="w-2.5 h-2.5" />
                          ) : (
                            <Flame className="w-2.5 h-2.5" />
                          )}
                          {activeDiffCfg.shortLabel} {activeDiffCfg.label}
                        </span>
                      )}
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
                    {activeStage.worldModifier && (
                      <div
                        className="mt-1 px-2 py-1 rounded-lg bg-slate-950/85 border text-[10px] font-semibold flex items-center gap-1.5"
                        style={{
                          borderColor: `${activeStage.worldModifier.color}55`,
                          color: '#fde68a',
                        }}
                      >
                        <span
                          className="font-display font-black uppercase tracking-wider shrink-0"
                          style={{ color: activeStage.worldModifier.color }}
                        >
                          {activeStage.worldModifier.name}:
                        </span>
                        <span className="text-slate-300 truncate" title={activeStage.worldModifier.desc}>
                          {activeDiffCfg.rewardHighlight}
                        </span>
                      </div>
                    )}
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
                            ? (activeStage.repeatCrystals ?? 40)
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
                          {(activeStage.rewards.equipmentDropChance ?? 1) < 1
                            ? `${Math.round((activeStage.rewards.equipmentDropChance ?? 1) * 100)}% ×${activeStage.rewards.equipmentDrops}`
                            : (activeStage.rewards.bonusEquipmentDropChance ?? 0) > 0
                              ? `×${activeStage.rewards.equipmentDrops}–${activeStage.rewards.equipmentDrops + 1}`
                              : `×${activeStage.rewards.equipmentDrops}`}{' '}
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

                {/* DEPLOY & INSTANT QUICK SWEEP (1× / 5× FOR CLEARED STAGES!) */}
                <div className="pt-1.5 border-t border-amber-400/20 space-y-2">
                  {activeStageUnlocked ? (
                    <>
                      {clearedStages.includes(activeStage.id) && (
                        <div className="grid grid-cols-2 gap-1.5">
                          <RpgButton
                            variant="cyan"
                            size="sm"
                            onClick={() => {
                              const res = sweepCampaignStage(activeStage.id, 1);
                              if (res.ok && res.summary) {
                                audioManager.playSfx('victory');
                                setLastSweepCount(1);
                                setSweepResult(res.summary);
                              }
                            }}
                            className="font-display font-black uppercase tracking-wider w-full"
                          >
                            <FastForward className="w-3.5 h-3.5" /> Quick Sweep 1×
                          </RpgButton>
                          <RpgButton
                            variant="emerald"
                            size="sm"
                            onClick={() => {
                              const res = sweepCampaignStage(activeStage.id, 5);
                              if (res.ok && res.summary) {
                                audioManager.playSfx('victory');
                                setLastSweepCount(5);
                                setSweepResult(res.summary);
                              }
                            }}
                            className="font-display font-black uppercase tracking-wider w-full"
                          >
                            <FastForward className="w-3.5 h-3.5" /> Quick Sweep 5×
                          </RpgButton>
                        </div>
                      )}
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
                    </>
                  ) : (
                    <div className="w-full py-2.5 px-4 rounded-xl bg-slate-950 border border-slate-700 text-center text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center justify-center gap-2">
                      <Lock className="w-4 h-4 text-slate-500" />
                      <span>
                        Clear Stage {activeDiffCfg.codePrefix}
                        {activeStage.chapter}-{activeStage.stageNumber - 1} to Unlock
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

      <RegionChestModal
        open={showChestModal}
        region={focusedRegion}
        difficulty={worldDifficulty}
        clearedCount={getRegionClearedCount(focusedRegion.id)}
        onClose={() => setShowChestModal(false)}
      />

      {/* CAMPAIGN QUICK SWEEP RESULT MODAL */}
      <AnimatePresence>
        {sweepResult && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setSweepResult(null)}
            className="fixed inset-0 z-[60] bg-[#030510]/85 backdrop-blur-md flex items-center justify-center p-3 sm:p-4"
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.92, y: 16 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.94, y: 10 }}
              onClick={(e) => e.stopPropagation()}
              className="relative rpg-panel w-full max-w-xl overflow-hidden border-emerald-400/60"
            >
              <CornerFiligree color="#34d399" size={10} opacity={0.85} />
              <div className="px-4 py-3 border-b border-emerald-400/25 bg-slate-950/80 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                  <div>
                    <div className="text-[10px] font-display font-black uppercase tracking-[0.2em] text-emerald-300">
                      INSTANT CAMPAIGN QUICK SWEEP COMPLETE
                    </div>
                    <h3 className="font-display text-base sm:text-lg font-black text-white">
                      {sweepResult.stageName}
                    </h3>
                  </div>
                </div>
                <button
                  onClick={() => setSweepResult(null)}
                  className="p-1.5 rounded-lg bg-slate-900 border border-slate-700 text-slate-300 hover:text-amber-300"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="p-4 space-y-4 max-h-[75dvh] overflow-y-auto">
                {/* Squad EXP Gain */}
                {sweepResult.heroExpResults && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {Object.values(sweepResult.heroExpResults).map((expRes) => {
                      const h = HERO_MAP[expRes.heroId];
                      if (!h) return null;
                      return (
                        <div
                          key={expRes.heroId}
                          className="rounded-xl bg-slate-950/80 border border-white/10 p-2 flex items-center gap-2"
                        >
                          <div className="w-9 h-9 rounded-lg overflow-hidden border border-white/20 shrink-0">
                            <ArtImage
                              kind="HERO"
                              id={h.id}
                              src={h.assets.card}
                              alt={h.name}
                              className="w-full h-full object-cover object-top"
                            />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between gap-1 text-[11px] mb-1">
                              <span className="font-bold text-white flex items-center gap-1 truncate">
                                {h.name}
                                <span className="px-1 rounded bg-slate-900 border border-cyan-400/40 font-mono text-[9px] text-cyan-200">
                                  Lv.{expRes.newLevel}
                                </span>
                                {expRes.levelsGained > 0 && (
                                  <span className="px-1.5 py-0.5 rounded-full bg-emerald-400 text-slate-950 font-display font-black text-[8px]">
                                    Lv. UP +{expRes.levelsGained}
                                  </span>
                                )}
                              </span>
                              <span className="font-mono text-[10px] text-cyan-300 shrink-0">
                                +{expRes.expGained.toLocaleString()}
                              </span>
                            </div>
                            <RpgProgressBar
                              value={expRes.newExp}
                              max={getExpToNextLevel(expRes.newLevel)}
                              heightClass="h-1.5"
                              gradient="linear-gradient(90deg, #06b6d4 0%, #fde047 100%)"
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* Spoils Tiles */}
                <div className="flex flex-wrap gap-2">
                  {sweepResult.goldEarned > 0 && (
                    <RpgLootTile color="#f5c84c" subLabel="Gold" bottomLabel={`+${sweepResult.goldEarned.toLocaleString()}`} index={0}>
                      <GameIcon name="gold" className="w-8 h-8" />
                    </RpgLootTile>
                  )}
                  {sweepResult.crystalsEarned > 0 && (
                    <RpgLootTile color="#38e8ff" subLabel="Crystals" bottomLabel={`+${sweepResult.crystalsEarned}`} index={1}>
                      <GameIcon name="crystal" className="w-8 h-8" />
                    </RpgLootTile>
                  )}
                  {sweepResult.expPotionsEarned > 0 && (
                    <RpgLootTile color="#34d399" subLabel="EXP" bottomLabel={`×${sweepResult.expPotionsEarned}`} index={2}>
                      <MaterialIcon material="expPotions" className="w-8 h-8" />
                    </RpgLootTile>
                  )}
                  {sweepResult.forgeStonesEarned > 0 && (
                    <RpgLootTile color="#a78bfa" subLabel="Stones" bottomLabel={`×${sweepResult.forgeStonesEarned}`} index={3}>
                      <MaterialIcon material="forgeStones" className="w-8 h-8" />
                    </RpgLootTile>
                  )}
                  {sweepResult.starIronIngotsEarned > 0 && (
                    <RpgLootTile color="#38bdf8" subLabel="Star-Iron" bottomLabel={`×${sweepResult.starIronIngotsEarned}`} index={4}>
                      <MaterialIcon material="starIronIngots" className="w-8 h-8" />
                    </RpgLootTile>
                  )}
                  {sweepResult.astralAnvilCoresEarned > 0 && (
                    <RpgLootTile color="#f5c84c" subLabel="Anvil" bottomLabel={`×${sweepResult.astralAnvilCoresEarned}`} index={5}>
                      <MaterialIcon material="astralAnvilCores" className="w-8 h-8" />
                    </RpgLootTile>
                  )}
                  {sweepResult.starCoresEarned > 0 && (
                    <RpgLootTile color="#e879f9" subLabel="Star Core" bottomLabel={`×${sweepResult.starCoresEarned}`} index={6}>
                      <MaterialIcon material="starCores" className="w-8 h-8" />
                    </RpgLootTile>
                  )}
                  {sweepResult.relicFragmentsEarned > 0 && (
                    <RpgLootTile color="#22d3ee" subLabel="Relic Frag" bottomLabel={`×${sweepResult.relicFragmentsEarned}`} index={7}>
                      <GameIcon name="relic" className="w-8 h-8" />
                    </RpgLootTile>
                  )}
                  {sweepResult.bondGiftsEarned > 0 && (
                    <RpgLootTile color="#fb7185" subLabel="Bond" bottomLabel={`×${sweepResult.bondGiftsEarned}`} index={8}>
                      <MaterialIcon material="bondGifts" className="w-8 h-8" />
                    </RpgLootTile>
                  )}
                  {Object.entries(sweepResult.essencesEarned).map(([fac, qty], i) =>
                    qty ? (
                      <RpgLootTile
                        key={fac}
                        color={FACTIONS[fac as Faction].color}
                        subLabel={MATERIAL_META[factionToEssenceKey(fac as Faction)].shortName}
                        bottomLabel={`×${qty}`}
                        index={9 + i}
                      >
                        <MaterialIcon material={factionToEssenceKey(fac as Faction)} className="w-8 h-8" />
                      </RpgLootTile>
                    ) : null,
                  )}
                  {sweepResult.droppedRelics.map((dr, i) => {
                    const rel = RELIC_MAP[dr.relicId];
                    if (!rel) return null;
                    return (
                      <RpgLootTile
                        key={`${dr.relicId}_${i}`}
                        color="#f5c84c"
                        topTag={dr.isNew ? 'NEW' : `R${dr.newRank}`}
                        bottomLabel={rel.name.split(' ')[0]}
                        index={12 + i}
                      >
                        <GameIcon name="relic" className="w-8 h-8" />
                      </RpgLootTile>
                    );
                  })}
                </div>

                {/* Dropped Gear Spotlight */}
                {sweepResult.droppedEquipment.length > 0 && (
                  <div className="space-y-1.5 max-h-40 overflow-y-auto pr-1">
                    {sweepResult.droppedEquipment.map((gear) => (
                      <div
                        key={gear.uid}
                        className="rounded-xl bg-slate-950/85 border border-white/15 px-3 py-1.5 flex items-center gap-2.5"
                        style={{ borderLeft: `3px solid ${RARITY_COLORS[gear.rarity]}` }}
                      >
                        <EquipIcon slot={gear.slot} className="w-7 h-7" />
                        <div className="min-w-0 flex-1">
                          <div className="text-xs font-bold text-white truncate">
                            <span style={{ color: RARITY_COLORS[gear.rarity] }}>{gear.rarity}</span>{' '}
                            {gear.name}
                          </div>
                          <div className="text-[10px] font-mono text-amber-200 truncate">
                            {formatStatValue(gear.mainStat.stat, getEnhancedMainStatValue(gear))}
                            {gear.subStats.map((s) => ` • ${formatStatValue(s.stat, s.value)}`).join('')}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                <div className="flex items-center justify-end gap-2 pt-2 border-t border-white/10">
                  {activeStage && clearedStages.includes(activeStage.id) && (
                    <RpgButton
                      variant="emerald"
                      size="sm"
                      onClick={() => {
                        const res = sweepCampaignStage(activeStage.id, lastSweepCount);
                        if (res.ok && res.summary) {
                          audioManager.playSfx('victory');
                          setSweepResult(res.summary);
                        }
                      }}
                    >
                      <FastForward className="w-3.5 h-3.5" /> Sweep {lastSweepCount}× Again
                    </RpgButton>
                  )}
                  <RpgButton variant="gold" size="sm" onClick={() => setSweepResult(null)}>
                    Awesome!
                  </RpgButton>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* SCREEN-EDGE WORLD LEVEL CORRUPTION FRAME (Subtle Amber Heat on Hard / Pulsing Blood-Crimson Rim on Hell) */}
      {worldDifficulty !== 'NORMAL' && (
        <div
          className="pointer-events-none fixed inset-0 z-[45] transition-all duration-700"
          style={{
            boxShadow:
              worldDifficulty === 'HELL'
                ? 'inset 0 0 90px rgba(225,29,72,0.48), inset 0 0 28px rgba(168,85,247,0.34)'
                : 'inset 0 0 70px rgba(234,88,12,0.34), inset 0 0 22px rgba(251,146,60,0.22)',
          }}
        />
      )}

      {/* WORLD-SHIFT DIMENSIONAL SHOCKWAVE & ERA CALLOUT ON DIFFICULTY SWITCH */}
      <AnimatePresence>
        {worldShiftFx && (
          <motion.div
            key={worldShiftFx.id}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="pointer-events-none fixed inset-0 z-[80] flex items-center justify-center overflow-hidden"
          >
            <motion.div
              initial={{ scale: 0.25, opacity: 0.9 }}
              animate={{ scale: 2.8, opacity: 0 }}
              transition={{ duration: 0.72, ease: [0.16, 1, 0.3, 1] }}
              className="absolute w-[64vw] h-[64vw] rounded-full border-4"
              style={{
                borderColor: WORLD_ERA_TITLES[worldShiftFx.diff].color,
                boxShadow: `0 0 90px ${WORLD_ERA_TITLES[worldShiftFx.diff].color}, inset 0 0 60px ${WORLD_ERA_TITLES[worldShiftFx.diff].color}88`,
              }}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.88, y: 10 }}
              animate={{ opacity: [0, 1, 1, 0], scale: [0.9, 1.02, 1, 1.04], y: [10, 0, 0, -6] }}
              transition={{ duration: 0.9, times: [0, 0.2, 0.72, 1] }}
              className="px-6 py-3 rounded-2xl bg-slate-950/90 backdrop-blur-md border-2 text-center shadow-2xl"
              style={{
                borderColor: WORLD_ERA_TITLES[worldShiftFx.diff].color,
                boxShadow: `0 0 42px ${WORLD_ERA_TITLES[worldShiftFx.diff].color}66`,
              }}
            >
              <div
                className="font-display text-lg sm:text-2xl font-black tracking-[0.18em] uppercase"
                style={{ color: WORLD_ERA_TITLES[worldShiftFx.diff].color }}
              >
                {WORLD_ERA_TITLES[worldShiftFx.diff].title}
              </div>
              <div className="text-[11px] sm:text-xs text-slate-200 font-semibold mt-0.5">
                {WORLD_ERA_TITLES[worldShiftFx.diff].subtitle}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
