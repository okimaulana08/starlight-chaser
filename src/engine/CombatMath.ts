import { FACTIONS, HARMONY_RESONANCE } from '../data/factions';
import { HERO_MAP } from '../data/heroes';
import { RELIC_MAP } from '../data/relics';
import { getEnhancedMainStatValue } from '../data/equipment';
import type {
  EquipmentInstance,
  EquipmentSetId,
  Faction,
  HeroDef,
  OwnedHeroState,
} from '../types/game';

export interface ActiveFactionBonus {
  faction: Faction;
  count: number;
  tier: 0 | 2 | 3;
}

export interface SquadSynergyPill {
  id: string;
  label: string;
  shortLabel: string;
  color: string;
  desc: string;
  isHarmony?: boolean;
}

export interface ComputedHeroStats {
  maxHp: number;
  atk: number;
  def: number;
  critRate: number;
  critDmg: number;
  atkSpeed: number;
  moveSpeed: number;
  attackRange: number;
  cdr: number;
  healBonus: number;
  skillDmgBonus: number;
  ultDmgBonus: number;
  shieldPower: number;
  defIgnore: number;
  spRegenBonus: number;
  ultGaugeBonus: number;
  startingGauge: number;
  aoeRadiusBonus: number;
  dmgBonusVsDebuffed: number;
  breakDmgBonus: number;
  startShieldRatio: number;
  activeSets: Array<{ setId: EquipmentSetId; count: number }>;
  powerRating: number;
}

export function isFourFactionHarmony(squadIds: string[]): boolean {
  const unique = new Set<Faction>();
  for (const id of squadIds) {
    const hero = HERO_MAP[id];
    if (hero) unique.add(hero.faction);
  }
  return unique.size >= 4;
}

export function getActiveFactionBonuses(squadIds: string[]): ActiveFactionBonus[] {
  const counts: Record<Faction, number> = {
    SOLARIS: 0,
    ASTRAL: 0,
    VERDANT: 0,
    ASHEN: 0,
  };
  for (const id of squadIds) {
    const hero = HERO_MAP[id];
    if (hero) counts[hero.faction] += 1;
  }
  return (Object.keys(counts) as Faction[])
    .filter((f) => counts[f] >= 2)
    .map((f) => ({
      faction: f,
      count: counts[f],
      tier: counts[f] >= 3 ? 3 : 2,
    }));
}

export function getSquadSynergyPills(squadIds: string[]): SquadSynergyPill[] {
  const pills: SquadSynergyPill[] = [];
  if (isFourFactionHarmony(squadIds)) {
    pills.push({
      id: 'HARMONY',
      label: HARMONY_RESONANCE.name,
      shortLabel: 'HARMONY ×4',
      color: HARMONY_RESONANCE.color,
      desc: HARMONY_RESONANCE.desc,
      isHarmony: true,
    });
    return pills;
  }
  for (const fb of getActiveFactionBonuses(squadIds)) {
    const def = FACTIONS[fb.faction];
    pills.push({
      id: `${fb.faction}_${fb.tier}`,
      label: `${def.name.split(' ')[0]} Resonance (${fb.count})`,
      shortLabel: `${def.name.split(' ')[0].toUpperCase()} ×${fb.count}`,
      color: def.color,
      desc: fb.tier === 3 ? def.bonus3Desc : def.bonus2Desc,
    });
  }
  return pills;
}

export function computeHeroStats(
  heroDef: HeroDef,
  owned: OwnedHeroState,
  allEquipment: EquipmentInstance[],
  squadIds: string[],
  codexCount: number,
  relicRanks: Record<string, number> = {},
): ComputedHeroStats {
  // Balanced RPG growth: Stat(L) = BaseStat * (1 + 0.072 * (L - 1)) * AwakeningMult * BondMult
  const levelMult = 1 + 0.072 * (owned.level - 1);
  const awakeningMult = 1 + 0.1 * owned.awakening;
  const bondMult = 1 + 0.015 * Math.max(0, owned.bondLevel - 1);
  // Codex Global Account Bonus: +1% ATK / +1% HP per 5 unlocked entries
  const codexSteps = Math.floor(codexCount / 5);
  const codexBonus = codexSteps * 0.01;

  let flatHp = heroDef.baseStats.hp * levelMult * awakeningMult * bondMult;
  let flatAtk = heroDef.baseStats.atk * levelMult * awakeningMult * bondMult;
  let flatDef = heroDef.baseStats.def * levelMult * awakeningMult * bondMult;

  let hpPct = codexBonus;
  let atkPct = codexBonus;
  let defPct = 0;
  let critRate = heroDef.baseStats.critRate;
  let critDmg = heroDef.baseStats.critDmg ?? 1.5;
  let atkSpeedBonus = 0;
  let cdr = 0;
  let healBonus = 0;
  // Awakening Milestone Bonuses: ★3 (+10% Skill DMG), ★6 (+15% Ult DMG)
  let skillDmgBonus = owned.awakening >= 3 ? 0.1 : 0;
  let ultDmgBonus = owned.awakening >= 6 ? 0.15 : 0;
  let shieldPower = 1.0;
  let defIgnore = 0;
  let spRegenBonus = 0;
  let ultGaugeBonus = 0;
  let startingGauge = 0;
  let aoeRadiusBonus = 0;
  let dmgBonusVsDebuffed = 0;
  let breakDmgBonus = 0;
  let startShieldRatio = 0;

  // 1. Equipped 4-slot gear + Set count
  const setCounts: Partial<Record<EquipmentSetId, number>> = {};
  const equippedUids = Object.values(owned.equippedGear).filter(Boolean) as string[];
  const gearMap = new Map(allEquipment.map((e) => [e.uid, e]));

  for (const uid of equippedUids) {
    const item = gearMap.get(uid);
    if (!item) continue;
    setCounts[item.setId] = (setCounts[item.setId] ?? 0) + 1;

    const mainVal = getEnhancedMainStatValue(item);
    switch (item.mainStat.stat) {
      case 'FLAT_ATK':
        flatAtk += mainVal;
        break;
      case 'FLAT_HP':
        flatHp += mainVal;
        break;
      case 'CRIT_RATE':
        critRate += mainVal;
        break;
      case 'HP_PCT':
        hpPct += mainVal;
        break;
      case 'HEAL_PCT':
        healBonus += mainVal;
        break;
      case 'CDR':
        cdr += mainVal;
        break;
    }

    for (const sub of item.subStats) {
      switch (sub.stat) {
        case 'ATK_PCT':
          atkPct += sub.value;
          break;
        case 'HP_PCT':
          hpPct += sub.value;
          break;
        case 'DEF_PCT':
          defPct += sub.value;
          break;
        case 'CRIT_RATE':
          critRate += sub.value;
          break;
        case 'CRIT_DMG':
          critDmg += sub.value;
          break;
        case 'ATK_SPD':
          atkSpeedBonus += sub.value;
          break;
        case 'CDR':
          cdr += sub.value;
          break;
        case 'HEAL_PCT':
          healBonus += sub.value;
          break;
      }
    }
  }

  // 2. Active Equipment Set Bonuses (2pc & 4pc)
  const activeSets: Array<{ setId: EquipmentSetId; count: number }> = [];
  for (const [setId, count] of Object.entries(setCounts) as Array<[EquipmentSetId, number]>) {
    if (count >= 2) {
      activeSets.push({ setId, count });
      if (setId === 'VANGUARD') {
        atkPct += 0.12;
        if (count >= 4) dmgBonusVsDebuffed += 0.2;
      } else if (setId === 'CHRONO') {
        cdr += 0.1;
      } else if (setId === 'ASHEN_FURY') {
        critRate += 0.1;
      } else if (setId === 'AEGIS_BASTION') {
        hpPct += 0.15;
        defPct += 0.15;
        if (count >= 4) shieldPower += 0.25;
      } else if (setId === 'ASTRAL_SURGE') {
        skillDmgBonus += 0.15;
        if (count >= 4) {
          ultGaugeBonus += 0.2;
          ultDmgBonus += 0.2;
        }
      } else if (setId === 'VERDANT_GRACE') {
        healBonus += 0.15;
      }
    }
  }

  // 3. Starlight Relic Bonus (scales +15% per Refinement Rank R1..R5!)
  if (owned.equippedRelicId) {
    const relic = RELIC_MAP[owned.equippedRelicId];
    if (relic) {
      const rank = Math.max(1, Math.min(5, relicRanks[relic.id] ?? 1));
      const rankMult = 1 + 0.15 * (rank - 1);
      if (relic.bonuses.hp) flatHp += Math.round(relic.bonuses.hp * rankMult);
      if (relic.bonuses.atk) flatAtk += Math.round(relic.bonuses.atk * rankMult);
      if (relic.bonuses.def) flatDef += Math.round(relic.bonuses.def * rankMult);
      if (relic.bonuses.critRate) critRate += relic.bonuses.critRate * rankMult;
      if (relic.bonuses.critDmg) critDmg += relic.bonuses.critDmg * rankMult;
      if (relic.bonuses.atkSpeed) atkSpeedBonus += relic.bonuses.atkSpeed * rankMult;
      if (relic.bonuses.startingGauge) {
        startingGauge += Math.round(relic.bonuses.startingGauge * rankMult);
      }
      if (relic.bonuses.aoeRadiusBonus) aoeRadiusBonus += relic.bonuses.aoeRadiusBonus * rankMult;
      if (relic.bonuses.shieldBonus) shieldPower += relic.bonuses.shieldBonus * rankMult;
      if (relic.bonuses.dmgBonusVsDebuffed) {
        dmgBonusVsDebuffed += relic.bonuses.dmgBonusVsDebuffed * rankMult;
      }
      if (relic.bonuses.healBonus) healBonus += relic.bonuses.healBonus * rankMult;
      if (relic.id === 'relic_prism_aegis') {
        startShieldRatio = Math.max(startShieldRatio, 0.15 * rankMult);
      }
    }
  }

  // 4. Squad Faction Synergy Bonus (2-Hero / 3-Hero / 4-Faction Harmony!)
  if (isFourFactionHarmony(squadIds)) {
    atkPct += 0.1;
    hpPct += 0.1;
    defPct += 0.1;
  } else {
    const factionBonuses = getActiveFactionBonuses(squadIds);
    for (const fb of factionBonuses) {
      if (fb.faction === 'SOLARIS') {
        atkPct += fb.tier === 3 ? 0.2 : 0.1;
        if (fb.tier === 3) startShieldRatio = Math.max(startShieldRatio, 0.15);
      } else if (fb.faction === 'ASTRAL') {
        skillDmgBonus += fb.tier === 3 ? 0.25 : 0.12;
        if (fb.tier === 3) ultGaugeBonus += 0.15;
      } else if (fb.faction === 'VERDANT') {
        hpPct += 0.12;
        if (fb.tier === 3) {
          healBonus += 0.2;
          spRegenBonus += 0.1;
        }
      } else if (fb.faction === 'ASHEN') {
        critRate += fb.tier === 3 ? 0.15 : 0.08;
        breakDmgBonus += fb.tier === 3 ? 0.25 : 0.15;
        if (fb.tier === 3) defIgnore += 0.15;
      }
    }
  }

  const maxHp = Math.round(flatHp * (1 + hpPct));
  const atk = Math.round(flatAtk * (1 + atkPct));
  const def = Math.round(flatDef * (1 + defPct));
  const clampedCrit = Math.min(0.95, Math.max(0.05, critRate));
  const clampedCdr = Math.min(0.45, cdr);
  const atkSpeed = Number((heroDef.baseStats.atkSpeed * (1 + atkSpeedBonus)).toFixed(2));

  const powerRating = Math.round(
    maxHp * 0.24 +
      atk * 3.4 +
      def * 2.4 +
      clampedCrit * 950 +
      critDmg * 280 +
      owned.awakening * 480 +
      (owned.equippedRelicId ? 450 * (relicRanks[owned.equippedRelicId] ?? 1) : 0),
  );

  return {
    maxHp,
    atk,
    def,
    critRate: clampedCrit,
    critDmg,
    atkSpeed,
    moveSpeed: heroDef.baseStats.moveSpeed,
    attackRange: heroDef.baseStats.attackRange,
    cdr: clampedCdr,
    healBonus,
    skillDmgBonus,
    ultDmgBonus,
    shieldPower,
    defIgnore,
    spRegenBonus,
    ultGaugeBonus,
    startingGauge,
    aoeRadiusBonus,
    dmgBonusVsDebuffed,
    breakDmgBonus,
    startShieldRatio,
    activeSets,
    powerRating,
  };
}

export interface DamageRollParams {
  effectiveAtk: number;
  multiplier: number;
  targetDef: number;
  defShred?: number;
  defIgnore?: number;
  critRate: number;
  critDmg: number;
  dmgBonus?: number;
  isBroken?: boolean;
  isTrueDamage?: boolean;
}

export function calculateCombatDamage(p: DamageRollParams): {
  damage: number;
  isCrit: boolean;
} {
  const totalShred = Math.min(0.85, (p.defShred ?? 0) + (p.defIgnore ?? 0));
  const defEff = p.isTrueDamage ? 0 : Math.max(0, p.targetDef * (1 - totalShred));
  const mitigation = 1000 / (1000 + defEff);
  const baseDamage = p.effectiveAtk * p.multiplier * mitigation;

  const isCrit = !p.isTrueDamage && Math.random() < p.critRate;
  const critMult = isCrit ? p.critDmg : 1.0;
  const brokenBonus = p.isBroken ? 0.5 : 0;
  const variance = 0.96 + Math.random() * 0.08;

  const finalDamage = Math.max(
    1,
    Math.round(baseDamage * critMult * (1 + (p.dmgBonus ?? 0) + brokenBonus) * variance),
  );
  return { damage: finalDamage, isCrit };
}

export function calculateHealAmount(
  healerAtk: number,
  healMult: number,
  healBonus: number,
): number {
  return Math.max(1, Math.round(healerAtk * healMult * (1 + healBonus)));
}

export function calculateShieldAmount(
  casterMaxHp: number,
  shieldRatio: number,
  shieldPower: number,
): number {
  return Math.max(1, Math.round(casterMaxHp * shieldRatio * shieldPower));
}
