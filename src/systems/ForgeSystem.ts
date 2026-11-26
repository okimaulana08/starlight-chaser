import type { EquipmentInstance, EquipmentRarity, SubStatKey } from '../types/game';

export const MAX_ENHANCE_LEVEL = 15;

export interface EnhanceCost {
  gold: number;
  forgeStones: number;
  successRate: number; // 1.0 for +0..+9, slightly scaled or guaranteed for satisfying web loop
}

export function getEnhanceCost(item: EquipmentInstance): EnhanceCost {
  const rarityMult: Record<EquipmentRarity, number> = {
    COMMON: 0.7,
    RARE: 1.0,
    EPIC: 1.35,
    LEGENDARY: 1.75,
  };
  const lvl = item.enhanceLevel + 1;
  return {
    gold: Math.round(180 * lvl * rarityMult[item.rarity]),
    forgeStones: Math.max(1, Math.ceil(lvl * 0.65 * rarityMult[item.rarity])),
    successRate: 1.0,
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
  upgradedSubStat?: string;
} {
  if (item.enhanceLevel >= MAX_ENHANCE_LEVEL) {
    return { updated: item };
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
      subStats,
    },
    upgradedSubStat,
  };
}
