import type { OwnedPetState, PetDef } from '../types/game';

export const MAX_PET_RANK = 5;
export const MAX_PET_LEVEL = 50;

export const PETS: PetDef[] = [
  {
    id: 'pet_aetherion',
    name: 'Aetherion',
    title: 'Sovereign Astrolabe Griffin',
    tier: 'SSR',
    petRole: 'CELESTIAL',
    themeColor: '#f5c84c',
    lore: 'Hatched inside the upper vaults of the Aurelian Star-Citadel, Aetherion carries a living miniature astrolabe forged from First Pillar dust. Its gaze sharpens the Starlight Link of every Chaser fighting beneath its wings.',
    quote: 'A sovereign wingbeat aligns the stars in your favor.',
    auraDesc:
      'Grants the squad +10%→+20% Crit Rate, +18%→+38% Crit DMG, and +12%→+25% Ult Gauge Gain (scales with Rank R1–R5 & Level).',
    auraBase: {
      critRate: 0.1,
      critDmg: 0.18,
      ultGaugeBonus: 0.12,
    },
    auraPerRank: {
      critRate: 0.025,
      critDmg: 0.05,
      ultGaugeBonus: 0.0325,
    },
    activeSkill: {
      id: 'pet_skill_astral_decree',
      name: 'Astral Decree',
      description:
        'Unleashes a golden-prismatic orbital beam (240% Lead ATK AoE + Heavy Break DMG), shields all allies for 10% Max HP (4s), and grants +10 Ult Gauge.',
      cooldown: 14,
      kind: 'ASTRAL_DECREE',
    },
    assets: {
      card: '/assets/pets/pet_aetherion_card.webp',
      sprite: '/assets/pets/pet_aetherion_sprite.webp',
    },
  },
  {
    id: 'pet_cinderfang',
    name: 'Cinderfang',
    title: 'Caldera Ember-Drake',
    tier: 'SR',
    petRole: 'STRIKER',
    themeColor: '#f97316',
    lore: 'Raised amid the volcanic crucibles of Ferrum Caldera, Cinderfang feeds on meteorite sparks and spits searing magma bolts that crack even Abyssal boss armor.',
    quote: 'Embers answer the bold—watch their armor melt!',
    auraDesc:
      'Grants the squad +8%→+20% ATK and +10%→+25% Boss Break DMG (scales with Rank R1–R5 & Level).',
    auraBase: {
      atkPct: 0.08,
      breakDmgBonus: 0.1,
    },
    auraPerRank: {
      atkPct: 0.03,
      breakDmgBonus: 0.0375,
    },
    activeSkill: {
      id: 'pet_skill_magma_breath',
      name: 'Magma Breath',
      description:
        'Launches 3 homing volcanic fireballs (140% Lead ATK total), inflicting 2 Burn stacks and 12% DEF Shred (5s).',
      cooldown: 10,
      kind: 'MAGMA_VOLLEY',
    },
    assets: {
      card: '/assets/pets/pet_cinderfang_card.webp',
      sprite: '/assets/pets/pet_cinderfang_sprite.webp',
    },
  },
  {
    id: 'pet_lumina',
    name: 'Lumina',
    title: 'Celestial Star-Fox',
    tier: 'R',
    petRole: 'SUPPORT',
    themeColor: '#38e8ff',
    lore: 'A gentle moonlit kitsune wisp born from starlight dew in the Sylva Gardens. Lumina dances alongside tired Chasers, mending wounds and replenishing skill energy mid-battle.',
    quote: 'Soft starlight mends every scar on the road ahead.',
    auraDesc:
      'Grants the squad +6%→+15% Max HP and +8%→+20% SP Regen (scales with Rank R1–R5 & Level).',
    auraBase: {
      hpPct: 0.06,
      spRegenBonus: 0.08,
    },
    auraPerRank: {
      hpPct: 0.0225,
      spRegenBonus: 0.03,
    },
    activeSkill: {
      id: 'pet_skill_starlight_dew',
      name: 'Starlight Dew',
      description:
        'Bathes the lowest-HP ally in healing starlight (+12% Max HP) and restores +0.5 Squad SP.',
      cooldown: 12,
      kind: 'HEAL_SP',
    },
    assets: {
      card: '/assets/pets/pet_lumina_card.webp',
      sprite: '/assets/pets/pet_lumina_sprite.webp',
    },
  },
];

export const PET_MAP: Record<string, PetDef> = Object.fromEntries(PETS.map((p) => [p.id, p]));

export interface ComputedPetAura {
  hpPct: number;
  atkPct: number;
  defPct: number;
  critRate: number;
  critDmg: number;
  spRegenBonus: number;
  breakDmgBonus: number;
  ultGaugeBonus: number;
  skillPowerMult: number;
  powerRating: number;
}

/**
 * Computes live Pet Squad Aura & Combat Skill scaling based on Rank (1..5) and Level (1..50).
 */
export function computePetAura(pet: PetDef, owned: OwnedPetState): ComputedPetAura {
  const rankSteps = Math.max(0, Math.min(MAX_PET_RANK - 1, (owned.rank ?? 1) - 1));
  const level = Math.max(1, Math.min(MAX_PET_LEVEL, owned.level ?? 1));
  // Leveling 1 -> 50 scales aura potency up to +35% and active skill potency up to +45%!
  const lvAuraMult = 1 + ((level - 1) / (MAX_PET_LEVEL - 1)) * 0.35;
  const skillPowerMult = (1 + rankSteps * 0.14) * (1 + ((level - 1) / (MAX_PET_LEVEL - 1)) * 0.45);

  const hpPct = ((pet.auraBase.hpPct ?? 0) + (pet.auraPerRank.hpPct ?? 0) * rankSteps) * lvAuraMult;
  const atkPct = ((pet.auraBase.atkPct ?? 0) + (pet.auraPerRank.atkPct ?? 0) * rankSteps) * lvAuraMult;
  const defPct = ((pet.auraBase.defPct ?? 0) + (pet.auraPerRank.defPct ?? 0) * rankSteps) * lvAuraMult;
  const critRate =
    ((pet.auraBase.critRate ?? 0) + (pet.auraPerRank.critRate ?? 0) * rankSteps) * lvAuraMult;
  const critDmg =
    ((pet.auraBase.critDmg ?? 0) + (pet.auraPerRank.critDmg ?? 0) * rankSteps) * lvAuraMult;
  const spRegenBonus =
    ((pet.auraBase.spRegenBonus ?? 0) + (pet.auraPerRank.spRegenBonus ?? 0) * rankSteps) * lvAuraMult;
  const breakDmgBonus =
    ((pet.auraBase.breakDmgBonus ?? 0) + (pet.auraPerRank.breakDmgBonus ?? 0) * rankSteps) *
    lvAuraMult;
  const ultGaugeBonus =
    ((pet.auraBase.ultGaugeBonus ?? 0) + (pet.auraPerRank.ultGaugeBonus ?? 0) * rankSteps) *
    lvAuraMult;

  const tierBasePwr = pet.tier === 'SSR' ? 1200 : pet.tier === 'SR' ? 820 : 540;
  const powerRating = Math.round(tierBasePwr + rankSteps * 380 + (level - 1) * 42);

  return {
    hpPct,
    atkPct,
    defPct,
    critRate,
    critDmg,
    spRegenBonus,
    breakDmgBonus,
    ultGaugeBonus,
    skillPowerMult,
    powerRating,
  };
}

export function getPetLevelUpCost(
  currentLevel: number,
  levelsToAdd = 1,
): { actualLevels: number; potions: number; gold: number } {
  const actualLevels = Math.max(0, Math.min(levelsToAdd, MAX_PET_LEVEL - currentLevel));
  let potions = 0;
  let gold = 0;
  for (let i = 0; i < actualLevels; i++) {
    const lv = currentLevel + i;
    potions += 1 + Math.floor(lv / 12);
    gold += 140 + lv * 30;
  }
  return { actualLevels, potions, gold };
}

export function formatPetAuraSummary(pet: PetDef, owned: OwnedPetState): string[] {
  const a = computePetAura(pet, owned);
  const pills: string[] = [];
  if (a.atkPct > 0) pills.push(`+${Math.round(a.atkPct * 100)}% ATK`);
  if (a.hpPct > 0) pills.push(`+${Math.round(a.hpPct * 100)}% HP`);
  if (a.critRate > 0) pills.push(`+${Math.round(a.critRate * 100)}% Crit`);
  if (a.critDmg > 0) pills.push(`+${Math.round(a.critDmg * 100)}% Crit DMG`);
  if (a.spRegenBonus > 0) pills.push(`+${Math.round(a.spRegenBonus * 100)}% SP Regen`);
  if (a.breakDmgBonus > 0) pills.push(`+${Math.round(a.breakDmgBonus * 100)}% Break DMG`);
  if (a.ultGaugeBonus > 0) pills.push(`+${Math.round(a.ultGaugeBonus * 100)}% Ult Gauge`);
  return pills;
}
