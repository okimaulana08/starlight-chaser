import { REGION_MAP } from './regions';
import type { EquipmentRarity, EquipmentSetId, Faction, StageDef, StageWave } from '../types/game';

export const SPIRE_MAX_FLOOR = 50;

export type SpireModifierId =
  | 'SOLAR_OVERCHARGE'
  | 'IRON_VANGUARD'
  | 'SHADOW_FRENZY'
  | 'STARLIGHT_SURGE'
  | 'TWIN_WARDENS'
  | 'CELESTIAL_ASCENT';

export interface SpireModifierDef {
  id: SpireModifierId;
  name: string;
  desc: string;
  color: string;
}

export const SPIRE_MODIFIERS: Record<SpireModifierId, SpireModifierDef> = {
  SOLAR_OVERCHARGE: {
    id: 'SOLAR_OVERCHARGE',
    name: 'Solar Overcharge',
    desc: 'Enemies +15% ATK • Squad +20% Ultimate Gauge Charge',
    color: '#f5c84c',
  },
  IRON_VANGUARD: {
    id: 'IRON_VANGUARD',
    name: 'Iron Vanguard',
    desc: 'Enemies +25% Stagger Shield • Squad +25% Crit DMG',
    color: '#94a3b8',
  },
  SHADOW_FRENZY: {
    id: 'SHADOW_FRENZY',
    name: 'Shadow Frenzy',
    desc: 'Enemies +15% Attack Speed • Squad +25% SP Regen',
    color: '#c084fc',
  },
  STARLIGHT_SURGE: {
    id: 'STARLIGHT_SURGE',
    name: 'Starlight Surge',
    desc: 'Squad starts with +24 Ult Gauge • Enemies +12% HP',
    color: '#38e8ff',
  },
  TWIN_WARDENS: {
    id: 'TWIN_WARDENS',
    name: 'Twin Wardens',
    desc: 'Double Elite Vanguard Wave • Bonus Forge Materials',
    color: '#f97316',
  },
  CELESTIAL_ASCENT: {
    id: 'CELESTIAL_ASCENT',
    name: 'Boss Milestone Trial',
    desc: 'Guardian Boss Gauntlet • Massive First-Clear Crystals & Relics',
    color: '#f43f5e',
  },
};

export interface SpireFloorInfo {
  floor: number;
  isBossFloor: boolean;
  title: string;
  chapterBiome: number;
  recommendedPower: number;
  enemyScale: number;
  modifier: SpireModifierDef;
  firstClearCrystals: number;
  goldRange: [number, number];
  starCores: number;
  relicFragments: number;
  forgeStones: number;
  bossName?: string;
  bossTitle?: string;
  bossAsset?: string;
  bossEnemyId?: string;
  arenaAsset: string;
  themeColor: string;
  ambientMoteColors: [number, number];
  primaryFaction: Faction;
}

const SPIRE_BOSS_ROTATION: Array<{
  chapter: number;
  enemyId: string;
  name: string;
  title: string;
  asset: string;
  faction: Faction;
}> = [
  { chapter: 1, enemyId: 'void_archon', name: 'Aurelius the Fallen Dawn', title: 'Spire Gatekeeper', asset: '/assets/enemies/boss_ch1.webp', faction: 'SOLARIS' },
  { chapter: 2, enemyId: 'void_archon', name: 'Nyxion of the Shattered Lens', title: 'Astral Arbiter', asset: '/assets/enemies/boss_ch2.webp', faction: 'ASTRAL' },
  { chapter: 3, enemyId: 'void_archon', name: 'Sylvanor the Blighted Root', title: 'Canopy Sovereign', asset: '/assets/enemies/boss_ch3.webp', faction: 'VERDANT' },
  { chapter: 4, enemyId: 'void_archon', name: 'Ignis Rex Caldera', title: 'Molten Tyrant', asset: '/assets/enemies/boss_ch4.webp', faction: 'ASHEN' },
  { chapter: 5, enemyId: 'void_archon', name: 'Cryos the Eternal Frost', title: 'Glacial Warden', asset: '/assets/enemies/boss_ch5.webp', faction: 'ASTRAL' },
  { chapter: 6, enemyId: 'void_archon', name: 'Thalassa of the Trench', title: 'Abyssal Leviathan', asset: '/assets/enemies/boss_ch6.webp', faction: 'VERDANT' },
  { chapter: 7, enemyId: 'void_archon', name: 'Zephyrus Storm-King', title: 'Tempest Sovereign', asset: '/assets/enemies/boss_ch7.webp', faction: 'SOLARIS' },
  { chapter: 8, enemyId: 'void_archon', name: 'Solarius Mirage', title: 'Sun-Scorched Pharaoh', asset: '/assets/enemies/boss_ch8.webp', faction: 'SOLARIS' },
  { chapter: 9, enemyId: 'void_archon', name: 'Aetherion Rift-Weaver', title: 'Starfall Architect', asset: '/assets/enemies/boss_ch9.webp', faction: 'ASTRAL' },
  { chapter: 10, enemyId: 'void_archon', name: 'Erebus the Star-Eater', title: 'Apex of the Astral Spire', asset: '/assets/enemies/boss_ch10.webp', faction: 'ASHEN' },
];

const NON_BOSS_MODIFIERS: SpireModifierId[] = [
  'SOLAR_OVERCHARGE',
  'IRON_VANGUARD',
  'SHADOW_FRENZY',
  'STARLIGHT_SURGE',
  'TWIN_WARDENS',
];

const ALL_SETS: EquipmentSetId[] = [
  'VANGUARD',
  'CHRONO',
  'ASHEN_FURY',
  'AEGIS_BASTION',
  'ASTRAL_SURGE',
  'VERDANT_GRACE',
];

export function encodeSpireStageId(floor: number): string {
  const f = Math.max(1, Math.min(SPIRE_MAX_FLOOR, Math.round(floor)));
  return `spire__${f}`;
}

export function parseSpireStageId(stageId: string): number | null {
  if (!stageId.startsWith('spire__')) return null;
  const num = Number(stageId.slice('spire__'.length));
  if (!Number.isInteger(num) || num < 1 || num > SPIRE_MAX_FLOOR) return null;
  return num;
}

export function getSpireFloorInfo(floorRaw: number): SpireFloorInfo {
  const floor = Math.max(1, Math.min(SPIRE_MAX_FLOOR, Math.round(floorRaw)));
  const isBossFloor = floor % 5 === 0;
  const bossIdx = Math.min(9, Math.floor((floor - 1) / 5));
  const chapterBiome = bossIdx + 1;
  const region = REGION_MAP[`region_${chapterBiome}`] ?? REGION_MAP.region_1;
  const bossEntry = SPIRE_BOSS_ROTATION[bossIdx];

  const modId: SpireModifierId = isBossFloor
    ? 'CELESTIAL_ASCENT'
    : NON_BOSS_MODIFIERS[(floor - 1) % NON_BOSS_MODIFIERS.length];

  // Smooth endgame scaling from Floor 1 (~10,000 PWR) up to Floor 50 (~98,000 PWR)
  const recommendedPower = Math.round(9200 + (floor - 1) * 1450 + Math.pow(floor, 1.78) * 32);
  const enemyScale = Number((0.88 + (floor - 1) * 0.145 + (isBossFloor ? 0.18 : 0)).toFixed(2));
  const firstClearCrystals = isBossFloor ? (floor === 50 ? 800 : floor % 10 === 0 ? 480 : 320) : 120;
  const baseGold = Math.round(950 + floor * 260);

  return {
    floor,
    isBossFloor,
    title: isBossFloor ? `Floor ${floor} • ${bossEntry.name}` : `Floor ${floor} • ${region.name} Ascent`,
    chapterBiome,
    recommendedPower,
    enemyScale,
    modifier: SPIRE_MODIFIERS[modId],
    firstClearCrystals,
    goldRange: [baseGold, Math.round(baseGold * 1.25)],
    starCores: isBossFloor ? Math.max(2, Math.ceil(floor / 10) + 1) : floor % 3 === 0 ? 1 : 0,
    relicFragments: isBossFloor ? 6 + Math.floor(floor / 5) * 2 : 2 + Math.floor(floor / 12),
    forgeStones: 3 + Math.floor(floor / 4),
    bossName: isBossFloor ? bossEntry.name : undefined,
    bossTitle: isBossFloor ? bossEntry.title : undefined,
    bossAsset: isBossFloor ? bossEntry.asset : undefined,
    bossEnemyId: isBossFloor ? bossEntry.enemyId : undefined,
    arenaAsset: region.arenaAsset,
    themeColor: region.themeColor,
    ambientMoteColors: region.ambientMoteColors,
    primaryFaction: bossEntry.faction,
  };
}

export function buildSpireStageDef(floorRaw: number): StageDef {
  const info = getSpireFloorInfo(floorRaw);
  const f = info.floor;

  const elites = ['armored_golem', 'astral_weaver', 'briar_behemoth', 'obsidian_knight', 'tempest_drake'];
  const mobs = ['void_stalker', 'rift_acolyte', 'solar_construct', 'cinder_imp', 'frost_lancer', 'void_wisp'];
  const e1 = elites[(f - 1) % elites.length];
  const e2 = elites[(f + 1) % elites.length];
  const m1 = mobs[(f - 1) % mobs.length];
  const m2 = mobs[(f + 2) % mobs.length];

  const waves: StageWave[] = info.isBossFloor
    ? [
        {
          label: `Spire F${f} — Vanguard Gate`,
          spawns: [
            { enemyId: e1, count: 1 },
            { enemyId: m1, count: 3 },
            { enemyId: m2, count: 2 },
          ],
        },
        {
          label: `SPIRE GUARDIAN — ${info.bossName}`,
          spawns: [
            { enemyId: info.bossEnemyId ?? 'void_archon', count: 1 },
            { enemyId: m1, count: 2 },
            ...(f >= 20 ? [{ enemyId: m2, count: 1 }] : []),
          ],
        },
      ]
    : [
        {
          label: `Spire F${f} — Wave 1`,
          spawns: [
            { enemyId: m1, count: 3 + (f >= 25 ? 1 : 0) },
            { enemyId: m2, count: 2 },
          ],
        },
        {
          label: `Spire F${f} — Elite Wardens`,
          spawns: [
            { enemyId: e1, count: info.modifier.id === 'TWIN_WARDENS' ? 2 : 1 },
            ...(f >= 12 ? [{ enemyId: e2, count: 1 }] : []),
            { enemyId: m2, count: 2 },
          ],
        },
      ];

  const rarityWeights: Record<EquipmentRarity, number> =
    f >= 35
      ? { COMMON: 0, RARE: 10, EPIC: 45, LEGENDARY: 45 }
      : f >= 20
        ? { COMMON: 0, RARE: 25, EPIC: 50, LEGENDARY: 25 }
        : f >= 10
          ? { COMMON: 5, RARE: 45, EPIC: 40, LEGENDARY: 10 }
          : { COMMON: 25, RARE: 55, EPIC: 18, LEGENDARY: 2 };

  return {
    id: encodeSpireStageId(f),
    regionId: `spire_sector_${info.chapterBiome}`,
    stageNumber: f,
    code: `SPIRE F${f}`,
    name: info.isBossFloor ? `${info.bossName} (F${f})` : `Astral Spire — Floor ${f}`,
    chapter: info.chapterBiome,
    subtitle: `${info.modifier.name}: ${info.modifier.desc}`,
    recommendedPower: info.recommendedPower,
    description: info.modifier.desc,
    enemyScale: info.enemyScale,
    isMiniBoss: !info.isBossFloor,
    isBossStage: info.isBossFloor,
    isSpire: true,
    spireFloor: f,
    spireModifier: info.modifier,
    bossNameOverride: info.bossName,
    bossTitleOverride: info.bossTitle,
    bossAssetOverride: info.bossAsset,
    arenaAsset: info.arenaAsset,
    arenaTintHex: 0xffffff,
    ambientMoteColors: info.ambientMoteColors,
    waves,
    firstClearCrystals: info.firstClearCrystals,
    combatExpMultiplier: 1.25,
    rewards: {
      gold: info.goldRange,
      expPotions: [2 + Math.floor(f / 8), 3 + Math.floor(f / 6)],
      forgeStones: [info.forgeStones, info.forgeStones + 2],
      starIronIngots: f >= 6 ? [1 + Math.floor(f / 12), 2 + Math.floor(f / 10)] : undefined,
      astralAnvilCores: f >= 15 ? [1, 1 + Math.floor(f / 18)] : undefined,
      starCores: info.starCores > 0 ? [info.starCores, info.starCores] : undefined,
      relicFragments: [info.relicFragments, info.relicFragments + 2],
      bondGiftsRange: info.isBossFloor ? [1, 2] : [0, 1],
      primaryEssence: info.primaryFaction,
      primaryEssenceQty: [2 + Math.floor(f / 10), 3 + Math.floor(f / 8)],
      bonusRandomEssenceChance: 0.4,
      targetSetIds: ALL_SETS,
      equipmentDrops: info.isBossFloor ? 2 : 1,
      rarityWeights,
    },
  };
}
