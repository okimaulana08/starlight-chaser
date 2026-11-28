import type { PlayerSaveState } from '../types/game';

export interface CommissionReward {
  gold?: number;
  crystals?: number;
  expPotions?: number;
  forgeStones?: number;
  starIronIngots?: number;
  starCores?: number;
  relicFragments?: number;
  bondGifts?: number;
  dungeonTickets?: number;
  gearCrateRarity?: 'EPIC' | 'LEGENDARY';
}

export interface DailyCommissionDef {
  id: string;
  title: string;
  desc: string;
  target: number;
  activityPoints: number;
  reward: CommissionReward;
}

export interface ActivityMilestoneDef {
  points: number;
  label: string;
  reward: CommissionReward;
}

export interface PermanentCommissionDef {
  id: string;
  title: string;
  desc: string;
  target: number;
  getProgress: (state: PlayerSaveState) => number;
  reward: CommissionReward;
}

export const DAILY_COMMISSIONS: DailyCommissionDef[] = [
  {
    id: 'daily_clear_battles',
    title: 'Frontline Expedition',
    desc: 'Clear or Quick Sweep 3 Campaign, Dungeon, or Spire battles',
    target: 3,
    activityPoints: 20,
    reward: { gold: 1800, expPotions: 3 },
  },
  {
    id: 'daily_boss_break',
    title: 'Shatter the Guard',
    desc: 'Trigger 2 Boss or Elite Stagger Breaks in combat',
    target: 2,
    activityPoints: 20,
    reward: { forgeStones: 5, starCores: 1 },
  },
  {
    id: 'daily_link_burst',
    title: 'Starlight Synergy',
    desc: 'Chain 2 Starlight Link Bursts (Dual Ultimate combos)',
    target: 2,
    activityPoints: 20,
    reward: { crystals: 80, bondGifts: 1 },
  },
  {
    id: 'daily_forge_gear',
    title: 'Blacksmith Mastery',
    desc: 'Enhance or Auto-Equip Gear 1 time in the Forge',
    target: 1,
    activityPoints: 15,
    reward: { forgeStones: 4, starIronIngots: 1 },
  },
  {
    id: 'daily_summon_or_supply',
    title: 'Starfall Dispatch',
    desc: 'Perform 1 Summon or Claim Daily Supply Dispatch',
    target: 1,
    activityPoints: 15,
    reward: { crystals: 60, dungeonTickets: 1 },
  },
  {
    id: 'daily_spire_ascent',
    title: 'Spire Challenger',
    desc: 'Clear 1 Astral Spire Floor or claim Daily Spire Tribute',
    target: 1,
    activityPoints: 20,
    reward: { crystals: 100, relicFragments: 3 },
  },
];

export const DAILY_ACTIVITY_MILESTONES: ActivityMilestoneDef[] = [
  {
    points: 25,
    label: 'Initiate Crate',
    reward: { gold: 2500, expPotions: 4 },
  },
  {
    points: 50,
    label: 'Vanguard Chest',
    reward: { crystals: 120, forgeStones: 6 },
  },
  {
    points: 75,
    label: 'Starlight Cache',
    reward: { crystals: 160, dungeonTickets: 1, starCores: 1 },
  },
  {
    points: 100,
    label: 'Celestial Grand Chest',
    reward: { crystals: 320, relicFragments: 4, gearCrateRarity: 'EPIC' },
  },
];

export const PERMANENT_COMMISSIONS: PermanentCommissionDef[] = [
  {
    id: 'perm_clear_5_stages',
    title: 'Aurelia Liberator',
    desc: 'Clear 5 Campaign Stages across Aetheria',
    target: 5,
    getProgress: (s) => s.clearedStages.length,
    reward: { crystals: 240, gold: 3500 },
  },
  {
    id: 'perm_spire_floor_5',
    title: 'Spire Initiate',
    desc: 'Conquer Astral Spire Floor 5 Boss',
    target: 5,
    getProgress: (s) => s.spireHighestFloor ?? 0,
    reward: { crystals: 320, starCores: 2, relicFragments: 5 },
  },
  {
    id: 'perm_spire_floor_15',
    title: 'Astral Climber',
    desc: 'Conquer Astral Spire Floor 15 Boss',
    target: 15,
    getProgress: (s) => s.spireHighestFloor ?? 0,
    reward: { crystals: 640, starCores: 4, gearCrateRarity: 'LEGENDARY' },
  },
  {
    id: 'perm_awaken_star_2',
    title: 'Awakened Resonance',
    desc: 'Awaken any Chaser Hero to ★2 or higher',
    target: 2,
    getProgress: (s) => Math.max(0, ...Object.values(s.roster).map((h) => h.awakening)),
    reward: { crystals: 240, starCores: 3 },
  },
  {
    id: 'perm_codex_15',
    title: 'Lore Archivist',
    desc: 'Unlock 15 Entries in the Starlight Codex',
    target: 15,
    getProgress: (s) => s.unlockedCodexIds.length,
    reward: { crystals: 320, bondGifts: 3 },
  },
  {
    id: 'perm_link_burst_10',
    title: 'Link Burst Virtuoso',
    desc: 'Trigger 10 Lifetime Starlight Link Bursts in Combat',
    target: 10,
    getProgress: (s) => s.lifetimeLinkBursts ?? 0,
    reward: { crystals: 400, dungeonTickets: 2 },
  },
  {
    id: 'perm_hard_world_ch1',
    title: 'Crimson Rift Pioneer',
    desc: 'Conquer World Level 2 (Hard) Chapter 1 Boss (H 1-12)',
    target: 1,
    getProgress: (s) => (s.clearedStages.includes('hard__stage_1_12') ? 1 : 0),
    reward: { crystals: 480, starCores: 4, gearCrateRarity: 'LEGENDARY' },
  },
  {
    id: 'perm_hell_world_ch1',
    title: 'Abyssal Zenith Sovereign',
    desc: 'Conquer World Level 3 (Hell) Chapter 1 Boss (X 1-12)',
    target: 1,
    getProgress: (s) => (s.clearedStages.includes('hell__stage_1_12') ? 1 : 0),
    reward: { crystals: 800, starCores: 8, relicFragments: 15, gearCrateRarity: 'LEGENDARY' },
  },
];

export function computeDailyActivityPoints(claimedDailyIds: string[]): number {
  let pts = 0;
  for (const c of DAILY_COMMISSIONS) {
    if (claimedDailyIds.includes(c.id)) pts += c.activityPoints;
  }
  return Math.min(100, pts);
}

export function formatCommissionRewardTags(r: CommissionReward): string[] {
  const tags: string[] = [];
  if (r.crystals) tags.push(`+${r.crystals} Crystals`);
  if (r.gold) tags.push(`+${r.gold.toLocaleString()}g`);
  if (r.expPotions) tags.push(`×${r.expPotions} EXP`);
  if (r.forgeStones) tags.push(`×${r.forgeStones} Stones`);
  if (r.starIronIngots) tags.push(`×${r.starIronIngots} Ingots`);
  if (r.starCores) tags.push(`×${r.starCores} Star Cores`);
  if (r.relicFragments) tags.push(`×${r.relicFragments} Relic Frags`);
  if (r.bondGifts) tags.push(`×${r.bondGifts} Bond`);
  if (r.dungeonTickets) tags.push(`×${r.dungeonTickets} Rift Ticket`);
  if (r.gearCrateRarity) tags.push(`${r.gearCrateRarity} Gear Crate`);
  return tags;
}
