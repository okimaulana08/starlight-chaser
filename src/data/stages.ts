import type {
  CampaignDifficulty,
  EquipmentRarity,
  RegionDef,
  StageDef,
  StageWave,
} from '../types/game';
import { CHAPTER_BIOME_DROPS } from './materials';
import { REGIONS, REGION_MAP } from './regions';

export interface CampaignDifficultyConfig {
  id: CampaignDifficulty;
  worldLevel: 1 | 2 | 3;
  label: string;
  shortLabel: string;
  subtitle: string;
  codePrefix: string;
  themeColor: string;
  badgeBg: string;
  unlockStageId: string | null;
  unlockLabel: string;
  rewardHighlight: string;
  enemyAtkSpeedMult: number;
  bossBreakMult: number;
  repeatCrystals: number;
  worldModifier?: {
    id: string;
    name: string;
    desc: string;
    color: string;
  };
}

export const CAMPAIGN_DIFFICULTIES: CampaignDifficultyConfig[] = [
  {
    id: 'NORMAL',
    worldLevel: 1,
    label: 'Normal',
    shortLabel: 'WL 1',
    subtitle: 'Dawn of Aetheria',
    codePrefix: '',
    themeColor: '#f5c84c',
    badgeBg: 'from-amber-400/25 to-yellow-500/15',
    unlockStageId: null,
    unlockLabel: 'Unlocked',
    rewardHighlight: 'Standard Campaign Progression • Lv.1–80',
    enemyAtkSpeedMult: 1.0,
    bossBreakMult: 1.0,
    repeatCrystals: 40,
  },
  {
    id: 'HARD',
    worldLevel: 2,
    label: 'Hard',
    shortLabel: 'WL 2',
    subtitle: 'Crimson Rift',
    codePrefix: 'H ',
    themeColor: '#f97316',
    badgeBg: 'from-orange-500/30 to-rose-600/20',
    unlockStageId: 'stage_10_12',
    unlockLabel: 'Clear Normal Ch.10 Boss (10-12)',
    rewardHighlight: '2× Gold • 1.9× EXP • No Common Gear • Guaranteed Anvil & Star Cores',
    enemyAtkSpeedMult: 1.1,
    bossBreakMult: 1.2,
    repeatCrystals: 60,
    worldModifier: {
      id: 'HARD_RIFT_SURGE',
      name: 'Rift Surge',
      desc: 'World Level 2: Enemies attack +10% faster and Bosses gain +20% Break Shield. Rewards 2× Gold, 1.9× Hero EXP, 1.75× Materials, and Epic/Legendary Gear.',
      color: '#f97316',
    },
  },
  {
    id: 'HELL',
    worldLevel: 3,
    label: 'Hell',
    shortLabel: 'WL 3',
    subtitle: 'Abyssal Zenith',
    codePrefix: 'X ',
    themeColor: '#f43f5e',
    badgeBg: 'from-rose-600/35 to-fuchsia-600/25',
    unlockStageId: 'hard__stage_10_12',
    unlockLabel: 'Clear Hard Ch.10 Boss (H 10-12)',
    rewardHighlight: '3.2× Gold • 2.8× EXP • Epic & Legendary Only (×2–3 Drops) • Transcendence Mats',
    enemyAtkSpeedMult: 1.18,
    bossBreakMult: 1.35,
    repeatCrystals: 85,
    worldModifier: {
      id: 'HELL_ABYSSAL_FRENZY',
      name: 'Abyssal Frenzy',
      desc: 'World Level 3: Enemies attack +18% faster and Bosses gain +35% Break Shield. Rewards 3.2× Gold, 2.8× Hero EXP, 2.6× Materials, and Guaranteed Epic/Legendary Multi-Drops.',
      color: '#f43f5e',
    },
  },
];

export const CAMPAIGN_DIFFICULTY_MAP: Record<CampaignDifficulty, CampaignDifficultyConfig> = {
  NORMAL: CAMPAIGN_DIFFICULTIES[0],
  HARD: CAMPAIGN_DIFFICULTIES[1],
  HELL: CAMPAIGN_DIFFICULTIES[2],
};

export function encodeCampaignStageId(
  baseStageId: string,
  difficulty: CampaignDifficulty = 'NORMAL',
): string {
  const clean = baseStageId.replace(/^(hard__|hell__)/, '');
  if (difficulty === 'HARD') return `hard__${clean}`;
  if (difficulty === 'HELL') return `hell__${clean}`;
  return clean;
}

export function parseCampaignStageId(stageId: string): {
  baseStageId: string;
  difficulty: CampaignDifficulty;
} {
  if (stageId.startsWith('hard__')) {
    return { baseStageId: stageId.slice(6), difficulty: 'HARD' };
  }
  if (stageId.startsWith('hell__')) {
    return { baseStageId: stageId.slice(6), difficulty: 'HELL' };
  }
  return { baseStageId: stageId, difficulty: 'NORMAL' };
}

export function encodeRegionChestKey(
  regionId: string,
  difficulty: CampaignDifficulty = 'NORMAL',
): string {
  if (difficulty === 'HARD') return `hard__${regionId}`;
  if (difficulty === 'HELL') return `hell__${regionId}`;
  return regionId;
}

export function isDifficultyUnlocked(
  difficulty: CampaignDifficulty,
  clearedStages: string[],
): boolean {
  const cfg = CAMPAIGN_DIFFICULTY_MAP[difficulty];
  if (!cfg.unlockStageId) return true;
  return clearedStages.includes(cfg.unlockStageId);
}

interface StageTemplate {
  name: string;
  subtitle: string;
}

const REGION_STAGE_NAMES: Record<string, StageTemplate[]> = {
  region_1: [
    { name: 'Aurelia Outer Gates', subtitle: 'First Contact Beneath the Shattered Sky' },
    { name: 'Sunbeam Promenade', subtitle: 'Marble Patrols Gone Rogue' },
    { name: 'Starlight Courtyard', subtitle: 'Crossfire of the Fallen Pillars' },
    { name: 'Bastion Gatehouse', subtitle: 'Mini-Boss: Marble Bulwark' },
    { name: 'Gilded Cloister', subtitle: 'Ambush in the Colonnade' },
    { name: 'Hall of Dawn', subtitle: 'Rift Resonance Rising' },
    { name: 'Vanguard Ramparts', subtitle: 'Hold the Sky-Bridge' },
    { name: 'Solar Belltower', subtitle: 'Mini-Boss: Twin Constructs' },
    { name: 'Radiant Reliquary', subtitle: 'Echoes of the First Eclipse' },
    { name: 'Broken Aqueduct', subtitle: 'Swarm Beneath the Arch' },
    { name: 'Upper Spire Approach', subtitle: 'The Sentinel’s Honor Guard' },
    { name: 'Shattered Spire — Boss', subtitle: 'Aurelian Sentinel (Corrupted)' },
  ],
  region_2: [
    { name: 'Moonlit Causeway', subtitle: 'Crossing Into Astral Airspace' },
    { name: 'Prism Terrace', subtitle: 'Refracted Void Beams' },
    { name: 'Stargazer Steps', subtitle: 'Acolyte Conclave Patrol' },
    { name: 'Astrolabe Rotunda', subtitle: 'Mini-Boss: Prism Golem' },
    { name: 'Nebula Gallery', subtitle: 'Distorted Constellation Hall' },
    { name: 'Telescope Span', subtitle: 'High-Altitude Crossfire' },
    { name: 'Sapphire Cloister', subtitle: 'Void-Touched Arcanists' },
    { name: 'Meridian Vault', subtitle: 'Mini-Boss: Twin Star-Wardens' },
    { name: 'Celestial Orrery', subtitle: 'Gravity Shear Corridor' },
    { name: 'Equinox Balcony', subtitle: 'Rift Singularity Surge' },
    { name: 'Zenith Lens Chamber', subtitle: 'Guardians of the Great Dome' },
    { name: 'Lumina Apex — Boss', subtitle: 'Astral Archon (Corrupted)' },
  ],
  region_3: [
    { name: 'Mossbound Trail', subtitle: 'Entering the World-Tree Canopy' },
    { name: 'Dewdrop Clearing', subtitle: 'Stalkers Among the Vines' },
    { name: 'Emerald Bough Bridge', subtitle: 'Ambush from Above' },
    { name: 'Hollow Trunk Bastion', subtitle: 'Mini-Boss: Rootbound Golem' },
    { name: 'Luminous Glade', subtitle: 'Spores of the Void Rift' },
    { name: 'Whispering Thicket', subtitle: 'Encircling Shadow Packs' },
    { name: 'Sap-Crystal Crossing', subtitle: 'Covenant Outpost Defense' },
    { name: 'Ancient Shrine Steps', subtitle: 'Mini-Boss: Briar Sentinels' },
    { name: 'Canopy Crown Walk', subtitle: 'Storm Over the Leaf-Sea' },
    { name: 'Withered Heartwood', subtitle: 'Corruption at the Core' },
    { name: 'Sanctuary Threshold', subtitle: 'Last Wall of the Grove' },
    { name: 'World-Tree Crown — Boss', subtitle: 'Elder Briar Warden' },
  ],
  region_4: [
    { name: 'Cinder Rim Pass', subtitle: 'March Into the Lava Basin' },
    { name: 'Slag Bridge', subtitle: 'Scorched Vanguard Ambush' },
    { name: 'Obsidian Trench', subtitle: 'Volcanic Rift Eruption' },
    { name: 'Smelter Gate', subtitle: 'Mini-Boss: Crucible Golem' },
    { name: 'Ashen Foundry Floor', subtitle: 'Crossfire Amid Molten Vats' },
    { name: 'Brimstone Conduit', subtitle: 'Overheated Rift Surge' },
    { name: 'Chain-Lift Viaduct', subtitle: 'Relentless Siege Wave' },
    { name: 'Anvil Courtyard', subtitle: 'Mini-Boss: Iron Juggernauts' },
    { name: 'Magma Conduit Core', subtitle: 'Blazing Gauntlet Run' },
    { name: 'Pyre Battlements', subtitle: 'Legion’s Fallen Garrison' },
    { name: 'Caldera Furnace Gate', subtitle: 'Final Trial of Flame' },
    { name: 'Heart of Ferrum — Boss', subtitle: 'Molten Iron Colossus' },
  ],
  region_5: [
    { name: 'Glacier Causeway', subtitle: 'Crossing the Frozen Sea' },
    { name: 'Hoarfrost Steps', subtitle: 'Blizzard Ambush' },
    { name: 'Crystal Icicle Arch', subtitle: 'Sub-Zero Crossfire' },
    { name: 'Permafrost Bastion', subtitle: 'Mini-Boss: Glacial Golem' },
    { name: 'Mirror-Ice Cloister', subtitle: 'Refracted Frost Shards' },
    { name: 'Frozen Bellbridge', subtitle: 'Howling Rift Gale' },
    { name: 'Rime Observatory', subtitle: 'Starlight Encased in Ice' },
    { name: 'Avalanche Gate', subtitle: 'Mini-Boss: Twin Frost Constructs' },
    { name: 'Glacial Reliquary', subtitle: 'Echoes of Frozen Time' },
    { name: 'Shattered Glacier Wall', subtitle: 'Last Snowbound Barricade' },
    { name: 'Sovereign’s Antechamber', subtitle: 'The Royal Ice Guard' },
    { name: 'Frostveil Throne — Boss', subtitle: 'Cryo Sovereign' },
  ],
  region_6: [
    { name: 'Tidal Reef Gate', subtitle: 'Descending Into Pelagia' },
    { name: 'Bioluminescent Trench', subtitle: 'Abyssal Stalker Swarm' },
    { name: 'Coral Colonnade', subtitle: 'Crossfire Under the Surge' },
    { name: 'Sunken Aqueduct', subtitle: 'Mini-Boss: Tideforged Golem' },
    { name: 'Pearl Sanctuary', subtitle: 'Drowned Star-Relic Ruins' },
    { name: 'Maelstrom Steps', subtitle: 'Pressurized Void Currents' },
    { name: 'Sea-Glass Atrium', subtitle: 'Corrupted Abyssal Casters' },
    { name: 'Kraken’s Causeway', subtitle: 'Mini-Boss: Deepwater Bulwarks' },
    { name: 'Abyssal Belltower', subtitle: 'Resonance Below the Waves' },
    { name: 'Drowned Pillar Hall', subtitle: 'Vanguard of the Deep' },
    { name: 'Leviathan’s Spire', subtitle: 'Storm at the Ocean Floor' },
    { name: 'Pelagia Core — Boss', subtitle: 'Abyssal Leviathan' },
  ],
  region_7: [
    { name: 'Gale-Chain Bridge', subtitle: 'Leaping to the Sky Isles' },
    { name: 'Cascade Landing', subtitle: 'Mist of the Falling Rivers' },
    { name: 'Windmill Terrace', subtitle: 'High-Speed Skirmish' },
    { name: 'Skyship Drydock', subtitle: 'Mini-Boss: Galebound Golem' },
    { name: 'Cloudspire Viaduct', subtitle: 'Crosswinds & Void Orbs' },
    { name: 'Thunderhead Span', subtitle: 'Lightning-Charged Rifts' },
    { name: 'Aero Shrine Steps', subtitle: 'Tempest Cultist Blockade' },
    { name: 'Cyclone Gatehouse', subtitle: 'Mini-Boss: Storm Constructs' },
    { name: 'Shattered Sails Ridge', subtitle: 'Wreckage of the First Fleet' },
    { name: 'Eye-Wall Rampart', subtitle: 'Inside the Hurricane Ring' },
    { name: 'Valkyrie’s Roost', subtitle: 'Elite Sky Guard Trial' },
    { name: 'Zephyr Apex — Boss', subtitle: 'Tempest Valkyrie' },
  ],
  region_8: [
    { name: 'Vitrified Crossing', subtitle: 'Entering the Glass Dunes' },
    { name: 'Sun-Glass Causeway', subtitle: 'Blinding Solar Mirage' },
    { name: 'Obelisk Plaza', subtitle: 'Desert Rift Patrols' },
    { name: 'Sunken Sand Gate', subtitle: 'Mini-Boss: Sandstone Colossus' },
    { name: 'Amber Monolith Hall', subtitle: 'Scorching Arcane Barrages' },
    { name: 'Mirage Aqueduct', subtitle: 'Phantom Ambush in Noonlight' },
    { name: 'Solar Sundial Court', subtitle: 'Time-Distorted Void Wave' },
    { name: 'Pyramid Vault Steps', subtitle: 'Mini-Boss: Twin Sun-Wardens' },
    { name: 'Gilded Sarcophagus', subtitle: 'Relics of Eternal Noon' },
    { name: 'Dune-Storm Ramparts', subtitle: 'Encircling Void Swarm' },
    { name: 'Pharaoh’s Colonnade', subtitle: 'Guard of the Burning Crown' },
    { name: 'Solis Sanctuary — Boss', subtitle: 'Solar Pharaoh' },
  ],
  region_9: [
    { name: 'Rift-Scarred Shore', subtitle: 'Threshold of the Abyss' },
    { name: 'Black-Glass Ascent', subtitle: 'Gravity Fracture Zone' },
    { name: 'Void-Vein Terrace', subtitle: 'Concentrated Acolyte Coven' },
    { name: 'Spire Lower Gate', subtitle: 'Mini-Boss: Void-Core Golem' },
    { name: 'Shattered Prism Hall', subtitle: 'Echoes of Fallen Worlds' },
    { name: 'Abyssal Stairwell', subtitle: 'Relentless Shadow Gauntlet' },
    { name: 'Amethyst Conduit', subtitle: 'Unstable Singularity Surge' },
    { name: 'Harbinger’s Rampart', subtitle: 'Mini-Boss: Abyssal Constructs' },
    { name: 'Obsidian Gallery', subtitle: 'No Turning Back' },
    { name: 'Heart of Unmaking', subtitle: 'Max-Density Rift Breach' },
    { name: 'Spire Pinnacle Steps', subtitle: 'The Harbinger’s Vanguard' },
    { name: 'Obsidian Crown — Boss', subtitle: 'Rift Harbinger' },
  ],
  region_10: [
    { name: 'Starfall Fracture', subtitle: 'Stepping Beyond the Sky' },
    { name: 'Astral Debris Bridge', subtitle: 'Shards of the Four Pillars' },
    { name: 'Firmament Breach', subtitle: 'Celestial Void Legion' },
    { name: 'Eclipse Gatehouse', subtitle: 'Mini-Boss: Zenith Sentinel' },
    { name: 'Hall of Broken Stars', subtitle: 'Memories of the Shattering' },
    { name: 'Cosmic Horizon Span', subtitle: 'Gravity-Defying Showdown' },
    { name: 'Aetheria’s Edge', subtitle: 'All-Out Void Offensive' },
    { name: 'Demiurge’s Bulwark', subtitle: 'Mini-Boss: Twin Zenith Wardens' },
    { name: 'Crown of Starlight', subtitle: 'The Final Ascent' },
    { name: 'Sanctum of Creation', subtitle: 'Architect’s Honor Guard' },
    { name: 'Throne Steps of Eternity', subtitle: 'One Step From the Truth' },
    { name: 'The Shattered Zenith — Boss', subtitle: 'Eclipse Demiurge' },
  ],
};

const REGION_BOSS_IDS: Record<string, string> = {
  region_1: 'aurelian_sentinel',
  region_2: 'astral_archon',
  region_3: 'elder_briar_warden',
  region_4: 'molten_iron_colossus',
  region_5: 'cryo_sovereign',
  region_6: 'abyssal_leviathan',
  region_7: 'tempest_valkyrie',
  region_8: 'solar_pharaoh',
  region_9: 'rift_harbinger',
  region_10: 'eclipse_demiurge',
};

const CHAPTER_ENEMY_ROSTER: Record<
  number,
  {
    meleeA: string;
    meleeB: string;
    ranged: string;
    eliteA: string;
    eliteB: string;
  }
> = {
  1: { meleeA: 'solar_construct', meleeB: 'void_stalker', ranged: 'rift_acolyte', eliteA: 'armored_golem', eliteB: 'obsidian_knight' },
  2: { meleeA: 'void_wisp', meleeB: 'void_stalker', ranged: 'rift_acolyte', eliteA: 'astral_weaver', eliteB: 'armored_golem' },
  3: { meleeA: 'briar_crawler', meleeB: 'void_stalker', ranged: 'rift_acolyte', eliteA: 'briar_behemoth', eliteB: 'briar_behemoth' },
  4: { meleeA: 'solar_construct', meleeB: 'void_stalker', ranged: 'cinder_imp', eliteA: 'obsidian_knight', eliteB: 'armored_golem' },
  5: { meleeA: 'frost_lancer', meleeB: 'void_wisp', ranged: 'rift_acolyte', eliteA: 'astral_weaver', eliteB: 'armored_golem' },
  6: { meleeA: 'frost_lancer', meleeB: 'briar_crawler', ranged: 'rift_acolyte', eliteA: 'briar_behemoth', eliteB: 'astral_weaver' },
  7: { meleeA: 'solar_construct', meleeB: 'void_wisp', ranged: 'rift_acolyte', eliteA: 'tempest_drake', eliteB: 'tempest_drake' },
  8: { meleeA: 'solar_construct', meleeB: 'void_stalker', ranged: 'cinder_imp', eliteA: 'tempest_drake', eliteB: 'obsidian_knight' },
  9: { meleeA: 'void_wisp', meleeB: 'void_stalker', ranged: 'cinder_imp', eliteA: 'obsidian_knight', eliteB: 'astral_weaver' },
  10: { meleeA: 'frost_lancer', meleeB: 'solar_construct', ranged: 'cinder_imp', eliteA: 'tempest_drake', eliteB: 'obsidian_knight' },
};

function buildWavesForStage(region: RegionDef, stageNum: number): StageWave[] {
  const ch = region.chapter;
  const isMiniBoss = stageNum === 4 || stageNum === 8;
  const isBoss = stageNum === 12;
  const pack = CHAPTER_ENEMY_ROSTER[ch] ?? CHAPTER_ENEMY_ROSTER[1];
  const primaryElite = stageNum >= 8 ? pack.eliteB : pack.eliteA;

  const extraMelee = Math.min(3, Math.floor((stageNum - 1) / 4) + Math.floor((ch - 1) / 3));
  const extraRanged = Math.min(2, Math.floor(stageNum / 5) + Math.floor(ch / 4));

  if (isBoss) {
    const bossEnemyId = REGION_BOSS_IDS[region.id] ?? 'aurelian_sentinel';
    return [
      {
        label: `Wave 1 — ${region.name} Perimeter`,
        spawns: [
          { enemyId: pack.meleeA, count: 3 + Math.min(2, Math.floor(ch / 3)) },
          { enemyId: pack.meleeB, count: 2 },
          { enemyId: pack.ranged, count: 2 + Math.min(1, Math.floor(ch / 4)) },
        ],
      },
      {
        label: 'Wave 2 — Elite Honor Guard',
        spawns: [
          { enemyId: pack.eliteA, count: 1 },
          ...(ch >= 3 ? [{ enemyId: pack.eliteB, count: 1 }] : []),
          { enemyId: pack.meleeA, count: 3 },
          { enemyId: pack.ranged, count: 2 },
        ],
      },
      {
        label: `BOSS — ${region.bossName} (${region.bossTitle})`,
        spawns: [
          { enemyId: bossEnemyId, count: 1 },
          { enemyId: pack.meleeB, count: 2 + Math.min(2, Math.floor(ch / 3)) },
          ...(ch >= 2 ? [{ enemyId: pack.ranged, count: Math.min(2, Math.ceil(ch / 4)) }] : []),
        ],
      },
    ];
  }

  if (isMiniBoss) {
    const eliteCount = stageNum === 8 || ch >= 4 ? 2 : 1;
    return [
      {
        label: 'Wave 1 — Vanguard Breach',
        spawns: [
          { enemyId: pack.meleeA, count: 2 + extraMelee },
          { enemyId: pack.meleeB, count: 2 },
          { enemyId: pack.ranged, count: 1 + extraRanged },
        ],
      },
      {
        label: 'Wave 2 — Biome Crossfire',
        spawns: [
          { enemyId: pack.meleeA, count: 3 },
          { enemyId: pack.meleeB, count: 2 },
          { enemyId: pack.ranged, count: 2 + extraRanged },
        ],
      },
      {
        label: `ELITE — ${region.name} ${eliteCount > 1 ? 'Twin Guardians' : 'Champion'}`,
        spawns: [
          { enemyId: primaryElite, count: eliteCount },
          { enemyId: pack.ranged, count: 2 },
          { enemyId: pack.meleeA, count: 2 },
        ],
      },
    ];
  }

  const waves: StageWave[] = [
    {
      label: 'Wave 1 — Rift Breach',
      spawns: [
        { enemyId: pack.meleeA, count: 2 + extraMelee },
        { enemyId: pack.meleeB, count: 2 },
        { enemyId: pack.ranged, count: 1 + extraRanged },
      ],
    },
    {
      label: stageNum >= 5 ? 'Wave 2 — Reinforced Patrol' : 'Wave 2 — Shadow Counterattack',
      spawns: [
        { enemyId: pack.meleeA, count: 2 + Math.min(2, Math.floor(stageNum / 4)) },
        { enemyId: pack.meleeB, count: 2 },
        { enemyId: pack.ranged, count: 2 + extraRanged },
        ...(stageNum >= 3 || ch >= 2 ? [{ enemyId: primaryElite, count: ch >= 7 && stageNum >= 8 ? 2 : 1 }] : []),
      ],
    },
  ];

  if (stageNum >= 7) {
    waves.push({
      label: 'Wave 3 — Rift Surge',
      spawns: [
        { enemyId: pack.eliteB, count: stageNum >= 10 || ch >= 4 ? 2 : 1 },
        { enemyId: pack.meleeA, count: 3 },
        { enemyId: pack.meleeB, count: 2 },
        { enemyId: pack.ranged, count: 2 + Math.min(2, Math.floor(ch / 3)) },
      ],
    });
  }

  return waves;
}

function buildRarityWeights(chapter: number, stageNum: number): Record<EquipmentRarity, number> {
  const idx = Math.max(0, Math.min(9, chapter - 1));
  const isMini = stageNum === 4 || stageNum === 8;

  if (stageNum === 12) {
    // Rebalanced Boss Stages: rewarding jump over normal stages without flooding early Epic/Legendary
    const bossTable: Array<Record<EquipmentRarity, number>> = [
      { COMMON: 10, RARE: 72, EPIC: 18, LEGENDARY: 0 }, // Ch.1 Boss (1-12)
      { COMMON: 0, RARE: 68, EPIC: 30, LEGENDARY: 2 },  // Ch.2 Boss (2-12)
      { COMMON: 0, RARE: 52, EPIC: 43, LEGENDARY: 5 },  // Ch.3 Boss (3-12)
      { COMMON: 0, RARE: 38, EPIC: 52, LEGENDARY: 10 }, // Ch.4 Boss (4-12)
      { COMMON: 0, RARE: 30, EPIC: 54, LEGENDARY: 16 }, // Ch.5 Boss (5-12)
      { COMMON: 0, RARE: 24, EPIC: 54, LEGENDARY: 22 }, // Ch.6 Boss (6-12)
      { COMMON: 0, RARE: 16, EPIC: 54, LEGENDARY: 30 }, // Ch.7 Boss (7-12)
      { COMMON: 0, RARE: 12, EPIC: 52, LEGENDARY: 36 }, // Ch.8 Boss (8-12)
      { COMMON: 0, RARE: 6, EPIC: 52, LEGENDARY: 42 },  // Ch.9 Boss (9-12)
      { COMMON: 0, RARE: 0, EPIC: 52, LEGENDARY: 48 },  // Ch.10 Boss (10-12)
    ];
    return { ...bossTable[idx] };
  }

  if (isMini) {
    // Rebalanced Mini-Boss Stages (x-4, x-8): guaranteed 1 drop with smooth midpoint rarity bump
    const miniBossTable: Array<Record<EquipmentRarity, number>> = [
      { COMMON: 42, RARE: 52, EPIC: 6, LEGENDARY: 0 },  // Ch.1 Mini-Boss
      { COMMON: 20, RARE: 66, EPIC: 14, LEGENDARY: 0 }, // Ch.2 Mini-Boss
      { COMMON: 10, RARE: 66, EPIC: 23, LEGENDARY: 1 }, // Ch.3 Mini-Boss
      { COMMON: 4, RARE: 60, EPIC: 33, LEGENDARY: 3 },  // Ch.4 Mini-Boss
      { COMMON: 0, RARE: 52, EPIC: 41, LEGENDARY: 7 },  // Ch.5 Mini-Boss
      { COMMON: 0, RARE: 44, EPIC: 45, LEGENDARY: 11 }, // Ch.6 Mini-Boss
      { COMMON: 0, RARE: 34, EPIC: 49, LEGENDARY: 17 }, // Ch.7 Mini-Boss
      { COMMON: 0, RARE: 26, EPIC: 51, LEGENDARY: 23 }, // Ch.8 Mini-Boss
      { COMMON: 0, RARE: 18, EPIC: 52, LEGENDARY: 30 }, // Ch.9 Mini-Boss
      { COMMON: 0, RARE: 12, EPIC: 52, LEGENDARY: 36 }, // Ch.10 Mini-Boss
    ];
    return { ...miniBossTable[idx] };
  }

  // Rebalanced Normal Stages: Common/Rare backbone in Ch.1-3, Epic climbs cleanly Ch.4+, Legendary Endgame Ch.6+
  const normalTable: Array<Record<EquipmentRarity, number>> = [
    { COMMON: 68, RARE: 30, EPIC: 2, LEGENDARY: 0 },  // Ch.1
    { COMMON: 42, RARE: 52, EPIC: 6, LEGENDARY: 0 },  // Ch.2
    { COMMON: 25, RARE: 62, EPIC: 13, LEGENDARY: 0 }, // Ch.3
    { COMMON: 12, RARE: 65, EPIC: 22, LEGENDARY: 1 }, // Ch.4
    { COMMON: 5, RARE: 62, EPIC: 30, LEGENDARY: 3 },  // Ch.5
    { COMMON: 0, RARE: 56, EPIC: 38, LEGENDARY: 6 },  // Ch.6
    { COMMON: 0, RARE: 46, EPIC: 44, LEGENDARY: 10 }, // Ch.7
    { COMMON: 0, RARE: 37, EPIC: 48, LEGENDARY: 15 }, // Ch.8
    { COMMON: 0, RARE: 28, EPIC: 50, LEGENDARY: 22 }, // Ch.9
    { COMMON: 0, RARE: 22, EPIC: 50, LEGENDARY: 28 }, // Ch.10
  ];
  return { ...normalTable[idx] };
}

function buildDescription(region: RegionDef, stageNum: number, isMiniBoss: boolean, isBoss: boolean): string {
  if (isBoss) {
    return `Confront ${region.bossName}, ${region.bossTitle}, guarding the heart of ${region.name}. Interrupt Void Shockwaves with STUN_CANCEL skills to trigger Broken (+25% DMG), then shatter its Phase 2 Hit-Count Shield!`;
  }
  if (isMiniBoss) {
    return `Heavy corrupted constructs block the advance through ${region.name}. Watch for Armored Golem ground-slam telegraphs and prioritize flanking Rift Acolytes.`;
  }
  return `Push deeper across ${region.name} (Sector ${region.chapter}-${stageNum}). Clear escalating Void Stalker packs and arcane casters to unlock the next beacon.`;
}

function buildAllStages(): StageDef[] {
  const list: StageDef[] = [];

  // Rebalanced v2.3 enemy scale curves calibrated to Lv.8 ★0 -> Lv.80 ★6 +15 Legendary progression:
  // Punchy 12-18s trash waves, tactical 25-50s Boss fights, meaningful Tank/Healer/Cancel-Cast stakes!
  const regionScalePairs: Array<[number, number]> = [
    [1.45, 2.45],   // Ch. 1 (Lv.8-16 ★0)
    [2.65, 3.85],   // Ch. 2 (Lv.17-25 ★1)
    [4.1, 5.55],    // Ch. 3 (Lv.26-34 ★2)
    [5.85, 7.5],    // Ch. 4 (Lv.35-42 ★3)
    [7.85, 9.75],   // Ch. 5 (Lv.43-50 ★3)
    [10.15, 12.25], // Ch. 6 (Lv.51-58 ★4)
    [12.7, 14.95],  // Ch. 7 (Lv.59-65 ★5)
    [15.4, 17.65],  // Ch. 8 (Lv.66-72 ★5)
    [18.1, 20.3],   // Ch. 9 (Lv.73-77 ★6)
    [20.75, 22.8],  // Ch. 10 (Lv.78-80 ★6 +15)
  ];

  for (const region of REGIONS) {
    const templates = REGION_STAGE_NAMES[region.id] ?? [];
    const [minPwr, maxPwr] = region.recommendedPowerRange;
    const [regionBaseScale, regionMaxScale] = regionScalePairs[region.chapter - 1] ?? [1.45, 2.45];
    const biomeDrop = CHAPTER_BIOME_DROPS[region.chapter] ?? CHAPTER_BIOME_DROPS[1];

    for (let s = 1; s <= region.stageCount; s++) {
      const progress = (s - 1) / Math.max(1, region.stageCount - 1);
      const isMiniBoss = s === 4 || s === 8;
      const isBossStage = s === 12;

      const tpl = templates[s - 1] ?? {
        name: `${region.name} Sector ${s}`,
        subtitle: region.subtitle,
      };

      const curve = Math.pow(progress, 1.08);
      const rawScale = regionBaseScale + (regionMaxScale - regionBaseScale) * curve;
      const enemyScale = Number((rawScale * (isBossStage ? 1.0 : isMiniBoss ? 1.05 : 1.0)).toFixed(2));
      const recommendedPower = Math.round((minPwr + (maxPwr - minPwr) * curve) / 100) * 100;

      const globalIdx = (region.chapter - 1) * 12 + s;
      // Golden-ratio v2.3 economy: ~70-80% 1st-clear coverage; 2-4 replays + Salvage + Shop = smooth progression!
      const baseGold = Math.round(
        480 +
          globalIdx * 66 +
          Math.pow(region.chapter - 1, 1.65) * 120 +
          (isBossStage ? 1200 + region.chapter * 340 : isMiniBoss ? 360 + region.chapter * 100 : 0),
      );

      const expMin = Math.max(
        1,
        Math.floor(1 + (globalIdx - 1) * 0.068) +
          (isBossStage ? 2 + Math.floor(region.chapter / 2) : isMiniBoss ? 1 + Math.floor(region.chapter / 5) : 0),
      );
      const expMax = expMin + (isBossStage ? 2 : 1);

      const stonesMin = Math.max(
        1,
        Math.floor(1.5 + (globalIdx - 1) * 0.095) +
          (isBossStage ? 3 + Math.floor(region.chapter / 3) : isMiniBoss ? 1 + Math.floor(region.chapter / 4) : 0),
      );
      const stonesMax = stonesMin + (isBossStage ? 2 : 1);

      const essenceMin = Math.max(
        1,
        Math.floor((region.chapter + 1) / 3) +
          (isBossStage ? 3 + Math.floor(region.chapter / 3) : isMiniBoss ? 1 + Math.floor(region.chapter / 4) : 0),
      );
      const essenceMax = essenceMin + (isBossStage ? 2 : isMiniBoss ? 1 : region.chapter >= 2 ? 1 : 0);

      const starIronIngots: [number, number] | undefined =
        region.chapter >= 2 || isMiniBoss || isBossStage
          ? (() => {
              const iMin = Math.max(
                1,
                Math.floor((region.chapter - 1) * 0.5) + (isBossStage ? 2 : isMiniBoss ? 1 : 0),
              );
              return [iMin, iMin + (isBossStage ? 2 : 1)] as [number, number];
            })()
          : undefined;

      const astralAnvilCores: [number, number] | undefined =
        region.chapter >= 4 || (region.chapter === 3 && (isMiniBoss || isBossStage)) || (region.chapter === 2 && isBossStage)
          ? (() => {
              const aMin = isBossStage
                ? Math.max(1, Math.floor((region.chapter + 1) / 3))
                : isMiniBoss
                  ? Math.max(1, Math.floor(region.chapter / 4))
                  : 1;
              const aMax = isBossStage
                ? aMin + 2
                : isMiniBoss
                  ? aMin + 1
                  : Math.max(1, Math.floor(region.chapter / 5) + 1);
              return [aMin, aMax] as [number, number];
            })()
          : undefined;

      const starCores: [number, number] | undefined = isBossStage
        ? (() => {
            const cMin = 2 + Math.floor(region.chapter / 3);
            return [cMin, cMin + 2] as [number, number];
          })()
        : isMiniBoss
          ? (() => {
              const cMin = 1 + Math.floor(region.chapter / 4);
              return [cMin, cMin + 1] as [number, number];
            })()
          : undefined;

      const relicFragments: [number, number] | undefined = isBossStage
        ? [3 + Math.floor(region.chapter / 2), 5 + Math.floor(region.chapter / 2)]
        : isMiniBoss
          ? [1 + Math.floor(region.chapter / 4), 2 + Math.floor(region.chapter / 4)]
          : undefined;

      const guaranteedFirstClearRelicId =
        isBossStage
          ? biomeDrop.bossFirstClearRelicId
          : s === 4
            ? biomeDrop.miniBossFirstClearRelicId
            : undefined;

      const relicDropPool = isBossStage
        ? biomeDrop.bossRelicPool
        : isMiniBoss
          ? biomeDrop.miniBossRelicPool
          : undefined;

      const relicDropChance = isBossStage
        ? Math.min(0.32, 0.16 + region.chapter * 0.016)
        : isMiniBoss
          ? 0.09
          : 0;

      const equipmentDrops = isBossStage
        ? region.chapter <= 3
          ? 1
          : 2
        : 1;
      const equipmentDropChance = isBossStage || isMiniBoss ? 1.0 : 0.6;
      const bonusEquipmentDropChance = isMiniBoss && region.chapter >= 6 ? 0.35 : undefined;

      list.push({
        id: `stage_${region.chapter}_${s}`,
        regionId: region.id,
        stageNumber: s,
        code: `${region.chapter}-${s}`,
        name: tpl.name,
        chapter: region.chapter,
        subtitle: tpl.subtitle,
        recommendedPower,
        description: buildDescription(region, s, isMiniBoss, isBossStage),
        enemyScale,
        isMiniBoss,
        isBossStage,
        bossNameOverride: isBossStage ? region.bossName : undefined,
        bossTitleOverride: isBossStage ? region.bossTitle : undefined,
        bossAssetOverride: isBossStage ? region.bossAsset : undefined,
        arenaAsset: region.arenaAsset,
        arenaTintHex: region.arenaTintHex,
        ambientMoteColors: region.ambientMoteColors,
        waves: buildWavesForStage(region, s),
        firstClearCrystals: isBossStage
          ? 600 + region.chapter * 100
          : isMiniBoss
            ? 220 + region.chapter * 35
            : 100 + region.chapter * 15,
        rewards: {
          gold: [baseGold, Math.round(baseGold * 1.28)],
          expPotions: [expMin, expMax],
          forgeStones: [stonesMin, stonesMax],
          starIronIngots,
          astralAnvilCores,
          starCores,
          relicFragments,
          primaryEssence: biomeDrop.primaryEssence,
          primaryEssenceQty: [essenceMin, essenceMax],
          bonusRandomEssenceChance: isBossStage ? 0.85 : isMiniBoss ? 0.55 : 0.2,
          guaranteedFirstClearRelicId,
          relicDropPool,
          relicDropChance,
          targetSetIds: biomeDrop.targetSetIds,
          equipmentDrops,
          equipmentDropChance,
          bonusEquipmentDropChance,
          rarityWeights: buildRarityWeights(region.chapter, s),
        },
      });
    }
  }

  return list;
}

export const STAGES: StageDef[] = buildAllStages().map((s) => ({
  ...s,
  baseStageId: s.id,
  difficulty: 'NORMAL' as CampaignDifficulty,
  repeatCrystals: 40,
}));

export const STAGE_MAP: Record<string, StageDef> = Object.fromEntries(
  STAGES.map((s) => [s.id, s]),
);

function scaleRange(
  range: [number, number] | undefined,
  mult: number,
  minFloor: [number, number] = [1, 1],
): [number, number] {
  if (!range) return minFloor;
  const a = Math.max(minFloor[0], Math.round(range[0] * mult));
  const b = Math.max(a, Math.max(minFloor[1], Math.round(range[1] * mult)));
  return [a, b];
}

function buildEndgameRarityWeights(
  chapter: number,
  isMiniBoss: boolean,
  isBossStage: boolean,
  difficulty: 'HARD' | 'HELL',
): Record<EquipmentRarity, number> {
  const t = Math.max(0, Math.min(1, (chapter - 1) / 9));
  if (difficulty === 'HARD') {
    const rareBase = Math.max(0, Math.round((isBossStage ? 8 : isMiniBoss ? 14 : 24) * (1 - t)));
    const legBase = Math.min(
      80,
      Math.round((isBossStage ? 36 : isMiniBoss ? 26 : 18) + t * (isBossStage ? 42 : isMiniBoss ? 40 : 40)),
    );
    const epic = Math.max(10, 100 - rareBase - legBase);
    return { COMMON: 0, RARE: rareBase, EPIC: epic, LEGENDARY: legBase };
  }

  // HELL (WL 3): Epic & Legendary ONLY — true endgame Transcendence farming!
  const legBase = Math.min(
    94,
    Math.round((isBossStage ? 70 : isMiniBoss ? 62 : 52) + t * (isBossStage ? 24 : isMiniBoss ? 26 : 30)),
  );
  const epic = Math.max(6, 100 - legBase);
  return { COMMON: 0, RARE: 0, EPIC: epic, LEGENDARY: legBase };
}

const HARD_SCALE_PAIRS: Array<[number, number]> = [
  [24.2, 26.0],  // Hard Ch.1
  [26.3, 28.0],  // Hard Ch.2
  [28.3, 30.0],  // Hard Ch.3
  [30.3, 32.0],  // Hard Ch.4
  [32.3, 34.0],  // Hard Ch.5
  [34.3, 35.8],  // Hard Ch.6
  [36.1, 37.5],  // Hard Ch.7
  [37.8, 39.2],  // Hard Ch.8
  [39.5, 40.8],  // Hard Ch.9
  [41.0, 42.5],  // Hard Ch.10
];

const HELL_SCALE_PAIRS: Array<[number, number]> = [
  [44.5, 46.8],  // Hell Ch.1
  [47.2, 49.5],  // Hell Ch.2
  [49.9, 52.1],  // Hell Ch.3
  [52.5, 54.6],  // Hell Ch.4
  [55.0, 57.0],  // Hell Ch.5
  [57.4, 59.3],  // Hell Ch.6
  [59.7, 61.6],  // Hell Ch.7
  [62.0, 63.8],  // Hell Ch.8
  [64.2, 66.0],  // Hell Ch.9
  [66.4, 68.5],  // Hell Ch.10
];

const HARD_POWER_RANGES: Array<[number, number]> = [
  [126000, 134000],
  [135000, 142000],
  [143000, 150000],
  [151000, 158000],
  [159000, 166000],
  [167000, 173000],
  [174000, 180000],
  [181000, 186000],
  [187000, 193000],
  [194000, 202000],
];

const HELL_POWER_RANGES: Array<[number, number]> = [
  [208000, 217000],
  [218000, 227000],
  [228000, 236000],
  [237000, 245000],
  [246000, 254000],
  [255000, 263000],
  [264000, 272000],
  [273000, 280000],
  [281000, 289000],
  [290000, 300000],
];

const difficultyStageCache: Record<string, StageDef> = {};

export function getRegionRecommendedPowerRange(
  region: RegionDef,
  difficulty: CampaignDifficulty = 'NORMAL',
): [number, number] {
  const idx = Math.max(0, Math.min(9, region.chapter - 1));
  if (difficulty === 'HARD') return HARD_POWER_RANGES[idx] ?? [126000, 202000];
  if (difficulty === 'HELL') return HELL_POWER_RANGES[idx] ?? [208000, 300000];
  return region.recommendedPowerRange;
}

export function buildStageForDifficulty(
  baseStage: StageDef,
  difficulty: CampaignDifficulty = 'NORMAL',
): StageDef {
  if (difficulty === 'NORMAL') return baseStage;

  const encodedId = encodeCampaignStageId(baseStage.id, difficulty);
  if (difficultyStageCache[encodedId]) return difficultyStageCache[encodedId];

  const cfg = CAMPAIGN_DIFFICULTY_MAP[difficulty];
  const chIdx = Math.max(0, Math.min(9, baseStage.chapter - 1));
  const progress = (baseStage.stageNumber - 1) / 11;
  const curve = Math.pow(progress, 1.05);
  const [minScale, maxScale] =
    difficulty === 'HARD' ? HARD_SCALE_PAIRS[chIdx] : HELL_SCALE_PAIRS[chIdx];
  const [minPwr, maxPwr] =
    difficulty === 'HARD' ? HARD_POWER_RANGES[chIdx] : HELL_POWER_RANGES[chIdx];

  const isBoss = Boolean(baseStage.isBossStage);
  const isMini = Boolean(baseStage.isMiniBoss);
  const enemyScale = Number(
    ((minScale + (maxScale - minScale) * curve) * (isMini ? 1.03 : 1.0)).toFixed(2),
  );
  const recommendedPower = Math.round((minPwr + (maxPwr - minPwr) * curve) / 500) * 500;

  const isHell = difficulty === 'HELL';
  const goldMult = isHell ? 3.2 : 2.0;
  const expPotMult = isHell ? 2.4 : 1.6;
  const stoneMult = isHell ? 2.6 : 1.75;
  const ironMult = isHell ? 2.8 : 1.8;
  const anvilMult = isHell ? 2.8 : 1.85;
  const essMult = isHell ? 2.6 : 1.75;
  const firstCrystalMult = isHell ? 2.2 : 1.5;

  const built: StageDef = {
    ...baseStage,
    id: encodedId,
    baseStageId: baseStage.id,
    difficulty,
    code: `${cfg.codePrefix}${baseStage.code}`,
    recommendedPower,
    enemyScale,
    firstClearCrystals: Math.round((baseStage.firstClearCrystals * firstCrystalMult) / 10) * 10,
    repeatCrystals: cfg.repeatCrystals,
    combatExpMultiplier: isHell ? 2.8 : 1.9,
    worldModifier: cfg.worldModifier,
    ambientMoteColors: isHell
      ? [0xf43f5e, 0xc084fc]
      : [0xf97316, baseStage.ambientMoteColors?.[0] ?? 0xfde047],
    rewards: {
      ...baseStage.rewards,
      gold: scaleRange(baseStage.rewards.gold, goldMult, [1500, 2000]),
      expPotions: scaleRange(baseStage.rewards.expPotions, expPotMult, isHell ? [4, 6] : [2, 4]),
      forgeStones: scaleRange(baseStage.rewards.forgeStones, stoneMult, isHell ? [6, 9] : [4, 6]),
      starIronIngots: scaleRange(
        baseStage.rewards.starIronIngots,
        ironMult,
        isHell ? [4, 6] : [2, 3],
      ),
      astralAnvilCores: scaleRange(
        baseStage.rewards.astralAnvilCores,
        anvilMult,
        isHell ? (isBoss ? [5, 8] : [2, 4]) : isBoss ? [3, 5] : [1, 2],
      ),
      starCores: scaleRange(
        baseStage.rewards.starCores,
        isHell ? 2.6 : 1.75,
        isHell
          ? isBoss
            ? [8, 12]
            : isMini
              ? [4, 7]
              : [2, 3]
          : isBoss
            ? [5, 8]
            : isMini
              ? [2, 4]
              : [1, 2],
      ),
      relicFragments: scaleRange(
        baseStage.rewards.relicFragments,
        isHell ? 2.4 : 1.65,
        isHell
          ? isBoss
            ? [10, 15]
            : isMini
              ? [5, 8]
              : [2, 4]
          : isBoss
            ? [6, 10]
            : isMini
              ? [3, 5]
              : [1, 2],
      ),
      primaryEssenceQty: scaleRange(
        baseStage.rewards.primaryEssenceQty,
        essMult,
        isHell ? [4, 6] : [2, 4],
      ),
      bonusRandomEssenceChance: isHell ? 0.95 : isBoss ? 0.95 : isMini ? 0.75 : 0.45,
      relicDropChance: baseStage.rewards.relicDropPool
        ? Math.min(
            isHell ? 0.6 : 0.45,
            Number(((baseStage.rewards.relicDropChance ?? 0.12) * (isHell ? 2.0 : 1.45)).toFixed(2)),
          )
        : 0,
      equipmentDrops: isHell
        ? isBoss
          ? 3
          : 2
        : isBoss || isMini
          ? 2
          : 1,
      equipmentDropChance: isHell ? 1.0 : isBoss || isMini ? 1.0 : 0.85,
      bonusEquipmentDropChance: isHell
        ? isMini
          ? 0.6
          : undefined
        : isBoss
          ? 0.5
          : undefined,
      rarityWeights: buildEndgameRarityWeights(baseStage.chapter, isMini, isBoss, difficulty),
    },
  };

  difficultyStageCache[encodedId] = built;
  return built;
}

export function getCampaignStageById(stageId: string): StageDef | null {
  const { baseStageId, difficulty } = parseCampaignStageId(stageId);
  const base = STAGE_MAP[baseStageId];
  if (!base) return null;
  return buildStageForDifficulty(base, difficulty);
}

export function getAllStagesForDifficulty(difficulty: CampaignDifficulty = 'NORMAL'): StageDef[] {
  if (difficulty === 'NORMAL') return STAGES;
  return STAGES.map((s) => buildStageForDifficulty(s, difficulty));
}

export function getStagesByRegion(
  regionId: string,
  difficulty: CampaignDifficulty = 'NORMAL',
): StageDef[] {
  const baseList = STAGES.filter((s) => s.regionId === regionId);
  if (difficulty === 'NORMAL') return baseList;
  return baseList.map((s) => buildStageForDifficulty(s, difficulty));
}

export function getNextStageId(currentStageId: string): string | null {
  const { baseStageId, difficulty } = parseCampaignStageId(currentStageId);
  const idx = STAGES.findIndex((s) => s.id === baseStageId);
  if (idx === -1 || idx + 1 >= STAGES.length) return null;
  return encodeCampaignStageId(STAGES[idx + 1].id, difficulty);
}

/**
 * STRICT SEQUENTIAL REGION UNLOCK (per Campaign World Level):
 * - World Level itself must be unlocked first (Normal always open; Hard requires Normal 10-12; Hell requires Hard 10-12).
 * - Chapter 1 (`region_1`) opens immediately once that World Level is unlocked.
 * - Chapter N (`N >= 2`) unlocks ONLY after ALL 12 stages of Chapter N-1 in THAT World Level are cleared!
 */
export function isRegionUnlocked(
  regionId: string,
  clearedStages: string[],
  difficulty: CampaignDifficulty = 'NORMAL',
): boolean {
  if (!isDifficultyUnlocked(difficulty, clearedStages)) return false;
  const region = REGION_MAP[regionId];
  if (!region) return false;
  if (region.chapter <= 1) return true;
  const prevRegionId = `region_${region.chapter - 1}`;
  const prevStages = getStagesByRegion(prevRegionId, difficulty);
  return prevStages.length > 0 && prevStages.every((s) => clearedStages.includes(s.id));
}

/**
 * STRICT SEQUENTIAL STAGE UNLOCK (per Campaign World Level):
 * - Region must be unlocked first in that stage's World Level.
 * - Stage X-1 opens when Region X is unlocked.
 * - Stage X-N (`N >= 2`) unlocks only after Stage X-(N-1) in the same World Level is cleared.
 */
export function isStageUnlocked(stage: StageDef, clearedStages: string[]): boolean {
  const diff = stage.difficulty ?? 'NORMAL';
  if (!isRegionUnlocked(stage.regionId, clearedStages, diff)) return false;
  if (stage.stageNumber <= 1) return true;
  const prevId = encodeCampaignStageId(`stage_${stage.chapter}_${stage.stageNumber - 1}`, diff);
  return clearedStages.includes(prevId);
}

/**
 * Returns the highest unlocked frontier stage for a given World Level.
 */
export function getHighestUnlockedStage(
  clearedStages: string[],
  difficulty: CampaignDifficulty = 'NORMAL',
): StageDef {
  const all = getAllStagesForDifficulty(difficulty);
  let highest = all[0];
  for (const s of all) {
    if (isStageUnlocked(s, clearedStages)) {
      highest = s;
    }
  }
  return highest;
}
