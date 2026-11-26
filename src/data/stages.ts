import type { EquipmentRarity, RegionDef, StageDef, StageWave } from '../types/game';
import { REGIONS, REGION_MAP } from './regions';

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

function buildWavesForStage(region: RegionDef, stageNum: number): StageWave[] {
  const ch = region.chapter;
  const isMiniBoss = stageNum === 4 || stageNum === 8;
  const isBoss = stageNum === 12;

  const extraStalkers = Math.min(4, Math.floor((stageNum - 1) / 4) + Math.floor((ch - 1) / 2));
  const extraAcolytes = Math.min(3, Math.floor(stageNum / 5) + Math.floor(ch / 3));

  if (isBoss) {
    const bossEnemyId = REGION_BOSS_IDS[region.id] ?? 'aurelian_sentinel';
    return [
      {
        label: `Wave 1 — ${region.name} Perimeter`,
        spawns: [
          { enemyId: 'void_stalker', count: 4 + Math.min(3, Math.floor(ch / 2)) },
          { enemyId: 'rift_acolyte', count: 2 + Math.min(2, Math.floor(ch / 3)) },
        ],
      },
      {
        label: 'Wave 2 — Armored Honor Guard',
        spawns: [
          { enemyId: 'armored_golem', count: ch >= 3 ? 2 : 1 },
          { enemyId: 'void_stalker', count: 3 + Math.min(2, Math.floor(ch / 4)) },
          { enemyId: 'rift_acolyte', count: 2 + Math.min(2, Math.floor(ch / 4)) },
        ],
      },
      {
        label: `BOSS — ${region.bossName} (${region.bossTitle})`,
        spawns: [
          { enemyId: bossEnemyId, count: 1 },
          { enemyId: 'void_stalker', count: 2 + Math.min(2, Math.floor(ch / 3)) },
          ...(ch >= 2 ? [{ enemyId: 'rift_acolyte', count: Math.min(2, Math.ceil(ch / 4)) }] : []),
        ],
      },
    ];
  }

  if (isMiniBoss) {
    const golemCount = stageNum === 8 || ch >= 3 ? 2 : 1;
    return [
      {
        label: 'Wave 1 — Vanguard Breach',
        spawns: [
          { enemyId: 'void_stalker', count: 3 + extraStalkers },
          { enemyId: 'rift_acolyte', count: 2 + extraAcolytes },
        ],
      },
      {
        label: 'Wave 2 — Arcane Crossfire',
        spawns: [
          { enemyId: 'void_stalker', count: 4 },
          { enemyId: 'rift_acolyte', count: 3 },
        ],
      },
      {
        label: `MINI-BOSS — Corrupted ${golemCount > 1 ? 'Twin Golems' : 'Armored Golem'}`,
        spawns: [
          { enemyId: 'armored_golem', count: golemCount },
          { enemyId: 'rift_acolyte', count: 2 + Math.min(2, Math.floor(ch / 4)) },
          { enemyId: 'void_stalker', count: 2 },
        ],
      },
    ];
  }

  const waves: StageWave[] = [
    {
      label: 'Wave 1 — Rift Breach',
      spawns: [
        { enemyId: 'void_stalker', count: 3 + extraStalkers },
        { enemyId: 'rift_acolyte', count: 1 + extraAcolytes },
      ],
    },
    {
      label: stageNum >= 5 ? 'Wave 2 — Reinforced Patrol' : 'Wave 2 — Shadow Counterattack',
      spawns: [
        { enemyId: 'void_stalker', count: 3 + Math.min(2, Math.floor(stageNum / 4)) },
        { enemyId: 'rift_acolyte', count: 2 + extraAcolytes },
        ...(stageNum >= 2 || ch >= 2 ? [{ enemyId: 'armored_golem', count: ch >= 6 && stageNum >= 8 ? 2 : 1 }] : []),
      ],
    },
  ];

  if (stageNum >= 7) {
    waves.push({
      label: 'Wave 3 — Rift Surge',
      spawns: [
        { enemyId: 'armored_golem', count: stageNum >= 10 || ch >= 3 ? 2 : 1 },
        { enemyId: 'void_stalker', count: 4 },
        { enemyId: 'rift_acolyte', count: 2 + Math.min(2, Math.floor(ch / 3)) },
      ],
    });
  }

  return waves;
}

function buildRarityWeights(chapter: number, stageNum: number): Record<EquipmentRarity, number> {
  const tier = (chapter - 1) * 12 + stageNum; // 1..120
  if (stageNum === 12) {
    const legendary = Math.min(62, 22 + chapter * 4);
    const rare = Math.max(0, 28 - chapter * 4);
    const epic = Math.max(25, 100 - legendary - rare);
    return { COMMON: 0, RARE: rare, EPIC: epic, LEGENDARY: legendary };
  }
  const legendary = Math.min(48, Math.round(2 + tier * 0.42));
  const epic = Math.min(54, Math.round(14 + tier * 0.48));
  const common = Math.max(0, Math.round(26 - tier * 1.1));
  const rare = Math.max(6, 100 - legendary - epic - common);
  return { COMMON: common, RARE: rare, EPIC: epic, LEGENDARY: legendary };
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

  // Smooth progressive enemy scale curves across all 10 Chapters (1-1 = 0.78x ... 10-12 = 34.0x)
  const regionScalePairs: Array<[number, number]> = [
    [0.78, 1.38],  // Ch. 1
    [1.52, 2.55],  // Ch. 2
    [2.75, 4.3],   // Ch. 3
    [4.6, 6.9],    // Ch. 4
    [7.4, 10.6],   // Ch. 5
    [11.2, 15.4],  // Ch. 6
    [16.2, 21.5],  // Ch. 7
    [22.5, 29.0],  // Ch. 8
    [30.5, 38.5],  // Ch. 9
    [40.0, 52.0],  // Ch. 10
  ];

  for (const region of REGIONS) {
    const templates = REGION_STAGE_NAMES[region.id] ?? [];
    const [minPwr, maxPwr] = region.recommendedPowerRange;
    const [regionBaseScale, regionMaxScale] = regionScalePairs[region.chapter - 1] ?? [1.0, 2.0];

    for (let s = 1; s <= region.stageCount; s++) {
      const progress = (s - 1) / Math.max(1, region.stageCount - 1);
      const isMiniBoss = s === 4 || s === 8;
      const isBossStage = s === 12;

      const tpl = templates[s - 1] ?? {
        name: `${region.name} Sector ${s}`,
        subtitle: region.subtitle,
      };

      const curve = Math.pow(progress, 1.12);
      const rawScale = regionBaseScale + (regionMaxScale - regionBaseScale) * curve;
      const enemyScale = Number((rawScale * (isBossStage ? 1.0 : isMiniBoss ? 1.06 : 1.0)).toFixed(2));
      const recommendedPower = Math.round((minPwr + (maxPwr - minPwr) * curve) / 50) * 50;

      const globalIdx = (region.chapter - 1) * 12 + s;
      const baseGold = Math.round(750 + globalIdx * 280 + (isBossStage ? 1500 : isMiniBoss ? 520 : 0));
      const baseExp = Math.round(3 + globalIdx * 0.42 + (isBossStage ? 5 : isMiniBoss ? 2 : 0));
      const baseStones = Math.round(2 + globalIdx * 0.4 + (isBossStage ? 5 : isMiniBoss ? 2 : 0));

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
          ? 640 + region.chapter * 120
          : isMiniBoss
            ? 240 + region.chapter * 40
            : 120 + region.chapter * 20,
        rewards: {
          gold: [baseGold, Math.round(baseGold * 1.38)],
          expPotions: [baseExp, baseExp + 3],
          forgeStones: [baseStones, baseStones + 3],
          equipmentDrops: isBossStage ? 3 : isMiniBoss || s >= 7 ? 2 : 1,
          rarityWeights: buildRarityWeights(region.chapter, s),
        },
      });
    }
  }

  return list;
}

export const STAGES: StageDef[] = buildAllStages();

export const STAGE_MAP: Record<string, StageDef> = Object.fromEntries(
  STAGES.map((s) => [s.id, s]),
);

export function getStagesByRegion(regionId: string): StageDef[] {
  return STAGES.filter((s) => s.regionId === regionId);
}

export function getNextStageId(currentStageId: string): string | null {
  const idx = STAGES.findIndex((s) => s.id === currentStageId);
  if (idx === -1 || idx + 1 >= STAGES.length) return null;
  return STAGES[idx + 1].id;
}

/**
 * STRICT SEQUENTIAL REGION UNLOCK:
 * - Chapter 1 (`region_1`) is always unlocked.
 * - Chapter N (`N >= 2`) unlocks ONLY after ALL 12 stages of Chapter N-1 are cleared!
 */
export function isRegionUnlocked(regionId: string, clearedStages: string[]): boolean {
  const region = REGION_MAP[regionId];
  if (!region) return false;
  if (region.chapter <= 1) return true;
  const prevRegionId = `region_${region.chapter - 1}`;
  const prevStages = getStagesByRegion(prevRegionId);
  return prevStages.length > 0 && prevStages.every((s) => clearedStages.includes(s.id));
}

/**
 * STRICT SEQUENTIAL STAGE UNLOCK:
 * - Region must be unlocked first (all 12 stages of previous region cleared).
 * - Stage X-1 opens when Region X is unlocked.
 * - Stage X-N (`N >= 2`) unlocks only after Stage X-(N-1) is cleared.
 */
export function isStageUnlocked(stage: StageDef, clearedStages: string[]): boolean {
  if (!isRegionUnlocked(stage.regionId, clearedStages)) return false;
  if (stage.stageNumber <= 1) return true;
  const prevId = `stage_${stage.chapter}_${stage.stageNumber - 1}`;
  return clearedStages.includes(prevId);
}

/**
 * Returns the highest unlocked frontier stage (safe fallback if saved selectedStageId is locked).
 */
export function getHighestUnlockedStage(clearedStages: string[]): StageDef {
  let highest = STAGES[0];
  for (const s of STAGES) {
    if (isStageUnlocked(s, clearedStages)) {
      highest = s;
    }
  }
  return highest;
}
