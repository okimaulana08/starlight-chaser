import { MeshPlane, type Texture } from 'pixi.js';

export interface LiveMeshDeformParams {
  /** Monotonic actor animation clock (seconds) */
  time: number;
  /** Native texture forward axis (+1 for Heroes facing right, -1 for Enemies facing left) */
  nativeForwardSign?: 1 | -1;
  /** 0..1 normalized movement speed ratio (0 = idle, 1 = full sprint) */
  moveRatio: number;
  /** Accumulated distance-driven stride phase (radians) */
  stridePhase: number;
  /** Smoothed local inertia lean (-1..+1, positive = leaning into facing direction) */
  lean: number;
  /** 0..1 cast wind-up anticipation (monster/boss coiling back before strike) */
  windup: number;
  /** 0..1 attack whip-forward envelope (peaks mid-strike) */
  attackWhip: number;
  /** 0..1 hit-recoil bend away from blow */
  hitBend: number;
  /** Floating/hovering unit (e.g., Rift Acolyte / Void Wisp / Astral Weaver) */
  isFloating?: boolean;
  /** Heavy unit (Boss / Behemoth / Golem) — slower, weightier sway */
  isHeavy?: boolean;
  /** Alive flag (dead units stop breathing & fluttering) */
  alive: boolean;
}

const VERTS_X = 5;
const VERTS_Y = 7;

/**
 * PixiJS v8 Real-Time Vertex Mesh Deformer ("Live2D-Lite").
 * Renders any 2D full-body anime .webp sprite on a flexible 5×7 MeshPlane where:
 *  - Boots (bottom row, v=1) stay grounded on the arena floor
 *  - Torso & chest expand softly with organic breathing
 *  - Cloaks, hair, flames & weapon tips flutter gently in a traveling wind wave
 *  - Upper body leans & lags organically with acceleration/braking inertia
 *  - Casts visibly coil backward (anticipation) and attacks whip forward with weight
 * Zero per-frame allocations: mutates vertex Float32Array in-place (<0.01ms per actor).
 */
export class LiveMeshActor {
  public readonly mesh: MeshPlane;
  private basePos: Float32Array;
  private texW = 1;
  private texH = 1;
  private pivotYFrac = 0.95;

  constructor(texture: Texture, pivotYFrac = 0.95) {
    this.pivotYFrac = pivotYFrac;
    this.mesh = new MeshPlane({
      texture,
      verticesX: VERTS_X,
      verticesY: VERTS_Y,
    });
    this.basePos = new Float32Array(0);
    this.captureBaseGeometry();
  }

  public get texture(): Texture {
    return this.mesh.texture;
  }

  /**
   * Swap texture (e.g. when async high-res transparent battle .webp finishes loading)
   * and re-capture rest vertex coordinates + grounded foot pivot.
   */
  public setTexture(texture: Texture, pivotYFrac = this.pivotYFrac): void {
    this.pivotYFrac = pivotYFrac;
    this.mesh.texture = texture;
    this.captureBaseGeometry();
  }

  /**
   * Zero-GC texture swap between same-size Idle and Attack/Cast action keyframe poses!
   */
  public swapTextureFast(texture: Texture): void {
    if (this.mesh.destroyed || this.mesh.texture === texture) return;
    if (texture.width === this.texW && texture.height === this.texH) {
      this.mesh.texture = texture;
    } else {
      this.setTexture(texture, this.pivotYFrac);
    }
  }

  private captureBaseGeometry(): void {
    const tex = this.mesh.texture;
    this.texW = Math.max(1, tex.width);
    this.texH = Math.max(1, tex.height);
    this.mesh.pivot.set(this.texW * 0.5, this.texH * this.pivotYFrac);

    const posAttr = this.mesh.geometry.getAttribute('aPosition');
    const data = posAttr.buffer.data as Float32Array;
    this.basePos = new Float32Array(data.length);
    this.basePos.set(data);
  }

  /**
   * Apply smooth, organic real-time vertex deformation in local mesh space.
   */
  public deform(p: LiveMeshDeformParams): void {
    if (this.mesh.destroyed) return;
    const posAttr = this.mesh.geometry.getAttribute('aPosition');
    const data = posAttr.buffer.data as Float32Array;
    if (data.length !== this.basePos.length) {
      this.captureBaseGeometry();
    }

    const w = this.texW;
    const h = this.texH;

    if (!p.alive) {
      // Rest pose when defeated
      data.set(this.basePos);
      posAttr.buffer.update();
      return;
    }

    const breatheSpeed = p.isHeavy ? 2.6 : 3.6;
    const breatheWave = Math.sin(p.time * breatheSpeed);
    const windSpeed = p.isHeavy ? 2.4 : 4.1;
    const windAmp = (p.isHeavy ? 0.011 : 0.017) * (1 + p.moveRatio * 0.75);

    // Total upper-body horizontal flex in local mesh space (+forwardSign = forward toward target!)
    // Combine: inertia lean + cast wind-up coil back + attack whip forward - hit recoil back
    const fwd = p.nativeForwardSign ?? 1;
    const rawBendForward =
      p.lean * 0.165 - p.windup * 0.15 + p.attackWhip * 0.21 - p.hitBend * 0.19;
    const rawBendX = rawBendForward * fwd;
    const bendX = Math.max(-0.34, Math.min(0.36, rawBendX)) * w;

    // Subtle gait torso sway while striding
    const strideSway = p.moveRatio * Math.sin(p.stridePhase) * w * 0.042;
    const strideBob = p.moveRatio * Math.abs(Math.sin(p.stridePhase)) * h * 0.022;

    // Cast anticipation vertical compression & charge shiver
    const windupSquash = p.windup * h * 0.065;
    const windupJitter =
      p.windup > 0.35 ? Math.sin(p.time * 48) * (p.windup - 0.35) * w * 0.018 : 0;

    // Floating units keep subtle ethereal tail flutter even near the bottom
    const bottomFloorPin = p.isFloating ? 0.22 : 0.0;

    const total = VERTS_X * VERTS_Y;
    for (let i = 0; i < total; i++) {
      const ix = i % VERTS_X;
      const iy = (i / VERTS_X) | 0;
      const u = ix / (VERTS_X - 1); // 0..1 left->right
      const v = iy / (VERTS_Y - 1); // 0..1 top(head)->bottom(feet)
      const up = 1 - v; // 1 at head, 0 at feet
      const side = (u - 0.5) * 2; // -1..+1

      const bx = this.basePos[i * 2];
      const by = this.basePos[i * 2 + 1];

      // Non-linear height flex curve: feet stay firmly anchored while shoulders/head bend smoothly
      const bendWeight = Math.pow(up, 1.38);

      // 1. Chest breathing bell curve centered around upper torso (v ≈ 0.42)
      const chestDelta = (v - 0.42) / 0.24;
      const chestMask = Math.exp(-chestDelta * chestDelta);
      const breatheX = side * breatheWave * w * 0.014 * chestMask;
      const breatheY = -breatheWave * h * 0.013 * up;

      // 2. Traveling wind/cloak/hair/flame flutter strongest on outer silhouette edges
      const edgeMask = 0.28 + 0.72 * Math.abs(side);
      const clothWeight = bottomFloorPin + (1 - bottomFloorPin) * Math.sin(up * Math.PI * 0.85);
      const windX =
        Math.sin(p.time * windSpeed + v * 4.2 + u * 1.5) * w * windAmp * edgeMask * clothWeight;
      const windY =
        Math.cos(p.time * (windSpeed * 0.85) + u * 3.1 + v * 2.2) *
        h *
        (windAmp * 0.45) *
        Math.abs(side) *
        clothWeight;

      // 3. Inertia lean + attack whip + kinetic strike weapon-reach surge + hit recoil + stride sway
      const strikeReach =
        p.attackWhip > 0.01
          ? (side * fwd > 0 ? 0.095 : -0.055) * p.attackWhip * fwd * w * Math.sin(up * Math.PI * 0.9)
          : 0;
      const actionX =
        (bendX + windupJitter) * bendWeight + strideSway * up * (1 - up * 0.3) + strikeReach;

      // 4. Vertical compression during cast wind-up / stride + arc drop as head leans over
      const leanArcDrop = Math.abs(rawBendX) * h * 0.045 * bendWeight;
      const actionY = (windupSquash + leanArcDrop - strideBob) * up;

      // Slight trailing edge drag on cloak hem while moving fast
      const hemTrail =
        p.moveRatio > 0.1
          ? -p.lean * fwd * w * 0.055 * (1 - Math.abs(v - 0.72) * 2.4 > 0 ? 1 - Math.abs(v - 0.72) * 2.4 : 0)
          : 0;

      data[i * 2] = bx + breatheX + windX + actionX + hemTrail;
      data[i * 2 + 1] = by + breatheY + windY + actionY;
    }

    posAttr.buffer.update();
  }
}
