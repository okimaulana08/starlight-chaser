import { Container, Sprite, Text, TextStyle } from 'pixi.js';
import { VfxTextureAtlas, type VfxTexKey } from './VfxTextureAtlas';

export type HitImpactStyle = 'SLASH' | 'PIERCE' | 'ARCANE' | 'BLUNT' | 'HEAL';

export interface SpriteFxOptions {
  tex: VfxTexKey;
  x: number;
  y: number;
  vx?: number;
  vy?: number;
  gravity?: number;
  drag?: number;
  scaleX?: number;
  scaleY?: number;
  endScaleX?: number;
  endScaleY?: number;
  rotation?: number;
  spin?: number;
  alpha?: number;
  tint?: number;
  life?: number;
  delay?: number;
  anchorX?: number;
  anchorY?: number;
  additive?: boolean;
  /** Optional dark contrast under-glow silhouette so light textures pop over sunlit marble */
  darkHalo?: boolean;
  /** Render in ground layer beneath characters (magic circles, tectonic cracks, rings) */
  groundLayer?: boolean;
}

interface PooledSpriteFx {
  active: boolean;
  sprite: Sprite;
  halo: Sprite;
  hasHalo: boolean;
  isGround: boolean;
  delay: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  gravity: number;
  drag: number;
  startScaleX: number;
  startScaleY: number;
  endScaleX: number;
  endScaleY: number;
  rotation: number;
  spin: number;
  startAlpha: number;
  life: number;
  maxLife: number;
}

interface PooledProjectile {
  active: boolean;
  container: Container;
  tailSprite: Sprite;
  coreSprite: Sprite;
  haloSprite: Sprite;
  x: number;
  y: number;
  tx: number;
  ty: number;
  speed: number;
  color: number;
  radius: number;
  trailTimer: number;
  onHit: (x: number, y: number) => void;
}

interface PooledText {
  active: boolean;
  text: Text;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  baseScale: number;
}

/**
 * Procedural Soft-Texture Anime VFX ObjectPool (Zero-GC, 60 FPS).
 * Eliminates all blocky .rect() / .arc() / .lineTo() primitives in favor of
 * high-res soft-feathered Canvas2D Sprite textures, tapered anime crescents,
 * volumetric glow columns, magic seals, fire wisps, smoke puffs, & dynamic arena dimming.
 */
export class ObjectPool {
  public readonly groundVfxLayer = new Container();
  public readonly vfxLayer = new Container();
  public readonly textLayer = new Container();

  private fxPool: PooledSpriteFx[] = [];
  private projectiles: PooledProjectile[] = [];
  private texts: PooledText[] = [];
  private atlas = VfxTextureAtlas.get();

  private normalStyle = new TextStyle({
    fontFamily: 'Plus Jakarta Sans, sans-serif',
    fontSize: 22,
    fontWeight: '800',
    fill: '#ffffff',
    stroke: { color: '#050814', width: 5 },
  });

  private critStyle = new TextStyle({
    fontFamily: 'Cinzel, Georgia, serif',
    fontSize: 32,
    fontWeight: '900',
    fill: '#fde047',
    stroke: { color: '#451a03', width: 6 },
  });

  constructor() {
    // 460 pooled dual-layer soft-texture sprites (supports massive 12-hero multi-hit Ultimates at 60 FPS)
    for (let i = 0; i < 460; i++) {
      const halo = new Sprite(this.atlas.softGlow);
      halo.anchor.set(0.5);
      halo.visible = false;

      const sprite = new Sprite(this.atlas.softGlow);
      sprite.anchor.set(0.5);
      sprite.visible = false;

      this.vfxLayer.addChild(halo);
      this.vfxLayer.addChild(sprite);

      this.fxPool.push({
        active: false,
        sprite,
        halo,
        hasHalo: false,
        isGround: false,
        delay: 0,
        x: 0,
        y: 0,
        vx: 0,
        vy: 0,
        gravity: 0,
        drag: 1,
        startScaleX: 1,
        startScaleY: 1,
        endScaleX: 1,
        endScaleY: 1,
        rotation: 0,
        spin: 0,
        startAlpha: 1,
        life: 0,
        maxLife: 0.4,
      });
    }

    // 64 sleek arrow/comet projectiles with soft trail & bright core
    for (let i = 0; i < 64; i++) {
      const container = new Container();
      container.visible = false;

      const haloSprite = new Sprite(this.atlas.softGlow);
      haloSprite.anchor.set(0.5);
      haloSprite.tint = 0x090d1f;
      haloSprite.alpha = 0.45;

      const tailSprite = new Sprite(this.atlas.arrowStreak);
      tailSprite.anchor.set(0.85, 0.5);

      const coreSprite = new Sprite(this.atlas.softGlow);
      coreSprite.anchor.set(0.5);
      coreSprite.tint = 0xffffff;

      container.addChild(haloSprite, tailSprite, coreSprite);
      this.vfxLayer.addChild(container);

      this.projectiles.push({
        active: false,
        container,
        tailSprite,
        coreSprite,
        haloSprite,
        x: 0,
        y: 0,
        tx: 0,
        ty: 0,
        speed: 550,
        color: 0xffffff,
        radius: 6,
        trailTimer: 0,
        onHit: () => {},
      });
    }

    // 80 floating damage / status text pool
    for (let i = 0; i < 80; i++) {
      const text = new Text({ text: '', style: this.normalStyle });
      text.anchor.set(0.5);
      text.visible = false;
      this.textLayer.addChild(text);
      this.texts.push({
        active: false,
        text,
        vx: 0,
        vy: -55,
        life: 0,
        maxLife: 0.85,
        baseScale: 1,
      });
    }
  }

  /**
   * Core soft-texture animated Sprite emitter (powers all skills, hits, and 12 unique Ultimates).
   */
  public spawnSpriteFx(opts: SpriteFxOptions): void {
    const item = this.fxPool.find((f) => !f.active);
    if (!item) return;

    const tex = this.atlas[opts.tex];
    const targetParent = opts.groundLayer ? this.groundVfxLayer : this.vfxLayer;

    if (item.sprite.parent !== targetParent) {
      targetParent.addChild(item.halo);
      targetParent.addChild(item.sprite);
    }

    item.active = true;
    item.isGround = Boolean(opts.groundLayer);
    item.delay = opts.delay ?? 0;
    item.x = opts.x;
    item.y = opts.y;
    item.vx = opts.vx ?? 0;
    item.vy = opts.vy ?? 0;
    item.gravity = opts.gravity ?? 0;
    item.drag = opts.drag ?? 1;
    item.startScaleX = opts.scaleX ?? 1;
    item.startScaleY = opts.scaleY ?? item.startScaleX;
    item.endScaleX = opts.endScaleX ?? item.startScaleX;
    item.endScaleY = opts.endScaleY ?? item.startScaleY;
    item.rotation = opts.rotation ?? 0;
    item.spin = opts.spin ?? 0;
    item.startAlpha = opts.alpha ?? 1;
    item.maxLife = Math.max(0.06, opts.life ?? 0.45);
    item.life = item.maxLife;
    item.hasHalo = Boolean(opts.darkHalo);

    const ax = opts.anchorX ?? 0.5;
    const ay = opts.anchorY ?? 0.5;

    item.sprite.texture = tex;
    item.sprite.anchor.set(ax, ay);
    item.sprite.tint = opts.tint ?? 0xffffff;
    item.sprite.blendMode = opts.additive ? 'add' : 'normal';
    item.sprite.position.set(item.x, item.y);
    item.sprite.rotation = item.rotation;
    item.sprite.scale.set(item.startScaleX, item.startScaleY);
    item.sprite.alpha = item.startAlpha;
    item.sprite.visible = item.delay <= 0;

    if (item.hasHalo) {
      item.halo.texture = tex;
      item.halo.anchor.set(ax, ay);
      item.halo.tint = 0x070a18;
      item.halo.blendMode = 'normal';
      item.halo.position.set(item.x, item.y + 2);
      item.halo.rotation = item.rotation;
      item.halo.scale.set(item.startScaleX * 1.14, item.startScaleY * 1.14);
      item.halo.alpha = item.startAlpha * 0.48;
      item.halo.visible = item.delay <= 0;
    } else {
      item.halo.visible = false;
    }
  }

  public spawnProjectile(opts: {
    x: number;
    y: number;
    tx: number;
    ty: number;
    speed: number;
    color: number;
    radius: number;
    onHit: (x: number, y: number) => void;
  }): void {
    const p = this.projectiles.find((item) => !item.active);
    if (!p) {
      opts.onHit(opts.tx, opts.ty);
      return;
    }
    p.active = true;
    p.x = opts.x;
    p.y = opts.y;
    p.tx = opts.tx;
    p.ty = opts.ty;
    p.speed = opts.speed;
    p.color = opts.color;
    p.radius = opts.radius;
    p.trailTimer = 0;
    p.onHit = opts.onHit;

    const angle = Math.atan2(opts.ty - opts.y, opts.tx - opts.x);
    const scale = Math.max(0.26, opts.radius / 18);

    p.haloSprite.scale.set(scale * 1.2);
    p.tailSprite.tint = opts.color;
    p.tailSprite.scale.set(scale * 1.25, scale * 0.95);
    p.coreSprite.scale.set(scale * 0.55);

    p.container.position.set(p.x, p.y);
    p.container.rotation = angle;
    p.container.visible = true;
  }

  /**
   * Soft glowing elemental burst (no more sharp polygon blocks!).
   */
  public spawnBurst(x: number, y: number, color: number, count = 14, spreadRadius = 26): void {
    // Central soft bloom flash
    this.spawnSpriteFx({
      tex: 'softGlow',
      x,
      y,
      scaleX: 0.45,
      endScaleX: 1.35,
      tint: color,
      alpha: 0.82,
      life: 0.26,
      darkHalo: true,
    });
    this.spawnSpriteFx({
      tex: 'impactFlare',
      x,
      y,
      scaleX: 0.28,
      endScaleX: 0.72,
      rotation: Math.random() * Math.PI,
      tint: 0xffffff,
      alpha: 0.95,
      life: 0.22,
    });

    const n = Math.min(28, count);
    for (let i = 0; i < n; i++) {
      const a = Math.random() * Math.PI * 2;
      const spd = 85 + Math.random() * 210;
      const useStreak = i % 3 === 0;
      this.spawnSpriteFx({
        tex: useStreak ? 'energyBeam' : 'softGlow',
        x: x + (Math.random() - 0.5) * spreadRadius,
        y: y + (Math.random() - 0.5) * spreadRadius,
        vx: Math.cos(a) * spd,
        vy: Math.sin(a) * spd - 35,
        gravity: 140,
        drag: 0.95,
        rotation: useStreak ? a : 0,
        scaleX: useStreak ? 0.16 + Math.random() * 0.14 : 0.12 + Math.random() * 0.14,
        scaleY: useStreak ? 0.12 : 0.12 + Math.random() * 0.14,
        endScaleX: 0.03,
        endScaleY: 0.03,
        tint: i % 4 === 0 ? 0xffffff : color,
        alpha: 0.95,
        life: 0.28 + Math.random() * 0.3,
        darkHalo: !useStreak && i % 2 === 0,
      });
    }
  }

  /**
   * Role-aware non-blocky anime hit impact (Slash, Pierce, Arcane, Blunt, Heal).
   */
  public spawnHitImpact(
    x: number,
    y: number,
    style: HitImpactStyle,
    color: number,
    isCrit = false,
  ): void {
    const mult = isCrit ? 1.35 : 1.0;

    // 1. Crisp core flash for every hit
    this.spawnSpriteFx({
      tex: 'impactFlare',
      x,
      y,
      rotation: Math.random() * Math.PI,
      scaleX: 0.24 * mult,
      endScaleX: 0.62 * mult,
      tint: isCrit ? 0xfef08a : 0xffffff,
      alpha: 0.96,
      life: 0.2,
      darkHalo: true,
    });

    if (style === 'SLASH') {
      const a = -0.65 + (Math.random() - 0.5) * 0.9;
      this.spawnSpriteFx({
        tex: 'energyBeam',
        x,
        y,
        rotation: a,
        scaleX: 0.34 * mult,
        scaleY: 0.16 * mult,
        endScaleX: 0.72 * mult,
        endScaleY: 0.04,
        tint: color,
        alpha: 0.95,
        life: 0.18,
        darkHalo: true,
      });
      if (isCrit) {
        this.spawnSpriteFx({
          tex: 'energyBeam',
          x,
          y,
          rotation: a + 1.45,
          scaleX: 0.28 * mult,
          scaleY: 0.14 * mult,
          endScaleX: 0.65 * mult,
          endScaleY: 0.03,
          tint: 0xffffff,
          alpha: 0.95,
          life: 0.2,
        });
      }
      for (let i = 0; i < (isCrit ? 6 : 3); i++) {
        const sa = a + (Math.random() - 0.5) * 1.4;
        const spd = 140 + Math.random() * 140;
        this.spawnSpriteFx({
          tex: 'energyBeam',
          x,
          y,
          vx: Math.cos(sa) * spd,
          vy: Math.sin(sa) * spd,
          rotation: sa,
          scaleX: 0.14,
          scaleY: 0.09,
          endScaleX: 0.04,
          endScaleY: 0.02,
          tint: i % 2 === 0 ? 0xfef08a : color,
          life: 0.22,
        });
      }
    } else if (style === 'PIERCE') {
      const a = (Math.random() - 0.5) * 0.35;
      this.spawnSpriteFx({
        tex: 'arrowStreak',
        x,
        y,
        rotation: a,
        scaleX: 0.36 * mult,
        scaleY: 0.38 * mult,
        endScaleX: 0.75 * mult,
        endScaleY: 0.08,
        tint: color,
        alpha: 0.95,
        life: 0.2,
        darkHalo: true,
      });
      this.spawnSpriteFx({
        tex: 'ringHalo',
        x,
        y,
        scaleX: 0.12 * mult,
        scaleY: 0.24 * mult,
        endScaleX: 0.28 * mult,
        endScaleY: 0.52 * mult,
        tint: color,
        alpha: 0.82,
        life: 0.22,
      });
    } else if (style === 'ARCANE') {
      this.spawnSpriteFx({
        tex: 'softGlow',
        x,
        y,
        scaleX: 0.35 * mult,
        endScaleX: 0.95 * mult,
        tint: color,
        alpha: 0.75,
        life: 0.28,
        darkHalo: true,
      });
      for (let i = 0; i < (isCrit ? 6 : 4); i++) {
        const a = Math.random() * Math.PI * 2;
        const spd = 70 + Math.random() * 90;
        this.spawnSpriteFx({
          tex: color === 0xfb7185 || color === 0xf97316 ? 'fireWisp' : 'softGlow',
          x,
          y,
          vx: Math.cos(a) * spd,
          vy: Math.sin(a) * spd - 35,
          scaleX: 0.22 * mult,
          endScaleX: 0.05,
          tint: color,
          life: 0.32,
          darkHalo: true,
        });
      }
    } else if (style === 'BLUNT') {
      this.spawnSpriteFx({
        tex: 'ringHalo',
        x,
        y: y + 14,
        scaleX: 0.16 * mult,
        scaleY: 0.1 * mult,
        endScaleX: 0.52 * mult,
        endScaleY: 0.32 * mult,
        tint: color,
        alpha: 0.85,
        life: 0.28,
        darkHalo: true,
        groundLayer: true,
      });
      for (let i = 0; i < 4; i++) {
        const a = Math.random() * Math.PI * 2;
        this.spawnSpriteFx({
          tex: 'smokePuff',
          x: x + Math.cos(a) * 14,
          y: y + 12 + Math.sin(a) * 8,
          vx: Math.cos(a) * 55,
          vy: -25 - Math.random() * 35,
          scaleX: 0.22 * mult,
          endScaleX: 0.45 * mult,
          tint: 0xd6d3d1,
          alpha: 0.58,
          life: 0.38,
        });
      }
    } else {
      // HEAL
      this.spawnSpriteFx({
        tex: 'softGlow',
        x,
        y,
        scaleX: 0.45,
        endScaleX: 1.05,
        tint: color,
        alpha: 0.65,
        life: 0.45,
      });
      for (let i = 0; i < 5; i++) {
        this.spawnSpriteFx({
          tex: 'petalLeaf',
          x: x + (Math.random() - 0.5) * 44,
          y: y + 16,
          vx: (Math.random() - 0.5) * 28,
          vy: -55 - Math.random() * 50,
          spin: (Math.random() - 0.5) * 5,
          scaleX: 0.26,
          endScaleX: 0.1,
          tint: i % 2 === 0 ? 0xffffff : color,
          life: 0.55,
        });
      }
    }
  }

  /**
   * Soft perspective ground shockwave + optional arcane rune ring.
   */
  public spawnRingWave(
    x: number,
    y: number,
    maxRadius: number,
    color: number,
    duration = 0.52,
  ): void {
    const targetScale = Math.max(0.5, maxRadius / 118);
    // Outer soft energy shockwave ring
    this.spawnSpriteFx({
      tex: 'ringHalo',
      x,
      y,
      scaleX: targetScale * 0.24,
      scaleY: targetScale * 0.15,
      endScaleX: targetScale * 1.15,
      endScaleY: targetScale * 0.72,
      tint: color,
      alpha: 0.92,
      life: Math.max(0.36, duration),
      darkHalo: true,
      groundLayer: true,
    });
    // Crisp inner luminous ring
    this.spawnSpriteFx({
      tex: 'ringHalo',
      x,
      y,
      scaleX: targetScale * 0.16,
      scaleY: targetScale * 0.1,
      endScaleX: targetScale * 0.82,
      endScaleY: targetScale * 0.52,
      tint: 0xffffff,
      alpha: 0.85,
      life: Math.max(0.3, duration * 0.82),
      groundLayer: true,
    });
  }

  /**
   * Razor-tapered anime crescent blade slash (replaces blocky .arc()!).
   */
  public spawnSlashArc(x: number, y: number, angle: number, radius: number, color: number): void {
    const sc = Math.max(0.55, radius / 95);
    // Outer saturated curved blade with crisp dark ink shadow
    this.spawnSpriteFx({
      tex: 'crescentSlash',
      x,
      y,
      rotation: angle,
      spin: 0.45,
      scaleX: sc * 0.78,
      scaleY: sc * 0.82,
      endScaleX: sc * 1.24,
      endScaleY: sc * 1.16,
      tint: color,
      alpha: 0.96,
      life: 0.3,
      darkHalo: true,
    });
    // Pure white razor leading edge
    this.spawnSpriteFx({
      tex: 'crescentSlash',
      x: x + Math.cos(angle) * 6,
      y: y + Math.sin(angle) * 6,
      rotation: angle,
      spin: 0.45,
      scaleX: sc * 0.68,
      scaleY: sc * 0.7,
      endScaleX: sc * 1.08,
      endScaleY: sc * 1.02,
      tint: 0xffffff,
      alpha: 0.92,
      life: 0.22,
    });
  }

  /**
   * Smooth feathered plasma/energy beam (replaces hard .lineTo()!).
   */
  public spawnBeam(
    x1: number,
    y1: number,
    x2: number,
    y2: number,
    color: number,
    width = 20,
  ): void {
    const dx = x2 - x1;
    const dy = y2 - y1;
    const len = Math.max(40, Math.hypot(dx, dy));
    const angle = Math.atan2(dy, dx);
    const sx = len / 236;
    const sy = Math.max(0.35, width / 20);

    // Outer saturated beam ribbon with soft dark rim
    this.spawnSpriteFx({
      tex: 'energyBeam',
      x: x1,
      y: y1,
      anchorX: 0,
      anchorY: 0.5,
      rotation: angle,
      scaleX: sx,
      scaleY: sy * 1.3,
      endScaleX: sx,
      endScaleY: sy * 0.25,
      tint: color,
      alpha: 0.95,
      life: 0.3,
      darkHalo: true,
    });
    // White plasma inner core
    this.spawnSpriteFx({
      tex: 'energyBeam',
      x: x1,
      y: y1,
      anchorX: 0,
      anchorY: 0.5,
      rotation: angle,
      scaleX: sx,
      scaleY: sy * 0.58,
      endScaleX: sx,
      endScaleY: sy * 0.1,
      tint: 0xffffff,
      alpha: 1,
      life: 0.24,
    });
    // Luminous muzzle & impact bloom
    this.spawnSpriteFx({
      tex: 'impactFlare',
      x: x2,
      y: y2,
      scaleX: 0.45,
      endScaleX: 0.95,
      tint: color,
      alpha: 0.95,
      life: 0.28,
      darkHalo: true,
    });
  }

  /**
   * Volumetric feathered celestial energy pillar (ZERO .rect() edges!).
   */
  public spawnSkyPillar(
    x: number,
    y: number,
    radius: number,
    color: number,
    isUlt = false,
  ): void {
    const wScale = Math.max(0.65, (radius * (isUlt ? 1.55 : 1.15)) / 140);
    const hScale = isUlt ? 1.65 : 1.15;
    const dur = isUlt ? 0.78 : 0.52;

    // Ground arcane seal + crater glow
    this.spawnSpriteFx({
      tex: 'magicCircle',
      x,
      y,
      spin: 1.5,
      scaleX: wScale * 0.85,
      scaleY: wScale * 0.54,
      endScaleX: wScale * 1.35,
      endScaleY: wScale * 0.85,
      tint: color,
      alpha: 0.9,
      life: dur,
      darkHalo: true,
      groundLayer: true,
    });
    // Soft outer volumetric sky column
    this.spawnSpriteFx({
      tex: 'skyColumn',
      x,
      y: y + 18,
      anchorX: 0.5,
      anchorY: 0.96,
      scaleX: wScale * 1.15,
      scaleY: hScale,
      endScaleX: wScale * 0.35,
      endScaleY: hScale * 1.08,
      tint: color,
      alpha: 0.92,
      life: dur,
      darkHalo: true,
    });
    // Blazing white inner plasma column
    this.spawnSpriteFx({
      tex: 'skyColumn',
      x,
      y: y + 14,
      anchorX: 0.5,
      anchorY: 0.96,
      scaleX: wScale * 0.52,
      scaleY: hScale,
      endScaleX: wScale * 0.12,
      endScaleY: hScale * 1.05,
      tint: 0xffffff,
      alpha: 0.98,
      life: dur * 0.82,
    });
    // Ascending impact halo ring
    this.spawnSpriteFx({
      tex: 'ringHalo',
      x,
      y,
      vy: -210,
      scaleX: wScale * 0.65,
      scaleY: wScale * 0.25,
      endScaleX: wScale * 1.3,
      endScaleY: wScale * 0.45,
      tint: 0xffffff,
      alpha: 0.9,
      life: dur * 0.75,
    });
  }

  public spawnFloatingText(
    x: number,
    y: number,
    msg: string,
    colorHex: number,
    isCrit = false,
  ): void {
    const t = this.texts.find((item) => !item.active);
    if (!t) return;
    t.active = true;
    t.maxLife = isCrit ? 0.95 : 0.75;
    t.life = t.maxLife;
    t.vx = (Math.random() - 0.5) * 38;
    t.vy = isCrit ? -96 : -70;
    t.baseScale = isCrit ? 1.2 : 0.96;

    t.text.style = isCrit ? this.critStyle : this.normalStyle;
    t.text.tint = colorHex;
    t.text.text = msg;
    t.text.position.set(x + (Math.random() - 0.5) * 24, y - 40);
    t.text.scale.set(t.baseScale * 1.35);
    t.text.alpha = 1;
    t.text.visible = true;
  }

  public update(dt: number): void {
    // 1. Update soft-texture pooled Sprites
    for (const f of this.fxPool) {
      if (!f.active) continue;
      if (f.delay > 0) {
        f.delay -= dt;
        if (f.delay <= 0) {
          f.sprite.visible = true;
          if (f.hasHalo) f.halo.visible = true;
        }
        continue;
      }

      f.life -= dt;
      if (f.life <= 0) {
        f.active = false;
        f.sprite.visible = false;
        f.halo.visible = false;
        continue;
      }

      const progress = 1 - f.life / f.maxLife;
      const easeOut = 1 - Math.pow(1 - progress, 2.2);

      if (f.drag < 1) {
        const d = Math.pow(f.drag, dt * 60);
        f.vx *= d;
        f.vy *= d;
      }
      f.vy += f.gravity * dt;
      f.x += f.vx * dt;
      f.y += f.vy * dt;
      f.rotation += f.spin * dt;

      const curSX = f.startScaleX + (f.endScaleX - f.startScaleX) * easeOut;
      const curSY = f.startScaleY + (f.endScaleY - f.startScaleY) * easeOut;
      // Smooth punch-in & fade-out alpha envelope
      const env = progress < 0.12 ? progress / 0.12 : Math.max(0, 1 - (progress - 0.12) / 0.88);
      const a = f.startAlpha * Math.pow(env, 0.85);

      f.sprite.position.set(f.x, f.y);
      f.sprite.rotation = f.rotation;
      f.sprite.scale.set(curSX, curSY);
      f.sprite.alpha = a;

      if (f.hasHalo) {
        f.halo.position.set(f.x, f.y + 2);
        f.halo.rotation = f.rotation;
        f.halo.scale.set(curSX * 1.12, curSY * 1.12);
        f.halo.alpha = a * 0.45;
      }
    }

    // 2. Update projectiles + silky glowing trails
    for (const p of this.projectiles) {
      if (!p.active) continue;
      const dx = p.tx - p.x;
      const dy = p.ty - p.y;
      const dist = Math.hypot(dx, dy);
      const step = p.speed * dt;
      if (dist <= step + 8) {
        p.active = false;
        p.container.visible = false;
        p.onHit(p.tx, p.ty);
      } else {
        p.x += (dx / dist) * step;
        p.y += (dy / dist) * step;
        p.container.position.set(p.x, p.y);
        p.trailTimer += dt;
        if (p.trailTimer >= 0.03) {
          p.trailTimer = 0;
          this.spawnSpriteFx({
            tex: 'softGlow',
            x: p.x,
            y: p.y,
            scaleX: Math.max(0.12, p.radius / 38),
            endScaleX: 0.02,
            tint: p.color,
            alpha: 0.65,
            life: 0.18,
          });
        }
      }
    }

    // 3. Update floating combat numbers
    for (const t of this.texts) {
      if (!t.active) continue;
      t.life -= dt;
      if (t.life <= 0) {
        t.active = false;
        t.text.visible = false;
        continue;
      }
      t.text.x += t.vx * dt;
      t.text.y += t.vy * dt;
      t.vy *= 0.94;
      const ratio = t.life / t.maxLife;
      const pop = ratio > 0.8 ? 1 + (ratio - 0.8) * 1.8 : 1;
      t.text.scale.set(t.baseScale * pop);
      t.text.alpha = Math.min(1, ratio * 2.1);
    }
  }

  public clearAll(): void {
    for (const f of this.fxPool) {
      f.active = false;
      f.sprite.visible = false;
      f.halo.visible = false;
    }
    for (const p of this.projectiles) {
      p.active = false;
      p.container.visible = false;
    }
    for (const t of this.texts) {
      t.active = false;
      t.text.visible = false;
    }
  }

  public destroy(): void {
    this.groundVfxLayer.destroy({ children: true });
    this.vfxLayer.destroy({ children: true });
    this.textLayer.destroy({ children: true });
  }
}
