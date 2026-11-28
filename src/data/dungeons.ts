import type {
  DungeonDef,
  DungeonId,
  DungeonTierDef,
  EquipmentRarity,
  EquipmentSetId,
  Faction,
  StageDef,
  StageWave,
} from '../types/game';
import { STAGE_MAP, getCampaignStageById } from './stages';
import { buildSpireStageDef, parseSpireStageId } from './spire';

export const DAILY_DUNGEON_FREE_ENTRIES = 3;

const SHARED_TIERS: DungeonTierDef[] = [
  {
    tier: 1,
    roman: 'I',
    title: 'Novice Rift',
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
    unlockStageId: 'stage_2_12',
    unlockLabel: 'Clear Ch.2 Boss (2-12)',
    recommendedPower: 26500,
    enemyScale: 3.85,
    chapterEquivalent: 2,
  },
  {
    tier: 3,
    roman: 'III',
    title: 'Astral Rift',
    unlockStageId: 'stage_4_12',
    unlockLabel: 'Clear Ch.4 Boss (4-12)',
    recommendedPower: 48500,
    enemyScale: 7.5,
    chapterEquivalent: 4,
  },
  {
    tier: 4,
    roman: 'IV',
    title: 'Sovereign Rift',
    unlockStageId: 'stage_6_12',
    unlockLabel: 'Clear Ch.6 Boss (6-12)',
    recommendedPower: 71500,
    enemyScale: 12.25,
    chapterEquivalent: 6,
  },
  {
    tier: 5,
    roman: 'V',
    title: 'Zenith Rift',
    unlockStageId: 'stage_8_12',
    unlockLabel: 'Clear Ch.8 Boss (8-12)',
    recommendedPower: 95000,
    enemyScale: 17.65,
    chapterEquivalent: 8,
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
      'Break through Solaris treasury automata guarding Aetheria’s golden vaults to secure massive Gold payouts for Leveling, Awakening, Forging & Shop Restocks.',
    primaryRewardLabel: 'Gold & Forge Stones',
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
      'High-intensity astral training spire yielding concentrated EXP Elixirs, Bond Keepsakes, and +50% bonus Hero Combat EXP for every deployed Chaser.',
    primaryRewardLabel: 'EXP Elixirs • Bond Gifts • 1.5× Hero EXP',
    tiers: SHARED_TIERS,
  },
  {
    id: 'AWAKEN_SANCTUM',
    name: 'Sanctum of Pillars',
    subtitle: 'Targeted Faction Essence & Starlight Core Trial',
    badge: 'AWAKENING',
    accentColor: '#e879f9',
    artBanner: '/assets/ui/card_dungeon_awaken.webp',
    fallbackBanner: '/assets/environments/env_region_10.webp',
    arenaAsset: '/assets/environments/env_region_10.webp',
    arenaTintHex: 0xe9c4ff,
    ambientMoteColors: [0xe879f9, 0x38e8ff],
    description:
      'Attune the Shattered Pillar to ANY of the 4 Factions before deploying—guaranteed Faction Essences and Starlight Cores with zero day-of-week lockout!',
    supportsFactionSelect: true,
    primaryRewardLabel: 'Chosen Faction Essence & Starlight Cores',
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
      'Choose your exact target Equipment Set and raid Ferrum’s volcanic smelters for Forge Stones, Star-Iron Ingots, Astral Anvil Cores, and high-rarity Set Gear.',
    supportsSetSelect: true,
    primaryRewardLabel: 'Target-Set Gear • Stones • Star-Iron • Anvil',
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
      'Skip trash waves and confront an Abyssal Guardian directly! Interrupt Void Shockwaves and shatter Phase 2 Shields for Relic Fragments and direct SR/SSR Relic drops.',
    primaryRewardLabel: 'Relic Fragments & Direct SR/SSR Relic Drops',
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
  tier: 1 | 2 | 3 | 4 | 5,
  opts?: { faction?: Faction; setId?: EquipmentSetId },
): string {
  const fac = opts?.faction ?? 'SOLARIS';
  const setId = opts?.setId ?? 'VANGUARD';
  return `dungeon__${dungeonId}__${tier}__${fac}__${setId}`;
}

export function parseDungeonStageId(stageId: string): {
  dungeonId: DungeonId;
  tier: 1 | 2 | 3 | 4 | 5;
  faction: Faction;
  setId: EquipmentSetId;
} | null {
  if (!stageId.startsWith('dungeon__')) return null;
  const parts = stageId.split('__');
  const dungeonId = parts[1] as DungeonId;
  const tierNum = Number(parts[2]) as 1 | 2 | 3 | 4 | 5;
  if (!DUNGEON_MAP[dungeonId] || tierNum < 1 || tierNum > 5) return null;
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
    bossId: 'cryo_sovereign',
    bossName: 'Glacial Sovereign Echo',
    bossTitle: 'Tier III Relic Guardian',
    bossAsset: '/assets/enemies/boss_region_5.webp',
    relicPool: ['relic_world_tree_tear', 'relic_prism_aegis', 'relic_obsidian_forge', 'relic_astrolabe_lumina'],
  },
  {
    bossId: 'tempest_valkyrie',
    bossName: 'Stormwing Valkyrie Echo',
    bossTitle: 'Tier IV Relic Guardian',
    bossAsset: '/assets/enemies/boss_region_7.webp',
    relicPool: ['relic_falling_star_bow', 'relic_obsidian_forge', 'relic_first_eclipse', 'relic_astrolabe_lumina'],
  },
  {
    bossId: 'rift_harbinger',
    bossName: 'Abyssal Harbinger Prime',
    bossTitle: 'Tier V Relic Sovereign',
    bossAsset: '/assets/enemies/boss_region_9.webp',
    relicPool: ['relic_first_eclipse', 'relic_astrolabe_lumina', 'relic_obsidian_forge', 'relic_falling_star_bow'],
  },
];

function buildDungeonWaves(dungeonId: DungeonId, tier: number, faction: Faction): StageWave[] {
  const extra = Math.min(2, Math.floor((tier - 1) / 2));

  if (dungeonId === 'GOLD_VAULT') {
    return [
      {
        label: 'Wave 1 — Gilded Vault Patrol',
        spawns: [
          { enemyId: 'solar_construct', count: 4 + extra },
          { enemyId: 'rift_acolyte', count: 2 },
        ],
      },
      {
        label: 'Wave 2 — Treasury Wardens',
        spawns: [
          { enemyId: 'armored_golem', count: tier >= 3 ? 2 : 1 },
          { enemyId: 'solar_construct', count: 3 },
          { enemyId: 'void_wisp', count: 2 },
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
          { enemyId: 'rift_acolyte', count: 2 },
        ],
      },
      {
        label: 'Wave 2 — Crucible Master',
        spawns: [
          { enemyId: 'astral_weaver', count: tier >= 4 ? 2 : 1 },
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
          { enemyId: eliteByFaction[faction], count: 1 },
        ],
      },
      {
        label: `TRIAL BOSS — ${bossInfo.bossName}`,
        spawns: [
          { enemyId: bossInfo.bossId, count: 1 },
          { enemyId: mobByFaction[faction], count: 2 },
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
          { enemyId: 'obsidian_knight', count: tier >= 3 ? 2 : 1 },
          { enemyId: 'armored_golem', count: 1 },
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
        { enemyId: 'void_stalker', count: 2 },
        ...(tier >= 3 ? [{ enemyId: 'rift_acolyte', count: 1 }] : []),
      ],
    },
  ];
}

export function buildDungeonStageDef(
  dungeonId: DungeonId,
  tier: 1 | 2 | 3 | 4 | 5,
  opts?: { faction?: Faction; setId?: EquipmentSetId },
): StageDef {
  const def = DUNGEON_MAP[dungeonId];
  const tierDef = def.tiers[tier - 1] ?? def.tiers[0];
  const faction = opts?.faction ?? 'SOLARIS';
  const setId = opts?.setId ?? 'VANGUARD';
  const t = tier; // 1..5
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
    ];
    const stoneTiers: Array<[number, number]> = [[1, 2], [2, 3], [3, 5], [4, 6], [6, 8]];
    gold = goldTiers[t - 1];
    forgeStones = stoneTiers[t - 1];
  } else if (dungeonId === 'EXP_CRUCIBLE') {
    const expTiers: Array<[number, number]> = [[5, 7], [9, 12], [14, 18], [20, 25], [27, 33]];
    const bondTiers: Array<[number, number]> = [[1, 1], [1, 2], [2, 2], [2, 3], [3, 3]];
    const goldTiers: Array<[number, number]> = [[400, 550], [800, 1100], [1400, 1850], [2200, 2800], [3200, 4000]];
    expPotions = expTiers[t - 1];
    bondGiftsRange = bondTiers[t - 1];
    gold = goldTiers[t - 1];
    combatExpMultiplier = 1.5;
  } else if (dungeonId === 'AWAKEN_SANCTUM') {
    const fInfo = FACTION_ARENA_INFO[faction];
    arenaAsset = fInfo.arena;
    bossNameOverride = fInfo.bossName;
    bossTitleOverride = fInfo.bossTitle;
    bossAssetOverride = fInfo.bossAsset;
    isBossStage = true;
    const essTiers: Array<[number, number]> = [[4, 6], [6, 9], [9, 12], [12, 16], [16, 21]];
    const coreTiers: Array<[number, number]> = [[1, 2], [2, 3], [3, 4], [4, 6], [6, 8]];
    const goldTiers: Array<[number, number]> = [[500, 700], [1000, 1300], [1700, 2200], [2600, 3400], [3800, 4800]];
    primaryEssenceQty = essTiers[t - 1];
    starCores = coreTiers[t - 1];
    gold = goldTiers[t - 1];
  } else if (dungeonId === 'FORGE_FOUNDRY') {
    const stoneTiers: Array<[number, number]> = [[6, 9], [11, 15], [16, 21], [22, 28], [28, 36]];
    const ironTiers: Array<[number, number]> = [[1, 2], [3, 5], [5, 8], [8, 11], [11, 15]];
    const anvilTiers: Array<[number, number] | undefined> = [undefined, undefined, [1, 2], [2, 4], [4, 6]];
    const goldTiers: Array<[number, number]> = [[550, 750], [1100, 1450], [1900, 2400], [2900, 3600], [4200, 5200]];
    const rarityTiers: Array<Record<EquipmentRarity, number>> = [
      { COMMON: 0, RARE: 68, EPIC: 30, LEGENDARY: 2 },
      { COMMON: 0, RARE: 42, EPIC: 48, LEGENDARY: 10 },
      { COMMON: 0, RARE: 18, EPIC: 56, LEGENDARY: 26 },
      { COMMON: 0, RARE: 6, EPIC: 50, LEGENDARY: 44 },
      { COMMON: 0, RARE: 0, EPIC: 36, LEGENDARY: 64 },
    ];
    forgeStones = stoneTiers[t - 1];
    starIronIngots = ironTiers[t - 1];
    astralAnvilCores = anvilTiers[t - 1];
    gold = goldTiers[t - 1];
    equipmentDrops = t >= 4 ? 3 : 2;
    rarityWeights = rarityTiers[t - 1];
  } else if (dungeonId === 'RELIC_ABYSS') {
    const bossTier = RELIC_BOSS_BY_TIER[t - 1] ?? RELIC_BOSS_BY_TIER[0];
    bossNameOverride = bossTier.bossName;
    bossTitleOverride = bossTier.bossTitle;
    bossAssetOverride = bossTier.bossAsset;
    isBossStage = true;
    const fragTiers: Array<[number, number]> = [[4, 6], [7, 10], [10, 14], [14, 18], [18, 24]];
    const coreTiers: Array<[number, number]> = [[1, 2], [2, 3], [3, 4], [4, 5], [5, 7]];
    const chanceTiers = [0.14, 0.2, 0.26, 0.33, 0.42];
    const goldTiers: Array<[number, number]> = [[650, 850], [1300, 1700], [2200, 2800], [3400, 4200], [4800, 6000]];
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
    subtitle: def.subtitle,
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
 * Resolves ANY battle stageId — Campaign Stage (`stage_1_1`..`stage_10_12`),
 * Rift Farming Dungeon (`dungeon__GOLD_VAULT__1__...`), or Astral Spire Floor (`spire__1`..`spire__50`).
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
