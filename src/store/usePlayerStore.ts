import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import {
  DAILY_ACTIVITY_MILESTONES,
  DAILY_COMMISSIONS,
  PERMANENT_COMMISSIONS,
  computeDailyActivityPoints,
  type CommissionReward,
} from '../data/commissions';
import {
  DAILY_DUNGEON_FREE_ENTRIES,
  buildDungeonStageDef,
  getDungeonTierStarKey,
} from '../data/dungeons';
import { createStarterEquipment, generateEquipment } from '../data/equipment';
import { HERO_MAP } from '../data/heroes';
import {
  REGION_CHEST_REWARDS,
  SHOP_OFFERS,
  getAwakeningCost,
  getExpToNextLevel,
  getHeroLevelCap,
  getLevelUpCost,
  getStageCombatHeroExp,
  type RegionChestRewardDef,
} from '../data/materials';
import { RELIC_MAP } from '../data/relics';
import { getStagesByRegion, STAGE_MAP } from '../data/stages';
import { computeHeroStats } from '../engine/CombatMath';
import {
  enhanceEquipmentItem,
  getEnhanceCost,
  getSalvageYield,
} from '../systems/ForgeSystem';
import { executeGachaPulls } from '../systems/GachaSystem';
import type {
  BannerDef,
  CombatLootSummary,
  DroppedRelicSummary,
  DungeonId,
  EquipmentInstance,
  EquipmentRarity,
  EquipmentSetId,
  EquipmentSlot,
  Faction,
  GachaPullResult,
  HeroBattleExpResult,
  OwnedHeroState,
  PartyPreset,
  PlayerSaveState,
} from '../types/game';

export interface CodexMilestone {
  threshold: number;
  crystals: number;
  label: string;
}

export const CODEX_MILESTONES: CodexMilestone[] = [
  { threshold: 5, crystals: 320, label: 'Starlight Initiate (+1% ATK / +1% HP)' },
  { threshold: 10, crystals: 480, label: 'Lore Chronicler (+2% ATK / +2% HP)' },
  { threshold: 15, crystals: 800, label: 'Pillar Archivist (+3% ATK / +3% HP)' },
  { threshold: 20, crystals: 1200, label: 'Shattered Sky Master (+4% ATK / +4% HP)' },
  { threshold: 30, crystals: 1600, label: 'Aetheria Grand Sage (+6% ATK / +6% HP)' },
  { threshold: 40, crystals: 2400, label: 'Complete Starfall Archive (+8% ATK / +8% HP)' },
];

export const DAILY_SUPPLY_COOLDOWN_MS = 4 * 60 * 60 * 1000; // 4 hours
export const SHOP_RESTOCK_GOLD_COST = 6000;
export const MAX_RELIC_RANK = 5;

function getTodayKey(): string {
  const d = new Date();
  return `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;
}

function createOwnedHero(heroId: string, level = 1): OwnedHeroState {
  return {
    heroId,
    level,
    exp: 0,
    awakening: 0,
    shards: 0,
    bondLevel: 1,
    equippedRelicId: null,
    equippedGear: {
      WEAPON: null,
      ARMOR: null,
      ACCESSORY: null,
      EMBLEM: null,
    },
  };
}

export function buildDefaultSaveState(): PlayerSaveState {
  const starterGear = createStarterEquipment();

  // Balanced clean starter state: 5 starter Chasers (Lv.8 ★0), ZERO free SSR Relics!
  // Relics are truly earned from Mini-Boss/Boss drops (Stage 1-4 guaranteed first Relic!) & Relic Vault.
  const vaelen = createOwnedHero('vaelen', 8);
  vaelen.equippedGear.WEAPON = 'starter_eq_1';

  const garrick = createOwnedHero('garrick', 8);
  garrick.equippedGear.ARMOR = 'starter_eq_2';
  garrick.equippedGear.EMBLEM = 'starter_eq_6';

  const clara = createOwnedHero('clara', 8);
  clara.equippedGear.ACCESSORY = 'starter_eq_3';

  const kael = createOwnedHero('kael', 8);
  const nyx = createOwnedHero('nyx', 8);
  nyx.equippedGear.EMBLEM = 'starter_eq_4';
  nyx.equippedGear.WEAPON = 'starter_eq_5';

  const fixedGear = starterGear.map((g) =>
    g.uid === 'starter_eq_1' ? { ...g, equippedHeroId: 'vaelen' } : g,
  );

  const defaultSquad: [string, string, string, string] = ['garrick', 'vaelen', 'nyx', 'clara'];
  const preset2Squad: [string, string, string, string] = ['garrick', 'vaelen', 'kael', 'clara'];
  const preset3Squad: [string, string, string, string] = ['vaelen', 'nyx', 'kael', 'clara'];

  const partyPresets: [PartyPreset, PartyPreset, PartyPreset] = [
    { id: 'preset_1', name: 'Vanguard', heroIds: [...defaultSquad] as [string, string, string, string] },
    { id: 'preset_2', name: 'Boss Raid', heroIds: preset2Squad },
    { id: 'preset_3', name: 'Farm Squad', heroIds: preset3Squad },
  ];

  return {
    commanderName: 'Chaser Commander',
    favoriteHeroId: 'vaelen',
    gold: 3500,
    starlightCrystals: 3200, // 20x starter gacha pulls
    starDust: 30,
    starlightTokens: 0,
    expPotions: 8,
    forgeStones: 10,
    starIronIngots: 0,
    astralAnvilCores: 0,
    starCores: 0,
    relicFragments: 0,
    factionEssences: {
      SOLARIS: 2,
      ASTRAL: 2,
      VERDANT: 2,
      ASHEN: 2,
    },
    bondGifts: 3,
    pityCounterHero: 0,
    pityCounterRelic: 0,
    guaranteedFeaturedHero: false,
    guaranteedFeaturedRelic: false,
    squadIds: defaultSquad,
    partyPresets,
    activePresetIndex: 0,
    roster: {
      vaelen,
      garrick,
      clara,
      kael,
      nyx,
    },
    ownedRelics: [],
    relicRanks: {},
    equipmentInventory: fixedGear,
    unlockedCodexIds: ['vaelen', 'garrick', 'clara', 'kael', 'nyx'],
    claimedCodexMilestones: [],
    claimedRegionChests: [],
    clearedStages: [],
    selectedStageId: 'stage_1_1',
    shopPurchases: {},
    shopResetDay: getTodayKey(),
    lastDailySupplyAt: 0,
    dungeonTickets: 2,
    dungeonEntriesUsed: {},
    dungeonResetDay: getTodayKey(),
    dungeonBestStars: {},
    spireHighestFloor: 0,
    spireLastSweepDay: '',
    commissionResetDay: getTodayKey(),
    dailyCommissionProgress: {},
    claimedDailyCommissions: [],
    claimedActivityMilestones: [],
    claimedPermanentCommissions: [],
    lifetimeLinkBursts: 0,
    lastManualSaveAt: 0,
  };
}

interface PlayerStore extends PlayerSaveState {
  setCommanderName: (name: string) => void;
  setFavoriteHero: (heroId: string) => void;
  setSelectedStage: (stageId: string) => void;
  getDungeonEntriesLeft: (dungeonId: DungeonId) => {
    freeLeft: number;
    tickets: number;
    canEnter: boolean;
  };
  sweepDungeonTier: (
    dungeonId: DungeonId,
    tier: 1 | 2 | 3 | 4 | 5,
    opts?: { faction?: Faction; setId?: EquipmentSetId },
  ) => { ok: boolean; message: string; summary?: CombatLootSummary };
  sweepDungeonMulti: (
    dungeonId: DungeonId,
    tier: 1 | 2 | 3 | 4 | 5,
    count: number,
    opts?: { faction?: Faction; setId?: EquipmentSetId },
  ) => { ok: boolean; count: number; message: string; summary?: CombatLootSummary };
  sweepCampaignStage: (
    stageId: string,
    count?: 1 | 5,
  ) => { ok: boolean; count: number; message: string; summary?: CombatLootSummary };
  selectPreset: (presetIndex: 0 | 1 | 2) => void;
  renamePreset: (presetIndex: 0 | 1 | 2, name: string) => void;
  setSquadSlot: (slotIndex: number, heroId: string) => void;
  setPresetSlot: (presetIndex: 0 | 1 | 2, slotIndex: number, heroId: string) => void;
  swapPresetSlots: (presetIndex: 0 | 1 | 2, slotA: number, slotB: number) => void;
  autoFillPreset: (presetIndex: 0 | 1 | 2) => void;
  levelUpHero: (heroId: string, levels?: number) => { ok: boolean; message?: string };
  awakenHero: (heroId: string, mode?: 'MATERIALS' | 'SHARDS') => { ok: boolean; message?: string };
  giveBondGift: (heroId: string) => boolean;
  equipRelic: (heroId: string, relicId: string | null) => void;
  equipGear: (heroId: string, slot: EquipmentSlot, uid: string | null) => void;
  toggleGearLock: (uid: string) => void;
  autoEquipBestGear: (heroId: string) => {
    ok: boolean;
    changedSlots: number;
    powerBefore: number;
    powerAfter: number;
    message: string;
  };
  batchSalvageGear: (maxRarity: 'COMMON' | 'RARE') => {
    ok: boolean;
    count: number;
    gold: number;
    forgeStones: number;
    starIronIngots: number;
    astralAnvilCores: number;
    message: string;
  };
  enhanceGear: (uid: string) => { ok: boolean; succeeded: boolean; message: string };
  salvageGear: (uid: string) => void;
  buyShopItem: (offerId: string) => { ok: boolean; message: string; droppedGear?: EquipmentInstance };
  buyHeroShards: (heroId: string) => { ok: boolean; message: string };
  restockShop: () => { ok: boolean; message: string };
  pullBanner: (
    banner: BannerDef,
    count: 1 | 10,
  ) => { ok: boolean; error?: string; results: GachaPullResult[] };
  sparkExchange: (kind: 'HERO' | 'RELIC', id: string) => boolean;
  claimCodexMilestone: (threshold: number) => boolean;
  claimRegionChest: (
    regionId: string,
  ) => {
    ok: boolean;
    message: string;
    reward?: RegionChestRewardDef;
    droppedGear?: EquipmentInstance;
  };
  recordDefeatedEnemies: (enemyIds: string[]) => void;
  applyCombatRewards: (summary: CombatLootSummary) => void;
  claimDailySupply: () => { ok: boolean; message: string };
  sweepSpireDaily: () => {
    ok: boolean;
    message: string;
    rewards?: {
      gold: number;
      crystals: number;
      expPotions: number;
      forgeStones: number;
      starCores: number;
      relicFragments: number;
    };
  };
  claimDailyCommission: (id: string) => { ok: boolean; message: string };
  claimActivityMilestone: (points: number) => { ok: boolean; message: string };
  claimPermanentCommission: (id: string) => { ok: boolean; message: string };
  claimAllCommissions: () => { ok: boolean; count: number; message: string };
  getClaimableCommissionsCount: () => number;
  resetSave: () => void;
}

function addRelicToState(
  ownedRelics: string[],
  relicRanks: Record<string, number>,
  unlockedCodexIds: string[],
  relicFragments: number,
  relicId: string,
): {
  ownedRelics: string[];
  relicRanks: Record<string, number>;
  unlockedCodexIds: string[];
  relicFragments: number;
  isNew: boolean;
  newRank: number;
  bonusFragments: number;
} {
  const nextCodex = unlockedCodexIds.includes(relicId)
    ? unlockedCodexIds
    : [...unlockedCodexIds, relicId];

  if (!ownedRelics.includes(relicId)) {
    return {
      ownedRelics: [...ownedRelics, relicId],
      relicRanks: { ...relicRanks, [relicId]: 1 },
      unlockedCodexIds: nextCodex,
      relicFragments,
      isNew: true,
      newRank: 1,
      bonusFragments: 0,
    };
  }

  const curRank = relicRanks[relicId] ?? 1;
  if (curRank < MAX_RELIC_RANK) {
    return {
      ownedRelics,
      relicRanks: { ...relicRanks, [relicId]: curRank + 1 },
      unlockedCodexIds: nextCodex,
      relicFragments,
      isNew: false,
      newRank: curRank + 1,
      bonusFragments: 0,
    };
  }

  const bonusFrags = RELIC_MAP[relicId]?.tier === 'SSR' ? 20 : RELIC_MAP[relicId]?.tier === 'SR' ? 10 : 5;
  return {
    ownedRelics,
    relicRanks,
    unlockedCodexIds: nextCodex,
    relicFragments: relicFragments + bonusFrags,
    isNew: false,
    newRank: MAX_RELIC_RANK,
    bonusFragments: bonusFrags,
  };
}

function applyCommissionReward(
  state: PlayerSaveState,
  reward: CommissionReward,
): Partial<PlayerSaveState> {
  const patch: Partial<PlayerSaveState> = {};
  if (reward.gold) patch.gold = state.gold + reward.gold;
  if (reward.crystals) patch.starlightCrystals = state.starlightCrystals + reward.crystals;
  if (reward.expPotions) patch.expPotions = state.expPotions + reward.expPotions;
  if (reward.forgeStones) patch.forgeStones = state.forgeStones + reward.forgeStones;
  if (reward.starIronIngots) patch.starIronIngots = state.starIronIngots + reward.starIronIngots;
  if (reward.starCores) patch.starCores = state.starCores + reward.starCores;
  if (reward.relicFragments) patch.relicFragments = state.relicFragments + reward.relicFragments;
  if (reward.bondGifts) patch.bondGifts = state.bondGifts + reward.bondGifts;
  if (reward.dungeonTickets) patch.dungeonTickets = (state.dungeonTickets ?? 0) + reward.dungeonTickets;
  if (reward.gearCrateRarity) {
    const gear = generateEquipment({ rarity: reward.gearCrateRarity });
    patch.equipmentInventory = [gear, ...state.equipmentInventory];
  }
  return patch;
}

function bumpDailyProgress(
  state: PlayerSaveState,
  increments: Record<string, number>,
): Pick<
  PlayerSaveState,
  'commissionResetDay' | 'dailyCommissionProgress' | 'claimedDailyCommissions' | 'claimedActivityMilestones'
> {
  const today = getTodayKey();
  const sameDay = state.commissionResetDay === today;
  const progress: Record<string, number> = sameDay ? { ...(state.dailyCommissionProgress ?? {}) } : {};
  const claimedDaily = sameDay ? [...(state.claimedDailyCommissions ?? [])] : [];
  const claimedMilestones = sameDay ? [...(state.claimedActivityMilestones ?? [])] : [];
  for (const [k, delta] of Object.entries(increments)) {
    if (delta > 0) {
      progress[k] = (progress[k] ?? 0) + delta;
    }
  }
  return {
    commissionResetDay: today,
    dailyCommissionProgress: progress,
    claimedDailyCommissions: claimedDaily,
    claimedActivityMilestones: claimedMilestones,
  };
}

export const usePlayerStore = create<PlayerStore>()(
  persist(
    (set, get) => ({
      ...buildDefaultSaveState(),

      setCommanderName: (name) => {
        const trimmed = name.trim().slice(0, 24);
        if (trimmed) set({ commanderName: trimmed });
      },

      setFavoriteHero: (heroId) => {
        if (get().roster[heroId]) {
          set({ favoriteHeroId: heroId });
        }
      },

      setSelectedStage: (stageId) => set({ selectedStageId: stageId }),

      getDungeonEntriesLeft: (dungeonId) => {
        const state = get();
        const today = getTodayKey();
        const usedMap = state.dungeonResetDay === today ? (state.dungeonEntriesUsed ?? {}) : {};
        const used = usedMap[dungeonId] ?? 0;
        const freeLeft = Math.max(0, DAILY_DUNGEON_FREE_ENTRIES - used);
        const tickets = state.dungeonTickets ?? 0;
        return {
          freeLeft,
          tickets,
          canEnter: freeLeft > 0 || tickets > 0,
        };
      },

      sweepDungeonTier: (dungeonId, tier, opts) => {
        const state = get();
        const starKey = getDungeonTierStarKey(dungeonId, tier);
        const bestStars = state.dungeonBestStars?.[starKey] ?? 0;
        if (bestStars < 3) {
          return {
            ok: false,
            message: 'Clear this Tier with 3 Stars (0 hero deaths) first to unlock Quick Sweep!',
          };
        }
        const entryInfo = get().getDungeonEntriesLeft(dungeonId);
        if (!entryInfo.canEnter) {
          return {
            ok: false,
            message: 'No daily entries or Rift Tickets left! Visit Shop or wait for daily reset.',
          };
        }

        const stage = buildDungeonStageDef(dungeonId, tier, opts);
        const randBetween = ([a, b]: [number, number]) =>
          Math.round(a + Math.random() * (b - a));
        const rollWeightedRarity = (weights: Record<EquipmentRarity, number>): EquipmentRarity => {
          const entries = Object.entries(weights) as Array<[EquipmentRarity, number]>;
          const total = entries.reduce((sum, [, w]) => sum + w, 0);
          let r = Math.random() * total;
          for (const [rarity, w] of entries) {
            r -= w;
            if (r <= 0) return rarity;
          }
          return 'RARE';
        };

        const droppedEquipment: EquipmentInstance[] = [];
        for (let i = 0; i < stage.rewards.equipmentDrops; i++) {
          const rarity = rollWeightedRarity(stage.rewards.rarityWeights);
          const setId = stage.rewards.targetSetIds[0];
          droppedEquipment.push(generateEquipment({ rarity, setId }));
        }

        const essencesEarned: Partial<Record<Faction, number>> = {};
        const primaryQty = randBetween(stage.rewards.primaryEssenceQty);
        if (primaryQty > 0) {
          essencesEarned[stage.rewards.primaryEssence] = primaryQty;
        }

        const droppedRelics: DroppedRelicSummary[] = [];
        if (
          stage.rewards.relicDropPool &&
          stage.rewards.relicDropPool.length > 0 &&
          Math.random() < (stage.rewards.relicDropChance ?? 0)
        ) {
          const picked =
            stage.rewards.relicDropPool[
              Math.floor(Math.random() * stage.rewards.relicDropPool.length)
            ];
          if (picked) {
            const alreadyOwned = state.ownedRelics.includes(picked);
            const curRank = state.relicRanks[picked] ?? 0;
            const nextRank = alreadyOwned ? Math.min(MAX_RELIC_RANK, curRank + 1) : 1;
            const isMaxed = alreadyOwned && curRank >= MAX_RELIC_RANK;
            droppedRelics.push({
              relicId: picked,
              isNew: !alreadyOwned,
              newRank: nextRank,
              bonusFragments: isMaxed ? 15 : undefined,
            });
          }
        }

        const baseHeroExp = Math.round(
          getStageCombatHeroExp(
            stage.chapter,
            stage.stageNumber,
            stage.isMiniBoss,
            stage.isBossStage,
          ) * (stage.combatExpMultiplier ?? 1.0),
        );
        const heroExpResults: Record<string, HeroBattleExpResult> = {};
        const damageByHero: Record<string, number> = {};
        const healingByHero: Record<string, number> = {};

        state.squadIds.forEach((hid, idx) => {
          const own = state.roster[hid];
          if (!own) return;
          const levelCap = getHeroLevelCap(own.awakening);
          const prevLevel = own.level;
          const prevExp = own.exp ?? 0;
          const expGained = Math.round(baseHeroExp * (idx === 1 ? 1.15 : 1.0));
          let curLevel = prevLevel;
          let curExp = prevExp + expGained;
          let expToNext = getExpToNextLevel(curLevel);
          while (curLevel < levelCap && curExp >= expToNext) {
            curExp -= expToNext;
            curLevel += 1;
            expToNext = getExpToNextLevel(curLevel);
          }
          const atLevelCap = curLevel >= levelCap;
          if (atLevelCap) curExp = Math.min(curExp, expToNext);

          heroExpResults[hid] = {
            heroId: hid,
            expGained,
            prevLevel,
            newLevel: curLevel,
            levelsGained: curLevel - prevLevel,
            prevExp,
            newExp: curExp,
            expToNext,
            atLevelCap,
            levelCap,
          };
          damageByHero[hid] = 0;
          healingByHero[hid] = 0;
        });

        const summary: CombatLootSummary = {
          victory: true,
          stageId: stage.id,
          stageName: `${stage.code} ${stage.name}`,
          durationSec: 0,
          damageByHero,
          healingByHero,
          heroExpResults,
          goldEarned: randBetween(stage.rewards.gold),
          crystalsEarned: 0,
          expPotionsEarned: randBetween(stage.rewards.expPotions),
          forgeStonesEarned: randBetween(stage.rewards.forgeStones),
          starIronIngotsEarned: stage.rewards.starIronIngots
            ? randBetween(stage.rewards.starIronIngots)
            : 0,
          astralAnvilCoresEarned: stage.rewards.astralAnvilCores
            ? randBetween(stage.rewards.astralAnvilCores)
            : 0,
          starCoresEarned: stage.rewards.starCores ? randBetween(stage.rewards.starCores) : 0,
          relicFragmentsEarned: stage.rewards.relicFragments
            ? randBetween(stage.rewards.relicFragments)
            : 0,
          essencesEarned,
          bondGiftsEarned: stage.rewards.bondGiftsRange
            ? randBetween(stage.rewards.bondGiftsRange)
            : 0,
          isFirstClear: false,
          isDungeon: true,
          dungeonId,
          dungeonTier: tier,
          starsEarned: 3,
          droppedEquipment,
          droppedRelics,
        };

        get().applyCombatRewards(summary);
        return { ok: true, message: `Swept ${stage.name}!`, summary };
      },

      sweepDungeonMulti: (dungeonId, tier, count, opts) => {
        const entryInfo = get().getDungeonEntriesLeft(dungeonId);
        const maxRuns = Math.min(Math.max(1, count), 5, entryInfo.freeLeft + entryInfo.tickets);
        if (maxRuns <= 0) {
          return {
            ok: false,
            count: 0,
            message: 'No daily entries or Rift Tickets left!',
          };
        }

        let aggregated: CombatLootSummary | null = null;
        let completed = 0;

        for (let i = 0; i < maxRuns; i++) {
          const single = get().sweepDungeonTier(dungeonId, tier, opts);
          if (!single.ok || !single.summary) {
            if (completed === 0) {
              return { ok: false, count: 0, message: single.message };
            }
            break;
          }
          completed += 1;
          const s = single.summary;
          if (!aggregated) {
            aggregated = {
              ...s,
              essencesEarned: { ...s.essencesEarned },
              droppedEquipment: [...s.droppedEquipment],
              droppedRelics: [...s.droppedRelics],
              heroExpResults: s.heroExpResults ? { ...s.heroExpResults } : undefined,
            };
          } else {
            aggregated.goldEarned += s.goldEarned;
            aggregated.crystalsEarned += s.crystalsEarned;
            aggregated.expPotionsEarned += s.expPotionsEarned;
            aggregated.forgeStonesEarned += s.forgeStonesEarned;
            aggregated.starIronIngotsEarned += s.starIronIngotsEarned;
            aggregated.astralAnvilCoresEarned += s.astralAnvilCoresEarned;
            aggregated.starCoresEarned += s.starCoresEarned;
            aggregated.relicFragmentsEarned += s.relicFragmentsEarned;
            aggregated.bondGiftsEarned += s.bondGiftsEarned;
            for (const [fac, qty] of Object.entries(s.essencesEarned) as Array<[Faction, number]>) {
              if (qty > 0) {
                aggregated.essencesEarned[fac] = (aggregated.essencesEarned[fac] ?? 0) + qty;
              }
            }
            aggregated.droppedEquipment.push(...s.droppedEquipment);
            aggregated.droppedRelics.push(...s.droppedRelics);
            if (aggregated.heroExpResults && s.heroExpResults) {
              for (const [hid, cur] of Object.entries(s.heroExpResults)) {
                const prev = aggregated.heroExpResults[hid];
                if (prev) {
                  aggregated.heroExpResults[hid] = {
                    ...cur,
                    prevLevel: prev.prevLevel,
                    prevExp: prev.prevExp,
                    expGained: prev.expGained + cur.expGained,
                    levelsGained: cur.newLevel - prev.prevLevel,
                  };
                } else {
                  aggregated.heroExpResults[hid] = cur;
                }
              }
            }
          }
        }

        if (!aggregated) {
          return { ok: false, count: 0, message: 'Sweep failed.' };
        }
        aggregated.stageName = `${aggregated.stageName} (×${completed} Sweep)`;
        return {
          ok: true,
          count: completed,
          message: `Completed ${completed}× Quick Sweep!`,
          summary: aggregated,
        };
      },

      sweepCampaignStage: (stageId, count = 1) => {
        const state = get();
        const stage = STAGE_MAP[stageId];
        if (!stage) return { ok: false, count: 0, message: 'Stage not found.' };
        if (!state.clearedStages.includes(stageId)) {
          return {
            ok: false,
            count: 0,
            message: `Clear ${stage.code} in battle first to unlock Quick Sweep!`,
          };
        }

        const runs = count === 5 ? 5 : 1;
        const randBetween = ([a, b]: [number, number]) =>
          Math.round(a + Math.random() * (b - a));
        const rollWeightedRarity = (weights: Record<EquipmentRarity, number>): EquipmentRarity => {
          const entries = Object.entries(weights) as Array<[EquipmentRarity, number]>;
          const total = entries.reduce((sum, [, w]) => sum + w, 0);
          let r = Math.random() * total;
          for (const [rarity, w] of entries) {
            r -= w;
            if (r <= 0) return rarity;
          }
          return 'RARE';
        };

        let goldEarned = 0;
        let crystalsEarned = 0;
        let expPotionsEarned = 0;
        let forgeStonesEarned = 0;
        let starIronIngotsEarned = 0;
        let astralAnvilCoresEarned = 0;
        let starCoresEarned = 0;
        let relicFragmentsEarned = 0;
        let bondGiftsEarned = 0;
        const essencesEarned: Partial<Record<Faction, number>> = {};
        const droppedEquipment: EquipmentInstance[] = [];
        const droppedRelics: DroppedRelicSummary[] = [];

        // Track virtual relic ranks across multi-runs so repeat drops refine cleanly
        const virtualOwnedRelics = new Set(state.ownedRelics);
        const virtualRelicRanks: Record<string, number> = { ...state.relicRanks };

        for (let r = 0; r < runs; r++) {
          goldEarned += randBetween(stage.rewards.gold);
          crystalsEarned += 40; // Standard repeat clear crystals per clear
          expPotionsEarned += randBetween(stage.rewards.expPotions);
          forgeStonesEarned += randBetween(stage.rewards.forgeStones);
          if (stage.rewards.starIronIngots) starIronIngotsEarned += randBetween(stage.rewards.starIronIngots);
          if (stage.rewards.astralAnvilCores) astralAnvilCoresEarned += randBetween(stage.rewards.astralAnvilCores);
          if (stage.rewards.starCores) starCoresEarned += randBetween(stage.rewards.starCores);
          if (stage.rewards.relicFragments) relicFragmentsEarned += randBetween(stage.rewards.relicFragments);

          bondGiftsEarned += stage.rewards.bondGiftsRange
            ? randBetween(stage.rewards.bondGiftsRange)
            : stage.isBossStage
              ? 2
              : stage.isMiniBoss || Math.random() < 0.35
                ? 1
                : 0;

          const primaryQty = randBetween(stage.rewards.primaryEssenceQty);
          if (primaryQty > 0) {
            essencesEarned[stage.rewards.primaryEssence] =
              (essencesEarned[stage.rewards.primaryEssence] ?? 0) + primaryQty;
          }
          if (
            (stage.rewards.bonusRandomEssenceChance ?? 0) > 0 &&
            Math.random() < (stage.rewards.bonusRandomEssenceChance ?? 0)
          ) {
            const allFactions: Faction[] = ['SOLARIS', 'ASTRAL', 'VERDANT', 'ASHEN'];
            const others = allFactions.filter((f) => f !== stage.rewards.primaryEssence);
            const bonusFac = others[Math.floor(Math.random() * others.length)];
            essencesEarned[bonusFac] = (essencesEarned[bonusFac] ?? 0) + (stage.isBossStage ? 2 : 1);
          }

          const dropChance = stage.rewards.equipmentDropChance ?? 1.0;
          const rollCampaignGear = () => {
            const rarity = rollWeightedRarity(stage.rewards.rarityWeights);
            const setId =
              stage.rewards.targetSetIds.length > 0
                ? stage.rewards.targetSetIds[Math.floor(Math.random() * stage.rewards.targetSetIds.length)]
                : undefined;
            droppedEquipment.push(generateEquipment({ rarity, setId }));
          };
          for (let i = 0; i < stage.rewards.equipmentDrops; i++) {
            if (dropChance >= 1 || Math.random() < dropChance) {
              rollCampaignGear();
            }
          }
          if (
            (stage.rewards.bonusEquipmentDropChance ?? 0) > 0 &&
            Math.random() < (stage.rewards.bonusEquipmentDropChance ?? 0)
          ) {
            rollCampaignGear();
          }

          if (
            stage.rewards.relicDropPool &&
            stage.rewards.relicDropPool.length > 0 &&
            Math.random() < (stage.rewards.relicDropChance ?? 0)
          ) {
            const picked =
              stage.rewards.relicDropPool[Math.floor(Math.random() * stage.rewards.relicDropPool.length)];
            if (picked) {
              const alreadyOwned = virtualOwnedRelics.has(picked);
              const curRank = virtualRelicRanks[picked] ?? 0;
              const nextRank = alreadyOwned ? Math.min(MAX_RELIC_RANK, curRank + 1) : 1;
              const isMaxed = alreadyOwned && curRank >= MAX_RELIC_RANK;
              virtualOwnedRelics.add(picked);
              virtualRelicRanks[picked] = nextRank;
              droppedRelics.push({
                relicId: picked,
                isNew: !alreadyOwned,
                newRank: nextRank,
                bonusFragments: isMaxed ? 15 : undefined,
              });
            }
          }
        }

        // Squad Hero EXP across all runs
        const perRunHeroExp = Math.round(
          getStageCombatHeroExp(stage.chapter, stage.stageNumber, stage.isMiniBoss, stage.isBossStage) *
            (stage.combatExpMultiplier ?? 1.0),
        );
        const heroExpResults: Record<string, HeroBattleExpResult> = {};
        const damageByHero: Record<string, number> = {};
        const healingByHero: Record<string, number> = {};

        state.squadIds.forEach((hid, idx) => {
          const owned = state.roster[hid];
          if (!owned) return;
          const levelCap = getHeroLevelCap(owned.awakening);
          const prevLevel = owned.level;
          const prevExp = owned.exp ?? 0;
          const expGained = Math.round(perRunHeroExp * runs * (idx === 1 ? 1.15 : 1.0));
          let curLevel = prevLevel;
          let curExp = prevExp + expGained;
          let expToNext = getExpToNextLevel(curLevel);
          while (curLevel < levelCap && curExp >= expToNext) {
            curExp -= expToNext;
            curLevel += 1;
            expToNext = getExpToNextLevel(curLevel);
          }
          const atLevelCap = curLevel >= levelCap;
          if (atLevelCap) curExp = Math.min(curExp, expToNext);

          heroExpResults[hid] = {
            heroId: hid,
            expGained,
            prevLevel,
            newLevel: curLevel,
            levelsGained: curLevel - prevLevel,
            prevExp,
            newExp: curExp,
            expToNext,
            atLevelCap,
            levelCap,
          };
          damageByHero[hid] = 0;
          healingByHero[hid] = 0;
        });

        const summary: CombatLootSummary = {
          victory: true,
          stageId: stage.id,
          stageName: runs > 1 ? `${stage.code} ${stage.name} (×${runs} Sweep)` : `${stage.code} ${stage.name}`,
          durationSec: 0,
          damageByHero,
          healingByHero,
          heroExpResults,
          goldEarned,
          crystalsEarned,
          expPotionsEarned,
          forgeStonesEarned,
          starIronIngotsEarned,
          astralAnvilCoresEarned,
          starCoresEarned,
          relicFragmentsEarned,
          essencesEarned,
          bondGiftsEarned,
          isFirstClear: false,
          isDungeon: false,
          starsEarned: 3,
          droppedEquipment,
          droppedRelics,
        };

        get().applyCombatRewards(summary);
        return {
          ok: true,
          count: runs,
          message: `Completed ${runs}× Quick Sweep on ${stage.code}!`,
          summary,
        };
      },

      selectPreset: (presetIndex) => {
        const state = get();
        const preset = state.partyPresets[presetIndex];
        if (!preset) return;
        set({
          activePresetIndex: presetIndex,
          squadIds: [...preset.heroIds] as [string, string, string, string],
        });
      },

      renamePreset: (presetIndex, name) => {
        const trimmed = name.trim().slice(0, 18);
        if (!trimmed) return;
        const state = get();
        const nextPresets = state.partyPresets.map((p, i) =>
          i === presetIndex ? { ...p, name: trimmed } : p,
        ) as [PartyPreset, PartyPreset, PartyPreset];
        set({ partyPresets: nextPresets });
      },

      setSquadSlot: (slotIndex, heroId) => {
        const state = get();
        get().setPresetSlot(state.activePresetIndex, slotIndex, heroId);
      },

      setPresetSlot: (presetIndex, slotIndex, heroId) => {
        const state = get();
        if (!state.roster[heroId] || slotIndex < 0 || slotIndex > 3) return;
        const targetPreset = state.partyPresets[presetIndex];
        if (!targetPreset) return;

        const nextIds = [...targetPreset.heroIds] as [string, string, string, string];
        const existingIdx = nextIds.indexOf(heroId);
        if (existingIdx !== -1 && existingIdx !== slotIndex) {
          nextIds[existingIdx] = nextIds[slotIndex];
        }
        nextIds[slotIndex] = heroId;

        const nextPresets = state.partyPresets.map((p, i) =>
          i === presetIndex ? { ...p, heroIds: nextIds } : p,
        ) as [PartyPreset, PartyPreset, PartyPreset];

        set({
          partyPresets: nextPresets,
          squadIds:
            presetIndex === state.activePresetIndex
              ? nextIds
              : state.squadIds,
        });
      },

      swapPresetSlots: (presetIndex, slotA, slotB) => {
        const state = get();
        if (slotA === slotB || slotA < 0 || slotA > 3 || slotB < 0 || slotB > 3) return;
        const targetPreset = state.partyPresets[presetIndex];
        if (!targetPreset) return;

        const nextIds = [...targetPreset.heroIds] as [string, string, string, string];
        const tmp = nextIds[slotA];
        nextIds[slotA] = nextIds[slotB];
        nextIds[slotB] = tmp;

        const nextPresets = state.partyPresets.map((p, i) =>
          i === presetIndex ? { ...p, heroIds: nextIds } : p,
        ) as [PartyPreset, PartyPreset, PartyPreset];

        set({
          partyPresets: nextPresets,
          squadIds:
            presetIndex === state.activePresetIndex
              ? nextIds
              : state.squadIds,
        });
      },

      autoFillPreset: (presetIndex) => {
        const state = get();
        const ownedIds = Object.keys(state.roster);
        if (ownedIds.length < 4) return;

        const scored = ownedIds
          .map((id) => {
            const def = HERO_MAP[id];
            const own = state.roster[id];
            const stats = computeHeroStats(
              def,
              own,
              state.equipmentInventory,
              state.squadIds,
              state.unlockedCodexIds.length,
              state.relicRanks,
            );
            return { id, role: def.role, pwr: stats.powerRating };
          })
          .sort((a, b) => b.pwr - a.pwr);

        const picked: string[] = [];
        const pickRole = (role: string) => {
          const found = scored.find((s) => s.role === role && !picked.includes(s.id));
          if (found) picked.push(found.id);
        };

        // Balanced RPG comp: Slot 1 Tank, Slot 4 Healer, Slots 2-3 highest DPS
        pickRole('TANK');
        const bestHealer = scored.find((s) => s.role === 'HEALER' && !picked.includes(s.id));
        for (const s of scored) {
          if (picked.length >= (bestHealer ? 3 : 4)) break;
          if (!picked.includes(s.id) && s.id !== bestHealer?.id) {
            picked.push(s.id);
          }
        }
        if (bestHealer && picked.length < 4) picked.push(bestHealer.id);
        for (const s of scored) {
          if (picked.length >= 4) break;
          if (!picked.includes(s.id)) picked.push(s.id);
        }

        const nextIds = picked.slice(0, 4) as [string, string, string, string];
        const nextPresets = state.partyPresets.map((p, i) =>
          i === presetIndex ? { ...p, heroIds: nextIds } : p,
        ) as [PartyPreset, PartyPreset, PartyPreset];

        set({
          partyPresets: nextPresets,
          squadIds:
            presetIndex === state.activePresetIndex
              ? nextIds
              : state.squadIds,
        });
      },

      levelUpHero: (heroId, levels = 1) => {
        const state = get();
        const hero = state.roster[heroId];
        if (!hero) return { ok: false, message: 'Hero not owned.' };
        if (hero.level >= 80) return { ok: false, message: 'Already at Max Level 80!' };

        const cost = getLevelUpCost(hero.level, levels, hero.awakening);
        if (cost.atAwakenCap || cost.actualLevels <= 0) {
          return {
            ok: false,
            message: `Reached Lv.${cost.levelCap} cap! Awaken to ★${hero.awakening + 1} to unlock Lv.${cost.levelCap + 10}.`,
          };
        }
        if (state.expPotions < cost.potions) {
          return { ok: false, message: `Need ${cost.potions} EXP Elixirs (Have ${state.expPotions}).` };
        }
        if (state.gold < cost.gold) {
          return { ok: false, message: `Need ${cost.gold.toLocaleString()} Gold.` };
        }

        set({
          expPotions: state.expPotions - cost.potions,
          gold: state.gold - cost.gold,
          roster: {
            ...state.roster,
            [heroId]: {
              ...hero,
              level: hero.level + cost.actualLevels,
              exp: 0,
            },
          },
        });
        return { ok: true, message: `Leveled up to Lv.${hero.level + cost.actualLevels}!` };
      },

      awakenHero: (heroId, mode) => {
        const state = get();
        const hero = state.roster[heroId];
        const def = HERO_MAP[heroId];
        if (!hero || !def) return { ok: false, message: 'Hero not found.' };
        const cost = getAwakeningCost(hero.awakening, def.tier);
        if (!cost) return { ok: false, message: 'Already Max Awakening ★6!' };

        const canUseShards = hero.shards >= cost.shardAltCost && state.gold >= cost.shardAltGold;
        const ownedEssence = state.factionEssences[def.faction] ?? 0;
        const canUseMaterials =
          ownedEssence >= cost.essences &&
          state.starCores >= cost.starCores &&
          state.gold >= cost.gold;

        // Auto-pick preferred available path if mode not forced
        const useShards =
          mode === 'SHARDS'
            ? true
            : mode === 'MATERIALS'
              ? false
              : canUseShards
                ? true
                : false;

        if (useShards) {
          if (!canUseShards) {
            return {
              ok: false,
              message: `Need ${cost.shardAltCost} Shards & ${cost.shardAltGold.toLocaleString()} Gold.`,
            };
          }
          set({
            gold: state.gold - cost.shardAltGold,
            roster: {
              ...state.roster,
              [heroId]: {
                ...hero,
                awakening: hero.awakening + 1,
                shards: hero.shards - cost.shardAltCost,
              },
            },
          });
          return {
            ok: true,
            message: `Awakened ★${cost.nextStar}! Max Lv.${cost.nextLevelCap} unlocked!`,
          };
        }

        if (!canUseMaterials) {
          if (ownedEssence < cost.essences) {
            return {
              ok: false,
              message: `Need ${cost.essences} ${def.faction} Essences (Have ${ownedEssence}).`,
            };
          }
          if (state.starCores < cost.starCores) {
            return {
              ok: false,
              message: `Need ${cost.starCores} Starlight Cores (Have ${state.starCores}).`,
            };
          }
          return { ok: false, message: `Need ${cost.gold.toLocaleString()} Gold.` };
        }

        set({
          gold: state.gold - cost.gold,
          starCores: state.starCores - cost.starCores,
          factionEssences: {
            ...state.factionEssences,
            [def.faction]: ownedEssence - cost.essences,
          },
          roster: {
            ...state.roster,
            [heroId]: {
              ...hero,
              awakening: hero.awakening + 1,
            },
          },
        });
        return {
          ok: true,
          message: `Awakened ★${cost.nextStar}! Max Lv.${cost.nextLevelCap} unlocked!`,
        };
      },

      giveBondGift: (heroId) => {
        const state = get();
        const hero = state.roster[heroId];
        if (!hero || hero.bondLevel >= 10 || state.bondGifts <= 0) return false;
        set({
          bondGifts: state.bondGifts - 1,
          roster: {
            ...state.roster,
            [heroId]: { ...hero, bondLevel: hero.bondLevel + 1 },
          },
        });
        return true;
      },

      equipRelic: (heroId, relicId) => {
        const state = get();
        const hero = state.roster[heroId];
        if (!hero) return;
        if (relicId && !state.ownedRelics.includes(relicId)) return;
        const nextRoster: Record<string, OwnedHeroState> = { ...state.roster };
        if (relicId) {
          for (const [otherId, otherHero] of Object.entries(nextRoster)) {
            if (otherHero.equippedRelicId === relicId && otherId !== heroId) {
              nextRoster[otherId] = { ...otherHero, equippedRelicId: null };
            }
          }
        }
        nextRoster[heroId] = { ...hero, equippedRelicId: relicId };
        set({ roster: nextRoster });
      },

      equipGear: (heroId, slot, uid) => {
        const state = get();
        const hero = state.roster[heroId];
        if (!hero) return;

        const nextRoster: Record<string, OwnedHeroState> = { ...state.roster };
        const prevUid = hero.equippedGear[slot];

        const nextInventory = state.equipmentInventory.map((item) => {
          if (prevUid && item.uid === prevUid) {
            return { ...item, equippedHeroId: null };
          }
          if (uid && item.uid === uid) {
            if (item.equippedHeroId && item.equippedHeroId !== heroId) {
              const prevOwner = nextRoster[item.equippedHeroId];
              if (prevOwner) {
                nextRoster[item.equippedHeroId] = {
                  ...prevOwner,
                  equippedGear: { ...prevOwner.equippedGear, [item.slot]: null },
                };
              }
            }
            return { ...item, equippedHeroId: heroId };
          }
          return item;
        });

        nextRoster[heroId] = {
          ...nextRoster[heroId],
          equippedGear: {
            ...nextRoster[heroId].equippedGear,
            [slot]: uid,
          },
        };

        set({ roster: nextRoster, equipmentInventory: nextInventory });
      },

      toggleGearLock: (uid) => {
        const state = get();
        set({
          equipmentInventory: state.equipmentInventory.map((item) =>
            item.uid === uid ? { ...item, locked: !item.locked } : item,
          ),
        });
      },

      autoEquipBestGear: (heroId) => {
        const state = get();
        const def = HERO_MAP[heroId];
        const owned = state.roster[heroId];
        if (!def || !owned) {
          return {
            ok: false,
            changedSlots: 0,
            powerBefore: 0,
            powerAfter: 0,
            message: 'Hero not found.',
          };
        }

        const powerBefore = computeHeroStats(
          def,
          owned,
          state.equipmentInventory,
          state.squadIds,
          state.unlockedCodexIds.length,
          state.relicRanks,
        ).powerRating;

        const preferredSetsByRole: Record<string, EquipmentSetId[]> = {
          TANK: ['AEGIS_BASTION', 'CHRONO'],
          HEALER: ['VERDANT_GRACE', 'CHRONO'],
          MAGE: ['ASTRAL_SURGE', 'ASHEN_FURY'],
          RANGER: ['ASHEN_FURY', 'VANGUARD'],
          ASSAULT: ['VANGUARD', 'ASHEN_FURY'],
        };
        const preferredSets = preferredSetsByRole[def.role] ?? ['VANGUARD', 'ASHEN_FURY'];
        const rarityScore: Record<EquipmentRarity, number> = {
          LEGENDARY: 4,
          EPIC: 3,
          RARE: 2,
          COMMON: 1,
        };

        const scoreItem = (item: EquipmentInstance): number => {
          let score = rarityScore[item.rarity] * 1000 + item.enhanceLevel * 90;
          if (item.setId === preferredSets[0]) score += 380;
          else if (item.setId === preferredSets[1]) score += 210;

          const statWeights = (stat: string): number => {
            if (def.role === 'TANK') {
              if (stat === 'DEF_PCT' || stat === 'HP_PCT') return 140;
              if (stat === 'CDR') return 90;
              return 40;
            }
            if (def.role === 'HEALER') {
              if (stat === 'HP_PCT' || stat === 'ATK_PCT' || stat === 'CDR') return 130;
              return 50;
            }
            if (stat === 'ATK_PCT' || stat === 'CRIT_RATE' || stat === 'CRIT_DMG' || stat === 'SKILL_DMG') {
              return 145;
            }
            if (stat === 'ATK_FLAT') return 95;
            return 40;
          };

          score += statWeights(item.mainStat.stat);
          for (const sub of item.subStats) {
            score += statWeights(sub.stat) * 0.45;
          }
          return score;
        };

        const slots: EquipmentSlot[] = ['WEAPON', 'ARMOR', 'ACCESSORY', 'EMBLEM'];
        let nextInv = [...state.equipmentInventory];
        const nextEquipped = { ...owned.equippedGear };
        let changedSlots = 0;

        for (const slot of slots) {
          const candidates = nextInv
            .filter(
              (item) =>
                item.slot === slot &&
                (item.equippedHeroId === null || item.equippedHeroId === heroId),
            )
            .sort((a, b) => scoreItem(b) - scoreItem(a));

          const best = candidates[0];
          if (!best || best.uid === nextEquipped[slot]) continue;

          const prevUid = nextEquipped[slot];
          nextInv = nextInv.map((item) => {
            if (prevUid && item.uid === prevUid) return { ...item, equippedHeroId: null };
            if (item.uid === best.uid) return { ...item, equippedHeroId: heroId };
            return item;
          });
          nextEquipped[slot] = best.uid;
          changedSlots += 1;
        }

        const nextRoster = {
          ...state.roster,
          [heroId]: { ...owned, equippedGear: nextEquipped },
        };

        if (changedSlots === 0) {
          return {
            ok: true,
            changedSlots: 0,
            powerBefore,
            powerAfter: powerBefore,
            message: `${def.name} already wears the best available gear!`,
          };
        }

        set({
          roster: nextRoster,
          equipmentInventory: nextInv,
          ...bumpDailyProgress(state, { daily_forge_gear: 1 }),
        });
        const powerAfter = computeHeroStats(
          def,
          nextRoster[heroId],
          nextInv,
          state.squadIds,
          state.unlockedCodexIds.length,
          state.relicRanks,
        ).powerRating;
        const delta = powerAfter - powerBefore;
        return {
          ok: true,
          changedSlots,
          powerBefore,
          powerAfter,
          message: `Auto-equipped ${changedSlots} slot${changedSlots > 1 ? 's' : ''} on ${def.name} (${delta >= 0 ? '+' : ''}${delta.toLocaleString()} PWR)!`,
        };
      },

      batchSalvageGear: (maxRarity) => {
        const state = get();
        const allowed =
          maxRarity === 'COMMON'
            ? new Set<EquipmentRarity>(['COMMON'])
            : new Set<EquipmentRarity>(['COMMON', 'RARE']);

        const targets = state.equipmentInventory.filter(
          (item) => !item.equippedHeroId && !item.locked && allowed.has(item.rarity),
        );
        if (targets.length === 0) {
          return {
            ok: false,
            count: 0,
            gold: 0,
            forgeStones: 0,
            starIronIngots: 0,
            astralAnvilCores: 0,
            message: `No unlocked, unequipped ${maxRarity === 'COMMON' ? 'Common' : 'Common/Rare'} gear to salvage.`,
          };
        }

        let gold = 0;
        let forgeStones = 0;
        let starIronIngots = 0;
        let astralAnvilCores = 0;
        const removedIds = new Set<string>();

        for (const item of targets) {
          const y = getSalvageYield(item);
          gold += y.gold;
          forgeStones += y.forgeStones;
          starIronIngots += y.starIronIngots;
          astralAnvilCores += y.astralAnvilCores;
          removedIds.add(item.uid);
        }

        set({
          gold: state.gold + gold,
          forgeStones: state.forgeStones + forgeStones,
          starIronIngots: state.starIronIngots + starIronIngots,
          astralAnvilCores: state.astralAnvilCores + astralAnvilCores,
          equipmentInventory: state.equipmentInventory.filter((item) => !removedIds.has(item.uid)),
        });

        return {
          ok: true,
          count: targets.length,
          gold,
          forgeStones,
          starIronIngots,
          astralAnvilCores,
          message: `Salvaged ${targets.length} item${targets.length > 1 ? 's' : ''}: +${gold.toLocaleString()}g • +${forgeStones} Forge Stones${starIronIngots ? ` • +${starIronIngots} Ingots` : ''}!`,
        };
      },

      enhanceGear: (uid) => {
        const state = get();
        const target = state.equipmentInventory.find((i) => i.uid === uid);
        if (!target) return { ok: false, succeeded: false, message: 'Equipment not found.' };
        if (target.enhanceLevel >= 15) {
          return { ok: false, succeeded: false, message: 'Already at max +15.' };
        }
        const cost = getEnhanceCost(target);
        if (state.gold < cost.gold) {
          return { ok: false, succeeded: false, message: `Need ${cost.gold.toLocaleString()} Gold.` };
        }
        if (state.forgeStones < cost.forgeStones) {
          return { ok: false, succeeded: false, message: `Need ${cost.forgeStones} Forge Stones.` };
        }
        if (state.starIronIngots < cost.starIronIngots) {
          return {
            ok: false,
            succeeded: false,
            message: `Need ${cost.starIronIngots} Star-Iron Ingots (Ch.2+ / Boss / Shop).`,
          };
        }
        if (state.astralAnvilCores < cost.astralAnvilCores) {
          return {
            ok: false,
            succeeded: false,
            message: `Need ${cost.astralAnvilCores} Astral Anvil Cores (Ch.4+ / Boss / Shop).`,
          };
        }

        const { updated, succeeded, upgradedSubStat } = enhanceEquipmentItem(target);
        const nextInv = state.equipmentInventory.map((i) => (i.uid === uid ? updated : i));
        set({
          gold: state.gold - cost.gold,
          forgeStones: state.forgeStones - cost.forgeStones,
          starIronIngots: state.starIronIngots - cost.starIronIngots,
          astralAnvilCores: state.astralAnvilCores - cost.astralAnvilCores,
          equipmentInventory: nextInv,
          ...bumpDailyProgress(state, { daily_forge_gear: 1 }),
        });

        if (!succeeded) {
          const nextChance = Math.min(
            100,
            Math.round((cost.baseSuccessRate + (updated.forgePity ?? 0)) * 100),
          );
          return {
            ok: true,
            succeeded: false,
            message: `Forge tempered! Gear safe (+${target.enhanceLevel}) • Blessing Pity raised rate to ${nextChance}%!`,
          };
        }

        return {
          ok: true,
          succeeded: true,
          message: upgradedSubStat
            ? `Enhanced to +${updated.enhanceLevel}! (${upgradedSubStat})`
            : `Enhanced to +${updated.enhanceLevel}!`,
        };
      },

      salvageGear: (uid) => {
        const state = get();
        const item = state.equipmentInventory.find((i) => i.uid === uid);
        if (!item || item.equippedHeroId || item.locked) return;
        const y = getSalvageYield(item);
        set({
          gold: state.gold + y.gold,
          forgeStones: state.forgeStones + y.forgeStones,
          starIronIngots: state.starIronIngots + y.starIronIngots,
          astralAnvilCores: state.astralAnvilCores + y.astralAnvilCores,
          equipmentInventory: state.equipmentInventory.filter((i) => i.uid !== uid),
        });
      },

      buyShopItem: (offerId) => {
        const state = get();
        const today = getTodayKey();
        const purchases = state.shopResetDay === today ? state.shopPurchases : {};
        const offer = SHOP_OFFERS.find((o) => o.id === offerId);
        if (!offer) return { ok: false, message: 'Offer not found.' };

        const bought = purchases[offerId] ?? 0;
        if (offer.dailyLimit > 0 && bought >= offer.dailyLimit) {
          return { ok: false, message: 'Out of daily stock! Use Restock or return tomorrow.' };
        }

        // Check currency
        if (offer.currency === 'GOLD' && state.gold < offer.price) {
          return { ok: false, message: `Need ${offer.price.toLocaleString()} Gold.` };
        }
        if (offer.currency === 'STAR_DUST' && state.starDust < offer.price) {
          return { ok: false, message: `Need ${offer.price} Star Dust.` };
        }
        if (offer.currency === 'RELIC_FRAGMENTS' && state.relicFragments < offer.price) {
          return { ok: false, message: `Need ${offer.price} Relic Fragments.` };
        }
        if (offer.currency === 'CRYSTALS' && state.starlightCrystals < offer.price) {
          return { ok: false, message: `Need ${offer.price} Starlight Crystals.` };
        }

        const patch: Partial<PlayerSaveState> = {
          shopResetDay: today,
          shopPurchases: { ...purchases, [offerId]: bought + 1 },
        };

        if (offer.currency === 'GOLD') patch.gold = state.gold - offer.price;
        if (offer.currency === 'STAR_DUST') patch.starDust = state.starDust - offer.price;
        if (offer.currency === 'RELIC_FRAGMENTS') {
          patch.relicFragments = state.relicFragments - offer.price;
        }
        if (offer.currency === 'CRYSTALS') {
          patch.starlightCrystals = state.starlightCrystals - offer.price;
        }

        let msg = `Purchased ${offer.name}!`;
        let droppedGear: EquipmentInstance | undefined;

        if (offer.reward.kind === 'MATERIAL') {
          const { material, amount } = offer.reward;
          if (material.startsWith('essence_')) {
            const fac = material.replace('essence_', '') as Faction;
            patch.factionEssences = {
              ...state.factionEssences,
              [fac]: (state.factionEssences[fac] ?? 0) + amount,
            };
          } else if (material === 'expPotions') {
            patch.expPotions = state.expPotions + amount;
          } else if (material === 'bondGifts') {
            patch.bondGifts = state.bondGifts + amount;
          } else if (material === 'forgeStones') {
            patch.forgeStones = state.forgeStones + amount;
          } else if (material === 'starIronIngots') {
            patch.starIronIngots = state.starIronIngots + amount;
          } else if (material === 'astralAnvilCores') {
            patch.astralAnvilCores = state.astralAnvilCores + amount;
          } else if (material === 'starCores') {
            patch.starCores = state.starCores + amount;
          } else if (material === 'relicFragments') {
            patch.relicFragments = (patch.relicFragments ?? state.relicFragments) + amount;
          } else if (material === 'dungeonTickets') {
            patch.dungeonTickets = (state.dungeonTickets ?? 0) + amount;
          }
        } else if (offer.reward.kind === 'OMNI_ESSENCE') {
          const amt = offer.reward.amountEach;
          patch.factionEssences = {
            SOLARIS: state.factionEssences.SOLARIS + amt,
            ASTRAL: state.factionEssences.ASTRAL + amt,
            VERDANT: state.factionEssences.VERDANT + amt,
            ASHEN: state.factionEssences.ASHEN + amt,
          };
        } else if (offer.reward.kind === 'GEAR_CRATE') {
          const rarity =
            offer.reward.minRarity === 'LEGENDARY'
              ? 'LEGENDARY'
              : Math.random() < 0.25
                ? 'LEGENDARY'
                : 'EPIC';
          const gear = generateEquipment({ rarity });
          droppedGear = gear;
          patch.equipmentInventory = [gear, ...state.equipmentInventory];
          msg = `Forged ${gear.rarity} ${gear.name}!`;
        } else if (offer.reward.kind === 'RELIC') {
          const curRelicRank = state.relicRanks[offer.reward.relicId] ?? 0;
          if (state.ownedRelics.includes(offer.reward.relicId) && curRelicRank >= MAX_RELIC_RANK) {
            return { ok: false, message: 'Relic is already Max Rank R5!' };
          }
          const added = addRelicToState(
            state.ownedRelics,
            state.relicRanks,
            state.unlockedCodexIds,
            patch.relicFragments ?? state.relicFragments,
            offer.reward.relicId,
          );
          patch.ownedRelics = added.ownedRelics;
          patch.relicRanks = added.relicRanks;
          patch.unlockedCodexIds = added.unlockedCodexIds;
          patch.relicFragments = added.relicFragments;
          msg = added.isNew
            ? `Crafted ${RELIC_MAP[offer.reward.relicId]?.name}!`
            : `Refined ${RELIC_MAP[offer.reward.relicId]?.name} to Rank ${added.newRank}!`;
        }

        set(patch);
        return { ok: true, message: msg, droppedGear };
      },

      buyHeroShards: (heroId) => {
        const state = get();
        const owned = state.roster[heroId];
        const def = HERO_MAP[heroId];
        if (!owned || !def) return { ok: false, message: 'Recruit this Chaser first.' };
        const dustCost = def.tier === 'SSR' ? 20 : def.tier === 'SR' ? 12 : 8;
        const shardsAmount = 5;
        if (state.starDust < dustCost) {
          return { ok: false, message: `Need ${dustCost} Star Dust.` };
        }
        set({
          starDust: state.starDust - dustCost,
          roster: {
            ...state.roster,
            [heroId]: { ...owned, shards: owned.shards + shardsAmount },
          },
        });
        return { ok: true, message: `Acquired +${shardsAmount} ${def.name} Shards!` };
      },

      restockShop: () => {
        const state = get();
        if (state.gold < SHOP_RESTOCK_GOLD_COST) {
          return { ok: false, message: `Need ${SHOP_RESTOCK_GOLD_COST.toLocaleString()} Gold to restock.` };
        }
        set({
          gold: state.gold - SHOP_RESTOCK_GOLD_COST,
          shopPurchases: {},
          shopResetDay: getTodayKey(),
        });
        return { ok: true, message: 'Emporium stock refreshed!' };
      },

      pullBanner: (banner, count) => {
        const state = get();
        const cost = count === 10 ? banner.tenCost : banner.singleCost;
        if (state.starlightCrystals < cost) {
          return { ok: false, error: 'Insufficient Starlight Crystals!', results: [] };
        }

        const isHero = banner.type === 'HERO';
        const ownedSet = new Set(isHero ? Object.keys(state.roster) : state.ownedRelics);

        const out = executeGachaPulls(banner, count, {
          pityCounter: isHero ? state.pityCounterHero : state.pityCounterRelic,
          guaranteedFeatured: isHero
            ? state.guaranteedFeaturedHero
            : state.guaranteedFeaturedRelic,
          ownedIds: ownedSet,
        });

        const nextRoster = { ...state.roster };
        let nextRelics = [...state.ownedRelics];
        let nextRelicRanks = { ...state.relicRanks };
        let nextCodex = [...state.unlockedCodexIds];
        let nextRelicFragments = state.relicFragments;
        let dustGain = 0;

        for (const res of out.results) {
          if (!nextCodex.includes(res.id)) nextCodex.push(res.id);
          dustGain += res.starDustGained;
          if (res.kind === 'HERO') {
            if (!nextRoster[res.id]) {
              nextRoster[res.id] = createOwnedHero(res.id, 1);
            } else {
              nextRoster[res.id] = {
                ...nextRoster[res.id],
                shards: nextRoster[res.id].shards + res.shardsGained,
              };
            }
          } else {
            const added = addRelicToState(
              nextRelics,
              nextRelicRanks,
              nextCodex,
              nextRelicFragments,
              res.id,
            );
            nextRelics = added.ownedRelics;
            nextRelicRanks = added.relicRanks;
            nextCodex = added.unlockedCodexIds;
            nextRelicFragments = added.relicFragments;
          }
        }

        set({
          starlightCrystals: state.starlightCrystals - cost,
          starlightTokens: state.starlightTokens + count,
          starDust: state.starDust + dustGain,
          relicFragments: nextRelicFragments,
          pityCounterHero: isHero ? out.nextPityCounter : state.pityCounterHero,
          pityCounterRelic: !isHero ? out.nextPityCounter : state.pityCounterRelic,
          guaranteedFeaturedHero: isHero
            ? out.nextGuaranteedFeatured
            : state.guaranteedFeaturedHero,
          guaranteedFeaturedRelic: !isHero
            ? out.nextGuaranteedFeatured
            : state.guaranteedFeaturedRelic,
          roster: nextRoster,
          ownedRelics: nextRelics,
          relicRanks: nextRelicRanks,
          unlockedCodexIds: nextCodex,
          ...bumpDailyProgress(state, { daily_summon_or_supply: 1 }),
        });

        return { ok: true, results: out.results };
      },

      sparkExchange: (kind, id) => {
        const state = get();
        if (state.starlightTokens < 120) return false;
        const nextCodex = state.unlockedCodexIds.includes(id)
          ? state.unlockedCodexIds
          : [...state.unlockedCodexIds, id];

        if (kind === 'HERO') {
          if (!HERO_MAP[id]) return false;
          const nextRoster = { ...state.roster };
          if (nextRoster[id]) {
            nextRoster[id] = { ...nextRoster[id], shards: nextRoster[id].shards + 25 };
          } else {
            nextRoster[id] = createOwnedHero(id, 1);
          }
          set({
            starlightTokens: state.starlightTokens - 120,
            roster: nextRoster,
            unlockedCodexIds: nextCodex,
          });
          return true;
        } else {
          if (!RELIC_MAP[id]) return false;
          const added = addRelicToState(
            state.ownedRelics,
            state.relicRanks,
            nextCodex,
            state.relicFragments,
            id,
          );
          set({
            starlightTokens: state.starlightTokens - 120,
            ownedRelics: added.ownedRelics,
            relicRanks: added.relicRanks,
            unlockedCodexIds: added.unlockedCodexIds,
            relicFragments: added.relicFragments,
          });
          return true;
        }
      },

      claimCodexMilestone: (threshold) => {
        const state = get();
        const m = CODEX_MILESTONES.find((x) => x.threshold === threshold);
        if (!m) return false;
        if (state.unlockedCodexIds.length < threshold) return false;
        if (state.claimedCodexMilestones.includes(threshold)) return false;
        set({
          starlightCrystals: state.starlightCrystals + m.crystals,
          claimedCodexMilestones: [...state.claimedCodexMilestones, threshold],
        });
        return true;
      },

      claimRegionChest: (regionId) => {
        const state = get();
        const reward = REGION_CHEST_REWARDS[regionId];
        if (!reward) return { ok: false, message: 'Region chest not found.' };
        const claimedList = state.claimedRegionChests ?? [];
        if (claimedList.includes(regionId)) {
          return { ok: false, message: 'Region Reward Chest already claimed!' };
        }
        const regionStages = getStagesByRegion(regionId);
        const clearedCount = regionStages.filter((s) => state.clearedStages.includes(s.id)).length;
        if (regionStages.length === 0 || clearedCount < regionStages.length) {
          return {
            ok: false,
            message: `Clear all ${regionStages.length} stages in this region (${clearedCount}/${regionStages.length}) to unlock!`,
          };
        }

        const droppedGear = generateEquipment({
          rarity: reward.gearRarity,
          setId: reward.gearSetId,
        });

        set({
          starlightCrystals: state.starlightCrystals + reward.crystals,
          gold: state.gold + reward.gold,
          expPotions: state.expPotions + reward.expPotions,
          forgeStones: state.forgeStones + reward.forgeStones,
          starIronIngots: state.starIronIngots + reward.starIronIngots,
          astralAnvilCores: state.astralAnvilCores + reward.astralAnvilCores,
          starCores: state.starCores + reward.starCores,
          relicFragments: state.relicFragments + reward.relicFragments,
          factionEssences: {
            ...state.factionEssences,
            [reward.essenceFaction]:
              (state.factionEssences[reward.essenceFaction] ?? 0) + reward.essenceQty,
          },
          equipmentInventory: [droppedGear, ...state.equipmentInventory],
          claimedRegionChests: [...claimedList, regionId],
        });

        return {
          ok: true,
          message: `Claimed ${reward.title}!`,
          reward,
          droppedGear,
        };
      },

      recordDefeatedEnemies: (enemyIds) => {
        const state = get();
        const next = new Set(state.unlockedCodexIds);
        let changed = false;
        for (const id of enemyIds) {
          if (!next.has(id)) {
            next.add(id);
            changed = true;
          }
        }
        if (changed) {
          set({ unlockedCodexIds: Array.from(next) });
        }
      },

      applyCombatRewards: (summary) => {
        if (!summary.victory) return;
        const state = get();
        const cleared =
          summary.isDungeon || summary.isSpire
            ? state.clearedStages
            : state.clearedStages.includes(summary.stageId)
              ? state.clearedStages
              : [...state.clearedStages, summary.stageId];
        const nextSpireHighest =
          summary.isSpire && summary.spireFloor
            ? Math.max(state.spireHighestFloor ?? 0, summary.spireFloor)
            : (state.spireHighestFloor ?? 0);

        const today = getTodayKey();
        let nextDungeonEntriesUsed =
          state.dungeonResetDay === today ? { ...(state.dungeonEntriesUsed ?? {}) } : {};
        let nextDungeonResetDay = state.dungeonResetDay === today ? state.dungeonResetDay : today;
        let nextDungeonTickets = state.dungeonTickets ?? 0;
        let nextDungeonBestStars = { ...(state.dungeonBestStars ?? {}) };

        if (summary.isDungeon && summary.dungeonId) {
          const usedToday = nextDungeonEntriesUsed[summary.dungeonId] ?? 0;
          if (usedToday < DAILY_DUNGEON_FREE_ENTRIES) {
            nextDungeonEntriesUsed[summary.dungeonId] = usedToday + 1;
          } else if (nextDungeonTickets > 0) {
            nextDungeonTickets -= 1;
          }
          if (summary.dungeonTier) {
            const starKey = getDungeonTierStarKey(summary.dungeonId, summary.dungeonTier);
            const earned = summary.starsEarned ?? 3;
            nextDungeonBestStars[starKey] = Math.max(nextDungeonBestStars[starKey] ?? 0, earned);
          }
        }

        const nextEssences: Record<Faction, number> = { ...state.factionEssences };
        for (const [fac, qty] of Object.entries(summary.essencesEarned) as Array<[Faction, number]>) {
          if (qty > 0) nextEssences[fac] = (nextEssences[fac] ?? 0) + qty;
        }

        let nextRelics = [...state.ownedRelics];
        let nextRelicRanks = { ...state.relicRanks };
        let nextCodex = [...state.unlockedCodexIds];
        let nextFragments = state.relicFragments + summary.relicFragmentsEarned;

        for (const drop of summary.droppedRelics) {
          const added = addRelicToState(
            nextRelics,
            nextRelicRanks,
            nextCodex,
            nextFragments,
            drop.relicId,
          );
          nextRelics = added.ownedRelics;
          nextRelicRanks = added.relicRanks;
          nextCodex = added.unlockedCodexIds;
          nextFragments = added.relicFragments;
        }

        const nextRoster: Record<string, OwnedHeroState> = { ...state.roster };
        if (summary.heroExpResults) {
          for (const [hid, res] of Object.entries(summary.heroExpResults)) {
            const own = nextRoster[hid];
            if (!own) continue;
            nextRoster[hid] = {
              ...own,
              level: res.newLevel,
              exp: res.newExp,
            };
          }
        }

        const linkBurstsEarned = summary.battleReport?.linkBursts ?? 0;
        const bossBreaksEarned = summary.battleReport?.bossBreaks ?? 0;
        const dailyBump = bumpDailyProgress(state, {
          daily_clear_battles: 1,
          daily_boss_break: bossBreaksEarned,
          daily_link_burst: linkBurstsEarned,
          daily_spire_ascent: summary.isSpire ? 1 : 0,
        });

        set({
          gold: state.gold + summary.goldEarned,
          starlightCrystals: state.starlightCrystals + summary.crystalsEarned,
          expPotions: state.expPotions + summary.expPotionsEarned,
          forgeStones: state.forgeStones + summary.forgeStonesEarned,
          starIronIngots: state.starIronIngots + summary.starIronIngotsEarned,
          astralAnvilCores: state.astralAnvilCores + summary.astralAnvilCoresEarned,
          starCores: state.starCores + summary.starCoresEarned,
          relicFragments: nextFragments,
          factionEssences: nextEssences,
          bondGifts: state.bondGifts + summary.bondGiftsEarned,
          equipmentInventory: [...summary.droppedEquipment, ...state.equipmentInventory],
          roster: nextRoster,
          ownedRelics: nextRelics,
          relicRanks: nextRelicRanks,
          unlockedCodexIds: nextCodex,
          clearedStages: cleared,
          dungeonTickets: nextDungeonTickets,
          dungeonEntriesUsed: nextDungeonEntriesUsed,
          dungeonResetDay: nextDungeonResetDay,
          dungeonBestStars: nextDungeonBestStars,
          spireHighestFloor: nextSpireHighest,
          lifetimeLinkBursts: (state.lifetimeLinkBursts ?? 0) + linkBurstsEarned,
          ...dailyBump,
        });
      },

      claimDailySupply: () => {
        const state = get();
        const now = Date.now();
        const elapsed = now - (state.lastDailySupplyAt ?? 0);
        if (elapsed < DAILY_SUPPLY_COOLDOWN_MS) {
          const remMin = Math.ceil((DAILY_SUPPLY_COOLDOWN_MS - elapsed) / 60000);
          const hrs = Math.floor(remMin / 60);
          const mins = remMin % 60;
          return {
            ok: false,
            message: `Next Supply Dispatch in ${hrs}h ${mins}m`,
          };
        }
        set({
          gold: state.gold + 1800,
          starlightCrystals: state.starlightCrystals + 160,
          expPotions: state.expPotions + 4,
          forgeStones: state.forgeStones + 5,
          starCores: state.starCores + 1,
          dungeonTickets: (state.dungeonTickets ?? 0) + 1,
          factionEssences: {
            SOLARIS: state.factionEssences.SOLARIS + 1,
            ASTRAL: state.factionEssences.ASTRAL + 1,
            VERDANT: state.factionEssences.VERDANT + 1,
            ASHEN: state.factionEssences.ASHEN + 1,
          },
          lastDailySupplyAt: now,
          ...bumpDailyProgress(state, { daily_summon_or_supply: 1 }),
        });
        return {
          ok: true,
          message: 'Claimed Supply! +1,800g • +160 Crystals • +4 EXP • +5 Stones • +1 Core • +1 Rift Ticket',
        };
      },

      sweepSpireDaily: () => {
        const state = get();
        const highest = state.spireHighestFloor ?? 0;
        if (highest < 1) {
          return { ok: false, message: 'Clear Astral Spire Floor 1 first to unlock Daily Spire Tribute!' };
        }
        const today = getTodayKey();
        if (state.spireLastSweepDay === today) {
          return { ok: false, message: 'Daily Spire Tribute already claimed today! Return tomorrow.' };
        }
        const rewards = {
          gold: Math.round(1400 + highest * 420),
          crystals: Math.min(360, 60 + Math.floor(highest / 2) * 12),
          expPotions: 2 + Math.floor(highest / 6),
          forgeStones: 3 + Math.floor(highest / 4),
          starCores: Math.max(1, Math.floor(highest / 10) + 1),
          relicFragments: 2 + Math.floor(highest / 5),
        };
        set({
          gold: state.gold + rewards.gold,
          starlightCrystals: state.starlightCrystals + rewards.crystals,
          expPotions: state.expPotions + rewards.expPotions,
          forgeStones: state.forgeStones + rewards.forgeStones,
          starCores: state.starCores + rewards.starCores,
          relicFragments: state.relicFragments + rewards.relicFragments,
          spireLastSweepDay: today,
          ...bumpDailyProgress(state, { daily_spire_ascent: 1, daily_clear_battles: 1 }),
        });
        return {
          ok: true,
          message: `Daily Spire Tribute (Floor ${highest}): +${rewards.crystals} Crystals • +${rewards.gold.toLocaleString()}g • +${rewards.relicFragments} Relic Frags!`,
          rewards,
        };
      },

      claimDailyCommission: (id) => {
        const state = get();
        const def = DAILY_COMMISSIONS.find((c) => c.id === id);
        if (!def) return { ok: false, message: 'Commission not found.' };
        const today = getTodayKey();
        const sameDay = state.commissionResetDay === today;
        const progress = sameDay ? (state.dailyCommissionProgress?.[id] ?? 0) : 0;
        const claimed = sameDay ? (state.claimedDailyCommissions ?? []) : [];
        if (claimed.includes(id)) return { ok: false, message: 'Already claimed today!' };
        if (progress < def.target) return { ok: false, message: `Progress ${progress}/${def.target} not complete yet.` };

        const rewardPatch = applyCommissionReward(state, def.reward);
        set({
          ...rewardPatch,
          commissionResetDay: today,
          dailyCommissionProgress: sameDay ? { ...(state.dailyCommissionProgress ?? {}) } : {},
          claimedDailyCommissions: [...claimed, id],
          claimedActivityMilestones: sameDay ? [...(state.claimedActivityMilestones ?? [])] : [],
        });
        return { ok: true, message: `Claimed ${def.title} (+${def.activityPoints} Activity Pts)!` };
      },

      claimActivityMilestone: (points) => {
        const state = get();
        const def = DAILY_ACTIVITY_MILESTONES.find((m) => m.points === points);
        if (!def) return { ok: false, message: 'Activity chest not found.' };
        const today = getTodayKey();
        const sameDay = state.commissionResetDay === today;
        const claimedDaily = sameDay ? (state.claimedDailyCommissions ?? []) : [];
        const claimedMilestones = sameDay ? (state.claimedActivityMilestones ?? []) : [];
        const currentPts = computeDailyActivityPoints(claimedDaily);
        if (claimedMilestones.includes(points)) return { ok: false, message: 'Activity chest already claimed!' };
        if (currentPts < points) return { ok: false, message: `Need ${points} Activity Points (Current: ${currentPts}).` };

        const rewardPatch = applyCommissionReward(state, def.reward);
        set({
          ...rewardPatch,
          commissionResetDay: today,
          claimedActivityMilestones: [...claimedMilestones, points],
        });
        return { ok: true, message: `Opened ${def.label} (${points} pts)!` };
      },

      claimPermanentCommission: (id) => {
        const state = get();
        const def = PERMANENT_COMMISSIONS.find((c) => c.id === id);
        if (!def) return { ok: false, message: 'Milestone not found.' };
        const claimed = state.claimedPermanentCommissions ?? [];
        if (claimed.includes(id)) return { ok: false, message: 'Already claimed!' };
        const prog = def.getProgress(state);
        if (prog < def.target) return { ok: false, message: `Progress ${prog}/${def.target} not complete.` };

        const rewardPatch = applyCommissionReward(state, def.reward);
        set({
          ...rewardPatch,
          claimedPermanentCommissions: [...claimed, id],
        });
        return { ok: true, message: `Claimed Milestone: ${def.title}!` };
      },

      claimAllCommissions: () => {
        let count = 0;
        const today = getTodayKey();
        for (const c of DAILY_COMMISSIONS) {
          const st = get();
          const sameDay = st.commissionResetDay === today;
          const prog = sameDay ? (st.dailyCommissionProgress?.[c.id] ?? 0) : 0;
          const claimed = sameDay ? (st.claimedDailyCommissions ?? []) : [];
          if (prog >= c.target && !claimed.includes(c.id)) {
            if (get().claimDailyCommission(c.id).ok) count += 1;
          }
        }
        for (const m of DAILY_ACTIVITY_MILESTONES) {
          const st = get();
          const sameDay = st.commissionResetDay === today;
          const claimedDaily = sameDay ? (st.claimedDailyCommissions ?? []) : [];
          const claimedMs = sameDay ? (st.claimedActivityMilestones ?? []) : [];
          if (computeDailyActivityPoints(claimedDaily) >= m.points && !claimedMs.includes(m.points)) {
            if (get().claimActivityMilestone(m.points).ok) count += 1;
          }
        }
        for (const p of PERMANENT_COMMISSIONS) {
          const st = get();
          if (
            p.getProgress(st) >= p.target &&
            !(st.claimedPermanentCommissions ?? []).includes(p.id)
          ) {
            if (get().claimPermanentCommission(p.id).ok) count += 1;
          }
        }
        if (count === 0) return { ok: false, count: 0, message: 'No completed commissions ready to claim.' };
        return { ok: true, count, message: `Claimed ${count} commission reward${count > 1 ? 's' : ''}!` };
      },

      getClaimableCommissionsCount: () => {
        const st = get();
        const today = getTodayKey();
        const sameDay = st.commissionResetDay === today;
        const claimedDaily = sameDay ? (st.claimedDailyCommissions ?? []) : [];
        const claimedMs = sameDay ? (st.claimedActivityMilestones ?? []) : [];
        let total = 0;
        for (const c of DAILY_COMMISSIONS) {
          const prog = sameDay ? (st.dailyCommissionProgress?.[c.id] ?? 0) : 0;
          if (prog >= c.target && !claimedDaily.includes(c.id)) total += 1;
        }
        const pts = computeDailyActivityPoints(claimedDaily);
        for (const m of DAILY_ACTIVITY_MILESTONES) {
          if (pts >= m.points && !claimedMs.includes(m.points)) total += 1;
        }
        for (const p of PERMANENT_COMMISSIONS) {
          if (
            p.getProgress(st) >= p.target &&
            !(st.claimedPermanentCommissions ?? []).includes(p.id)
          ) {
            total += 1;
          }
        }
        return total;
      },

      resetSave: () => set(buildDefaultSaveState()),
    }),
    {
      name: 'starlight-chasers-save-v3',
    },
  ),
);
