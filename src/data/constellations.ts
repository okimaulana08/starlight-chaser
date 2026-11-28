import type { Faction, HeroDef, OwnedHeroState, Tier } from '../types/game';
import { HERO_MAP } from './heroes';

export const MAX_CONSTELLATION_LEVEL = 6;

/**
 * Rarity Tier Base Growth Multiplier ensuring strict cross-tier power integrity:
 * R (C6) < SR (C1) < SR (C6) < SSR (C1) < SSR (C6) < UR (C1) < UR (C6)
 */
export const TIER_STAT_MULTIPLIER: Record<Tier, number> = {
  R: 0.85,
  SR: 1.05,
  SSR: 1.26,
  UR: 1.56,
};

/**
 * Proportional Hero Shard cost per Constellation node (C1..C6):
 * - R  (+5 Shards/dupe):  15/20/25/30/40/50 = 180 Shards (36 dupes)
 * - SR (+10 Shards/dupe): 15/20/25/30/40/50 = 180 Shards (18 dupes)
 * - SSR (+20 Shards/dupe): 20×6 = 120 Shards (6 dupes — 1 dupe = 1 Star!)
 * - UR (+30 Shards/dupe):  30×6 = 180 Shards (6 dupes — 1 dupe = 1 Star!)
 */
export const CONSTELLATION_SHARD_COSTS: Record<Tier, [number, number, number, number, number, number]> = {
  R: [15, 20, 25, 30, 40, 50],
  SR: [15, 20, 25, 30, 40, 50],
  SSR: [20, 20, 20, 20, 20, 20],
  UR: [30, 30, 30, 30, 30, 30],
};

export const CONSTELLATION_GOLD_COSTS: Record<Tier, [number, number, number, number, number, number]> = {
  R: [1500, 2500, 4000, 6000, 8500, 12000],
  SR: [2500, 4200, 6500, 9500, 13500, 18000],
  SSR: [4500, 7500, 11500, 16500, 22500, 30000],
  UR: [7500, 12000, 18000, 26000, 36000, 48000],
};

/**
 * Permanent Global Account Bonus granted to ALL heroes per hero maxed at C6!
 * Keeps maxing R/SR Constellations rewarding even in Hard/Hell endgame.
 */
export const C6_ACCOUNT_BONUS_BY_TIER: Record<Tier, number> = {
  R: 0.005,   // +0.5% Global HP & ATK
  SR: 0.01,   // +1.0% Global HP & ATK
  SSR: 0.015, // +1.5% Global HP & ATK
  UR: 0.025,  // +2.5% Global HP & ATK
};

export interface ConstellationNodeDef {
  index: 1 | 2 | 3 | 4 | 5 | 6;
  code: `C${1 | 2 | 3 | 4 | 5 | 6}`;
  name: string;
  subtitle: string;
  shardsCost: number;
  goldCost: number;
  baseStatPct: number;
  cdrBonus?: number;
  critRateBonus?: number;
  critDmgBonus?: number;
  skillDmgBonus?: number;
  healShieldBonus?: number;
  breakDmgBonus?: number;
  ultGaugeBonus?: number;
  ultDmgBonus?: number;
  finalDmgBonus?: number;
  squadAtkHpAuraBonus?: number;
  accountGlobalBonus?: number;
  effectsSummary: string[];
}

interface TierConstellationScale {
  statPerNode: number;
  c1Cdr: number;
  c2Crit: number;
  c2CritDmg: number;
  c3Skill: number;
  c4Break: number;
  c4UltGauge: number;
  c5Ult: number;
  c6FinalDmg: number;
  c6CritDmg: number;
  c6SquadAura: number;
  powerPerNode: number;
}

const TIER_SCALE: Record<Tier, TierConstellationScale> = {
  R: {
    statPerNode: 0.01,
    c1Cdr: 0.02,
    c2Crit: 0.02,
    c2CritDmg: 0,
    c3Skill: 0.04,
    c4Break: 0,
    c4UltGauge: 0.04,
    c5Ult: 0.05,
    c6FinalDmg: 0.03,
    c6CritDmg: 0,
    c6SquadAura: 0,
    powerPerNode: 35,
  },
  SR: {
    statPerNode: 0.02,
    c1Cdr: 0.04,
    c2Crit: 0.04,
    c2CritDmg: 0,
    c3Skill: 0.08,
    c4Break: 0.08,
    c4UltGauge: 0.08,
    c5Ult: 0.1,
    c6FinalDmg: 0.06,
    c6CritDmg: 0,
    c6SquadAura: 0,
    powerPerNode: 75,
  },
  SSR: {
    statPerNode: 0.035,
    c1Cdr: 0.06,
    c2Crit: 0.06,
    c2CritDmg: 0.08,
    c3Skill: 0.14,
    c4Break: 0.14,
    c4UltGauge: 0.1,
    c5Ult: 0.18,
    c6FinalDmg: 0.1,
    c6CritDmg: 0.06,
    c6SquadAura: 0,
    powerPerNode: 140,
  },
  UR: {
    statPerNode: 0.05,
    c1Cdr: 0.08,
    c2Crit: 0.08,
    c2CritDmg: 0.14,
    c3Skill: 0.22,
    c4Break: 0.2,
    c4UltGauge: 0.15,
    c5Ult: 0.26,
    c6FinalDmg: 0.15,
    c6CritDmg: 0.12,
    c6SquadAura: 0.04,
    powerPerNode: 260,
  },
};

const FACTION_STAR_NAMES: Record<Faction, [string, string, string, string, string, string]> = {
  SOLARIS: [
    'Dawnlight Ignition',
    'Solar Meridian',
    'Vanguard Crest',
    'Aurelian Breaker',
    'Radiant Zenith',
    'Sovereign Apotheosis',
  ],
  ASTRAL: [
    'Nebula Spark',
    'Prism Parallax',
    'Starlight Orbit',
    'Singularity Pulse',
    'Celestial Eclipse',
    'Eternal Astrolabe',
  ],
  VERDANT: [
    'Dewdrop Awakening',
    'Canopy Resonance',
    'World-Tree Bough',
    'Emerald Tempest',
    'Grove Sanctuary',
    'Covenant Crown',
  ],
  ASHEN: [
    'Ember Kindling',
    'Crucible Edge',
    'Caldera Surge',
    'Obsidian Shatter',
    'Molten Cataclysm',
    'Phoenix Dominion',
  ],
};

/**
 * Distinct 6-star cosmic sky coordinates (0..100%) per Faction so every faction renders
 * an iconic, readable star-constellation silhouette inside the Starlight Constellation Altar!
 */
export const FACTION_CONSTELLATION_POINTS: Record<
  Faction,
  Array<{ x: number; y: number }>
> = {
  SOLARIS: [
    { x: 18, y: 74 },
    { x: 34, y: 54 },
    { x: 24, y: 28 },
    { x: 54, y: 20 },
    { x: 78, y: 38 },
    { x: 64, y: 70 },
  ],
  ASTRAL: [
    { x: 20, y: 66 },
    { x: 32, y: 34 },
    { x: 56, y: 18 },
    { x: 80, y: 34 },
    { x: 72, y: 68 },
    { x: 48, y: 52 },
  ],
  VERDANT: [
    { x: 18, y: 76 },
    { x: 28, y: 50 },
    { x: 46, y: 30 },
    { x: 72, y: 22 },
    { x: 80, y: 50 },
    { x: 58, y: 72 },
  ],
  ASHEN: [
    { x: 20, y: 72 },
    { x: 40, y: 62 },
    { x: 26, y: 36 },
    { x: 52, y: 20 },
    { x: 78, y: 34 },
    { x: 74, y: 68 },
  ],
};

function fmtPct(v: number): string {
  const pct = v * 100;
  return Number.isInteger(pct) ? `${pct}%` : `${pct.toFixed(1)}%`;
}

export function getConstellationNodeCost(
  tier: Tier,
  nextLevel: number,
): { shards: number; gold: number } | null {
  if (nextLevel < 1 || nextLevel > MAX_CONSTELLATION_LEVEL) return null;
  const idx = nextLevel - 1;
  return {
    shards: CONSTELLATION_SHARD_COSTS[tier][idx],
    gold: CONSTELLATION_GOLD_COSTS[tier][idx],
  };
}

export function getHeroConstellationNodes(hero: HeroDef): ConstellationNodeDef[] {
  const sc = TIER_SCALE[hero.tier];
  const names = FACTION_STAR_NAMES[hero.faction];
  const isSupportRole = hero.role === 'HEALER' || hero.role === 'TANK';
  const accBonus = C6_ACCOUNT_BONUS_BY_TIER[hero.tier];
  const statLabel = `+${fmtPct(sc.statPerNode)} Base HP / ATK / DEF`;

  return [
    {
      index: 1,
      code: 'C1',
      name: names[0],
      subtitle: 'First Star — Cooldown Harmony',
      shardsCost: CONSTELLATION_SHARD_COSTS[hero.tier][0],
      goldCost: CONSTELLATION_GOLD_COSTS[hero.tier][0],
      baseStatPct: sc.statPerNode,
      cdrBonus: sc.c1Cdr,
      effectsSummary: [statLabel, `+${fmtPct(sc.c1Cdr)} Skill Cooldown Reduction`],
    },
    {
      index: 2,
      code: 'C2',
      name: names[1],
      subtitle: 'Second Star — Precision Focus',
      shardsCost: CONSTELLATION_SHARD_COSTS[hero.tier][1],
      goldCost: CONSTELLATION_GOLD_COSTS[hero.tier][1],
      baseStatPct: sc.statPerNode,
      critRateBonus: sc.c2Crit,
      critDmgBonus: sc.c2CritDmg > 0 ? sc.c2CritDmg : undefined,
      effectsSummary: [
        statLabel,
        `+${fmtPct(sc.c2Crit)} Crit Rate`,
        ...(sc.c2CritDmg > 0 ? [`+${fmtPct(sc.c2CritDmg)} Crit DMG`] : []),
      ],
    },
    {
      index: 3,
      code: 'C3',
      name: names[2],
      subtitle: isSupportRole ? 'Third Star — Bastion & Grace' : 'Third Star — Active Skill Surge',
      shardsCost: CONSTELLATION_SHARD_COSTS[hero.tier][2],
      goldCost: CONSTELLATION_GOLD_COSTS[hero.tier][2],
      baseStatPct: sc.statPerNode,
      skillDmgBonus: sc.c3Skill,
      healShieldBonus: isSupportRole ? sc.c3Skill : undefined,
      effectsSummary: [
        statLabel,
        `+${fmtPct(sc.c3Skill)} Skill 1 & Skill 2 DMG`,
        ...(isSupportRole ? [`+${fmtPct(sc.c3Skill)} Heal & Shield Power`] : []),
      ],
    },
    {
      index: 4,
      code: 'C4',
      name: names[3],
      subtitle: 'Fourth Star — Tactical Resonance',
      shardsCost: CONSTELLATION_SHARD_COSTS[hero.tier][3],
      goldCost: CONSTELLATION_GOLD_COSTS[hero.tier][3],
      baseStatPct: sc.statPerNode,
      breakDmgBonus: sc.c4Break > 0 ? sc.c4Break : undefined,
      ultGaugeBonus: sc.c4UltGauge,
      effectsSummary: [
        statLabel,
        `+${fmtPct(sc.c4UltGauge)} Ultimate Gauge Gain`,
        ...(sc.c4Break > 0 ? [`+${fmtPct(sc.c4Break)} Boss Break DMG`] : []),
      ],
    },
    {
      index: 5,
      code: 'C5',
      name: names[4],
      subtitle: 'Fifth Star — Celestial Burst',
      shardsCost: CONSTELLATION_SHARD_COSTS[hero.tier][4],
      goldCost: CONSTELLATION_GOLD_COSTS[hero.tier][4],
      baseStatPct: sc.statPerNode,
      ultDmgBonus: sc.c5Ult,
      healShieldBonus: isSupportRole ? sc.c5Ult * 0.5 : undefined,
      effectsSummary: [
        statLabel,
        `+${fmtPct(sc.c5Ult)} Ultimate DMG`,
        ...(isSupportRole ? [`+${fmtPct(sc.c5Ult * 0.5)} Heal & Shield Power`] : []),
      ],
    },
    {
      index: 6,
      code: 'C6',
      name: names[5],
      subtitle: hero.tier === 'UR' ? 'Sixth Star — Almighty Sovereign Crown' : 'Sixth Star — Starlight Pinnacle',
      shardsCost: CONSTELLATION_SHARD_COSTS[hero.tier][5],
      goldCost: CONSTELLATION_GOLD_COSTS[hero.tier][5],
      baseStatPct: sc.statPerNode,
      finalDmgBonus: sc.c6FinalDmg,
      critDmgBonus: sc.c6CritDmg > 0 ? sc.c6CritDmg : undefined,
      squadAtkHpAuraBonus: sc.c6SquadAura > 0 ? sc.c6SquadAura : undefined,
      accountGlobalBonus: accBonus,
      effectsSummary: [
        statLabel,
        `+${fmtPct(sc.c6FinalDmg)} Final DMG (All Attacks & Skills)`,
        ...(sc.c6CritDmg > 0 ? [`+${fmtPct(sc.c6CritDmg)} Crit DMG`] : []),
        ...(sc.c6SquadAura > 0
          ? [`+${fmtPct(sc.c6SquadAura)} Squad-Wide ATK & HP Sovereign Aura`]
          : []),
        `Account Mastery: +${fmtPct(accBonus)} Global ATK & HP to ALL Heroes`,
        'Surplus Summon Dupes convert into 2× Star Dust!',
      ],
    },
  ];
}

export interface AggregatedConstellationBonuses {
  level: number;
  baseStatMultBonus: number;
  cdrBonus: number;
  critRateBonus: number;
  critDmgBonus: number;
  skillDmgBonus: number;
  healShieldBonus: number;
  breakDmgBonus: number;
  ultGaugeBonus: number;
  ultDmgBonus: number;
  finalDmgBonus: number;
  squadAtkHpAuraBonus: number;
  powerBonus: number;
}

export function computeHeroConstellationBonuses(
  hero: HeroDef,
  constellationLevel: number,
): AggregatedConstellationBonuses {
  const lv = Math.max(0, Math.min(MAX_CONSTELLATION_LEVEL, constellationLevel || 0));
  const sc = TIER_SCALE[hero.tier];
  const nodes = getHeroConstellationNodes(hero);

  const agg: AggregatedConstellationBonuses = {
    level: lv,
    baseStatMultBonus: 0,
    cdrBonus: 0,
    critRateBonus: 0,
    critDmgBonus: 0,
    skillDmgBonus: 0,
    healShieldBonus: 0,
    breakDmgBonus: 0,
    ultGaugeBonus: 0,
    ultDmgBonus: 0,
    finalDmgBonus: 0,
    squadAtkHpAuraBonus: 0,
    powerBonus: lv * sc.powerPerNode,
  };

  for (let i = 0; i < lv; i++) {
    const n = nodes[i];
    if (!n) break;
    agg.baseStatMultBonus += n.baseStatPct;
    agg.cdrBonus += n.cdrBonus ?? 0;
    agg.critRateBonus += n.critRateBonus ?? 0;
    agg.critDmgBonus += n.critDmgBonus ?? 0;
    agg.skillDmgBonus += n.skillDmgBonus ?? 0;
    agg.healShieldBonus += n.healShieldBonus ?? 0;
    agg.breakDmgBonus += n.breakDmgBonus ?? 0;
    agg.ultGaugeBonus += n.ultGaugeBonus ?? 0;
    agg.ultDmgBonus += n.ultDmgBonus ?? 0;
    agg.finalDmgBonus += n.finalDmgBonus ?? 0;
    agg.squadAtkHpAuraBonus += n.squadAtkHpAuraBonus ?? 0;
  }

  return agg;
}

export function computeConstellationAccountBonus(
  roster?: Record<string, OwnedHeroState>,
): { totalPct: number; c6Count: number } {
  if (!roster) return { totalPct: 0, c6Count: 0 };
  let totalPct = 0;
  let c6Count = 0;
  for (const own of Object.values(roster)) {
    if ((own.constellation ?? 0) >= MAX_CONSTELLATION_LEVEL) {
      const def = HERO_MAP[own.heroId];
      if (!def) continue;
      c6Count += 1;
      totalPct += C6_ACCOUNT_BONUS_BY_TIER[def.tier];
    }
  }
  return { totalPct: Number(totalPct.toFixed(4)), c6Count };
}
