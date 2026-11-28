import type { CommissionReward } from './commissions';

export interface CheckInDayDef {
  day: 1 | 2 | 3 | 4 | 5 | 6 | 7;
  title: string;
  subtitle: string;
  highlight?: boolean;
  accentColor: string;
  allFactionEssences?: number;
  reward: CommissionReward;
}

export const STARFALL_CHECKIN_DAYS: CheckInDayDef[] = [
  {
    day: 1,
    title: 'Dawnlight Gift',
    subtitle: 'Commander Welcome Supply',
    accentColor: '#38e8ff',
    reward: {
      crystals: 240,
      gold: 4000,
      expPotions: 6,
    },
  },
  {
    day: 2,
    title: 'Anvil Provisions',
    subtitle: 'Blacksmith Enhancement Pack',
    accentColor: '#a78bfa',
    reward: {
      forgeStones: 8,
      starIronIngots: 3,
      gold: 5000,
    },
  },
  {
    day: 3,
    title: 'Rift Explorer',
    subtitle: 'Dungeon & Awakening Kit',
    accentColor: '#34d399',
    reward: {
      crystals: 320,
      dungeonTickets: 2,
      starCores: 2,
    },
  },
  {
    day: 4,
    title: 'Four-Pillar Tribute',
    subtitle: 'All-Faction Awakening Essences',
    accentColor: '#f5c84c',
    allFactionEssences: 4,
    reward: {
      gold: 8000,
      bondGifts: 4,
    },
  },
  {
    day: 5,
    title: 'Relic Vault Key',
    subtitle: 'Relic Refinement & Reforge',
    accentColor: '#fb923c',
    reward: {
      crystals: 400,
      relicFragments: 10,
      astralAnvilCores: 2,
    },
  },
  {
    day: 6,
    title: 'Astral Forgemaster',
    subtitle: 'Endgame Gear & Cores',
    accentColor: '#e879f9',
    reward: {
      astralAnvilCores: 4,
      starCores: 4,
      gearCrateRarity: 'EPIC',
    },
  },
  {
    day: 7,
    title: 'Grand Starfall Jackpot',
    subtitle: '10× Summon Crystals + Legendary Relic Crate',
    highlight: true,
    accentColor: '#fde047',
    reward: {
      crystals: 1600,
      starCores: 4,
      astralAnvilCores: 4,
      gearCrateRarity: 'LEGENDARY',
    },
  },
];

export function formatCheckInDayTags(def: CheckInDayDef): string[] {
  const tags: string[] = [];
  if (def.reward.crystals) tags.push(`+${def.reward.crystals.toLocaleString()} Crystals`);
  if (def.reward.gold) tags.push(`+${def.reward.gold.toLocaleString()}g`);
  if (def.reward.expPotions) tags.push(`×${def.reward.expPotions} EXP`);
  if (def.reward.forgeStones) tags.push(`×${def.reward.forgeStones} Stones`);
  if (def.reward.starIronIngots) tags.push(`×${def.reward.starIronIngots} Ingots`);
  if (def.reward.astralAnvilCores) tags.push(`×${def.reward.astralAnvilCores} Anvil Cores`);
  if (def.reward.starCores) tags.push(`×${def.reward.starCores} Star Cores`);
  if (def.allFactionEssences) tags.push(`×${def.allFactionEssences} All Essences`);
  if (def.reward.relicFragments) tags.push(`×${def.reward.relicFragments} Relic Frags`);
  if (def.reward.bondGifts) tags.push(`×${def.reward.bondGifts} Bond Gifts`);
  if (def.reward.dungeonTickets) tags.push(`×${def.reward.dungeonTickets} Rift Tickets`);
  if (def.reward.gearCrateRarity) tags.push(`${def.reward.gearCrateRarity} Gear Crate`);
  return tags;
}

export function resolveCheckInStatus(
  cycle: number | undefined,
  claimedDays: number[] | undefined,
  lastClaimDate: string | undefined,
  todayKey: string,
): {
  activeCycle: number;
  claimedInCycle: number[];
  claimedToday: boolean;
  nextClaimableDay: number | null;
  canClaimToday: boolean;
} {
  const baseCycle = Math.max(1, cycle ?? 1);
  const rawClaimed = Array.isArray(claimedDays) ? claimedDays : [];
  const claimedToday = lastClaimDate === todayKey;

  // If all 7 days of the previous cycle were claimed on an earlier day, roll over cleanly to next cycle!
  if (rawClaimed.length >= 7 && !claimedToday) {
    return {
      activeCycle: baseCycle + 1,
      claimedInCycle: [],
      claimedToday: false,
      nextClaimableDay: 1,
      canClaimToday: true,
    };
  }

  const nextDay = rawClaimed.length < 7 ? rawClaimed.length + 1 : null;
  return {
    activeCycle: baseCycle,
    claimedInCycle: rawClaimed,
    claimedToday,
    nextClaimableDay: claimedToday ? null : nextDay,
    canClaimToday: !claimedToday && nextDay !== null,
  };
}
