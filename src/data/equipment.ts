import type {
  EquipmentInstance,
  EquipmentRarity,
  EquipmentSetDef,
  EquipmentSetId,
  EquipmentSlot,
  EquipmentSubStat,
  SubStatKey,
} from '../types/game';

export const EQUIPMENT_SETS: Record<EquipmentSetId, EquipmentSetDef> = {
  VANGUARD: {
    id: 'VANGUARD',
    name: 'Vanguard Set',
    idealFor: 'Assault & Bruiser',
    color: '#f5c84c',
    bonus2Desc: '+12% ATK',
    bonus4Desc: '+20% DMG vs Stunned, Gathered, or Broken enemies',
  },
  CHRONO: {
    id: 'CHRONO',
    name: 'Chrono Set',
    idealFor: 'Utility & Skill Spammer',
    color: '#38bdf8',
    bonus2Desc: '+10% Cooldown Reduction',
    bonus4Desc: '25% chance to refund 0.5 SP whenever casting an active skill',
  },
  ASHEN_FURY: {
    id: 'ASHEN_FURY',
    name: 'Ashen Fury Set',
    idealFor: 'Ranger & Crit Carry',
    color: '#f97316',
    bonus2Desc: '+10% Crit Rate',
    bonus4Desc: 'Critical Hits grant +15% Attack Speed for 4s',
  },
  AEGIS_BASTION: {
    id: 'AEGIS_BASTION',
    name: 'Aegis Bastion Set',
    idealFor: 'Tank & Frontliner',
    color: '#94a3b8',
    bonus2Desc: '+15% Max HP & +15% DEF',
    bonus4Desc: '+25% Shield Power; taking hits cuts skill CDs by 0.5s (3s CD)',
  },
  ASTRAL_SURGE: {
    id: 'ASTRAL_SURGE',
    name: 'Astral Surge Set',
    idealFor: 'Burst Mage & Ult Carry',
    color: '#a855f7',
    bonus2Desc: '+15% Skill DMG',
    bonus4Desc: '+20% Ultimate Gauge charge & +20% Ultimate DMG',
  },
  VERDANT_GRACE: {
    id: 'VERDANT_GRACE',
    name: 'Verdant Grace Set',
    idealFor: 'Healer & Support',
    color: '#10b981',
    bonus2Desc: '+15% Outgoing Heal',
    bonus4Desc: 'Healing allies cleanses 1 debuff (8s CD) & grants +10% DMG Reduction (4s)',
  },
};

export const EQUIPMENT_SET_LIST: EquipmentSetDef[] = Object.values(EQUIPMENT_SETS);

export const EQUIPMENT_SLOTS: EquipmentSlot[] = ['WEAPON', 'ARMOR', 'ACCESSORY', 'EMBLEM'];

export const RARITY_COLORS: Record<EquipmentRarity, string> = {
  COMMON: '#cbd5e1',
  RARE: '#38bdf8',
  EPIC: '#c084fc',
  LEGENDARY: '#f5c84c',
};

const SLOT_NOUNS: Record<EquipmentSlot, string[]> = {
  WEAPON: ['Blade', 'Edge', 'Lance', 'Arc-Staff'],
  ARMOR: ['Plate', 'Cuirass', 'Mantle', 'Mail'],
  ACCESSORY: ['Signet', 'Pendant', 'Talisman', 'Band'],
  EMBLEM: ['Crest', 'Insignia', 'Sigil', 'Medallion'],
};

const RARITY_MULT: Record<EquipmentRarity, number> = {
  COMMON: 1.0,
  RARE: 1.35,
  EPIC: 1.75,
  LEGENDARY: 2.25,
};

const SUBSTAT_COUNT: Record<EquipmentRarity, number> = {
  COMMON: 1,
  RARE: 2,
  EPIC: 2,
  LEGENDARY: 3,
};

const SUBSTAT_POOL_BY_SLOT: Record<EquipmentSlot, SubStatKey[]> = {
  WEAPON: ['CRIT_RATE', 'CRIT_DMG', 'ATK_SPD', 'ATK_PCT'],
  ARMOR: ['HP_PCT', 'DEF_PCT', 'CDR', 'HEAL_PCT'],
  ACCESSORY: ['ATK_PCT', 'CRIT_DMG', 'HP_PCT', 'HEAL_PCT', 'CRIT_RATE'],
  EMBLEM: ['CDR', 'ATK_SPD', 'ATK_PCT', 'CRIT_RATE', 'DEF_PCT'],
};

export const SUBSTAT_LABELS: Record<SubStatKey, string> = {
  ATK_PCT: 'ATK%',
  HP_PCT: 'Max HP%',
  DEF_PCT: 'DEF%',
  CRIT_RATE: 'Crit Rate',
  CRIT_DMG: 'Crit DMG',
  ATK_SPD: 'Atk Spd',
  CDR: 'CD Red.',
  HEAL_PCT: 'Heal%',
};

function rollSubStatValue(stat: SubStatKey, rarity: EquipmentRarity): number {
  const scale = RARITY_MULT[rarity];
  const baseRanges: Record<SubStatKey, [number, number]> = {
    ATK_PCT: [0.03, 0.055],
    HP_PCT: [0.035, 0.06],
    DEF_PCT: [0.035, 0.06],
    CRIT_RATE: [0.02, 0.04],
    CRIT_DMG: [0.05, 0.09],
    ATK_SPD: [0.025, 0.05],
    CDR: [0.02, 0.04],
    HEAL_PCT: [0.035, 0.065],
  };
  const [min, max] = baseRanges[stat];
  const raw = (min + Math.random() * (max - min)) * (0.75 + scale * 0.28);
  return Math.round(raw * 1000) / 1000;
}

export function generateEquipment(options?: {
  slot?: EquipmentSlot;
  setId?: EquipmentSetId;
  rarity?: EquipmentRarity;
  enhanceLevel?: number;
}): EquipmentInstance {
  const slot =
    options?.slot ?? EQUIPMENT_SLOTS[Math.floor(Math.random() * EQUIPMENT_SLOTS.length)];
  const setIds = Object.keys(EQUIPMENT_SETS) as EquipmentSetId[];
  const setId = options?.setId ?? setIds[Math.floor(Math.random() * setIds.length)];
  const rarity = options?.rarity ?? 'RARE';
  const enhanceLevel = options?.enhanceLevel ?? 0;

  const mult = RARITY_MULT[rarity];
  let mainStat: { stat: string; value: number };

  if (slot === 'WEAPON') {
    mainStat = { stat: 'FLAT_ATK', value: Math.round(28 * mult) };
  } else if (slot === 'ARMOR') {
    mainStat = { stat: 'FLAT_HP', value: Math.round(220 * mult) };
  } else if (slot === 'ACCESSORY') {
    const roll = Math.random();
    if (roll < 0.4) {
      mainStat = { stat: 'CRIT_RATE', value: Math.round(0.045 * mult * 1000) / 1000 };
    } else if (roll < 0.7) {
      mainStat = { stat: 'HP_PCT', value: Math.round(0.075 * mult * 1000) / 1000 };
    } else {
      mainStat = { stat: 'HEAL_PCT', value: Math.round(0.08 * mult * 1000) / 1000 };
    }
  } else {
    mainStat = { stat: 'CDR', value: Math.round(0.04 * mult * 1000) / 1000 };
  }

  const pool = [...SUBSTAT_POOL_BY_SLOT[slot]];
  const count = SUBSTAT_COUNT[rarity];
  const subStats: EquipmentSubStat[] = [];
  for (let i = 0; i < count && pool.length > 0; i++) {
    const idx = Math.floor(Math.random() * pool.length);
    const key = pool.splice(idx, 1)[0];
    subStats.push({ stat: key, value: rollSubStatValue(key, rarity) });
  }

  const setNameShort = EQUIPMENT_SETS[setId].name.replace(' Set', '');
  const nouns = SLOT_NOUNS[slot];
  const noun = nouns[Math.floor(Math.random() * nouns.length)];

  return {
    uid: `eq_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`,
    name: `${setNameShort} ${noun}`,
    slot,
    setId,
    rarity,
    enhanceLevel,
    mainStat,
    subStats,
    equippedHeroId: null,
  };
}

export function getEnhancedMainStatValue(item: EquipmentInstance): number {
  const growthPerLevel = item.mainStat.stat.startsWith('FLAT_') ? 0.12 : 0.08;
  const val = item.mainStat.value * (1 + item.enhanceLevel * growthPerLevel);
  return item.mainStat.stat.startsWith('FLAT_')
    ? Math.round(val)
    : Math.round(val * 1000) / 1000;
}

export function formatStatValue(stat: string, value: number): string {
  if (stat === 'FLAT_ATK') return `+${Math.round(value)} ATK`;
  if (stat === 'FLAT_HP') return `+${Math.round(value)} HP`;
  const label = SUBSTAT_LABELS[stat as SubStatKey] ?? stat;
  return `+${(value * 100).toFixed(1)}% ${label}`;
}

export function createStarterEquipment(): EquipmentInstance[] {
  return [
    {
      ...generateEquipment({ slot: 'WEAPON', setId: 'VANGUARD', rarity: 'RARE', enhanceLevel: 2 }),
      uid: 'starter_eq_1',
      name: 'Vanguard Blade',
      equippedHeroId: 'kael',
    },
    {
      ...generateEquipment({ slot: 'ARMOR', setId: 'AEGIS_BASTION', rarity: 'RARE', enhanceLevel: 2 }),
      uid: 'starter_eq_2',
      name: 'Aegis Bastion Plate',
      equippedHeroId: 'garrick',
    },
    {
      ...generateEquipment({ slot: 'ACCESSORY', setId: 'VERDANT_GRACE', rarity: 'RARE', enhanceLevel: 1 }),
      uid: 'starter_eq_3',
      name: 'Verdant Grace Talisman',
      equippedHeroId: 'clara',
    },
    {
      ...generateEquipment({ slot: 'EMBLEM', setId: 'ASTRAL_SURGE', rarity: 'EPIC', enhanceLevel: 2 }),
      uid: 'starter_eq_4',
      name: 'Astral Surge Crest',
      equippedHeroId: 'nyx',
    },
    {
      ...generateEquipment({ slot: 'WEAPON', setId: 'ASTRAL_SURGE', rarity: 'RARE', enhanceLevel: 0 }),
      uid: 'starter_eq_5',
      name: 'Astral Surge Arc-Staff',
      equippedHeroId: 'nyx',
    },
    {
      ...generateEquipment({ slot: 'EMBLEM', setId: 'AEGIS_BASTION', rarity: 'RARE', enhanceLevel: 0 }),
      uid: 'starter_eq_6',
      name: 'Aegis Bastion Crest',
      equippedHeroId: 'garrick',
    },
  ];
}
