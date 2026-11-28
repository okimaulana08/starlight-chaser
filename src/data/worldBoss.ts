import type { CommissionReward } from './commissions';
import type { Faction, RaidDifficultyTier, StageDef, WorldBossId } from '../types/game';

export const DAILY_RAID_ATTEMPTS = 3;
export const RAID_TIME_LIMIT_SEC = 90;

export interface WorldBossDef {
  id: WorldBossId;
  enemyId: string;
  name: string;
  title: string;
  subtitle: string;
  lore: string;
  themeColor: string;
  spriteAsset: string;
  arenaAsset: string;
  weakFactions: [Faction, Faction];
  signatureMechanic: string;
  baseBarHp: number;
  baseEnemyScale: number;
}

export const WORLD_BOSSES: WorldBossDef[] = [
  {
    id: 'helios',
    enemyId: 'raid_helios_prime',
    name: 'Helios-Prime',
    title: 'The Shattered Sun-Engine',
    subtitle: 'Solaris Orbital War-Colossus',
    lore: 'Awakened atop the Sundered Eclipse Colosseum, Helios-Prime channels fractured First Pillar radiance into searing orbital rays. Astral & Ashen Chasers pierce its gilded reactor plating.',
    themeColor: '#f5c84c',
    spriteAsset: '/assets/enemies/boss_raid_helios.webp',
    arenaAsset: '/assets/environments/env_world_boss_raid.webp',
    weakFactions: ['ASTRAL', 'ASHEN'],
    signatureMechanic: 'Astral & Ashen heroes deal +35% Bonus DMG & +25% Break DMG. Each shattered HP bar grants +20 Ult Gauge & +2 SP!',
    baseBarHp: 140000,
    baseEnemyScale: 1.45,
  },
  {
    id: 'nihilus',
    enemyId: 'raid_nihilus_rex',
    name: 'Nihilus-Rex',
    title: 'Devourer of Star-Lanes',
    subtitle: 'Abyssal Void Dragon-Leviathan',
    lore: 'Emerging from the crimson rift beyond Shattered Zenith, Nihilus-Rex feasts on broken starlight. Solaris Vanguard blades and Verdant Sanctuary blessings sever its void armor.',
    themeColor: '#c084fc',
    spriteAsset: '/assets/enemies/boss_raid_nihilus.webp',
    arenaAsset: '/assets/environments/env_world_boss_raid.webp',
    weakFactions: ['SOLARIS', 'VERDANT'],
    signatureMechanic: 'Solaris & Verdant heroes deal +35% Bonus DMG & +25% Break DMG. Chaining Link Bursts accelerates Bar Overdrive!',
    baseBarHp: 148000,
    baseEnemyScale: 1.52,
  },
  {
    id: 'ignis',
    enemyId: 'raid_ignis_valkyr',
    name: 'Ignis-Valkyr',
    title: 'Three-Crowned Caldera Sovereign',
    subtitle: 'Tri-Elemental Hydra Calamity',
    lore: 'Forged where volcanic magma, glacial frost, and storm lightning collide. Astral precision and Verdant sustain are key to surviving its escalating elemental barrage.',
    themeColor: '#fb923c',
    spriteAsset: '/assets/enemies/boss_raid_ignis.webp',
    arenaAsset: '/assets/environments/env_world_boss_raid.webp',
    weakFactions: ['ASTRAL', 'VERDANT'],
    signatureMechanic: 'Astral & Verdant heroes deal +35% Bonus DMG & +25% Break DMG. Break Gauge resets every Bar Clear for huge burst windows!',
    baseBarHp: 155000,
    baseEnemyScale: 1.58,
  },
];

export const WORLD_BOSS_MAP: Record<WorldBossId, WorldBossDef> = {
  helios: WORLD_BOSSES[0],
  nihilus: WORLD_BOSSES[1],
  ignis: WORLD_BOSSES[2],
};

export interface RaidTierConfig {
  tier: RaidDifficultyTier;
  label: string;
  subtitle: string;
  recommendedPower: number;
  enemyScaleMult: number;
  scoreMultiplier: number;
  color: string;
}

export const RAID_TIER_CONFIGS: RaidTierConfig[] = [
  {
    tier: 1,
    label: 'Vanguard Raid',
    subtitle: 'Standard 1.0× Score',
    recommendedPower: 22000,
    enemyScaleMult: 0.72,
    scoreMultiplier: 1.0,
    color: '#38e8ff',
  },
  {
    tier: 2,
    label: 'Cataclysm Raid',
    subtitle: '1.35× Score Multiplier',
    recommendedPower: 85000,
    enemyScaleMult: 1.35,
    scoreMultiplier: 1.35,
    color: '#fb923c',
  },
  {
    tier: 3,
    label: 'Sovereign Abyss',
    subtitle: '1.85× Score Multiplier',
    recommendedPower: 220000,
    enemyScaleMult: 2.35,
    scoreMultiplier: 1.85,
    color: '#f43f5e',
  },
];

export interface RaidRankDef {
  id: string;
  label: string;
  minScore: number;
  color: string;
  badgeBg: string;
}

export const RAID_SCORE_RANKS: RaidRankDef[] = [
  { id: 'UNRANKED', label: 'Challenger', minScore: 0, color: '#94a3b8', badgeBg: 'rgba(51,65,85,0.4)' },
  { id: 'BRONZE', label: 'Bronze', minScore: 50000, color: '#d97706', badgeBg: 'rgba(180,83,9,0.35)' },
  { id: 'SILVER', label: 'Silver', minScore: 150000, color: '#cbd5e1', badgeBg: 'rgba(148,163,184,0.3)' },
  { id: 'GOLD', label: 'Gold', minScore: 400000, color: '#f5c84c', badgeBg: 'rgba(245,200,76,0.28)' },
  { id: 'PLATINUM', label: 'Platinum', minScore: 900000, color: '#38e8ff', badgeBg: 'rgba(56,232,255,0.28)' },
  { id: 'DIAMOND', label: 'Diamond', minScore: 2000000, color: '#e879f9', badgeBg: 'rgba(232,121,249,0.28)' },
  { id: 'SOVEREIGN', label: 'Sovereign', minScore: 4500000, color: '#fde047', badgeBg: 'rgba(253,224,71,0.35)' },
];

export interface RaidScoreMilestone {
  score: number;
  rankLabel: string;
  color: string;
  reward: CommissionReward;
}

export const WEEKLY_RAID_MILESTONES: RaidScoreMilestone[] = [
  {
    score: 50000,
    rankLabel: 'Bronze',
    color: '#d97706',
    reward: { crystals: 160, gold: 10000, forgeStones: 8 },
  },
  {
    score: 150000,
    rankLabel: 'Silver',
    color: '#cbd5e1',
    reward: { crystals: 240, starIronIngots: 4, relicFragments: 6 },
  },
  {
    score: 400000,
    rankLabel: 'Gold',
    color: '#f5c84c',
    reward: { crystals: 320, astralAnvilCores: 3, starCores: 3 },
  },
  {
    score: 900000,
    rankLabel: 'Platinum',
    color: '#38e8ff',
    reward: { crystals: 400, astralAnvilCores: 4, relicFragments: 10, dungeonTickets: 2 },
  },
  {
    score: 2000000,
    rankLabel: 'Diamond',
    color: '#e879f9',
    reward: { crystals: 560, astralAnvilCores: 6, starCores: 6, gearCrateRarity: 'LEGENDARY' },
  },
  {
    score: 4500000,
    rankLabel: 'Sovereign',
    color: '#fde047',
    reward: { crystals: 800, astralAnvilCores: 10, starCores: 8, relicFragments: 20, gearCrateRarity: 'LEGENDARY' },
  },
];

export function getFeaturedWorldBossId(weekKey: string): WorldBossId {
  const m = weekKey.match(/W(\d+)$/);
  const wk = m ? Number(m[1]) : 1;
  const order: WorldBossId[] = ['helios', 'nihilus', 'ignis'];
  return order[Math.abs(wk) % order.length];
}

export function getRaidRankForScore(score: number): RaidRankDef {
  let rank = RAID_SCORE_RANKS[0];
  for (const r of RAID_SCORE_RANKS) {
    if (score >= r.minScore) rank = r;
  }
  return rank;
}

export function encodeWorldBossStageId(bossId: WorldBossId, tier: RaidDifficultyTier): string {
  return `raid__${bossId}__${tier}`;
}

export function parseWorldBossStageId(
  stageId: string,
): { bossId: WorldBossId; tier: RaidDifficultyTier } | null {
  if (!stageId.startsWith('raid__')) return null;
  const parts = stageId.split('__');
  const bossId = parts[1] as WorldBossId;
  const tierNum = Number(parts[2]);
  if (!WORLD_BOSS_MAP[bossId]) return null;
  const tier: RaidDifficultyTier = tierNum === 3 ? 3 : tierNum === 2 ? 2 : 1;
  return { bossId, tier };
}

export function buildWorldBossStageDef(
  bossId: WorldBossId,
  tier: RaidDifficultyTier,
  isFeaturedWeekly = false,
): StageDef {
  const boss = WORLD_BOSS_MAP[bossId];
  const tierCfg = RAID_TIER_CONFIGS.find((t) => t.tier === tier) ?? RAID_TIER_CONFIGS[0];
  const scoreMult = Number((tierCfg.scoreMultiplier * (isFeaturedWeekly ? 1.25 : 1.0)).toFixed(2));

  return {
    id: encodeWorldBossStageId(bossId, tier),
    regionId: 'endgame_raid',
    stageNumber: tier,
    code: `RAID T${tier}`,
    name: `${boss.name} — ${tierCfg.label}`,
    chapter: 10,
    subtitle: `${boss.title} • 90s Score Attack (${scoreMult}× Score)`,
    recommendedPower: tierCfg.recommendedPower,
    description: boss.signatureMechanic,
    enemyScale: Number((boss.baseEnemyScale * tierCfg.enemyScaleMult).toFixed(2)),
    isBossStage: true,
    isWorldBoss: true,
    worldBossId: bossId,
    raidWeakFactions: [...boss.weakFactions],
    raidTimeLimitSec: RAID_TIME_LIMIT_SEC,
    raidScoreMultiplier: scoreMult,
    bossNameOverride: boss.name,
    bossTitleOverride: boss.title,
    bossAssetOverride: boss.spriteAsset,
    arenaAsset: boss.arenaAsset,
    arenaTintHex: 0x3b1024,
    ambientMoteColors: [0xf5c84c, 0xf43f5e],
    waves: [
      {
        label: `ABYSSAL WORLD BOSS — ${boss.name.toUpperCase()}`,
        spawns: [{ enemyId: boss.enemyId, count: 1 }],
      },
    ],
    firstClearCrystals: 0,
    repeatCrystals: 0,
    rewards: {
      gold: [6000 * tier, 9500 * tier],
      expPotions: [4 * tier, 7 * tier],
      forgeStones: [5 * tier, 9 * tier],
      starIronIngots: [1 * tier, 3 * tier],
      astralAnvilCores: tier >= 2 ? [1, tier] : [0, 1],
      starCores: [1, 1 + tier],
      relicFragments: [3 * tier, 5 * tier],
      primaryEssence: boss.weakFactions[0],
      primaryEssenceQty: [2 * tier, 4 * tier],
      targetSetIds: ['VANGUARD', 'ASTRAL_SURGE', 'ASHEN_FURY', 'CHRONO'],
      equipmentDrops: tier >= 2 ? 2 : 1,
      rarityWeights:
        tier === 3
          ? { COMMON: 0, RARE: 0, EPIC: 45, LEGENDARY: 55 }
          : tier === 2
            ? { COMMON: 0, RARE: 20, EPIC: 55, LEGENDARY: 25 }
            : { COMMON: 0, RARE: 55, EPIC: 38, LEGENDARY: 7 },
    },
  };
}
