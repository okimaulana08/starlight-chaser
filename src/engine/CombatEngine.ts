import { Application, Container, Graphics, Sprite } from 'pixi.js';
import { ENEMY_MAP } from '../data/enemies';
import { generateEquipment } from '../data/equipment';
import { FACTIONS } from '../data/factions';
import { HERO_MAP } from '../data/heroes';
import {
  getExpToNextLevel,
  getHeroLevelCap,
  getStageCombatHeroExp,
} from '../data/materials';
import { STAGE_MAP } from '../data/stages';
import { useCombatStore } from '../store/useCombatStore';
import { usePlayerStore, MAX_RELIC_RANK } from '../store/usePlayerStore';
import type {
  BossCombatSnapshot,
  CombatLootSummary,
  DroppedRelicSummary,
  EquipmentInstance,
  EquipmentRarity,
  Faction,
  HeroBattleExpResult,
  HeroCombatSnapshot,
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
import { audioManager } from './AudioManager';
import {
  calculateCombatDamage,
  computeHeroStats,
  getActiveFactionBonuses,
} from './CombatMath';
import type { CombatContext, EnemyUnit, GroundZone, HeroUnit } from './CombatTypes';
import { EnemyAI } from './EnemyAI';
import { getHeroHitStyle } from './HeroVfxChoreographer';
import { ObjectPool } from './ObjectPool';
import { SkillExecutor } from './SkillExecutor';
import { SquadController } from './SquadController';
import { UltimateDirector } from './UltimateDirector';

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
  private clouds: Array<{ gfx: Graphics; speed: number }> = [];
  private ambientMotes: Array<{ gfx: Graphics; vx: number; vy: number; phase: number }> = [];

  private pool = new ObjectPool();
  private squadCtrl = new SquadController();
  private skillExec = new SkillExecutor();
  private enemyAI = new EnemyAI();
  private ultDirector = new UltimateDirector();

  private ctx!: CombatContext;
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
  private comboTimer = 0;
  private hitstopTimer = 0;
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
    const stage = STAGE_MAP[this.stageId] ?? STAGE_MAP.stage_1_1;
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

    // 2. Subtle floating ambient Starlight Motes themed to the active Region biome
    for (let i = 0; i < 36; i++) {
      const m = new Graphics();
      const isPrimary = i % 2 === 0;
      m.circle(0, 0, 2.2 + Math.random() * 2.6).fill({
        color: isPrimary ? moteColorA : moteColorB,
        alpha: 0.72,
      });
      m.blendMode = 'add';
      m.position.set(
        BOUNDS.minX + Math.random() * (BOUNDS.maxX - BOUNDS.minX),
        BOUNDS.minY + Math.random() * (BOUNDS.maxY - BOUNDS.minY),
      );
      this.ambientLayer.addChild(m);
      this.ambientMotes.push({
        gfx: m,
        vx: (Math.random() - 0.5) * 18,
        vy: -(12 + Math.random() * 22),
        phase: Math.random() * Math.PI * 2,
      });
    }
  }

  private setupCombatContext(): void {
    const stage = STAGE_MAP[this.stageId] ?? STAGE_MAP.stage_1_1;
    useCombatStore.getState().resetForStage(stage.id, `${stage.code} ${stage.name}`, stage.waves.length);

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
      maxUltGauge: 40,
      timeScale: 1.0,
      cameraShake: 0,
      cameraZoomTarget: 1.0,
      cameraFocus: null,
      ultActive: false,
      defeatedEnemyIds: new Set(),

      addSp: (amount) => {
        this.ctx.sp = Math.min(this.ctx.maxSp, Math.max(0, this.ctx.sp + amount));
      },
      addUltGauge: (amount, bonusMult = 1) => {
        this.ctx.ultGauge = Math.min(this.ctx.maxUltGauge, this.ctx.ultGauge + amount * bonusMult);
      },
      triggerShake: (amount) => {
        this.ctx.cameraShake = Math.max(this.ctx.cameraShake, amount);
      },
      spawnDamageText: (x, y, text, color, isCrit) => {
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
          cardAsset: hero.def.assets.card,
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
        this.ultDirector.start(this.ctx, hero, skill, tx, ty, (h, sk, x, y) => {
          this.skillExec.executeSkillPayload(this.ctx, h, sk, 'ULT', x, y);
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
    const squadIds = player.squadIds;
    let totalStartingGauge = 0;

    squadIds.forEach((heroId, idx) => {
      const def = HERO_MAP[heroId];
      const owned = player.roster[heroId];
      if (!def || !owned) return;

      const stats = computeHeroStats(
        def,
        owned,
        player.equipmentInventory,
        squadIds,
        player.unlockedCodexIds.length,
        player.relicRanks,
      );
      totalStartingGauge += stats.startingGauge;

      const container = new Container();
      const auraGfx = new Graphics();
      const tex = getProceduralHeroTexture(this.app.renderer, def);
      const sprite = new Sprite(tex);
      sprite.anchor.set(0.5, 0.92);
      sprite.scale.set(0.9);
      const weaponGfx = buildHeroWeaponGraphic(def.role, def.themeColor);
      weaponGfx.position.set(34, -36);
      const hpBarGfx = new Graphics();

      // Grounded shadow beneath boots
      const heroShadow = new Graphics();
      heroShadow.ellipse(0, 2, 34, 11).fill({ color: 0x050814, alpha: 0.42 });

      // Fallback portrait crest container (auto-hidden when real full-body battle sprite loads!)
      const fallbackCrestGroup = new Container();
      attachHeroPortraitCrest(fallbackCrestGroup, def);

      container.addChild(heroShadow);
      container.addChild(auraGfx);
      container.addChild(sprite);
      container.addChild(fallbackCrestGroup);
      container.addChild(weaponGfx);
      container.addChild(hpBarGfx);
      this.actorLayer.addChild(container);

      const x = this.ctx.squadAnchor.x + (idx === 0 ? 60 : idx === 3 ? -60 : 0);
      const y = this.ctx.squadAnchor.y + (idx === 1 ? -54 : idx === 2 ? 54 : 0);
      container.position.set(x, y);

      const startShield = Math.round(stats.maxHp * stats.startShieldRatio * stats.shieldPower);

      const heroUnit: HeroUnit = {
        heroId,
        def,
        stats,
        relicId: owned.equippedRelicId,
        slotIndex: idx,
        x,
        y,
        vx: 0,
        vy: 0,
        facing: 1,
        hp: stats.maxHp,
        maxHp: stats.maxHp,
        shield: startShield,
        shieldStoredKinetic: 0,
        shieldCounterBurn: false,
        alive: true,
        cd1: 0,
        cd2: 0,
        basicTimer: 0.25 + idx * 0.1,
        basicCount: 0,
        starOrbs: heroId === 'seraphina' ? 1 : 0,
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
        totalDamage: 0,
        totalHealing: 0,
        container,
        sprite,
        fallbackCrestGroup,
        hasFullSprite: false,
        baseScaleY: 0.9,
        weaponGfx,
        hpBarGfx,
        auraGfx,
      };
      this.ctx.heroes.push(heroUnit);

      // Load real full-body transparent anime battle sprite if present!
      const spriteUrl = `/assets/sprites/battle_${def.id}.webp`;
      tryLoadPixiTexture(spriteUrl).then((loaded) => {
        if (!loaded || this.destroyed || sprite.destroyed) return;
        sprite.texture = loaded;
        const targetH = def.role === 'TANK' ? 152 : 142;
        const sc = targetH / Math.max(1, loaded.height);
        sprite.scale.set(sc);
        sprite.anchor.set(0.5, 0.95);
        heroUnit.hasFullSprite = true;
        heroUnit.baseScaleY = sc;
        fallbackCrestGroup.visible = false;
        weaponGfx.visible = false;
      });
    });

    // Start every expedition with 16/40 (40%) Chaser Resonance + Relic startingGauge so Ultimates shine every battle!
    this.ctx.ultGauge = Math.min(this.ctx.maxUltGauge, 16 + totalStartingGauge);
  }

  private spawnWave(index: number): void {
    const stage = STAGE_MAP[this.stageId] ?? STAGE_MAP.stage_1_1;
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
        const container = new Container();
        const tex = getProceduralEnemyTexture(this.app.renderer, def);
        const sprite = new Sprite(tex);
        sprite.anchor.set(0.5, 0.94);
        const defaultScale = def.isBoss ? 1.05 : def.scale * 0.86;
        sprite.scale.set(defaultScale);

        // Grounded contact shadow beneath every enemy & boss
        const shadowGfx = new Graphics();
        if (def.isBoss) {
          shadowGfx.ellipse(0, 4, 92, 26).fill({ color: 0x07040f, alpha: 0.48 });
          shadowGfx.ellipse(0, 4, 100, 30).stroke({ color: 0xd946ef, width: 3, alpha: 0.65 });
        } else if (def.isMiniBoss) {
          shadowGfx.ellipse(0, 3, 52, 16).fill({ color: 0x07040f, alpha: 0.45 });
        } else {
          shadowGfx.ellipse(0, 2, 32, 10).fill({ color: 0x07040f, alpha: 0.42 });
        }

        const hpBarGfx = new Graphics();
        const statusGfx = new Graphics();
        container.addChild(shadowGfx);
        container.addChild(sprite);
        container.addChild(hpBarGfx);
        container.addChild(statusGfx);
        this.actorLayer.addChild(container);

        const spawnX = def.isBoss
          ? 1620
          : Math.min(BOUNDS.maxX - 120, Math.max(BOUNDS.minX + 460, this.ctx.squadAnchor.x + 480 + (spawnIdx % 3) * 115));
        const spawnY = def.isBoss
          ? 740
          : BOUNDS.minY + 130 + ((spawnIdx * 173) % (BOUNDS.maxY - BOUNDS.minY - 260));
        spawnIdx++;

        container.position.set(spawnX, spawnY);
        this.pool.spawnRingWave(spawnX, spawnY, def.isBoss ? 170 : 75, 0xd946ef, 0.45);

        const stageScale = stage.enemyScale ?? 1.0;
        const scaledHp = Math.max(120, Math.round(def.hp * stageScale));
        const scaledAtk = Math.max(18, Math.round(def.atk * Math.pow(stageScale, 0.8)));
        const scaledDef = Math.max(25, Math.round(def.def * Math.pow(stageScale, 0.65)));

        const enemyUnit: EnemyUnit = {
          uid: `en_${index}_${spawnIdx}_${Math.random().toString(36).slice(2, 6)}`,
          def,
          x: spawnX,
          y: spawnY,
          facing: -1,
          hp: scaledHp,
          maxHp: scaledHp,
          atk: scaledAtk,
          defStat: scaledDef,
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
          hitShield: 0,
          maxHitShield: 0,
          hitFlashTimer: 0,
          animTime: Math.random() * 4,
          baseScaleY: defaultScale,
          container,
          sprite,
          hpBarGfx,
          statusGfx,
        };
        this.ctx.enemies.push(enemyUnit);

        // Auto-load real transparent WebP sprite for ALL enemies (Minions + All 10 Chapter Bosses!)
        const enemySpriteUrl = def.isBoss && stage.bossAssetOverride ? stage.bossAssetOverride : def.assetKey;
        if (enemySpriteUrl.startsWith('/assets/')) {
          tryLoadPixiTexture(enemySpriteUrl).then((loaded) => {
            if (!loaded || this.destroyed || sprite.destroyed) return;
            sprite.texture = loaded;
            const targetSize = def.isBoss
              ? 285
              : def.isMiniBoss
                ? 186
                : def.attackRange > 100
                  ? 136
                  : 126;
            const sc = targetSize / Math.max(1, loaded.height);
            sprite.scale.set(sc);
            sprite.anchor.set(0.5, 0.95);
            enemyUnit.baseScaleY = sc;
          });
        }
      }
    }

    if (hasBoss) {
      audioManager.playBgm('boss');
      const bossUnit = this.ctx.enemies.find((e) => e.def.isBoss && e.alive);
      if (bossUnit) {
        this.ctx.triggerShake(7);
        useCombatStore.getState().setBossWarning({
          id: Date.now(),
          name: stage.bossNameOverride ?? bossUnit.def.name,
          title: stage.bossTitleOverride ?? bossUnit.def.title,
        });
        if (this.bossWarnClearHandle) window.clearTimeout(this.bossWarnClearHandle);
        this.bossWarnClearHandle = window.setTimeout(() => {
          useCombatStore.getState().setBossWarning(null);
        }, 2150);
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

    // Crit rate & Crit DMG with buffs + zones (Orion Beacon / Draven Caldera / Blade of First Eclipse)
    let critRate = attacker.stats.critRate + (opts.bonusCritRate ?? 0);
    let critDmg = attacker.stats.critDmg + attacker.eclipseCritStacks * 0.08;
    if (attacker.critBuffTimer > 0) critRate += attacker.critBuffValue;

    for (const z of this.ctx.zones) {
      if (z.kind === 'ASTRAL_BEACON' && Math.hypot(attacker.x - z.x, attacker.y - z.y) <= z.radius) {
        critRate += 0.18;
      }
      if (z.kind === 'LAVA_CALDERA' && enemy.burnStacks > 0) {
        critDmg += 0.2;
      }
    }

    // Situational damage bonuses
    let dmgBonus = opts.bonusDmgMult ?? 0;
    if (opts.isSkill) dmgBonus += attacker.stats.skillDmgBonus;
    if (opts.isUlt) dmgBonus += attacker.stats.ultDmgBonus;
    if (enemy.lunarTraceTimer > 0) dmgBonus += 0.12;

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
        enemy.isBroken = true;
        enemy.brokenTimer = 2.5;
        this.ctx.triggerShake(12);
        audioManager.playSfx('cancel_cast');
        this.pool.spawnRingWave(enemy.x, enemy.y, 180, 0x38e8ff, 0.5);
        this.pool.spawnFloatingText(enemy.x, enemy.y - 78, 'SHIELD SHATTERED!', 0x38e8ff, true);
        this.ctx.notifyBanner('HIT-COUNT SHIELD SHATTERED! Boss is BROKEN!');
      }
    }

    enemy.hp = Math.max(0, enemy.hp - finalDmg);
    enemy.hitFlashTimer = 0.12;
    attacker.totalDamage += finalDmg;

    // Hit Combo Counter + Tactile Micro-Hitstop on Critical Skills/Ultimates!
    this.comboCount += 1;
    this.comboTimer = 2.6;
    if (roll.isCrit && (opts.isSkill || opts.isUlt)) {
      this.hitstopTimer = Math.max(this.hitstopTimer, 0.028);
    }

    // Crit triggers: +1.4 Ult Gauge, Ashen Fury 4pc AtkSpd, Blade of First Eclipse stack
    if (roll.isCrit) {
      this.ctx.addUltGauge(1.4, 1 + attacker.stats.ultGaugeBonus);
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
      this.ctx.addUltGauge(2.5, 1 + attacker.stats.ultGaugeBonus);
      this.enemyAI.handleEnemyDeath(this.ctx, enemy);
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
    if (hero.invincibleTimer > 0) {
      this.pool.spawnFloatingText(hero.x, hero.y - 36, 'IMMUNE', 0x34d399);
      return;
    }

    let dmg = rawDamage * (1000 / (1000 + hero.stats.def));
    if (hero.dmgReduceTimer > 0) dmg *= 1 - hero.dmgReduceValue;
    if (hero.heroId === 'titus' && isRanged) dmg *= 0.75; // Refracting Guard
    dmg = Math.max(1, Math.round(dmg));

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
    _caster: HeroUnit,
    target: HeroUnit,
    amount: number,
    counterBurn = false,
  ): void {
    if (!target.alive) return;
    target.shield = Math.max(target.shield, amount);
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
      z.gfx
        .ellipse(z.x, z.y, z.radius, z.radius * 0.66)
        .fill({ color: z.color, alpha: 0.16 * pulse })
        .stroke({ color: z.color, width: 3, alpha: 0.72 });
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
        }
      }
    }
  }

  private tick(realDt: number): void {
    const store = useCombatStore.getState();
    if (store.paused || this.battleEnded) return;

    // 1. Update Ultimate Choreography & Micro-Hitstop on REAL time
    let speedMult = 1.0;
    if (this.ultDirector.isRunning()) {
      this.ultDirector.update(this.ctx, realDt);
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

    // Combo decay timer
    if (this.comboTimer > 0) {
      this.comboTimer = Math.max(0, this.comboTimer - realDt);
      if (this.comboTimer <= 0) this.comboCount = 0;
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

    // 2. Passive SP regen (0.45 SP/sec + Verdant 3-hero bonus)
    const factionBonuses = getActiveFactionBonuses(this.ctx.heroes.map((h) => h.heroId));
    const verdant3 = factionBonuses.some((f) => f.faction === 'VERDANT' && f.tier === 3);
    this.ctx.addSp(0.45 * (verdant3 ? 1.1 : 1.0) * dt);

    // 3. Delayed multi-hit strikes
    for (let i = this.ctx.delayedStrikes.length - 1; i >= 0; i--) {
      this.ctx.delayedStrikes[i].delay -= dt;
      if (this.ctx.delayedStrikes[i].delay <= 0) {
        const fn = this.ctx.delayedStrikes[i].fn;
        this.ctx.delayedStrikes.splice(i, 1);
        fn();
      }
    }

    // 4. Core Combat Simulation
    this.squadCtrl.update(this.ctx, dt, store.autoMove);
    this.skillExec.updateAutoSkill(this.ctx, dt, store.autoSkill);
    this.enemyAI.update(this.ctx, dt, this.telegraphLayer);
    this.updateZones(dt);
    this.pool.update(dt);

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
    this.updateActorVisuals();
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
    for (const c of this.clouds) {
      c.gfx.x += c.speed * realDt;
      if (c.gfx.x > ARENA_W + 320) c.gfx.x = -320;
    }
    for (const m of this.ambientMotes) {
      m.gfx.x += (m.vx + Math.sin(this.elapsedSec * 1.4 + m.phase) * 10) * realDt;
      m.gfx.y += m.vy * realDt;
      m.gfx.alpha = 0.25 + 0.55 * Math.abs(Math.sin(this.elapsedSec * 2.2 + m.phase));
      if (m.gfx.y < BOUNDS.minY - 40) {
        m.gfx.y = BOUNDS.maxY + 20;
        m.gfx.x = BOUNDS.minX + Math.random() * (BOUNDS.maxX - BOUNDS.minX);
      }
    }
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

  private updateActorVisuals(): void {
    // Heroes — snappy 2.5D breathing, running hop squash-and-stretch, and attack lunge/tilt!
    for (const h of this.ctx.heroes) {
      h.container.position.set(h.x, h.y);
      h.container.zIndex = h.y;
      const isMoving = Math.hypot(h.vx, h.vy) > 25;
      const swingProgress = h.attackSwingTimer > 0 ? Math.min(1, h.attackSwingTimer / 0.24) : 0;
      const lungeX = swingProgress > 0 ? h.facing * Math.sin(swingProgress * Math.PI) * 18 : 0;
      const hopY = h.alive
        ? isMoving
          ? -Math.abs(Math.sin(h.animTime * 11)) * 7
          : Math.sin(h.animTime * 4.5) * 2
        : 0;
      const baseSc = h.baseScaleY ?? 0.9;
      const breathe = h.alive ? 1 + Math.sin(h.animTime * 4.2) * 0.025 : 1;

      h.sprite.position.set(lungeX, hopY);
      h.sprite.scale.set(baseSc * h.facing, baseSc * breathe);
      h.sprite.rotation =
        swingProgress > 0
          ? h.facing * Math.sin(swingProgress * Math.PI) * 0.2
          : isMoving
            ? h.facing * 0.05
            : 0;
      h.sprite.tint = h.hitFlashTimer > 0 ? 0xff9999 : h.overdriveTimer > 0 ? 0xfef08a : 0xffffff;

      if (h.fallbackCrestGroup && h.fallbackCrestGroup.visible) {
        h.fallbackCrestGroup.position.set(lungeX, hopY);
      }

      if (h.weaponGfx.visible) {
        h.weaponGfx.position.set(h.facing * 32 + lungeX, -38 + hopY);
        h.weaponGfx.scale.x = h.facing;
        h.weaponGfx.rotation =
          swingProgress > 0
            ? h.facing * (-0.55 + (1 - swingProgress) * 1.45)
            : h.facing * Math.sin(h.animTime * 4) * 0.08;
      }

      // Rotating Faction Magic Circle Rune beneath boots + Shield + Seraphina Star Orbs
      h.auraGfx.clear();
      if (h.alive) {
        const fHex = FACTIONS[h.def.faction].accentHex;
        h.auraGfx.ellipse(0, 2, 34, 12).stroke({ color: fHex, width: 2, alpha: 0.6 });
        const spin = this.elapsedSec * 1.8 + h.slotIndex;
        for (let k = 0; k < 4; k++) {
          const a = spin + (k * Math.PI) / 2;
          h.auraGfx.circle(Math.cos(a) * 34, 2 + Math.sin(a) * 12, 2.2).fill({ color: fHex, alpha: 0.85 });
        }
        if (h.shield > 0) {
          h.auraGfx
            .ellipse(0, -56, 44, 58)
            .fill({ color: 0x38bdf8, alpha: 0.08 })
            .stroke({ color: 0x7dd3fc, width: 2.2, alpha: 0.72 });
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
        const barY = h.hasFullSprite ? -152 : -110;
        const hpRatio = Math.max(0, h.hp / h.maxHp);
        const shRatio = Math.min(1, h.shield / h.maxHp);
        h.hpBarGfx.rect(-w / 2 - 1, barY, w + 2, 6).fill({ color: 0x050814, alpha: 0.85 });
        h.hpBarGfx.rect(-w / 2, barY + 1, w * hpRatio, 4).fill({ color: 0x22c55e });
        if (shRatio > 0) {
          h.hpBarGfx.rect(-w / 2, barY + 1, w * shRatio, 2).fill({ color: 0x38bdf8 });
        }
      }
    }

    // Enemies — smooth levitation/stride + hit recoil
    for (const e of this.ctx.enemies) {
      if (!e.alive) continue;
      e.container.position.set(e.x, e.y);
      e.container.zIndex = e.y;
      const isFloating = e.def.id === 'rift_acolyte';
      const bob = isFloating
        ? -8 + Math.sin(e.animTime * 4.5) * 6
        : Math.sin(e.animTime * 5) * (e.def.isBoss ? 4 : 3);
      const baseSc = e.baseScaleY ?? 1;
      const breathe = 1 + Math.sin(e.animTime * 3.8) * 0.022;
      const recoilX = e.hitFlashTimer > 0 ? -e.facing * 5 : 0;

      e.sprite.position.set(recoilX, bob);
      e.sprite.scale.set(baseSc * (e.facing >= 0 ? -1 : 1), baseSc * breathe);
      e.sprite.tint =
        e.hitFlashTimer > 0
          ? 0xffaaaa
          : e.isBroken
            ? 0xfde047
            : e.freezeTimer > 0
              ? 0x7dd3fc
              : 0xffffff;

      // Overhead bar (skip big bar for boss since boss has top HUD bar)
      e.hpBarGfx.clear();
      if (!e.def.isBoss) {
        const w = e.def.isMiniBoss ? 78 : 50;
        const topY = e.def.isMiniBoss ? -168 : -118;
        e.hpBarGfx.rect(-w / 2 - 1, topY, w + 2, 6).fill({ color: 0x050814, alpha: 0.85 });
        e.hpBarGfx
          .rect(-w / 2, topY + 1, w * Math.max(0, e.hp / e.maxHp), 4)
          .fill({ color: 0xef4444 });
      }

      // Status badges (Starfall Mark, Burn, Stun, Hit Shield ring)
      e.statusGfx.clear();
      if (e.starfallMarkTimer > 0) {
        e.statusGfx.circle(0, -45, 22).stroke({ color: 0xf5c84c, width: 2.5, alpha: 0.9 });
      }
      if (e.hitShield > 0) {
        e.statusGfx
          .ellipse(0, -80, 96, 108)
          .stroke({ color: 0xe879f9, width: 4, alpha: 0.82 });
      }
      if (e.burnStacks > 0) {
        for (let b = 0; b < e.burnStacks; b++) {
          e.statusGfx
            .circle(-16 + b * 8, e.def.isBoss ? -195 : -98, 3.5)
            .fill({ color: 0xf97316 });
        }
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

  private checkBattleProgress(dt: number, realDt: number): void {
    const aliveHeroes = this.ctx.heroes.filter((h) => h.alive);
    if (aliveHeroes.length === 0) {
      this.finishBattle(false);
      return;
    }

    // Never cut off an active Anime Ultimate Cut-In / Skyfall Payload mid-sequence!
    if (this.ultDirector.isRunning()) return;

    const aliveEnemies = this.ctx.enemies.filter((e) => e.alive);
    if (aliveEnemies.length === 0) {
      const stage = STAGE_MAP[this.stageId] ?? STAGE_MAP.stage_1_1;
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

    const stage = STAGE_MAP[this.stageId] ?? STAGE_MAP.stage_1_1;
    const isFirstClear = victory && !player.clearedStages.includes(stage.id);
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
      for (let i = 0; i < stage.rewards.equipmentDrops; i++) {
        const rarity = rollWeightedRarity(stage.rewards.rarityWeights);
        const setId =
          targetSets.length > 0
            ? targetSets[Math.floor(Math.random() * targetSets.length)]
            : undefined;
        droppedEquipment.push(generateEquipment({ rarity, setId }));
      }

      // Biome Primary Faction Essence + Bonus Secondary Essence (prevents early-game soft-lock!)
      const primaryQty = randBetween(stage.rewards.primaryEssenceQty);
      essencesEarned[stage.rewards.primaryEssence] =
        (essencesEarned[stage.rewards.primaryEssence] ?? 0) + primaryQty;

      if (Math.random() < (stage.rewards.bonusRandomEssenceChance ?? 0.25)) {
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
      ? getStageCombatHeroExp(stage.chapter, stage.stageNumber, stage.isMiniBoss, stage.isBossStage)
      : 0;

    for (const h of this.ctx.heroes) {
      const owned = player.roster[h.heroId];
      if (!owned) continue;
      const levelCap = getHeroLevelCap(owned.awakening);
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

    const summary: CombatLootSummary = {
      victory,
      stageId: stage.id,
      stageName: `${stage.code} ${stage.name}`,
      durationSec: Math.round(this.elapsedSec),
      damageByHero,
      healingByHero,
      heroExpResults,
      goldEarned: victory ? randBetween(stage.rewards.gold) : 0,
      crystalsEarned: isFirstClear ? stage.firstClearCrystals : victory ? 40 : 0,
      expPotionsEarned: victory ? randBetween(stage.rewards.expPotions) : 0,
      forgeStonesEarned: victory ? randBetween(stage.rewards.forgeStones) : 0,
      starIronIngotsEarned,
      astralAnvilCoresEarned,
      starCoresEarned,
      relicFragmentsEarned,
      essencesEarned,
      bondGiftsEarned: victory ? (stage.isBossStage ? 2 : 1) : 0,
      isFirstClear,
      droppedEquipment,
      droppedRelics,
    };

    if (victory) {
      player.applyCombatRewards(summary);
      audioManager.playSfx('victory', 0);
    }

    this.syncHudSnapshot(true);
    useCombatStore.getState().setCombatResult(summary);
  }

  private syncHudSnapshot(_force: boolean): void {
    const heroesSnap: HeroCombatSnapshot[] = this.ctx.heroes.map((h) => {
      let stacksLabel: string | undefined;
      let stacksCount: number | undefined;
      if (h.heroId === 'seraphina') {
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
        ultGaugeCost: h.def.ultimate.gaugeCost ?? 40,
        stacksLabel,
        stacksCount,
        activeBuffs,
      };
    });

    const activeStage = STAGE_MAP[this.stageId] ?? STAGE_MAP.stage_1_1;
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
        isCasting: bossUnit.isCasting,
        castName: bossUnit.castName,
        castProgress: bossUnit.isCasting
          ? Math.min(1, bossUnit.castElapsed / Math.max(0.1, bossUnit.castDuration))
          : 0,
        castCancelable: bossUnit.castCancelable,
        isBroken: bossUnit.isBroken,
        brokenTimer: Number(bossUnit.brokenTimer.toFixed(1)),
        hitShield: bossUnit.hitShield,
        maxHitShield: bossUnit.maxHitShield,
        burnStacks: bossUnit.burnStacks,
        defShredActive: bossUnit.defShredTimer > 0,
      };
    }

    useCombatStore.getState().setSnapshot({
      elapsedSec: Math.floor(this.elapsedSec),
      sp: Number(this.ctx.sp.toFixed(2)),
      ultGauge: Number(this.ctx.ultGauge.toFixed(1)),
      fps: Math.round(this.fpsSamples),
      comboCount: this.comboCount,
      comboDecayRatio: this.comboCount > 0 ? Math.max(0, Math.min(1, this.comboTimer / 2.6)) : 0,
      heroes: heroesSnap,
      boss: bossSnap,
    });
  }

  public destroy(): void {
    this.destroyed = true;
    if (this.bannerClearHandle) window.clearTimeout(this.bannerClearHandle);
    if (this.calloutClearHandle) window.clearTimeout(this.calloutClearHandle);
    if (this.bossWarnClearHandle) window.clearTimeout(this.bossWarnClearHandle);
    if (this.waveBannerClearHandle) window.clearTimeout(this.waveBannerClearHandle);
    useCombatStore.getState().setTouchJoystick(null);
    useCombatStore.getState().setBossWarning(null);
    useCombatStore.getState().setWaveBanner(null);
    window.removeEventListener('keydown', this.boundKeyDown);
    if (this.canvasEl) {
      this.canvasEl.removeEventListener('contextmenu', this.boundContextMenu);
      this.canvasEl = null;
    }
    this.squadCtrl.destroy();
    if (this.ctx) {
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
