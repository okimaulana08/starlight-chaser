import type {
  DungeonDef,
  DungeonId,
  DungeonTierDef,
  DungeonTierNumber,
  EquipmentRarity,
  EquipmentSetId,
  Faction,
  StageDef,
  StageWave,
} from '../types/game';
import { STAGE_MAP, getCampaignStageById } from './stages';
import { buildSpireStageDef, parseSpireStageId } from './spire';

export const DAILY_DUNGEON_FREE_ENTRIES = 3;
export const MAX_DUNGEON_TIER: DungeonTierNumber = 10;

/**
 * 10-Tier Rift Dungeon Progression calibrated across ALL 3 Campaign World Levels:
 * - T1–T5 (WL 1 Normal): Early → Late Normal Campaign (Ch.1–Ch.8)
 * - T6–T8 (WL 2 Hard):   Normal 10-12 → Hard Ch.4 → Hard Ch.8
 * - T9–T10 (WL 3 Hell):  Hard 10-12 → Hell Ch.5 Sovereign Endgame
 */
const SHARED_TIERS: DungeonTierDef[] = [
  {
    tier: 1,
    roman: 'I',
    title: 'Novice Rift',
    worldDifficultyTag: 'NORMAL',
    unlockStageId: '',
    unlockLabel: 'Unlocked',
    recommendedPower: 11500,
    enemyScale: 1.75,
    chapterEquivalent: 1,
  },
  {
    tier: 2,
    roman: 'II',
    title: 'Vanguard Rift',
    worldDifficultyTag: 'NORMAL',
    unlockStageId: 'stage_2_12',
    unlockLabel: 'Clear Normal Ch.2 Boss (2-12)',
    recommendedPower: 26500,
    enemyScale: 3.85,
    chapterEquivalent: 2,
  },
  {
    tier: 3,
    roman: 'III',
    title: 'Astral Rift',
    worldDifficultyTag: 'NORMAL',
    unlockStageId: 'stage_4_12',
    unlockLabel: 'Clear Normal Ch.4 Boss (4-12)',
    recommendedPower: 48500,
    enemyScale: 7.5,
    chapterEquivalent: 4,
  },
  {
    tier: 4,
    roman: 'IV',
    title: 'Sovereign Rift',
    worldDifficultyTag: 'NORMAL',
    unlockStageId: 'stage_6_12',
    unlockLabel: 'Clear Normal Ch.6 Boss (6-12)',
    recommendedPower: 71500,
    enemyScale: 12.25,
    chapterEquivalent: 6,
  },
  {
    tier: 5,
    roman: 'V',
    title: 'Zenith Rift',
    worldDifficultyTag: 'NORMAL',
    unlockStageId: 'stage_8_12',
    unlockLabel: 'Clear Normal Ch.8 Boss (8-12)',
    recommendedPower: 95000,
    enemyScale: 17.65,
    chapterEquivalent: 8,
  },
  {
    tier: 6,
    roman: 'VI',
    title: 'Crimson Rift',
    worldDifficultyTag: 'HARD',
    unlockStageId: 'stage_10_12',
    unlockLabel: 'Clear Normal Ch.10 Boss (10-12 • Unlocks Hard)',
    recommendedPower: 128000,
    enemyScale: 24.5,
    chapterEquivalent: 9,
  },
  {
    tier: 7,
    roman: 'VII',
    title: 'Eclipse Rift',
    worldDifficultyTag: 'HARD',
    unlockStageId: 'hard__stage_4_12',
    unlockLabel: 'Clear Hard Ch.4 Boss (H 4-12)',
    recommendedPower: 168000,
    enemyScale: 34.0,
    chapterEquivalent: 9,
  },
  {
    tier: 8,
    roman: 'VIII',
    title: 'Cataclysm Rift',
    worldDifficultyTag: 'HARD',
    unlockStageId: 'hard__stage_8_12',
    unlockLabel: 'Clear Hard Ch.8 Boss (H 8-12)',
    recommendedPower: 215000,
    enemyScale: 46.5,
    chapterEquivalent: 10,
  },
  {
    tier: 9,
    roman: 'IX',
    title: 'Abyssal Rift',
    worldDifficultyTag: 'HELL',
    unlockStageId: 'hard__stage_10_12',
    unlockLabel: 'Clear Hard Ch.10 Boss (H 10-12 • Unlocks Hell)',
    recommendedPower: 278000,
    enemyScale: 63.0,
    chapterEquivalent: 10,
  },
  {
    tier: 10,
    roman: 'X',
    title: 'Empyrean Rift',
    worldDifficultyTag: 'HELL',
    unlockStageId: 'hell__stage_5_12',
    unlockLabel: 'Clear Hell Ch.5 Boss (X 5-12)',
    recommendedPower: 365000,
    enemyScale: 86.0,
    chapterEquivalent: 10,
  },
];

export const DUNGEONS: DungeonDef[] = [
  {
    id: 'GOLD_VAULT',
    name: 'Vault of Aurelia',
    subtitle: 'Imperial Treasury & Gold Bounty Trial',
    badge: 'GOLD FARM',
    accentColor: '#f5c84c',
    artBanner: '/assets/ui/card_dungeon_gold.webp',
    fallbackBanner: '/assets/environments/env_aurelia_floor.webp',
    arenaAsset: '/assets/environments/env_aurelia_floor.webp',
    arenaTintHex: 0xffe8a3,
    ambientMoteColors: [0xfde047, 0xf59e0b],
    description:
      'Break through Solaris treasury automata guarding Aetheria’s golden vaults to secure massive Gold payouts for Leveling, Awakening, Constellation, Forging & Shop Restocks.',
    primaryRewardLabel: 'Gold & Forge Stones (T1–T10)',
    tiers: SHARED_TIERS,
  },
  {
    id: 'EXP_CRUCIBLE',
    name: 'Astral Crucible',
    subtitle: 'Elixir Spire & Accelerated Squad Training',
    badge: 'EXP + BOND',
    accentColor: '#34d399',
    artBanner: '/assets/ui/card_dungeon_exp.webp',
    fallbackBanner: '/assets/environments/env_region_2.webp',
    arenaAsset: '/assets/environments/env_region_2.webp',
    arenaTintHex: 0xbef8dc,
    ambientMoteColors: [0x34d399, 0x38e8ff],
    description:
      'High-intensity astral training spire yielding concentrated EXP Elixirs, Bond Keepsakes, and up to +100% bonus Hero Combat EXP for Lv.1–100 progression.',
    primaryRewardLabel: 'EXP Elixirs • Bond Gifts • Up to 2× Hero EXP',
    tiers: SHARED_TIERS,
  },
  {
    id: 'AWAKEN_SANCTUM',
    name: 'Sanctum of Pillars',
    subtitle: 'Targeted Faction Essence, Star Cores & Transcend Mats',
    badge: 'AWAKEN / TRANSCEND',
    accentColor: '#e879f9',
    artBanner: '/assets/ui/card_dungeon_awaken.webp',
    fallbackBanner: '/assets/environments/env_region_10.webp',
    arenaAsset: '/assets/environments/env_region_10.webp',
    arenaTintHex: 0xe9c4ff,
    ambientMoteColors: [0xe879f9, 0x38e8ff],
    description:
      'Attune the Shattered Pillar to ANY of the 4 Factions before deploying—guaranteed Faction Essences, Starlight Cores, and bonus Astral Anvil Cores on Hard/Hell tiers (T7–T10)!',
    supportsFactionSelect: true,
    primaryRewardLabel: 'Chosen Essence • Star Cores • Anvil Cores (T7+)',
    tiers: SHARED_TIERS,
  },
  {
    id: 'FORGE_FOUNDRY',
    name: 'Ferrum Foundry',
    subtitle: 'Target-Set Equipment & Masterwork Ingots',
    badge: 'FORGE & GEAR',
    accentColor: '#f97316',
    artBanner: '/assets/ui/card_dungeon_forge.webp',
    fallbackBanner: '/assets/environments/env_region_4.webp',
    arenaAsset: '/assets/environments/env_region_4.webp',
    arenaTintHex: 0xffc6a8,
    ambientMoteColors: [0xf97316, 0xfde047],
    description:
      'Choose your exact target Equipment Set and raid Ferrum’s volcanic smelters for Forge Stones, Star-Iron Ingots, Astral Anvil Cores, and up to 100% Guaranteed Legendary Multi-Drops on TX!',
    supportsSetSelect: true,
    primaryRewardLabel: 'Target-Set Legendary Gear • Stones • Ingots • Anvils',
    tiers: SHARED_TIERS,
  },
  {
    id: 'RELIC_ABYSS',
    name: 'Relic Abyss',
    subtitle: 'Direct Boss Rush — Relics & Pillar Fragments',
    badge: 'BOSS RUSH',
    accentColor: '#38e8ff',
    artBanner: '/assets/ui/card_dungeon_relic.webp',
    fallbackBanner: '/assets/environments/env_region_9.webp',
    arenaAsset: '/assets/environments/env_region_9.webp',
    arenaTintHex: 0xb7d5ff,
    ambientMoteColors: [0x38e8ff, 0xc084fc],
    description:
      'Skip trash waves and confront 10 escalating Abyssal Guardians directly! Shatter Boss Shields for Relic Fragments, Star Cores, and up to 80% direct SSR Relic drops on TX.',
    primaryRewardLabel: 'Relic Fragments & Up to 80% SSR Relic Drops',
    tiers: SHARED_TIERS,
  },
];

export const DUNGEON_MAP: Record<DungeonId, DungeonDef> = Object.fromEntries(
  DUNGEONS.map((d) => [d.id, d]),
) as Record<DungeonId, DungeonDef>;

export function isDungeonTierUnlocked(tierDef: DungeonTierDef, clearedStages: string[]): boolean {
  if (!tierDef.unlockStageId) return true;
  return clearedStages.includes(tierDef.unlockStageId);
}

export function getDungeonTierStarKey(dungeonId: DungeonId, tier: number): string {
  return `${dungeonId}_T${tier}`;
}

export function encodeDungeonStageId(
  dungeonId: DungeonId,
  tier: DungeonTierNumber,
  opts?: { faction?: Faction; setId?: EquipmentSetId },
): string {
  const fac = opts?.faction ?? 'SOLARIS';
  const setId = opts?.setId ?? 'VANGUARD';
  return `dungeon__${dungeonId}__${tier}__${fac}__${setId}`;
}

export function parseDungeonStageId(stageId: string): {
  dungeonId: DungeonId;
  tier: DungeonTierNumber;
  faction: Faction;
  setId: EquipmentSetId;
} | null {
  if (!stageId.startsWith('dungeon__')) return null;
  const parts = stageId.split('__');
  const dungeonId = parts[1] as DungeonId;
  const tierNum = Number(parts[2]) as DungeonTierNumber;
  if (!DUNGEON_MAP[dungeonId] || !Number.isInteger(tierNum) || tierNum < 1 || tierNum > 10) {
    return null;
  }
  const faction = (parts[3] as Faction) || 'SOLARIS';
  const setId = (parts[4] as EquipmentSetId) || 'VANGUARD';
  return { dungeonId, tier: tierNum, faction, setId };
}

const FACTION_ARENA_INFO: Record<
  Faction,
  { arena: string; bossId: string; bossName: string; bossTitle: string; bossAsset: string }
> = {
  SOLARIS: {
    arena: '/assets/environments/env_aurelia_floor.webp',
    bossId: 'aurelian_sentinel',
    bossName: 'Solaris Pillar Avatar',
    bossTitle: 'Radiant Awakening Warden',
    bossAsset: '/assets/enemies/boss_aurelian_sentinel.webp',
  },
  ASTRAL: {
    arena: '/assets/environments/env_region_2.webp',
    bossId: 'astral_archon',
    bossName: 'Astral Pillar Avatar',
    bossTitle: 'Prismatic Awakening Warden',
    bossAsset: '/assets/enemies/boss_region_2.webp',
  },
  VERDANT: {
    arena: '/assets/environments/env_region_3.webp',
    bossId: 'elder_briar_warden',
    bossName: 'Verdant Pillar Avatar',
    bossTitle: 'World-Tree Awakening Warden',
    bossAsset: '/assets/enemies/boss_region_3.webp',
  },
  ASHEN: {
    arena: '/assets/environments/env_region_4.webp',
    bossId: 'molten_iron_colossus',
    bossName: 'Ashen Pillar Avatar',
    bossTitle: 'Volcanic Awakening Warden',
    bossAsset: '/assets/enemies/boss_region_4.webp',
  },
};

const ALL_SSR_RELICS = [
  'relic_first_eclipse',
  'relic_astrolabe_lumina',
  'relic_obsidian_forge',
  'relic_falling_star_bow',
];

const RELIC_BOSS_BY_TIER: Array<{
  bossId: string;
  bossName: string;
  bossTitle: string;
  bossAsset: string;
  relicPool: string[];
}> = [
  {
    bossId: 'aurelian_sentinel',
    bossName: 'Vault-Keeper Sentinel',
    bossTitle: 'Tier I Relic Guardian',
    bossAsset: '/assets/enemies/boss_aurelian_sentinel.webp',
    relicPool: ['relic_dawnlight_lantern', 'relic_cinder_chain', 'relic_prism_aegis'],
  },
  {
    bossId: 'astral_archon',
    bossName: 'Lumina Rift Archon',
    bossTitle: 'Tier II Relic Guardian',
    bossAsset: '/assets/enemies/boss_region_2.webp',
    relicPool: ['relic_cinder_chain', 'relic_world_tree_tear', 'relic_prism_aegis', 'relic_astrolabe_lumina'],
  },
  {
    bossId: 'elder_briar_warden',
    bossName: 'Sylva Root Sovereign',
    bossTitle: 'Tier III Relic Guardian',
    bossAsset: '/assets/enemies/boss_region_3.webp',
    relicPool: ['relic_world_tree_tear', 'relic_prism_aegis', 'relic_obsidian_forge', 'relic_astrolabe_lumina'],
  },
  {
    bossId: 'molten_iron_colossus',
    bossName: 'Caldera Forge Colossus',
    bossTitle: 'Tier IV Relic Guardian',
    bossAsset: '/assets/enemies/boss_region_4.webp',
    relicPool: ['relic_falling_star_bow', 'relic_obsidian_forge', 'relic_first_eclipse', 'relic_astrolabe_lumina'],
  },
  {
    bossId: 'cryo_sovereign',
    bossName: 'Glacial Sovereign Echo',
    bossTitle: 'Tier V Relic Guardian',
    bossAsset: '/assets/enemies/boss_region_5.webp',
    relicPool: ALL_SSR_RELICS,
  },
  {
    bossId: 'abyssal_leviathan',
    bossName: 'Pelagia Trench Leviathan',
    bossTitle: 'Tier VI Hard Relic Guardian',
    bossAsset: '/assets/enemies/boss_region_6.webp',
    relicPool: ALL_SSR_RELICS,
  },
  {
    bossId: 'tempest_valkyrie',
    bossName: 'Stormwing Valkyrie Prime',
    bossTitle: 'Tier VII Hard Relic Sovereign',
    bossAsset: '/assets/enemies/boss_region_7.webp',
    relicPool: ALL_SSR_RELICS,
  },
  {
    bossId: 'solar_pharaoh',
    bossName: 'Solis Eclipse Monarch',
    bossTitle: 'Tier VIII Cataclysm Sovereign',
    bossAsset: '/assets/enemies/boss_region_8.webp',
    relicPool: ALL_SSR_RELICS,
  },
  {
    bossId: 'rift_harbinger',
    bossName: 'Abyssal Harbinger Apex',
    bossTitle: 'Tier IX Hell Relic Sovereign',
    bossAsset: '/assets/enemies/boss_region_9.webp',
    relicPool: ALL_SSR_RELICS,
  },
  {
    bossId: 'void_archon',
    bossName: 'Zenith Star-Eater Prime',
    bossTitle: 'Tier X Empyrean Sovereign',
    bossAsset: '/assets/enemies/boss_region_10.webp',
    relicPool: ALL_SSR_RELICS,
  },
];

function buildDungeonWaves(dungeonId: DungeonId, tier: number, faction: Faction): StageWave[] {
  const extra = Math.min(3, Math.floor((tier - 1) / 3));

  if (dungeonId === 'GOLD_VAULT') {
    return [
      {
        label: 'Wave 1 — Gilded Vault Patrol',
        spawns: [
          { enemyId: 'solar_construct', count: 4 + extra },
          { enemyId: 'rift_acolyte', count: tier >= 6 ? 3 : 2 },
        ],
      },
      {
        label: 'Wave 2 — Treasury Wardens',
        spawns: [
          { enemyId: 'armored_golem', count: tier >= 7 ? 3 : tier >= 3 ? 2 : 1 },
          { enemyId: 'solar_construct', count: 3 },
          { enemyId: 'void_wisp', count: tier >= 6 ? 3 : 2 },
        ],
      },
    ];
  }

  if (dungeonId === 'EXP_CRUCIBLE') {
    return [
      {
        label: 'Wave 1 — Astral Vanguard Simulation',
        spawns: [
          { enemyId: 'void_wisp', count: 3 + extra },
          { enemyId: 'void_stalker', count: 3 },
          { enemyId: 'rift_acolyte', count: tier >= 6 ? 3 : 2 },
        ],
      },
      {
        label: 'Wave 2 — Crucible Master',
        spawns: [
          { enemyId: 'astral_weaver', count: tier >= 8 ? 3 : tier >= 4 ? 2 : 1 },
          { enemyId: 'frost_lancer', count: 2 + extra },
          { enemyId: 'rift_acolyte', count: 2 },
        ],
      },
    ];
  }

  if (dungeonId === 'AWAKEN_SANCTUM') {
    const eliteByFaction: Record<Faction, string> = {
      SOLARIS: 'armored_golem',
      ASTRAL: 'astral_weaver',
      VERDANT: 'briar_behemoth',
      ASHEN: 'obsidian_knight',
    };
    const mobByFaction: Record<Faction, string> = {
      SOLARIS: 'solar_construct',
      ASTRAL: 'void_wisp',
      VERDANT: 'briar_crawler',
      ASHEN: 'cinder_imp',
    };
    const bossInfo = FACTION_ARENA_INFO[faction];
    return [
      {
        label: `Wave 1 — ${faction} Sanctum Guards`,
        spawns: [
          { enemyId: mobByFaction[faction], count: 4 + extra },
          { enemyId: eliteByFaction[faction], count: tier >= 7 ? 2 : 1 },
        ],
      },
      {
        label: `TRIAL BOSS — ${bossInfo.bossName}`,
        spawns: [
          { enemyId: bossInfo.bossId, count: 1 },
          { enemyId: mobByFaction[faction], count: tier >= 6 ? 3 : 2 },
        ],
      },
    ];
  }

  if (dungeonId === 'FORGE_FOUNDRY') {
    return [
      {
        label: 'Wave 1 — Molten Smelter Line',
        spawns: [
          { enemyId: 'solar_construct', count: 3 },
          { enemyId: 'cinder_imp', count: 3 + extra },
        ],
      },
      {
        label: 'Wave 2 — Foundry Juggernauts',
        spawns: [
          { enemyId: 'obsidian_knight', count: tier >= 7 ? 3 : tier >= 3 ? 2 : 1 },
          { enemyId: 'armored_golem', count: tier >= 6 ? 2 : 1 },
          { enemyId: 'cinder_imp', count: 2 },
        ],
      },
    ];
  }

  // RELIC_ABYSS: Direct 1-Wave Boss Rush!
  const bossTier = RELIC_BOSS_BY_TIER[tier - 1] ?? RELIC_BOSS_BY_TIER[0];
  return [
    {
      label: `BOSS RUSH — ${bossTier.bossName}`,
      spawns: [
        { enemyId: bossTier.bossId, count: 1 },
        { enemyId: 'void_stalker', count: tier >= 8 ? 3 : 2 },
        ...(tier >= 3 ? [{ enemyId: 'rift_acolyte', count: tier >= 7 ? 2 : 1 }] : []),
      ],
    },
  ];
}

export function buildDungeonStageDef(
  dungeonId: DungeonId,
  tier: DungeonTierNumber,
  opts?: { faction?: Faction; setId?: EquipmentSetId },
): StageDef {
  const def = DUNGEON_MAP[dungeonId];
  const tierDef = def.tiers[tier - 1] ?? def.tiers[0];
  const faction = opts?.faction ?? 'SOLARIS';
  const setId = opts?.setId ?? 'VANGUARD';
  const t = tier; // 1..10
  const stageId = encodeDungeonStageId(dungeonId, tier, { faction, setId });

  const zeroWeights: Record<EquipmentRarity, number> = { COMMON: 0, RARE: 100, EPIC: 0, LEGENDARY: 0 };

  let arenaAsset = def.arenaAsset;
  let bossNameOverride: string | undefined;
  let bossTitleOverride: string | undefined;
  let bossAssetOverride: string | undefined;
  let isBossStage = false;
  let combatExpMultiplier = 1.0;

  let gold: [number, number] = [400, 600];
  let expPotions: [number, number] = [0, 0];
  let forgeStones: [number, number] = [0, 0];
  let starIronIngots: [number, number] | undefined;
  let astralAnvilCores: [number, number] | undefined;
  let starCores: [number, number] | undefined;
  let relicFragments: [number, number] | undefined;
  let bondGiftsRange: [number, number] | undefined;
  let primaryEssenceQty: [number, number] = [0, 0];
  let equipmentDrops = 0;
  let rarityWeights = zeroWeights;
  let relicDropPool: string[] | undefined;
  let relicDropChance = 0;

  if (dungeonId === 'GOLD_VAULT') {
    const goldTiers: Array<[number, number]> = [
      [2200, 2800],
      [4800, 6000],
      [9200, 11500],
      [15500, 19000],
      [23000, 28000],
      [34000, 42000],
      [49000, 60000],
      [68000, 82000],
      [92000, 112000],
      [122000, 148000],
    ];
    const stoneTiers: Array<[number, number]> = [
      [1, 2],
      [2, 3],
      [3, 5],
      [4, 6],
      [6, 8],
      [8, 10],
      [10, 13],
      [12, 16],
      [15, 19],
      [18, 24],
    ];
    gold = goldTiers[t - 1];
    forgeStones = stoneTiers[t - 1];
  } else if (dungeonId === 'EXP_CRUCIBLE') {
    const expTiers: Array<[number, number]> = [
      [5, 7],
      [9, 12],
      [14, 18],
      [20, 25],
      [27, 33],
      [35, 43],
      [44, 54],
      [54, 66],
      [65, 79],
      [78, 95],
    ];
    const bondTiers: Array<[number, number]> = [
      [1, 1],
      [1, 2],
      [2, 2],
      [2, 3],
      [3, 3],
      [3, 4],
      [4, 5],
      [4, 5],
      [5, 6],
      [6, 7],
    ];
    const goldTiers: Array<[number, number]> = [
      [400, 550],
      [800, 1100],
      [1400, 1850],
      [2200, 2800],
      [3200, 4000],
      [4600, 5800],
      [6400, 8000],
      [8800, 11000],
      [12000, 15000],
      [16000, 20000],
    ];
    expPotions = expTiers[t - 1];
    bondGiftsRange = bondTiers[t - 1];
    gold = goldTiers[t - 1];
    combatExpMultiplier = t >= 9 ? 2.0 : t >= 6 ? 1.75 : 1.5;
  } else if (dungeonId === 'AWAKEN_SANCTUM') {
    const fInfo = FACTION_ARENA_INFO[faction];
    arenaAsset = fInfo.arena;
    bossNameOverride = fInfo.bossName;
    bossTitleOverride = fInfo.bossTitle;
    bossAssetOverride = fInfo.bossAsset;
    isBossStage = true;
    const essTiers: Array<[number, number]> = [
      [4, 6],
      [6, 9],
      [9, 12],
      [12, 16],
      [16, 21],
      [21, 27],
      [26, 33],
      [32, 40],
      [38, 48],
      [46, 58],
    ];
    const coreTiers: Array<[number, number]> = [
      [1, 2],
      [2, 3],
      [3, 4],
      [4, 6],
      [6, 8],
      [8, 10],
      [10, 13],
      [12, 16],
      [15, 20],
      [18, 24],
    ];
    const anvilBonusTiers: Array<[number, number] | undefined> = [
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      [1, 1],
      [1, 2],
      [2, 3],
      [2, 4],
    ];
    const goldTiers: Array<[number, number]> = [
      [500, 700],
      [1000, 1300],
      [1700, 2200],
      [2600, 3400],
      [3800, 4800],
      [5400, 6800],
      [7500, 9500],
      [10200, 12800],
      [14000, 17500],
      [18500, 23000],
    ];
    primaryEssenceQty = essTiers[t - 1];
    starCores = coreTiers[t - 1];
    astralAnvilCores = anvilBonusTiers[t - 1];
    gold = goldTiers[t - 1];
  } else if (dungeonId === 'FORGE_FOUNDRY') {
    const stoneTiers: Array<[number, number]> = [
      [6, 9],
      [11, 15],
      [16, 21],
      [22, 28],
      [28, 36],
      [36, 46],
      [45, 56],
      [54, 68],
      [64, 80],
      [76, 95],
    ];
    const ironTiers: Array<[number, number]> = [
      [1, 2],
      [3, 5],
      [5, 8],
      [8, 11],
      [11, 15],
      [15, 20],
      [19, 25],
      [23, 30],
      [28, 36],
      [34, 44],
    ];
    const anvilTiers: Array<[number, number] | undefined> = [
      undefined,
      undefined,
      [1, 2],
      [2, 4],
      [4, 6],
      [6, 8],
      [8, 11],
      [10, 14],
      [13, 17],
      [16, 22],
    ];
    const goldTiers: Array<[number, number]> = [
      [550, 750],
      [1100, 1450],
      [1900, 2400],
      [2900, 3600],
      [4200, 5200],
      [6000, 7500],
      [8400, 10500],
      [11500, 14200],
      [15500, 19000],
      [20500, 25500],
    ];
    const rarityTiers: Array<Record<EquipmentRarity, number>> = [
      { COMMON: 0, RARE: 68, EPIC: 30, LEGENDARY: 2 },
      { COMMON: 0, RARE: 42, EPIC: 48, LEGENDARY: 10 },
      { COMMON: 0, RARE: 18, EPIC: 56, LEGENDARY: 26 },
      { COMMON: 0, RARE: 6, EPIC: 50, LEGENDARY: 44 },
      { COMMON: 0, RARE: 0, EPIC: 36, LEGENDARY: 64 },
      { COMMON: 0, RARE: 0, EPIC: 26, LEGENDARY: 74 },
      { COMMON: 0, RARE: 0, EPIC: 18, LEGENDARY: 82 },
      { COMMON: 0, RARE: 0, EPIC: 10, LEGENDARY: 90 },
      { COMMON: 0, RARE: 0, EPIC: 4, LEGENDARY: 96 },
      { COMMON: 0, RARE: 0, EPIC: 0, LEGENDARY: 100 },
    ];
    forgeStones = stoneTiers[t - 1];
    starIronIngots = ironTiers[t - 1];
    astralAnvilCores = anvilTiers[t - 1];
    gold = goldTiers[t - 1];
    equipmentDrops = t >= 9 ? 4 : t >= 4 ? 3 : 2;
    rarityWeights = rarityTiers[t - 1];
  } else if (dungeonId === 'RELIC_ABYSS') {
    const bossTier = RELIC_BOSS_BY_TIER[t - 1] ?? RELIC_BOSS_BY_TIER[0];
    bossNameOverride = bossTier.bossName;
    bossTitleOverride = bossTier.bossTitle;
    bossAssetOverride = bossTier.bossAsset;
    isBossStage = true;
    const fragTiers: Array<[number, number]> = [
      [4, 6],
      [7, 10],
      [10, 14],
      [14, 18],
      [18, 24],
      [24, 30],
      [30, 38],
      [36, 46],
      [44, 55],
      [54, 68],
    ];
    const coreTiers: Array<[number, number]> = [
      [1, 2],
      [2, 3],
      [3, 4],
      [4, 5],
      [5, 7],
      [7, 9],
      [9, 11],
      [11, 14],
      [13, 17],
      [16, 21],
    ];
    const chanceTiers = [0.14, 0.2, 0.26, 0.33, 0.42, 0.5, 0.58, 0.66, 0.74, 0.82];
    const goldTiers: Array<[number, number]> = [
      [650, 850],
      [1300, 1700],
      [2200, 2800],
      [3400, 4200],
      [4800, 6000],
      [6800, 8500],
      [9600, 12000],
      [13200, 16500],
      [17800, 22000],
      [23500, 29000],
    ];
    relicFragments = fragTiers[t - 1];
    starCores = coreTiers[t - 1];
    relicDropPool = bossTier.relicPool;
    relicDropChance = chanceTiers[t - 1];
    gold = goldTiers[t - 1];
  }

  return {
    id: stageId,
    regionId: `dungeon_${dungeonId}`,
    stageNumber: t,
    code: `RIFT T${tierDef.roman}`,
    name: `${def.name} — Tier ${tierDef.roman}`,
    chapter: tierDef.chapterEquivalent,
    subtitle: `${tierDef.title} • ${def.subtitle}`,
    recommendedPower: tierDef.recommendedPower,
    description: def.description,
    enemyScale: tierDef.enemyScale,
    isMiniBoss: !isBossStage,
    isBossStage,
    isDungeon: true,
    dungeonId,
    dungeonTier: t,
    combatExpMultiplier,
    bossNameOverride,
    bossTitleOverride,
    bossAssetOverride,
    arenaAsset,
    arenaTintHex: def.arenaTintHex,
    ambientMoteColors: def.ambientMoteColors,
    waves: buildDungeonWaves(dungeonId, t, faction),
    firstClearCrystals: 0,
    repeatCrystals: 0,
    rewards: {
      gold,
      expPotions,
      forgeStones,
      starIronIngots,
      astralAnvilCores,
      starCores,
      relicFragments,
      bondGiftsRange,
      primaryEssence: faction,
      primaryEssenceQty,
      bonusRandomEssenceChance: 0,
      relicDropPool,
      relicDropChance,
      targetSetIds: [setId],
      equipmentDrops,
      rarityWeights,
    },
  };
}

/**
 * Resolves ANY battle stageId — Campaign Stage (`stage_1_1`..`hell__stage_10_12`),
 * Rift Farming Dungeon (`dungeon__GOLD_VAULT__1..10__...`), or Astral Spire Floor (`spire__1`..`spire__120`).
 */
export function resolveAnyStageDef(stageId: string): StageDef {
  const spireFloor = parseSpireStageId(stageId);
  if (spireFloor !== null) {
    return buildSpireStageDef(spireFloor);
  }
  const parsed = parseDungeonStageId(stageId);
  if (parsed) {
    return buildDungeonStageDef(parsed.dungeonId, parsed.tier, {
      faction: parsed.faction,
      setId: parsed.setId,
    });
  }
  return getCampaignStageById(stageId) ?? STAGE_MAP.stage_1_1;
}
