import type { EquipmentRarity, EquipmentSetId, Faction, MaterialKey, Tier } from '../types/game';

export interface MaterialMeta {
  key: MaterialKey;
  name: string;
  shortName: string;
  color: string;
  iconAsset: string;
  fallbackIcon: 'supply' | 'forge' | 'crystal' | 'gold' | 'relic' | 'summon';
  category: 'GROWTH' | 'AWAKEN' | 'FORGE' | 'RELIC';
  description: string;
  farmHint: string;
}

export const MATERIAL_META: Record<MaterialKey, MaterialMeta> = {
  expPotions: {
    key: 'expPotions',
    name: 'Starlight EXP Elixir',
    shortName: 'EXP Elixir',
    color: '#34d399',
    iconAsset: '/assets/icons/mat_exp_elixir.webp',
    fallbackIcon: 'supply',
    category: 'GROWTH',
    description: 'Concentrated celestial tonic used to raise Chaser levels.',
    farmHint: 'Drops in all Campaign Stages & Starlight Shop.',
  },
  bondGifts: {
    key: 'bondGifts',
    name: 'Celestial Keepsake',
    shortName: 'Bond Gift',
    color: '#fb7185',
    iconAsset: '/assets/icons/mat_bond_gift.webp',
    fallbackIcon: 'summon',
    category: 'GROWTH',
    description: 'Deepens Chaser Bond (+1.5% All Base Stats per level, max Lv.10).',
    farmHint: 'Drops from Stage Clears & Starlight Shop.',
  },
  forgeStones: {
    key: 'forgeStones',
    name: 'Forge Stone',
    shortName: 'Forge Stone',
    color: '#a78bfa',
    iconAsset: '/assets/icons/mat_forge_stone.webp',
    fallbackIcon: 'forge',
    category: 'FORGE',
    description: 'Tier 1 blacksmith catalyst required for Equipment Enhancement (+1 to +15).',
    farmHint: 'Drops in all Stages, Gear Salvage & Shop.',
  },
  starIronIngots: {
    key: 'starIronIngots',
    name: 'Star-Iron Ingot',
    shortName: 'Star-Iron',
    color: '#38bdf8',
    iconAsset: '/assets/icons/mat_star_iron.webp',
    fallbackIcon: 'forge',
    category: 'FORGE',
    description: 'Tier 2 meteorite steel forged for mid-tier Equipment Enhancement (+6 to +15).',
    farmHint: 'Drops in Ch.2+ Stages, Ch.1 Mini-Boss/Boss, Epic+ Salvage & Shop.',
  },
  astralAnvilCores: {
    key: 'astralAnvilCores',
    name: 'Astral Anvil Core',
    shortName: 'Anvil Core',
    color: '#f5c84c',
    iconAsset: '/assets/icons/mat_anvil_core.webp',
    fallbackIcon: 'forge',
    category: 'FORGE',
    description: 'Tier 3 masterwork forge core required for pinnacle Equipment (+11 to +15).',
    farmHint: 'Drops in Ch.4+ Stages, Region Bosses (X-12), Legendary Salvage & Shop.',
  },
  starCores: {
    key: 'starCores',
    name: 'Starlight Core',
    shortName: 'Star Core',
    color: '#e879f9',
    iconAsset: '/assets/icons/mat_star_core.webp',
    fallbackIcon: 'crystal',
    category: 'AWAKEN',
    description: 'Universal celestial nucleus required alongside Faction Essence to Awaken Chasers.',
    farmHint: 'Guaranteed from Mini-Boss (X-4, X-8) & Boss (X-12) Stages + Shop.',
  },
  relicFragments: {
    key: 'relicFragments',
    name: 'Relic Fragment',
    shortName: 'Relic Frag',
    color: '#22d3ee',
    iconAsset: '/assets/icons/icon_relic.webp',
    fallbackIcon: 'relic',
    category: 'RELIC',
    description: 'Shattered Pillar shards used to craft & refine Starlight Relics in the Relic Vault.',
    farmHint: 'Drops from Mini-Boss (1-3) & Region Boss (4-8) Stages.',
  },
  essence_SOLARIS: {
    key: 'essence_SOLARIS',
    name: 'Solaris Core',
    shortName: 'Solaris',
    color: '#f5c84c',
    iconAsset: '/assets/icons/essence_solaris.webp',
    fallbackIcon: 'gold',
    category: 'AWAKEN',
    description: 'Radiant solar essence used to Awaken Solaris Vanguard Chasers.',
    farmHint: 'Primary Drop: Ch.1 Aurelia, Ch.7 Zephyr, Ch.8 Solis & Shop.',
  },
  essence_ASTRAL: {
    key: 'essence_ASTRAL',
    name: 'Astral Prism',
    shortName: 'Astral',
    color: '#38e8ff',
    iconAsset: '/assets/icons/essence_astral.webp',
    fallbackIcon: 'crystal',
    category: 'AWAKEN',
    description: 'Refracted starlight crystal used to Awaken Astral Sanctum Chasers.',
    farmHint: 'Primary Drop: Ch.2 Lumina, Ch.5 Frostveil, Ch.9 Obsidian & Shop.',
  },
  essence_VERDANT: {
    key: 'essence_VERDANT',
    name: 'Verdant Dew',
    shortName: 'Verdant',
    color: '#34d399',
    iconAsset: '/assets/icons/essence_verdant.webp',
    fallbackIcon: 'supply',
    category: 'AWAKEN',
    description: 'Living World-Tree nectar used to Awaken Verdant Covenant Chasers.',
    farmHint: 'Primary Drop: Ch.3 Sylva Canopy, Ch.6 Sunken Pelagia & Shop.',
  },
  essence_ASHEN: {
    key: 'essence_ASHEN',
    name: 'Ashen Ember',
    shortName: 'Ashen',
    color: '#f97316',
    iconAsset: '/assets/icons/essence_ashen.webp',
    fallbackIcon: 'forge',
    category: 'AWAKEN',
    description: 'Volcanic forge ember used to Awaken Ashen Legion Chasers.',
    farmHint: 'Primary Drop: Ch.4 Ferrum Caldera, Ch.9 Obsidian, Ch.10 Zenith & Shop.',
  },
};

export function factionToEssenceKey(faction: Faction): MaterialKey {
  return `essence_${faction}` as MaterialKey;
}

/**
 * Hero Level Cap tied to Awakening Star (★0..★6):
 * ★0=20, ★1=30, ★2=40, ★3=50, ★4=60, ★5=70, ★6=80.
 */
export function getHeroLevelCap(awakening: number): number {
  return Math.min(80, 20 + Math.max(0, Math.min(6, awakening)) * 10);
}

/**
 * Balanced Leveling Cost curve scaling smoothly from Lv.1 to Lv.80.
 */
export function getLevelUpCost(
  currentLevel: number,
  levelsToAdd: number,
  awakening: number,
): {
  actualLevels: number;
  potions: number;
  gold: number;
  atAwakenCap: boolean;
  levelCap: number;
} {
  const levelCap = getHeroLevelCap(awakening);
  const actualLevels = Math.max(0, Math.min(levelsToAdd, levelCap - currentLevel));
  let potions = 0;
  let gold = 0;
  for (let i = 0; i < actualLevels; i++) {
    const lv = currentLevel + i;
    if (lv < 20) {
      potions += Math.max(1, Math.floor(lv / 10) + 1);
      gold += 140 + lv * 32;
    } else if (lv < 40) {
      potions += 2 + Math.floor((lv - 20) / 6);
      gold += 260 + lv * 50;
    } else if (lv < 60) {
      potions += 5 + Math.floor((lv - 40) / 5);
      gold += 420 + lv * 75;
    } else {
      potions += 9 + Math.floor((lv - 60) / 4);
      gold += 680 + lv * 105;
    }
  }
  return {
    actualLevels,
    potions,
    gold,
    atAwakenCap: currentLevel >= levelCap && levelCap < 80,
    levelCap,
  };
}

export interface AwakeningCost {
  nextStar: number;
  nextLevelCap: number;
  essences: number;
  starCores: number;
  gold: number;
  shardAltCost: number;
  shardAltGold: number;
  milestoneUnlock?: string;
}

const BASE_AWAKEN_TABLE = [
  { essences: 6, starCores: 2, gold: 2000, shards: 10, shardGold: 1000 },
  { essences: 12, starCores: 4, gold: 4500, shards: 15, shardGold: 2200 },
  { essences: 20, starCores: 7, gold: 8500, shards: 20, shardGold: 4000, milestone: '+10% Skill DMG' },
  { essences: 30, starCores: 11, gold: 14000, shards: 25, shardGold: 6500 },
  { essences: 44, starCores: 16, gold: 22000, shards: 30, shardGold: 10000 },
  { essences: 60, starCores: 24, gold: 35000, shards: 40, shardGold: 15000, milestone: '+15% Ultimate DMG' },
];

/**
 * Balanced Awakening cost supporting BOTH Biome Material farming AND Hero Shard dupe shortcut.
 */
export function getAwakeningCost(currentAwakening: number, tier: Tier): AwakeningCost | null {
  if (currentAwakening >= 6) return null;
  const row = BASE_AWAKEN_TABLE[currentAwakening];
  if (!row) return null;
  const tierMult = tier === 'SSR' ? 1.2 : tier === 'SR' ? 1.0 : 0.8;
  return {
    nextStar: currentAwakening + 1,
    nextLevelCap: getHeroLevelCap(currentAwakening + 1),
    essences: Math.max(4, Math.round(row.essences * tierMult)),
    starCores: Math.max(1, Math.round(row.starCores * tierMult)),
    gold: Math.round((row.gold * tierMult) / 100) * 100,
    shardAltCost: row.shards,
    shardAltGold: row.shardGold,
    milestoneUnlock: row.milestone,
  };
}

export interface ChapterBiomeDropConfig {
  primaryEssence: Faction;
  secondaryEssence: Faction;
  targetSetIds: EquipmentSetId[];
  miniBossFirstClearRelicId?: string;
  bossFirstClearRelicId?: string;
  bossRelicPool: string[];
  miniBossRelicPool: string[];
}

export const CHAPTER_BIOME_DROPS: Record<number, ChapterBiomeDropConfig> = {
  1: {
    primaryEssence: 'SOLARIS',
    secondaryEssence: 'ASTRAL',
    targetSetIds: ['VANGUARD', 'AEGIS_BASTION'],
    miniBossFirstClearRelicId: 'relic_dawnlight_lantern',
    bossFirstClearRelicId: 'relic_cinder_chain',
    bossRelicPool: ['relic_cinder_chain', 'relic_prism_aegis', 'relic_dawnlight_lantern'],
    miniBossRelicPool: ['relic_dawnlight_lantern'],
  },
  2: {
    primaryEssence: 'ASTRAL',
    secondaryEssence: 'SOLARIS',
    targetSetIds: ['ASTRAL_SURGE', 'CHRONO'],
    bossFirstClearRelicId: 'relic_astrolabe_lumina',
    bossRelicPool: ['relic_astrolabe_lumina', 'relic_prism_aegis'],
    miniBossRelicPool: ['relic_dawnlight_lantern', 'relic_prism_aegis'],
  },
  3: {
    primaryEssence: 'VERDANT',
    secondaryEssence: 'ASTRAL',
    targetSetIds: ['VERDANT_GRACE', 'AEGIS_BASTION'],
    bossFirstClearRelicId: 'relic_world_tree_tear',
    bossRelicPool: ['relic_world_tree_tear', 'relic_falling_star_bow'],
    miniBossRelicPool: ['relic_world_tree_tear', 'relic_dawnlight_lantern'],
  },
  4: {
    primaryEssence: 'ASHEN',
    secondaryEssence: 'SOLARIS',
    targetSetIds: ['ASHEN_FURY', 'VANGUARD'],
    bossFirstClearRelicId: 'relic_obsidian_forge',
    bossRelicPool: ['relic_obsidian_forge', 'relic_cinder_chain'],
    miniBossRelicPool: ['relic_cinder_chain', 'relic_prism_aegis'],
  },
  5: {
    primaryEssence: 'ASTRAL',
    secondaryEssence: 'VERDANT',
    targetSetIds: ['CHRONO', 'ASTRAL_SURGE'],
    bossRelicPool: ['relic_astrolabe_lumina', 'relic_prism_aegis'],
    miniBossRelicPool: ['relic_prism_aegis', 'relic_world_tree_tear'],
  },
  6: {
    primaryEssence: 'VERDANT',
    secondaryEssence: 'ASTRAL',
    targetSetIds: ['VERDANT_GRACE', 'AEGIS_BASTION'],
    bossFirstClearRelicId: 'relic_prism_aegis',
    bossRelicPool: ['relic_prism_aegis', 'relic_world_tree_tear', 'relic_obsidian_forge'],
    miniBossRelicPool: ['relic_world_tree_tear', 'relic_prism_aegis'],
  },
  7: {
    primaryEssence: 'SOLARIS',
    secondaryEssence: 'VERDANT',
    targetSetIds: ['VANGUARD', 'CHRONO'],
    bossFirstClearRelicId: 'relic_falling_star_bow',
    bossRelicPool: ['relic_falling_star_bow', 'relic_first_eclipse'],
    miniBossRelicPool: ['relic_cinder_chain', 'relic_world_tree_tear'],
  },
  8: {
    primaryEssence: 'SOLARIS',
    secondaryEssence: 'ASHEN',
    targetSetIds: ['ASHEN_FURY', 'VANGUARD'],
    bossFirstClearRelicId: 'relic_first_eclipse',
    bossRelicPool: ['relic_first_eclipse', 'relic_obsidian_forge'],
    miniBossRelicPool: ['relic_cinder_chain', 'relic_prism_aegis'],
  },
  9: {
    primaryEssence: 'ASHEN',
    secondaryEssence: 'ASTRAL',
    targetSetIds: ['VANGUARD', 'CHRONO', 'ASHEN_FURY', 'AEGIS_BASTION', 'ASTRAL_SURGE', 'VERDANT_GRACE'],
    bossRelicPool: [
      'relic_first_eclipse',
      'relic_astrolabe_lumina',
      'relic_obsidian_forge',
      'relic_falling_star_bow',
    ],
    miniBossRelicPool: ['relic_world_tree_tear', 'relic_cinder_chain', 'relic_prism_aegis'],
  },
  10: {
    primaryEssence: 'SOLARIS',
    secondaryEssence: 'ASHEN',
    targetSetIds: ['VANGUARD', 'CHRONO', 'ASHEN_FURY', 'AEGIS_BASTION', 'ASTRAL_SURGE', 'VERDANT_GRACE'],
    bossRelicPool: [
      'relic_first_eclipse',
      'relic_astrolabe_lumina',
      'relic_obsidian_forge',
      'relic_falling_star_bow',
    ],
    miniBossRelicPool: [
      'relic_first_eclipse',
      'relic_astrolabe_lumina',
      'relic_world_tree_tear',
      'relic_cinder_chain',
    ],
  },
};

export type ShopCategory = 'GROWTH' | 'AWAKEN' | 'FORGE' | 'RELIC';
export type ShopCurrency = 'GOLD' | 'STAR_DUST' | 'RELIC_FRAGMENTS' | 'CRYSTALS';

export interface ShopOffer {
  id: string;
  category: ShopCategory;
  name: string;
  subtitle: string;
  currency: ShopCurrency;
  price: number;
  dailyLimit: number; // 0 = unlimited
  badge?: string;
  accentColor: string;
  reward:
    | { kind: 'MATERIAL'; material: MaterialKey; amount: number }
    | { kind: 'OMNI_ESSENCE'; amountEach: number }
    | { kind: 'GEAR_CRATE'; minRarity: EquipmentRarity }
    | { kind: 'RELIC'; relicId: string };
}

export const SHOP_OFFERS: ShopOffer[] = [
  // GROWTH TAB
  {
    id: 'shop_exp_small',
    category: 'GROWTH',
    name: 'EXP Elixir Pack ×5',
    subtitle: 'Quick leveling tonic bundle for rising Chasers',
    currency: 'GOLD',
    price: 1200,
    dailyLimit: 6,
    accentColor: '#34d399',
    reward: { kind: 'MATERIAL', material: 'expPotions', amount: 5 },
  },
  {
    id: 'shop_exp_crate',
    category: 'GROWTH',
    name: 'EXP Elixir Crate ×20',
    subtitle: 'Best-value Gold leveling supply (12% savings)',
    currency: 'GOLD',
    price: 4200,
    dailyLimit: 3,
    badge: 'POPULAR',
    accentColor: '#10b981',
    reward: { kind: 'MATERIAL', material: 'expPotions', amount: 20 },
  },
  {
    id: 'shop_exp_chest',
    category: 'GROWTH',
    name: 'Grand EXP Vault ×50',
    subtitle: 'High-volume training stock for Lv.40+ squads',
    currency: 'GOLD',
    price: 9600,
    dailyLimit: 2,
    badge: 'SAVE 20%',
    accentColor: '#22d3ee',
    reward: { kind: 'MATERIAL', material: 'expPotions', amount: 50 },
  },
  {
    id: 'shop_bond_bundle',
    category: 'GROWTH',
    name: 'Celestial Keepsakes ×3',
    subtitle: 'Raise Chaser Bond (+1.5% All Base Stats per level)',
    currency: 'GOLD',
    price: 1800,
    dailyLimit: 4,
    accentColor: '#fb7185',
    reward: { kind: 'MATERIAL', material: 'bondGifts', amount: 3 },
  },

  // AWAKEN TAB
  {
    id: 'shop_essence_solaris',
    category: 'AWAKEN',
    name: 'Solaris Core ×5',
    subtitle: 'Awakening material for Solaris Vanguard Chasers',
    currency: 'GOLD',
    price: 2000,
    dailyLimit: 4,
    accentColor: '#f5c84c',
    reward: { kind: 'MATERIAL', material: 'essence_SOLARIS', amount: 5 },
  },
  {
    id: 'shop_essence_astral',
    category: 'AWAKEN',
    name: 'Astral Prism ×5',
    subtitle: 'Awakening material for Astral Sanctum Chasers',
    currency: 'GOLD',
    price: 2000,
    dailyLimit: 4,
    accentColor: '#38e8ff',
    reward: { kind: 'MATERIAL', material: 'essence_ASTRAL', amount: 5 },
  },
  {
    id: 'shop_essence_verdant',
    category: 'AWAKEN',
    name: 'Verdant Dew ×5',
    subtitle: 'Awakening material for Verdant Covenant Chasers',
    currency: 'GOLD',
    price: 2000,
    dailyLimit: 4,
    accentColor: '#34d399',
    reward: { kind: 'MATERIAL', material: 'essence_VERDANT', amount: 5 },
  },
  {
    id: 'shop_essence_ashen',
    category: 'AWAKEN',
    name: 'Ashen Ember ×5',
    subtitle: 'Awakening material for Ashen Legion Chasers',
    currency: 'GOLD',
    price: 2000,
    dailyLimit: 4,
    accentColor: '#f97316',
    reward: { kind: 'MATERIAL', material: 'essence_ASHEN', amount: 5 },
  },
  {
    id: 'shop_star_core_gold',
    category: 'AWAKEN',
    name: 'Starlight Core ×3',
    subtitle: 'Universal Awakening nucleus (normally Boss/Elite drops)',
    currency: 'GOLD',
    price: 3600,
    dailyLimit: 3,
    badge: 'ESSENTIAL',
    accentColor: '#e879f9',
    reward: { kind: 'MATERIAL', material: 'starCores', amount: 3 },
  },
  {
    id: 'shop_star_core_dust',
    category: 'AWAKEN',
    name: 'Starlight Core Pack ×6',
    subtitle: 'Exchange surplus Gacha Star Dust for Awakening Cores',
    currency: 'STAR_DUST',
    price: 25,
    dailyLimit: 4,
    accentColor: '#d946ef',
    reward: { kind: 'MATERIAL', material: 'starCores', amount: 6 },
  },
  {
    id: 'shop_omni_essence_dust',
    category: 'AWAKEN',
    name: 'Omni-Faction Essence Chest',
    subtitle: 'Grants +4 of EVERY Faction Essence (16 total)',
    currency: 'STAR_DUST',
    price: 30,
    dailyLimit: 3,
    badge: 'ALL FACTIONS',
    accentColor: '#f5c84c',
    reward: { kind: 'OMNI_ESSENCE', amountEach: 4 },
  },

  // FORGE TAB
  {
    id: 'shop_forge_stones_10',
    category: 'FORGE',
    name: 'Forge Stones ×10',
    subtitle: 'Tier 1 enhancement stones for +1 to +15 forging',
    currency: 'GOLD',
    price: 1800,
    dailyLimit: 6,
    accentColor: '#a78bfa',
    reward: { kind: 'MATERIAL', material: 'forgeStones', amount: 10 },
  },
  {
    id: 'shop_forge_stones_30',
    category: 'FORGE',
    name: 'Blacksmith Stone Crate ×30',
    subtitle: 'Bulk Tier 1 forge supply at discounted Gold rate',
    currency: 'GOLD',
    price: 4800,
    dailyLimit: 3,
    accentColor: '#8b5cf6',
    reward: { kind: 'MATERIAL', material: 'forgeStones', amount: 30 },
  },
  {
    id: 'shop_star_iron_5',
    category: 'FORGE',
    name: 'Star-Iron Ingots ×5',
    subtitle: 'Tier 2 steel required to forge equipment from +6 to +15',
    currency: 'GOLD',
    price: 3400,
    dailyLimit: 4,
    badge: 'TIER 2',
    accentColor: '#38bdf8',
    reward: { kind: 'MATERIAL', material: 'starIronIngots', amount: 5 },
  },
  {
    id: 'shop_anvil_core_2',
    category: 'FORGE',
    name: 'Astral Anvil Core ×2',
    subtitle: 'Tier 3 core required for pinnacle +11 to +15 enhancement',
    currency: 'GOLD',
    price: 6800,
    dailyLimit: 2,
    badge: 'TIER 3',
    accentColor: '#f5c84c',
    reward: { kind: 'MATERIAL', material: 'astralAnvilCores', amount: 2 },
  },
  {
    id: 'shop_epic_gear_crate',
    category: 'FORGE',
    name: 'Forgemaster Epic Crate',
    subtitle: 'Forges 1 random Equipment piece (Epic 75% / Legendary 25%)',
    currency: 'GOLD',
    price: 7500,
    dailyLimit: 2,
    badge: 'EPIC+',
    accentColor: '#c084fc',
    reward: { kind: 'GEAR_CRATE', minRarity: 'EPIC' },
  },
  {
    id: 'shop_legendary_gear_crate',
    category: 'FORGE',
    name: 'Celestial Legendary Crate',
    subtitle: 'Guarantees 1 Legendary Equipment piece with 3 substats',
    currency: 'STAR_DUST',
    price: 55,
    dailyLimit: 2,
    badge: 'GUARANTEED',
    accentColor: '#f5c84c',
    reward: { kind: 'GEAR_CRATE', minRarity: 'LEGENDARY' },
  },

  // RELIC VAULT TAB (Deterministic Crafting & Refinement via Boss-Dropped Relic Fragments!)
  {
    id: 'shop_relic_frags_dust',
    category: 'RELIC',
    name: 'Relic Fragments ×10',
    subtitle: 'Convert Star Dust into Pillar Relic Fragments for crafting',
    currency: 'STAR_DUST',
    price: 35,
    dailyLimit: 4,
    accentColor: '#22d3ee',
    reward: { kind: 'MATERIAL', material: 'relicFragments', amount: 10 },
  },
  {
    id: 'vault_relic_dawnlight_lantern',
    category: 'RELIC',
    name: 'Lantern of Dawnlight',
    subtitle: 'R Healer Relic — Craft new or Refine Rank (+15% stats)',
    currency: 'RELIC_FRAGMENTS',
    price: 15,
    dailyLimit: 0,
    badge: 'R RELIC',
    accentColor: '#38bdf8',
    reward: { kind: 'RELIC', relicId: 'relic_dawnlight_lantern' },
  },
  {
    id: 'vault_relic_cinder_chain',
    category: 'RELIC',
    name: 'Chain of the Cinder Warden',
    subtitle: 'SR Assault Relic — Craft new or Refine Rank (+15% stats)',
    currency: 'RELIC_FRAGMENTS',
    price: 35,
    dailyLimit: 0,
    badge: 'SR RELIC',
    accentColor: '#c084fc',
    reward: { kind: 'RELIC', relicId: 'relic_cinder_chain' },
  },
  {
    id: 'vault_relic_world_tree_tear',
    category: 'RELIC',
    name: 'Tear of the World Tree',
    subtitle: 'SR Healer Relic — Craft new or Refine Rank (+15% stats)',
    currency: 'RELIC_FRAGMENTS',
    price: 35,
    dailyLimit: 0,
    badge: 'SR RELIC',
    accentColor: '#34d399',
    reward: { kind: 'RELIC', relicId: 'relic_world_tree_tear' },
  },
  {
    id: 'vault_relic_prism_aegis',
    category: 'RELIC',
    name: 'Prism Aegis Core',
    subtitle: 'SR Tank Relic — Craft new or Refine Rank (+15% stats)',
    currency: 'RELIC_FRAGMENTS',
    price: 35,
    dailyLimit: 0,
    badge: 'SR RELIC',
    accentColor: '#38e8ff',
    reward: { kind: 'RELIC', relicId: 'relic_prism_aegis' },
  },
  {
    id: 'vault_relic_first_eclipse',
    category: 'RELIC',
    name: 'Blade of the First Eclipse',
    subtitle: 'SSR Assault Relic — Craft new or Refine Rank (+15% stats)',
    currency: 'RELIC_FRAGMENTS',
    price: 70,
    dailyLimit: 0,
    badge: 'SSR RELIC',
    accentColor: '#f5c84c',
    reward: { kind: 'RELIC', relicId: 'relic_first_eclipse' },
  },
  {
    id: 'vault_relic_astrolabe_lumina',
    category: 'RELIC',
    name: 'Astrolabe of Lumina',
    subtitle: 'SSR Mage Relic — Craft new or Refine Rank (+15% stats)',
    currency: 'RELIC_FRAGMENTS',
    price: 70,
    dailyLimit: 0,
    badge: 'SSR RELIC',
    accentColor: '#38e8ff',
    reward: { kind: 'RELIC', relicId: 'relic_astrolabe_lumina' },
  },
  {
    id: 'vault_relic_obsidian_forge',
    category: 'RELIC',
    name: 'Heart of the Obsidian Forge',
    subtitle: 'SSR Tank Relic — Craft new or Refine Rank (+15% stats)',
    currency: 'RELIC_FRAGMENTS',
    price: 70,
    dailyLimit: 0,
    badge: 'SSR RELIC',
    accentColor: '#f97316',
    reward: { kind: 'RELIC', relicId: 'relic_obsidian_forge' },
  },
  {
    id: 'vault_relic_falling_star_bow',
    category: 'RELIC',
    name: 'Bowstring of the Falling Star',
    subtitle: 'SSR Ranger Relic — Craft new or Refine Rank (+15% stats)',
    currency: 'RELIC_FRAGMENTS',
    price: 70,
    dailyLimit: 0,
    badge: 'SSR RELIC',
    accentColor: '#34d399',
    reward: { kind: 'RELIC', relicId: 'relic_falling_star_bow' },
  },
];

export interface RegionChestRewardDef {
  regionId: string;
  chapter: number;
  title: string;
  crystals: number;
  gold: number;
  expPotions: number;
  forgeStones: number;
  starIronIngots: number;
  astralAnvilCores: number;
  starCores: number;
  relicFragments: number;
  essenceFaction: Faction;
  essenceQty: number;
  gearRarity: EquipmentRarity;
  gearSetId: EquipmentSetId;
}

/**
 * Grand Region Completion Reward Chests unlocked once all 12/12 stages of a Region are cleared!
 */
export const REGION_CHEST_REWARDS: Record<string, RegionChestRewardDef> = Object.fromEntries(
  Array.from({ length: 10 }, (_, idx) => {
    const ch = idx + 1;
    const regionId = `region_${ch}`;
    const biome = CHAPTER_BIOME_DROPS[ch] ?? CHAPTER_BIOME_DROPS[1];
    const reward: RegionChestRewardDef = {
      regionId,
      chapter: ch,
      title: `Chapter ${ch} Conqueror Chest`,
      crystals: 800 + (ch - 1) * 100,
      gold: 6000 + (ch - 1) * 3500,
      expPotions: 12 + (ch - 1) * 5,
      forgeStones: 12 + (ch - 1) * 4,
      starIronIngots: 4 + (ch - 1) * 3,
      astralAnvilCores: ch >= 3 ? Math.min(10, ch - 1) : 1,
      starCores: 4 + Math.floor(ch * 0.9),
      relicFragments: 12 + (ch - 1) * 3,
      essenceFaction: biome.primaryEssence,
      essenceQty: 12 + (ch - 1) * 3,
      gearRarity: ch >= 3 ? 'LEGENDARY' : 'EPIC',
      gearSetId: biome.targetSetIds[0] ?? 'VANGUARD',
    };
    return [regionId, reward];
  }),
);
