import type { EquipmentInstance, EquipmentRarity, SubStatKey } from '../types/game';

export const MAX_ENHANCE_LEVEL = 15;

export interface EnhanceCost {
  gold: number;
  forgeStones: number;
  starIronIngots: number;
  astralAnvilCores: number;
  baseSuccessRate: number;
  effectiveSuccessRate: number;
}

export interface SalvageYield {
  gold: number;
  forgeStones: number;
  starIronIngots: number;
  astralAnvilCores: number;
}

/**
 * Balanced 3-Tier Blacksmith Enhancement Cost:
 * - +1..+5: Gold + Forge Stones (100% guaranteed)
 * - +6..+10: + Star-Iron Ingots (100% up to +9, 85% at +10)
 * - +11..+15: + Astral Anvil Cores (85% at +11..+12, 70% at +13..+15)
 * Failed attempts NEVER downgrade or break gear; they grant +15% cumulative Blessing Pity!
 */
export function getEnhanceCost(item: EquipmentInstance): EnhanceCost {
  const rarityMult: Record<EquipmentRarity, number> = {
    COMMON: 0.7,
    RARE: 1.0,
    EPIC: 1.35,
    LEGENDARY: 1.75,
  };
  const nextLvl = item.enhanceLevel + 1;
  const rm = rarityMult[item.rarity];

  const gold = Math.round((165 * nextLvl + nextLvl * nextLvl * 22) * rm);
  const forgeStones = Math.max(1, Math.ceil((0.8 + nextLvl * 0.6) * rm));
  const starIronIngots =
    nextLvl >= 6 ? Math.max(1, Math.ceil((nextLvl - 5) * 0.5 * rm)) : 0;
  const astralAnvilCores =
    nextLvl >= 11 ? Math.max(1, Math.ceil((nextLvl - 10) * 0.45 * rm)) : 0;

  const baseSuccessRate = nextLvl <= 9 ? 1.0 : nextLvl <= 12 ? 0.85 : 0.7;
  const pityBonus = item.forgePity ?? 0;
  const effectiveSuccessRate = Math.min(1.0, Number((baseSuccessRate + pityBonus).toFixed(2)));

  return {
    gold,
    forgeStones,
    starIronIngots,
    astralAnvilCores,
    baseSuccessRate,
    effectiveSuccessRate,
  };
}

export function getSalvageYield(item: EquipmentInstance): SalvageYield {
  const baseStones =
    item.rarity === 'LEGENDARY'
      ? 7
      : item.rarity === 'EPIC'
        ? 4
        : item.rarity === 'RARE'
          ? 2
          : 1;
  const starIronIngots =
    item.rarity === 'LEGENDARY'
      ? 2 + Math.floor(item.enhanceLevel / 4)
      : item.rarity === 'EPIC'
        ? 1 + Math.floor(item.enhanceLevel / 6)
        : item.enhanceLevel >= 6
          ? 1
          : 0;
  const astralAnvilCores =
    item.rarity === 'LEGENDARY' && item.enhanceLevel >= 6
      ? 1 + Math.floor((item.enhanceLevel - 6) / 5)
      : item.rarity === 'LEGENDARY'
        ? 1
        : 0;

  return {
    gold: 160 * (item.enhanceLevel + 1) * (item.rarity === 'LEGENDARY' ? 2 : 1),
    forgeStones: baseStones + Math.floor(item.enhanceLevel * 0.55),
    starIronIngots,
    astralAnvilCores,
  };
}

const ALL_SUBSTATS: SubStatKey[] = [
  'ATK_PCT',
  'HP_PCT',
  'DEF_PCT',
  'CRIT_RATE',
  'CRIT_DMG',
  'ATK_SPD',
  'CDR',
  'HEAL_PCT',
];

export function enhanceEquipmentItem(item: EquipmentInstance): {
  updated: EquipmentInstance;
  succeeded: boolean;
  upgradedSubStat?: string;
} {
  if (item.enhanceLevel >= MAX_ENHANCE_LEVEL) {
    return { updated: item, succeeded: false };
  }

  const cost = getEnhanceCost(item);
  const succeeded = cost.effectiveSuccessRate >= 1.0 || Math.random() < cost.effectiveSuccessRate;

  if (!succeeded) {
    const nextPity = Math.min(1.0, Number(((item.forgePity ?? 0) + 0.15).toFixed(2)));
    return {
      updated: {
        ...item,
        forgePity: nextPity,
      },
      succeeded: false,
    };
  }

  const nextLevel = item.enhanceLevel + 1;
  const subStats = item.subStats.map((s) => ({ ...s }));
  let upgradedSubStat: string | undefined;

  // Every 3 levels (+3, +6, +9, +12, +15), upgrade an existing substat or unlock up to 3
  if (nextLevel % 3 === 0) {
    const maxSubs = item.rarity === 'LEGENDARY' ? 3 : item.rarity === 'EPIC' ? 3 : 2;
    if (subStats.length < maxSubs) {
      const available = ALL_SUBSTATS.filter((k) => !subStats.some((s) => s.stat === k));
      const pick = available[Math.floor(Math.random() * available.length)] ?? 'ATK_PCT';
      const val = pick === 'CRIT_DMG' ? 0.065 : 0.035;
      subStats.push({ stat: pick, value: val });
      upgradedSubStat = `Unlocked ${pick}`;
    } else if (subStats.length > 0) {
      const target = subStats[Math.floor(Math.random() * subStats.length)];
      const bump = target.stat === 'CRIT_DMG' ? 0.045 : 0.022;
      target.value = Math.round((target.value + bump) * 1000) / 1000;
      upgradedSubStat = `Boosted ${target.stat}`;
    }
  }

  return {
    updated: {
      ...item,
      enhanceLevel: nextLevel,
      forgePity: 0,
      subStats,
    },
    succeeded: true,
    upgradedSubStat,
  };
}
