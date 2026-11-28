import type { Container, Graphics, Sprite, Texture } from 'pixi.js';
import type { ActorVisualFilter } from './ActorVisualFilter';
import type { ComputedHeroStats } from './CombatMath';
import type { LiveMeshActor } from './LiveMeshActor';
import type { HitImpactStyle, SpriteFxOptions } from './ObjectPool';
import type { EnemyDef, HeroDef, PetDef, SkillDef } from '../types/game';

export interface PetUnit {
  petId: string;
  def: PetDef;
  level: number;
  rank: number;
  skillPowerMult: number;
  x: number;
  y: number;
  facing: number;
  cd: number;
  maxCd: number;
  castFlashTimer: number;
  animTime: number;
  container: Container;
  sprite: Sprite;
  haloSprite: Sprite;
  shadowGfx: Graphics;
}

export interface DashMotionState {
  startX: number;
  startY: number;
  endX: number;
  endY: number;
  elapsed: number;
  duration: number;
  color: number;
  ghostTimer: number;
  arcHeight: number;
}

export interface TimedBuff {
  id: string;
  label: string;
  remaining: number;
  value: number;
}

export interface HeroUnit {
  heroId: string;
  def: HeroDef;
  stats: ComputedHeroStats;
  relicId: string | null;
  transcended?: boolean;
  useTranscendedVisual?: boolean;
  resolvedCardAsset?: string;
  slotIndex: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  facing: number; // 1 right, -1 left
  hp: number;
  maxHp: number;
  shield: number;
  shieldStoredKinetic: number; // Garrick passive
  shieldCounterBurn: boolean; // Draven S2
  alive: boolean;
  cd1: number;
  cd2: number;
  ultCd: number;
  maxUltCd: number;
  basicTimer: number;
  basicCount: number;
  // Hero-specific passive states
  starOrbs: number; // Seraphina (0-3)
  starlightBlades: number; // Astraea UR (0-6)
  ascensionTimer: number; // Astraea UR Ascension Form (9s)
  heatRounds: number; // Vespera SSR (0-5)
  heatStacks: number; // Draven (0-10)
  tailwindStacks: number; // Kael (0-3)
  tailwindTimer: number;
  eclipseCritStacks: number; // Blade of First Eclipse (0-5)
  eclipseCritTimer: number;
  fallingStarStacks: number; // Bowstring of Falling Star (0-5)
  fallingStarTimer: number;
  overdriveTimer: number; // Vaelen
  invincibleTimer: number; // Lyra Ult
  undyingTimer: number; // Draven Ult
  reflectTimer: number; // Garrick Ult
  dmgReduceTimer: number;
  dmgReduceValue: number;
  atkBuffTimer: number;
  atkBuffValue: number;
  atkSpdBuffTimer: number;
  atkSpdBuffValue: number;
  critBuffTimer: number;
  critBuffValue: number;
  hotTimer: number;
  hotTickAmount: number;
  // Internal cooldowns
  lyraPassiveCd: number;
  claraPassiveCd: number;
  obsidianForgeCd: number;
  aegisSetCd: number;
  verdantSetCd: number;
  hitFlashTimer: number;
  animTime: number;
  attackSwingTimer: number;
  attackSwingDuration: number;
  // Option 1+2 Smooth Physics, Gait & Live2D-Lite Deformation State
  knockVx: number;
  knockVy: number;
  visualFacing: number; // Smoothly interpolated -1..+1 turn scalar
  stridePhase: number;
  stepDustGate: number;
  springLean: number;
  springLeanVel: number;
  squashX: number;
  squashY: number;
  dashState: DashMotionState | null;
  // Stats tracking
  totalDamage: number;
  totalHealing: number;
  totalDamageTaken: number;
  totalShieldGranted: number;
  critHits: number;
  totalHits: number;
  staggerDealt: number;
  ultCasts: number;
  // Pixi display
  container: Container;
  liveMesh: LiveMeshActor;
  idleTexture?: Texture;
  attackTexture?: Texture;
  ascendedTexture?: Texture;
  attackScaleBoost?: number;
  activePose?: 'IDLE' | 'ATTACK' | 'ASCENDED';
  castShadowSprite: Sprite;
  shadowGfx: Graphics;
  auraPivot: Container;
  auraSprite: Sprite;
  backRuneSprite?: Sprite | null;
  shieldSprite: Sprite;
  visualFilter: ActorVisualFilter | null;
  ambientVfxTimer: number;
  fallbackCrestGroup?: Container;
  hasFullSprite?: boolean;
  baseScaleY?: number;
  weaponGfx: Graphics;
  hpBarGfx: Graphics;
  auraGfx: Graphics;
}

export interface EnemyUnit {
  uid: string;
  def: EnemyDef;
  x: number;
  y: number;
  vx: number;
  vy: number;
  knockVx: number;
  knockVy: number;
  facing: number;
  visualFacing: number;
  stridePhase: number;
  stepDustGate: number;
  springLean: number;
  springLeanVel: number;
  squashX: number;
  squashY: number;
  flankAngle: number;
  dashState: DashMotionState | null;
  hp: number;
  maxHp: number;
  atk: number;
  defStat: number;
  atkSpeedMult?: number;
  alive: boolean;
  basicTimer: number;
  // Debuffs & CC
  stunTimer: number;
  freezeTimer: number;
  slowTimer: number;
  provokeTimer: number;
  provokeTargetHeroId: string | null;
  starfallMarkTimer: number; // Vaelen
  lunarTraceTimer: number; // Elara (+12% dmg taken)
  defShredTimer: number;
  defShredValue: number;
  atkDownTimer: number;
  atkDownValue: number;
  burnStacks: number;
  burnTimer: number;
  burnTickTimer: number;
  burnSourceAtk: number;
  // Boss-specific states
  phase: 1 | 2;
  enraged: boolean;
  isCasting: boolean;
  castName: string;
  castDuration: number;
  castElapsed: number;
  castCancelable: boolean;
  castAction:
    | 'SWEEP'
    | 'SHOCKWAVE'
    | 'SKYFALL'
    | 'CROSS_BEAM'
    | 'RING_NOVA'
    | 'METEOR_BARRAGE'
    | 'GOLEM_SLAM'
    | 'OBSIDIAN_CLEAVE'
    | 'ASTRAL_NOVA'
    | 'BRIAR_ERUPTION'
    | 'TEMPEST_DIVE'
    | 'WISP_BURST'
    | 'CINDER_LOB'
    | null;
  castTargetX: number;
  castTargetY: number;
  castAngle: number;
  aiCooldown: number;
  phase2Triggered: boolean;
  isBroken: boolean;
  brokenTimer: number;
  brokenMaxTimer: number;
  breakGauge: number;
  maxBreakGauge: number;
  hitShield: number;
  maxHitShield: number;
  hitFlashTimer: number;
  dissolveTimer: number;
  dissolveDuration: number;
  animTime: number;
  attackSwingTimer: number;
  attackSwingDuration: number;
  baseScaleY?: number;
  // 2.5D Entrance Choreography & Ambient VFX
  spawnIntroKind: 'BOSS_DROP' | 'RIFT_EMERGE' | 'NONE';
  spawnIntroTimer: number;
  spawnIntroDuration: number;
  spawnLanded: boolean;
  ambientVfxTimer: number;
  // Pixi display
  container: Container;
  liveMesh: LiveMeshActor;
  idleTexture?: Texture;
  attackTexture?: Texture;
  attackScaleBoost?: number;
  activePose?: 'IDLE' | 'ATTACK';
  castShadowSprite: Sprite;
  shadowGfx: Graphics;
  auraPivot: Container;
  auraSprite: Sprite;
  backRuneSprite: Sprite | null;
  visualFilter: ActorVisualFilter | null;
  hpBarGfx: Graphics;
  statusGfx: Graphics;
}

export interface GroundZone {
  id: string;
  kind: 'STARLIGHT_RIFT' | 'LAVA_CALDERA' | 'SANCTUARY_BLOOM' | 'ASTRAL_BEACON' | 'CELESTIAL_DOMAIN';
  ownerHeroId: string;
  x: number;
  y: number;
  radius: number;
  remaining: number;
  maxDuration: number;
  tickTimer: number;
  color: number;
  gfx: Graphics;
}

export interface EnemyTelegraph {
  id: string;
  enemyUid: string;
  shape: 'CIRCLE' | 'CONE' | 'LINE' | 'RING';
  x: number;
  y: number;
  radius: number;
  innerRadius?: number; // SAFE inner radius for RING donut telegraphs
  length?: number; // total beam length for LINE telegraphs
  width?: number; // beam corridor width for LINE telegraphs
  angle: number;
  arcSpan: number; // radians for CONE
  duration: number;
  elapsed: number;
  cancelable: boolean;
  gfx: Graphics;
  laneSprite?: Sprite;
  coreSprite?: Sprite;
}

export interface DelayedStrike {
  delay: number;
  fn: () => void;
}

export interface CombatContext {
  arenaWidth: number;
  arenaHeight: number;
  bounds: { minX: number; maxX: number; minY: number; maxY: number };
  heroes: HeroUnit[];
  enemies: EnemyUnit[];
  zones: GroundZone[];
  telegraphs: EnemyTelegraph[];
  delayedStrikes: DelayedStrike[];
  squadAnchor: { x: number; y: number };
  moveTarget: { x: number; y: number } | null;
  sp: number;
  maxSp: number;
  ultGauge: number;
  maxUltGauge: number;
  globalUltCd: number;
  timeScale: number;
  cameraShake: number;
  cameraZoomTarget: number;
  cameraFocus: { x: number; y: number } | null;
  ultActive: boolean;
  linkPartnerHeroId: string | null;
  linkWindowTimer: number;
  defeatedEnemyIds: Set<string>;
  addSp: (amount: number) => void;
  addUltGauge: (amount: number, bonusMult?: number) => void;
  triggerShake: (amount: number) => void;
  spawnDamageText: (x: number, y: number, text: string, color: number, isCrit?: boolean) => void;
  spawnBurst: (x: number, y: number, color: number, count?: number, radius?: number) => void;
  spawnRingWave: (x: number, y: number, maxRadius: number, color: number, duration?: number) => void;
  spawnSlashArc: (x: number, y: number, angle: number, radius: number, color: number) => void;
  spawnBeam: (x1: number, y1: number, x2: number, y2: number, color: number, width?: number) => void;
  spawnSkyPillar: (x: number, y: number, radius: number, color: number, isUlt?: boolean) => void;
  spawnSpriteFx: (opts: SpriteFxOptions) => void;
  spawnHitImpact: (x: number, y: number, style: HitImpactStyle, color: number, isCrit?: boolean) => void;
  spawnFootstepDust: (x: number, y: number, vx: number, vy: number, scale?: number, tint?: number) => void;
  spawnGhostAfterimage: (
    texture: Texture,
    x: number,
    y: number,
    scaleX: number,
    scaleY: number,
    tint: number,
    alpha?: number,
    life?: number,
  ) => void;
  spawnLootOrbs: (x: number, y: number, count: number, isBoss?: boolean) => void;
  triggerEnemyBreak: (enemy: EnemyUnit, duration?: number, reasonLabel?: string) => void;
  triggerArenaDim: (color: number, duration: number, peakAlpha?: number) => void;
  triggerSkillCallout: (hero: HeroUnit, skillName: string, slot: 1 | 2 | 'ULT') => void;
  spawnProjectile: (opts: {
    x: number;
    y: number;
    tx: number;
    ty: number;
    speed: number;
    color: number;
    radius: number;
    fromHero: boolean;
    onHit: (hitX: number, hitY: number) => void;
  }) => void;
  damageEnemy: (
    attacker: HeroUnit,
    enemy: EnemyUnit,
    opts: {
      multiplier: number;
      scalesWithDef?: boolean;
      extraAtkMultiplier?: number;
      isSkill?: boolean;
      isUlt?: boolean;
      isTrueDamage?: boolean;
      bonusCritRate?: number;
      bonusDmgMult?: number;
      hitShieldHits?: number;
      breakDamage?: number;
      canTriggerMark?: boolean;
    },
  ) => { damage: number; isCrit: boolean };
  damageHero: (
    attacker: EnemyUnit | null,
    hero: HeroUnit,
    rawDamage: number,
    isRanged?: boolean,
  ) => void;
  healHero: (healer: HeroUnit, target: HeroUnit, amount: number, isActiveSkill?: boolean) => void;
  grantShield: (
    caster: HeroUnit,
    target: HeroUnit,
    amount: number,
    counterBurn?: boolean,
  ) => void;
  addZone: (zone: Omit<GroundZone, 'gfx'>) => void;
  triggerUltimate: (hero: HeroUnit, skill: SkillDef, tx: number, ty: number) => void;
  notifyBanner: (msg: string) => void;
}
