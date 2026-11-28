import { Application, Container, Graphics, Sprite } from 'pixi.js';
import { ENEMY_ATTACK_SPRITES, HERO_ATTACK_SPRITES } from '../data/attackSprites';
import { buildBossBanter } from '../data/bossBanter';
import { resolveAnyStageDef } from '../data/dungeons';
import { ENEMY_MAP } from '../data/enemies';
import { generateEquipment } from '../data/equipment';
import { FACTIONS } from '../data/factions';
import { HERO_MAP, resolveHeroVisuals } from '../data/heroes';
import {
  computeLabyrinthBlessingMods,
  type AggregatedBlessingMods,
} from '../data/labyrinth';
import { PET_MAP, computePetAura } from '../data/pets';
import { CAMPAIGN_DIFFICULTY_MAP } from '../data/stages';
import { getRaidRankForScore } from '../data/worldBoss';
import {
  getExpToNextLevel,
  getHeroLevelCap,
  getStageCombatHeroExp,
} from '../data/materials';
import { useCombatStore, type LiveDpsEntry } from '../store/useCombatStore';
import { usePlayerStore, MAX_RELIC_RANK } from '../store/usePlayerStore';
import { useSettingsStore } from '../store/useSettingsStore';
import type {
  BossCombatSnapshot,
  CombatLootSummary,
  DroppedRelicSummary,
  EquipmentInstance,
  EquipmentRarity,
  Faction,
  HeroBattleExpResult,
  HeroCombatSnapshot,
  PetCombatSnapshot,
  SkillDef,
} from '../types/game';
import {
  attachHeroPortraitCrest,
  buildHeroWeaponGraphic,
  getProceduralEnemyTexture,
  getProceduralHeroTexture,
  releaseCombatTextures,
  tryLoadPixiTexture,
} from './AssetManager';
import {
  createActorVisualFilter,
  getBiomeLighting,
  type BiomeLightingConfig,
} from './ActorVisualFilter';
import { audioManager } from './AudioManager';
import { BiomeWeatherSystem } from './BiomeWeatherSystem';
import {
  calculateCombatDamage,
  computeHeroStats,
  getActiveFactionBonuses,
  isFourFactionHarmony,
} from './CombatMath';
import type { CombatContext, EnemyUnit, GroundZone, HeroUnit, PetUnit } from './CombatTypes';
import { EnemyAI } from './EnemyAI';
import { getHeroHitStyle } from './HeroVfxChoreographer';
import { LiveMeshActor } from './LiveMeshActor';
import { ObjectPool } from './ObjectPool';
import { SkillExecutor } from './SkillExecutor';
import { SquadController } from './SquadController';
import { UltimateDirector } from './UltimateDirector';
import { VfxTextureAtlas } from './VfxTextureAtlas';

const ARENA_W = 2560;
const ARENA_H = 1440;
const BOUNDS = { minX: 460, maxX: 2100, minY: 360, maxY: 1120 };

function hexToNum(hex: string): number {
  return parseInt(hex.replace('#', ''), 16) || 0xffffff;
}

function rollWeightedRarity(weights: Record<EquipmentRarity, number>): EquipmentRarity {
  const entries = Object.entries(weights) as Array<[EquipmentRarity, number]>;
  const total = entries.reduce((sum, [, w]) => sum + w, 0);
  let r = Math.random() * total;
  for (const [rarity, w] of entries) {
    r -= w;
    if (r <= 0) return rarity;
  }
  return 'RARE';
}

export class CombatEngine {
  private app: Application;
  private hostEl: HTMLElement;
  private stageId: string;
  private world = new Container();
  private skyLayer = new Container();
  private floorLayer = new Container();
  private decalLayer = new Container();
  private telegraphLayer = new Container();
  private actorLayer = new Container();
  private ambientLayer = new Container();
  private dimOverlay = new Graphics();
  private dimTimer = 0;
  private dimMaxDuration = 1;
  private dimPeakAlpha = 0.42;
  private dimColor = 0x0b1026;
  private moveMarkerGfx = new Graphics();
  private weatherSystem: BiomeWeatherSystem | null = null;
  private biomeLighting: BiomeLightingConfig = getBiomeLighting(1);

  private pool = new ObjectPool();
  private squadCtrl = new SquadController();
  private skillExec = new SkillExecutor();
  private enemyAI = new EnemyAI();
  private ultDirector = new UltimateDirector();

  private ctx!: CombatContext;
  private petUnit: PetUnit | null = null;
  private cameraX = 1040;
  private cameraY = 740;
  private cameraZoom = 1.0;
  private pointerWorld = { x: 1180, y: 740 };
  private elapsedSec = 0;
  private hudSyncTimer = 0;
  private waveIndex = 0;
  private waveTransitionTimer = 0;
  private victoryLingerTimer = 0;
  private comboCount = 0;
  private maxCombo = 0;
  private comboTimer = 0;
  private hitstopTimer = 0;
  private evadeCooldown = 0;
  private readonly evadeMaxCooldown = 5.0;
  private perfectDodgeSlowTimer = 0;
  private breakZoomTimer = 0;
  private perfectDodgeClearHandle: number | null = null;
  private linkBurstClearHandle: number | null = null;
  private perfectDodgesCount = 0;
  private bossBreaksCount = 0;
  private linkBurstsCount = 0;
  private raidBarsCleared = 0;
  private raidTotalScore = 0;
  private labyrinthMods: AggregatedBlessingMods | null = null;
  private chainLightningGuard = false;
  private readonly linkWindowDuration = 5.5;
  private pendingBossWarning: { name: string; title: string } | null = null;
  private joystickVec: { x: number; y: number } | null = null;
  private battleEnded = false;
  private destroyed = false;
  private appReady = false;
  private canvasEl: HTMLCanvasElement | null = null;
  private fpsSamples = 60;
  private bannerClearHandle: number | null = null;
  private calloutClearHandle: number | null = null;
  private bossWarnClearHandle: number | null = null;
  private waveBannerClearHandle: number | null = null;

  private boundContextMenu: (e: MouseEvent) => void;
  private boundKeyDown: (e: KeyboardEvent) => void;

  constructor(hostEl: HTMLElement, stageId: string) {
    this.hostEl = hostEl;
    this.stageId = stageId;
    this.app = new Application();
    this.boundContextMenu = (e) => e.preventDefault();
    this.boundKeyDown = (e) => this.handleHotkey(e);
  }

  public async init(): Promise<void> {
    await this.app.init({
      resizeTo: this.hostEl,
      backgroundColor: 0x090e1f,
      antialias: true,
      powerPreference: 'high-performance',
      resolution: Math.min(window.devicePixelRatio || 1, 2),
      autoDensity: true,
    });
    if (this.destroyed) {
      try {
        this.app.destroy(true, { children: true });
      } catch {
        // Ignore teardown error
      }
      return;
    }

    this.appReady = true;
    this.canvasEl = this.app.canvas;
    this.hostEl.innerHTML = '';
    this.hostEl.appendChild(this.canvasEl);
    this.canvasEl.addEventListener('contextmenu', this.boundContextMenu);
    window.addEventListener('keydown', this.boundKeyDown);

    // Layer hierarchy (2.5D depth)
    this.actorLayer.sortableChildren = true;
    this.dimOverlay.rect(0, 0, ARENA_W, ARENA_H).fill({ color: 0xffffff });
    this.dimOverlay.alpha = 0;
    this.dimOverlay.visible = false;

    this.world.addChild(this.skyLayer);
    this.world.addChild(this.floorLayer);
    this.world.addChild(this.dimOverlay);
    this.world.addChild(this.decalLayer);
    this.world.addChild(this.pool.groundVfxLayer);
    this.world.addChild(this.telegraphLayer);
    this.world.addChild(this.moveMarkerGfx);
    this.world.addChild(this.skillExec.aimGfx);
    this.world.addChild(this.actorLayer);
    this.world.addChild(this.pool.vfxLayer);
    this.world.addChild(this.ambientLayer);
    this.world.addChild(this.pool.textLayer);
    this.app.stage.addChild(this.world);

    await this.buildAureliaArena();
    if (this.destroyed) return;
    this.setupCombatContext();
    this.setupPointerEvents();
    this.spawnSquad();
    this.spawnWave(0);

    audioManager.playBgm('battle');
    this.syncHudSnapshot(true);

    this.app.ticker.add((ticker) => {
      if (this.destroyed) return;
      const realDt = Math.min(0.05, ticker.deltaMS / 1000);
      this.fpsSamples = this.fpsSamples * 0.9 + (1 / Math.max(0.001, realDt)) * 0.1;
      this.tick(realDt);
    });
  }

  private async buildAureliaArena(): Promise<void> {
    const stage = resolveAnyStageDef(this.stageId);
    const arenaTint = stage.arenaTintHex ?? 0xffffff;
    const arenaAssetUrl = stage.arenaAsset ?? '/assets/environments/env_aurelia_floor.webp';
    const [moteColorA, moteColorB] = stage.ambientMoteColors ?? [0xfde047, 0x7dd3fc];

    // 1. Load each Chapter's bespoke hand-painted 2.5D biome battle arena (natural full-color vibrancy, no muddy tint!)
    let floorTex = await tryLoadPixiTexture(arenaAssetUrl);
    let usingFallbackArena = false;
    if (!floorTex && arenaAssetUrl !== '/assets/environments/env_aurelia_floor.webp') {
      floorTex = await tryLoadPixiTexture('/assets/environments/env_aurelia_floor.webp');
      usingFallbackArena = true;
    }
    if (floorTex) {
      const bg = new Sprite(floorTex);
      bg.width = ARENA_W;
      bg.height = ARENA_H;
      bg.alpha = 1.0;
      bg.tint = usingFallbackArena ? arenaTint : 0xffffff;
      this.floorLayer.addChild(bg);
    } else {
      // Fallback procedural bridge only if arena art is absent
      const g = new Graphics();
      g.rect(0, 0, ARENA_W, ARENA_H).fill({ color: 0x1a2644 });
      g.roundRect(BOUNDS.minX, BOUNDS.minY, BOUNDS.maxX - BOUNDS.minX, BOUNDS.maxY - BOUNDS.minY, 18)
        .fill({ color: 0xd8d2c5 })
        .stroke({ color: 0xf5c84c, width: 4 });
      g.tint = arenaTint;
      this.floorLayer.addChild(g);
    }

    // 2. 10-Chapter Dynamic Biome Weather, Directional Rim Lighting & Projected Shadow Config
    this.biomeLighting = getBiomeLighting(stage.chapter, stage.dungeonId);
    this.weatherSystem = new BiomeWeatherSystem(
      this.ambientLayer,
      stage.chapter,
      BOUNDS,
      stage.dungeonId,
      [moteColorA, moteColorB],
    );
  }

  private setupCombatContext(): void {
    const stage = resolveAnyStageDef(this.stageId);
    const settings = useSettingsStore.getState();
    useCombatStore.getState().resetForStage(stage.id, `${stage.code} ${stage.name}`, stage.waves.length);
    useCombatStore.getState().setSnapshot({
      speedMultiplier: settings.defaultBattleSpeed,
      autoSkill: settings.defaultAutoSkill,
      autoMove: settings.defaultAutoMove,
    });

    this.ctx = {
      arenaWidth: ARENA_W,
      arenaHeight: ARENA_H,
      bounds: BOUNDS,
      heroes: [],
      enemies: [],
      zones: [],
      telegraphs: [],
      delayedStrikes: [],
      squadAnchor: { x: 760, y: 740 },
      moveTarget: null,
      sp: 4.5,
      maxSp: 10,
      ultGauge: 0,
      maxUltGauge: 90,
      globalUltCd: 0,
      timeScale: 1.0,
      cameraShake: 0,
      cameraZoomTarget: 1.0,
      cameraFocus: null,
      ultActive: false,
      linkPartnerHeroId: null,
      linkWindowTimer: 0,
      defeatedEnemyIds: new Set(),

      addSp: (amount) => {
        this.ctx.sp = Math.min(this.ctx.maxSp, Math.max(0, this.ctx.sp + amount));
      },
      addUltGauge: (amount, bonusMult = 1) => {
        const st = resolveAnyStageDef(this.stageId);
        const spireUltMult = st.spireModifier?.id === 'SOLAR_OVERCHARGE' ? 1.2 : 1.0;
        this.ctx.ultGauge = Math.min(
          this.ctx.maxUltGauge,
          this.ctx.ultGauge + amount * bonusMult * spireUltMult,
        );
      },
      triggerShake: (amount) => {
        if (!useSettingsStore.getState().enableScreenShake) return;
        this.ctx.cameraShake = Math.max(this.ctx.cameraShake, amount);
      },
      spawnDamageText: (x, y, text, color, isCrit) => {
        if (!useSettingsStore.getState().enableDamageNumbers) return;
        this.pool.spawnFloatingText(x, y, text, color, isCrit);
      },
      spawnBurst: (x, y, color, count, radius) => {
        this.pool.spawnBurst(x, y, color, count, radius);
      },
      spawnRingWave: (x, y, maxRadius, color, duration) => {
        this.pool.spawnRingWave(x, y, maxRadius, color, duration);
      },
      spawnSlashArc: (x, y, angle, radius, color) => {
        this.pool.spawnSlashArc(x, y, angle, radius, color);
      },
      spawnBeam: (x1, y1, x2, y2, color, width) => {
        this.pool.spawnBeam(x1, y1, x2, y2, color, width);
      },
      spawnSkyPillar: (x, y, radius, color, isUlt) => {
        this.pool.spawnSkyPillar(x, y, radius, color, isUlt);
      },
      spawnSpriteFx: (opts) => {
        this.pool.spawnSpriteFx(opts);
      },
      spawnHitImpact: (x, y, style, color, isCrit) => {
        this.pool.spawnHitImpact(x, y, style, color, isCrit);
      },
      spawnFootstepDust: (x, y, vx, vy, scale, tint) => {
        this.pool.spawnFootstepDust(x, y, vx, vy, scale, tint ?? this.biomeLighting.dustTint);
      },
      spawnGhostAfterimage: (texture, x, y, scaleX, scaleY, tint, alpha, life) => {
        this.pool.spawnGhostAfterimage(texture, x, y, scaleX, scaleY, tint, alpha, life);
      },
      spawnLootOrbs: (x, y, count, isBoss) => {
        this.pool.spawnLootOrbs(x, y, count, isBoss);
      },
      triggerEnemyBreak: (enemy, duration = 4.0, reasonLabel) => {
        this.triggerEnemyBreak(enemy, duration, reasonLabel);
      },
      triggerArenaDim: (color, duration, peakAlpha = 0.44) => {
        this.dimColor = color;
        this.dimMaxDuration = Math.max(0.25, duration);
        this.dimTimer = this.dimMaxDuration;
        this.dimPeakAlpha = peakAlpha;
        this.dimOverlay.tint = color;
        this.dimOverlay.visible = true;
      },
      triggerSkillCallout: (hero, skillName, slot) => {
        useCombatStore.getState().setSkillCallout({
          id: Date.now() + Math.random(),
          heroId: hero.heroId,
          heroName: hero.def.name,
          skillName,
          cardAsset: hero.resolvedCardAsset ?? hero.def.assets.card,
          themeColor: hero.def.themeColor,
          isUlt: slot === 'ULT',
        });
        if (this.calloutClearHandle) window.clearTimeout(this.calloutClearHandle);
        this.calloutClearHandle = window.setTimeout(() => {
          useCombatStore.getState().setSkillCallout(null);
        }, 1250);
      },
      spawnProjectile: (opts) => {
        this.pool.spawnProjectile(opts);
      },
      damageEnemy: (attacker, enemy, opts) => this.handleDamageEnemy(attacker, enemy, opts),
      damageHero: (attacker, hero, rawDamage, isRanged) =>
        this.handleDamageHero(attacker, hero, rawDamage, isRanged),
      healHero: (healer, target, amount, isActiveSkill) =>
        this.handleHealHero(healer, target, amount, isActiveSkill),
      grantShield: (caster, target, amount, counterBurn) =>
        this.handleGrantShield(caster, target, amount, counterBurn),
      addZone: (zone) => {
        const gfx = new Graphics();
        this.decalLayer.addChild(gfx);
        this.ctx.zones.push({ ...zone, gfx });
      },
      triggerUltimate: (hero, skill, tx, ty) => {
        hero.ultCasts += 1;
        const canLink =
          this.ctx.linkWindowTimer > 0 &&
          this.ctx.linkPartnerHeroId !== null &&
          this.ctx.linkPartnerHeroId !== hero.heroId;
        const partnerHero = canLink
          ? this.ctx.heroes.find((h) => h.heroId === this.ctx.linkPartnerHeroId) ?? null
          : null;

        if (partnerHero) {
          this.ctx.linkWindowTimer = 0;
          this.ctx.linkPartnerHeroId = null;
          useCombatStore.getState().setLinkWindow(null);
        } else {
          // Open 5.5s Starlight Link Window & echo +5 Ult Gauge so chaining another Hero's Ult feels fluid without flooding gauge!
          this.ctx.linkPartnerHeroId = hero.heroId;
          this.ctx.linkWindowTimer = this.linkWindowDuration;
          this.ctx.addUltGauge(5);
        }

        this.ultDirector.start(this.ctx, hero, skill, tx, ty, (h, sk, x, y) => {
          this.skillExec.executeSkillPayload(this.ctx, h, sk, 'ULT', x, y);
          if (partnerHero) {
            this.triggerStarlightLinkBurst(partnerHero, h);
          }
        });
      },
      notifyBanner: (msg) => {
        useCombatStore.getState().showBannerToast(msg);
        if (this.bannerClearHandle) window.clearTimeout(this.bannerClearHandle);
        this.bannerClearHandle = window.setTimeout(() => {
          useCombatStore.getState().showBannerToast(null);
        }, 2800);
      },
    };
  }

  private spawnSquad(): void {
    const player = usePlayerStore.getState();
    const stageDef = resolveAnyStageDef(this.stageId);
    this.labyrinthMods = stageDef.isLabyrinth
      ? computeLabyrinthBlessingMods(player.labyrinthRun?.activeBlessingIds ?? [])
      : null;
    const labHpMap = stageDef.isLabyrinth ? (player.labyrinthRun?.heroHpRatios ?? {}) : null;
    const squadIds = player.squadIds;
    const activeOwnedPet =
      player.activePetId && player.ownedPets?.[player.activePetId]
        ? player.ownedPets[player.activePetId]
        : null;
    let totalStartingGauge = this.labyrinthMods?.startingUltGauge ?? 0;

    squadIds.forEach((heroId, idx) => {
      const def = HERO_MAP[heroId];
      const owned = player.roster[heroId];
      if (!def || !owned) return;

      const visuals = resolveHeroVisuals(def, owned);
      const baseStats = computeHeroStats(
        def,
        owned,
        player.equipmentInventory,
        squadIds,
        player.unlockedCodexIds.length,
        player.relicRanks,
        { roster: player.roster, activePet: activeOwnedPet },
      );
      const lm = this.labyrinthMods;
      const stats = lm
        ? {
            ...baseStats,
            atk: Math.round(baseStats.atk * (1 + lm.atkPct)),
            maxHp: Math.round(baseStats.maxHp * (1 + lm.hpPct)),
            def: Math.round(baseStats.def * (1 + lm.defPct)),
            critRate: Math.min(0.95, baseStats.critRate + lm.critRate),
            critDmg: baseStats.critDmg + lm.critDmg,
            skillDmgBonus: baseStats.skillDmgBonus + lm.skillDmgBonus,
            ultDmgBonus: baseStats.ultDmgBonus + lm.ultDmgBonus,
            finalDmgBonus: (baseStats.finalDmgBonus ?? 0) + lm.finalDmgBonus,
            breakDmgBonus: (baseStats.breakDmgBonus ?? 0) + lm.breakDmgBonus,
            ultGaugeBonus: baseStats.ultGaugeBonus + lm.ultGaugeBonus,
            cdr: Math.min(0.45, baseStats.cdr + lm.cdrBonus),
            startShieldRatio: baseStats.startShieldRatio + lm.startShieldPct,
            spRegenBonus: (baseStats.spRegenBonus ?? 0) + lm.spRegenMult,
          }
        : baseStats;
      totalStartingGauge += stats.startingGauge;

      const atlas = VfxTextureAtlas.get();
      const container = new Container();
      const auraGfx = new Graphics();
      const tex = getProceduralHeroTexture(this.app.renderer, def);
      const liveMesh = new LiveMeshActor(tex, 0.92);
      liveMesh.mesh.scale.set(0.9);
      const visualFilter = createActorVisualFilter(this.biomeLighting);
      if (visualFilter) {
        liveMesh.mesh.filters = [visualFilter];
      }
      const weaponGfx = buildHeroWeaponGraphic(def.role, def.themeColor);
      weaponGfx.position.set(34, -36);
      const hpBarGfx = new Graphics();

      // True 2.5D Projected Cast Silhouette Shadow across the arena floor!
      const castShadowSprite = new Sprite(tex);
      castShadowSprite.anchor.set(0.5, 0.95);
      castShadowSprite.position.set(0, 3);
      castShadowSprite.tint = this.biomeLighting.shadowTint;
      castShadowSprite.alpha = this.biomeLighting.shadowAlpha;
      castShadowSprite.skew.x = this.biomeLighting.shadowSkewX;
      castShadowSprite.visible = false;

      // Grounded soft ambient-occlusion contact shadow beneath boots
      const heroShadow = new Graphics();
      heroShadow.ellipse(0, 2, 32, 10).fill({ color: 0x050814, alpha: 0.42 });

      // Rotating feathered Faction Magic Circle inside perspective-flattened floor pivot!
      const auraPivot = new Container();
      auraPivot.position.set(0, 3);
      auraPivot.scale.set(1, 0.36);
      const auraSprite = new Sprite(atlas.magicCircle);
      auraSprite.anchor.set(0.5);
      auraSprite.tint = FACTIONS[def.faction].accentHex;
      auraSprite.blendMode = 'normal';
      auraSprite.alpha = 0.28;
      auraSprite.scale.set(0.34);
      auraPivot.addChild(auraSprite);

      // UR Sovereign Exclusive: Floating Rotating Celestial Back-Rune Halo behind hero!
      let backRuneSprite: Sprite | null = null;
      if (def.tier === 'UR') {
        backRuneSprite = new Sprite(atlas.magicCircle);
        backRuneSprite.anchor.set(0.5);
        backRuneSprite.position.set(0, -84);
        backRuneSprite.tint = 0xfde047;
        backRuneSprite.blendMode = 'add';
        backRuneSprite.alpha = 0.42;
        backRuneSprite.scale.set(0.46);
      }

      // Holographic Hex-Dome Shield Sprite wrapping shielded heroes (crisp on both bright & dark floors!)
      const shieldSprite = new Sprite(atlas.hexDome);
      shieldSprite.anchor.set(0.5);
      shieldSprite.position.set(0, -64);
      shieldSprite.tint = 0x38bdf8;
      shieldSprite.blendMode = 'normal';
      shieldSprite.alpha = 0;
      shieldSprite.scale.set(0.5, 0.6);
      shieldSprite.visible = false;

      // Fallback portrait crest container (auto-hidden when real full-body battle sprite loads!)
      const fallbackCrestGroup = new Container();
      attachHeroPortraitCrest(fallbackCrestGroup, def);

      container.addChild(castShadowSprite);
      container.addChild(heroShadow);
      container.addChild(auraPivot);
      container.addChild(auraGfx);
      if (backRuneSprite) container.addChild(backRuneSprite);
      container.addChild(liveMesh.mesh);
      container.addChild(fallbackCrestGroup);
      container.addChild(weaponGfx);
      container.addChild(shieldSprite);
      container.addChild(hpBarGfx);
      this.actorLayer.addChild(container);

      const x = this.ctx.squadAnchor.x + (idx === 0 ? 60 : idx === 3 ? -60 : 0);
      const y = this.ctx.squadAnchor.y + (idx === 1 ? -54 : idx === 2 ? 54 : 0);
      container.position.set(x, y);

      const startShield = Math.round(stats.maxHp * stats.startShieldRatio * stats.shieldPower);
      const baseUltCd =
        def.ultimate.cooldown > 1
          ? def.ultimate.cooldown
          : def.tier === 'UR'
            ? 22
            : def.tier === 'SSR'
              ? 20
              : def.tier === 'SR'
                ? 18
                : 16;
      const maxUltCd = Math.max(
        10,
        Number((baseUltCd * (1 - Math.min(0.25, stats.cdr))).toFixed(1)),
      );

      const savedHpRatio = labHpMap && labHpMap[heroId] !== undefined ? labHpMap[heroId] : 1;
      const startAlive = savedHpRatio > 0;
      const startHp = startAlive ? Math.max(1, Math.round(stats.maxHp * Math.min(1, savedHpRatio))) : 0;

      const heroUnit: HeroUnit = {
        heroId,
        def,
        stats,
        relicId: owned.equippedRelicId,
        transcended: Boolean(def.transcendence?.enabled && owned.transcended),
        useTranscendedVisual: visuals.isTranscendedVisual,
        resolvedCardAsset: visuals.card,
        slotIndex: idx,
        x,
        y,
        vx: 0,
        vy: 0,
        facing: 1,
        hp: startHp,
        maxHp: stats.maxHp,
        shield: startAlive ? startShield : 0,
        shieldStoredKinetic: 0,
        shieldCounterBurn: false,
        alive: startAlive,
        cd1: 0,
        cd2: 0,
        ultCd: 0,
        maxUltCd,
        basicTimer: 0.25 + idx * 0.1,
        basicCount: 0,
        starOrbs: heroId === 'seraphina' ? 1 : 0,
        starlightBlades: 0,
        ascensionTimer: 0,
        heatRounds: 0,
        heatStacks: 0,
        tailwindStacks: 0,
        tailwindTimer: 0,
        eclipseCritStacks: 0,
        eclipseCritTimer: 0,
        fallingStarStacks: 0,
        fallingStarTimer: 0,
        overdriveTimer: 0,
        invincibleTimer: 0,
        undyingTimer: 0,
        reflectTimer: 0,
        dmgReduceTimer: 0,
        dmgReduceValue: 0,
        atkBuffTimer: 0,
        atkBuffValue: 0,
        atkSpdBuffTimer: 0,
        atkSpdBuffValue: 0,
        critBuffTimer: 0,
        critBuffValue: 0,
        hotTimer: 0,
        hotTickAmount: 0,
        lyraPassiveCd: 0,
        claraPassiveCd: 0,
        obsidianForgeCd: 0,
        aegisSetCd: 0,
        verdantSetCd: 0,
        hitFlashTimer: 0,
        animTime: idx * 0.6,
        attackSwingTimer: 0,
        attackSwingDuration: 0.24,
        knockVx: 0,
        knockVy: 0,
        visualFacing: 1,
        stridePhase: idx * 1.4,
        stepDustGate: 0,
        springLean: 0,
        springLeanVel: 0,
        squashX: 1,
        squashY: 1,
        dashState: null,
        totalDamage: 0,
        totalHealing: 0,
        totalDamageTaken: 0,
        totalShieldGranted: 0,
        critHits: 0,
        totalHits: 0,
        staggerDealt: 0,
        ultCasts: 0,
        container,
        liveMesh,
        castShadowSprite,
        shadowGfx: heroShadow,
        auraPivot,
        auraSprite,
        backRuneSprite,
        shieldSprite,
        visualFilter,
        ambientVfxTimer: idx * 0.14,
        fallbackCrestGroup,
        hasFullSprite: false,
        baseScaleY: 0.9,
        weaponGfx,
        hpBarGfx,
        auraGfx,
      };
      this.ctx.heroes.push(heroUnit);

      // Load real full-body transparent anime battle sprite onto LiveMeshActor & Cast Shadow (Transcended visual when active!)
      const spriteUrl = visuals.sprite;
      tryLoadPixiTexture(spriteUrl).then((loaded) => {
        if (!loaded || this.destroyed || liveMesh.mesh.destroyed) return;
        liveMesh.setTexture(loaded, 0.95);
        const targetH = visuals.isTranscendedVisual ? 156 : def.role === 'TANK' ? 152 : 142;
        const sc = targetH / Math.max(1, loaded.height);
        liveMesh.mesh.scale.set(sc);
        castShadowSprite.texture = loaded;
        castShadowSprite.scale.set(sc, sc * this.biomeLighting.shadowScaleY);
        castShadowSprite.visible = true;
        heroUnit.idleTexture = loaded;
        heroUnit.activePose = 'IDLE';
        heroUnit.hasFullSprite = true;
        heroUnit.baseScaleY = sc;
        fallbackCrestGroup.visible = false;
        weaponGfx.visible = false;
      });
      const atkUrl = visuals.attackSprite ?? HERO_ATTACK_SPRITES[def.id]?.url;
      const atkBoost = visuals.attackSprite
        ? (visuals.attackScaleBoost ?? 1.15)
        : (HERO_ATTACK_SPRITES[def.id]?.scaleBoost ?? 1.0);
      if (atkUrl) {
        tryLoadPixiTexture(atkUrl).then((atkLoaded) => {
          if (!atkLoaded || this.destroyed || liveMesh.mesh.destroyed) return;
          heroUnit.attackTexture = atkLoaded;
          heroUnit.attackScaleBoost = atkBoost;
        });
      }
      if (!visuals.isTranscendedVisual && def.assets.ascendedSprite) {
        tryLoadPixiTexture(def.assets.ascendedSprite).then((ascLoaded) => {
          if (!ascLoaded || this.destroyed || liveMesh.mesh.destroyed) return;
          heroUnit.ascendedTexture = ascLoaded;
        });
      }
    });

    // Spawn Equipped Companion Pet hovering beside the Squad!
    this.spawnActivePet();

    // Start every expedition with 8/90 Chaser Resonance + Relic startingGauge + Spire Starlight Surge (+24)!
    const spireStartGauge = stageDef.spireModifier?.id === 'STARLIGHT_SURGE' ? 24 : 0;
    this.ctx.ultGauge = Math.min(this.ctx.maxUltGauge, 8 + totalStartingGauge + spireStartGauge);

    // 4-Faction Harmony Synergy Bonus: +1.0 Starting Squad SP!
    if (isFourFactionHarmony(squadIds)) {
      this.ctx.addSp(1.0);
    }
  }

  private spawnActivePet(): void {
    const player = usePlayerStore.getState();
    const petId = player.activePetId;
    if (!petId) return;
    const owned = player.ownedPets?.[petId];
    const def = PET_MAP[petId];
    if (!owned || !def) return;

    const aura = computePetAura(def, owned);
    const atlas = VfxTextureAtlas.get();
    const container = new Container();

    const shadowGfx = new Graphics();
    shadowGfx.ellipse(0, 2, 22, 7).fill({ color: 0x050814, alpha: 0.34 });

    const haloSprite = new Sprite(atlas.magicCircle);
    haloSprite.anchor.set(0.5);
    haloSprite.position.set(0, -68);
    haloSprite.tint = hexToNum(def.themeColor);
    haloSprite.blendMode = 'add';
    haloSprite.alpha = 0.38;
    haloSprite.scale.set(0.28);

    const sprite = new Sprite();
    sprite.anchor.set(0.5, 0.5);
    sprite.position.set(0, -68);
    sprite.visible = false;

    container.addChild(shadowGfx);
    container.addChild(haloSprite);
    container.addChild(sprite);
    this.actorLayer.addChild(container);

    const startX = this.ctx.squadAnchor.x - 84;
    const startY = this.ctx.squadAnchor.y - 46;
    container.position.set(startX, startY);

    const petUnit: PetUnit = {
      petId,
      def,
      level: owned.level,
      rank: owned.rank,
      skillPowerMult: aura.skillPowerMult,
      x: startX,
      y: startY,
      facing: 1,
      cd: Math.max(3.5, def.activeSkill.cooldown * 0.45),
      maxCd: def.activeSkill.cooldown,
      castFlashTimer: 0,
      animTime: 0,
      container,
      sprite,
      haloSprite,
      shadowGfx,
    };
    this.petUnit = petUnit;

    tryLoadPixiTexture(def.assets.sprite).then((tex) => {
      if (!tex || this.destroyed || sprite.destroyed) return;
      sprite.texture = tex;
      const targetSize = def.tier === 'SSR' ? 86 : 78;
      const sc = targetSize / Math.max(1, Math.max(tex.width, tex.height));
      sprite.scale.set(sc);
      sprite.visible = true;
    });
  }

  private updatePetCompanion(dt: number): void {
    const pet = this.petUnit;
    if (!pet) return;
    pet.animTime += dt;
    if (pet.castFlashTimer > 0) pet.castFlashTimer = Math.max(0, pet.castFlashTimer - dt);

    const lead = this.ctx.heroes.find((h) => h.alive) ?? this.ctx.heroes[0];
    if (!lead) return;

    const targetX = lead.x - lead.facing * 72;
    const targetY = lead.y - 36;
    const follow = Math.min(1, dt * 5.2);
    pet.x += (targetX - pet.x) * follow;
    pet.y += (targetY - pet.y) * follow;
    pet.facing = lead.facing;

    const hoverY = -72 + Math.sin(pet.animTime * 3.8) * 10;
    const pulse = pet.castFlashTimer > 0 ? 1.24 : 1 + Math.sin(pet.animTime * 4.2) * 0.04;
    pet.container.position.set(pet.x, pet.y);
    pet.container.zIndex = pet.y + 8;

    pet.haloSprite.position.set(0, hoverY);
    pet.haloSprite.rotation = pet.animTime * (pet.castFlashTimer > 0 ? 4.2 : 1.15);
    pet.haloSprite.alpha = pet.castFlashTimer > 0 ? 0.88 : 0.36;
    pet.haloSprite.scale.set((pet.castFlashTimer > 0 ? 0.48 : 0.28) * pulse);

    if (pet.sprite.visible && pet.sprite.texture) {
      const targetSize = pet.def.tier === 'SSR' ? 86 : 78;
      const baseSc = targetSize / Math.max(1, Math.max(pet.sprite.texture.width, pet.sprite.texture.height));
      pet.sprite.position.set(0, hoverY);
      pet.sprite.scale.set(baseSc * pet.facing * pulse, baseSc * pulse);
      pet.sprite.rotation = Math.sin(pet.animTime * 2.6) * 0.06;
    }

    // Active Companion Pet Auto-Skill Execution!
    const aliveEnemies = this.ctx.enemies.filter((e) => e.alive);
    if (aliveEnemies.length === 0 || this.ultDirector.isRunning()) return;

    pet.cd = Math.max(0, pet.cd - dt);
    if (pet.cd > 0) return;

    pet.cd = pet.maxCd;
    pet.castFlashTimer = 0.7;
    const petColor = hexToNum(pet.def.themeColor);
    this.pool.spawnRingWave(pet.x, pet.y - 52, 95, petColor, 0.45);
    this.pool.spawnBurst(pet.x, pet.y - 68, petColor, 14, 42);
    audioManager.playSfx(pet.def.activeSkill.kind === 'HEAL_SP' ? 'heal' : 'ult_chime', 0.14);

    if (pet.def.activeSkill.kind === 'HEAL_SP') {
      // Lumina: Starlight Dew — heals lowest HP ally + restores +0.5 Squad SP
      const livingAllies = this.ctx.heroes.filter((h) => h.alive);
      const lowest = livingAllies.sort((a, b) => a.hp / a.maxHp - b.hp / b.maxHp)[0];
      if (lowest) {
        const healAmt = Math.round(lowest.maxHp * 0.12 * pet.skillPowerMult);
        this.handleHealHero(lead, lowest, healAmt, false);
        this.pool.spawnRingWave(lowest.x, lowest.y, 110, 0x38e8ff, 0.48);
        this.pool.spawnBurst(lowest.x, lowest.y - 36, 0x67e8f9, 14, 40);
      }
      this.ctx.addSp(0.5);
      this.pool.spawnFloatingText(pet.x, pet.y - 104, '🐾 STARLIGHT DEW! +0.5 SP', 0x67e8f9, true);
    } else if (pet.def.activeSkill.kind === 'MAGMA_VOLLEY') {
      // Cinderfang: Magma Breath — 3 homing volcanic fireballs + Burn + DEF Shred
      const focus = aliveEnemies.find((e) => e.def.isBoss) ?? aliveEnemies[0];
      this.pool.spawnFloatingText(pet.x, pet.y - 104, '🐾 MAGMA BREATH!', 0xfb923c, true);
      for (let i = 0; i < 3; i++) {
        const target = aliveEnemies[i % aliveEnemies.length] ?? focus;
        if (!target) continue;
        this.ctx.delayedStrikes.push({
          delay: i * 0.12,
          fn: () => {
            if (!target.alive) return;
            this.pool.spawnProjectile({
              x: pet.x + pet.facing * 18,
              y: pet.y - 68,
              tx: target.x,
              ty: target.y - 34,
              speed: 780,
              color: 0xf97316,
              radius: 13,
              fromHero: true,
              onHit: (hx, hy) => {
                if (!target.alive) return;
                this.pool.spawnBurst(hx, hy, 0xfb923c, 12, 34);
                this.pool.spawnRingWave(target.x, target.y, 82, 0xf97316, 0.34);
                target.burnStacks = Math.min(5, target.burnStacks + (i === 0 ? 2 : 1));
                target.burnTimer = 6.0;
                target.burnSourceAtk = Math.max(target.burnSourceAtk, lead.stats.atk);
                target.defShredTimer = Math.max(target.defShredTimer, 5.0);
                target.defShredValue = Math.max(target.defShredValue, 0.12);
                this.handleDamageEnemy(lead, target, {
                  multiplier: 0.47 * pet.skillPowerMult,
                  isSkill: true,
                  breakDamage: 6,
                });
              },
            });
          },
        });
      }
    } else if (pet.def.activeSkill.kind === 'ASTRAL_DECREE') {
      // Aetherion SSR: Astral Decree — golden orbital beam AoE + Heavy Break + Squad Shield + +10 Ult Gauge!
      const focus = aliveEnemies.find((e) => e.def.isBoss) ?? aliveEnemies[0];
      if (focus) {
        this.pool.spawnBeam(pet.x, pet.y - 72, focus.x, focus.y - 34, 0xfde047, 16);
        this.pool.spawnSkyPillar(focus.x, focus.y, 130, 0xf5c84c, false);
        this.pool.spawnRingWave(focus.x, focus.y, 175, 0xe879f9, 0.55);
        this.pool.spawnBurst(focus.x, focus.y - 34, 0xfde047, 22, 60);
        for (const e of aliveEnemies) {
          if (Math.hypot(e.x - focus.x, e.y - focus.y) <= 185 + e.def.radius) {
            this.handleDamageEnemy(lead, e, {
              multiplier: 2.4 * pet.skillPowerMult,
              isSkill: true,
              hitShieldHits: 3,
              breakDamage: 24,
            });
          }
        }
      }
      for (const ally of this.ctx.heroes) {
        if (!ally.alive) continue;
        const sh = Math.round(ally.maxHp * 0.1 * pet.skillPowerMult);
        this.handleGrantShield(lead, ally, sh, false);
      }
      this.ctx.addUltGauge(10);
      this.pool.spawnFloatingText(pet.x, pet.y - 104, '🐾 ASTRAL DECREE! +10 ULT', 0xfde047, true);
    }
  }

  private spawnWave(index: number): void {
    const stage = resolveAnyStageDef(this.stageId);
    const wave = stage.waves[index];
    if (!wave) return;

    this.waveIndex = index;
    useCombatStore.getState().setSnapshot({
      waveIndex: index + 1,
      totalWaves: stage.waves.length,
      waveLabel: wave.label,
    });
    this.ctx.notifyBanner(wave.label);

    let spawnIdx = 0;
    let hasBoss = false;

    for (const group of wave.spawns) {
      const def = ENEMY_MAP[group.enemyId];
      if (!def) continue;
      if (def.isBoss) hasBoss = true;

      for (let i = 0; i < group.count; i++) {
        const atlas = VfxTextureAtlas.get();
        const container = new Container();
        const tex = getProceduralEnemyTexture(this.app.renderer, def);
        const liveMesh = new LiveMeshActor(tex, 0.94);
        const defaultScale = def.isBoss ? 1.05 : def.scale * 0.86;
        liveMesh.mesh.scale.set(defaultScale);
        const visualFilter = createActorVisualFilter(this.biomeLighting);
        if (visualFilter) {
          liveMesh.mesh.filters = [visualFilter];
        }

        // True 2.5D Projected Cast Silhouette Shadow across arena floor
        const castShadowSprite = new Sprite(tex);
        castShadowSprite.anchor.set(0.5, 0.95);
        castShadowSprite.position.set(0, 4);
        castShadowSprite.tint = this.biomeLighting.shadowTint;
        castShadowSprite.alpha = this.biomeLighting.shadowAlpha * (def.isBoss ? 1.15 : 1.0);
        castShadowSprite.skew.x = this.biomeLighting.shadowSkewX;
        castShadowSprite.visible = false;

        // Grounded soft contact shadow beneath enemy & boss
        const shadowGfx = new Graphics();
        if (def.isBoss) {
          shadowGfx.ellipse(0, 4, 88, 24).fill({ color: 0x07040f, alpha: 0.48 });
        } else if (def.isMiniBoss) {
          shadowGfx.ellipse(0, 3, 50, 15).fill({ color: 0x07040f, alpha: 0.44 });
        } else {
          shadowGfx.ellipse(0, 2, 30, 9).fill({ color: 0x07040f, alpha: 0.38 });
        }

        // Feathered Magic Circle Ground Aura inside perspective-flattened floor pivot!
        const auraPivot = new Container();
        auraPivot.position.set(0, 4);
        auraPivot.scale.set(1, 0.35);
        auraPivot.visible = Boolean(def.isBoss || def.isMiniBoss);
        const auraSprite = new Sprite(atlas.magicCircle);
        auraSprite.anchor.set(0.5);
        auraSprite.tint = def.isBoss ? 0xd946ef : 0xa855f7;
        auraSprite.blendMode = 'add';
        auraSprite.alpha = def.isBoss ? 0.44 : def.isMiniBoss ? 0.28 : 0;
        auraSprite.scale.set(def.isBoss ? 0.96 : 0.56);
        auraPivot.addChild(auraSprite);

        // Rotating Back Arcane Halo for floating casters & Bosses!
        const hasBackRune =
          def.isBoss ||
          def.id === 'rift_acolyte' ||
          def.id === 'astral_weaver' ||
          def.id === 'void_wisp';
        let backRuneSprite: Sprite | null = null;
        if (hasBackRune) {
          backRuneSprite = new Sprite(atlas.magicCircle);
          backRuneSprite.anchor.set(0.5);
          backRuneSprite.position.set(0, def.isBoss ? -128 : -76);
          backRuneSprite.tint =
            def.id === 'astral_weaver' ? 0x38e8ff : def.isBoss ? 0xc084fc : 0xd946ef;
          backRuneSprite.blendMode = 'add';
          backRuneSprite.alpha = def.isBoss ? 0.28 : 0.38;
          backRuneSprite.scale.set(def.isBoss ? 0.92 : 0.42);
        }

        const hpBarGfx = new Graphics();
        const statusGfx = new Graphics();
        container.addChild(castShadowSprite);
        container.addChild(shadowGfx);
        container.addChild(auraPivot);
        if (backRuneSprite) container.addChild(backRuneSprite);
        container.addChild(liveMesh.mesh);
        container.addChild(hpBarGfx);
        container.addChild(statusGfx);
        this.actorLayer.addChild(container);

        const spawnX = def.isBoss
          ? 1620
          : Math.min(BOUNDS.maxX - 120, Math.max(BOUNDS.minX + 460, this.ctx.squadAnchor.x + 480 + (spawnIdx % 3) * 115));
        const spawnY = def.isBoss
          ? 740
          : BOUNDS.minY + 130 + ((spawnIdx * 173) % (BOUNDS.maxY - BOUNDS.minY - 260));
        const flankAngle = ((spawnIdx % 6) - 2.5) * 0.72 + (Math.random() - 0.5) * 0.25;
        spawnIdx++;

        container.position.set(spawnX, spawnY);
        // Dramatic Rift Portal / Skyfall Target Ring on Wave Entrance!
        this.pool.spawnSpriteFx({
          tex: 'magicCircle',
          x: spawnX,
          y: spawnY + 4,
          spin: def.isBoss ? 2.4 : 3.2,
          scaleX: def.isBoss ? 0.42 : 0.22,
          scaleY: def.isBoss ? 0.16 : 0.09,
          endScaleX: def.isBoss ? 1.38 : 0.62,
          endScaleY: def.isBoss ? 0.52 : 0.24,
          tint: def.isBoss ? 0xf43f5e : 0xc084fc,
          alpha: def.isBoss ? 0.88 : 0.72,
          life: def.isBoss ? 0.68 : 0.48,
          darkHalo: true,
          groundLayer: true,
        });
        this.pool.spawnRingWave(spawnX, spawnY, def.isBoss ? 185 : 78, def.isBoss ? 0xf43f5e : 0xd946ef, 0.46);

        const spawnIntroKind: 'BOSS_DROP' | 'RIFT_EMERGE' =
          def.isBoss || def.isMiniBoss ? 'BOSS_DROP' : 'RIFT_EMERGE';
        const spawnIntroDuration = def.isBoss ? 0.54 : def.isMiniBoss ? 0.42 : 0.36;

        const stageScale = stage.enemyScale ?? 1.0;
        const modId = stage.spireModifier?.id;
        const worldDiffCfg = stage.difficulty ? CAMPAIGN_DIFFICULTY_MAP[stage.difficulty] : null;
        const hpMod = modId === 'STARLIGHT_SURGE' ? 1.12 : 1.0;
        const atkMod = modId === 'SOLAR_OVERCHARGE' ? 1.15 : 1.0;
        const brkMod = (modId === 'IRON_VANGUARD' ? 1.25 : 1.0) * (worldDiffCfg?.bossBreakMult ?? 1.0);
        const scaledHp = Math.max(240, Math.round(def.hp * stageScale * hpMod));
        const scaledAtk = Math.max(32, Math.round(def.atk * 1.92 * Math.pow(stageScale, 1.14) * atkMod));
        const scaledDef = Math.max(35, Math.round(def.def * Math.pow(stageScale, 0.68)));

        const enemyUnit: EnemyUnit = {
          uid: `en_${index}_${spawnIdx}_${Math.random().toString(36).slice(2, 6)}`,
          def,
          x: spawnX,
          y: spawnY,
          vx: 0,
          vy: 0,
          knockVx: 0,
          knockVy: 0,
          facing: -1,
          visualFacing: -1,
          stridePhase: Math.random() * Math.PI * 2,
          stepDustGate: 0,
          springLean: 0,
          springLeanVel: 0,
          squashX: 1,
          squashY: 1,
          flankAngle,
          dashState: null,
          hp: scaledHp,
          maxHp: scaledHp,
          atk: scaledAtk,
          defStat: scaledDef,
          atkSpeedMult: worldDiffCfg?.enemyAtkSpeedMult ?? 1.0,
          alive: true,
          basicTimer: 0.7 + Math.random() * 0.6,
          stunTimer: 0,
          freezeTimer: 0,
          slowTimer: 0,
          provokeTimer: 0,
          provokeTargetHeroId: null,
          starfallMarkTimer: 0,
          lunarTraceTimer: 0,
          defShredTimer: 0,
          defShredValue: 0,
          atkDownTimer: 0,
          atkDownValue: 0,
          burnStacks: 0,
          burnTimer: 0,
          burnTickTimer: 0.8,
          burnSourceAtk: 150,
          phase: 1,
          enraged: false,
          isCasting: false,
          castName: '',
          castDuration: 1,
          castElapsed: 0,
          castCancelable: false,
          castAction: null,
          castTargetX: 0,
          castTargetY: 0,
          castAngle: 0,
          aiCooldown: def.isBoss ? 3.2 : 4.0,
          phase2Triggered: false,
          isBroken: false,
          brokenTimer: 0,
          brokenMaxTimer: 4.0,
          breakGauge: def.isBoss
            ? Math.round((155 + (stage.chapter ?? 1) * 12) * brkMod)
            : def.isMiniBoss
              ? Math.round(95 * brkMod)
              : 0,
          maxBreakGauge: def.isBoss
            ? Math.round((155 + (stage.chapter ?? 1) * 12) * brkMod)
            : def.isMiniBoss
              ? Math.round(95 * brkMod)
              : 0,
          hitShield: 0,
          maxHitShield: 0,
          hitFlashTimer: 0,
          dissolveTimer: 0,
          dissolveDuration: 0.52,
          animTime: Math.random() * 4,
          attackSwingTimer: 0,
          attackSwingDuration: 0.28,
          baseScaleY: defaultScale,
          spawnIntroKind,
          spawnIntroTimer: spawnIntroDuration,
          spawnIntroDuration,
          spawnLanded: false,
          ambientVfxTimer: Math.random() * 0.35,
          container,
          liveMesh,
          castShadowSprite,
          shadowGfx,
          auraPivot,
          auraSprite,
          backRuneSprite,
          visualFilter,
          hpBarGfx,
          statusGfx,
        };
        this.ctx.enemies.push(enemyUnit);

        // Auto-load real transparent WebP sprite onto LiveMeshActor & Cast Shadow for ALL enemies & Bosses!
        const enemySpriteUrl = def.isBoss && stage.bossAssetOverride ? stage.bossAssetOverride : def.assetKey;
        if (enemySpriteUrl.startsWith('/assets/')) {
          tryLoadPixiTexture(enemySpriteUrl).then((loaded) => {
            if (!loaded || this.destroyed || liveMesh.mesh.destroyed) return;
            liveMesh.setTexture(loaded, 0.95);
            const targetSize = def.isBoss
              ? 285
              : def.isMiniBoss
                ? 186
                : def.attackRange > 100
                  ? 136
                  : 126;
            const sc = targetSize / Math.max(1, loaded.height);
            liveMesh.mesh.scale.set(sc);
            castShadowSprite.texture = loaded;
            castShadowSprite.scale.set(-sc, sc * this.biomeLighting.shadowScaleY);
            castShadowSprite.visible = true;
            enemyUnit.idleTexture = loaded;
            enemyUnit.activePose = 'IDLE';
            enemyUnit.baseScaleY = sc;
          });
        }
        const enemyAtkCfg =
          ENEMY_ATTACK_SPRITES[enemySpriteUrl] ?? ENEMY_ATTACK_SPRITES[def.id];
        if (enemyAtkCfg) {
          tryLoadPixiTexture(enemyAtkCfg.url).then((atkLoaded) => {
            if (!atkLoaded || this.destroyed || liveMesh.mesh.destroyed) return;
            enemyUnit.attackTexture = atkLoaded;
            enemyUnit.attackScaleBoost = enemyAtkCfg.scaleBoost ?? 1.0;
          });
        }
      }
    }

    if (hasBoss) {
      audioManager.playBgm('boss');
      const bossUnit = this.ctx.enemies.find((e) => e.def.isBoss && e.alive);
      if (bossUnit) {
        const bName = stage.bossNameOverride ?? bossUnit.def.name;
        const bTitle = stage.bossTitleOverride ?? bossUnit.def.title;
        const bAsset = stage.bossAssetOverride ?? bossUnit.def.assetKey;

        // Trigger Pre-Boss Anime VN Banter for Chapter Boss Stages & Rift Abyss Boss Rush!
        const banter = buildBossBanter({
          stageId: stage.id,
          chapter: stage.chapter,
          bossName: bName,
          bossTitle: bTitle,
          bossAsset: bAsset,
          squadIds: this.ctx.heroes.map((h) => h.heroId),
          isDungeon: stage.isDungeon,
        });

        if (banter) {
          this.pendingBossWarning = { name: bName, title: bTitle };
          useCombatStore.getState().setActiveBanter(banter);
        } else {
          this.fireBossWarningBanner(bName, bTitle);
        }
      }
    } else {
      useCombatStore.getState().setWaveBanner(`WAVE ${index + 1} / ${stage.waves.length}`);
      if (this.waveBannerClearHandle) window.clearTimeout(this.waveBannerClearHandle);
      this.waveBannerClearHandle = window.setTimeout(() => {
        useCombatStore.getState().setWaveBanner(null);
      }, 1450);
    }
  }

  private handleDamageEnemy(
    attacker: HeroUnit,
    enemy: EnemyUnit,
    opts: Parameters<CombatContext['damageEnemy']>[2],
  ): { damage: number; isCrit: boolean } {
    if (!enemy.alive) return { damage: 0, isCrit: false };

    // Calculate effective ATK (or DEF-scaling for Draven/Titus)
    let atkBuffMult = 1 + (attacker.atkBuffTimer > 0 ? attacker.atkBuffValue : 0);
    const baseOffense = opts.scalesWithDef
      ? attacker.stats.def * opts.multiplier + attacker.stats.atk * (opts.extraAtkMultiplier ?? 0)
      : attacker.stats.atk * atkBuffMult * opts.multiplier;

    // Crit rate & Crit DMG with buffs + zones (Orion Beacon / Draven Caldera / Blade of First Eclipse / Iron Vanguard Spire)
    const activeStage = resolveAnyStageDef(this.stageId);
    let critRate = attacker.stats.critRate + (opts.bonusCritRate ?? 0);
    let critDmg =
      attacker.stats.critDmg +
      attacker.eclipseCritStacks * 0.08 +
      (activeStage.spireModifier?.id === 'IRON_VANGUARD' ? 0.25 : 0);
    if (attacker.critBuffTimer > 0) critRate += attacker.critBuffValue;

    for (const z of this.ctx.zones) {
      if (z.kind === 'ASTRAL_BEACON' && Math.hypot(attacker.x - z.x, attacker.y - z.y) <= z.radius) {
        critRate += 0.18;
      }
      if (z.kind === 'LAVA_CALDERA' && enemy.burnStacks > 0) {
        critDmg += 0.2;
      }
    }

    // Situational damage bonuses + Constellation C6 Final DMG + Raid Faction Weakness + Labyrinth Execute
    let dmgBonus = (opts.bonusDmgMult ?? 0) + (attacker.stats.finalDmgBonus ?? 0);
    if (opts.isSkill) dmgBonus += attacker.stats.skillDmgBonus;
    if (opts.isUlt) dmgBonus += attacker.stats.ultDmgBonus;
    if (enemy.lunarTraceTimer > 0) dmgBonus += 0.12;
    const isRaidWeakness = Boolean(
      activeStage.isWorldBoss && activeStage.raidWeakFactions?.includes(attacker.def.faction),
    );
    if (isRaidWeakness) {
      dmgBonus += 0.35;
    }
    if (
      this.labyrinthMods &&
      this.labyrinthMods.executeBelow50Pct > 0 &&
      enemy.hp < enemy.maxHp * 0.5
    ) {
      dmgBonus += this.labyrinthMods.executeBelow50Pct;
    }

    const isDebuffed =
      enemy.burnStacks > 0 ||
      enemy.stunTimer > 0 ||
      enemy.isBroken ||
      enemy.defShredTimer > 0 ||
      enemy.freezeTimer > 0;
    if (isDebuffed) dmgBonus += attacker.stats.dmgBonusVsDebuffed;
    if (attacker.heroId === 'raze' && (enemy.burnStacks > 0 || enemy.stunTimer > 0 || enemy.isBroken)) {
      dmgBonus += 0.25;
    }

    const roll = calculateCombatDamage({
      effectiveAtk: baseOffense,
      multiplier: 1.0,
      targetDef: enemy.defStat,
      defShred: enemy.defShredValue,
      defIgnore: attacker.stats.defIgnore,
      critRate: Math.min(0.98, critRate),
      critDmg,
      dmgBonus,
      isBroken: enemy.isBroken,
      isTrueDamage: opts.isTrueDamage,
    });

    // Boss Phase 2 Hit-Count Shield reduces damage by 70% until shattered
    let finalDmg = roll.damage;
    if (enemy.hitShield > 0) {
      enemy.hitShield = Math.max(0, enemy.hitShield - (opts.hitShieldHits ?? 1));
      finalDmg = Math.max(1, Math.round(finalDmg * 0.32));
      if (enemy.hitShield === 0) {
        this.triggerEnemyBreak(enemy, 4.0, 'SHIELD SHATTERED! +50% DMG');
        this.ctx.notifyBanner('HIT-COUNT SHIELD SHATTERED! Boss is BROKEN (+50% DMG)!');
      }
    }

    // Stagger / Break Gauge depletion for Bosses & Mini-Bosses (scaled by Ashen Faction Break DMG + Raid Weakness!)
    if (enemy.maxBreakGauge > 0 && !enemy.isBroken && enemy.hp > 0) {
      const baseBrk = opts.breakDamage ?? (opts.isUlt ? 32 : opts.isSkill ? 14 : 2.6);
      const brkDmg = baseBrk * (1 + (attacker.stats.breakDmgBonus ?? 0) + (isRaidWeakness ? 0.25 : 0));
      const appliedBrk = Math.min(enemy.breakGauge, brkDmg);
      attacker.staggerDealt += appliedBrk;
      enemy.breakGauge = Math.max(0, enemy.breakGauge - brkDmg);
      if (enemy.breakGauge <= 0) {
        this.triggerEnemyBreak(enemy, 4.0, '★ BROKEN! +50% DMG ★');
        if (enemy.def.isBoss) {
          this.ctx.notifyBanner(`STAGGER BREAK! ${enemy.def.name} takes +50% DMG for 4.0s!`);
        }
      }
    }

    enemy.hp = Math.max(0, enemy.hp - finalDmg);
    enemy.hitFlashTimer = 0.14;
    attacker.totalDamage += finalDmg;
    attacker.totalHits += 1;
    if (roll.isCrit) attacker.critHits += 1;

    // Live Labyrinth Blessing Effects: Lifesteal, Skill Burn & Crit Chain Lightning!
    if (this.labyrinthMods) {
      if (this.labyrinthMods.lifestealPct > 0 && attacker.alive) {
        const leach = Math.max(1, Math.round(finalDmg * this.labyrinthMods.lifestealPct));
        this.handleHealHero(attacker, attacker, leach, false);
      }
      if (opts.isSkill && this.labyrinthMods.skillBurnStacks > 0 && enemy.alive) {
        enemy.burnStacks = Math.min(5, enemy.burnStacks + this.labyrinthMods.skillBurnStacks);
        enemy.burnTimer = 6.0;
        enemy.burnSourceAtk = Math.max(enemy.burnSourceAtk, attacker.stats.atk);
      }
      if (
        roll.isCrit &&
        !this.chainLightningGuard &&
        this.labyrinthMods.critChainLightningPct > 0
      ) {
        this.chainLightningGuard = true;
        this.pool.spawnRingWave(enemy.x, enemy.y, 175, 0x38e8ff, 0.28);
        const nearby = this.ctx.enemies
          .filter((e) => e.alive && Math.hypot(e.x - enemy.x, e.y - enemy.y) <= 230)
          .slice(0, 3);
        for (const t of nearby) {
          this.handleDamageEnemy(attacker, t, {
            multiplier: this.labyrinthMods.critChainLightningPct,
            isSkill: false,
            isTrueDamage: false,
            canTriggerMark: false,
          });
        }
        this.chainLightningGuard = false;
      }
    }

    // Directional Spring Knockback + Impact Squash-and-Stretch (weight-calibrated for Bosses vs Minions!)
    const kbDx = enemy.x - attacker.x;
    const kbDy = enemy.y - attacker.y;
    const kbDist = Math.max(1, Math.hypot(kbDx, kbDy));
    const heavyResist = enemy.def.isBoss
      ? 0.16
      : enemy.def.isMiniBoss || enemy.def.id === 'armored_golem'
        ? 0.42
        : 1.0;
    const kbForce = (opts.isUlt ? 245 : opts.isSkill ? 170 : roll.isCrit ? 125 : 68) * heavyResist;
    enemy.knockVx += (kbDx / kbDist) * kbForce;
    enemy.knockVy += (kbDy / kbDist) * kbForce * 0.72;
    enemy.springLeanVel -= (roll.isCrit || opts.isSkill || opts.isUlt ? 9.5 : 5.2) * (enemy.def.isBoss ? 0.55 : 1.0);
    enemy.squashX = Math.max(enemy.squashX, roll.isCrit || opts.isUlt ? 1.19 : 1.11);
    enemy.squashY = Math.min(enemy.squashY, roll.isCrit || opts.isUlt ? 0.83 : 0.9);

    // Hit Combo Counter + Tactile Micro-Hitstop on Critical Skills/Ultimates!
    this.comboCount += 1;
    if (this.comboCount > this.maxCombo) this.maxCombo = this.comboCount;
    this.comboTimer = 2.6;
    if (roll.isCrit && (opts.isSkill || opts.isUlt)) {
      this.hitstopTimer = Math.max(this.hitstopTimer, 0.028);
    }

    // Crit triggers: +0.55 Ult Gauge, Ashen Fury 4pc AtkSpd, Blade of First Eclipse stack
    if (roll.isCrit) {
      this.ctx.addUltGauge(0.55, 1 + attacker.stats.ultGaugeBonus);
      if (attacker.stats.activeSets.some((s) => s.setId === 'ASHEN_FURY' && s.count >= 4)) {
        attacker.atkSpdBuffTimer = Math.max(attacker.atkSpdBuffTimer, 4.0);
        attacker.atkSpdBuffValue = Math.max(attacker.atkSpdBuffValue, 0.15);
      }
      if (attacker.relicId === 'relic_first_eclipse') {
        attacker.eclipseCritStacks = Math.min(5, attacker.eclipseCritStacks + 1);
        attacker.eclipseCritTimer = 6.0;
      }
      audioManager.playSfx('crit', 0.12);
    } else {
      audioManager.playSfx('hit', 0.14);
    }

    this.pool.spawnFloatingText(
      enemy.x,
      enemy.y - (enemy.def.isBoss ? 70 : 28),
      roll.isCrit ? `${finalDmg}!` : `${finalDmg}`,
      opts.isTrueDamage ? 0xf5c84c : roll.isCrit ? 0xfde047 : 0xf8fafc,
      roll.isCrit,
    );

    // Rich non-blocky anime impact flash matched to attacker's weapon class!
    this.pool.spawnHitImpact(
      enemy.x + (Math.random() - 0.5) * 20,
      enemy.y - (enemy.def.isBoss ? 52 : 28) + (Math.random() - 0.5) * 16,
      getHeroHitStyle(attacker),
      hexToNum(attacker.def.themeColor),
      roll.isCrit || Boolean(opts.isUlt),
    );

    // Vaelen Starfall Mark detonation when hit by Vaelen's skill!
    if (opts.canTriggerMark && attacker.heroId === 'vaelen' && enemy.starfallMarkTimer > 0 && enemy.alive) {
      enemy.starfallMarkTimer = 0;
      attacker.cd1 = Math.max(0, attacker.cd1 - 1.5);
      attacker.cd2 = Math.max(0, attacker.cd2 - 1.5);
      if (attacker.relicId === 'relic_first_eclipse') {
        attacker.eclipseCritStacks = Math.min(5, attacker.eclipseCritStacks + 1);
        attacker.eclipseCritTimer = 6.0;
      }
      this.pool.spawnRingWave(enemy.x, enemy.y, 92, 0xf5c84c, 0.32);
      this.handleDamageEnemy(attacker, enemy, {
        multiplier: 0.85,
        isTrueDamage: true,
        isSkill: false,
        canTriggerMark: false,
      });
    }

    if (enemy.hp <= 0 && enemy.alive) {
      if (activeStage.isWorldBoss && enemy.def.isBoss) {
        // World Boss Raid Infinite-Bar Overdrive: Shatter current HP bar, escalate to next bar & reward burst energy!
        this.raidBarsCleared += 1;
        enemy.maxHp = Math.round(enemy.maxHp * 1.15);
        enemy.hp = enemy.maxHp;
        enemy.breakGauge = enemy.maxBreakGauge;
        enemy.isBroken = false;
        enemy.brokenTimer = 0;
        this.ctx.addUltGauge(20, 1);
        this.ctx.addSp(2.0);
        this.pool.spawnRingWave(enemy.x, enemy.y, 280, 0xfde047, 0.52);
        this.pool.spawnFloatingText(enemy.x, enemy.y - 95, `BAR ×${this.raidBarsCleared} SHATTERED!`, 0xfde047, true);
        this.ctx.notifyBanner(`★ RAID BAR ×${this.raidBarsCleared} CLEARED! +20 Ult Gauge & +2.0 SP! ★`);
        audioManager.playSfx('ssr_reveal', 0.24);
      } else if (activeStage.isSandbox) {
        // Training Sandbox Immortal Calibration Target: instant HP reset (+ Shield/Break reset on Break Dummy!)
        enemy.hp = enemy.maxHp;
        if (activeStage.sandboxTargetMode === 'BREAK_DUMMY' && enemy.def.isBoss) {
          enemy.breakGauge = enemy.maxBreakGauge;
          enemy.isBroken = false;
          enemy.hitShield = 12;
          enemy.maxHitShield = 12;
        }
        this.pool.spawnRingWave(enemy.x, enemy.y, 160, 0x38e8ff, 0.35);
        this.pool.spawnFloatingText(enemy.x, enemy.y - 78, 'CORE RECALIBRATED', 0x38e8ff, true);
      } else {
        this.ctx.addUltGauge(1.5, 1 + attacker.stats.ultGaugeBonus);
        this.enemyAI.handleEnemyDeath(this.ctx, enemy);
      }
    }

    return { damage: finalDmg, isCrit: roll.isCrit };
  }

  private handleDamageHero(
    attacker: EnemyUnit | null,
    hero: HeroUnit,
    rawDamage: number,
    isRanged = false,
  ): void {
    if (!hero.alive) return;
    const activeStage = resolveAnyStageDef(this.stageId);
    if (activeStage.isSandbox && activeStage.sandboxPassiveDummy) {
      return;
    }
    if (hero.invincibleTimer > 0) {
      this.pool.spawnFloatingText(hero.x, hero.y - 36, 'IMMUNE', 0x34d399);
      return;
    }

    let dmg = rawDamage * (1000 / (1000 + hero.stats.def));
    if (hero.dmgReduceTimer > 0) dmg *= 1 - hero.dmgReduceValue;
    if (hero.heroId === 'titus' && isRanged) dmg *= 0.75; // Refracting Guard
    dmg = Math.max(1, Math.round(dmg));
    hero.totalDamageTaken += dmg;

    // Garrick Ult Reflect 20%
    if (hero.reflectTimer > 0 && attacker && attacker.alive) {
      const refDmg = Math.max(1, Math.round(dmg * 0.2));
      attacker.hp = Math.max(1, attacker.hp - refDmg);
      this.pool.spawnFloatingText(attacker.x, attacker.y - 30, `${refDmg}`, 0xfacc15);
    }

    // Aegis Bastion 4pc: taking hit reduces skill CDs by 0.5s (3s CD)
    if (
      hero.aegisSetCd <= 0 &&
      hero.stats.activeSets.some((s) => s.setId === 'AEGIS_BASTION' && s.count >= 4)
    ) {
      hero.aegisSetCd = 3.0;
      hero.cd1 = Math.max(0, hero.cd1 - 0.5);
      hero.cd2 = Math.max(0, hero.cd2 - 0.5);
    }

    // Draven Passive: Molten Core (10 Heat stacks -> erupt!)
    if (hero.heroId === 'draven') {
      hero.heatStacks += 1;
      if (hero.heatStacks >= 10) {
        hero.heatStacks = 0;
        this.pool.spawnRingWave(hero.x, hero.y, 185, 0xf97316, 0.45);
        this.pool.spawnFloatingText(hero.x, hero.y - 54, 'MOLTEN CORE!', 0xf97316, true);
        this.handleHealHero(hero, hero, Math.round(hero.maxHp * 0.1), false);
        for (const ally of this.ctx.heroes) {
          if (ally.alive) {
            ally.dmgReduceTimer = Math.max(ally.dmgReduceTimer, 5.0);
            ally.dmgReduceValue = Math.max(ally.dmgReduceValue, 0.15);
          }
        }
        for (const e of this.ctx.enemies) {
          if (e.alive && Math.hypot(e.x - hero.x, e.y - hero.y) <= 195) {
            e.burnStacks = Math.min(5, e.burnStacks + 2);
            e.burnTimer = 6.0;
            e.burnSourceAtk = Math.max(e.burnSourceAtk, hero.stats.atk);
          }
        }
      }
    }

    // Absorb with Shield first
    let shieldBroke = false;
    if (hero.shield > 0) {
      if (hero.shieldCounterBurn && attacker && attacker.alive) {
        attacker.burnStacks = Math.min(5, attacker.burnStacks + 1);
        attacker.burnTimer = 6.0;
        attacker.defShredTimer = 5.0;
        attacker.defShredValue = Math.max(attacker.defShredValue, 0.15);
      }
      const absorbed = Math.min(hero.shield, dmg);
      hero.shield -= absorbed;
      dmg -= absorbed;
      if (hero.heroId === 'garrick') {
        hero.shieldStoredKinetic += absorbed * 0.3;
      }
      if (hero.shield <= 0) {
        shieldBroke = true;
        hero.shieldCounterBurn = false;
        // Garrick Passive: Kinetic Aegis burst when shield breaks
        if (hero.heroId === 'garrick') {
          const bonus = hero.shieldStoredKinetic;
          hero.shieldStoredKinetic = 0;
          this.pool.spawnRingWave(hero.x, hero.y, 160, 0xfacc15, 0.4);
          for (const e of this.ctx.enemies) {
            if (e.alive && Math.hypot(e.x - hero.x, e.y - hero.y) <= 170) {
              e.atkDownTimer = 4.0;
              e.atkDownValue = 0.15;
              this.handleDamageEnemy(hero, e, {
                multiplier: 1.2 + bonus / Math.max(100, hero.stats.def),
                scalesWithDef: true,
              });
            }
          }
        }
      }
    }

    if (dmg > 0) {
      hero.hp = Math.max(hero.undyingTimer > 0 ? 1 : 0, hero.hp - dmg);
      hero.hitFlashTimer = 0.15;
      hero.squashX = Math.max(hero.squashX, 1.11);
      hero.squashY = Math.min(hero.squashY, 0.9);
      hero.springLeanVel -= 5.4;
      if (attacker) {
        const kdx = hero.x - attacker.x;
        const kdy = hero.y - attacker.y;
        const kd = Math.max(1, Math.hypot(kdx, kdy));
        const tankPoise = hero.def.role === 'TANK' ? 0.32 : 0.75;
        hero.knockVx += (kdx / kd) * 82 * tankPoise;
        hero.knockVy += (kdy / kd) * 58 * tankPoise;
      }
      this.pool.spawnFloatingText(hero.x, hero.y - 32, `-${dmg}`, 0xf87171);
    }

    // Relic: Heart of the Obsidian Forge (<50% HP or Shield break magma wave)
    if (
      hero.relicId === 'relic_obsidian_forge' &&
      hero.obsidianForgeCd <= 0 &&
      (shieldBroke || hero.hp / hero.maxHp < 0.5)
    ) {
      hero.obsidianForgeCd = 12;
      hero.dmgReduceTimer = Math.max(hero.dmgReduceTimer, 6.0);
      hero.dmgReduceValue = Math.max(hero.dmgReduceValue, 0.15);
      this.pool.spawnRingWave(hero.x, hero.y, 175, 0xf97316, 0.45);
      for (const e of this.ctx.enemies) {
        if (e.alive && Math.hypot(e.x - hero.x, e.y - hero.y) <= 180) {
          this.handleDamageEnemy(hero, e, { multiplier: 1.5, scalesWithDef: true });
        }
      }
    }

    if (hero.hp <= 0) {
      hero.alive = false;
      hero.container.alpha = 0.28;
      this.pool.spawnBurst(hero.x, hero.y - 20, 0xef4444, 14);
    }
  }

  private handleHealHero(
    healer: HeroUnit,
    target: HeroUnit,
    amount: number,
    isActiveSkill = false,
  ): void {
    if (!target.alive || amount <= 0) return;
    const missing = target.maxHp - target.hp;
    const healed = Math.min(missing, amount);
    const overheal = Math.max(0, amount - missing);
    target.hp += healed;
    healer.totalHealing += healed;

    if (healed > 0) {
      this.pool.spawnFloatingText(target.x, target.y - 36, `+${healed}`, 0x34d399);
    }

    // Relic: Tear of the World Tree -> Overheal converts to Shield (up to 10% target Max HP)
    if (healer.relicId === 'relic_world_tree_tear' && overheal > 0) {
      const cap = Math.round(target.maxHp * 0.1);
      target.shield = Math.min(target.shield + overheal, Math.max(target.shield, cap));
    }

    // Lyra Passive: Dewdrop Rhythm (+0.5 SP on active heal, 4s CD)
    if (isActiveSkill && healer.heroId === 'lyra' && healer.lyraPassiveCd <= 0) {
      healer.lyraPassiveCd = 4.0;
      this.ctx.addSp(0.5);
      this.pool.spawnFloatingText(healer.x, healer.y - 54, '+0.5 SP', 0x38e8ff);
    }

    // Verdant Grace 4pc: Healing grants +10% DMG Reduction for 4s
    if (
      healer.verdantSetCd <= 0 &&
      healer.stats.activeSets.some((s) => s.setId === 'VERDANT_GRACE' && s.count >= 4)
    ) {
      healer.verdantSetCd = 8.0;
      target.dmgReduceTimer = Math.max(target.dmgReduceTimer, 4.0);
      target.dmgReduceValue = Math.max(target.dmgReduceValue, 0.1);
    }
  }

  private handleGrantShield(
    caster: HeroUnit,
    target: HeroUnit,
    amount: number,
    counterBurn = false,
  ): void {
    if (!target.alive) return;
    const prev = target.shield;
    target.shield = Math.max(target.shield, amount);
    caster.totalShieldGranted += Math.max(0, target.shield - prev);
    if (counterBurn) target.shieldCounterBurn = true;
    this.pool.spawnRingWave(target.x, target.y, 58, 0x93c5fd, 0.3);
  }

  private updateZones(dt: number): void {
    for (let i = this.ctx.zones.length - 1; i >= 0; i--) {
      const z = this.ctx.zones[i];
      z.remaining -= dt;
      z.tickTimer -= dt;

      if (z.remaining <= 0) {
        z.gfx.destroy();
        this.ctx.zones.splice(i, 1);
        continue;
      }

      // Render animated ground decal
      const pulse = 0.85 + Math.sin(this.elapsedSec * 6) * 0.15;
      z.gfx.clear();
      if (z.kind === 'CELESTIAL_DOMAIN') {
        // UR EXCLUSIVE CELESTIAL DOMAIN: Colossal prismatic starlight constellation seal across the arena floor!
        z.gfx
          .ellipse(z.x, z.y, z.radius, z.radius * 0.62)
          .fill({ color: 0x3b0764, alpha: 0.22 * pulse })
          .stroke({ color: 0xfde047, width: 3.5, alpha: 0.85 });
        z.gfx
          .ellipse(z.x, z.y, z.radius * 0.78, z.radius * 0.48)
          .stroke({ color: 0x38e8ff, width: 2, alpha: 0.72 });
        z.gfx
          .ellipse(z.x, z.y, z.radius * 0.46, z.radius * 0.28)
          .stroke({ color: 0xe879f9, width: 2.2, alpha: 0.78 });
        // Rotating 6-point sovereign constellation geometry on the floor
        const rot = this.elapsedSec * 0.45;
        for (let k = 0; k < 6; k++) {
          const a1 = rot + (k * Math.PI) / 3;
          const a2 = rot + ((k + 2) * Math.PI) / 3;
          z.gfx
            .moveTo(z.x + Math.cos(a1) * z.radius * 0.78, z.y + Math.sin(a1) * z.radius * 0.48)
            .lineTo(z.x + Math.cos(a2) * z.radius * 0.78, z.y + Math.sin(a2) * z.radius * 0.48)
            .stroke({ color: k % 2 === 0 ? 0xfde047 : 0x38e8ff, width: 1.5, alpha: 0.55 });
        }
      } else {
        z.gfx
          .ellipse(z.x, z.y, z.radius, z.radius * 0.66)
          .fill({ color: z.color, alpha: 0.16 * pulse })
          .stroke({ color: z.color, width: 3, alpha: 0.72 });
      }
      z.gfx
        .ellipse(z.x, z.y, z.radius * 0.55, z.radius * 0.36)
        .stroke({ color: 0xffffff, width: 1.5, alpha: 0.35 });

      if (z.tickTimer <= 0) {
        z.tickTimer = 1.0;
        const owner = this.ctx.heroes.find((h) => h.heroId === z.ownerHeroId);
        if (!owner) continue;

        if (z.kind === 'STARLIGHT_RIFT') {
          for (const e of this.ctx.enemies) {
            if (e.alive && Math.hypot(e.x - z.x, e.y - z.y) <= z.radius + e.def.radius) {
              e.slowTimer = 1.4;
              this.handleDamageEnemy(owner, e, { multiplier: 0.45, isSkill: true });
            }
          }
        } else if (z.kind === 'LAVA_CALDERA') {
          for (const e of this.ctx.enemies) {
            if (e.alive && Math.hypot(e.x - z.x, e.y - z.y) <= z.radius + e.def.radius) {
              e.provokeTimer = 1.5;
              e.provokeTargetHeroId = owner.heroId;
              e.burnStacks = Math.min(5, e.burnStacks + 1);
              e.burnTimer = 6.0;
              e.burnSourceAtk = Math.max(e.burnSourceAtk, owner.stats.atk);
            }
          }
        } else if (z.kind === 'SANCTUARY_BLOOM') {
          for (const h of this.ctx.heroes) {
            if (h.alive && Math.hypot(h.x - z.x, h.y - z.y) <= z.radius + 40) {
              const amt = Math.round(owner.stats.atk * 0.55 * (1 + owner.stats.healBonus));
              this.handleHealHero(owner, h, amt, false);
              h.atkSpdBuffTimer = Math.max(h.atkSpdBuffTimer, 1.5);
              h.atkSpdBuffValue = Math.max(h.atkSpdBuffValue, 0.2);
            }
          }
        } else if (z.kind === 'ASTRAL_BEACON') {
          for (const e of this.ctx.enemies) {
            if (e.alive && Math.hypot(e.x - z.x, e.y - z.y) <= z.radius + e.def.radius) {
              this.handleDamageEnemy(owner, e, { multiplier: 0.4, isSkill: true });
            }
          }
        } else if (z.kind === 'CELESTIAL_DOMAIN') {
          // Every 1.2s (0.9s when Transcended!): Astraea rains prismatic orbital star-lances; Velaris unleashes True DMG Meridian Blade Echoes!
          z.tickTimer = owner.transcended ? 0.9 : 1.2;
          const isVelarisRift = owner.heroId === 'velaris';
          const aliveFoes = this.ctx.enemies.filter((e) => e.alive);
          const targets = isVelarisRift
            ? [...aliveFoes].sort((a, b) => (b.def.isBoss ? 1 : 0) - (a.def.isBoss ? 1 : 0)).slice(0, owner.transcended ? 3 : 2)
            : aliveFoes.slice(0, owner.transcended ? 4 : 3);
          const cols = isVelarisRift
            ? owner.transcended
              ? [0xfde047, 0xa855f7, 0x38e8ff]
              : [0x818cf8, 0x38e8ff, 0xf43f5e]
            : [0xfde047, 0x38e8ff, 0xe879f9];
          targets.forEach((e, idx) => {
            const col = cols[idx % cols.length];
            if (isVelarisRift) {
              this.pool.spawnBeam(e.x - 56, e.y - 68, e.x + 56, e.y + 12, col, owner.transcended ? 11 : 9);
              this.pool.spawnRingWave(e.x, e.y, owner.transcended ? 84 : 68, col, 0.34);
            } else {
              this.pool.spawnSkyPillar(e.x, e.y, owner.transcended ? 78 : 68, col, false);
            }
            this.pool.spawnBurst(e.x, e.y - 26, col, 10, 36);
            this.handleDamageEnemy(owner, e, {
              multiplier: isVelarisRift
                ? owner.transcended
                  ? 1.05
                  : 0.85
                : owner.transcended
                  ? 0.92
                  : 0.75,
              isSkill: true,
              isTrueDamage: isVelarisRift,
              hitShieldHits: isVelarisRift ? 2 : 1,
              breakDamage: isVelarisRift
                ? owner.transcended
                  ? 14
                  : 10
                : owner.transcended
                  ? 8
                  : 6,
            });
          });
        }
      }
    }
  }

  private fireBossWarningBanner(name: string, title: string): void {
    this.ctx.triggerShake(7);
    useCombatStore.getState().setBossWarning({
      id: Date.now(),
      name,
      title,
    });
    if (this.bossWarnClearHandle) window.clearTimeout(this.bossWarnClearHandle);
    this.bossWarnClearHandle = window.setTimeout(() => {
      useCombatStore.getState().setBossWarning(null);
    }, 2150);
  }

  public dismissBossBanter(): void {
    useCombatStore.getState().setActiveBanter(null);
    if (this.pendingBossWarning) {
      const { name, title } = this.pendingBossWarning;
      this.pendingBossWarning = null;
      this.fireBossWarningBanner(name, title);
    }
  }

  private tick(realDt: number): void {
    const store = useCombatStore.getState();
    if (store.paused || store.activeBanter || this.battleEnded) return;

    // 1. Update Ultimate Choreography, Perfect Dodge Bullet-Time & Micro-Hitstop on REAL time
    let speedMult = 1.0;
    if (this.evadeCooldown > 0) {
      this.evadeCooldown = Math.max(0, this.evadeCooldown - realDt);
    }
    if (this.breakZoomTimer > 0) {
      this.breakZoomTimer = Math.max(0, this.breakZoomTimer - realDt);
      if (!this.ultDirector.isRunning()) {
        this.ctx.cameraZoomTarget = this.breakZoomTimer > 0 ? 1.08 : 1.0;
      }
    }
    if (this.ultDirector.isRunning()) {
      this.ultDirector.update(this.ctx, realDt);
    } else if (this.perfectDodgeSlowTimer > 0) {
      // Starlight Reflex Bullet-Time Slow-Mo (0.22×)
      this.perfectDodgeSlowTimer = Math.max(0, this.perfectDodgeSlowTimer - realDt);
      this.ctx.timeScale = 0.22;
    } else if (this.victoryLingerTimer > 0) {
      // Dramatic Anime Finisher Slow-Mo so Ultimate Skyfall Pillars & final explosion shine before Victory!
      this.ctx.timeScale = 0.36;
    } else if (this.hitstopTimer > 0) {
      this.hitstopTimer = Math.max(0, this.hitstopTimer - realDt);
      this.ctx.timeScale = 0.08;
    } else if (this.skillExec.pendingAim) {
      // Tactical Slow-Mo 0.35x while manually aiming skill!
      this.ctx.timeScale = 0.35;
    } else {
      this.ctx.timeScale = 1.0;
      speedMult = store.speedMultiplier;
    }

    const dt = realDt * this.ctx.timeScale * speedMult;
    this.elapsedSec += dt;

    // Combo & Starlight Link Window timers (Link Window pauses during active Cut-In!)
    if (this.comboTimer > 0) {
      this.comboTimer = Math.max(0, this.comboTimer - realDt);
      if (this.comboTimer <= 0) this.comboCount = 0;
    }
    if (this.ctx.linkWindowTimer > 0 && !this.ultDirector.isRunning()) {
      this.ctx.linkWindowTimer = Math.max(0, this.ctx.linkWindowTimer - realDt);
      if (this.ctx.linkWindowTimer <= 0) {
        this.ctx.linkPartnerHeroId = null;
      }
    }
    if (this.ctx.globalUltCd > 0 && !this.ultDirector.isRunning()) {
      this.ctx.globalUltCd = Math.max(0, this.ctx.globalUltCd - dt);
    }

    // Continuous mobile floating virtual joystick steering
    if (this.joystickVec && !this.skillExec.pendingAim && !this.ultDirector.isRunning()) {
      const anchorSpeed = 245;
      this.ctx.moveTarget = null;
      this.ctx.squadAnchor.x = Math.max(
        BOUNDS.minX + 80,
        Math.min(BOUNDS.maxX - 80, this.ctx.squadAnchor.x + this.joystickVec.x * anchorSpeed * dt),
      );
      this.ctx.squadAnchor.y = Math.max(
        BOUNDS.minY + 70,
        Math.min(BOUNDS.maxY - 70, this.ctx.squadAnchor.y + this.joystickVec.y * anchorSpeed * dt),
      );
    }

    // 2. Passive SP regen (0.45 SP/sec + Verdant 3-hero bonus + Active Pet SP Regen + Spire Shadow Frenzy +25% SP!)
    const factionBonuses = getActiveFactionBonuses(this.ctx.heroes.map((h) => h.heroId));
    const verdant3 = factionBonuses.some((f) => f.faction === 'VERDANT' && f.tier === 3);
    const petSpBonus = this.ctx.heroes[0]?.stats.spRegenBonus ?? 0;
    const spireSpMult =
      resolveAnyStageDef(this.stageId).spireModifier?.id === 'SHADOW_FRENZY' ? 1.25 : 1.0;
    this.ctx.addSp(0.45 * (verdant3 ? 1.1 : 1.0) * (1 + petSpBonus) * spireSpMult * dt);

    // 3. Delayed multi-hit strikes
    for (let i = this.ctx.delayedStrikes.length - 1; i >= 0; i--) {
      this.ctx.delayedStrikes[i].delay -= dt;
      if (this.ctx.delayedStrikes[i].delay <= 0) {
        const fn = this.ctx.delayedStrikes[i].fn;
        this.ctx.delayedStrikes.splice(i, 1);
        fn();
      }
    }

    // 4. Core Combat Simulation + Active Companion Pet AI
    this.squadCtrl.update(this.ctx, dt, store.autoMove);
    this.skillExec.updateAutoSkill(this.ctx, dt, store.autoSkill);
    this.updatePetCompanion(dt);
    this.enemyAI.update(this.ctx, dt, this.telegraphLayer);
    this.updateZones(dt);
    this.pool.update(dt, this.ctx.heroes);

    // 5. Aiming telegraph, Ambient Atmosphere, Dynamic Arena Dim & Move marker visuals
    if (this.dimTimer > 0) {
      this.dimTimer = Math.max(0, this.dimTimer - realDt);
      const progress = 1 - this.dimTimer / this.dimMaxDuration;
      const env =
        progress < 0.14
          ? progress / 0.14
          : progress > 0.68
            ? Math.max(0, 1 - (progress - 0.68) / 0.32)
            : 1;
      this.dimOverlay.tint = this.dimColor;
      this.dimOverlay.alpha = this.dimPeakAlpha * env;
      if (this.dimTimer <= 0) this.dimOverlay.visible = false;
    }
    if (this.skillExec.pendingAim) {
      this.skillExec.renderAimTelegraph(this.ctx, this.pointerWorld.x, this.pointerWorld.y);
    }
    this.updateAmbientAtmosphere(realDt);
    this.renderMoveMarker();
    this.updateActorVisuals(dt);
    this.updateCamera(realDt);

    // 6. Wave & Win/Loss Checks
    this.checkBattleProgress(dt, realDt);

    // 7. Throttled HUD Snapshot Sync (~20Hz -> zero React overhead)
    this.hudSyncTimer += realDt;
    if (this.hudSyncTimer >= 0.05) {
      this.hudSyncTimer = 0;
      this.syncHudSnapshot(false);
    }
  }

  private updateAmbientAtmosphere(realDt: number): void {
    this.weatherSystem?.update(realDt);
  }

  private triggerStarlightLinkBurst(partner: HeroUnit, finisher: HeroUnit): void {
    this.linkBurstsCount += 1;
    const aliveEnemies = this.ctx.enemies.filter((e) => e.alive);
    const focus = aliveEnemies.find((e) => e.def.isBoss) ?? aliveEnemies[0];
    const cx = focus ? focus.x : this.ctx.squadAnchor.x + 200;
    const cy = focus ? focus.y : this.ctx.squadAnchor.y;

    const colorA = hexToNum(partner.def.themeColor);
    const colorB = hexToNum(finisher.def.themeColor);
    const breakDamage = 32;

    // Spectacular Dual-Color Starlight Resonance Nova VFX
    this.hitstopTimer = Math.max(this.hitstopTimer, 0.068);
    this.breakZoomTimer = Math.max(this.breakZoomTimer, 0.65);
    this.ctx.triggerShake(18);
    this.ctx.triggerArenaDim(0x312e81, 0.72, 0.44);
    this.pool.spawnSkyPillar(cx, cy, 175, 0xfde047, true);
    this.pool.spawnRingWave(cx, cy, 390, colorA, 0.62);
    this.pool.spawnRingWave(cx, cy, 310, colorB, 0.52);
    this.pool.spawnRingWave(cx, cy, 240, 0xffffff, 0.44);
    this.pool.spawnBurst(cx, cy - 34, 0xfde047, 36, 95);
    this.pool.spawnBeam(partner.x, partner.y - 34, cx, cy - 30, colorA, 24);
    this.pool.spawnBeam(finisher.x, finisher.y - 34, cx, cy - 30, colorB, 24);
    audioManager.playSfx('ssr_reveal', 0.02);
    audioManager.playSfx('ult_impact', 0.04);
    audioManager.playSynthSfx('link_burst');

    // Refund +1.5 Squad SP & blast ALL alive enemies with Link Resonance (+50% UR Sovereign, +70% Transcended UR!)
    const getLinkBonus = (u: HeroUnit) =>
      u.transcended && u.def.transcendence?.upgradedSovereignAura
        ? u.def.transcendence.upgradedSovereignAura.linkBurstBonus
        : (u.def.sovereignAura?.linkBurstBonus ?? 0);
    const sovereignBonus = Math.max(getLinkBonus(partner), getLinkBonus(finisher));
    const linkBonusDmg = sovereignBonus > 0 ? sovereignBonus : 0.35;
    const isSovereignLink = sovereignBonus > 0;
    const isTranscendedLink = sovereignBonus >= 0.7;
    this.ctx.addSp(1.5);
    let bonusTotal = 0;
    for (const e of aliveEnemies) {
      if (!e.alive) continue;
      const resA = this.handleDamageEnemy(partner, e, {
        multiplier: 1.15,
        isUlt: true,
        bonusDmgMult: linkBonusDmg,
        breakDamage: breakDamage * (isSovereignLink ? 0.65 : 0.5),
        hitShieldHits: isSovereignLink ? 3 : 2,
      });
      bonusTotal += resA.damage;
      if (e.alive) {
        const resB = this.handleDamageEnemy(finisher, e, {
          multiplier: 1.35,
          isUlt: true,
          bonusDmgMult: linkBonusDmg,
          breakDamage: breakDamage * (isSovereignLink ? 0.65 : 0.5),
          hitShieldHits: isSovereignLink ? 3 : 2,
        });
        bonusTotal += resB.damage;
      }
    }

    this.pool.spawnFloatingText(
      cx,
      cy - 112,
      isTranscendedLink
        ? '❖ EMPYREAN LINK BURST +70%! ❖'
        : isSovereignLink
          ? '❖ SOVEREIGN LINK BURST +50%! ❖'
          : '✦ STARLIGHT LINK BURST! ✦',
      isTranscendedLink ? 0xfde047 : isSovereignLink ? 0xf0abfc : 0xfde047,
      true,
    );
    useCombatStore.getState().setActiveLinkBurst({
      id: Date.now() + Math.random(),
      heroAId: partner.heroId,
      heroAName: partner.def.name,
      heroACard: partner.resolvedCardAsset ?? partner.def.assets.card,
      heroAColor: partner.def.themeColor,
      heroBId: finisher.heroId,
      heroBName: finisher.def.name,
      heroBCard: finisher.resolvedCardAsset ?? finisher.def.assets.card,
      heroBColor: finisher.def.themeColor,
      bonusDamageTotal: bonusTotal,
      breakDamage,
    });
    if (this.linkBurstClearHandle) window.clearTimeout(this.linkBurstClearHandle);
    this.linkBurstClearHandle = window.setTimeout(() => {
      useCombatStore.getState().setActiveLinkBurst(null);
    }, 1650);
  }

  private triggerEnemyBreak(
    enemy: EnemyUnit,
    duration = 4.0,
    reasonLabel = '★ BROKEN! +50% DMG ★',
  ): void {
    if (!enemy.alive) return;
    this.bossBreaksCount += 1;
    enemy.isCasting = false;
    enemy.castAction = null;
    enemy.isBroken = true;
    enemy.brokenMaxTimer = duration;
    enemy.brokenTimer = duration;
    enemy.breakGauge = 0;
    enemy.squashX = 1.24;
    enemy.squashY = 0.78;
    enemy.springLeanVel -= 14;

    this.ctx.telegraphs = this.ctx.telegraphs.filter((tg) => {
      if (tg.enemyUid === enemy.uid) {
        tg.gfx.destroy();
        return false;
      }
      return true;
    });

    this.hitstopTimer = Math.max(this.hitstopTimer, 0.065);
    this.breakZoomTimer = Math.max(this.breakZoomTimer, 0.55);
    this.ctx.triggerShake(enemy.def.isBoss ? 15 : 10);
    this.ctx.triggerArenaDim(0x0ea5e9, 0.45, 0.28);
    audioManager.playSfx('cancel_cast');
    audioManager.playSynthSfx('boss_break');

    this.pool.spawnRingWave(enemy.x, enemy.y, enemy.def.isBoss ? 225 : 140, 0x38e8ff, 0.52);
    this.pool.spawnRingWave(enemy.x, enemy.y, enemy.def.isBoss ? 165 : 105, 0xfde047, 0.42);
    this.pool.spawnBurst(enemy.x, enemy.y - 36, 0x38e8ff, enemy.def.isBoss ? 28 : 16, 48);
    this.pool.spawnFloatingText(
      enemy.x,
      enemy.y - (enemy.def.isBoss ? 92 : 68),
      reasonLabel,
      0x38e8ff,
      true,
    );
  }

  private checkPointInTelegraph(
    x: number,
    y: number,
  ): { inDanger: boolean; imminent: boolean; escapeX: number; escapeY: number } {
    let inDanger = false;
    let imminent = false;
    let escapeX = 0;
    let escapeY = 0;

    for (const tg of this.ctx.telegraphs) {
      const dx = x - tg.x;
      const dy = y - tg.y;
      const dist = Math.hypot(dx, dy);
      const progress = tg.elapsed / Math.max(0.1, tg.duration);
      if (tg.shape === 'CIRCLE' && dist <= tg.radius + 28) {
        inDanger = true;
        if (progress >= 0.22) imminent = true;
        const len = Math.max(1, dist);
        escapeX += dx / len;
        escapeY += dy / len;
      } else if (tg.shape === 'LINE') {
        const halfLen = (tg.length ?? 900) * 0.5;
        const halfW = (tg.width ?? 92) * 0.5 + 22;
        const along = dx * Math.cos(tg.angle) + dy * Math.sin(tg.angle);
        const signedPerp = -dx * Math.sin(tg.angle) + dy * Math.cos(tg.angle);
        if (Math.abs(along) <= halfLen && Math.abs(signedPerp) <= halfW) {
          inDanger = true;
          if (progress >= 0.22) imminent = true;
          const sign = signedPerp >= 0 ? 1 : -1;
          escapeX += -Math.sin(tg.angle) * sign;
          escapeY += Math.cos(tg.angle) * sign;
        }
      } else if (tg.shape === 'RING') {
        const innerR = tg.innerRadius ?? 165;
        if (dist > innerR - 14 && dist <= tg.radius + 24) {
          inDanger = true;
          if (progress >= 0.22) imminent = true;
          // Dash cleanly INWARD into the emerald-cyan Safe Zone!
          const len = Math.max(1, dist);
          escapeX += -dx / len;
          escapeY += -dy / len;
        }
      } else if (tg.shape === 'CONE' && dist <= tg.radius + 26) {
        const ang = Math.atan2(dy, dx);
        let diff = ang - tg.angle;
        while (diff > Math.PI) diff -= Math.PI * 2;
        while (diff < -Math.PI) diff += Math.PI * 2;
        if (Math.abs(diff) <= tg.arcSpan * 0.62) {
          inDanger = true;
          if (progress >= 0.22) imminent = true;
          const perp = diff >= 0 ? tg.angle + Math.PI / 2 : tg.angle - Math.PI / 2;
          escapeX += Math.cos(perp);
          escapeY += Math.sin(perp);
        }
      }
    }

    return { inDanger, imminent, escapeX, escapeY };
  }

  private isSquadInDangerZone(): boolean {
    if (!this.ctx || this.ctx.telegraphs.length === 0) return false;
    for (const h of this.ctx.heroes) {
      if (h.alive && this.checkPointInTelegraph(h.x, h.y).inDanger) {
        return true;
      }
    }
    return false;
  }

  /**
   * Active Tactical Squad Evade + Perfect Dodge ("Starlight Reflex" Bullet-Time!).
   */
  public triggerSquadEvade(): boolean {
    if (this.battleEnded || !this.ctx || this.evadeCooldown > 0 || this.ultDirector.isRunning()) {
      return false;
    }
    const store = useCombatStore.getState();
    if (store.paused) return false;

    const aliveHeroes = this.ctx.heroes.filter((h) => h.alive);
    if (aliveHeroes.length === 0) return false;

    // 1. Detect danger & Perfect Dodge eligibility
    let anyDanger = false;
    let isPerfect = false;
    let escX = 0;
    let escY = 0;

    for (const h of aliveHeroes) {
      const check = this.checkPointInTelegraph(h.x, h.y);
      if (check.inDanger) {
        anyDanger = true;
        if (check.imminent) isPerfect = true;
        escX += check.escapeX;
        escY += check.escapeY;
      }
    }
    if (!isPerfect && this.pool.hasEnemyProjectileNear(aliveHeroes, 128)) {
      isPerfect = true;
    }

    // 2. Choose crisp dodge vector (Out of Telegraph -> Manual Move -> Backstep from nearest foe)
    let dirX = 0;
    let dirY = 0;
    const manual = this.squadCtrl.getManualMoveVector();
    if (anyDanger && Math.hypot(escX, escY) > 0.05) {
      const len = Math.hypot(escX, escY);
      dirX = escX / len;
      dirY = escY / len;
    } else if (this.joystickVec && Math.hypot(this.joystickVec.x, this.joystickVec.y) > 0.1) {
      dirX = this.joystickVec.x;
      dirY = this.joystickVec.y;
    } else if (manual.x !== 0 || manual.y !== 0) {
      dirX = manual.x;
      dirY = manual.y;
    } else {
      const foe = this.ctx.enemies.find((e) => e.alive && e.def.isBoss) ?? this.ctx.enemies.find((e) => e.alive);
      if (foe) {
        const dx = this.ctx.squadAnchor.x - foe.x;
        const dy = this.ctx.squadAnchor.y - foe.y;
        const d = Math.max(1, Math.hypot(dx, dy));
        dirX = dx / d;
        dirY = dy / d;
      } else {
        dirX = -1;
        dirY = 0;
      }
    }

    const dashDist = isPerfect ? 205 : 175;
    this.evadeCooldown = this.evadeMaxCooldown;
    this.ctx.moveTarget = null;

    // Move squad anchor cleanly to new safe zone
    this.ctx.squadAnchor.x = Math.max(
      BOUNDS.minX + 80,
      Math.min(BOUNDS.maxX - 80, this.ctx.squadAnchor.x + dirX * dashDist),
    );
    this.ctx.squadAnchor.y = Math.max(
      BOUNDS.minY + 70,
      Math.min(BOUNDS.maxY - 70, this.ctx.squadAnchor.y + dirY * dashDist),
    );

    // Launch coordinated blink-dash across ALL alive heroes!
    for (const h of aliveHeroes) {
      const endX = Math.max(BOUNDS.minX + 42, Math.min(BOUNDS.maxX - 42, h.x + dirX * dashDist));
      const endY = Math.max(BOUNDS.minY + 42, Math.min(BOUNDS.maxY - 42, h.y + dirY * dashDist));
      h.dashState = {
        startX: h.x,
        startY: h.y,
        endX,
        endY,
        elapsed: 0,
        duration: 0.17,
        color: isPerfect ? 0xfde047 : 0x38e8ff,
        ghostTimer: 0,
        arcHeight: 16,
      };
      h.invincibleTimer = Math.max(h.invincibleTimer, isPerfect ? 0.9 : 0.45);
      if (isPerfect) {
        h.critBuffTimer = Math.max(h.critBuffTimer, 4.5);
        h.critBuffValue = Math.max(h.critBuffValue, 0.25);
        this.pool.spawnRingWave(h.x, h.y, 92, 0xfde047, 0.36);
      } else {
        this.pool.spawnFootstepDust(h.x, h.y, dirX * 140, dirY * 140, 1.2, 0xbae6fd);
      }
    }

    if (isPerfect) {
      // ★ STARLIGHT REFLEX — PERFECT DODGE BULLET-TIME! ★
      this.perfectDodgesCount += 1;
      this.perfectDodgeSlowTimer = 0.44;
      this.breakZoomTimer = Math.max(this.breakZoomTimer, 0.5);
      this.ctx.addSp(1.5);
      this.ctx.addUltGauge(8.0);
      this.ctx.triggerArenaDim(0x0284c7, 0.55, 0.36);
      this.ctx.triggerShake(8);
      audioManager.playSfx('ult_chime', 0.03);
      audioManager.playSynthSfx('perfect_dodge');
      this.pool.spawnFloatingText(
        this.ctx.squadAnchor.x,
        this.ctx.squadAnchor.y - 76,
        '★ PERFECT DODGE! +1.5 SP ★',
        0x38e8ff,
        true,
      );
      useCombatStore.getState().setPerfectDodge(true);
      if (this.perfectDodgeClearHandle) window.clearTimeout(this.perfectDodgeClearHandle);
      this.perfectDodgeClearHandle = window.setTimeout(() => {
        useCombatStore.getState().setPerfectDodge(false);
      }, 950);
    } else {
      audioManager.playSfx('slash', 0.08);
      this.pool.spawnFloatingText(
        this.ctx.squadAnchor.x,
        this.ctx.squadAnchor.y - 54,
        'EVADE',
        0x7dd3fc,
        false,
      );
    }

    this.syncHudSnapshot(true);
    return true;
  }

  private renderMoveMarker(): void {
    this.moveMarkerGfx.clear();
    if (!this.ctx.moveTarget) return;
    const { x, y } = this.ctx.moveTarget;
    const r = 20 + Math.sin(this.elapsedSec * 10) * 4;
    this.moveMarkerGfx
      .ellipse(x, y, r, r * 0.6)
      .stroke({ color: 0x38e8ff, width: 2.5, alpha: 0.9 });
    this.moveMarkerGfx
      .ellipse(x, y, r * 0.55, r * 0.32)
      .stroke({ color: 0xf5c84c, width: 1.5, alpha: 0.75 });
    this.moveMarkerGfx.circle(x, y, 4).fill({ color: 0xffffff, alpha: 0.95 });
  }

  private updateActorVisuals(dt: number): void {
    const safeDt = Math.max(0.001, Math.min(0.05, dt));
    const turnBlend = 1 - Math.exp(-17 * safeDt);
    const squashBlend = 1 - Math.exp(-14 * safeDt);

    // 1. HEROES — Smooth Turn Squash, 2nd-Order Inertia Spring, Dynamic Shadow & Live2D-Lite MeshPlane!
    for (const h of this.ctx.heroes) {
      h.container.position.set(h.x, h.y);
      h.container.zIndex = h.y;

      // Smooth 0.10s horizontal turn interpolation (no jarring 1-frame snap flip!)
      h.visualFacing += (h.facing - h.visualFacing) * turnBlend;
      const safeFaceX =
        Math.abs(h.visualFacing) < 0.08 ? 0.08 * (h.facing >= 0 ? 1 : -1) : h.visualFacing;

      // Recover squash-and-stretch smoothly back toward 1.0
      h.squashX += (1 - h.squashX) * squashBlend;
      h.squashY += (1 - h.squashY) * squashBlend;

      const speed = Math.hypot(h.vx, h.vy);
      const moveRatio = Math.min(1, speed / Math.max(100, h.stats.moveSpeed));
      const localForwardRatio = (h.vx * h.facing) / Math.max(120, h.stats.moveSpeed);

      // 2nd-order damped spring for organic acceleration lean & braking follow-through!
      const leanTarget = Math.max(-0.85, Math.min(0.95, localForwardRatio * 0.72));
      const springAcc = (leanTarget - h.springLean) * 85 - h.springLeanVel * 13;
      h.springLeanVel += springAcc * safeDt;
      h.springLean = Math.max(-1.1, Math.min(1.15, h.springLean + h.springLeanVel * safeDt));

      // Attack lunge envelope (anticipation snap -> whip forward -> settle)
      const swingDur = Math.max(0.12, h.attackSwingDuration || 0.24);
      const swingRemain = h.attackSwingTimer > 0 ? Math.min(1, h.attackSwingTimer / swingDur) : 0;
      const swingElapsed = 1 - swingRemain;
      const attackArc = swingRemain > 0 ? Math.sin(swingElapsed * Math.PI) : 0;
      const lungeX = swingRemain > 0 ? h.facing * attackArc * 20 : 0;

      // Grounded stride hop + smooth dash jump arc
      let dashArcY = 0;
      if (h.dashState) {
        const dp = Math.min(1, h.dashState.elapsed / Math.max(0.05, h.dashState.duration));
        dashArcY = -Math.sin(dp * Math.PI) * h.dashState.arcHeight;
      }
      const isLevitatingUR = h.def.tier === 'UR' && h.alive;
      const urHoverY = isLevitatingUR
        ? -(h.ascensionTimer > 0 ? 18 : 10) + Math.sin(h.animTime * 2.8) * 5
        : 0;
      const strideHopY = h.alive
        ? isLevitatingUR
          ? 0
          : moveRatio > 0.08
            ? -Math.abs(Math.sin(h.stridePhase)) * (5.5 + moveRatio * 5.5)
            : Math.sin(h.animTime * 3.4) * 1.4
        : 0;
      const totalLiftY = strideHopY + dashArcY + urHoverY;

      // Multi-Pose Action Keyframe Swap (Idle <-> Attack/Cast <-> UR Ascension Form!)
      if (h.idleTexture) {
        const nextPose: 'IDLE' | 'ATTACK' | 'ASCENDED' =
          h.alive && h.ascensionTimer > 0 && h.ascendedTexture && swingRemain <= 0.04
            ? 'ASCENDED'
            : h.alive && swingRemain > 0.02 && h.attackTexture
              ? 'ATTACK'
              : 'IDLE';
        if (h.activePose !== nextPose) {
          h.activePose = nextPose;
          const nextTex =
            nextPose === 'ASCENDED' && h.ascendedTexture
              ? h.ascendedTexture
              : nextPose === 'ATTACK' && h.attackTexture
                ? h.attackTexture
                : h.idleTexture;
          h.liveMesh.swapTextureFast(nextTex);
          h.castShadowSprite.texture = nextTex;
        }
      }

      const baseSc =
        (h.baseScaleY ?? 0.9) *
        (h.activePose === 'ASCENDED'
          ? 1.12
          : h.activePose === 'ATTACK'
            ? (h.attackScaleBoost ?? 1)
            : 1);
      const hitBend = h.hitFlashTimer > 0 ? Math.min(1, h.hitFlashTimer / 0.15) : 0;

      // Apply Live2D-Lite real-time 5×7 vertex deformation!
      h.liveMesh.deform({
        time: h.animTime,
        nativeForwardSign: 1,
        moveRatio,
        stridePhase: h.stridePhase,
        lean: h.springLean,
        windup: 0,
        attackWhip: attackArc,
        hitBend,
        alive: h.alive,
      });

      const mesh = h.liveMesh.mesh;
      mesh.position.set(lungeX, totalLiftY);
      mesh.scale.set(baseSc * safeFaceX * h.squashX, baseSc * h.squashY);
      mesh.rotation =
        (swingRemain > 0 ? h.facing * attackArc * 0.11 : 0) +
        h.facing * h.springLean * 0.045;

      // 2.5D Single-Pass Rim Lighting, Anime Ink Contour & Status Shader!
      const ultCost = h.def.ultimate.gaugeCost ?? 45;
      const isUltReady = h.alive && h.ultCd <= 0 && this.ctx.ultGauge >= ultCost;
      const isLinkPartner =
        h.alive && this.ctx.linkWindowTimer > 0 && this.ctx.linkPartnerHeroId !== h.heroId;
      let heroStatusHex = FACTIONS[h.def.faction].accentHex;
      let heroStatusIntensity = 0;
      if (h.alive) {
        if (h.invincibleTimer > 0) {
          heroStatusHex = 0x38e8ff;
          heroStatusIntensity = 0.88;
        } else if (h.def.tier === 'UR' && h.ascensionTimer > 0) {
          // Prismatic shifting Sovereign rim light during Ascension Form!
          const prismPalette = [0xfde047, 0x38e8ff, 0xe879f9];
          heroStatusHex = prismPalette[Math.floor(this.elapsedSec * 2.4) % prismPalette.length];
          heroStatusIntensity = 0.82;
        } else if (h.overdriveTimer > 0 || isLinkPartner) {
          heroStatusHex = 0xfde047;
          heroStatusIntensity = 0.78;
        } else if (h.def.tier === 'UR') {
          const prismPalette = [0xfde047, 0xe879f9, 0x38e8ff];
          heroStatusHex = prismPalette[Math.floor(this.elapsedSec * 1.1) % prismPalette.length];
          heroStatusIntensity = 0.44;
        } else if (isUltReady) {
          heroStatusHex = FACTIONS[h.def.faction].accentHex;
          heroStatusIntensity = 0.32;
        } else if (h.atkBuffTimer > 0 || h.critBuffTimer > 0) {
          heroStatusHex = 0xfbbf24;
          heroStatusIntensity = 0.28;
        }
      }
      if (h.visualFilter) {
        mesh.tint = 0xffffff;
        h.visualFilter.setFrameState({
          time: this.elapsedSec,
          hitFlash: hitBend,
          statusHex: heroStatusHex,
          statusIntensity: heroStatusIntensity,
          dissolve: 0,
        });
      } else {
        mesh.tint = h.hitFlashTimer > 0 ? 0xffa8a8 : h.overdriveTimer > 0 ? 0xfef08a : 0xffffff;
      }

      // Dynamic Grounded Contact Shadow + True 2.5D Projected Silhouette Cast Shadow!
      const elevation = Math.max(0, -totalLiftY);
      const shadowScale = Math.max(0.58, 1 - elevation * 0.0085) * h.squashX;
      h.shadowGfx.scale.set(shadowScale, Math.max(0.65, 1 - elevation * 0.006));
      h.shadowGfx.alpha = h.alive ? Math.max(0.24, 1 - elevation * 0.011) : 0.25;

      if (h.castShadowSprite.visible) {
        const castScale = Math.max(0.55, 1 - elevation * 0.006);
        const shadowShiftX = -Math.sign(this.biomeLighting.lightDir[0] || -1) * elevation * 0.48;
        h.castShadowSprite.position.set(lungeX + shadowShiftX, 3 + elevation * 0.14);
        h.castShadowSprite.scale.set(
          baseSc * safeFaceX * h.squashX * castScale,
          baseSc * this.biomeLighting.shadowScaleY * h.squashY * castScale,
        );
        h.castShadowSprite.skew.x = this.biomeLighting.shadowSkewX;
        h.castShadowSprite.alpha = h.alive
          ? Math.max(0.08, this.biomeLighting.shadowAlpha * (1 - elevation * 0.012))
          : 0.08;
      }

      if (h.fallbackCrestGroup && h.fallbackCrestGroup.visible) {
        h.fallbackCrestGroup.position.set(lungeX, totalLiftY);
      }

      if (h.weaponGfx.visible) {
        h.weaponGfx.position.set(h.facing * 32 + lungeX, -38 + totalLiftY);
        h.weaponGfx.scale.x = h.facing;
        h.weaponGfx.rotation =
          swingRemain > 0
            ? h.facing * (-0.55 + swingElapsed * 1.45)
            : h.facing * Math.sin(h.animTime * 4) * 0.08;
      }

      // Rotating Feathered Magic Circle Aura (perspective-flattened!) + Holographic Hex-Dome Shield + Ambient Power Sparks
      const fHex = FACTIONS[h.def.faction].accentHex;
      if (h.alive) {
        const auraPulse = 1 + Math.sin(this.elapsedSec * 5 + h.slotIndex) * 0.06;
        const powered = isUltReady || h.overdriveTimer > 0 || isLinkPartner;
        h.auraPivot.visible = true;
        h.auraSprite.rotation = this.elapsedSec * (powered ? 1.55 : 0.72) + h.slotIndex;
        h.auraSprite.tint = isLinkPartner || h.overdriveTimer > 0 ? 0xfde047 : fHex;
        h.auraSprite.alpha = powered
          ? 0.54 + Math.sin(this.elapsedSec * 7 + h.slotIndex) * 0.12
          : 0.28;
        const aSc = (powered || h.def.tier === 'UR' ? 0.44 : 0.34) * auraPulse;
        h.auraSprite.scale.set(aSc);

        if (h.backRuneSprite) {
          const asc = h.ascensionTimer > 0;
          const tr = Boolean(h.transcended);
          h.backRuneSprite.visible = true;
          h.backRuneSprite.position.set(lungeX, -88 + totalLiftY * 0.75);
          h.backRuneSprite.rotation = -this.elapsedSec * (asc ? 1.8 : tr ? 1.05 : 0.65);
          const brSc = (asc ? 0.78 : tr ? 0.62 : 0.46) * auraPulse;
          h.backRuneSprite.scale.set(brSc);
          h.backRuneSprite.tint =
            asc || tr
              ? Math.sin(this.elapsedSec * (asc ? 5 : 2.6)) > 0
                ? 0xfde047
                : 0xe879f9
              : 0xfde047;
          h.backRuneSprite.alpha = asc ? 0.78 : tr ? 0.58 : 0.36;
        }

        if (h.shield > 0) {
          const shPulse = 1 + Math.sin(this.elapsedSec * 6.5 + h.slotIndex) * 0.035;
          h.shieldSprite.visible = true;
          h.shieldSprite.position.set(lungeX, -62 + totalLiftY * 0.6);
          h.shieldSprite.rotation = Math.sin(this.elapsedSec * 1.4 + h.slotIndex) * 0.12;
          h.shieldSprite.scale.set(0.5 * shPulse, 0.6 * shPulse);
          h.shieldSprite.alpha = 0.32 + Math.sin(this.elapsedSec * 8) * 0.07;
          h.shieldSprite.tint = h.shieldCounterBurn ? 0xfb923c : 0x38bdf8;
        } else {
          h.shieldSprite.visible = false;
        }

        // Ambient rising faction/starlight sparks when powered up!
        if (powered || h.invincibleTimer > 0) {
          h.ambientVfxTimer -= safeDt;
          if (h.ambientVfxTimer <= 0) {
            h.ambientVfxTimer = h.overdriveTimer > 0 || isLinkPartner ? 0.16 : 0.32;
            this.pool.spawnSpriteFx({
              tex: Math.random() < 0.35 ? 'impactFlare' : 'softGlow',
              x: h.x + (Math.random() - 0.5) * 44,
              y: h.y - 8 - Math.random() * 24,
              vx: (Math.random() - 0.5) * 18,
              vy: -(48 + Math.random() * 42),
              scaleX: 0.13,
              endScaleX: 0.02,
              tint: h.invincibleTimer > 0 ? 0x38e8ff : isLinkPartner ? 0xfde047 : fHex,
              alpha: 0.72,
              life: 0.42,
              additive: true,
            });
          }
        }
      } else {
        h.auraPivot.visible = false;
        h.shieldSprite.visible = false;
        if (h.backRuneSprite) h.backRuneSprite.visible = false;
      }

      // Compact Faction Rune Pip + Seraphina Orbiting Star Orbs
      h.auraGfx.clear();
      if (h.alive) {
        const spin = this.elapsedSec * 1.8 + h.slotIndex;
        for (let k = 0; k < 4; k++) {
          const a = spin + (k * Math.PI) / 2;
          h.auraGfx.circle(Math.cos(a) * 34, 2 + Math.sin(a) * 12, 2.2).fill({ color: fHex, alpha: 0.8 });
        }
        if (h.heroId === 'seraphina' && h.starOrbs > 0) {
          for (let i = 0; i < h.starOrbs; i++) {
            const a = this.elapsedSec * 3.4 + (i * Math.PI * 2) / h.starOrbs;
            h.auraGfx
              .circle(Math.cos(a) * 44, -68 + Math.sin(a) * 14, 6)
              .fill({ color: 0x38e8ff })
              .stroke({ color: 0xffffff, width: 1.5 });
          }
        }
      }

      // Clean slim RPG overhead HP/Shield bar
      h.hpBarGfx.clear();
      if (h.alive) {
        const w = 54;
        const barY = (h.hasFullSprite ? -152 : -110) + totalLiftY * 0.6;
        const hpRatio = Math.max(0, h.hp / h.maxHp);
        const shRatio = Math.min(1, h.shield / h.maxHp);
        h.hpBarGfx.rect(-w / 2 - 1, barY, w + 2, 6).fill({ color: 0x050814, alpha: 0.85 });
        h.hpBarGfx.rect(-w / 2, barY + 1, w * hpRatio, 4).fill({ color: 0x22c55e });
        if (shRatio > 0) {
          h.hpBarGfx.rect(-w / 2, barY + 1, w * shRatio, 2).fill({ color: 0x38bdf8 });
        }
      }
    }

    // 2. ENEMIES & BOSSES — Shader Starlight Ash Dissolve, Boss Skyfall Slam, 2.5D Cast Shadow, Archetype Auras & Rim Lighting!
    for (const e of this.ctx.enemies) {
      if (!e.alive) {
        // True Procedural Starlight Ash Death Dissolve Shader + Rising Embers!
        if (e.dissolveTimer > 0) {
          e.dissolveTimer = Math.max(0, e.dissolveTimer - safeDt);
          const dur = Math.max(0.1, e.dissolveDuration || 0.52);
          const p = 1 - e.dissolveTimer / dur;
          const baseSc = e.baseScaleY ?? 1;
          const mesh = e.liveMesh.mesh;
          if (e.visualFilter) {
            mesh.tint = 0xffffff;
            mesh.alpha = Math.max(0, 1 - Math.max(0, p - 0.72) * 3.5);
            e.visualFilter.setFrameState({
              time: this.elapsedSec,
              hitFlash: p < 0.14 ? 1 - p / 0.14 : 0,
              statusIntensity: 0,
              dissolve: p,
              dissolveHex: e.def.isBoss ? 0xfde047 : 0xc084fc,
            });
          } else {
            mesh.tint = p < 0.28 ? 0xffffff : 0xc084fc;
            mesh.alpha = Math.max(0, 1 - p * p);
          }
          mesh.position.set(0, -p * 26);
          mesh.scale.set(
            baseSc * (e.facing >= 0 ? -1 : 1) * (1 - p * 0.18),
            baseSc * (1 + p * 0.14),
          );
          e.shadowGfx.alpha = Math.max(0, 0.44 * (1 - p));
          e.shadowGfx.scale.set(Math.max(0.2, 1 - p * 0.65));
          e.castShadowSprite.alpha = Math.max(0, this.biomeLighting.shadowAlpha * (1 - p * 1.25));
          e.auraSprite.alpha = Math.max(0, 0.35 * (1 - p * 1.4));
          if (e.backRuneSprite) e.backRuneSprite.alpha = Math.max(0, 0.3 * (1 - p * 1.4));

          if (Math.random() < (e.def.isBoss ? 0.85 : 0.55)) {
            const spread = e.def.isBoss ? 92 : 44;
            this.pool.spawnSpriteFx({
              tex: Math.random() < 0.38 ? 'impactFlare' : 'softGlow',
              x: e.x + (Math.random() - 0.5) * spread,
              y: e.y - 14 - Math.random() * (e.def.isBoss ? 140 : 72),
              vx: (Math.random() - 0.5) * 40,
              vy: -(75 + Math.random() * 105),
              scaleX: e.def.isBoss ? 0.22 : 0.15,
              endScaleX: 0.02,
              tint: Math.random() < 0.5 ? 0xfde047 : 0xc084fc,
              alpha: 0.88,
              life: 0.38,
              additive: true,
            });
          }
          if (e.dissolveTimer <= 0) {
            e.container.visible = false;
          }
        }
        continue;
      }
      e.container.position.set(e.x, e.y);
      e.container.zIndex = e.y;

      const isFloating =
        e.def.id === 'rift_acolyte' ||
        e.def.id === 'void_wisp' ||
        e.def.id === 'astral_weaver';
      const isHeavy =
        e.def.isBoss || e.def.id === 'armored_golem' || e.def.id === 'briar_behemoth';

      // Wave Entrance Choreography: Boss Skyfall Slam vs Minion Rift Portal Emergence!
      let introLiftY = 0;
      let introScaleMult = 1;
      let introAlpha = 1;
      if (e.spawnIntroTimer > 0) {
        e.spawnIntroTimer = Math.max(0, e.spawnIntroTimer - safeDt);
        const dur = Math.max(0.1, e.spawnIntroDuration || 0.4);
        const introP = 1 - e.spawnIntroTimer / dur;
        if (e.spawnIntroKind === 'BOSS_DROP') {
          // Dramatic meteor-slam descent from high sky!
          const dropCurve = Math.pow(1 - introP, 2.2);
          introLiftY = -(e.def.isBoss ? 440 : 280) * dropCurve;
          introAlpha = Math.min(1, introP * 3.5);
          if (e.spawnIntroTimer <= 0 && !e.spawnLanded) {
            e.spawnLanded = true;
            e.squashX = e.def.isBoss ? 1.3 : 1.2;
            e.squashY = e.def.isBoss ? 0.72 : 0.82;
            e.springLeanVel -= 10;
            this.ctx.triggerShake(e.def.isBoss ? 13 : 6);
            this.pool.spawnSpriteFx({
              tex: 'groundCrack',
              x: e.x,
              y: e.y + 4,
              scaleX: e.def.isBoss ? 1.15 : 0.68,
              scaleY: e.def.isBoss ? 0.72 : 0.42,
              endScaleX: e.def.isBoss ? 1.25 : 0.72,
              endScaleY: e.def.isBoss ? 0.78 : 0.45,
              tint: e.def.isBoss ? 0xf43f5e : 0xa855f7,
              alpha: 0.78,
              life: 2.4,
              groundLayer: true,
            });
            this.pool.spawnRingWave(e.x, e.y, e.def.isBoss ? 250 : 135, 0xfde047, 0.5);
            for (let d = 0; d < (e.def.isBoss ? 8 : 5); d++) {
              const ang = (d * Math.PI * 2) / (e.def.isBoss ? 8 : 5);
              this.pool.spawnFootstepDust(
                e.x + Math.cos(ang) * 24,
                e.y + Math.sin(ang) * 10,
                -Math.cos(ang) * 200,
                -Math.sin(ang) * 90,
                e.def.isBoss ? 2.1 : 1.4,
                this.biomeLighting.dustTint,
              );
            }
          }
        } else if (e.spawnIntroKind === 'RIFT_EMERGE') {
          const easeOut = 1 - Math.pow(1 - introP, 3);
          introScaleMult = 0.25 + 0.75 * easeOut;
          introLiftY = (1 - easeOut) * 18;
          introAlpha = Math.min(1, introP * 1.55);
        }
      }

      // Smooth horizontal turn (enemies face left natively, so mesh X sign = -visualFacing)
      e.visualFacing += (e.facing - e.visualFacing) * (isHeavy ? turnBlend * 0.65 : turnBlend);
      const safeFaceX =
        Math.abs(e.visualFacing) < 0.08 ? 0.08 * (e.facing >= 0 ? 1 : -1) : e.visualFacing;

      e.squashX += (1 - e.squashX) * squashBlend;
      e.squashY += (1 - e.squashY) * squashBlend;

      const speed = Math.hypot(e.vx, e.vy);
      const moveRatio = Math.min(1, speed / Math.max(60, e.def.moveSpeed));
      const localForwardRatio = (e.vx * e.facing) / Math.max(80, e.def.moveSpeed);

      // 2nd-order damped spring lean (heavier damping on Bosses!)
      const leanTarget = Math.max(-0.8, Math.min(0.9, localForwardRatio * 0.68));
      const stiff = isHeavy ? 52 : 78;
      const damp = isHeavy ? 10 : 12.5;
      const springAcc = (leanTarget - e.springLean) * stiff - e.springLeanVel * damp;
      e.springLeanVel += springAcc * safeDt;
      e.springLean = Math.max(-1.05, Math.min(1.1, e.springLean + e.springLeanVel * safeDt));

      // Cast telegraph wind-up coil (0 -> 1 as cast approaches detonation!)
      const windup = e.isCasting
        ? Math.min(1, e.castElapsed / Math.max(0.15, e.castDuration))
        : 0;

      // Attack lunge envelope
      const swingDur = Math.max(0.14, e.attackSwingDuration || 0.28);
      const swingRemain = e.attackSwingTimer > 0 ? Math.min(1, e.attackSwingTimer / swingDur) : 0;
      const attackArc = swingRemain > 0 ? Math.sin((1 - swingRemain) * Math.PI) : 0;
      const lungeX = swingRemain > 0 ? e.facing * attackArc * (e.def.isBoss ? 28 : 18) : 0;

      // Smooth dash dive arc (Tempest Drake)
      let dashArcY = 0;
      if (e.dashState) {
        const dp = Math.min(1, e.dashState.elapsed / Math.max(0.06, e.dashState.duration));
        dashArcY = -Math.sin(dp * Math.PI) * e.dashState.arcHeight;
      }

      const strideHopY = isFloating
        ? -10 + Math.sin(e.animTime * 4.2) * 6.5
        : moveRatio > 0.08
          ? -Math.abs(Math.sin(e.stridePhase)) * (isHeavy ? 6.5 : 5.5 + moveRatio * 4.5)
          : Math.sin(e.animTime * (isHeavy ? 2.6 : 3.6)) * (e.def.isBoss ? 2.5 : 1.6);
      const totalLiftY = strideHopY + dashArcY + introLiftY;

      const hitBend = e.hitFlashTimer > 0 ? Math.min(1, e.hitFlashTimer / 0.14) : 0;
      const brokenStagger = e.isBroken ? Math.sin(e.animTime * 22) * 0.25 : 0;

      // Multi-Pose Action Keyframe Swap for Enemies & Bosses (synced with 2.5D Cast Shadow!)
      if (e.attackTexture && e.idleTexture) {
        const nextPose: 'IDLE' | 'ATTACK' =
          e.alive && (swingRemain > 0.02 || windup > 0.52) ? 'ATTACK' : 'IDLE';
        if (e.activePose !== nextPose) {
          e.activePose = nextPose;
          const nextTex = nextPose === 'ATTACK' ? e.attackTexture : e.idleTexture;
          e.liveMesh.swapTextureFast(nextTex);
          e.castShadowSprite.texture = nextTex;
        }
      }

      // Enemy textures natively face LEFT (-1), so pass nativeForwardSign: -1!
      e.liveMesh.deform({
        time: e.animTime,
        nativeForwardSign: -1,
        moveRatio,
        stridePhase: e.stridePhase,
        lean: e.springLean + brokenStagger,
        windup,
        attackWhip: attackArc,
        hitBend,
        isFloating,
        isHeavy,
        alive: e.alive,
      });

      const poseBoost = e.activePose === 'ATTACK' ? (e.attackScaleBoost ?? 1) : 1;
      const baseSc = (e.baseScaleY ?? 1) * introScaleMult * poseBoost;
      const mesh = e.liveMesh.mesh;
      const recoilShift = hitBend * -e.facing * (isHeavy ? 4 : 9);
      mesh.position.set(lungeX + recoilShift, totalLiftY);
      mesh.scale.set(baseSc * -safeFaceX * e.squashX, baseSc * e.squashY);
      mesh.alpha = introAlpha;
      mesh.rotation =
        (swingRemain > 0 ? e.facing * attackArc * 0.1 : 0) +
        (windup > 0 ? -e.facing * windup * 0.08 : 0) +
        e.facing * e.springLean * 0.04;

      // 2.5D Single-Pass Rim Lighting, Anime Ink Contour & Status Shader!
      let enemyStatusHex = 0xf43f5e;
      let enemyStatusIntensity = 0;
      if (e.isBroken) {
        enemyStatusHex = 0x38e8ff;
        enemyStatusIntensity = 0.95;
      } else if (e.freezeTimer > 0) {
        enemyStatusHex = 0x7dd3fc;
        enemyStatusIntensity = 0.92;
      } else if (e.enraged) {
        enemyStatusHex = 0xf43f5e;
        enemyStatusIntensity = 0.88;
      } else if (windup > 0.12) {
        enemyStatusHex = 0xfb7185;
        enemyStatusIntensity = 0.3 + windup * 0.65;
      } else if (e.burnStacks > 0) {
        enemyStatusHex = 0xf97316;
        enemyStatusIntensity = 0.5 + Math.min(0.32, e.burnStacks * 0.08);
      } else if (e.starfallMarkTimer > 0) {
        enemyStatusHex = 0xfde047;
        enemyStatusIntensity = 0.52;
      } else if (e.lunarTraceTimer > 0) {
        enemyStatusHex = 0x34d399;
        enemyStatusIntensity = 0.5;
      } else if (e.def.isBoss && e.phase === 2) {
        enemyStatusHex = 0xd946ef;
        enemyStatusIntensity = 0.42;
      }

      if (e.visualFilter) {
        mesh.tint = 0xffffff;
        e.visualFilter.setFrameState({
          time: this.elapsedSec,
          hitFlash: hitBend,
          statusHex: enemyStatusHex,
          statusIntensity: enemyStatusIntensity,
          dissolve: 0,
        });
      } else {
        mesh.tint =
          e.hitFlashTimer > 0
            ? 0xffaaaa
            : e.isBroken
              ? 0xfde047
              : e.freezeTimer > 0
                ? 0x7dd3fc
                : windup > 0.65
                  ? 0xffd1d1
                  : 0xffffff;
      }

      // Dynamic Grounded Contact Shadow + True 2.5D Projected Silhouette Cast Shadow!
      const elevation = Math.max(0, -totalLiftY);
      const shScaleX = Math.max(0.35, 1 - elevation * 0.0022) * e.squashX * introScaleMult;
      e.shadowGfx.scale.set(shScaleX, Math.max(0.38, 1 - elevation * 0.002) * introScaleMult);
      e.shadowGfx.alpha = Math.max(0.18, (1 - elevation * 0.002) * introAlpha);

      if (e.castShadowSprite.visible) {
        const castScale = Math.max(0.32, 1 - elevation * 0.0018);
        const shadowShiftX = -Math.sign(this.biomeLighting.lightDir[0] || -1) * Math.min(130, elevation * 0.38);
        e.castShadowSprite.position.set(lungeX + recoilShift + shadowShiftX, 4 + Math.min(34, elevation * 0.1));
        e.castShadowSprite.scale.set(
          baseSc * -safeFaceX * e.squashX * castScale,
          baseSc * this.biomeLighting.shadowScaleY * e.squashY * castScale,
        );
        e.castShadowSprite.skew.x = this.biomeLighting.shadowSkewX;
        e.castShadowSprite.alpha = Math.max(
          0.07,
          this.biomeLighting.shadowAlpha * (e.def.isBoss ? 1.15 : 1.0) * (1 - elevation * 0.002) * introAlpha,
        );
      }

      // Rotating Boss/Mini-Boss Ground Magic Circle (true perspective-flattened!) & Back Arcane Halo!
      if (e.auraPivot.visible) {
        const auraPulse = 1 + Math.sin(this.elapsedSec * (e.enraged ? 11 : 4.5)) * 0.07;
        e.auraSprite.rotation = this.elapsedSec * (e.enraged ? 2.1 : 0.85);
        e.auraSprite.tint = e.isBroken ? 0x38e8ff : e.enraged ? 0xf43f5e : e.phase === 2 ? 0xe879f9 : 0xc084fc;
        e.auraSprite.alpha = (e.enraged ? 0.68 : e.isBroken ? 0.65 : e.def.isBoss ? 0.44 : 0.28) * introAlpha;
        const scBase = e.def.isBoss ? 0.98 : 0.56;
        e.auraSprite.scale.set(scBase * auraPulse);
      }

      if (e.backRuneSprite) {
        e.backRuneSprite.position.set(
          lungeX + recoilShift,
          (e.def.isBoss ? -128 : -76) + totalLiftY * 0.92,
        );
        e.backRuneSprite.rotation = -this.elapsedSec * (e.enraged ? 1.8 : 0.9);
        e.backRuneSprite.tint = e.isBroken
          ? 0x38e8ff
          : e.enraged
            ? 0xf43f5e
            : e.def.id === 'astral_weaver'
              ? 0x38e8ff
              : 0xd946ef;
        e.backRuneSprite.alpha = (e.enraged ? 0.52 : e.def.isBoss ? 0.24 : 0.38) * introAlpha;
        const rSc = (e.def.isBoss ? (e.enraged ? 1.08 : 0.88) : 0.44) * introScaleMult;
        e.backRuneSprite.scale.set(rSc);
      }

      // Monster Archetype & Status Ambient Particles (Fire Imp / Burn / Frost / Enraged Boss Crackles!)
      const wantsFire = e.def.id === 'cinder_imp' || e.burnStacks > 0 || e.enraged;
      const wantsFrost = e.def.id === 'frost_lancer' || e.freezeTimer > 0;
      if (e.spawnIntroTimer <= 0 && (wantsFire || wantsFrost)) {
        e.ambientVfxTimer -= safeDt;
        if (e.ambientVfxTimer <= 0) {
          e.ambientVfxTimer = e.enraged ? 0.14 : 0.32;
          if (wantsFire) {
            const spread = e.def.isBoss ? 86 : 34;
            this.pool.spawnSpriteFx({
              tex: e.enraged && Math.random() < 0.28 ? 'lightningBolt' : 'fireWisp',
              x: e.x + (Math.random() - 0.5) * spread,
              y: e.y - 24 - Math.random() * (e.def.isBoss ? 120 : 56),
              vx: (Math.random() - 0.5) * 28,
              vy: -(48 + Math.random() * 56),
              rotation: (Math.random() - 0.5) * 0.6,
              scaleX: e.def.isBoss ? 0.28 : 0.18,
              endScaleX: 0.04,
              tint: e.enraged ? 0xf43f5e : 0xf97316,
              alpha: 0.78,
              life: 0.4,
              additive: true,
            });
          } else if (wantsFrost) {
            this.pool.spawnSpriteFx({
              tex: 'iceCrystal',
              x: e.x + (Math.random() - 0.5) * 38,
              y: e.y - 22 - Math.random() * 60,
              vx: (Math.random() - 0.5) * 18,
              vy: 14 + Math.random() * 20,
              spin: (Math.random() - 0.5) * 3,
              scaleX: 0.16,
              endScaleX: 0.04,
              tint: 0xbae6fd,
              alpha: 0.76,
              life: 0.45,
              additive: true,
            });
          }
        }
      }

      // Overhead HP Bar + Mini-Boss Break Gauge Bar (skip big bar for boss since boss has top HUD bar)
      e.hpBarGfx.clear();
      if (!e.def.isBoss) {
        const w = e.def.isMiniBoss ? 82 : 52;
        const topY = (e.def.isMiniBoss ? -172 : -120) + totalLiftY * 0.55;
        e.hpBarGfx.rect(-w / 2 - 1, topY, w + 2, 6).fill({ color: 0x050814, alpha: 0.88 });
        e.hpBarGfx
          .rect(-w / 2, topY + 1, w * Math.max(0, e.hp / e.maxHp), 4)
          .fill({ color: 0xef4444 });

        // Slim Amber/Cyan Stagger Break Bar under Mini-Boss HP bar!
        if (e.maxBreakGauge > 0) {
          const brkY = topY + 7;
          const brkRatio = e.isBroken
            ? Math.max(0, e.brokenTimer / Math.max(0.1, e.brokenMaxTimer))
            : Math.max(0, e.breakGauge / e.maxBreakGauge);
          e.hpBarGfx.rect(-w / 2 - 1, brkY, w + 2, 4).fill({ color: 0x050814, alpha: 0.88 });
          e.hpBarGfx
            .rect(-w / 2, brkY + 0.5, w * brkRatio, 3)
            .fill({ color: e.isBroken ? 0x38e8ff : 0xf59e0b });
        }
      }

      // Rich Tactical Status Badges & World-Space CC Indicators!
      e.statusGfx.clear();
      const bodyMidY = (e.def.isBoss ? -96 : e.def.isMiniBoss ? -68 : -48) + totalLiftY * 0.5;
      const headY = (e.def.isBoss ? -215 : e.def.isMiniBoss ? -184 : -132) + totalLiftY * 0.55;

      // 1. Frozen crystalline prism casing
      if (e.freezeTimer > 0) {
        const rx = e.def.isMiniBoss ? 52 : 34;
        const ry = e.def.isMiniBoss ? 68 : 48;
        e.statusGfx
          .poly([0, bodyMidY - ry, rx, bodyMidY - ry * 0.3, rx * 0.8, bodyMidY + ry * 0.75, -rx * 0.8, bodyMidY + ry * 0.75, -rx, bodyMidY - ry * 0.3])
          .fill({ color: 0x7dd3fc, alpha: 0.22 })
          .stroke({ color: 0xe0f2fe, width: 2.2, alpha: 0.88 });
      }

      // 2. Stunned orbiting golden stars above head
      if (e.stunTimer > 0) {
        for (let s = 0; s < 3; s++) {
          const ang = this.elapsedSec * 5.2 + (s * Math.PI * 2) / 3;
          const sx = Math.cos(ang) * 24;
          const sy = headY - 6 + Math.sin(ang) * 7;
          e.statusGfx
            .poly([sx, sy - 5, sx + 4, sy, sx, sy + 5, sx - 4, sy])
            .fill({ color: 0xfde047, alpha: 0.96 });
        }
      }

      // 3. Broken shatter halo around Boss / Mini-Boss
      if (e.isBroken) {
        const pulse = 0.72 + Math.sin(this.elapsedSec * 16) * 0.28;
        const r = e.def.isBoss ? 102 : 60;
        e.statusGfx
          .ellipse(0, 4, r, r * 0.32)
          .stroke({ color: 0x38e8ff, width: 3.5, alpha: pulse });
        e.statusGfx
          .ellipse(0, 4, r * 0.82, r * 0.24)
          .stroke({ color: 0xfde047, width: 2, alpha: pulse * 0.85 });
      }

      // 4. Vaelen Starfall Mark (rotating solar crosshair)
      if (e.starfallMarkTimer > 0) {
        const r = 24;
        e.statusGfx.circle(0, bodyMidY, r).stroke({ color: 0xf5c84c, width: 2.4, alpha: 0.9 });
        e.statusGfx
          .moveTo(-r - 6, bodyMidY)
          .lineTo(-r + 5, bodyMidY)
          .moveTo(r - 5, bodyMidY)
          .lineTo(r + 6, bodyMidY)
          .moveTo(0, bodyMidY - r - 6)
          .lineTo(0, bodyMidY - r + 5)
          .moveTo(0, bodyMidY + r - 5)
          .lineTo(0, bodyMidY + r + 6)
          .stroke({ color: 0xfef08a, width: 2.2, alpha: 0.95 });
      }

      // 5. Elara Lunar Trace emerald diamond reticle
      if (e.lunarTraceTimer > 0) {
        const r = 20;
        e.statusGfx
          .poly([0, bodyMidY - r, r, bodyMidY, 0, bodyMidY + r, -r, bodyMidY])
          .stroke({ color: 0x34d399, width: 2.2, alpha: 0.9 });
      }

      // 6. Boss Phase 2 Hit-Count Shield Ring & Fiery Enraged Overdrive Aura
      if (e.enraged) {
        const ragePulse = 0.72 + Math.sin(this.elapsedSec * 12) * 0.28;
        e.statusGfx
          .ellipse(0, 4, 118, 36)
          .stroke({ color: 0xf43f5e, width: 4, alpha: ragePulse });
        e.statusGfx
          .ellipse(0, 4, 96, 28)
          .stroke({ color: 0xfde047, width: 2.2, alpha: ragePulse * 0.85 });
      }
      if (e.hitShield > 0) {
        e.statusGfx
          .ellipse(0, -80 + totalLiftY * 0.5, 96, 108)
          .stroke({ color: 0xe879f9, width: 4, alpha: 0.82 });
      }

      // 7. Compact Color-Coded Debuff Chips arrayed neatly above HP bar!
      const chips: Array<{ color: number; border: number }> = [];
      for (let b = 0; b < e.burnStacks; b++) {
        chips.push({ color: 0xf97316, border: 0xfef08a }); // Burn stack
      }
      if (e.defShredTimer > 0) chips.push({ color: 0xf59e0b, border: 0xffffff }); // DEF Shred
      if (e.atkDownTimer > 0) chips.push({ color: 0x60a5fa, border: 0xe0f2fe }); // ATK Down
      if (e.provokeTimer > 0) chips.push({ color: 0xf43f5e, border: 0xfecdd3 }); // Provoked

      if (chips.length > 0) {
        const step = 11;
        const startX = -((chips.length - 1) * step) / 2;
        chips.forEach((chip, ci) => {
          const cx = startX + ci * step;
          e.statusGfx
            .poly([cx, headY - 4.5, cx + 4.5, headY, cx, headY + 4.5, cx - 4.5, headY])
            .fill({ color: chip.color, alpha: 0.95 })
            .stroke({ color: chip.border, width: 1.2, alpha: 0.9 });
        });
      }
    }
  }

  private updateCamera(realDt: number): void {
    const viewW = this.app.screen.width;
    const viewH = this.app.screen.height;

    let targetX = this.ctx.squadAnchor.x;
    let targetY = this.ctx.squadAnchor.y;

    if (this.ctx.cameraFocus) {
      targetX = this.ctx.cameraFocus.x;
      targetY = this.ctx.cameraFocus.y;
    } else {
      const aliveEnemies = this.ctx.enemies.filter((e) => e.alive);
      if (aliveEnemies.length > 0) {
        const boss = aliveEnemies.find((e) => e.def.isBoss);
        const focus = boss ?? aliveEnemies[0];
        targetX = this.ctx.squadAnchor.x * 0.62 + focus.x * 0.38;
        targetY = this.ctx.squadAnchor.y * 0.68 + focus.y * 0.32;
      }
    }

    const lerp = Math.min(1, realDt * 6.5);
    this.cameraX += (targetX - this.cameraX) * lerp;
    this.cameraY += (targetY - this.cameraY) * lerp;
    this.cameraZoom += (this.ctx.cameraZoomTarget - this.cameraZoom) * Math.min(1, realDt * 8);

    // Responsive camera scale for Mobile Portrait (390x844), Mobile Landscape (844x390), Tablet & Desktop
    let baseScale: number;
    if (viewW < viewH) {
      // Portrait mobile: pull camera back so 4-hero formation & boss telegraphs fit horizontally
      baseScale = Math.max(0.42, Math.min(0.85, viewW / 900));
    } else if (viewH < 520) {
      // Mobile landscape: pull back vertically so top HUD + bottom dock leave clear fighting lane
      baseScale = Math.max(0.46, Math.min(0.82, viewH / 740));
    } else {
      baseScale = Math.max(0.64, Math.min(1.05, Math.min(viewW / 1460, viewH / 840)));
    }
    const finalScale = baseScale * this.cameraZoom;

    let shakeX = 0;
    let shakeY = 0;
    if (this.ctx.cameraShake > 0.2) {
      shakeX = (Math.random() - 0.5) * 2 * this.ctx.cameraShake;
      shakeY = (Math.random() - 0.5) * 2 * this.ctx.cameraShake;
      this.ctx.cameraShake *= Math.pow(0.05, realDt);
    } else {
      this.ctx.cameraShake = 0;
    }

    this.world.scale.set(finalScale);
    this.world.position.set(
      viewW * 0.5 - this.cameraX * finalScale + shakeX,
      viewH * 0.52 - this.cameraY * finalScale + shakeY,
    );
  }

  private screenToWorld(clientX: number, clientY: number): { x: number; y: number } {
    const rect = this.app.canvas.getBoundingClientRect();
    const sx = clientX - rect.left;
    const sy = clientY - rect.top;
    const scale = this.world.scale.x || 1;
    return {
      x: (sx - this.world.position.x) / scale,
      y: (sy - this.world.position.y) / scale,
    };
  }

  private setupPointerEvents(): void {
    const canvas = this.app.canvas;
    canvas.style.touchAction = 'none';
    let isDraggingMove = false;
    let isDraggingAim = false;
    let joyOrigin: { x: number; y: number } | null = null;
    const JOY_MAX_R = 46;

    const setClampedMove = (pt: { x: number; y: number }) => {
      this.ctx.moveTarget = {
        x: Math.max(BOUNDS.minX + 60, Math.min(BOUNDS.maxX - 60, pt.x)),
        y: Math.max(BOUNDS.minY + 60, Math.min(BOUNDS.maxY - 60, pt.y)),
      };
    };

    canvas.addEventListener('pointermove', (e) => {
      const pt = this.screenToWorld(e.clientX, e.clientY);
      this.pointerWorld = pt;
      // Smooth mobile floating virtual joystick steering when thumb/pointer drags > 14px!
      if (isDraggingMove && joyOrigin && !this.skillExec.pendingAim) {
        const dx = e.clientX - joyOrigin.x;
        const dy = e.clientY - joyOrigin.y;
        const dist = Math.hypot(dx, dy);
        if (dist > 14) {
          const clamped = Math.min(dist, JOY_MAX_R);
          const nx = dx / dist;
          const ny = dy / dist;
          this.joystickVec = { x: nx, y: ny };
          useCombatStore.getState().setTouchJoystick({
            originX: joyOrigin.x,
            originY: joyOrigin.y,
            knobX: joyOrigin.x + nx * clamped,
            knobY: joyOrigin.y + ny * clamped,
          });
        }
      }
    });

    canvas.addEventListener('pointerdown', (e) => {
      const pt = this.screenToWorld(e.clientX, e.clientY);
      this.pointerWorld = pt;

      if (e.button === 2) {
        if (this.skillExec.pendingAim) {
          this.skillExec.cancelAiming();
          useCombatStore.getState().setAiming(null);
        } else {
          setClampedMove(pt);
          isDraggingMove = true;
          joyOrigin = { x: e.clientX, y: e.clientY };
        }
        return;
      }

      if (e.button === 0) {
        if (this.skillExec.pendingAim) {
          if (e.pointerType === 'touch') {
            // Touch aiming: drag finger to adjust telegraph, release to fire!
            isDraggingAim = true;
          } else {
            this.skillExec.confirmAim(this.ctx, pt.x, pt.y);
            useCombatStore.getState().setAiming(null);
          }
        } else {
          setClampedMove(pt);
          isDraggingMove = true;
          joyOrigin = { x: e.clientX, y: e.clientY };
        }
      }
    });

    const onPointerRelease = (e: PointerEvent) => {
      if (isDraggingAim && this.skillExec.pendingAim) {
        const pt = this.screenToWorld(e.clientX, e.clientY);
        this.skillExec.confirmAim(this.ctx, pt.x, pt.y);
        useCombatStore.getState().setAiming(null);
      }
      isDraggingMove = false;
      isDraggingAim = false;
      joyOrigin = null;
      this.joystickVec = null;
      useCombatStore.getState().setTouchJoystick(null);
    };

    canvas.addEventListener('pointerup', onPointerRelease);
    canvas.addEventListener('pointercancel', onPointerRelease);
  }

  private handleHotkey(e: KeyboardEvent): void {
    if (this.battleEnded) return;
    if (e.key === 'Escape') {
      if (this.skillExec.pendingAim) {
        this.skillExec.cancelAiming();
        useCombatStore.getState().setAiming(null);
      } else {
        useCombatStore.getState().togglePause();
      }
      return;
    }

    // 1-8 hotkeys map to Hero 1..4 S1/S2; Q/W/E/R trigger Hero 1..4 S1 or Ult with Shift
    const k = e.key.toLowerCase();
    const skillMap: Record<string, [number, 1 | 2 | 'ULT']> = {
      '1': [0, 1],
      '2': [0, 2],
      '3': [1, 1],
      '4': [1, 2],
      '5': [2, 1],
      '6': [2, 2],
      '7': [3, 1],
      '8': [3, 2],
      q: [0, 1],
      e: [1, 1],
      r: [2, 1],
      f: [3, 1],
    };

    if (e.key === 'Shift') {
      e.preventDefault();
      this.triggerSquadEvade();
      return;
    }

    if (k === ' ') {
      e.preventDefault();
      // Trigger first ready Ultimate!
      const readyHero = this.ctx.heroes.find((h) =>
        this.skillExec.canCast(this.ctx, h, 'ULT', h.def.ultimate),
      );
      if (readyHero) this.requestSkillAim(readyHero.heroId, 'ULT');
      return;
    }

    const mapped = skillMap[k];
    if (mapped) {
      const hero = this.ctx.heroes[mapped[0]];
      if (hero) this.requestSkillAim(hero.heroId, mapped[1]);
    }
  }

  public requestSkillAim(heroId: string, slot: 1 | 2 | 'ULT'): void {
    if (this.battleEnded) return;
    const hero = this.ctx.heroes.find((h) => h.heroId === heroId && h.alive);
    if (!hero) return;
    const skill = slot === 'ULT' ? hero.def.ultimate : hero.def.skills[slot - 1];

    // If clicking the same aiming skill again, auto-cast onto nearest enemy / squad!
    if (
      this.skillExec.pendingAim &&
      this.skillExec.pendingAim.heroId === heroId &&
      this.skillExec.pendingAim.slot === slot
    ) {
      const target = this.ctx.enemies.find((e) => e.alive && e.def.isBoss) ?? this.ctx.enemies.find((e) => e.alive);
      this.skillExec.confirmAim(
        this.ctx,
        target ? target.x : hero.x + 120,
        target ? target.y : hero.y,
      );
      useCombatStore.getState().setAiming(null);
      return;
    }

    const started = this.skillExec.startAiming(this.ctx, heroId, slot);
    if (started && this.skillExec.pendingAim) {
      useCombatStore.getState().setAiming({ heroId, skillSlot: slot, skillName: skill.name });
    } else {
      useCombatStore.getState().setAiming(null);
    }
  }

  public forceFinishCurrentBattle(): void {
    if (!this.battleEnded) {
      this.finishBattle(true);
    }
  }

  private checkBattleProgress(dt: number, realDt: number): void {
    const stage = resolveAnyStageDef(this.stageId);
    const aliveHeroes = this.ctx.heroes.filter((h) => h.alive);
    if (aliveHeroes.length === 0) {
      this.finishBattle(Boolean(stage.isWorldBoss || stage.isSandbox));
      return;
    }

    // Never cut off an active Anime Ultimate Cut-In / Skyfall Payload mid-sequence!
    if (this.ultDirector.isRunning()) return;

    // Timed Endgame Mode completion (90s World Boss Raid / Timed Training Sandbox)
    if (stage.isWorldBoss && this.elapsedSec >= (stage.raidTimeLimitSec ?? 90)) {
      this.finishBattle(true);
      return;
    }
    if (
      stage.isSandbox &&
      (stage.sandboxDurationSec ?? 0) > 0 &&
      this.elapsedSec >= (stage.sandboxDurationSec ?? 0)
    ) {
      this.finishBattle(true);
      return;
    }

    const aliveEnemies = this.ctx.enemies.filter((e) => e.alive);
    if (aliveEnemies.length === 0) {
      if (this.waveIndex + 1 < stage.waves.length) {
        this.waveTransitionTimer += dt;
        if (this.waveTransitionTimer >= 1.1) {
          this.waveTransitionTimer = 0;
          // Clean up dead enemy containers from previous wave
          for (const e of this.ctx.enemies) e.container.destroy({ children: true });
          this.ctx.enemies = [];
          this.spawnWave(this.waveIndex + 1);
        }
      } else {
        // Dramatic 0.78s Anime Finisher Slow-Mo linger so player witnesses final Skill/Ult VFX detonation!
        this.victoryLingerTimer += realDt;
        if (this.victoryLingerTimer >= 0.78) {
          this.finishBattle(true);
        }
      }
    }
  }

  private finishBattle(victory: boolean): void {
    if (this.battleEnded) return;
    this.battleEnded = true;
    this.skillExec.cancelAiming();
    this.ultDirector.forceClear(this.ctx);

    const player = usePlayerStore.getState();
    player.recordDefeatedEnemies(Array.from(this.ctx.defeatedEnemyIds));

    const stage = resolveAnyStageDef(this.stageId);
    const isFirstClear =
      victory &&
      (stage.isSpire
        ? (stage.spireFloor ?? 0) > (player.spireHighestFloor ?? 0)
        : !stage.isDungeon && !player.clearedStages.includes(stage.id));
    const aliveHeroCount = this.ctx.heroes.filter((h) => h.alive).length;
    const starsEarned = !victory ? 0 : aliveHeroCount >= 4 ? 3 : aliveHeroCount >= 3 ? 2 : 1;
    const randBetween = ([a, b]: [number, number]) =>
      Math.round(a + Math.random() * (b - a));

    const droppedEquipment: EquipmentInstance[] = [];
    const essencesEarned: Partial<Record<Faction, number>> = {};
    const droppedRelics: DroppedRelicSummary[] = [];
    let starIronIngotsEarned = 0;
    let astralAnvilCoresEarned = 0;
    let starCoresEarned = 0;
    let relicFragmentsEarned = 0;

    if (victory) {
      const targetSets = stage.rewards.targetSetIds;
      const dropChance = stage.rewards.equipmentDropChance ?? 1.0;
      const rollGearDrop = () => {
        const rarity = rollWeightedRarity(stage.rewards.rarityWeights);
        const setId =
          targetSets.length > 0
            ? targetSets[Math.floor(Math.random() * targetSets.length)]
            : undefined;
        droppedEquipment.push(generateEquipment({ rarity, setId }));
      };
      for (let i = 0; i < stage.rewards.equipmentDrops; i++) {
        if (dropChance >= 1 || Math.random() < dropChance) {
          rollGearDrop();
        }
      }
      if (
        (stage.rewards.bonusEquipmentDropChance ?? 0) > 0 &&
        Math.random() < (stage.rewards.bonusEquipmentDropChance ?? 0)
      ) {
        rollGearDrop();
      }

      // Biome Primary Faction Essence + Bonus Secondary Essence (prevents early-game soft-lock!)
      const primaryQty = randBetween(stage.rewards.primaryEssenceQty);
      if (primaryQty > 0) {
        essencesEarned[stage.rewards.primaryEssence] =
          (essencesEarned[stage.rewards.primaryEssence] ?? 0) + primaryQty;
      }

      if ((stage.rewards.bonusRandomEssenceChance ?? 0) > 0 && Math.random() < (stage.rewards.bonusRandomEssenceChance ?? 0)) {
        const allFactions: Faction[] = ['SOLARIS', 'ASTRAL', 'VERDANT', 'ASHEN'];
        const otherFactions = allFactions.filter((f) => f !== stage.rewards.primaryEssence);
        const bonusFac = otherFactions[Math.floor(Math.random() * otherFactions.length)];
        const bonusQty = stage.isBossStage ? 2 : 1;
        essencesEarned[bonusFac] = (essencesEarned[bonusFac] ?? 0) + bonusQty;
      }

      if (stage.rewards.starIronIngots) {
        starIronIngotsEarned = randBetween(stage.rewards.starIronIngots);
      }
      if (stage.rewards.astralAnvilCores) {
        astralAnvilCoresEarned = randBetween(stage.rewards.astralAnvilCores);
      }
      if (stage.rewards.starCores) {
        starCoresEarned = randBetween(stage.rewards.starCores);
      }
      if (stage.rewards.relicFragments) {
        relicFragmentsEarned = randBetween(stage.rewards.relicFragments);
      }

      // Earned Relic Drops: Guaranteed First-Clear Boss/Mini-Boss Milestones + Repeatable Drop Pool!
      const recordRelicDrop = (relicId: string) => {
        const alreadyOwned = player.ownedRelics.includes(relicId);
        const curRank = player.relicRanks[relicId] ?? 0;
        const nextRank = alreadyOwned ? Math.min(MAX_RELIC_RANK, curRank + 1) : 1;
        const isMaxed = alreadyOwned && curRank >= MAX_RELIC_RANK;
        droppedRelics.push({
          relicId,
          isNew: !alreadyOwned,
          newRank: nextRank,
          bonusFragments: isMaxed ? 15 : undefined,
        });
      };

      if (isFirstClear && stage.rewards.guaranteedFirstClearRelicId) {
        recordRelicDrop(stage.rewards.guaranteedFirstClearRelicId);
      } else if (
        stage.rewards.relicDropPool &&
        stage.rewards.relicDropPool.length > 0 &&
        Math.random() < (stage.rewards.relicDropChance ?? 0)
      ) {
        const pool = stage.rewards.relicDropPool;
        const picked = pool[Math.floor(Math.random() * pool.length)];
        if (picked) recordRelicDrop(picked);
      }
    }

    const damageByHero: Record<string, number> = {};
    const healingByHero: Record<string, number> = {};
    let mvpHeroId = this.ctx.heroes[0]?.heroId ?? 'vaelen';
    let bestScore = -1;
    for (const h of this.ctx.heroes) {
      damageByHero[h.heroId] = Math.round(h.totalDamage);
      healingByHero[h.heroId] = Math.round(h.totalHealing);
      const score = h.totalDamage + h.totalHealing * 1.15;
      if (score > bestScore) {
        bestScore = score;
        mvpHeroId = h.heroId;
      }
    }

    // Calculate per-hero Combat EXP & automatic Level Ups (respecting Awakening Level Cap!)
    const heroExpResults: Record<string, HeroBattleExpResult> = {};
    const baseStageHeroExp = victory
      ? Math.round(
          getStageCombatHeroExp(
            stage.chapter,
            stage.stageNumber,
            stage.isMiniBoss,
            stage.isBossStage,
          ) * (stage.combatExpMultiplier ?? 1.0),
        )
      : 0;

    for (const h of this.ctx.heroes) {
      const owned = player.roster[h.heroId];
      if (!owned) continue;
      const levelCap = getHeroLevelCap(owned.awakening, Boolean(owned.transcended));
      const prevLevel = owned.level;
      const prevExp = owned.exp ?? 0;
      const expGained = victory
        ? Math.round(baseStageHeroExp * (h.heroId === mvpHeroId ? 1.15 : 1.0))
        : 0;

      let curLevel = prevLevel;
      let curExp = prevExp + expGained;
      let expToNext = getExpToNextLevel(curLevel);

      while (curLevel < levelCap && curExp >= expToNext) {
        curExp -= expToNext;
        curLevel += 1;
        expToNext = getExpToNextLevel(curLevel);
      }

      const atLevelCap = curLevel >= levelCap;
      if (atLevelCap) {
        curExp = Math.min(curExp, expToNext);
      }

      heroExpResults[h.heroId] = {
        heroId: h.heroId,
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
    }

    const reportHeroes = this.ctx.heroes.map((h) => ({
      heroId: h.heroId,
      damageDealt: Math.round(h.totalDamage),
      healingDone: Math.round(h.totalHealing),
      damageTaken: Math.round(h.totalDamageTaken),
      shieldGranted: Math.round(h.totalShieldGranted),
      critHits: h.critHits,
      totalHits: h.totalHits,
      staggerDealt: Math.round(h.staggerDealt),
      ultCasts: h.ultCasts,
    }));

    const totalDamageAll = reportHeroes.reduce((s, r) => s + r.damageDealt, 0);
    const raidDamageScore = stage.isWorldBoss
      ? Math.round(totalDamageAll * (stage.raidScoreMultiplier ?? 1) + this.raidBarsCleared * 15000)
      : undefined;
    const raidRankLabel =
      stage.isWorldBoss && raidDamageScore !== undefined
        ? getRaidRankForScore(raidDamageScore).label
        : undefined;
    const labyrinthSurvivingHpRatios = stage.isLabyrinth
      ? Object.fromEntries(
          this.ctx.heroes.map((h) => [
            h.heroId,
            h.alive ? Math.max(0.05, Number((h.hp / Math.max(1, h.maxHp)).toFixed(3))) : 0,
          ]),
        )
      : undefined;

    const isZeroLootMode = Boolean(stage.isSandbox);
    const summary: CombatLootSummary = {
      victory,
      stageId: stage.id,
      stageName: `${stage.code} ${stage.name}`,
      difficulty: stage.difficulty,
      durationSec: Math.round(this.elapsedSec),
      damageByHero,
      healingByHero,
      heroExpResults: isZeroLootMode ? undefined : heroExpResults,
      battleReport: {
        heroes: reportHeroes,
        totalDamage: totalDamageAll,
        totalHealing: reportHeroes.reduce((s, r) => s + r.healingDone, 0),
        totalDamageTaken: reportHeroes.reduce((s, r) => s + r.damageTaken, 0),
        maxCombo: this.maxCombo,
        perfectDodges: this.perfectDodgesCount,
        bossBreaks: this.bossBreaksCount,
        linkBursts: this.linkBurstsCount,
      },
      goldEarned: victory && !isZeroLootMode ? randBetween(stage.rewards.gold) : 0,
      crystalsEarned:
        stage.isDungeon || stage.isWorldBoss || stage.isLabyrinth || stage.isSandbox
          ? 0
          : isFirstClear
            ? stage.firstClearCrystals
            : victory
              ? (stage.repeatCrystals ?? 40)
              : 0,
      expPotionsEarned: victory && !isZeroLootMode ? randBetween(stage.rewards.expPotions) : 0,
      forgeStonesEarned: victory && !isZeroLootMode ? randBetween(stage.rewards.forgeStones) : 0,
      starIronIngotsEarned: isZeroLootMode ? 0 : starIronIngotsEarned,
      astralAnvilCoresEarned: isZeroLootMode ? 0 : astralAnvilCoresEarned,
      starCoresEarned: isZeroLootMode ? 0 : starCoresEarned,
      relicFragmentsEarned: isZeroLootMode ? 0 : relicFragmentsEarned,
      essencesEarned: isZeroLootMode ? {} : essencesEarned,
      bondGiftsEarned:
        victory && !isZeroLootMode
          ? stage.rewards.bondGiftsRange
            ? randBetween(stage.rewards.bondGiftsRange)
            : stage.isDungeon || stage.isWorldBoss || stage.isLabyrinth
              ? 0
              : stage.isBossStage
                ? 2
                : stage.isMiniBoss || Math.random() < 0.35
                  ? 1
                  : 0
          : 0,
      isFirstClear: isZeroLootMode ? false : isFirstClear,
      isDungeon: stage.isDungeon,
      dungeonId: stage.dungeonId,
      dungeonTier: stage.dungeonTier,
      isSpire: stage.isSpire,
      spireFloor: stage.spireFloor,
      isWorldBoss: stage.isWorldBoss,
      worldBossId: stage.worldBossId,
      raidDamageScore,
      raidBarsCleared: stage.isWorldBoss ? this.raidBarsCleared : undefined,
      raidRankLabel,
      isLabyrinth: stage.isLabyrinth,
      labyrinthNodeId: stage.labyrinthNodeId,
      labyrinthSurvivingHpRatios,
      isSandbox: stage.isSandbox,
      starsEarned,
      droppedEquipment: isZeroLootMode ? [] : droppedEquipment,
      droppedRelics: isZeroLootMode ? [] : droppedRelics,
    };

    if (victory && !isZeroLootMode) {
      player.applyCombatRewards(summary);
      audioManager.setBossEnrage(false);
      audioManager.playSfx('victory', 0);
    } else if (victory) {
      audioManager.setBossEnrage(false);
      audioManager.playSfx('victory', 0);
    } else {
      audioManager.setBossEnrage(false);
    }

    this.syncHudSnapshot(true);
    useCombatStore.getState().setCombatResult(summary);
  }

  private syncHudSnapshot(_force: boolean): void {
    const heroesSnap: HeroCombatSnapshot[] = this.ctx.heroes.map((h) => {
      let stacksLabel: string | undefined;
      let stacksCount: number | undefined;
      if (h.heroId === 'astraea') {
        stacksLabel = h.ascensionTimer > 0 ? 'ASCEND' : 'BLADES';
        stacksCount = h.ascensionTimer > 0 ? Math.ceil(h.ascensionTimer) : h.starlightBlades;
      } else if (h.heroId === 'velaris') {
        const triggerEvery = h.transcended ? 2 : 3;
        stacksLabel = h.overdriveTimer > 0 ? 'ECLIPSE' : 'RIFT';
        stacksCount = h.overdriveTimer > 0 ? Math.ceil(h.overdriveTimer) : h.basicCount % triggerEvery;
      } else if (h.heroId === 'vespera') {
        stacksLabel = 'HEAT';
        stacksCount = h.heatRounds;
      } else if (h.heroId === 'seraphina') {
        stacksLabel = 'ORBS';
        stacksCount = h.starOrbs;
      } else if (h.heroId === 'draven') {
        stacksLabel = 'HEAT';
        stacksCount = h.heatStacks;
      } else if (h.heroId === 'kael') {
        stacksLabel = 'WIND';
        stacksCount = h.tailwindStacks;
      }

      const activeBuffs: string[] = [];
      if (h.overdriveTimer > 0) activeBuffs.push('OVERDRIVE');
      if (h.invincibleTimer > 0) activeBuffs.push('INVINCIBLE');
      if (h.undyingTimer > 0) activeBuffs.push('UNDYING');
      if (h.atkBuffTimer > 0) activeBuffs.push('ATK+');
      if (h.dmgReduceTimer > 0) activeBuffs.push('DEF+');

      return {
        heroId: h.heroId,
        name: h.def.name,
        tier: h.def.tier,
        role: h.def.role,
        faction: h.def.faction,
        themeColor: h.def.themeColor,
        hp: Math.round(h.hp),
        maxHp: h.maxHp,
        shield: Math.round(h.shield),
        alive: h.alive,
        cd1: Number(h.cd1.toFixed(1)),
        maxCd1: Math.max(1.2, h.def.skills[0].cooldown * (1 - h.stats.cdr)),
        cd2: Number(h.cd2.toFixed(1)),
        maxCd2: Math.max(1.2, h.def.skills[1].cooldown * (1 - h.stats.cdr)),
        ultCd: Number(h.ultCd.toFixed(1)),
        maxUltCd: h.maxUltCd,
        ultGaugeCost: h.def.ultimate.gaugeCost ?? 45,
        stacksLabel,
        stacksCount,
        activeBuffs,
        transcended: h.transcended,
        cardAsset: h.resolvedCardAsset ?? h.def.assets.card,
      };
    });

    const activePetSnap: PetCombatSnapshot | null = this.petUnit
      ? {
          petId: this.petUnit.petId,
          name: this.petUnit.def.name,
          tier: this.petUnit.def.tier,
          themeColor: this.petUnit.def.themeColor,
          cardAsset: this.petUnit.def.assets.card,
          spriteAsset: this.petUnit.def.assets.sprite,
          skillName: this.petUnit.def.activeSkill.name,
          cd: Number(this.petUnit.cd.toFixed(1)),
          maxCd: this.petUnit.maxCd,
          rank: this.petUnit.rank,
          level: this.petUnit.level,
        }
      : null;

    const activeStage = resolveAnyStageDef(this.stageId);
    const bossUnit = this.ctx.enemies.find((e) => e.def.isBoss && e.alive);
    let bossSnap: BossCombatSnapshot | null = null;
    if (bossUnit) {
      bossSnap = {
        enemyId: bossUnit.def.id,
        name: activeStage.bossNameOverride ?? bossUnit.def.name,
        title: activeStage.bossTitleOverride ?? bossUnit.def.title,
        hp: Math.round(bossUnit.hp),
        maxHp: bossUnit.maxHp,
        phase: bossUnit.phase,
        enraged: bossUnit.enraged,
        isCasting: bossUnit.isCasting,
        castName: bossUnit.castName,
        castProgress: bossUnit.isCasting
          ? Math.min(1, bossUnit.castElapsed / Math.max(0.1, bossUnit.castDuration))
          : 0,
        castCancelable: bossUnit.castCancelable,
        isBroken: bossUnit.isBroken,
        brokenTimer: Number(bossUnit.brokenTimer.toFixed(1)),
        brokenMaxTimer: bossUnit.brokenMaxTimer,
        breakGauge: Math.round(bossUnit.breakGauge),
        maxBreakGauge: bossUnit.maxBreakGauge,
        hitShield: bossUnit.hitShield,
        maxHitShield: bossUnit.maxHitShield,
        burnStacks: bossUnit.burnStacks,
        defShredActive: bossUnit.defShredTimer > 0,
      };
    }

    const linkPartner =
      this.ctx.linkWindowTimer > 0 && this.ctx.linkPartnerHeroId
        ? this.ctx.heroes.find((h) => h.heroId === this.ctx.linkPartnerHeroId) ?? null
        : null;

    const safeElapsed = Math.max(0.5, this.elapsedSec);
    const liveTotalDamage = this.ctx.heroes.reduce((s, h) => s + Math.round(h.totalDamage), 0);
    const liveSquadDps = Math.round(liveTotalDamage / safeElapsed);
    const liveDpsEntries: LiveDpsEntry[] = this.ctx.heroes
      .map((h) => {
        const dmg = Math.round(h.totalDamage);
        return {
          heroId: h.heroId,
          name: h.def.name,
          cardAsset: h.resolvedCardAsset ?? h.def.assets.card,
          themeColor: h.def.themeColor,
          totalDamage: dmg,
          dps: Math.round(dmg / safeElapsed),
          sharePct: liveTotalDamage > 0 ? Math.round((dmg / liveTotalDamage) * 100) : 0,
          critRatePct: h.totalHits > 0 ? Math.round((h.critHits / h.totalHits) * 100) : 0,
        };
      })
      .sort((a, b) => b.totalDamage - a.totalDamage);

    this.raidTotalScore = activeStage.isWorldBoss
      ? Math.round(
          liveTotalDamage * (activeStage.raidScoreMultiplier ?? 1) +
            this.raidBarsCleared * 15000,
        )
      : 0;
    const raidRank = getRaidRankForScore(this.raidTotalScore);
    const raidLimit = activeStage.raidTimeLimitSec ?? 90;
    const sandboxLimit = activeStage.isSandbox ? (activeStage.sandboxDurationSec ?? 0) : 0;
    const activeTimerLimit = activeStage.isWorldBoss ? raidLimit : sandboxLimit;

    useCombatStore.getState().setSnapshot({
      elapsedSec: Math.floor(this.elapsedSec),
      isWorldBoss: Boolean(activeStage.isWorldBoss),
      isLabyrinth: Boolean(activeStage.isLabyrinth),
      isSandbox: Boolean(activeStage.isSandbox),
      raidTimeLimitSec: activeStage.isWorldBoss ? raidLimit : 0,
      raidTimeRemaining: activeTimerLimit > 0 ? Math.max(0, activeTimerLimit - this.elapsedSec) : 0,
      raidTotalScore: this.raidTotalScore,
      raidBarsCleared: this.raidBarsCleared,
      raidRankLabel: raidRank.label,
      raidRankColor: raidRank.color,
      sandboxDurationSec: sandboxLimit,
      liveDpsEntries,
      liveTotalDamage,
      liveSquadDps,
      sp: Number(this.ctx.sp.toFixed(2)),
      ultGauge: Number(this.ctx.ultGauge.toFixed(1)),
      maxUltGauge: this.ctx.maxUltGauge,
      globalUltCd: Number(this.ctx.globalUltCd.toFixed(1)),
      fps: Math.round(this.fpsSamples),
      comboCount: this.comboCount,
      comboDecayRatio: this.comboCount > 0 ? Math.max(0, Math.min(1, this.comboTimer / 2.6)) : 0,
      evadeCd: Number(this.evadeCooldown.toFixed(1)),
      evadeMaxCd: this.evadeMaxCooldown,
      inDangerZone: this.isSquadInDangerZone(),
      linkWindow: linkPartner
        ? {
            partnerHeroId: linkPartner.heroId,
            partnerHeroName: linkPartner.def.name,
            partnerThemeColor: linkPartner.def.themeColor,
            remaining: Number(this.ctx.linkWindowTimer.toFixed(1)),
            maxDuration: this.linkWindowDuration,
          }
        : null,
      heroes: heroesSnap,
      activePet: activePetSnap,
      boss: bossSnap,
    });
  }

  public destroy(): void {
    this.destroyed = true;
    this.petUnit = null;
    if (this.bannerClearHandle) window.clearTimeout(this.bannerClearHandle);
    if (this.calloutClearHandle) window.clearTimeout(this.calloutClearHandle);
    if (this.bossWarnClearHandle) window.clearTimeout(this.bossWarnClearHandle);
    if (this.waveBannerClearHandle) window.clearTimeout(this.waveBannerClearHandle);
    if (this.perfectDodgeClearHandle) window.clearTimeout(this.perfectDodgeClearHandle);
    if (this.linkBurstClearHandle) window.clearTimeout(this.linkBurstClearHandle);
    this.weatherSystem?.destroy();
    this.weatherSystem = null;
    useCombatStore.getState().setTouchJoystick(null);
    useCombatStore.getState().setPerfectDodge(false);
    useCombatStore.getState().setLinkWindow(null);
    useCombatStore.getState().setActiveLinkBurst(null);
    useCombatStore.getState().setActiveBanter(null);
    useCombatStore.getState().setBossWarning(null);
    useCombatStore.getState().setWaveBanner(null);
    useCombatStore.getState().setCombatResult(null);
    window.removeEventListener('keydown', this.boundKeyDown);
    if (this.canvasEl) {
      this.canvasEl.removeEventListener('contextmenu', this.boundContextMenu);
      this.canvasEl = null;
    }
    this.squadCtrl.destroy();
    if (this.ctx) {
      for (const h of this.ctx.heroes) {
        if (!h.liveMesh.mesh.destroyed) h.liveMesh.mesh.filters = null;
      }
      for (const e of this.ctx.enemies) {
        if (!e.liveMesh.mesh.destroyed) e.liveMesh.mesh.filters = null;
      }
      this.ultDirector.forceClear(this.ctx);
      this.ctx.delayedStrikes = [];
      this.ctx.zones = [];
      this.ctx.telegraphs = [];
    }
    this.pool.destroy();
    releaseCombatTextures();
    if (this.appReady) {
      this.appReady = false;
      try {
        this.app.destroy(true, { children: true });
      } catch {
        // Safe teardown
      }
    }
  }
}
