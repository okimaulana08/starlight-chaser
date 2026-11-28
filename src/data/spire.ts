import { REGION_MAP } from './regions';
import type {
  CampaignDifficulty,
  EquipmentRarity,
  EquipmentSetId,
  Faction,
  StageDef,
  StageWave,
} from '../types/game';

/**
 * 120-Floor Ascension Tower calibrated across all 3 World Levels + Constellation & Transcendence endgame:
 * - Stratum I   (F1–F40):   Celestial Ascent  (Normal Campaign scale ~10k → 92k PWR)
 * - Stratum II  (F41–F80):  Crimson Rift      (Hard Campaign scale   ~96k → 230k PWR)
 * - Stratum III (F81–F120): Abyssal Empyrean  (Hell / Transcended    ~240k → 445k PWR)
 *
 * Gem (Starlight Crystal) Milestone Policy:
 * - Regular floors (non-multiple of 5): 0 Crystals — rich Gold, EXP, Forge Stones, Essences & Relic Frags!
 * - Every 5th Floor (F5, F15, ..., F115): Mini-Boss Crystal Milestone (+150 / +220 / +300 Crystals)
 * - Every 10th Floor (F10, F20, ..., F120): Sovereign Boss Crystal Milestone (+320 / +480 / +650, Summit F120 +1,200 Crystals!)
 */
export const SPIRE_MAX_FLOOR = 120;

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
    name: 'Boss Crystal Milestone',
    desc: 'Guardian Boss Gauntlet • First-Clear Starlight Crystals, Star Cores & Relics',
    color: '#f43f5e',
  },
};

export interface SpireStratumMeta {
  index: 0 | 1 | 2;
  id: CampaignDifficulty;
  name: string;
  shortLabel: string;
  floorStart: number;
  floorEnd: number;
  color: string;
}

export const SPIRE_STRATA: SpireStratumMeta[] = [
  {
    index: 0,
    id: 'NORMAL',
    name: 'Stratum I — Celestial Ascent',
    shortLabel: 'I • F1–40',
    floorStart: 1,
    floorEnd: 40,
    color: '#38e8ff',
  },
  {
    index: 1,
    id: 'HARD',
    name: 'Stratum II — Crimson Rift',
    shortLabel: 'II • F41–80',
    floorStart: 41,
    floorEnd: 80,
    color: '#f97316',
  },
  {
    index: 2,
    id: 'HELL',
    name: 'Stratum III — Abyssal Empyrean',
    shortLabel: 'III • F81–120',
    floorStart: 81,
    floorEnd: 120,
    color: '#f43f5e',
  },
];

export interface SpireFloorInfo {
  floor: number;
  stratum: SpireStratumMeta;
  isBossFloor: boolean;
  isMajorBossFloor: boolean; // every 10th floor
  title: string;
  chapterBiome: number;
  recommendedPower: number;
  enemyScale: number;
  modifier: SpireModifierDef;
  firstClearCrystals: number;
  goldRange: [number, number];
  expPotions: number;
  starCores: number;
  astralAnvilCores: number;
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
  {
    chapter: 1,
    enemyId: 'aurelian_sentinel',
    name: 'Aurelius the Fallen Dawn',
    title: 'Spire Gatekeeper',
    asset: '/assets/enemies/boss_aurelian_sentinel.webp',
    faction: 'SOLARIS',
  },
  {
    chapter: 2,
    enemyId: 'astral_archon',
    name: 'Nyxion of the Shattered Lens',
    title: 'Astral Arbiter',
    asset: '/assets/enemies/boss_region_2.webp',
    faction: 'ASTRAL',
  },
  {
    chapter: 3,
    enemyId: 'elder_briar_warden',
    name: 'Sylvanor the Blighted Root',
    title: 'Canopy Sovereign',
    asset: '/assets/enemies/boss_region_3.webp',
    faction: 'VERDANT',
  },
  {
    chapter: 4,
    enemyId: 'molten_iron_colossus',
    name: 'Ignis Rex Caldera',
    title: 'Molten Tyrant',
    asset: '/assets/enemies/boss_region_4.webp',
    faction: 'ASHEN',
  },
  {
    chapter: 5,
    enemyId: 'cryo_sovereign',
    name: 'Cryos the Eternal Frost',
    title: 'Glacial Warden',
    asset: '/assets/enemies/boss_region_5.webp',
    faction: 'ASTRAL',
  },
  {
    chapter: 6,
    enemyId: 'abyssal_leviathan',
    name: 'Thalassa of the Trench',
    title: 'Abyssal Leviathan',
    asset: '/assets/enemies/boss_region_6.webp',
    faction: 'VERDANT',
  },
  {
    chapter: 7,
    enemyId: 'tempest_valkyrie',
    name: 'Zephyrus Storm-King',
    title: 'Tempest Sovereign',
    asset: '/assets/enemies/boss_region_7.webp',
    faction: 'SOLARIS',
  },
  {
    chapter: 8,
    enemyId: 'solar_pharaoh',
    name: 'Solarius Mirage',
    title: 'Sun-Scorched Pharaoh',
    asset: '/assets/enemies/boss_region_8.webp',
    faction: 'SOLARIS',
  },
  {
    chapter: 9,
    enemyId: 'rift_harbinger',
    name: 'Aetherion Rift-Weaver',
    title: 'Starfall Architect',
    asset: '/assets/enemies/boss_region_9.webp',
    faction: 'ASTRAL',
  },
  {
    chapter: 10,
    enemyId: 'void_archon',
    name: 'Erebus the Star-Eater',
    title: 'Apex of the Astral Spire',
    asset: '/assets/enemies/boss_region_10.webp',
    faction: 'ASHEN',
  },
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

export function getSpireStratumForFloor(floor: number): SpireStratumMeta {
  if (floor >= 81) return SPIRE_STRATA[2];
  if (floor >= 41) return SPIRE_STRATA[1];
  return SPIRE_STRATA[0];
}

export function getSpireFloorInfo(floorRaw: number): SpireFloorInfo {
  const floor = Math.max(1, Math.min(SPIRE_MAX_FLOOR, Math.round(floorRaw)));
  const stratum = getSpireStratumForFloor(floor);
  const isBossFloor = floor % 5 === 0;
  const isMajorBossFloor = floor % 10 === 0;
  const bossIdx =
    floor === SPIRE_MAX_FLOOR
      ? SPIRE_BOSS_ROTATION.length - 1
      : Math.floor((floor - 1) / 5) % SPIRE_BOSS_ROTATION.length;
  const chapterBiome = bossIdx + 1;
  const region = REGION_MAP[`region_${chapterBiome}`] ?? REGION_MAP.region_1;
  const bossEntry = SPIRE_BOSS_ROTATION[bossIdx];

  const modId: SpireModifierId = isBossFloor
    ? 'CELESTIAL_ASCENT'
    : NON_BOSS_MODIFIERS[(floor - 1) % NON_BOSS_MODIFIERS.length];

  // Calibrated 3-stratum progression:
  // F1..40 (Normal: ~10k → 92k), F41..80 (Hard: ~96k → 230k), F81..120 (Hell/Transcended: ~240k → 445k)
  let recommendedPower: number;
  let enemyScale: number;
  if (floor <= 40) {
    const t = (floor - 1) / 39;
    recommendedPower = Math.round(10000 + t * 82000);
    enemyScale = Number((0.92 + t * 15.8 + (isBossFloor ? 0.35 : 0)).toFixed(2));
  } else if (floor <= 80) {
    const t = (floor - 41) / 39;
    recommendedPower = Math.round(96000 + t * 134000);
    enemyScale = Number((17.8 + t * 34.2 + (isBossFloor ? 0.95 : 0)).toFixed(2));
  } else {
    const t = (floor - 81) / 39;
    recommendedPower = Math.round(240000 + t * 205000);
    enemyScale = Number((55.0 + t * 50.0 + (isBossFloor ? 1.8 : 0)).toFixed(2));
  }

  // Gems ONLY on every 5th / 10th Milestone Floor! Regular floors award Gold/EXP/Materials instead.
  let firstClearCrystals = 0;
  if (floor === SPIRE_MAX_FLOOR) {
    firstClearCrystals = 1200;
  } else if (isMajorBossFloor) {
    firstClearCrystals = floor >= 90 ? 650 : floor >= 50 ? 480 : 320;
  } else if (isBossFloor) {
    firstClearCrystals = floor >= 85 ? 300 : floor >= 45 ? 220 : 150;
  }

  const baseGold = Math.round(1200 + floor * 380 + (floor > 40 ? (floor - 40) * 260 : 0) + (floor > 80 ? (floor - 80) * 420 : 0));
  const expPotions = 3 + Math.floor(floor / 6) + (isBossFloor ? 2 : 0);
  const starCores = isMajorBossFloor
    ? 3 + Math.floor(floor / 15)
    : isBossFloor
      ? 2 + Math.floor(floor / 25)
      : floor % 2 === 0
        ? 1 + Math.floor(floor / 45)
        : 0;
  const astralAnvilCores =
    floor >= 40
      ? isMajorBossFloor
        ? 2 + Math.floor((floor - 40) / 25)
        : isBossFloor
          ? 1 + Math.floor((floor - 40) / 35)
          : floor % 4 === 0
            ? 1
            : 0
      : 0;

  const stratumPrefix =
    stratum.id === 'HELL' ? 'Abyssal ' : stratum.id === 'HARD' ? 'Crimson ' : '';

  return {
    floor,
    stratum,
    isBossFloor,
    isMajorBossFloor,
    title: isBossFloor
      ? `Floor ${floor} • ${stratumPrefix}${bossEntry.name}`
      : `Floor ${floor} • ${stratumPrefix}${region.name} Ascent`,
    chapterBiome,
    recommendedPower,
    enemyScale,
    modifier: SPIRE_MODIFIERS[modId],
    firstClearCrystals,
    goldRange: [baseGold, Math.round(baseGold * 1.25)],
    expPotions,
    starCores,
    astralAnvilCores,
    relicFragments: isMajorBossFloor
      ? 10 + Math.floor(floor / 8) * 2
      : isBossFloor
        ? 6 + Math.floor(floor / 10) * 2
        : 2 + Math.floor(floor / 16),
    forgeStones: 4 + Math.floor(floor / 3),
    bossName: isBossFloor ? `${stratumPrefix}${bossEntry.name}` : undefined,
    bossTitle: isBossFloor ? `${bossEntry.title} (${stratum.id})` : undefined,
    bossAsset: isBossFloor ? bossEntry.asset : undefined,
    bossEnemyId: isBossFloor ? bossEntry.enemyId : undefined,
    arenaAsset: region.arenaAsset,
    themeColor: stratum.id === 'NORMAL' ? region.themeColor : stratum.color,
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
            { enemyId: e1, count: f >= 65 ? 2 : 1 },
            { enemyId: m1, count: 3 },
            { enemyId: m2, count: 2 },
          ],
        },
        {
          label: `SPIRE GUARDIAN — ${info.bossName}`,
          spawns: [
            { enemyId: info.bossEnemyId ?? 'void_archon', count: 1 },
            { enemyId: m1, count: 2 },
            ...(f >= 20 ? [{ enemyId: m2, count: f >= 80 ? 2 : 1 }] : []),
          ],
        },
      ]
    : [
        {
          label: `Spire F${f} — Wave 1`,
          spawns: [
            { enemyId: m1, count: 3 + (f >= 45 ? 1 : 0) },
            { enemyId: m2, count: 2 + (f >= 85 ? 1 : 0) },
          ],
        },
        {
          label: `Spire F${f} — Elite Wardens`,
          spawns: [
            { enemyId: e1, count: info.modifier.id === 'TWIN_WARDENS' ? 2 : 1 },
            ...(f >= 16 ? [{ enemyId: e2, count: f >= 80 ? 2 : 1 }] : []),
            { enemyId: m2, count: 2 },
          ],
        },
      ];

  const rarityWeights: Record<EquipmentRarity, number> =
    f >= 85
      ? { COMMON: 0, RARE: 0, EPIC: 20, LEGENDARY: 80 }
      : f >= 55
        ? { COMMON: 0, RARE: 0, EPIC: 42, LEGENDARY: 58 }
        : f >= 30
          ? { COMMON: 0, RARE: 15, EPIC: 50, LEGENDARY: 35 }
          : f >= 15
            ? { COMMON: 0, RARE: 35, EPIC: 48, LEGENDARY: 17 }
            : { COMMON: 20, RARE: 55, EPIC: 22, LEGENDARY: 3 };

  return {
    id: encodeSpireStageId(f),
    regionId: `spire_sector_${info.chapterBiome}`,
    stageNumber: f,
    code: `SPIRE F${f}`,
    name: info.isBossFloor ? `${info.bossName} (F${f})` : `Astral Spire — Floor ${f}`,
    chapter: info.chapterBiome,
    subtitle: `${info.stratum.name} • ${info.modifier.name}`,
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
    arenaTintHex:
      info.stratum.id === 'HELL' ? 0xffc6d6 : info.stratum.id === 'HARD' ? 0xffdfc2 : 0xffffff,
    ambientMoteColors: info.ambientMoteColors,
    waves,
    firstClearCrystals: info.firstClearCrystals,
    repeatCrystals: 0,
    combatExpMultiplier: f >= 81 ? 1.6 : f >= 41 ? 1.4 : 1.25,
    rewards: {
      gold: info.goldRange,
      expPotions: [info.expPotions, info.expPotions + 2],
      forgeStones: [info.forgeStones, info.forgeStones + 3],
      starIronIngots: f >= 6 ? [1 + Math.floor(f / 14), 2 + Math.floor(f / 11)] : undefined,
      astralAnvilCores:
        info.astralAnvilCores > 0
          ? [info.astralAnvilCores, info.astralAnvilCores + (info.isMajorBossFloor ? 1 : 0)]
          : undefined,
      starCores: info.starCores > 0 ? [info.starCores, info.starCores] : undefined,
      relicFragments: [info.relicFragments, info.relicFragments + 2],
      bondGiftsRange: info.isMajorBossFloor ? [2, 3] : info.isBossFloor ? [1, 2] : [0, 1],
      primaryEssence: info.primaryFaction,
      primaryEssenceQty: [2 + Math.floor(f / 12), 4 + Math.floor(f / 10)],
      bonusRandomEssenceChance: 0.45,
      targetSetIds: ALL_SETS,
      equipmentDrops: info.isMajorBossFloor ? 3 : info.isBossFloor ? 2 : 1,
      rarityWeights,
    },
  };
}
