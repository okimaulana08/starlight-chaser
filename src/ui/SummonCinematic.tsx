import React, { useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { FastForward, Sparkles } from 'lucide-react';
import { audioManager } from '../engine/AudioManager';
import { useSettingsStore } from '../store/useSettingsStore';
import type { GachaPullResult, Tier } from '../types/game';

interface SummonCinematicProps {
  results: GachaPullResult[];
  highestTier: Tier;
  bannerAccent: string;
  onComplete: () => void;
  onSkip: () => void;
}

interface TierPalette {
  primary: string;
  secondary: string;
  deep: string;
  core: string;
  rgb: [number, number, number];
  rgbAlt: [number, number, number];
  isPrismatic: boolean;
}

const PALETTES: Record<Tier, TierPalette> = {
  R: {
    primary: '#38bdf8',
    secondary: '#60a5fa',
    deep: '#0c4a6e',
    core: '#e0f2fe',
    rgb: [56, 189, 248],
    rgbAlt: [125, 211, 252],
    isPrismatic: false,
  },
  SR: {
    primary: '#c084fc',
    secondary: '#f472b6',
    deep: '#581c87',
    core: '#fae8ff',
    rgb: [192, 132, 252],
    rgbAlt: [244, 114, 182],
    isPrismatic: false,
  },
  SSR: {
    primary: '#fde047',
    secondary: '#f59e0b',
    deep: '#92400e',
    core: '#ffffff',
    rgb: [253, 224, 71],
    rgbAlt: [244, 114, 182],
    isPrismatic: true,
  },
};

interface WarpStar {
  x: number;
  y: number;
  z: number;
  pz: number;
  size: number;
  hue: number;
}

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  alpha: number;
  life: number;
  maxLife: number;
  color: string;
  shape: 'dot' | 'diamond' | 'shard' | 'ring' | 'feather';
  rot: number;
  vrot: number;
  drag: number;
}

interface ShockRing {
  x: number;
  y: number;
  radius: number;
  maxRadius: number;
  alpha: number;
  color: string;
  lineWidth: number;
  speed: number;
}

interface CompanionMeteor {
  tier: Tier;
  startTime: number;
  duration: number;
  startXFrac: number;
  startYFrac: number;
  ctrlXFrac: number;
  ctrlYFrac: number;
  impacted: boolean;
}

interface Vec3 {
  x: number;
  y: number;
  z: number;
}

// 3D Elongated Crystal Octahedron Vertices & Faces
const CRYSTAL_VERTS: Vec3[] = [
  { x: 0, y: -1.55, z: 0 }, // 0 top apex
  { x: 0.72, y: -0.18, z: 0.72 }, // 1 upper-front-right
  { x: -0.72, y: -0.18, z: 0.72 }, // 2 upper-front-left
  { x: -0.72, y: -0.18, z: -0.72 }, // 3 upper-back-left
  { x: 0.72, y: -0.18, z: -0.72 }, // 4 upper-back-right
  { x: 0, y: 1.55, z: 0 }, // 5 bottom apex
];

const CRYSTAL_FACES: [number, number, number][] = [
  [0, 1, 2],
  [0, 2, 3],
  [0, 3, 4],
  [0, 4, 1],
  [5, 2, 1],
  [5, 3, 2],
  [5, 4, 3],
  [5, 1, 4],
];

const TOTAL_DURATION = 4.25; // seconds — crisp, breathless, full AAA multi-act cadence

function easeOutCubic(t: number): number {
  return 1 - Math.pow(1 - Math.max(0, Math.min(1, t)), 3);
}

function easeInOutQuart(t: number): number {
  const c = Math.max(0, Math.min(1, t));
  return c < 0.5 ? 8 * c * c * c * c : 1 - Math.pow(-2 * c + 2, 4) / 2;
}

function easeInCubic(t: number): number {
  const c = Math.max(0, Math.min(1, t));
  return c * c * c;
}

function quadBezier(p0: number, p1: number, p2: number, t: number): number {
  const mt = 1 - t;
  return mt * mt * p0 + 2 * mt * t * p1 + t * t * p2;
}

function rainbowHex(seed: number): string {
  const cols = ['#fde047', '#38e8ff', '#f472b6', '#c084fc', '#34d399', '#ffffff'];
  return cols[Math.abs(Math.floor(seed)) % cols.length];
}

/**
 * Lightweight procedural Web Audio synthesizer for celestial risers, sweeps & harmonic chimes.
 * Respects AudioManager mute & SFX volume cleanly and fails silently if AudioContext is blocked.
 */
class SummonSynth {
  private ctx: AudioContext | null = null;

  private ensure(): AudioContext | null {
    if (audioManager.isMuted()) return null;
    try {
      if (!this.ctx) {
        const AudioCtx =
          window.AudioContext ||
          (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
        if (!AudioCtx) return null;
        this.ctx = new AudioCtx();
      }
      if (this.ctx.state === 'suspended') {
        void this.ctx.resume();
      }
      return this.ctx;
    } catch {
      return null;
    }
  }

  private gainScale(): number {
    return Math.max(0.05, audioManager.getVolumes().sfxVolume) * 0.22;
  }

  public playGateRiser(): void {
    const ctx = this.ensure();
    if (!ctx) return;
    const now = ctx.currentTime;
    const vol = this.gainScale();

    // Silky ascending celestial pad chord (D4 -> A4 -> D5 -> F#5)
    const freqs = [293.66, 440, 587.33, 739.99];
    freqs.forEach((f, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = idx % 2 === 0 ? 'sine' : 'triangle';
      osc.frequency.setValueAtTime(f * 0.72, now);
      osc.frequency.exponentialRampToValueAtTime(f * 1.15, now + 1.35);

      gain.gain.setValueAtTime(0.0001, now);
      gain.gain.linearRampToValueAtTime(vol * (0.35 / freqs.length), now + 0.55);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 1.45);

      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now + idx * 0.06);
      osc.stop(now + 1.5);
    });
  }

  public playUpgradeSurge(isSsr: boolean): void {
    const ctx = this.ensure();
    if (!ctx) return;
    const now = ctx.currentTime;
    const vol = this.gainScale();

    const chord = isSsr
      ? [523.25, 659.25, 783.99, 1046.5, 1318.51, 1567.98] // Radiant Cmaj9 arpeggio
      : [440, 523.25, 659.25, 880]; // Amethyst Am7 shimmer

    chord.forEach((freq, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = isSsr ? 'triangle' : 'sine';
      const t0 = now + idx * (isSsr ? 0.042 : 0.05);
      osc.frequency.setValueAtTime(freq, t0);
      osc.frequency.exponentialRampToValueAtTime(freq * 1.015, t0 + 0.45);

      gain.gain.setValueAtTime(0.0001, t0);
      gain.gain.linearRampToValueAtTime(vol * (isSsr ? 0.28 : 0.22), t0 + 0.025);
      gain.gain.exponentialRampToValueAtTime(0.0001, t0 + (isSsr ? 0.78 : 0.52));

      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(t0);
      osc.stop(t0 + 0.85);
    });
  }

  public playSupernovaBloom(tier: Tier): void {
    const ctx = this.ensure();
    if (!ctx) return;
    const now = ctx.currentTime;
    const vol = this.gainScale();

    // Deep sub-bass impact thump
    const sub = ctx.createOscillator();
    const subGain = ctx.createGain();
    sub.type = 'sine';
    sub.frequency.setValueAtTime(145, now);
    sub.frequency.exponentialRampToValueAtTime(36, now + 0.55);
    subGain.gain.setValueAtTime(vol * 1.25, now);
    subGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.65);
    sub.connect(subGain);
    subGain.connect(ctx.destination);
    sub.start(now);
    sub.stop(now + 0.7);

    // High crystalline harp burst
    const notes =
      tier === 'SSR'
        ? [587.33, 739.99, 880, 1174.66, 1479.98, 1760, 2349.32]
        : tier === 'SR'
          ? [493.88, 622.25, 739.99, 987.77, 1244.51]
          : [392, 493.88, 587.33, 783.99];
    notes.forEach((f, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      const t0 = now + idx * 0.032;
      osc.frequency.setValueAtTime(f, t0);
      gain.gain.setValueAtTime(0.0001, t0);
      gain.gain.linearRampToValueAtTime(vol * 0.24, t0 + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.9);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(t0);
      osc.stop(t0 + 0.95);
    });
  }

  public dispose(): void {
    if (this.ctx) {
      this.ctx.close().catch(() => {});
      this.ctx = null;
    }
  }
}

export const SummonCinematic: React.FC<SummonCinematicProps> = ({
  results,
  highestTier,
  bannerAccent,
  onComplete,
  onSkip,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const enableScreenShake = useSettingsStore((s) => s.enableScreenShake);
  const [caption, setCaption] = useState<{ text: string; tone: Tier | 'NEUTRAL' }>({
    text: 'OPENING CELESTIAL GATE',
    tone: 'NEUTRAL',
  });
  const [displayTierHud, setDisplayTierHud] = useState<Tier>('R');

  const isMulti = results.length > 1;

  // Build companion meteors for 10× meteor shower (up to 9 companion comets around the flagship)
  const companions = useMemo<CompanionMeteor[]>(() => {
    if (!isMulti) return [];
    const others = results.slice(0, 10);
    // Exclude one flagship slot matching highestTier so flagship represents the best pull
    let skippedFlagship = false;
    const list: CompanionMeteor[] = [];
    others.forEach((r, idx) => {
      if (!skippedFlagship && r.tier === highestTier) {
        skippedFlagship = true;
        return;
      }
      const spread = (idx - 4.5) * 0.055;
      list.push({
        tier: r.tier,
        startTime: 1.12 + (idx % 5) * 0.075 + Math.floor(idx / 5) * 0.05,
        duration: 1.18 + (idx % 3) * 0.08,
        startXFrac: 0.78 + ((idx * 37) % 24) * 0.01,
        startYFrac: 0.02 + ((idx * 23) % 18) * 0.01,
        ctrlXFrac: 0.56 + spread * 1.4,
        ctrlYFrac: 0.22 + spread * 1.2,
        impacted: false,
      });
    });
    return list;
  }, [results, highestTier, isMulti]);

  // Ref for interactive tap ripples so user clicks spawn sparkly feedback without stalling
  const clickBurstsRef = useRef<Array<{ x: number; y: number }>>([]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const synth = new SummonSynth();
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    let width = window.innerWidth;
    let height = window.innerHeight;

    const resize = () => {
      width = window.innerWidth;
      height = window.innerHeight;
      canvas.width = Math.floor(width * dpr);
      canvas.height = Math.floor(height * dpr);
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();
    window.addEventListener('resize', resize);

    // Initialize 340 depth-projected warp stars
    const stars: WarpStar[] = Array.from({ length: 340 }, () => ({
      x: (Math.random() - 0.5) * 1800,
      y: (Math.random() - 0.5) * 1200,
      z: Math.random() * 1000 + 20,
      pz: 1000,
      size: Math.random() * 1.8 + 0.6,
      hue: Math.random() * 360,
    }));

    const particles: Particle[] = [];
    const rings: ShockRing[] = [];
    const leadTrail: Array<{ x: number; y: number; tier: Tier }> = [];
    const localCompanions = companions.map((c) => ({ ...c, impacted: false }));

    // One-shot timeline cue guards
    const fired = {
      start: false,
      rift: false,
      upgradeSR: false,
      upgradeSSR: false,
      impact: false,
      crack1: false,
      crack2: false,
      crack3: false,
      shatter: false,
      done: false,
    };

    let shakeAmp = 0;
    let flashAlpha = 0;
    let flashColor = '#ffffff';
    let currentTier: Tier = 'R';
    let lastTime = performance.now();
    let elapsed = 0;
    let hitstopRemain = 0;
    let rafId = 0;

    const spawnBurst = (
      x: number,
      y: number,
      count: number,
      tier: Tier,
      speedMin: number,
      speedMax: number,
      shapes: Particle['shape'][] = ['dot', 'diamond'],
    ) => {
      const pal = PALETTES[tier];
      for (let i = 0; i < count; i++) {
        const angle = Math.random() * Math.PI * 2;
        const speed = speedMin + Math.random() * (speedMax - speedMin);
        const col = pal.isPrismatic
          ? rainbowHex(i + Math.random() * 6)
          : Math.random() < 0.35
            ? pal.core
            : Math.random() < 0.7
              ? pal.primary
              : pal.secondary;
        particles.push({
          x,
          y,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed,
          size: Math.random() * 5.2 + 1.8,
          alpha: 1,
          life: 0,
          maxLife: 0.45 + Math.random() * 0.75,
          color: col,
          shape: shapes[i % shapes.length],
          rot: Math.random() * Math.PI * 2,
          vrot: (Math.random() - 0.5) * 9,
          drag: 0.94 + Math.random() * 0.04,
        });
      }
    };

    const spawnRing = (
      x: number,
      y: number,
      maxRadius: number,
      color: string,
      lineWidth = 4,
      speed = 640,
    ) => {
      rings.push({ x, y, radius: 14, maxRadius, alpha: 0.95, color, lineWidth, speed });
    };

    const drawDiamond = (x: number, y: number, r: number, rot: number) => {
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(rot);
      ctx.beginPath();
      ctx.moveTo(0, -r * 1.45);
      ctx.lineTo(r * 0.65, 0);
      ctx.lineTo(0, r * 1.45);
      ctx.lineTo(-r * 0.65, 0);
      ctx.closePath();
      ctx.fill();
      ctx.restore();
    };

    const drawFourPointStar = (x: number, y: number, r: number, rot = 0) => {
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(rot);
      ctx.beginPath();
      for (let i = 0; i < 8; i++) {
        const ang = (i * Math.PI) / 4;
        const rad = i % 2 === 0 ? r : r * 0.26;
        if (i === 0) ctx.moveTo(Math.cos(ang) * rad, Math.sin(ang) * rad);
        else ctx.lineTo(Math.cos(ang) * rad, Math.sin(ang) * rad);
      }
      ctx.closePath();
      ctx.fill();
      ctx.restore();
    };

    const drawLightningBolt = (
      x1: number,
      y1: number,
      x2: number,
      y2: number,
      color: string,
      jitter = 26,
    ) => {
      const segments = 6;
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      ctx.strokeStyle = color;
      ctx.lineWidth = 3.2;
      ctx.shadowColor = color;
      ctx.shadowBlur = 18;
      ctx.beginPath();
      ctx.moveTo(x1, y1);
      for (let i = 1; i < segments; i++) {
        const f = i / segments;
        const mx = x1 + (x2 - x1) * f + (Math.random() - 0.5) * jitter;
        const my = y1 + (y2 - y1) * f + (Math.random() - 0.5) * jitter;
        ctx.lineTo(mx, my);
      }
      ctx.lineTo(x2, y2);
      ctx.stroke();

      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 1.2;
      ctx.stroke();
      ctx.restore();
    };

    const drawSacredAstrolabe = (
      cx: number,
      cy: number,
      radius: number,
      tiltY: number,
      t: number,
      pal: TierPalette,
      alpha: number,
    ) => {
      if (alpha <= 0.01) return;
      ctx.save();
      ctx.translate(cx, cy);
      ctx.scale(1, tiltY);
      ctx.globalCompositeOperation = 'lighter';
      ctx.globalAlpha = alpha;

      // Ambient concentric halo glow
      const halo = ctx.createRadialGradient(0, 0, radius * 0.15, 0, 0, radius * 1.25);
      halo.addColorStop(0, `rgba(${pal.rgb[0]},${pal.rgb[1]},${pal.rgb[2]},0.22)`);
      halo.addColorStop(0.55, `rgba(${pal.rgbAlt[0]},${pal.rgbAlt[1]},${pal.rgbAlt[2]},0.11)`);
      halo.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = halo;
      ctx.beginPath();
      ctx.arc(0, 0, radius * 1.25, 0, Math.PI * 2);
      ctx.fill();

      // Outer engraved ring
      ctx.save();
      ctx.rotate(t * 0.55);
      ctx.strokeStyle = pal.primary;
      ctx.lineWidth = 2.4;
      ctx.shadowColor = pal.primary;
      ctx.shadowBlur = 18;
      ctx.beginPath();
      ctx.arc(0, 0, radius, 0, Math.PI * 2);
      ctx.stroke();

      ctx.lineWidth = 1.1;
      ctx.beginPath();
      ctx.arc(0, 0, radius * 0.91, 0, Math.PI * 2);
      ctx.stroke();

      // 24 Zodiac compass ticks + 12 constellation nodes
      for (let i = 0; i < 24; i++) {
        const a = (i / 24) * Math.PI * 2;
        const inner = i % 2 === 0 ? radius * 0.87 : radius * 0.92;
        ctx.beginPath();
        ctx.moveTo(Math.cos(a) * inner, Math.sin(a) * inner);
        ctx.lineTo(Math.cos(a) * radius, Math.sin(a) * radius);
        ctx.stroke();
        if (i % 2 === 0) {
          ctx.fillStyle = pal.core;
          drawFourPointStar(Math.cos(a) * radius * 0.955, Math.sin(a) * radius * 0.955, 5.2, a);
        }
      }
      ctx.restore();

      // Counter-rotating Sacred Hexagram + Arc Conduits
      ctx.save();
      ctx.rotate(-t * 0.92);
      ctx.strokeStyle = pal.secondary;
      ctx.lineWidth = 1.8;
      ctx.shadowColor = pal.secondary;
      ctx.shadowBlur = 14;
      for (let tri = 0; tri < 2; tri++) {
        ctx.beginPath();
        for (let k = 0; k < 3; k++) {
          const a = (k / 3) * Math.PI * 2 + (tri * Math.PI) / 3;
          const px = Math.cos(a) * radius * 0.78;
          const py = Math.sin(a) * radius * 0.78;
          if (k === 0) ctx.moveTo(px, py);
          else ctx.lineTo(px, py);
        }
        ctx.closePath();
        ctx.stroke();
      }

      // Segmented energy arcs
      ctx.lineWidth = 3.2;
      ctx.strokeStyle = pal.core;
      for (let i = 0; i < 4; i++) {
        const a0 = (i * Math.PI) / 2 + 0.15;
        ctx.beginPath();
        ctx.arc(0, 0, radius * 0.62, a0, a0 + 0.72);
        ctx.stroke();
      }
      ctx.restore();

      // Inner swirling portal vortex spiral arms!
      ctx.save();
      ctx.rotate(t * 1.45);
      for (let arm = 0; arm < 4; arm++) {
        ctx.save();
        ctx.rotate((arm * Math.PI) / 2);
        const armGrad = ctx.createLinearGradient(0, 0, radius * 0.56, radius * 0.28);
        armGrad.addColorStop(0, pal.core);
        armGrad.addColorStop(0.55, pal.isPrismatic ? rainbowHex(arm + t * 5) : pal.primary);
        armGrad.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.strokeStyle = armGrad;
        ctx.lineWidth = 4.5;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.quadraticCurveTo(radius * 0.22, -radius * 0.24, radius * 0.54, radius * 0.14);
        ctx.stroke();
        ctx.restore();
      }
      ctx.restore();

      // 4 Orbiting Starlight Pillar Crystal Diamonds along outer perimeter
      for (let pIdx = 0; pIdx < 4; pIdx++) {
        const ang = t * 1.15 + (pIdx * Math.PI) / 2;
        const px = Math.cos(ang) * radius * 1.07;
        const py = Math.sin(ang) * radius * 1.07;
        const depthScale = 0.72 + (Math.sin(ang) * 0.5 + 0.5) * 0.52;
        ctx.fillStyle = pal.isPrismatic ? rainbowHex(pIdx + t * 4) : pal.core;
        ctx.shadowColor = pal.primary;
        ctx.shadowBlur = 14;
        drawDiamond(px, py, 8.5 * depthScale, ang + Math.PI / 2);
      }

      // Inner swirling core portal ring
      ctx.save();
      ctx.rotate(t * 1.85);
      ctx.strokeStyle = pal.isPrismatic ? rainbowHex(t * 9) : pal.core;
      ctx.lineWidth = 2;
      ctx.setLineDash([12, 8]);
      ctx.beginPath();
      ctx.arc(0, 0, radius * 0.36, 0, Math.PI * 2);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.restore();

      ctx.restore();
    };

    const draw3DCrystalPrism = (
      cx: number,
      cy: number,
      scale: number,
      rotY: number,
      rotX: number,
      pal: TierPalette,
      crackStage: number,
      pulse: number,
    ) => {
      // Transform 3D vertices
      const cosY = Math.cos(rotY);
      const sinY = Math.sin(rotY);
      const cosX = Math.cos(rotX);
      const sinX = Math.sin(rotX);

      const proj = CRYSTAL_VERTS.map((v) => {
        const x1 = v.x * cosY - v.z * sinY;
        const z1 = v.x * sinY + v.z * cosY;
        const y2 = v.y * cosX - z1 * sinX;
        const z2 = v.y * sinX + z1 * cosX;
        const persp = 4.4 / (4.4 - z2);
        return {
          x: cx + x1 * scale * persp,
          y: cy + y2 * scale * persp,
          z: z2,
        };
      });

      // Volumetric god-rays shooting through cracks behind crystal!
      if (crackStage > 0) {
        ctx.save();
        ctx.translate(cx, cy);
        ctx.globalCompositeOperation = 'lighter';
        const rayCount = crackStage === 1 ? 6 : crackStage === 2 ? 12 : 18;
        const rayLen = Math.max(width, height) * (0.38 + crackStage * 0.24);
        for (let i = 0; i < rayCount; i++) {
          const ang = (i / rayCount) * Math.PI * 2 + rotY * 0.5 + i * 0.37;
          const spread = 0.035 + (i % 3) * 0.018;
          const col = pal.isPrismatic ? rainbowHex(i + rotY * 2) : pal.primary;
          const grad = ctx.createLinearGradient(0, 0, Math.cos(ang) * rayLen, Math.sin(ang) * rayLen);
          grad.addColorStop(0, '#ffffff');
          grad.addColorStop(0.18, col);
          grad.addColorStop(1, 'rgba(0,0,0,0)');
          ctx.fillStyle = grad;
          ctx.globalAlpha = 0.26 + crackStage * 0.12 + pulse * 0.14;
          ctx.beginPath();
          ctx.moveTo(0, 0);
          ctx.lineTo(Math.cos(ang - spread) * rayLen, Math.sin(ang - spread) * rayLen);
          ctx.lineTo(Math.cos(ang + spread) * rayLen, Math.sin(ang + spread) * rayLen);
          ctx.closePath();
          ctx.fill();
        }
        ctx.restore();
      }

      // Sort faces back-to-front by average Z
      const sortedFaces = CRYSTAL_FACES.map((face, idx) => {
        const avgZ = (proj[face[0]].z + proj[face[1]].z + proj[face[2]].z) / 3;
        return { face, avgZ, idx };
      }).sort((a, b) => a.avgZ - b.avgZ);

      ctx.save();
      ctx.globalCompositeOperation = 'lighter';

      // Inner glowing heart behind crystal
      const coreGlow = ctx.createRadialGradient(cx, cy, 4, cx, cy, scale * (1.7 + pulse * 0.45));
      coreGlow.addColorStop(0, '#ffffff');
      coreGlow.addColorStop(0.28, pal.primary);
      coreGlow.addColorStop(0.62, `rgba(${pal.rgbAlt[0]},${pal.rgbAlt[1]},${pal.rgbAlt[2]},0.35)`);
      coreGlow.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = coreGlow;
      ctx.beginPath();
      ctx.arc(cx, cy, scale * (1.7 + pulse * 0.45), 0, Math.PI * 2);
      ctx.fill();

      // Render translucent 3D jewel-shaded crystalline facets in source-over so edges & cracks stay crisp!
      ctx.globalCompositeOperation = 'source-over';
      sortedFaces.forEach(({ face, avgZ, idx }) => {
        const a = proj[face[0]];
        const b = proj[face[1]];
        const c = proj[face[2]];
        const light = Math.max(0.18, Math.min(1, (avgZ + 1.1) * 0.55));
        const facetCol = pal.isPrismatic
          ? idx % 4 === 0
            ? '#f59e0b'
            : idx % 4 === 1
              ? '#06b6d4'
              : idx % 4 === 2
                ? '#ec4899'
                : '#fde047'
          : idx % 2 === 0
            ? pal.primary
            : pal.deep;

        ctx.beginPath();
        ctx.moveTo(a.x, a.y);
        ctx.lineTo(b.x, b.y);
        ctx.lineTo(c.x, c.y);
        ctx.closePath();

        ctx.fillStyle = facetCol;
        ctx.globalAlpha = 0.36 + light * 0.42;
        ctx.fill();

        ctx.strokeStyle = '#ffffff';
        ctx.globalAlpha = 0.78 + light * 0.22;
        ctx.lineWidth = 2.0;
        ctx.stroke();
      });
      ctx.globalCompositeOperation = 'lighter';

      // Jagged bright fracture cracks across crystal faces
      if (crackStage > 0) {
        const crackLines = crackStage * 4;
        ctx.strokeStyle = '#ffffff';
        ctx.shadowColor = pal.primary;
        ctx.shadowBlur = 16;
        ctx.lineWidth = 2.2;
        ctx.globalAlpha = 0.95;
        for (let k = 0; k < crackLines; k++) {
          const ang = (k / crackLines) * Math.PI * 2 + rotY * 0.8;
          const r1 = scale * (0.35 + (k % 2) * 0.25);
          const r2 = scale * (0.95 + (k % 3) * 0.22);
          ctx.beginPath();
          ctx.moveTo(cx, cy);
          ctx.lineTo(
            cx + Math.cos(ang + 0.16) * r1,
            cy + Math.sin(ang + 0.16) * r1 * 1.25,
          );
          ctx.lineTo(
            cx + Math.cos(ang - 0.1) * r2,
            cy + Math.sin(ang - 0.1) * r2 * 1.25,
          );
          ctx.stroke();
        }
      }

      ctx.restore();
    };

    const tick = (now: number) => {
      const rawDt = Math.min(0.05, Math.max(0.001, (now - lastTime) / 1000));
      lastTime = now;

      if (hitstopRemain > 0) {
        hitstopRemain -= rawDt;
      } else {
        elapsed += rawDt;
      }
      const dt = hitstopRemain > 0 ? rawDt * 0.12 : rawDt;
      const t = elapsed;

      const cx = width * 0.5;
      const cy = height * 0.5;
      const minDim = Math.min(width, height);

      // Process interactive tap bursts
      if (clickBurstsRef.current.length > 0) {
        const queued = clickBurstsRef.current.splice(0, clickBurstsRef.current.length);
        queued.forEach(({ x, y }) => {
          const pal = PALETTES[currentTier];
          spawnRing(x, y, 130, pal.core, 2.5, 420);
          spawnBurst(x, y, 18, currentTier, 70, 290, ['diamond', 'dot']);
        });
      }

      // ===== TIMELINE EVENTS =====
      if (!fired.start) {
        fired.start = true;
        audioManager.playSfx('ult_chime', 0.04);
        synth.playGateRiser();
        spawnRing(cx, cy, minDim * 0.6, '#38bdf8', 3, 520);
      }

      if (!fired.rift && t >= 1.1) {
        fired.rift = true;
        setCaption({
          text: isMulti ? '10-STAR METEOR CASCADE' : 'STARFALL CONVERGENCE',
          tone: 'R',
        });
        spawnRing(width * 0.86, height * 0.12, 220, '#7dd3fc', 3.5, 620);
        spawnBurst(width * 0.86, height * 0.12, 32, 'R', 80, 340, ['diamond', 'dot']);
      }

      // Fakeout Upgrade #1: Sapphire -> Amethyst SR!
      if (!fired.upgradeSR && t >= 1.7 && (highestTier === 'SR' || highestTier === 'SSR')) {
        fired.upgradeSR = true;
        currentTier = 'SR';
        setDisplayTierHud('SR');
        setCaption({
          text: '✦ RESONANCE SURGE — SR ASCENSION ✦',
          tone: 'SR',
        });
        audioManager.playSfx('prism_crack', 0.04);
        synth.playUpgradeSurge(false);
        shakeAmp = Math.max(shakeAmp, 9);
        flashAlpha = 0.34;
        flashColor = '#e879f9';

        const p = Math.max(0, Math.min(1, (t - 1.12) / 1.53));
        const mx = quadBezier(width * 0.9, width * 0.62, cx, easeInOutQuart(p));
        const my = quadBezier(height * 0.08, height * 0.22, cy, easeInOutQuart(p));
        spawnRing(mx, my, 280, '#c084fc', 5, 760);
        spawnBurst(mx, my, 46, 'SR', 110, 440, ['diamond', 'shard', 'dot']);
      }

      // Fakeout Upgrade #2: Amethyst -> Celestial Rainbow Gold SSR!!
      if (!fired.upgradeSSR && t >= 2.16 && highestTier === 'SSR') {
        fired.upgradeSSR = true;
        currentTier = 'SSR';
        setDisplayTierHud('SSR');
        setCaption({
          text: '★ CELESTIAL AWAKENING — SSR STARFALL!! ★',
          tone: 'SSR',
        });
        hitstopRemain = 0.068; // Crisp anime impact freeze frame!
        audioManager.playSfx('ult_impact', 0.03);
        synth.playUpgradeSurge(true);
        shakeAmp = Math.max(shakeAmp, 15);
        flashAlpha = 0.62;
        flashColor = '#fef08a';

        const p = Math.max(0, Math.min(1, (t - 1.12) / 1.53));
        const mx = quadBezier(width * 0.9, width * 0.62, cx, easeInOutQuart(p));
        const my = quadBezier(height * 0.08, height * 0.22, cy, easeInOutQuart(p));
        spawnRing(mx, my, 420, '#fde047', 6.5, 920);
        spawnRing(mx, my, 320, '#38e8ff', 3.5, 740);
        spawnBurst(mx, my, 78, 'SSR', 140, 580, ['diamond', 'feather', 'shard']);
      }

      // Meteor Impact into Astrolabe Core
      if (!fired.impact && t >= 2.65) {
        fired.impact = true;
        currentTier = highestTier;
        setDisplayTierHud(highestTier);
        setCaption({
          text:
            highestTier === 'SSR'
              ? '★ STARLIGHT PRISM OVERLOAD ★'
              : 'CRYSTALLINE PRISM RESONATING',
          tone: highestTier,
        });
        audioManager.playSfx('slash', 0.05);
        shakeAmp = Math.max(shakeAmp, highestTier === 'SSR' ? 18 : 13);
        flashAlpha = highestTier === 'SSR' ? 0.72 : 0.48;
        flashColor = PALETTES[highestTier].core;
        spawnRing(cx, cy, minDim * 0.85, PALETTES[highestTier].primary, 7, 1080);
        spawnRing(cx, cy, minDim * 0.62, '#ffffff', 3.5, 860);
        spawnBurst(cx, cy, highestTier === 'SSR' ? 95 : 65, highestTier, 160, 620, [
          'diamond',
          'shard',
          'dot',
        ]);
      }

      if (!fired.crack1 && t >= 2.98) {
        fired.crack1 = true;
        audioManager.playSfx('prism_crack', 0.08);
        shakeAmp = Math.max(shakeAmp, 6);
        spawnRing(cx, cy, minDim * 0.42, PALETTES[highestTier].primary, 3, 720);
      }
      if (!fired.crack2 && t >= 3.24) {
        fired.crack2 = true;
        audioManager.playSfx('prism_crack', 0.06);
        shakeAmp = Math.max(shakeAmp, 9);
        spawnRing(cx, cy, minDim * 0.56, '#ffffff', 4, 860);
        spawnBurst(cx, cy, 34, highestTier, 120, 420, ['shard', 'diamond']);
      }
      if (!fired.crack3 && t >= 3.44) {
        fired.crack3 = true;
        shakeAmp = Math.max(shakeAmp, 12);
      }

      // SUPERNOVA SHATTER DETONATION!
      if (!fired.shatter && t >= 3.58) {
        fired.shatter = true;
        setCaption({
          text:
            highestTier === 'SSR'
              ? '✦ CELESTIAL SSR UNLEASHED!! ✦'
              : highestTier === 'SR'
                ? '✦ STARLIGHT RESONANCE UNLEASHED! ✦'
                : '✦ STARFALL AWAKENED ✦',
          tone: highestTier,
        });
        audioManager.playSfx(highestTier === 'SSR' ? 'ssr_reveal' : 'ult_impact', 0.03);
        synth.playSupernovaBloom(highestTier);
        shakeAmp = Math.max(shakeAmp, highestTier === 'SSR' ? 24 : 15);
        flashAlpha = 0.92;
        flashColor = highestTier === 'SSR' ? '#fffbeb' : PALETTES[highestTier].core;

        spawnRing(cx, cy, Math.max(width, height) * 1.1, '#ffffff', 12, 1650);
        spawnRing(cx, cy, Math.max(width, height) * 0.95, PALETTES[highestTier].primary, 8, 1320);
        if (highestTier === 'SSR') {
          spawnRing(cx, cy, Math.max(width, height) * 0.82, '#38e8ff', 5, 1140);
          spawnRing(cx, cy, Math.max(width, height) * 0.72, '#f472b6', 5, 980);
        }
        spawnBurst(cx, cy, highestTier === 'SSR' ? 220 : 145, highestTier, 240, 1180, [
          'shard',
          'diamond',
          'feather',
          'dot',
        ]);
      }

      // Complete right at luminous white-out peak
      if (!fired.done && t >= TOTAL_DURATION) {
        fired.done = true;
        onComplete();
        return;
      }

      // ===== RENDER FRAME =====
      const pal = PALETTES[currentTier];

      ctx.save();
      if (enableScreenShake && shakeAmp > 0.2) {
        const sx = (Math.random() - 0.5) * 2 * shakeAmp;
        const sy = (Math.random() - 0.5) * 2 * shakeAmp;
        ctx.translate(sx, sy);
        shakeAmp *= Math.pow(0.06, rawDt);
      } else {
        shakeAmp = 0;
      }

      // 1. Opaque Deep Velvet Night Sky Clear (prevents frame-to-frame alpha accumulation blowout!)
      ctx.fillStyle = '#030510';
      ctx.fillRect(-30, -30, width + 60, height + 60);

      // Deep Cosmic Nebula Sky Wash tinted by current resonance tier
      const bgGrad = ctx.createRadialGradient(
        cx,
        cy * 0.88,
        minDim * 0.04,
        cx,
        cy,
        Math.max(width, height) * 0.85,
      );
      const auraIntensity = t > 2.65 ? 0.36 : t > 1.7 ? 0.28 : 0.22;
      bgGrad.addColorStop(0, `rgba(${pal.rgb[0]},${pal.rgb[1]},${pal.rgb[2]},${auraIntensity})`);
      bgGrad.addColorStop(0.36, `rgba(${pal.rgbAlt[0]},${pal.rgbAlt[1]},${pal.rgbAlt[2]},0.13)`);
      bgGrad.addColorStop(0.7, 'rgba(8, 13, 34, 0.88)');
      bgGrad.addColorStop(1, '#02030a');
      ctx.fillStyle = bgGrad;
      ctx.fillRect(-30, -30, width + 60, height + 60);

      // Subtle diagonal celestial aurora curtains
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      for (let a = 0; a < 2; a++) {
        const waveShift = Math.sin(t * 1.1 + a * 2.4) * 55;
        const aurora = ctx.createLinearGradient(0, height * (0.1 + a * 0.28), width, height * (0.68 + a * 0.14));
        aurora.addColorStop(0, 'rgba(0,0,0,0)');
        aurora.addColorStop(
          0.45,
          a === 0
            ? `rgba(${pal.rgb[0]},${pal.rgb[1]},${pal.rgb[2]},0.12)`
            : `${bannerAccent}1e`,
        );
        aurora.addColorStop(0.75, `rgba(${pal.rgbAlt[0]},${pal.rgbAlt[1]},${pal.rgbAlt[2]},0.08)`);
        aurora.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = aurora;
        ctx.beginPath();
        ctx.moveTo(0, height * 0.24 + waveShift);
        ctx.bezierCurveTo(
          width * 0.35,
          height * 0.06 - waveShift,
          width * 0.65,
          height * 0.62 + waveShift,
          width,
          height * 0.34 - waveShift,
        );
        ctx.lineTo(width, height * 0.62);
        ctx.lineTo(0, height * 0.54);
        ctx.closePath();
        ctx.fill();
      }
      ctx.restore();

      // 2. 3D Hyperspace Warp Starfield
      const warpSpeed =
        t < 1.15
          ? 280 + easeInCubic(t / 1.15) * 1450
          : t < 2.65
            ? 420
            : t < 3.58
              ? 180 + (t - 2.65) * 900
              : 1900;

      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      const focal = minDim * 0.62;
      for (let i = 0; i < stars.length; i++) {
        const s = stars[i];
        s.pz = s.z;
        s.z -= warpSpeed * dt;
        if (s.z <= 8) {
          s.x = (Math.random() - 0.5) * 1800;
          s.y = (Math.random() - 0.5) * 1200;
          s.z = 980 + Math.random() * 120;
          s.pz = s.z;
        }
        const sx = cx + (s.x / s.z) * focal;
        const sy = cy + (s.y / s.z) * focal;
        const px = cx + (s.x / s.pz) * focal;
        const py = cy + (s.y / s.pz) * focal;
        if (sx < -40 || sx > width + 40 || sy < -40 || sy > height + 40) continue;

        const depthAlpha = Math.max(0.08, Math.min(1, 1 - s.z / 1000));
        ctx.strokeStyle =
          pal.isPrismatic && i % 5 === 0
            ? rainbowHex(i + t * 4)
            : i % 3 === 0
              ? pal.primary
              : '#e2e8f0';
        ctx.globalAlpha = depthAlpha * 0.85;
        ctx.lineWidth = Math.max(0.8, s.size * depthAlpha * 1.9);
        ctx.beginPath();
        ctx.moveTo(px, py);
        ctx.lineTo(sx, sy);
        ctx.stroke();
      }
      ctx.restore();

      // Silky Layered Anime Horizon Cloud Sea + Distant Floating Star-Pillar Spires
      const drawCelestialHorizon = (cloudPal: TierPalette, time: number, intensity: number) => {
        if (intensity <= 0.01) return;
        ctx.save();
        ctx.globalAlpha = intensity;

        // Soft horizon atmospheric back-glow rising from below the cloud sea
        const hGlow = ctx.createLinearGradient(0, height * 0.62, 0, height);
        hGlow.addColorStop(0, 'rgba(0,0,0,0)');
        hGlow.addColorStop(
          0.55,
          `rgba(${cloudPal.rgb[0]},${cloudPal.rgb[1]},${cloudPal.rgb[2]},0.20)`,
        );
        hGlow.addColorStop(1, 'rgba(4,6,18,0.92)');
        ctx.fillStyle = hGlow;
        ctx.fillRect(0, height * 0.62, width, height * 0.38);

        // 3 smooth billowing Bezier anime cloud waves (clean continuous silhouette — zero marble edges!)
        const layers = [
          { baseY: height * 0.78, amp: 24, freq: 2.2, speed: 0.45, topAlpha: 0.36, body: '#0d1430' },
          { baseY: height * 0.84, amp: 18, freq: 3.1, speed: -0.62, topAlpha: 0.26, body: '#090e24' },
          { baseY: height * 0.90, amp: 13, freq: 4.0, speed: 0.78, topAlpha: 0.18, body: '#040714' },
        ];

        layers.forEach((layer, idx) => {
          ctx.beginPath();
          ctx.moveTo(-20, height + 20);
          const steps = 28;
          for (let s = 0; s <= steps; s++) {
            const frac = s / steps;
            const x = -20 + frac * (width + 40);
            const billow =
              Math.sin(frac * Math.PI * layer.freq + time * layer.speed + idx * 1.9) * layer.amp +
              Math.cos(frac * Math.PI * (layer.freq * 2.1) - time * layer.speed * 0.6) *
                (layer.amp * 0.42);
            const dipCenter = Math.sin(frac * Math.PI) * 18; // Slight valley toward center astrolabe
            ctx.lineTo(x, layer.baseY + dipCenter + billow);
          }
          ctx.lineTo(width + 20, height + 20);
          ctx.closePath();

          const grad = ctx.createLinearGradient(0, layer.baseY - layer.amp * 1.5, 0, height);
          grad.addColorStop(
            0,
            `rgba(${cloudPal.rgb[0]},${cloudPal.rgb[1]},${cloudPal.rgb[2]},${layer.topAlpha})`,
          );
          grad.addColorStop(0.28, layer.body);
          grad.addColorStop(1, '#02030a');
          ctx.fillStyle = grad;
          ctx.fill();

          // Delicate top silver/gold atmospheric rim highlight along cloud crest
          ctx.strokeStyle = `rgba(${cloudPal.rgb[0]},${cloudPal.rgb[1]},${cloudPal.rgb[2]},${
            layer.topAlpha * 1.25
          })`;
          ctx.lineWidth = idx === 0 ? 1.8 : 1.1;
          ctx.stroke();
        });

        ctx.restore();
      };

      const cloudVis = t < 3.58 ? easeOutCubic(Math.min(1, t / 0.8)) : Math.max(0, 1 - (t - 3.58) / 0.35);
      drawCelestialHorizon(pal, t, cloudVis * 0.95);

      // 3. Sacred Geometry Celestial Astrolabe Gate
      const gateAppear = easeOutCubic(Math.min(1, t / 0.95));
      const gateTilt =
        t < 1.15
          ? 0.36 + easeOutCubic(t / 1.15) * 0.56
          : t < 2.65
            ? 0.92 - ((t - 1.15) / 1.5) * 0.16
            : t < 3.58
              ? 0.76 + ((t - 2.65) / 0.93) * 0.24
              : 1;
      const gateRadius =
        minDim *
        (t < 2.65
          ? 0.22 + gateAppear * 0.14
          : t < 3.58
            ? 0.36 - ((t - 2.65) / 0.93) * 0.08
            : 0.36 + (t - 3.58) * 1.4);
      const gateAlpha = t < 3.58 ? gateAppear * 0.92 : Math.max(0, 1 - (t - 3.58) / 0.32);
      drawSacredAstrolabe(cx, cy, gateRadius, gateTilt, t, pal, gateAlpha);

      // 4. ACT 2: Sky Rift & Starfall Meteor Shower (1.05s -> 2.68s)
      if (t >= 1.0 && t <= 2.75) {
        const rx = width * 0.86;
        const ry = height * 0.12;
        const riftEnv =
          t < 1.35
            ? easeOutCubic((t - 1.0) / 0.35)
            : t > 2.45
              ? Math.max(0, 1 - (t - 2.45) / 0.3)
              : 1;

        // Glowing diagonal Sky Rift Tear
        ctx.save();
        ctx.translate(rx, ry);
        ctx.rotate(-0.62);
        ctx.globalCompositeOperation = 'lighter';
        ctx.globalAlpha = riftEnv;
        const riftGrad = ctx.createRadialGradient(0, 0, 2, 0, 0, 130 * riftEnv + 10);
        riftGrad.addColorStop(0, '#ffffff');
        riftGrad.addColorStop(0.24, pal.primary);
        riftGrad.addColorStop(0.65, `rgba(${pal.rgbAlt[0]},${pal.rgbAlt[1]},${pal.rgbAlt[2]},0.28)`);
        riftGrad.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = riftGrad;
        ctx.scale(2.4, 0.42);
        ctx.beginPath();
        ctx.arc(0, 0, 130 * riftEnv + 10, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();

        // Companion 10× Meteors
        localCompanions.forEach((cm) => {
          if (t < cm.startTime || t > cm.startTime + cm.duration + 0.08) return;
          const p = Math.max(0, Math.min(1, (t - cm.startTime) / cm.duration));
          const ep = easeInOutQuart(p);
          const sx = width * cm.startXFrac;
          const sy = height * cm.startYFrac;
          const cpx = width * cm.ctrlXFrac;
          const cpy = height * cm.ctrlYFrac;
          const x = quadBezier(sx, cpx, cx, ep);
          const y = quadBezier(sy, cpy, cy, ep);
          const pTail = Math.max(0, ep - 0.14);
          const tx = quadBezier(sx, cpx, cx, pTail);
          const ty = quadBezier(sy, cpy, cy, pTail);
          const cPal = PALETTES[cm.tier];

          ctx.save();
          ctx.globalCompositeOperation = 'lighter';
          const grad = ctx.createLinearGradient(x, y, tx, ty);
          grad.addColorStop(0, '#ffffff');
          grad.addColorStop(0.28, cPal.primary);
          grad.addColorStop(1, 'rgba(0,0,0,0)');
          ctx.strokeStyle = grad;
          ctx.lineWidth = cm.tier === 'SSR' ? 7 : cm.tier === 'SR' ? 5 : 3.5;
          ctx.lineCap = 'round';
          ctx.beginPath();
          ctx.moveTo(x, y);
          ctx.lineTo(tx, ty);
          ctx.stroke();

          ctx.fillStyle = '#ffffff';
          ctx.shadowColor = cPal.primary;
          ctx.shadowBlur = 16;
          ctx.beginPath();
          ctx.arc(x, y, cm.tier === 'SSR' ? 5.5 : 3.6, 0, Math.PI * 2);
          ctx.fill();
          ctx.restore();

          if (p >= 0.96 && !cm.impacted) {
            cm.impacted = true;
            spawnBurst(cx, cy, cm.tier === 'SSR' ? 18 : 8, cm.tier, 60, 260, ['dot', 'diamond']);
          }
        });

        // FLAGSHIP LEAD METEOR!
        if (t >= 1.12 && t <= 2.66) {
          const p = Math.max(0, Math.min(1, (t - 1.12) / 1.53));
          const ep = easeInOutQuart(p);
          const mx = quadBezier(width * 0.9, width * 0.62, cx, ep);
          const my = quadBezier(height * 0.08, height * 0.22, cy, ep);

          leadTrail.push({ x: mx, y: my, tier: currentTier });
          if (leadTrail.length > 34) leadTrail.shift();

          // Volumetric ribbon tail
          ctx.save();
          ctx.globalCompositeOperation = 'lighter';
          ctx.lineCap = 'round';
          for (let i = 1; i < leadTrail.length; i++) {
            const frac = i / leadTrail.length;
            const prev = leadTrail[i - 1];
            const cur = leadTrail[i];
            const tPal = PALETTES[cur.tier];

            // Outer glowing plasma sheath
            ctx.strokeStyle = tPal.isPrismatic ? rainbowHex(i + t * 18) : tPal.primary;
            ctx.globalAlpha = frac * 0.55;
            ctx.lineWidth = frac * (tPal.isPrismatic ? 34 : 22);
            ctx.beginPath();
            ctx.moveTo(prev.x, prev.y);
            ctx.lineTo(cur.x, cur.y);
            ctx.stroke();

            // Hot luminous white spine
            ctx.strokeStyle = '#ffffff';
            ctx.globalAlpha = frac * 0.92;
            ctx.lineWidth = frac * 9;
            ctx.beginPath();
            ctx.moveTo(prev.x, prev.y);
            ctx.lineTo(cur.x, cur.y);
            ctx.stroke();
          }

          // Blazing comet head + 4-point star flare
          const headGlow = ctx.createRadialGradient(mx, my, 2, mx, my, pal.isPrismatic ? 72 : 52);
          headGlow.addColorStop(0, '#ffffff');
          headGlow.addColorStop(0.3, pal.primary);
          headGlow.addColorStop(0.65, `rgba(${pal.rgbAlt[0]},${pal.rgbAlt[1]},${pal.rgbAlt[2]},0.32)`);
          headGlow.addColorStop(1, 'rgba(0,0,0,0)');
          ctx.fillStyle = headGlow;
          ctx.globalAlpha = 1;
          ctx.beginPath();
          ctx.arc(mx, my, pal.isPrismatic ? 72 : 52, 0, Math.PI * 2);
          ctx.fill();

          ctx.fillStyle = '#ffffff';
          drawFourPointStar(mx, my, pal.isPrismatic ? 34 : 24, t * 5);

          // Anamorphic flare bar on SSR comet!
          if (currentTier === 'SSR') {
            const flareGrad = ctx.createLinearGradient(mx - 170, my, mx + 170, my);
            flareGrad.addColorStop(0, 'rgba(56,232,255,0)');
            flareGrad.addColorStop(0.35, 'rgba(253,224,71,0.75)');
            flareGrad.addColorStop(0.5, '#ffffff');
            flareGrad.addColorStop(0.65, 'rgba(244,114,182,0.75)');
            flareGrad.addColorStop(1, 'rgba(244,114,182,0)');
            ctx.fillStyle = flareGrad;
            ctx.fillRect(mx - 170, my - 3.5, 340, 7);
          }
          ctx.restore();

          // Arcing transformation lightning right after SR or SSR fakeout!
          if (
            (fired.upgradeSR && t >= 1.7 && t <= 1.98) ||
            (fired.upgradeSSR && t >= 2.16 && t <= 2.52)
          ) {
            const boltColor = currentTier === 'SSR' ? '#fde047' : '#e879f9';
            for (let b = 0; b < 3; b++) {
              const ang = Math.random() * Math.PI * 2;
              const len = 55 + Math.random() * 85;
              drawLightningBolt(mx, my, mx + Math.cos(ang) * len, my + Math.sin(ang) * len, boltColor);
            }
          }

          // Emit continuous meteor embers & stardust
          if (hitstopRemain <= 0) {
            const emitCount = currentTier === 'SSR' ? 5 : 3;
            for (let e = 0; e < emitCount; e++) {
              particles.push({
                x: mx + (Math.random() - 0.5) * 16,
                y: my + (Math.random() - 0.5) * 16,
                vx: (Math.random() - 0.5) * 140 + 40,
                vy: (Math.random() - 0.5) * 140 - 30,
                size: Math.random() * 4.2 + 1.5,
                alpha: 1,
                life: 0,
                maxLife: 0.38 + Math.random() * 0.42,
                color: pal.isPrismatic ? rainbowHex(e + t * 20) : pal.primary,
                shape: currentTier === 'SSR' && e === 0 ? 'feather' : 'diamond',
                rot: Math.random() * Math.PI * 2,
                vrot: (Math.random() - 0.5) * 7,
                drag: 0.95,
              });
            }
          }
        }
      }

      // 5. ACT 3: 3D Faceted Starlight Crystal Prism & Implosion (2.65s -> 3.58s)
      if (t >= 2.65 && t < 3.6) {
        const localT = t - 2.65;
        const enterScale = easeOutCubic(Math.min(1, localT / 0.28));
        const pulse = Math.sin(localT * (14 + localT * 18)) * 0.5 + 0.5;
        const crystalScale = minDim * (0.115 * enterScale) * (1 + pulse * 0.08 + localT * 0.14);
        const crackStage = t >= 3.44 ? 3 : t >= 3.24 ? 2 : t >= 2.98 ? 1 : 0;

        // Converging spiral energy streams pulled into crystal
        ctx.save();
        ctx.globalCompositeOperation = 'lighter';
        const streamCount = highestTier === 'SSR' ? 28 : 18;
        for (let i = 0; i < streamCount; i++) {
          const phase = ((localT * 1.7 + i / streamCount) % 1);
          const dist = (1 - easeInCubic(phase)) * minDim * 0.54;
          const ang = (i / streamCount) * Math.PI * 2 + phase * 2.4 + localT * 1.4;
          const px = cx + Math.cos(ang) * dist;
          const py = cy + Math.sin(ang) * dist;
          const tx = cx + Math.cos(ang - 0.18) * (dist + 28);
          const ty = cy + Math.sin(ang - 0.18) * (dist + 28);
          ctx.strokeStyle = pal.isPrismatic ? rainbowHex(i) : pal.primary;
          ctx.globalAlpha = Math.sin(phase * Math.PI) * 0.8;
          ctx.lineWidth = 2.4;
          ctx.beginPath();
          ctx.moveTo(px, py);
          ctx.lineTo(tx, ty);
          ctx.stroke();
        }
        ctx.restore();

        // Anamorphic impact horizontal flare beam right after collision
        if (localT < 0.45) {
          const flareAlpha = (1 - localT / 0.45) * 0.85;
          ctx.save();
          ctx.globalCompositeOperation = 'lighter';
          ctx.globalAlpha = flareAlpha;
          const fg = ctx.createLinearGradient(0, cy, width, cy);
          fg.addColorStop(0, 'rgba(0,0,0,0)');
          fg.addColorStop(0.25, pal.primary);
          fg.addColorStop(0.5, '#ffffff');
          fg.addColorStop(0.75, pal.secondary);
          fg.addColorStop(1, 'rgba(0,0,0,0)');
          ctx.fillStyle = fg;
          ctx.fillRect(0, cy - 10 * flareAlpha, width, 20 * flareAlpha);
          ctx.restore();
        }

        draw3DCrystalPrism(
          cx,
          cy,
          crystalScale,
          localT * (2.6 + localT * 3.8),
          Math.sin(localT * 3.2) * 0.35 + 0.18,
          pal,
          crackStage,
          pulse,
        );

        // Twin 3D Tilted Gyroscope Containment Rings tightening around the crystal before shatter!
        ctx.save();
        ctx.translate(cx, cy);
        ctx.globalCompositeOperation = 'lighter';
        const tightScale = 1.65 - (localT / 0.95) * 0.42;
        for (let g = 0; g < 2; g++) {
          ctx.save();
          ctx.rotate(g === 0 ? 0.55 + localT * 1.4 : -0.55 - localT * 1.65);
          ctx.scale(1, 0.34);
          ctx.strokeStyle =
            g === 0
              ? pal.isPrismatic
                ? '#fde047'
                : pal.primary
              : pal.isPrismatic
                ? '#38e8ff'
                : pal.secondary;
          ctx.lineWidth = 2.6 + crackStage * 0.7;
          ctx.shadowColor = pal.primary;
          ctx.shadowBlur = 16;
          ctx.globalAlpha = 0.72 + pulse * 0.25;
          ctx.beginPath();
          ctx.arc(0, 0, crystalScale * tightScale * (1 + g * 0.16), 0, Math.PI * 2);
          ctx.stroke();
          ctx.restore();
        }
        ctx.restore();
      }

      // 6. ACT 3 FINALE: Radial Manga Speed-Lines on Shatter (3.58s -> 4.25s)
      if (t >= 3.58) {
        const sLocal = (t - 3.58) / (TOTAL_DURATION - 3.58);
        ctx.save();
        ctx.translate(cx, cy);
        ctx.globalCompositeOperation = 'lighter';
        const rayN = 48;
        const maxR = Math.max(width, height) * 0.95;
        for (let i = 0; i < rayN; i++) {
          const ang = (i / rayN) * Math.PI * 2 + sLocal * 0.35;
          const rStart = minDim * (0.08 + sLocal * 0.25);
          ctx.strokeStyle = pal.isPrismatic ? rainbowHex(i) : i % 2 === 0 ? '#ffffff' : pal.primary;
          ctx.globalAlpha = Math.max(0, 0.72 * (1 - sLocal * 0.65));
          ctx.lineWidth = i % 3 === 0 ? 4.5 : 2;
          ctx.beginPath();
          ctx.moveTo(Math.cos(ang) * rStart, Math.sin(ang) * rStart);
          ctx.lineTo(Math.cos(ang) * maxR, Math.sin(ang) * maxR);
          ctx.stroke();
        }
        ctx.restore();
      }

      // 7. Update & Render Shock Rings
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      for (let i = rings.length - 1; i >= 0; i--) {
        const r = rings[i];
        r.radius += r.speed * dt;
        r.alpha = Math.max(0, 1 - r.radius / r.maxRadius);
        if (r.alpha <= 0.01) {
          rings.splice(i, 1);
          continue;
        }
        ctx.strokeStyle = r.color;
        ctx.globalAlpha = r.alpha * 0.9;
        ctx.lineWidth = Math.max(1, r.lineWidth * r.alpha);
        ctx.shadowColor = r.color;
        ctx.shadowBlur = 16;
        ctx.beginPath();
        ctx.arc(r.x, r.y, r.radius, 0, Math.PI * 2);
        ctx.stroke();
      }
      ctx.restore();

      // 8. Update & Render Particles (shards, diamonds, glowing feathers)
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      for (let i = particles.length - 1; i >= 0; i--) {
        const pt = particles[i];
        pt.life += dt;
        if (pt.life >= pt.maxLife) {
          particles.splice(i, 1);
          continue;
        }
        pt.vx *= Math.pow(pt.drag, dt * 60);
        pt.vy *= Math.pow(pt.drag, dt * 60);
        pt.x += pt.vx * dt;
        pt.y += pt.vy * dt;
        pt.rot += pt.vrot * dt;
        const remain = 1 - pt.life / pt.maxLife;

        ctx.fillStyle = pt.color;
        ctx.globalAlpha = remain * pt.alpha;

        if (pt.shape === 'diamond') {
          drawDiamond(pt.x, pt.y, pt.size * (0.5 + remain * 0.7), pt.rot);
        } else if (pt.shape === 'shard') {
          ctx.save();
          ctx.translate(pt.x, pt.y);
          ctx.rotate(pt.rot);
          ctx.beginPath();
          ctx.moveTo(0, -pt.size * 2.1);
          ctx.lineTo(pt.size * 0.85, pt.size * 0.9);
          ctx.lineTo(-pt.size * 0.9, pt.size * 0.55);
          ctx.closePath();
          ctx.fill();
          ctx.restore();
        } else if (pt.shape === 'feather') {
          ctx.save();
          ctx.translate(pt.x, pt.y);
          ctx.rotate(pt.rot);
          ctx.beginPath();
          ctx.ellipse(0, 0, pt.size * 2.2, pt.size * 0.55, 0, 0, Math.PI * 2);
          ctx.fill();
          ctx.restore();
        } else {
          ctx.beginPath();
          ctx.arc(pt.x, pt.y, pt.size * remain, 0, Math.PI * 2);
          ctx.fill();
        }
      }
      ctx.restore();

      // 9. Transient Upgrade/Impact Flash + Finale Supernova White-Out Dissolve
      if (flashAlpha > 0.008) {
        ctx.save();
        ctx.fillStyle = flashColor;
        ctx.globalAlpha = Math.min(1, flashAlpha);
        ctx.fillRect(-30, -30, width + 60, height + 60);
        ctx.restore();
        flashAlpha *= Math.pow(0.03, rawDt);
      }

      if (t >= 3.66) {
        const whiteOut = easeInCubic((t - 3.66) / (TOTAL_DURATION - 3.66));
        ctx.save();
        const wg = ctx.createRadialGradient(
          cx,
          cy,
          minDim * 0.05,
          cx,
          cy,
          Math.max(width, height) * 0.9,
        );
        wg.addColorStop(0, '#ffffff');
        wg.addColorStop(0.55, highestTier === 'SSR' ? '#fef9c3' : pal.core);
        wg.addColorStop(1, highestTier === 'SSR' ? '#fde047' : pal.primary);
        ctx.fillStyle = wg;
        ctx.globalAlpha = Math.min(1, whiteOut * 1.12);
        ctx.fillRect(-30, -30, width + 60, height + 60);
        ctx.restore();
      }

      ctx.restore();
      rafId = requestAnimationFrame(tick);
    };

    rafId = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(rafId);
      window.removeEventListener('resize', resize);
      synth.dispose();
    };
  }, [bannerAccent, companions, enableScreenShake, highestTier, isMulti, onComplete]);

  const handleCanvasTap = (e: React.MouseEvent<HTMLDivElement>) => {
    clickBurstsRef.current.push({ x: e.clientX, y: e.clientY });
  };

  const captionColor =
    caption.tone === 'SSR'
      ? 'text-amber-200 drop-shadow-[0_0_18px_rgba(253,224,71,0.95)]'
      : caption.tone === 'SR'
        ? 'text-fuchsia-200 drop-shadow-[0_0_16px_rgba(192,132,252,0.95)]'
        : caption.tone === 'R'
          ? 'text-sky-200 drop-shadow-[0_0_14px_rgba(56,189,248,0.85)]'
          : 'text-sky-100 drop-shadow-[0_0_14px_rgba(125,211,252,0.85)]';

  return (
    <div
      onClick={handleCanvasTap}
      className="fixed inset-0 z-50 bg-[#02030a] overflow-hidden select-none cursor-pointer"
    >
      {/* 60 FPS Full-Screen Celestial Canvas */}
      <canvas ref={canvasRef} className="block w-full h-full" />

      {/* Cinema Letterbox Top & Bottom Bars */}
      <motion.div
        initial={{ y: -56 }}
        animate={{ y: 0 }}
        transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
        className="pointer-events-none fixed inset-x-0 top-0 h-11 sm:h-14 bg-gradient-to-b from-black/95 via-black/80 to-transparent border-b border-amber-300/20 z-20 flex items-center justify-between px-4 sm:px-6"
      >
        <div className="flex items-center gap-2 text-[10px] sm:text-xs font-display font-extrabold uppercase tracking-[0.26em] text-amber-200/80">
          <Sparkles className="w-3.5 h-3.5 text-amber-300 animate-pulse" />
          <span>{isMulti ? '10× STARLIGHT CONVERGENCE' : 'STARLIGHT RESONANCE'}</span>
        </div>
        <div
          className="hidden sm:flex items-center gap-1.5 mr-24 sm:mr-28 text-[10px] font-mono font-bold uppercase tracking-[0.22em]"
          style={{ color: PALETTES[displayTierHud].primary }}
        >
          <span
            className="w-2 h-2 rounded-full animate-ping"
            style={{ backgroundColor: PALETTES[displayTierHud].primary }}
          />
          <span>RESONANCE: {displayTierHud}</span>
        </div>
      </motion.div>

      <motion.div
        initial={{ y: 56 }}
        animate={{ y: 0 }}
        transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
        className="pointer-events-none fixed inset-x-0 bottom-0 h-14 sm:h-16 bg-gradient-to-t from-black/95 via-black/80 to-transparent border-t border-amber-300/20 z-20 flex items-center justify-center px-4"
      >
        <AnimatePresence mode="wait">
          <motion.div
            key={caption.text}
            initial={{ opacity: 0, y: 8, scale: 0.94 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -6, scale: 0.98 }}
            transition={{ duration: 0.25 }}
            className={`font-display font-black text-xs sm:text-base uppercase tracking-[0.28em] text-center ${captionColor}`}
          >
            {caption.text}
          </motion.div>
        </AnimatePresence>
      </motion.div>

      {/* Top-Right Skip Control */}
      <button
        onClick={(e) => {
          e.stopPropagation();
          onSkip();
        }}
        className="fixed top-2.5 sm:top-3 right-3 sm:right-5 z-30 flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-slate-950/80 hover:bg-slate-900 border border-amber-300/40 hover:border-amber-300 text-[11px] sm:text-xs font-display font-extrabold uppercase tracking-[0.2em] text-slate-200 hover:text-amber-200 backdrop-blur-md shadow-xl transition-all"
      >
        <span>Skip</span>
        <FastForward className="w-3.5 h-3.5" />
      </button>
    </div>
  );
};
