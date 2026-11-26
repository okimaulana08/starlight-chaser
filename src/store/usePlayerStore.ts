import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { createStarterEquipment, generateEquipment } from '../data/equipment';
import { HERO_MAP } from '../data/heroes';
import { RELIC_MAP } from '../data/relics';
import { enhanceEquipmentItem, getEnhanceCost } from '../systems/ForgeSystem';
import { executeGachaPulls } from '../systems/GachaSystem';
import type {
  BannerDef,
  CombatLootSummary,
  EquipmentInstance,
  EquipmentSlot,
  GachaPullResult,
  OwnedHeroState,
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
  { threshold: 24, crystals: 1600, label: 'Complete Aetheria Codex (+4% ATK / +4% HP)' },
];

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

  // Vaelen joins as Chapter 1's signature Solaris Vanguard protagonist so the opening showcase features real anime art!
  const vaelen = createOwnedHero('vaelen', 8);
  vaelen.equippedGear.WEAPON = 'starter_eq_1';
  vaelen.equippedRelicId = 'relic_first_eclipse';

  const garrick = createOwnedHero('garrick', 8);
  garrick.equippedGear.ARMOR = 'starter_eq_2';
  garrick.equippedGear.EMBLEM = 'starter_eq_6';

  const clara = createOwnedHero('clara', 8);
  clara.equippedGear.ACCESSORY = 'starter_eq_3';
  clara.equippedRelicId = 'relic_dawnlight_lantern';

  const kael = createOwnedHero('kael', 8);
  const nyx = createOwnedHero('nyx', 8);
  nyx.equippedGear.EMBLEM = 'starter_eq_4';
  nyx.equippedGear.WEAPON = 'starter_eq_5';

  // Ensure starter weapon ownership aligns with Vaelen
  const fixedGear = starterGear.map((g) =>
    g.uid === 'starter_eq_1' ? { ...g, equippedHeroId: 'vaelen' } : g,
  );

  return {
    commanderName: 'Chaser Commander',
    favoriteHeroId: 'vaelen',
    gold: 12000,
    starlightCrystals: 4800, // 30x immediate gacha pulls per GDD Sprint 1
    starDust: 60,
    starlightTokens: 0,
    expPotions: 32,
    forgeStones: 28,
    bondGifts: 10,
    pityCounterHero: 0,
    pityCounterRelic: 0,
    guaranteedFeaturedHero: false,
    guaranteedFeaturedRelic: false,
    squadIds: ['garrick', 'vaelen', 'nyx', 'clara'],
    roster: {
      vaelen,
      garrick,
      clara,
      kael,
      nyx,
    },
    ownedRelics: ['relic_first_eclipse', 'relic_dawnlight_lantern'],
    equipmentInventory: fixedGear,
    unlockedCodexIds: [
      'vaelen',
      'garrick',
      'clara',
      'kael',
      'nyx',
      'relic_first_eclipse',
      'relic_dawnlight_lantern',
    ],
    claimedCodexMilestones: [],
    clearedStages: [],
    selectedStageId: 'stage_1_1',
  };
}

interface PlayerStore extends PlayerSaveState {
  setFavoriteHero: (heroId: string) => void;
  setSelectedStage: (stageId: string) => void;
  setSquadSlot: (slotIndex: number, heroId: string) => void;
  levelUpHero: (heroId: string, levels?: number) => boolean;
  awakenHero: (heroId: string) => boolean;
  giveBondGift: (heroId: string) => boolean;
  equipRelic: (heroId: string, relicId: string | null) => void;
  equipGear: (heroId: string, slot: EquipmentSlot, uid: string | null) => void;
  enhanceGear: (uid: string) => { ok: boolean; message: string };
  salvageGear: (uid: string) => void;
  pullBanner: (
    banner: BannerDef,
    count: 1 | 10,
  ) => { ok: boolean; error?: string; results: GachaPullResult[] };
  sparkExchange: (kind: 'HERO' | 'RELIC', id: string) => boolean;
  claimCodexMilestone: (threshold: number) => boolean;
  recordDefeatedEnemies: (enemyIds: string[]) => void;
  applyCombatRewards: (summary: CombatLootSummary) => void;
  grantDebugResources: () => void;
  resetSave: () => void;
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

      setSquadSlot: (slotIndex, heroId) => {
        const state = get();
        if (!state.roster[heroId] || slotIndex < 0 || slotIndex > 3) return;
        const next = [...state.squadIds] as [string, string, string, string];
        const existingIdx = next.indexOf(heroId);
        if (existingIdx !== -1 && existingIdx !== slotIndex) {
          next[existingIdx] = next[slotIndex];
        }
        next[slotIndex] = heroId;
        set({ squadIds: next });
      },

      levelUpHero: (heroId, levels = 1) => {
        const state = get();
        const hero = state.roster[heroId];
        if (!hero || hero.level >= 80) return false;
        const targetLevels = Math.min(levels, 80 - hero.level);
        let potionsNeeded = 0;
        let goldNeeded = 0;
        for (let i = 0; i < targetLevels; i++) {
          const cur = hero.level + i;
          potionsNeeded += Math.max(1, Math.floor(cur / 6) + 1);
          goldNeeded += 120 + cur * 35;
        }
        if (state.expPotions < potionsNeeded || state.gold < goldNeeded) return false;

        set({
          expPotions: state.expPotions - potionsNeeded,
          gold: state.gold - goldNeeded,
          roster: {
            ...state.roster,
            [heroId]: { ...hero, level: hero.level + targetLevels },
          },
        });
        return true;
      },

      awakenHero: (heroId) => {
        const state = get();
        const hero = state.roster[heroId];
        if (!hero || hero.awakening >= 6) return false;
        const shardCost = 10 + hero.awakening * 5;
        const dustFallback = Math.max(0, shardCost - hero.shards) * 4;
        const canUseShards = hero.shards >= shardCost;
        const canUseDust = !canUseShards && state.starDust >= dustFallback;
        const goldCost = 1000 * (hero.awakening + 1);
        if (state.gold < goldCost || (!canUseShards && !canUseDust)) return false;

        const nextShards = canUseShards ? hero.shards - shardCost : 0;
        const nextDust = canUseShards ? state.starDust : state.starDust - dustFallback;
        set({
          gold: state.gold - goldCost,
          starDust: nextDust,
          roster: {
            ...state.roster,
            [heroId]: {
              ...hero,
              awakening: hero.awakening + 1,
              shards: nextShards,
            },
          },
        });
        return true;
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
        const nextRoster: Record<string, OwnedHeroState> = { ...state.roster };
        // Unequip from any other hero holding this relic
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
            // If worn by another hero, detach from them first
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
        if (!target) return { ok: false, message: 'Equipment not found.' };
        if (target.enhanceLevel >= 15) return { ok: false, message: 'Already at max +15.' };
        const cost = getEnhanceCost(target);
        if (state.gold < cost.gold) {
          return { ok: false, message: `Need ${cost.gold} Gold.` };
        }
        if (state.forgeStones < cost.forgeStones) {
          return { ok: false, message: `Need ${cost.forgeStones} Forge Stones.` };
        }

        const { updated, upgradedSubStat } = enhanceEquipmentItem(target);
        const nextInv = state.equipmentInventory.map((i) => (i.uid === uid ? updated : i));
        set({
          gold: state.gold - cost.gold,
          forgeStones: state.forgeStones - cost.forgeStones,
          equipmentInventory: nextInv,
        });
        return {
          ok: true,
          message: upgradedSubStat
            ? `Enhanced to +${updated.enhanceLevel}! (${upgradedSubStat})`
            : `Enhanced to +${updated.enhanceLevel}!`,
        };
      },

      salvageGear: (uid) => {
        const state = get();
        const item = state.equipmentInventory.find((i) => i.uid === uid);
        if (!item || item.equippedHeroId) return;
        const stones =
          item.rarity === 'LEGENDARY'
            ? 8
            : item.rarity === 'EPIC'
              ? 5
              : item.rarity === 'RARE'
                ? 3
                : 1;
        set({
          forgeStones: state.forgeStones + stones + Math.floor(item.enhanceLevel * 0.5),
          gold: state.gold + 150 * (item.enhanceLevel + 1),
          equipmentInventory: state.equipmentInventory.filter((i) => i.uid !== uid),
        });
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
        const nextRelics = [...state.ownedRelics];
        const nextCodex = new Set(state.unlockedCodexIds);
        let dustGain = 0;

        for (const res of out.results) {
          nextCodex.add(res.id);
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
            if (!nextRelics.includes(res.id)) {
              nextRelics.push(res.id);
            }
          }
        }

        set({
          starlightCrystals: state.starlightCrystals - cost,
          starlightTokens: state.starlightTokens + count,
          starDust: state.starDust + dustGain,
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
          unlockedCodexIds: Array.from(nextCodex),
        });

        return { ok: true, results: out.results };
      },

      sparkExchange: (kind, id) => {
        const state = get();
        if (state.starlightTokens < 120) return false;
        const nextCodex = new Set(state.unlockedCodexIds);
        nextCodex.add(id);

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
            unlockedCodexIds: Array.from(nextCodex),
          });
          return true;
        } else {
          if (!RELIC_MAP[id]) return false;
          const nextRelics = state.ownedRelics.includes(id)
            ? state.ownedRelics
            : [...state.ownedRelics, id];
          set({
            starlightTokens: state.starlightTokens - 120,
            ownedRelics: nextRelics,
            unlockedCodexIds: Array.from(nextCodex),
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

        set({
          gold: state.gold + summary.goldEarned,
          starlightCrystals: state.starlightCrystals + summary.crystalsEarned,
          expPotions: state.expPotions + summary.expPotionsEarned,
          forgeStones: state.forgeStones + summary.forgeStonesEarned,
          bondGifts: state.bondGifts + summary.bondGiftsEarned,
          equipmentInventory: [...summary.droppedEquipment, ...state.equipmentInventory],
          clearedStages: cleared,
        });
      },

      grantDebugResources: () => {
        const state = get();
        const bonusGear: EquipmentInstance[] = [
          generateEquipment({ rarity: 'LEGENDARY', setId: 'VANGUARD' }),
          generateEquipment({ rarity: 'EPIC', setId: 'ASTRAL_SURGE' }),
        ];
        set({
          starlightCrystals: state.starlightCrystals + 3200,
          gold: state.gold + 10000,
          expPotions: state.expPotions + 25,
          forgeStones: state.forgeStones + 25,
          bondGifts: state.bondGifts + 5,
          equipmentInventory: [...bonusGear, ...state.equipmentInventory],
        });
      },

      resetSave: () => set(buildInitialSave()),
    }),
    {
      name: 'starlight-chasers-save-v2',
    },
  ),
);
