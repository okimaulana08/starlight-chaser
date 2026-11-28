import type { CommissionReward } from './commissions';
import type {
  LabyrinthNodeState,
  LabyrinthNodeType,
  LabyrinthRunState,
  StageDef,
  StageWave,
} from '../types/game';

export type BlessingRarity = 'COMMON' | 'RARE' | 'MYTHIC';

export interface AstralBlessingDef {
  id: string;
  name: string;
  rarity: BlessingRarity;
  category: 'OFFENSE' | 'CRIT' | 'DEFENSE' | 'SYNERGY' | 'ARCANE';
  color: string;
  desc: string;
  mods: {
    atkPct?: number;
    hpPct?: number;
    defPct?: number;
    critRate?: number;
    critDmg?: number;
    skillDmgBonus?: number;
    ultDmgBonus?: number;
    finalDmgBonus?: number;
    breakDmgBonus?: number;
    ultGaugeBonus?: number;
    spRegenMult?: number;
    cdrBonus?: number;
    startShieldPct?: number;
    lifestealPct?: number;
    critChainLightningPct?: number;
    linkBurstBonus?: number;
    executeBelow50Pct?: number;
    startingUltGauge?: number;
    skillBurnStacks?: number;
  };
}

export const ASTRAL_BLESSINGS: AstralBlessingDef[] = [
  // COMMON (6)
  {
    id: 'bl_solar_edge',
    name: 'Solar Overcharge',
    rarity: 'COMMON',
    category: 'OFFENSE',
    color: '#f5c84c',
    desc: 'All allies gain +24% ATK throughout the Labyrinth.',
    mods: { atkPct: 0.24 },
  },
  {
    id: 'bl_keen_constellation',
    name: 'Keen Constellation',
    rarity: 'COMMON',
    category: 'CRIT',
    color: '#fb923c',
    desc: 'All allies gain +16% Crit Rate and +25% Crit DMG.',
    mods: { critRate: 0.16, critDmg: 0.25 },
  },
  {
    id: 'bl_aegis_bastion',
    name: 'Aegis Protocol',
    rarity: 'COMMON',
    category: 'DEFENSE',
    color: '#38bdf8',
    desc: 'Start every Labyrinth battle with a 30% Max HP Shield.',
    mods: { startShieldPct: 0.3 },
  },
  {
    id: 'bl_verdant_vitality',
    name: 'World-Tree Vitality',
    rarity: 'COMMON',
    category: 'DEFENSE',
    color: '#34d399',
    desc: 'All allies gain +28% Max HP and +22% DEF.',
    mods: { hpPct: 0.28, defPct: 0.22 },
  },
  {
    id: 'bl_astral_flow',
    name: 'Astral Current',
    rarity: 'COMMON',
    category: 'ARCANE',
    color: '#38e8ff',
    desc: 'Squad SP Regeneration +40% and Skill DMG +22%.',
    mods: { spRegenMult: 0.4, skillDmgBonus: 0.22 },
  },
  {
    id: 'bl_guard_shatter',
    name: 'Guard Breaker',
    rarity: 'COMMON',
    category: 'OFFENSE',
    color: '#f97316',
    desc: 'Deal +55% Boss & Elite Stagger Break DMG.',
    mods: { breakDmgBonus: 0.55 },
  },

  // RARE (7)
  {
    id: 'bl_vampiric_eclipse',
    name: 'Vampiric Eclipse',
    rarity: 'RARE',
    category: 'DEFENSE',
    color: '#fb7185',
    desc: 'All heroes heal for 12% of all combat damage dealt (Lifesteal).',
    mods: { lifestealPct: 0.12, atkPct: 0.12 },
  },
  {
    id: 'bl_chain_lightning',
    name: 'Starlight Chain Arc',
    rarity: 'RARE',
    category: 'CRIT',
    color: '#38e8ff',
    desc: 'Every Critical Hit unleashes a 45% ATK AoE Starlight Chain shockwave!',
    mods: { critRate: 0.12, critChainLightningPct: 0.45 },
  },
  {
    id: 'bl_chrono_haste',
    name: 'Chrono Acceleration',
    rarity: 'RARE',
    category: 'ARCANE',
    color: '#a78bfa',
    desc: 'Skill Cooldowns -22% and SP Regeneration +55%.',
    mods: { cdrBonus: 0.22, spRegenMult: 0.55 },
  },
  {
    id: 'bl_link_resonance',
    name: 'Dual-Link Overdrive',
    rarity: 'RARE',
    category: 'SYNERGY',
    color: '#e879f9',
    desc: 'Starlight Link Burst DMG +50% and Party Ult Gauge Gain +35%.',
    mods: { linkBurstBonus: 0.5, ultGaugeBonus: 0.35 },
  },
  {
    id: 'bl_executioner',
    name: 'Executioner’s Decree',
    rarity: 'RARE',
    category: 'OFFENSE',
    color: '#f43f5e',
    desc: 'Deal +42% Bonus DMG to enemies below 50% HP.',
    mods: { executeBelow50Pct: 0.42 },
  },
  {
    id: 'bl_pyroclasm_rune',
    name: 'Caldera Pyroclasm',
    rarity: 'RARE',
    category: 'ARCANE',
    color: '#fb923c',
    desc: 'Every Skill hit inflicts 2 Burn stacks and increases Skill DMG +30%.',
    mods: { skillBurnStacks: 2, skillDmgBonus: 0.3 },
  },
  {
    id: 'bl_sovereign_fury',
    name: 'Sovereign Crit Surge',
    rarity: 'RARE',
    category: 'CRIT',
    color: '#fde047',
    desc: 'Crit Rate +22%, Crit DMG +50%, and Ultimate DMG +25%.',
    mods: { critRate: 0.22, critDmg: 0.5, ultDmgBonus: 0.25 },
  },

  // MYTHIC (5)
  {
    id: 'bl_empyrean_decree',
    name: 'Empyrean Sovereign Decree',
    rarity: 'MYTHIC',
    category: 'SYNERGY',
    color: '#fde047',
    desc: 'MYTHIC: Start every battle with +45 Ult Gauge (Instant ULT!) and +35% Final DMG!',
    mods: { startingUltGauge: 45, finalDmgBonus: 0.35 },
  },
  {
    id: 'bl_zero_meridian',
    name: 'Zero Meridian Singularity',
    rarity: 'MYTHIC',
    category: 'CRIT',
    color: '#c084fc',
    desc: 'MYTHIC: +28% Crit Rate, +75% Crit DMG, and Crits trigger 65% ATK AoE Starlight Arc!',
    mods: { critRate: 0.28, critDmg: 0.75, critChainLightningPct: 0.65 },
  },
  {
    id: 'bl_immortal_starlight',
    name: 'Immortal Starlight Sanctuary',
    rarity: 'MYTHIC',
    category: 'DEFENSE',
    color: '#34d399',
    desc: 'MYTHIC: Start with 50% Max HP Shield, +35% Max HP, and 16% Lifesteal!',
    mods: { startShieldPct: 0.5, hpPct: 0.35, lifestealPct: 0.16 },
  },
  {
    id: 'bl_infinite_spiral',
    name: 'Infinite Astral Spiral',
    rarity: 'MYTHIC',
    category: 'ARCANE',
    color: '#38e8ff',
    desc: 'MYTHIC: +90% SP Regen, -28% Skill Cooldowns, and +50% Ultimate DMG!',
    mods: { spRegenMult: 0.9, cdrBonus: 0.28, ultDmgBonus: 0.5 },
  },
  {
    id: 'bl_apex_cataclysm',
    name: 'Apex Cataclysm Overlord',
    rarity: 'MYTHIC',
    category: 'OFFENSE',
    color: '#f43f5e',
    desc: 'MYTHIC: +45% ATK, +70% Break DMG, and +30% Final DMG against all foes!',
    mods: { atkPct: 0.45, breakDmgBonus: 0.7, finalDmgBonus: 0.3 },
  },
];

export const ASTRAL_BLESSING_MAP: Record<string, AstralBlessingDef> = Object.fromEntries(
  ASTRAL_BLESSINGS.map((b) => [b.id, b]),
);

export interface AggregatedBlessingMods {
  atkPct: number;
  hpPct: number;
  defPct: number;
  critRate: number;
  critDmg: number;
  skillDmgBonus: number;
  ultDmgBonus: number;
  finalDmgBonus: number;
  breakDmgBonus: number;
  ultGaugeBonus: number;
  spRegenMult: number;
  cdrBonus: number;
  startShieldPct: number;
  lifestealPct: number;
  critChainLightningPct: number;
  linkBurstBonus: number;
  executeBelow50Pct: number;
  startingUltGauge: number;
  skillBurnStacks: number;
}

export function computeLabyrinthBlessingMods(blessingIds: string[]): AggregatedBlessingMods {
  const acc: AggregatedBlessingMods = {
    atkPct: 0,
    hpPct: 0,
    defPct: 0,
    critRate: 0,
    critDmg: 0,
    skillDmgBonus: 0,
    ultDmgBonus: 0,
    finalDmgBonus: 0,
    breakDmgBonus: 0,
    ultGaugeBonus: 0,
    spRegenMult: 0,
    cdrBonus: 0,
    startShieldPct: 0,
    lifestealPct: 0,
    critChainLightningPct: 0,
    linkBurstBonus: 0,
    executeBelow50Pct: 0,
    startingUltGauge: 0,
    skillBurnStacks: 0,
  };
  for (const id of blessingIds) {
    const def = ASTRAL_BLESSING_MAP[id];
    if (!def) continue;
    const m = def.mods;
    if (m.atkPct) acc.atkPct += m.atkPct;
    if (m.hpPct) acc.hpPct += m.hpPct;
    if (m.defPct) acc.defPct += m.defPct;
    if (m.critRate) acc.critRate += m.critRate;
    if (m.critDmg) acc.critDmg += m.critDmg;
    if (m.skillDmgBonus) acc.skillDmgBonus += m.skillDmgBonus;
    if (m.ultDmgBonus) acc.ultDmgBonus += m.ultDmgBonus;
    if (m.finalDmgBonus) acc.finalDmgBonus += m.finalDmgBonus;
    if (m.breakDmgBonus) acc.breakDmgBonus += m.breakDmgBonus;
    if (m.ultGaugeBonus) acc.ultGaugeBonus += m.ultGaugeBonus;
    if (m.spRegenMult) acc.spRegenMult += m.spRegenMult;
    if (m.cdrBonus) acc.cdrBonus = Math.min(0.45, acc.cdrBonus + m.cdrBonus);
    if (m.startShieldPct) acc.startShieldPct += m.startShieldPct;
    if (m.lifestealPct) acc.lifestealPct += m.lifestealPct;
    if (m.critChainLightningPct) acc.critChainLightningPct += m.critChainLightningPct;
    if (m.linkBurstBonus) acc.linkBurstBonus += m.linkBurstBonus;
    if (m.executeBelow50Pct) acc.executeBelow50Pct += m.executeBelow50Pct;
    if (m.startingUltGauge) acc.startingUltGauge += m.startingUltGauge;
    if (m.skillBurnStacks) acc.skillBurnStacks += m.skillBurnStacks;
  }
  return acc;
}

export function rollBlessingChoices(
  ownedIds: string[],
  tierBias: 'STANDARD' | 'ELITE' | 'MYTHIC' = 'STANDARD',
): string[] {
  const ownedSet = new Set(ownedIds);
  const available = ASTRAL_BLESSINGS.filter((b) => !ownedSet.has(b.id));
  const pool = available.length >= 3 ? available : [...ASTRAL_BLESSINGS];

  const weightFor = (r: BlessingRarity) => {
    if (tierBias === 'MYTHIC') return r === 'MYTHIC' ? 5 : r === 'RARE' ? 3 : 1;
    if (tierBias === 'ELITE') return r === 'MYTHIC' ? 3 : r === 'RARE' ? 5 : 2;
    return r === 'MYTHIC' ? 1 : r === 'RARE' ? 3 : 5;
  };

  const picked: string[] = [];
  const temp = [...pool];
  while (picked.length < 3 && temp.length > 0) {
    const totalW = temp.reduce((s, b) => s + weightFor(b.rarity), 0);
    let r = Math.random() * totalW;
    let idx = 0;
    for (let i = 0; i < temp.length; i++) {
      r -= weightFor(temp[i].rarity);
      if (r <= 0) {
        idx = i;
        break;
      }
    }
    picked.push(temp[idx].id);
    temp.splice(idx, 1);
  }
  return picked;
}

export interface LabyrinthWeeklyMilestone {
  clears: number;
  label: string;
  reward: CommissionReward;
}

export const WEEKLY_LABYRINTH_MILESTONES: LabyrinthWeeklyMilestone[] = [
  {
    clears: 1,
    label: 'First Expedition Clear',
    reward: { crystals: 320, astralAnvilCores: 3, starCores: 3, relicFragments: 8 },
  },
  {
    clears: 2,
    label: 'Labyrinth Pathfinder',
    reward: { crystals: 400, astralAnvilCores: 4, starIronIngots: 5, dungeonTickets: 2 },
  },
  {
    clears: 3,
    label: 'Sovereign of the Rift',
    reward: { crystals: 640, astralAnvilCores: 6, starCores: 6, gearCrateRarity: 'LEGENDARY' },
  },
];

/**
 * Generates a 7-Stage Branching Starlight Labyrinth Expedition (10 total interactive nodes):
 * - Depth 0 (1 node): Gate Skirmish (Combat)
 * - Depth 1 (2 nodes): Left = Combat | Right = Blessing Altar
 * - Depth 2 (2 nodes): Left = Elite Guardian | Right = Treasure Vault
 * - Depth 3 (2 nodes): Left = Rest Sanctuary | Right = Combat
 * - Depth 4 (2 nodes): Left = Elite Guardian | Right = Blessing Altar
 * - Depth 5 (1 node): Labyrinth Sovereign Boss (Final Encounter)
 */
export function generateLabyrinthRun(weekKey: string, squadPower = 20000): LabyrinthRunState {
  const mkNode = (
    id: string,
    depth: number,
    lane: 0 | 1,
    type: LabyrinthNodeType,
    title: string,
    subtitle: string,
    nextIds: string[],
  ): LabyrinthNodeState => ({
    id,
    depth,
    lane,
    type,
    title,
    subtitle,
    nextIds,
    cleared: false,
  });

  const nodes: LabyrinthNodeState[] = [
    mkNode('lab_0_0', 0, 0, 'COMBAT', 'Starlight Threshold', 'Defeat Rift Patrol • Draft 1 Blessing', ['lab_1_0', 'lab_1_1']),
    mkNode('lab_1_0', 1, 0, 'COMBAT', 'Amethyst Corridor', 'Rift Ambush • Draft 1 Blessing', ['lab_2_0', 'lab_2_1']),
    mkNode('lab_1_1', 1, 1, 'ALTAR', 'Astral Blessing Altar', 'Instant 1-of-3 Rare Blessing Draft', ['lab_2_0', 'lab_2_1']),
    mkNode('lab_2_0', 2, 0, 'ELITE', 'Obsidian Gatekeeper', 'Elite Mini-Boss • High Mythic Odds + Cores', ['lab_3_0', 'lab_3_1']),
    mkNode('lab_2_1', 2, 1, 'TREASURE', 'Forgotten Star Vault', 'Instant Relic Frags, Gold & Bonus Blessing', ['lab_3_0', 'lab_3_1']),
    mkNode('lab_3_0', 3, 0, 'REST', 'Celestial Spring', 'Restore +55% HP or Revive a Fallen Chaser', ['lab_4_0', 'lab_4_1']),
    mkNode('lab_3_1', 3, 1, 'COMBAT', 'Constellation Nexus', 'High-Yield Encounter • Draft 1 Blessing', ['lab_4_0', 'lab_4_1']),
    mkNode('lab_4_0', 4, 0, 'ELITE', 'Abyssal Vanguard', 'Elite Boss • Guaranteed Mythic Draft + Anvil Core', ['lab_5_0']),
    mkNode('lab_4_1', 4, 1, 'ALTAR', 'Sovereign Star Shrine', 'Instant 1-of-3 Mythic-Biased Blessing Draft', ['lab_5_0']),
    mkNode('lab_5_0', 5, 0, 'BOSS', 'Labyrinth Sovereign', 'Final Boss • Crystals, Anvil Cores & Epic/Leg Gear!', []),
  ];

  // Adaptive power calibration so Labyrinth is thrilling for both early squads (15k) and endgame (300k+)
  const calibratedBaseScale = Math.max(0.75, Math.min(4.8, squadPower / 24000));

  return {
    runId: `labrun_${Date.now()}`,
    weekKey,
    nodes,
    currentDepth: 0,
    availableNodeIds: ['lab_0_0'],
    activeBlessingIds: [],
    pendingBlessingChoices: [],
    heroHpRatios: {},
    baseScale: Number(calibratedBaseScale.toFixed(2)),
    completed: false,
    failed: false,
  };
}

export function encodeLabyrinthStageId(nodeId: string): string {
  return `labyrinth__${nodeId}`;
}

export function parseLabyrinthStageId(stageId: string): string | null {
  if (!stageId.startsWith('labyrinth__')) return null;
  return stageId.slice('labyrinth__'.length) || null;
}

export function buildLabyrinthStageDef(
  nodeId: string,
  run: LabyrinthRunState | null | undefined,
): StageDef {
  const node = run?.nodes.find((n) => n.id === nodeId);
  const depth = node?.depth ?? 0;
  const type: LabyrinthNodeType = node?.type ?? 'COMBAT';
  const baseScale = run?.baseScale ?? 1.0;

  const depthMult = 1 + depth * 0.22 + (type === 'ELITE' ? 0.28 : type === 'BOSS' ? 0.55 : 0);
  const enemyScale = Number((baseScale * depthMult).toFixed(2));
  const recPower = Math.round(14000 * enemyScale);

  const waves: StageWave[] =
    type === 'BOSS'
      ? [
          {
            label: 'Wave 1 — Labyrinth Guardians',
            spawns: [
              { enemyId: 'obsidian_knight', count: 2 },
              { enemyId: 'astral_weaver', count: 2 },
            ],
          },
          {
            label: 'Final Boss — Labyrinth Sovereign',
            spawns: [
              { enemyId: 'rift_harbinger', count: 1 },
              { enemyId: 'void_wisp', count: 2 },
            ],
          },
        ]
      : type === 'ELITE'
        ? [
            {
              label: 'Elite Encounter — Astral Sentinel',
              spawns: [
                { enemyId: depth >= 4 ? 'briar_behemoth' : 'armored_golem', count: 1 },
                { enemyId: 'astral_weaver', count: 2 },
                { enemyId: 'void_stalker', count: 2 },
              ],
            },
          ]
        : [
            {
              label: 'Labyrinth Skirmish',
              spawns: [
                { enemyId: 'solar_construct', count: 2 },
                { enemyId: 'void_wisp', count: 2 },
                { enemyId: 'rift_acolyte', count: 2 },
              ],
            },
          ];

  return {
    id: encodeLabyrinthStageId(nodeId),
    regionId: 'endgame_labyrinth',
    stageNumber: depth + 1,
    code: type === 'BOSS' ? 'LAB BOSS' : type === 'ELITE' ? `LAB E${depth + 1}` : `LAB F${depth + 1}`,
    name: node?.title ?? 'Starlight Labyrinth',
    chapter: Math.min(10, 4 + depth),
    subtitle: `${node?.subtitle ?? 'Roguelike Expedition'} • ${run?.activeBlessingIds.length ?? 0} Blessings Active`,
    recommendedPower: recPower,
    description: 'Squad HP persists across Labyrinth nodes. Victory grants a 1-of-3 Astral Blessing draft!',
    enemyScale,
    isMiniBoss: type === 'ELITE',
    isBossStage: type === 'BOSS',
    isLabyrinth: true,
    labyrinthNodeId: nodeId,
    labyrinthStageIndex: depth + 1,
    arenaAsset: '/assets/environments/env_labyrinth_rift.webp',
    arenaTintHex: 0x162448,
    ambientMoteColors: [0x38e8ff, 0xc084fc],
    waves,
    firstClearCrystals: 0,
    repeatCrystals: 0,
    rewards: {
      gold: type === 'BOSS' ? [18000, 26000] : type === 'ELITE' ? [7500, 11000] : [3500, 5500],
      expPotions: type === 'BOSS' ? [10, 14] : type === 'ELITE' ? [4, 7] : [2, 4],
      forgeStones: type === 'BOSS' ? [12, 18] : type === 'ELITE' ? [5, 8] : [3, 5],
      starIronIngots: type === 'BOSS' ? [4, 6] : type === 'ELITE' ? [2, 3] : [0, 1],
      astralAnvilCores: type === 'BOSS' ? [3, 5] : type === 'ELITE' ? [1, 2] : [0, 0],
      starCores: type === 'BOSS' ? [3, 5] : type === 'ELITE' ? [1, 2] : [0, 1],
      relicFragments: type === 'BOSS' ? [10, 14] : type === 'ELITE' ? [4, 6] : [1, 3],
      primaryEssence: 'ASTRAL',
      primaryEssenceQty: type === 'BOSS' ? [5, 8] : type === 'ELITE' ? [2, 4] : [1, 2],
      targetSetIds: ['ASTRAL_SURGE', 'CHRONO', 'ASHEN_FURY', 'VANGUARD'],
      equipmentDrops: type === 'BOSS' ? 2 : type === 'ELITE' ? 1 : 0,
      rarityWeights:
        type === 'BOSS'
          ? { COMMON: 0, RARE: 0, EPIC: 50, LEGENDARY: 50 }
          : { COMMON: 0, RARE: 35, EPIC: 50, LEGENDARY: 15 },
    },
  };
}
