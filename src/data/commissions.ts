import type { PlayerSaveState } from '../types/game';

export interface CommissionReward {
  gold?: number;
  crystals?: number;
  expPotions?: number;
  forgeStones?: number;
  starIronIngots?: number;
  astralAnvilCores?: number;
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

export interface WeeklyCommissionDef {
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
  category?: 'CAMPAIGN' | 'SPIRE' | 'DUNGEON' | 'GROWTH';
  getProgress: (state: PlayerSaveState) => number;
  reward: CommissionReward;
}

/**
 * Local Monday-start week key (e.g. "2026-W48") so Weekly Commissions
 * cleanly reset every Monday at 00:00 local time.
 */
export function getCurrentWeekKey(now: Date = new Date()): string {
  const d = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const day = d.getDay() || 7; // Monday = 1 .. Sunday = 7
  d.setDate(d.getDate() + 4 - day); // Nearest Thursday decides ISO week year
  const yearStart = new Date(d.getFullYear(), 0, 1);
  const weekNo = Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
  return `${d.getFullYear()}-W${String(weekNo).padStart(2, '0')}`;
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
    desc: 'Enhance, Reforge, or Auto-Equip Gear 1 time in the Forge',
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

export const WEEKLY_COMMISSIONS: WeeklyCommissionDef[] = [
  {
    id: 'weekly_clear_battles',
    title: 'Aetheria Veteran',
    desc: 'Clear or Quick Sweep 15 battles across Campaign, Dungeons, or Spire',
    target: 15,
    activityPoints: 20,
    reward: { gold: 12000, expPotions: 10, forgeStones: 10 },
  },
  {
    id: 'weekly_dungeon_runs',
    title: 'Rift Delver',
    desc: 'Clear or Quick Sweep 8 Rift Farming Dungeon runs',
    target: 8,
    activityPoints: 20,
    reward: { crystals: 120, starIronIngots: 3, dungeonTickets: 2 },
  },
  {
    id: 'weekly_spire_climbs',
    title: 'Spire Ascendant',
    desc: 'Clear 5 Astral Spire floors or claim Daily Spire Tribute',
    target: 5,
    activityPoints: 20,
    reward: { crystals: 160, starCores: 3, relicFragments: 6 },
  },
  {
    id: 'weekly_forge_mastery',
    title: 'Astral Blacksmith',
    desc: 'Enhance, Reforge, or Auto-Equip Gear 5 times in the Forge',
    target: 5,
    activityPoints: 20,
    reward: { forgeStones: 8, starIronIngots: 3, astralAnvilCores: 2 },
  },
  {
    id: 'weekly_tactical_combos',
    title: 'Tactical Executioner',
    desc: 'Trigger 8 Boss Stagger Breaks or Starlight Link Bursts in combat',
    target: 8,
    activityPoints: 20,
    reward: { crystals: 140, bondGifts: 3, relicFragments: 5 },
  },
  {
    id: 'weekly_summon_dispatch',
    title: 'Starfall Commander',
    desc: 'Perform Summons or Claim Supply Dispatches 5 times',
    target: 5,
    activityPoints: 20,
    reward: { crystals: 160, starCores: 2, dungeonTickets: 2 },
  },
];

export const WEEKLY_ACTIVITY_MILESTONES: ActivityMilestoneDef[] = [
  {
    points: 25,
    label: 'Weekly Supply Crate',
    reward: { gold: 8000, expPotions: 12, forgeStones: 8 },
  },
  {
    points: 50,
    label: 'Rift Master Chest',
    reward: { crystals: 240, starIronIngots: 4, dungeonTickets: 2 },
  },
  {
    points: 75,
    label: 'Astral Forge Vault',
    reward: { crystals: 320, astralAnvilCores: 3, starCores: 4, relicFragments: 8 },
  },
  {
    points: 100,
    label: 'Sovereign Weekly Chest',
    reward: {
      crystals: 480,
      astralAnvilCores: 5,
      relicFragments: 12,
      gearCrateRarity: 'LEGENDARY',
    },
  },
];

function getHighestThreeStarDungeonTier(state: PlayerSaveState): number {
  let best = 0;
  for (const [key, stars] of Object.entries(state.dungeonBestStars ?? {})) {
    if (stars < 3) continue;
    const m = key.match(/_t(\d+)$/);
    if (m) {
      const tier = Number(m[1]);
      if (Number.isFinite(tier) && tier > best) best = tier;
    }
  }
  return best;
}

export const PERMANENT_COMMISSIONS: PermanentCommissionDef[] = [
  {
    id: 'perm_clear_5_stages',
    title: 'Aurelia Liberator',
    desc: 'Clear 5 Campaign Stages across Aetheria',
    target: 5,
    category: 'CAMPAIGN',
    getProgress: (s) => s.clearedStages.length,
    reward: { crystals: 240, gold: 3500 },
  },
  {
    id: 'perm_spire_floor_5',
    title: 'Spire Initiate',
    desc: 'Conquer Astral Spire Floor 5 Boss',
    target: 5,
    category: 'SPIRE',
    getProgress: (s) => s.spireHighestFloor ?? 0,
    reward: { crystals: 320, starCores: 2, relicFragments: 5 },
  },
  {
    id: 'perm_spire_floor_15',
    title: 'Astral Climber',
    desc: 'Conquer Astral Spire Floor 15 Boss',
    target: 15,
    category: 'SPIRE',
    getProgress: (s) => s.spireHighestFloor ?? 0,
    reward: { crystals: 640, starCores: 4, gearCrateRarity: 'LEGENDARY' },
  },
  {
    id: 'perm_awaken_star_2',
    title: 'Awakened Resonance',
    desc: 'Awaken any Chaser Hero to ★2 or higher',
    target: 2,
    category: 'GROWTH',
    getProgress: (s) => Math.max(0, ...Object.values(s.roster).map((h) => h.awakening)),
    reward: { crystals: 240, starCores: 3 },
  },
  {
    id: 'perm_codex_15',
    title: 'Lore Archivist',
    desc: 'Unlock 15 Entries in the Starlight Codex',
    target: 15,
    category: 'GROWTH',
    getProgress: (s) => s.unlockedCodexIds.length,
    reward: { crystals: 320, bondGifts: 3 },
  },
  {
    id: 'perm_link_burst_10',
    title: 'Link Burst Virtuoso',
    desc: 'Trigger 10 Lifetime Starlight Link Bursts in Combat',
    target: 10,
    category: 'CAMPAIGN',
    getProgress: (s) => s.lifetimeLinkBursts ?? 0,
    reward: { crystals: 400, dungeonTickets: 2 },
  },
  {
    id: 'perm_clear_normal_ch10',
    title: 'Dawnlight Champion',
    desc: 'Defeat World Level 1 (Normal) Chapter 10 Final Boss (10-12)',
    target: 1,
    category: 'CAMPAIGN',
    getProgress: (s) => (s.clearedStages.includes('stage_10_12') ? 1 : 0),
    reward: { crystals: 640, starCores: 5, gearCrateRarity: 'LEGENDARY' },
  },
  {
    id: 'perm_hard_world_ch1',
    title: 'Crimson Rift Pioneer',
    desc: 'Conquer World Level 2 (Hard) Chapter 1 Boss (H 1-12)',
    target: 1,
    category: 'CAMPAIGN',
    getProgress: (s) => (s.clearedStages.includes('hard__stage_1_12') ? 1 : 0),
    reward: { crystals: 480, starCores: 4, gearCrateRarity: 'LEGENDARY' },
  },
  {
    id: 'perm_clear_hard_ch10',
    title: 'Twilight Conqueror',
    desc: 'Defeat World Level 2 (Hard) Chapter 10 Final Boss (H 10-12)',
    target: 1,
    category: 'CAMPAIGN',
    getProgress: (s) => (s.clearedStages.includes('hard__stage_10_12') ? 1 : 0),
    reward: { crystals: 960, starCores: 8, astralAnvilCores: 5, gearCrateRarity: 'LEGENDARY' },
  },
  {
    id: 'perm_hell_world_ch1',
    title: 'Abyssal Zenith Sovereign',
    desc: 'Conquer World Level 3 (Hell) Chapter 1 Boss (X 1-12)',
    target: 1,
    category: 'CAMPAIGN',
    getProgress: (s) => (s.clearedStages.includes('hell__stage_1_12') ? 1 : 0),
    reward: { crystals: 800, starCores: 8, relicFragments: 15, gearCrateRarity: 'LEGENDARY' },
  },
  {
    id: 'perm_clear_hell_ch10',
    title: 'Blood-Eclipse Sovereign',
    desc: 'Defeat World Level 3 (Hell) Chapter 10 Final Boss (X 10-12)',
    target: 1,
    category: 'CAMPAIGN',
    getProgress: (s) => (s.clearedStages.includes('hell__stage_10_12') ? 1 : 0),
    reward: { crystals: 1600, starCores: 12, astralAnvilCores: 10, relicFragments: 20 },
  },
  {
    id: 'perm_spire_floor_40',
    title: 'Stratum I Conqueror',
    desc: 'Conquer Astral Spire Floor 40 Boss (Normal Stratum Summit)',
    target: 40,
    category: 'SPIRE',
    getProgress: (s) => s.spireHighestFloor ?? 0,
    reward: { crystals: 480, starCores: 4, astralAnvilCores: 3 },
  },
  {
    id: 'perm_spire_floor_80',
    title: 'Stratum II Vanquisher',
    desc: 'Conquer Astral Spire Floor 80 Boss (Hard Stratum Summit)',
    target: 80,
    category: 'SPIRE',
    getProgress: (s) => s.spireHighestFloor ?? 0,
    reward: { crystals: 800, starCores: 6, astralAnvilCores: 6, gearCrateRarity: 'LEGENDARY' },
  },
  {
    id: 'perm_spire_floor_120',
    title: 'Apex of the Astral Spire',
    desc: 'Defeat Abyssal Erebus at Astral Spire Floor 120 Summit',
    target: 120,
    category: 'SPIRE',
    getProgress: (s) => s.spireHighestFloor ?? 0,
    reward: { crystals: 1600, starCores: 12, astralAnvilCores: 12, relicFragments: 25 },
  },
  {
    id: 'perm_dungeon_t6',
    title: 'Twilight Rift Raider',
    desc: 'Achieve 3 Stars on any Rift Farming Dungeon Tier VI (TVI) or higher',
    target: 6,
    category: 'DUNGEON',
    getProgress: (s) => getHighestThreeStarDungeonTier(s),
    reward: { crystals: 400, starIronIngots: 4, dungeonTickets: 2 },
  },
  {
    id: 'perm_dungeon_t10',
    title: 'Abyssal Rift Master',
    desc: 'Achieve 3 Stars on any Rift Farming Dungeon Tier X (TX)',
    target: 10,
    category: 'DUNGEON',
    getProgress: (s) => getHighestThreeStarDungeonTier(s),
    reward: { crystals: 1000, astralAnvilCores: 8, relicFragments: 15, dungeonTickets: 3 },
  },
  {
    id: 'perm_first_constellation_3',
    title: 'Starlight Resonance',
    desc: 'Ignite any Chaser Hero to Constellation C3 or higher',
    target: 3,
    category: 'GROWTH',
    getProgress: (s) => Math.max(0, ...Object.values(s.roster).map((h) => h.constellation ?? 0)),
    reward: { crystals: 480, starCores: 4, bondGifts: 3 },
  },
  {
    id: 'perm_first_constellation_6',
    title: 'Celestial Zenith',
    desc: 'Ignite any Chaser Hero to Max Constellation C6',
    target: 6,
    category: 'GROWTH',
    getProgress: (s) => Math.max(0, ...Object.values(s.roster).map((h) => h.constellation ?? 0)),
    reward: { crystals: 1200, starCores: 8, astralAnvilCores: 6 },
  },
  {
    id: 'perm_first_transcend',
    title: 'Empyrean Ascension',
    desc: 'Transcend any UR or SSR Chaser Hero into their Sovereign Form',
    target: 1,
    category: 'GROWTH',
    getProgress: (s) => Object.values(s.roster).filter((h) => Boolean(h.transcended)).length,
    reward: { crystals: 1000, starCores: 6, astralAnvilCores: 6, gearCrateRarity: 'LEGENDARY' },
  },
  {
    id: 'perm_forge_max_15',
    title: 'Grandmaster Blacksmith',
    desc: 'Enhance any Equipment piece to Maximum +15 in the Forge',
    target: 15,
    category: 'GROWTH',
    getProgress: (s) => Math.max(0, ...s.equipmentInventory.map((e) => e.enhanceLevel ?? 0)),
    reward: { crystals: 400, astralAnvilCores: 4, forgeStones: 10 },
  },
];

export function computeDailyActivityPoints(claimedDailyIds: string[]): number {
  let pts = 0;
  for (const c of DAILY_COMMISSIONS) {
    if (claimedDailyIds.includes(c.id)) pts += c.activityPoints;
  }
  return Math.min(100, pts);
}

export function computeWeeklyActivityPoints(claimedWeeklyIds: string[]): number {
  let pts = 0;
  for (const c of WEEKLY_COMMISSIONS) {
    if (claimedWeeklyIds.includes(c.id)) pts += c.activityPoints;
  }
  return Math.min(100, pts);
}

export function formatCommissionRewardTags(r: CommissionReward): string[] {
  const tags: string[] = [];
  if (r.crystals) tags.push(`+${r.crystals.toLocaleString()} Crystals`);
  if (r.gold) tags.push(`+${r.gold.toLocaleString()}g`);
  if (r.expPotions) tags.push(`×${r.expPotions} EXP`);
  if (r.forgeStones) tags.push(`×${r.forgeStones} Stones`);
  if (r.starIronIngots) tags.push(`×${r.starIronIngots} Ingots`);
  if (r.astralAnvilCores) tags.push(`×${r.astralAnvilCores} Anvil Cores`);
  if (r.starCores) tags.push(`×${r.starCores} Star Cores`);
  if (r.relicFragments) tags.push(`×${r.relicFragments} Relic Frags`);
  if (r.bondGifts) tags.push(`×${r.bondGifts} Bond`);
  if (r.dungeonTickets) tags.push(`×${r.dungeonTickets} Rift Ticket`);
  if (r.gearCrateRarity) tags.push(`${r.gearCrateRarity} Gear Crate`);
  return tags;
}
