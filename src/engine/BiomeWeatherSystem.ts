import { Container, Graphics, Sprite } from 'pixi.js';
import type { DungeonId } from '../types/game';
import { VfxTextureAtlas, type VfxTexKey } from './VfxTextureAtlas';

export type BiomeWeatherKind =
  | 'SOLARIS_RAYS' // Ch.1 Aurelia Bastion & Gold Vault
  | 'ASTRAL_STARFALL' // Ch.2 Lumina Observatory & EXP Crucible
  | 'VERDANT_CANOPY' // Ch.3 Sylva Canopy & Awaken Sanctum
  | 'ASHEN_EMBERS' // Ch.4 Ferrum Caldera & Forge Foundry
  | 'FROST_BLIZZARD' // Ch.5 Frostveil Citadel
  | 'PELAGIA_TIDE' // Ch.6 Sunken Pelagia
  | 'ZEPHYR_STORM' // Ch.7 Zephyr Archipelago
  | 'SOLIS_MIRAGE' // Ch.8 Mirage of Solis
  | 'VOID_RIFT'; // Ch.9 Obsidian Spire, Ch.10 Shattered Zenith & Relic Abyss

interface WeatherParticle {
  sprite: Sprite;
  x: number;
  y: number;
  vx: number;
  vy: number;
  phase: number;
  rotSpeed: number;
  baseAlpha: number;
  baseScale: number;
  pulseSpeed: number;
}

interface LightShaft {
  gfx: Graphics;
  baseX: number;
  speed: number;
  phase: number;
  baseAlpha: number;
}

interface ShootingStar {
  sprite: Sprite;
  active: boolean;
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
}

export function resolveBiomeWeather(chapter: number, dungeonId?: DungeonId): BiomeWeatherKind {
  if (dungeonId === 'GOLD_VAULT') return 'SOLARIS_RAYS';
  if (dungeonId === 'EXP_CRUCIBLE') return 'ASTRAL_STARFALL';
  if (dungeonId === 'AWAKEN_SANCTUM') return 'VERDANT_CANOPY';
  if (dungeonId === 'FORGE_FOUNDRY') return 'ASHEN_EMBERS';
  if (dungeonId === 'RELIC_ABYSS') return 'VOID_RIFT';

  switch (chapter) {
    case 1:
      return 'SOLARIS_RAYS';
    case 2:
      return 'ASTRAL_STARFALL';
    case 3:
      return 'VERDANT_CANOPY';
    case 4:
      return 'ASHEN_EMBERS';
    case 5:
      return 'FROST_BLIZZARD';
    case 6:
      return 'PELAGIA_TIDE';
    case 7:
      return 'ZEPHYR_STORM';
    case 8:
      return 'SOLIS_MIRAGE';
    default:
      return 'VOID_RIFT';
  }
}

/**
 * 10-Chapter Dynamic Biome Weather & Atmospheric Lighting System (PixiJS v8, Zero-GC 60 FPS).
 * Renders chapter-bespoke god-rays, falling petals, fireflies, volcanic embers, snow,
 * underwater bubbles/caustics, gale rain + distant lightning, desert shimmer, and void shards.
 */
export class BiomeWeatherSystem {
  private readonly container: Container;
  private readonly kind: BiomeWeatherKind;
  private readonly bounds: { minX: number; maxX: number; minY: number; maxY: number };
  private readonly particles: WeatherParticle[] = [];
  private readonly shafts: LightShaft[] = [];
  private readonly shootingStars: ShootingStar[] = [];
  private lightningOverlay: Graphics | null = null;
  private lightningTimer = 2.8;
  private lightningAlpha = 0;
  private shootingStarTimer = 1.4;
  private clock = 0;

  constructor(
    parentLayer: Container,
    chapter: number,
    bounds: { minX: number; maxX: number; minY: number; maxY: number },
    dungeonId?: DungeonId,
    moteColors: [number, number] = [0xfde047, 0x7dd3fc],
  ) {
    this.container = new Container();
    parentLayer.addChild(this.container);
    this.bounds = bounds;
    this.kind = resolveBiomeWeather(chapter, dungeonId);
    this.buildAtmosphere(moteColors);
  }

  private randX(pad = 180): number {
    return (
      this.bounds.minX -
      pad +
      Math.random() * (this.bounds.maxX - this.bounds.minX + pad * 2)
    );
  }

  private randY(pad = 120): number {
    return (
      this.bounds.minY -
      pad +
      Math.random() * (this.bounds.maxY - this.bounds.minY + pad * 2)
    );
  }

  private buildAtmosphere(moteColors: [number, number]): void {
    const atlas = VfxTextureAtlas.get();
    const spanW = this.bounds.maxX - this.bounds.minX;

    // 1. Slanted Volumetric Light Shafts (Sunbeams / Underwater Caustics / Mirage Rays)
    if (
      this.kind === 'SOLARIS_RAYS' ||
      this.kind === 'PELAGIA_TIDE' ||
      this.kind === 'SOLIS_MIRAGE'
    ) {
      const shaftCount = this.kind === 'PELAGIA_TIDE' ? 4 : 3;
      const shaftColor =
        this.kind === 'PELAGIA_TIDE'
          ? 0x38e8ff
          : this.kind === 'SOLIS_MIRAGE'
            ? 0xfbbf24
            : 0xfef08a;
      for (let i = 0; i < shaftCount; i++) {
        const g = new Graphics();
        const wTop = 90 + i * 35;
        const wBot = 240 + i * 55;
        const skew = this.kind === 'PELAGIA_TIDE' ? 140 : 320;
        g.poly([0, -520, wTop, -520, wBot + skew, 640, skew, 640]).fill({
          color: shaftColor,
          alpha: 1,
        });
        g.blendMode = 'add';
        const baseX = this.bounds.minX + (spanW / (shaftCount + 1)) * (i + 1) - 180;
        g.position.set(baseX, (this.bounds.minY + this.bounds.maxY) * 0.5);
        g.alpha = 0.055;
        this.container.addChild(g);
        this.shafts.push({
          gfx: g,
          baseX,
          speed: 0.32 + i * 0.14,
          phase: i * 1.9,
          baseAlpha: this.kind === 'PELAGIA_TIDE' ? 0.075 : 0.055,
        });
      }
    }

    // 2. Ambient Storm Lightning Sheet (Zephyr Archipelago)
    if (this.kind === 'ZEPHYR_STORM') {
      const flash = new Graphics();
      flash.rect(0, 0, 2560, 1440).fill({ color: 0xe0f2fe, alpha: 1 });
      flash.blendMode = 'add';
      flash.alpha = 0;
      this.container.addChild(flash);
      this.lightningOverlay = flash;
    }

    // 3. Shooting Stars Pool (Lumina Observatory & Void Rift)
    if (this.kind === 'ASTRAL_STARFALL' || this.kind === 'VOID_RIFT') {
      for (let i = 0; i < 3; i++) {
        const sp = new Sprite(atlas.arrowStreak);
        sp.anchor.set(0.85, 0.5);
        sp.blendMode = 'add';
        sp.visible = false;
        sp.tint = this.kind === 'VOID_RIFT' ? 0xe879f9 : 0x7dd3fc;
        this.container.addChild(sp);
        this.shootingStars.push({
          sprite: sp,
          active: false,
          x: 0,
          y: 0,
          vx: 0,
          vy: 0,
          life: 0,
          maxLife: 0.6,
        });
      }
    }

    // 4. Biome-Bespoke Weather Particles
    const addParticle = (opts: {
      tex: VfxTexKey;
      tint: number;
      vx: number;
      vy: number;
      scale: number;
      alpha: number;
      rotSpeed?: number;
      pulseSpeed?: number;
      additive?: boolean;
      rotation?: number;
    }) => {
      const sp = new Sprite(atlas[opts.tex]);
      sp.anchor.set(0.5);
      sp.tint = opts.tint;
      sp.blendMode = opts.additive === false ? 'normal' : 'add';
      const x = this.randX();
      const y = this.randY();
      sp.position.set(x, y);
      sp.scale.set(opts.scale);
      sp.rotation = opts.rotation ?? Math.random() * Math.PI * 2;
      sp.alpha = opts.alpha;
      this.container.addChild(sp);
      this.particles.push({
        sprite: sp,
        x,
        y,
        vx: opts.vx,
        vy: opts.vy,
        phase: Math.random() * Math.PI * 2,
        rotSpeed: opts.rotSpeed ?? 0,
        baseAlpha: opts.alpha,
        baseScale: opts.scale,
        pulseSpeed: opts.pulseSpeed ?? 1.8,
      });
    };

    switch (this.kind) {
      case 'SOLARIS_RAYS':
        for (let i = 0; i < 20; i++) {
          addParticle({
            tex: 'petalLeaf',
            tint: i % 3 === 0 ? 0xfff7cc : 0xfde047,
            vx: 22 + Math.random() * 24,
            vy: 14 + Math.random() * 18,
            scale: 0.13 + Math.random() * 0.1,
            alpha: 0.45,
            rotSpeed: (Math.random() - 0.5) * 2.4,
            pulseSpeed: 1.5,
          });
        }
        for (let i = 0; i < 22; i++) {
          addParticle({
            tex: 'softGlow',
            tint: i % 2 === 0 ? moteColors[0] : moteColors[1],
            vx: (Math.random() - 0.5) * 14,
            vy: -(10 + Math.random() * 16),
            scale: 0.08 + Math.random() * 0.09,
            alpha: 0.5,
            pulseSpeed: 2.3,
          });
        }
        break;

      case 'ASTRAL_STARFALL':
        for (let i = 0; i < 36; i++) {
          addParticle({
            tex: i % 5 === 0 ? 'impactFlare' : 'softGlow',
            tint: i % 3 === 0 ? 0x38e8ff : i % 3 === 1 ? 0xc084fc : 0xffffff,
            vx: -10 - Math.random() * 14,
            vy: -(12 + Math.random() * 18),
            scale: i % 5 === 0 ? 0.07 + Math.random() * 0.05 : 0.08 + Math.random() * 0.1,
            alpha: 0.55,
            rotSpeed: i % 5 === 0 ? 0.6 : 0,
            pulseSpeed: 2.8,
          });
        }
        break;

      case 'VERDANT_CANOPY':
        for (let i = 0; i < 24; i++) {
          addParticle({
            tex: 'petalLeaf',
            tint: i % 3 === 0 ? 0x6ee7b7 : 0x34d399,
            vx: 24 + Math.random() * 26,
            vy: 18 + Math.random() * 22,
            scale: 0.15 + Math.random() * 0.11,
            alpha: 0.55,
            rotSpeed: (Math.random() - 0.5) * 3.1,
            additive: false,
            pulseSpeed: 1.2,
          });
        }
        for (let i = 0; i < 22; i++) {
          addParticle({
            tex: 'softGlow',
            tint: i % 2 === 0 ? 0xfef08a : 0x34d399,
            vx: (Math.random() - 0.5) * 24,
            vy: -(8 + Math.random() * 14),
            scale: 0.09 + Math.random() * 0.08,
            alpha: 0.68,
            pulseSpeed: 3.4,
          });
        }
        break;

      case 'ASHEN_EMBERS':
        for (let i = 0; i < 46; i++) {
          const isWisp = i % 3 === 0;
          addParticle({
            tex: isWisp ? 'fireWisp' : 'softGlow',
            tint: i % 3 === 0 ? 0xf97316 : i % 3 === 1 ? 0xfde047 : 0xef4444,
            vx: 16 + Math.random() * 28,
            vy: -(36 + Math.random() * 54),
            scale: isWisp ? 0.12 + Math.random() * 0.1 : 0.07 + Math.random() * 0.08,
            alpha: 0.72,
            rotSpeed: isWisp ? (Math.random() - 0.5) * 2 : 0,
            pulseSpeed: 3.6,
          });
        }
        break;

      case 'FROST_BLIZZARD':
        for (let i = 0; i < 42; i++) {
          addParticle({
            tex: 'softGlow',
            tint: i % 3 === 0 ? 0xe0f2fe : 0xffffff,
            vx: -38 - Math.random() * 34,
            vy: 34 + Math.random() * 38,
            scale: 0.07 + Math.random() * 0.09,
            alpha: 0.6,
            pulseSpeed: 1.8,
          });
        }
        for (let i = 0; i < 14; i++) {
          addParticle({
            tex: 'iceCrystal',
            tint: 0xbae6fd,
            vx: -26 - Math.random() * 24,
            vy: 24 + Math.random() * 26,
            scale: 0.09 + Math.random() * 0.07,
            alpha: 0.52,
            rotSpeed: (Math.random() - 0.5) * 2.2,
            pulseSpeed: 2.5,
          });
        }
        break;

      case 'PELAGIA_TIDE':
        for (let i = 0; i < 34; i++) {
          addParticle({
            tex: i % 2 === 0 ? 'ringHalo' : 'softGlow',
            tint: i % 3 === 0 ? 0x67e8f9 : 0x38e8ff,
            vx: (Math.random() - 0.5) * 14,
            vy: -(24 + Math.random() * 36),
            scale: i % 2 === 0 ? 0.06 + Math.random() * 0.08 : 0.08 + Math.random() * 0.08,
            alpha: 0.48,
            pulseSpeed: 2.0,
          });
        }
        break;

      case 'ZEPHYR_STORM': {
        const rainAngle = Math.atan2(320, -145);
        for (let i = 0; i < 44; i++) {
          addParticle({
            tex: 'arrowStreak',
            tint: i % 3 === 0 ? 0xbae6fd : 0x7dd3fc,
            vx: -210 - Math.random() * 110,
            vy: 460 + Math.random() * 200,
            scale: 0.16 + Math.random() * 0.1,
            alpha: 0.34,
            rotation: rainAngle,
            pulseSpeed: 0.5,
          });
        }
        break;
      }

      case 'SOLIS_MIRAGE':
        for (let i = 0; i < 40; i++) {
          addParticle({
            tex: 'softGlow',
            tint: i % 3 === 0 ? 0xfde047 : i % 3 === 1 ? 0xf59e0b : 0xfffbeb,
            vx: 58 + Math.random() * 64,
            vy: -(8 + Math.random() * 14),
            scale: 0.07 + Math.random() * 0.08,
            alpha: 0.55,
            pulseSpeed: 3.1,
          });
        }
        break;

      case 'VOID_RIFT':
        for (let i = 0; i < 36; i++) {
          const isShard = i % 3 === 0;
          addParticle({
            tex: isShard ? 'iceCrystal' : 'softGlow',
            tint: i % 3 === 0 ? 0xc084fc : i % 3 === 1 ? 0xf43f5e : 0xfde047,
            vx: (Math.random() - 0.5) * 18,
            vy: -(22 + Math.random() * 34),
            scale: isShard ? 0.1 + Math.random() * 0.08 : 0.08 + Math.random() * 0.09,
            alpha: 0.62,
            rotSpeed: isShard ? (Math.random() - 0.5) * 2.6 : 0,
            pulseSpeed: 3.0,
          });
        }
        break;
    }
  }

  public update(realDt: number): void {
    this.clock += realDt;

    // 1. Animate slanted volumetric light shafts
    for (const sh of this.shafts) {
      sh.gfx.x = sh.baseX + Math.sin(this.clock * sh.speed + sh.phase) * 55;
      sh.gfx.alpha = sh.baseAlpha * (0.65 + 0.35 * Math.sin(this.clock * (sh.speed * 1.6) + sh.phase));
    }

    // 2. Distant ambient lightning shimmer (Zephyr Storm)
    if (this.lightningOverlay) {
      this.lightningTimer -= realDt;
      if (this.lightningTimer <= 0) {
        this.lightningTimer = 4.2 + Math.random() * 4.5;
        this.lightningAlpha = 0.13;
      }
      if (this.lightningAlpha > 0.004) {
        this.lightningOverlay.alpha = this.lightningAlpha;
        this.lightningAlpha *= Math.pow(0.015, realDt);
      } else {
        this.lightningOverlay.alpha = 0;
      }
    }

    // 3. Occasional shooting stars (Lumina / Void)
    if (this.shootingStars.length > 0) {
      this.shootingStarTimer -= realDt;
      if (this.shootingStarTimer <= 0) {
        this.shootingStarTimer = 2.6 + Math.random() * 3.2;
        const star = this.shootingStars.find((s) => !s.active);
        if (star) {
          star.active = true;
          star.x = this.bounds.maxX + 60;
          star.y = this.bounds.minY - 40 + Math.random() * 260;
          star.vx = -(820 + Math.random() * 320);
          star.vy = 280 + Math.random() * 140;
          star.maxLife = 0.55 + Math.random() * 0.25;
          star.life = star.maxLife;
          star.sprite.rotation = Math.atan2(star.vy, star.vx);
          star.sprite.scale.set(0.45, 0.22);
          star.sprite.visible = true;
        }
      }
      for (const s of this.shootingStars) {
        if (!s.active) continue;
        s.life -= realDt;
        if (s.life <= 0) {
          s.active = false;
          s.sprite.visible = false;
          continue;
        }
        s.x += s.vx * realDt;
        s.y += s.vy * realDt;
        s.sprite.position.set(s.x, s.y);
        const ratio = s.life / s.maxLife;
        s.sprite.alpha = Math.sin(ratio * Math.PI) * 0.72;
      }
    }

    // 4. Update biome weather particles with smooth wrap-around
    const padX = 220;
    const padY = 140;
    const minX = this.bounds.minX - padX;
    const maxX = this.bounds.maxX + padX;
    const minY = this.bounds.minY - padY;
    const maxY = this.bounds.maxY + padY;

    for (const p of this.particles) {
      const sway =
        this.kind === 'ZEPHYR_STORM'
          ? 0
          : Math.sin(this.clock * 1.45 + p.phase) *
            (this.kind === 'VERDANT_CANOPY' || this.kind === 'PELAGIA_TIDE' ? 24 : 14);
      p.x += (p.vx + sway) * realDt;
      p.y += p.vy * realDt;

      if (p.x < minX) p.x = maxX;
      else if (p.x > maxX) p.x = minX;
      if (p.y < minY) p.y = maxY;
      else if (p.y > maxY) p.y = minY;

      p.sprite.position.set(p.x, p.y);
      if (p.rotSpeed !== 0) {
        p.sprite.rotation += p.rotSpeed * realDt;
      }
      const twinkle = 0.45 + 0.55 * Math.abs(Math.sin(this.clock * p.pulseSpeed + p.phase));
      p.sprite.alpha = p.baseAlpha * twinkle;
    }
  }

  public destroy(): void {
    this.container.destroy({ children: true });
  }
}
