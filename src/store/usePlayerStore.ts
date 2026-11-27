import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { createStarterEquipment, generateEquipment } from '../data/equipment';
import { HERO_MAP } from '../data/heroes';
import {
  SHOP_OFFERS,
  getAwakeningCost,
  getLevelUpCost,
} from '../data/materials';
import { RELIC_MAP } from '../data/relics';
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
  EquipmentInstance,
  EquipmentSlot,
  Faction,
  GachaPullResult,
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
export const SHOP_RESTOCK_GOLD_COST = 1500;
export const MAX_RELIC_RANK = 5;

function getTodayKey(): string {
  const d = new Date();
  return `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;
}

function createOwnedHero(heroId: string, level = 1): OwnedHeroState {
  return {
    heroId,
    level,
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

function buildInitialSave(): PlayerSaveState {
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
    gold: 8500,
    starlightCrystals: 3200, // 20x starter gacha pulls
    starDust: 30,
    starlightTokens: 0,
    expPotions: 18,
    forgeStones: 18,
    starIronIngots: 4,
    astralAnvilCores: 0,
    starCores: 2,
    relicFragments: 0,
    factionEssences: {
      SOLARIS: 4,
      ASTRAL: 2,
      VERDANT: 2,
      ASHEN: 2,
    },
    bondGifts: 6,
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
    clearedStages: [],
    selectedStageId: 'stage_1_1',
    shopPurchases: {},
    shopResetDay: getTodayKey(),
    lastDailySupplyAt: 0,
  };
}

interface PlayerStore extends PlayerSaveState {
  setFavoriteHero: (heroId: string) => void;
  setSelectedStage: (stageId: string) => void;
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
  recordDefeatedEnemies: (enemyIds: string[]) => void;
  applyCombatRewards: (summary: CombatLootSummary) => void;
  claimDailySupply: () => { ok: boolean; message: string };
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

export const usePlayerStore = create<PlayerStore>()(
  persist(
    (set, get) => ({
      ...buildInitialSave(),

      setFavoriteHero: (heroId) => {
        if (get().roster[heroId]) {
          set({ favoriteHeroId: heroId });
        }
      },

      setSelectedStage: (stageId) => set({ selectedStageId: stageId }),

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
            [heroId]: { ...hero, level: hero.level + cost.actualLevels },
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
        if (!item || item.equippedHeroId) return;
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
        const cleared = state.clearedStages.includes(summary.stageId)
          ? state.clearedStages
          : [...state.clearedStages, summary.stageId];

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
          ownedRelics: nextRelics,
          relicRanks: nextRelicRanks,
          unlockedCodexIds: nextCodex,
          clearedStages: cleared,
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
          gold: state.gold + 2000,
          starlightCrystals: state.starlightCrystals + 160,
          expPotions: state.expPotions + 6,
          forgeStones: state.forgeStones + 5,
          starCores: state.starCores + 1,
          factionEssences: {
            SOLARIS: state.factionEssences.SOLARIS + 1,
            ASTRAL: state.factionEssences.ASTRAL + 1,
            VERDANT: state.factionEssences.VERDANT + 1,
            ASHEN: state.factionEssences.ASHEN + 1,
          },
          lastDailySupplyAt: now,
        });
        return {
          ok: true,
          message: 'Claimed Supply! +2,000g • +160 Crystals • +6 EXP • +5 Stones • +1 Core & Essences',
        };
      },

      resetSave: () => set(buildInitialSave()),
    }),
    {
      name: 'starlight-chasers-save-v3',
    },
  ),
);
