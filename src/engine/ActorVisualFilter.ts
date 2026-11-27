import { Filter, GlProgram, UniformGroup, defaultFilterVert } from 'pixi.js';
import type { DungeonId } from '../types/game';
import { resolveBiomeWeather, type BiomeWeatherKind } from './BiomeWeatherSystem';

export interface BiomeLightingConfig {
  kind: BiomeWeatherKind;
  /** RGB (0..1) directional rim highlight color matching the biome's key light */
  rimColor: [number, number, number];
  /** Intensity of directional biome rim lighting on character edges */
  rimStrength: number;
  /** Normalized 2D vector pointing TOWARD the light source in screen/UV space */
  lightDir: [number, number];
  /** Dark ink contour RGB (0..1) so sprites pop cleanly against both bright marble and dark abyss */
  outlineColor: [number, number, number];
  /** Projected 2.5D floor cast-shadow tint hex */
  shadowTint: number;
  /** Projected 2.5D floor cast-shadow base opacity */
  shadowAlpha: number;
  /** Horizontal skew (radians) of projected silhouette shadow matching biome sun angle */
  shadowSkewX: number;
  /** Vertical squash factor (negative projects shadow cleanly downward onto isometric floor) */
  shadowScaleY: number;
  /** Biome-matched footstep dust color */
  dustTint: number;
}

export function hexToRgb01(hex: number): [number, number, number] {
  return [
    ((hex >> 16) & 0xff) / 255,
    ((hex >> 8) & 0xff) / 255,
    (hex & 0xff) / 255,
  ];
}

/**
 * Per-biome 2.5D lighting & projected shadow presets for all 10 Chapters + 5 Rift Dungeons.
 * Synchronized with BiomeWeatherSystem light shafts so cast shadows and rim highlights match the scene!
 */
export function getBiomeLighting(chapter: number, dungeonId?: DungeonId): BiomeLightingConfig {
  const kind = resolveBiomeWeather(chapter, dungeonId);
  switch (kind) {
    case 'SOLARIS_RAYS':
      return {
        kind,
        rimColor: hexToRgb01(0xfef08a),
        rimStrength: 0.4,
        lightDir: [-0.82, -0.57],
        outlineColor: [0.05, 0.04, 0.12],
        shadowTint: 0x060714,
        shadowAlpha: 0.25,
        shadowSkewX: -0.56,
        shadowScaleY: -0.25,
        dustTint: 0xe7dfd0,
      };
    case 'ASTRAL_STARFALL':
      return {
        kind,
        rimColor: hexToRgb01(0x7dd3fc),
        rimStrength: 0.48,
        lightDir: [-0.72, -0.69],
        outlineColor: [0.03, 0.05, 0.15],
        shadowTint: 0x050714,
        shadowAlpha: 0.32,
        shadowSkewX: -0.44,
        shadowScaleY: -0.25,
        dustTint: 0xbae6fd,
      };
    case 'VERDANT_CANOPY':
      return {
        kind,
        rimColor: hexToRgb01(0x86efac),
        rimStrength: 0.44,
        lightDir: [-0.76, -0.65],
        outlineColor: [0.04, 0.09, 0.08],
        shadowTint: 0x040d0a,
        shadowAlpha: 0.3,
        shadowSkewX: -0.48,
        shadowScaleY: -0.25,
        dustTint: 0xbbf7d0,
      };
    case 'ASHEN_EMBERS':
      return {
        kind,
        rimColor: hexToRgb01(0xfb923c),
        rimStrength: 0.54,
        lightDir: [0.74, 0.42], // Warm volcanic lava under-glow from right/below!
        outlineColor: [0.1, 0.03, 0.03],
        shadowTint: 0x0a0303,
        shadowAlpha: 0.36,
        shadowSkewX: 0.48,
        shadowScaleY: -0.24,
        dustTint: 0xfdba74,
      };
    case 'FROST_BLIZZARD':
      return {
        kind,
        rimColor: hexToRgb01(0xbae6fd),
        rimStrength: 0.46,
        lightDir: [-0.8, -0.6],
        outlineColor: [0.04, 0.08, 0.18],
        shadowTint: 0x060f1f,
        shadowAlpha: 0.28,
        shadowSkewX: -0.5,
        shadowScaleY: -0.25,
        dustTint: 0xe0f2fe,
      };
    case 'PELAGIA_TIDE':
      return {
        kind,
        rimColor: hexToRgb01(0x22d3ee),
        rimStrength: 0.5,
        lightDir: [-0.45, -0.89], // Overhead caustic shimmer
        outlineColor: [0.02, 0.07, 0.14],
        shadowTint: 0x030c18,
        shadowAlpha: 0.34,
        shadowSkewX: -0.28,
        shadowScaleY: -0.24,
        dustTint: 0xa5f3fc,
      };
    case 'ZEPHYR_STORM':
      return {
        kind,
        rimColor: hexToRgb01(0xa5f3fc),
        rimStrength: 0.48,
        lightDir: [-0.86, -0.51],
        outlineColor: [0.04, 0.06, 0.14],
        shadowTint: 0x060914,
        shadowAlpha: 0.32,
        shadowSkewX: -0.58,
        shadowScaleY: -0.25,
        dustTint: 0xcbd5e1,
      };
    case 'SOLIS_MIRAGE':
      return {
        kind,
        rimColor: hexToRgb01(0xfcd34d),
        rimStrength: 0.48,
        lightDir: [-0.88, -0.47],
        outlineColor: [0.12, 0.06, 0.03],
        shadowTint: 0x120904,
        shadowAlpha: 0.28,
        shadowSkewX: -0.62,
        shadowScaleY: -0.26,
        dustTint: 0xfde68a,
      };
    case 'VOID_RIFT':
    default:
      return {
        kind: 'VOID_RIFT',
        rimColor: hexToRgb01(0xe879f9),
        rimStrength: 0.52,
        lightDir: [0.68, -0.73],
        outlineColor: [0.06, 0.02, 0.12],
        shadowTint: 0x04020a,
        shadowAlpha: 0.38,
        shadowSkewX: 0.44,
        shadowScaleY: -0.25,
        dustTint: 0xd8b4fe,
      };
  }
}

/**
 * Single-pass PixiJS v8 WebGL GLSL 300es shader delivering:
 *  1. Crisp Anime Dark Ink Contour + Expanding Outer Status/Power Aura Rim
 *  2. Directional 2.5D Biome Rim Lighting on sunlit edges
 *  3. Pure White-Gold Anime Hit-Flash
 *  4. Status Edge Glaze (Boss Enraged Crimson, Broken Cyan, Frozen Ice, Burning Ember, Ult Ready Gold)
 *  5. Procedural Starlight Ash Death Dissolve with burning gold-violet disintegration edge
 */
const ACTOR_VISUAL_FRAG = `
in vec2 vTextureCoord;
out vec4 finalColor;

uniform sampler2D uTexture;
uniform vec4 uInputClamp;
uniform highp vec4 uInputSize;

uniform float uTime;
uniform vec3 uBiomeRimColor;
uniform float uBiomeRimStrength;
uniform vec2 uLightDir;
uniform vec3 uOutlineColor;
uniform vec3 uStatusColor;
uniform float uStatusIntensity;
uniform float uHitFlash;
uniform float uDissolve;
uniform vec3 uDissolveColor;

float hash21(vec2 p) {
  p = fract(p * vec2(123.34, 456.21));
  p += dot(p, p + 45.32);
  return fract(p.x * p.y);
}

float valueNoise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  vec2 u = f * f * (3.0 - 2.0 * f);
  float a = hash21(i);
  float b = hash21(i + vec2(1.0, 0.0));
  float c = hash21(i + vec2(0.0, 1.0));
  float d = hash21(i + vec2(1.0, 1.0));
  return mix(mix(a, b, u.x), mix(c, d, u.x), u.y);
}

float sampleAlpha(vec2 uv) {
  return texture(uTexture, clamp(uv, uInputClamp.xy, uInputClamp.zw)).a;
}

void main() {
  vec4 tex = texture(uTexture, vTextureCoord);
  vec2 px = uInputSize.zw;

  // 1. Exterior pixel: Crisp Anime Ink Contour + Power/Status Rim Aura Glow
  if (tex.a < 0.14) {
    if (uDissolve > 0.02) {
      finalColor = vec4(0.0);
      return;
    }

    vec2 step1 = px * 1.45;
    float a1 = max(
      max(sampleAlpha(vTextureCoord + vec2(step1.x, 0.0)), sampleAlpha(vTextureCoord - vec2(step1.x, 0.0))),
      max(sampleAlpha(vTextureCoord + vec2(0.0, step1.y)), sampleAlpha(vTextureCoord - vec2(0.0, step1.y)))
    );

    float outerGlow = 0.0;
    if (uStatusIntensity > 0.04) {
      vec2 step2 = px * (2.6 + sin(uTime * 8.0) * 0.45);
      float a2 = max(
        max(sampleAlpha(vTextureCoord + vec2(step2.x, step2.y)), sampleAlpha(vTextureCoord + vec2(-step2.x, step2.y))),
        max(sampleAlpha(vTextureCoord + vec2(step2.x, -step2.y)), sampleAlpha(vTextureCoord + vec2(-step2.x, -step2.y)))
      );
      outerGlow = smoothstep(0.18, 0.72, max(a1, a2)) * uStatusIntensity * 0.76;
    }

    float inkAlpha = smoothstep(0.24, 0.76, a1) * 0.66;
    if (inkAlpha <= 0.01 && outerGlow <= 0.01) {
      finalColor = vec4(0.0);
      return;
    }

    // Status glow smoothly overtakes dark ink contour when hero/boss enters powered state!
    float totalA = max(inkAlpha, outerGlow);
    float glowMix = clamp(outerGlow / max(totalA, 0.001), 0.0, 1.0);
    vec3 outRgb = mix(uOutlineColor, uStatusColor, glowMix);
    finalColor = vec4(outRgb * totalA, totalA);
    return;
  }

  // Un-premultiply color for crisp linear lighting & flash blending
  vec3 rgb = tex.rgb / max(tex.a, 0.0001);
  float alpha = tex.a;

  // 2. Procedural Starlight Ash Death Dissolve (noise-driven burning disintegration!)
  if (uDissolve > 0.001) {
    vec2 nUv = vTextureCoord * uInputSize.xy * 0.052;
    float n = valueNoise(nUv) * 0.68 + valueNoise(nUv * 2.15 + vec2(3.7, uTime * 0.6)) * 0.32;
    // Slight directional burn from edges & bottom upward
    float threshold = uDissolve * 1.16;
    float edgeDist = n - threshold;
    if (edgeDist < -0.09) {
      finalColor = vec4(0.0);
      return;
    }
    float burnEdge = 1.0 - smoothstep(-0.09, 0.11, edgeDist);
    vec3 emberGlow = mix(uDissolveColor, vec3(1.0, 0.96, 0.72), burnEdge * 0.72);
    rgb = mix(rgb, emberGlow * 1.35, burnEdge * 0.95);
    alpha *= smoothstep(-0.09, 0.02, edgeDist);
  }

  // 3. Directional 2.5D Biome Rim Lighting (samples toward key light direction!)
  float lightA1 = sampleAlpha(vTextureCoord + uLightDir * px * 2.2);
  float lightA2 = sampleAlpha(vTextureCoord + uLightDir * px * 4.2);
  float directionalRim = clamp(1.0 - min(lightA1, lightA2 * 0.8 + 0.2), 0.0, 1.0);
  rgb += uBiomeRimColor * directionalRim * uBiomeRimStrength;

  // 4. Inner Status Rim & Subtle Glaze (Enraged / Broken / Frozen / Burning / Ult Ready / Windup)
  if (uStatusIntensity > 0.01) {
    vec2 stepIn = px * 2.1;
    float minNeighbor = min(
      min(sampleAlpha(vTextureCoord + vec2(stepIn.x, 0.0)), sampleAlpha(vTextureCoord - vec2(stepIn.x, 0.0))),
      min(sampleAlpha(vTextureCoord + vec2(0.0, stepIn.y)), sampleAlpha(vTextureCoord - vec2(0.0, stepIn.y)))
    );
    float innerRim = clamp(1.0 - minNeighbor, 0.0, 1.0);
    float pulse = 0.84 + 0.16 * sin(uTime * 9.0);
    rgb = mix(rgb, rgb + uStatusColor * (0.22 + innerRim * 0.95), uStatusIntensity * pulse * 0.68);
  }

  // 5. Crisp Anime White-Gold Impact Hit Flash
  if (uHitFlash > 0.005) {
    rgb = mix(rgb, vec3(1.0, 0.97, 0.88), clamp(uHitFlash * 0.86, 0.0, 0.92));
  }

  // Re-premultiply cleanly for PixiJS compositor
  finalColor = vec4(rgb * alpha, alpha);
}
`;

let sharedGlProgram: GlProgram | null = null;

function getSharedActorProgram(): GlProgram {
  if (!sharedGlProgram) {
    sharedGlProgram = GlProgram.from({
      vertex: defaultFilterVert,
      fragment: ACTOR_VISUAL_FRAG,
      name: 'starlight-actor-25d-visual',
    });
  }
  return sharedGlProgram;
}

export class ActorVisualFilter extends Filter {
  private readonly uGroup: UniformGroup;

  constructor(lighting: BiomeLightingConfig) {
    const uGroup = new UniformGroup({
      uTime: { value: 0, type: 'f32' },
      uBiomeRimColor: { value: new Float32Array(lighting.rimColor), type: 'vec3<f32>' },
      uBiomeRimStrength: { value: lighting.rimStrength, type: 'f32' },
      uLightDir: { value: new Float32Array(lighting.lightDir), type: 'vec2<f32>' },
      uOutlineColor: { value: new Float32Array(lighting.outlineColor), type: 'vec3<f32>' },
      uStatusColor: { value: new Float32Array([1, 0.85, 0.35]), type: 'vec3<f32>' },
      uStatusIntensity: { value: 0, type: 'f32' },
      uHitFlash: { value: 0, type: 'f32' },
      uDissolve: { value: 0, type: 'f32' },
      uDissolveColor: { value: new Float32Array([0.78, 0.52, 1.0]), type: 'vec3<f32>' },
    });

    super({
      glProgram: getSharedActorProgram(),
      resources: {
        actorUniforms: uGroup,
      },
      padding: 8,
      resolution: 'inherit',
      antialias: 'off',
    });

    this.uGroup = uGroup;
  }

  public setFrameState(opts: {
    time: number;
    hitFlash: number;
    statusHex?: number;
    statusIntensity?: number;
    dissolve?: number;
    dissolveHex?: number;
  }): void {
    const u = this.uGroup.uniforms;
    u.uTime = opts.time;
    u.uHitFlash = opts.hitFlash;
    u.uStatusIntensity = opts.statusIntensity ?? 0;
    if (opts.statusHex !== undefined && (opts.statusIntensity ?? 0) > 0.005) {
      const rgb = u.uStatusColor as Float32Array;
      rgb[0] = ((opts.statusHex >> 16) & 0xff) / 255;
      rgb[1] = ((opts.statusHex >> 8) & 0xff) / 255;
      rgb[2] = (opts.statusHex & 0xff) / 255;
    }
    u.uDissolve = opts.dissolve ?? 0;
    if (opts.dissolveHex !== undefined && (opts.dissolve ?? 0) > 0.001) {
      const drgb = u.uDissolveColor as Float32Array;
      drgb[0] = ((opts.dissolveHex >> 16) & 0xff) / 255;
      drgb[1] = ((opts.dissolveHex >> 8) & 0xff) / 255;
      drgb[2] = (opts.dissolveHex & 0xff) / 255;
    }
  }
}

export function createActorVisualFilter(lighting: BiomeLightingConfig): ActorVisualFilter | null {
  try {
    return new ActorVisualFilter(lighting);
  } catch {
    return null;
  }
}
