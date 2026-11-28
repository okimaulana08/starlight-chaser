export type Tier = 'R' | 'SR' | 'SSR' | 'UR';
export type Role = 'TANK' | 'ASSAULT' | 'RANGER' | 'MAGE' | 'HEALER';
export type Faction = 'SOLARIS' | 'ASTRAL' | 'VERDANT' | 'ASHEN';
export type AimType = 'CIRCLE' | 'CONE' | 'LINE' | 'DASH' | 'SELF';
export type ScreenId = 'LOBBY' | 'COMBAT' | 'SQUAD' | 'GACHA' | 'CODEX' | 'SHOP' | 'DUNGEON' | 'SPIRE';

export type DungeonId =
  | 'GOLD_VAULT'
  | 'EXP_CRUCIBLE'
  | 'AWAKEN_SANCTUM'
  | 'FORGE_FOUNDRY'
  | 'RELIC_ABYSS';

export interface GameSettings {
  bgmVolume: number; // 0..1
  sfxVolume: number; // 0..1
  muted: boolean;
  enableUltVideo: boolean;
  enableScreenShake: boolean;
  enableDamageNumbers: boolean;
  defaultBattleSpeed: 1 | 2;
  defaultAutoSkill: boolean;
  defaultAutoMove: boolean;
  lobbySceneId: string; // 'CITADEL' | 'AUTO_CHAPTER' | 'region_1'..'region_10'
}

export interface BossBanterLine {
  speakerSide: 'HERO' | 'BOSS';
  speakerName: string;
  speakerTitle: string;
  text: string;
}

export interface ActiveBossBanter {
  id: string;
  chapterLabel: string;
  heroId: string;
  bossName: string;
  bossTitle: string;
  bossAsset: string;
  accentColor: string;
  lines: BossBanterLine[];
}

export type EquipmentSlot = 'WEAPON' | 'ARMOR' | 'ACCESSORY' | 'EMBLEM';
export type EquipmentRarity = 'COMMON' | 'RARE' | 'EPIC' | 'LEGENDARY';
export type EquipmentSetId =
  | 'VANGUARD'
  | 'CHRONO'
  | 'ASHEN_FURY'
  | 'AEGIS_BASTION'
  | 'ASTRAL_SURGE'
  | 'VERDANT_GRACE';

export type MaterialKey =
  | 'expPotions'
  | 'bondGifts'
  | 'forgeStones'
  | 'starIronIngots'
  | 'astralAnvilCores'
  | 'starCores'
  | 'relicFragments'
  | 'essence_SOLARIS'
  | 'essence_ASTRAL'
  | 'essence_VERDANT'
  | 'essence_ASHEN'
  | 'dungeonTickets';

export interface PartyPreset {
  id: string;
  name: string;
  heroIds: [string, string, string, string];
  petId?: string | null;
}

export type PetRole = 'SUPPORT' | 'STRIKER' | 'CELESTIAL';

export interface PetDef {
  id: string;
  name: string;
  title: string;
  tier: 'R' | 'SR' | 'SSR';
  petRole: PetRole;
  themeColor: string;
  lore: string;
  quote: string;
  auraDesc: string;
  auraBase: {
    hpPct?: number;
    atkPct?: number;
    defPct?: number;
    critRate?: number;
    critDmg?: number;
    spRegenBonus?: number;
    breakDmgBonus?: number;
    ultGaugeBonus?: number;
  };
  auraPerRank: {
    hpPct?: number;
    atkPct?: number;
    defPct?: number;
    critRate?: number;
    critDmg?: number;
    spRegenBonus?: number;
    breakDmgBonus?: number;
    ultGaugeBonus?: number;
  };
  activeSkill: {
    id: string;
    name: string;
    description: string;
    cooldown: number;
    kind: 'HEAL_SP' | 'MAGMA_VOLLEY' | 'ASTRAL_DECREE';
  };
  assets: {
    card: string;
    sprite: string;
  };
}

export interface OwnedPetState {
  petId: string;
  level: number; // 1 - 50
  rank: number; // 1 - 5
}

export interface PetCombatSnapshot {
  petId: string;
  name: string;
  tier: Tier;
  themeColor: string;
  cardAsset: string;
  spriteAsset: string;
  skillName: string;
  cd: number;
  maxCd: number;
  rank: number;
  level: number;
}

export interface HeroTranscendenceDef {
  enabled: boolean;
  formTitle: string;
  quote: string;
  summary: string;
  maxLevelCap: number; // 100
  statSurge: {
    baseStatMultBonus: number;
    critRateBonus: number;
    critDmgBonus: number;
  };
  upgradedSovereignAura?: {
    name: string;
    description: string;
    squadFinalDmgBonus: number;
    squadCritDmgBonus: number;
    linkBurstBonus: number;
  };
  assets: {
    card: string;
    standing: string;
    sprite: string;
    attackSprite: string;
    attackScaleBoost?: number;
  };
}

export type SkillEffectTag =
  | 'GATHER'
  | 'PULL'
  | 'STUN_CANCEL'
  | 'PROVOKE'
  | 'SHIELD'
  | 'HEAL'
  | 'CLEANSE'
  | 'INVINCIBLE'
  | 'UNDYING'
  | 'BURN'
  | 'BURN_DETONATE'
  | 'FREEZE'
  | 'DEF_SHRED'
  | 'ATK_BUFF'
  | 'CRIT_BUFF'
  | 'DAMAGE_REDUCE'
  | 'REFLECT'
  | 'LIFESTEAL'
  | 'EXECUTE'
  | 'SP_GAIN'
  | 'MULTI_HIT';

export interface BaseStats {
  hp: number;
  atk: number;
  def: number;
  critRate: number; // 0.0 - 1.0
  critDmg?: number; // default 1.5
  atkSpeed: number; // attacks per second
  moveSpeed: number; // px per second
  attackRange: number;
}

export interface SkillDef {
  id: string;
  name: string;
  description: string;
  spCost: number;
  gaugeCost?: number;
  cooldown: number;
  aimType: AimType;
  range: number;
  radius: number;
  multiplier: number;
  scalesWithDef?: boolean;
  hitCount?: number;
  effects: SkillEffectTag[];
  vfxKey: string;
  cutInKey?: string;
}

export interface HeroDef {
  id: string;
  name: string;
  title: string;
  tier: Tier;
  role: Role;
  faction: Faction;
  themeColor: string;
  baseStats: BaseStats;
  sovereignAura?: {
    name: string;
    description: string;
    squadFinalDmgBonus: number;
    squadCritDmgBonus: number;
    linkBurstBonus: number;
    wildcardFaction?: boolean;
  };
  passive: { id: string; name: string; description: string };
  skills: [SkillDef, SkillDef];
  ultimate: SkillDef;
  lore: string;
  quote: string;
  bondStory: string;
  assets: {
    card: string;
    standing: string;
    sprite: string;
    ascendedSprite?: string;
    cutIn?: string;
    cutInVideo?: string;
  };
  transcendence?: HeroTranscendenceDef;
}

export interface RelicDef {
  id: string;
  name: string;
  tier: Tier;
  preferredRole: Role;
  passiveDesc: string;
  lore: string;
  bonuses: Partial<BaseStats> & {
    startingGauge?: number;
    aoeRadiusBonus?: number;
    shieldBonus?: number;
    dmgBonusVsDebuffed?: number;
    healBonus?: number;
  };
  assetCard: string;
}

export type SubStatKey =
  | 'ATK_PCT'
  | 'HP_PCT'
  | 'DEF_PCT'
  | 'CRIT_RATE'
  | 'CRIT_DMG'
  | 'ATK_SPD'
  | 'CDR'
  | 'HEAL_PCT';

export interface EquipmentSubStat {
  stat: SubStatKey;
  value: number;
}

export interface EquipmentInstance {
  uid: string;
  name: string;
  slot: EquipmentSlot;
  setId: EquipmentSetId;
  rarity: EquipmentRarity;
  enhanceLevel: number; // 0 - 15
  forgePity?: number; // cumulative fail pity bonus (0..1)
  mainStat: { stat: string; value: number };
  subStats: EquipmentSubStat[];
  equippedHeroId: string | null;
  locked?: boolean;
}

export interface EquipmentSetDef {
  id: EquipmentSetId;
  name: string;
  idealFor: string;
  color: string;
  bonus2Desc: string;
  bonus4Desc: string;
}

export interface FactionDef {
  id: Faction;
  name: string;
  chapterTitle: string;
  biomeTheme: string;
  color: string;
  accentHex: number;
  bonus2Desc: string;
  bonus3Desc: string;
}

export interface EnemyDef {
  id: string;
  name: string;
  title: string;
  isBoss: boolean;
  isMiniBoss?: boolean;
  chapter?: number;
  hp: number;
  atk: number;
  def: number;
  atkSpeed: number;
  moveSpeed: number;
  attackRange: number;
  scale: number;
  radius: number;
  themeColor: string;
  lore: string;
  assetKey: string;
}

export interface RegionDef {
  id: string;
  chapter: number;
  name: string;
  subtitle: string;
  faction: Faction | 'VOID';
  unlocked: boolean;
  mapPos: { x: number; y: number };
  themeColor: string;
  arenaTintHex: number;
  ambientMoteColors: [number, number];
  arenaAsset: string;
  bossAsset: string;
  bossName: string;
  bossTitle: string;
  lore: string;
  stageCount: number;
  recommendedPowerRange: [number, number];
}

export type CampaignDifficulty = 'NORMAL' | 'HARD' | 'HELL';

export interface StageWave {
  label: string;
  spawns: Array<{ enemyId: string; count: number; spread?: number }>;
}

export interface StageDef {
  id: string;
  baseStageId?: string;
  difficulty?: CampaignDifficulty;
  regionId: string;
  stageNumber: number;
  code: string;
  name: string;
  chapter: number;
  subtitle: string;
  recommendedPower: number;
  description: string;
  enemyScale: number;
  isMiniBoss?: boolean;
  isBossStage?: boolean;
  bossNameOverride?: string;
  bossTitleOverride?: string;
  bossAssetOverride?: string;
  arenaAsset?: string;
  arenaTintHex?: number;
  ambientMoteColors?: [number, number];
  waves: StageWave[];
  firstClearCrystals: number;
  repeatCrystals?: number;
  isDungeon?: boolean;
  dungeonId?: DungeonId;
  dungeonTier?: number;
  isSpire?: boolean;
  spireFloor?: number;
  spireModifier?: {
    id: string;
    name: string;
    desc: string;
    color: string;
  };
  worldModifier?: {
    id: string;
    name: string;
    desc: string;
    color: string;
  };
  combatExpMultiplier?: number;
  rewards: {
    gold: [number, number];
    expPotions: [number, number];
    forgeStones: [number, number];
    starIronIngots?: [number, number];
    astralAnvilCores?: [number, number];
    starCores?: [number, number];
    relicFragments?: [number, number];
    bondGiftsRange?: [number, number];
    primaryEssence: Faction;
    primaryEssenceQty: [number, number];
    bonusRandomEssenceChance?: number;
    guaranteedFirstClearRelicId?: string;
    relicDropPool?: string[];
    relicDropChance?: number;
    targetSetIds: EquipmentSetId[];
    equipmentDrops: number;
    equipmentDropChance?: number;
    bonusEquipmentDropChance?: number;
    rarityWeights: Record<EquipmentRarity, number>;
  };
}

export interface DungeonTierDef {
  tier: 1 | 2 | 3 | 4 | 5;
  roman: 'I' | 'II' | 'III' | 'IV' | 'V';
  title: string;
  unlockStageId: string;
  unlockLabel: string;
  recommendedPower: number;
  enemyScale: number;
  chapterEquivalent: number;
}

export interface DungeonDef {
  id: DungeonId;
  name: string;
  subtitle: string;
  badge: string;
  accentColor: string;
  artBanner: string;
  fallbackBanner: string;
  arenaAsset: string;
  arenaTintHex: number;
  ambientMoteColors: [number, number];
  description: string;
  supportsFactionSelect?: boolean;
  supportsSetSelect?: boolean;
  primaryRewardLabel: string;
  tiers: DungeonTierDef[];
}

export interface BannerDef {
  id: string;
  type: 'HERO' | 'RELIC' | 'PET';
  name: string;
  subtitle: string;
  featuredIds: string[];
  poolUR?: string[];
  poolSSR: string[];
  poolSR: string[];
  poolR: string[];
  isLimitedEvent?: boolean;
  urBaseRate?: number;
  ssrBaseRate?: number;
  srBaseRate?: number;
  softPity: number;
  hardPity: number;
  singleCost: number;
  tenCost: number;
  sparkCost: number;
  accentColor: string;
  backgroundAsset?: string;
}

export interface GachaPullResult {
  kind: 'HERO' | 'RELIC' | 'PET';
  id: string;
  name: string;
  tier: Tier;
  isFeatured: boolean;
  isNew: boolean;
  shardsGained: number;
  starDustGained: number;
  petNewRank?: number;
  assetCard: string;
  themeColor: string;
  quote?: string;
}

export interface OwnedHeroState {
  heroId: string;
  level: number;
  exp?: number; // current EXP progress toward next level
  awakening: number; // 0 - 6
  transcended?: boolean;
  useTranscendedVisual?: boolean;
  shards: number;
  bondLevel: number; // 1 - 10
  equippedRelicId: string | null;
  equippedGear: Record<EquipmentSlot, string | null>;
}

export interface PlayerSaveState {
  commanderName: string;
  favoriteHeroId: string;
  gold: number;
  starlightCrystals: number;
  starDust: number;
  starlightTokens: number;
  expPotions: number;
  forgeStones: number;
  starIronIngots: number;
  astralAnvilCores: number;
  starCores: number;
  relicFragments: number;
  factionEssences: Record<Faction, number>;
  bondGifts: number;
  pityCounterUR?: number;
  pityCounterHero: number;
  pityCounterRelic: number;
  pityCounterPet?: number;
  guaranteedFeaturedUR?: boolean;
  guaranteedFeaturedHero: boolean;
  guaranteedFeaturedRelic: boolean;
  guaranteedFeaturedPet?: boolean;
  squadIds: [string, string, string, string];
  partyPresets: [PartyPreset, PartyPreset, PartyPreset];
  activePresetIndex: 0 | 1 | 2;
  roster: Record<string, OwnedHeroState>;
  ownedRelics: string[];
  relicRanks: Record<string, number>; // 1 - 5 refinement rank
  ownedPets?: Record<string, OwnedPetState>;
  activePetId?: string | null;
  equipmentInventory: EquipmentInstance[];
  unlockedCodexIds: string[];
  claimedCodexMilestones: number[];
  claimedRegionChests: string[];
  clearedStages: string[];
  selectedStageId: string;
  selectedDifficulty?: CampaignDifficulty;
  shopPurchases: Record<string, number>;
  shopResetDay: string;
  lastDailySupplyAt: number;
  dungeonTickets: number;
  dungeonEntriesUsed: Record<string, number>;
  dungeonResetDay: string;
  dungeonBestStars: Record<string, number>;
  spireHighestFloor: number;
  spireLastSweepDay: string;
  commissionResetDay: string;
  dailyCommissionProgress: Record<string, number>;
  claimedDailyCommissions: string[];
  claimedActivityMilestones: number[];
  claimedPermanentCommissions: string[];
  lifetimeLinkBursts: number;
  lastManualSaveAt: number;
}

export interface HeroCombatSnapshot {
  heroId: string;
  name: string;
  tier: Tier;
  role: Role;
  faction: Faction;
  themeColor: string;
  hp: number;
  maxHp: number;
  shield: number;
  alive: boolean;
  cd1: number;
  maxCd1: number;
  cd2: number;
  maxCd2: number;
  ultCd: number;
  maxUltCd: number;
  ultGaugeCost: number;
  stacksLabel?: string;
  stacksCount?: number;
  activeBuffs: string[];
  transcended?: boolean;
  cardAsset?: string;
}

export interface BossCombatSnapshot {
  enemyId: string;
  name: string;
  title: string;
  hp: number;
  maxHp: number;
  phase: 1 | 2;
  enraged?: boolean;
  isCasting: boolean;
  castName: string;
  castProgress: number; // 0..1
  castCancelable: boolean;
  isBroken: boolean;
  brokenTimer: number;
  brokenMaxTimer: number;
  breakGauge: number;
  maxBreakGauge: number;
  hitShield: number;
  maxHitShield: number;
  burnStacks: number;
  defShredActive: boolean;
}

export interface LinkWindowState {
  partnerHeroId: string;
  partnerHeroName: string;
  partnerThemeColor: string;
  remaining: number;
  maxDuration: number;
}

export interface ActiveLinkBurstState {
  id: number;
  heroAId: string;
  heroAName: string;
  heroACard: string;
  heroAColor: string;
  heroBId: string;
  heroBName: string;
  heroBCard: string;
  heroBColor: string;
  bonusDamageTotal: number;
  breakDamage: number;
}

export interface HeroBattleReportEntry {
  heroId: string;
  damageDealt: number;
  healingDone: number;
  damageTaken: number;
  shieldGranted: number;
  critHits: number;
  totalHits: number;
  staggerDealt: number;
  ultCasts: number;
}

export interface BattleReportSummary {
  heroes: HeroBattleReportEntry[];
  totalDamage: number;
  totalHealing: number;
  totalDamageTaken: number;
  maxCombo: number;
  perfectDodges: number;
  bossBreaks: number;
  linkBursts: number;
}

export interface ActiveCutInState {
  heroId: string;
  heroName: string;
  heroTitle: string;
  ultName: string;
  tier: Tier;
  faction: Faction;
  themeColor: string;
  cutInAsset?: string;
  cutInVideo?: string;
  cardAsset: string;
  phase: 'FREEZE' | 'CUTIN' | 'IMPACT' | 'AFTERMATH';
}

export interface DroppedRelicSummary {
  relicId: string;
  isNew: boolean;
  newRank: number;
  bonusFragments?: number;
}

export interface HeroBattleExpResult {
  heroId: string;
  expGained: number;
  prevLevel: number;
  newLevel: number;
  levelsGained: number;
  prevExp: number;
  newExp: number;
  expToNext: number;
  atLevelCap: boolean;
  levelCap: number;
}

export interface CombatLootSummary {
  victory: boolean;
  stageId: string;
  stageName: string;
  difficulty?: CampaignDifficulty;
  durationSec: number;
  damageByHero: Record<string, number>;
  healingByHero: Record<string, number>;
  heroExpResults?: Record<string, HeroBattleExpResult>;
  battleReport?: BattleReportSummary;
  goldEarned: number;
  crystalsEarned: number;
  expPotionsEarned: number;
  forgeStonesEarned: number;
  starIronIngotsEarned: number;
  astralAnvilCoresEarned: number;
  starCoresEarned: number;
  relicFragmentsEarned: number;
  essencesEarned: Partial<Record<Faction, number>>;
  bondGiftsEarned: number;
  isFirstClear: boolean;
  isDungeon?: boolean;
  dungeonId?: DungeonId;
  dungeonTier?: number;
  isSpire?: boolean;
  spireFloor?: number;
  starsEarned?: number;
  droppedEquipment: EquipmentInstance[];
  droppedRelics: DroppedRelicSummary[];
}
