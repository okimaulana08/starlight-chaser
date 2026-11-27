import React, { useEffect, useRef, useState } from 'react';
import type { Faction, Tier } from '../types/game';
import { ArtImage } from './ArtImage';

interface Live2DLobbyStageProps {
  heroId: string;
  heroName: string;
  src: string;
  faction: Faction;
  tier?: Tier;
  themeColor: string;
  parallaxX: number;
  parallaxY: number;
  tapPulseKey: number;
  onTap: () => void;
}

interface LobbyParticle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  alpha: number;
  phase: number;
  speed: number;
  layer: 'back' | 'front';
  kind: 'mote' | 'spark' | 'petal' | 'ember';
  color: string;
  rot: number;
  rotSpeed: number;
}

interface BurstParticle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  life: number;
  maxLife: number;
  color: string;
}

function getFactionPalette(faction: Faction, themeColor: string): [string, string, string] {
  switch (faction) {
    case 'SOLARIS':
      return ['#fef08a', '#f5c84c', themeColor];
    case 'ASHEN':
      return ['#fb923c', '#f43f5e', '#fde047'];
    case 'ASTRAL':
      return ['#7dd3fc', '#c084fc', themeColor];
    case 'VERDANT':
      return ['#6ee7b7', '#34d399', '#fef08a'];
  }
}

/**
 * 2B Live2D-Style Lobby Champion Stage (Zero WebGL conflict, 60 FPS HTML5 Canvas).
 * Animates any Hero's transparent full-body standing artwork with:
 *  - Smooth multi-strip organic chest breathing & waist-to-shoulder lift (boots anchored!)
 *  - Traveling cloak, ribbon & hair wind-wave sway
 *  - Damped 2.5D pointer-tracking upper-body tilt
 *  - Tactile tap reaction bounce, expanding faction shockwave ring & burst sparks
 *  - Periodic diagonal armor/blade specular light-glint masked cleanly to the hero silhouette
 *  - Dual-layer (back + front) faction-specific elemental particle aura
 */
export const Live2DLobbyStage: React.FC<Live2DLobbyStageProps> = ({
  heroId,
  heroName,
  src,
  faction,
  tier = 'SSR',
  themeColor,
  parallaxX,
  parallaxY,
  tapPulseKey,
  onTap,
}) => {
  const isUR = tier === 'UR';
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const offscreenRef = useRef<HTMLCanvasElement | null>(null);
  const imgRef = useRef<HTMLImageElement | null>(null);
  const pointerRef = useRef({ x: 0, y: 0 });
  const tapSpringRef = useRef({ bounce: 0, vel: 0, ringProgress: 1 });
  const burstsRef = useRef<BurstParticle[]>([]);
  const [imgLoaded, setImgLoaded] = useState(false);
  const [imgFailed, setImgFailed] = useState(false);

  // Sync latest pointer parallax smoothly without restarting RAF loop
  pointerRef.current.x = parallaxX;
  pointerRef.current.y = parallaxY;

  // Trigger lively Live2D spring bounce & burst sparks on hero tap!
  useEffect(() => {
    if (tapPulseKey <= 0) return;
    tapSpringRef.current.vel = -2.8;
    tapSpringRef.current.bounce = 0.06;
    tapSpringRef.current.ringProgress = 0;

    const palette = getFactionPalette(faction, themeColor);
    const canvas = canvasRef.current;
    const cw = canvas ? canvas.clientWidth : 460;
    const ch = canvas ? canvas.clientHeight : 620;
    const cx = cw * 0.5;
    const cy = ch * 0.48;
    const nextBursts: BurstParticle[] = [];
    for (let i = 0; i < 14; i++) {
      const a = (i / 14) * Math.PI * 2 + (Math.random() - 0.5) * 0.4;
      const spd = 85 + Math.random() * 140;
      nextBursts.push({
        x: cx + (Math.random() - 0.5) * 40,
        y: cy + (Math.random() - 0.5) * 50,
        vx: Math.cos(a) * spd,
        vy: Math.sin(a) * spd - 35,
        size: 3 + Math.random() * 4.5,
        life: 0.72 + Math.random() * 0.25,
        maxLife: 0.95,
        color: palette[i % palette.length],
      });
    }
    burstsRef.current = [...burstsRef.current.slice(-18), ...nextBursts];
  }, [tapPulseKey, faction, themeColor]);

  // Load standing hero image cleanly
  useEffect(() => {
    setImgLoaded(false);
    setImgFailed(false);
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      imgRef.current = img;
      setImgLoaded(true);
    };
    img.onerror = () => {
      imgRef.current = null;
      setImgFailed(true);
    };
    img.src = src;
    return () => {
      img.onload = null;
      img.onerror = null;
    };
  }, [src]);

  // 60 FPS Live2D-Lite Mesh-Strip & Elemental Particle Animation Loop
  useEffect(() => {
    if (!imgLoaded || imgFailed) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    if (!offscreenRef.current) {
      offscreenRef.current = document.createElement('canvas');
    }
    const off = offscreenRef.current;
    const offCtx = off.getContext('2d');
    if (!offCtx) return;

    const palette = isUR
      ? ['#ffffff', '#fde047', '#38e8ff', '#e879f9']
      : getFactionPalette(faction, themeColor);
    const particleKind: LobbyParticle['kind'] = isUR
      ? 'spark'
      : faction === 'ASHEN'
        ? 'ember'
        : faction === 'VERDANT'
          ? 'petal'
          : faction === 'ASTRAL'
            ? 'spark'
            : 'mote';

    const particles: LobbyParticle[] = Array.from({ length: isUR ? 48 : 30 }, (_, i) => ({
      x: Math.random(),
      y: Math.random(),
      vx: faction === 'VERDANT' ? 0.03 + Math.random() * 0.04 : (Math.random() - 0.5) * 0.028,
      vy: faction === 'ASHEN' ? -(0.07 + Math.random() * 0.08) : -(0.032 + Math.random() * 0.055),
      size: (isUR ? 2.6 : 2.2) + Math.random() * (isUR ? 5.2 : 4.4),
      alpha: (isUR ? 0.48 : 0.35) + Math.random() * 0.52,
      phase: Math.random() * Math.PI * 2,
      speed: 1.4 + Math.random() * 2.4,
      layer: i % 3 === 0 ? 'front' : 'back',
      kind: isUR && i % 3 === 1 ? 'mote' : particleKind,
      color: palette[i % palette.length],
      rot: Math.random() * Math.PI * 2,
      rotSpeed: (Math.random() - 0.5) * 2.6,
    }));

    let smoothPtrX = 0;
    let smoothPtrY = 0;
    let clock = 0;
    let lastTs = performance.now();
    let rafId = 0;
    let cssW = 0;
    let cssH = 0;

    const syncSize = () => {
      const rect = canvas.getBoundingClientRect();
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const nw = Math.max(160, Math.round(rect.width));
      const nh = Math.max(220, Math.round(rect.height));
      if (nw !== cssW || nh !== cssH || canvas.width !== Math.round(nw * dpr)) {
        cssW = nw;
        cssH = nh;
        canvas.width = Math.round(nw * dpr);
        canvas.height = Math.round(nh * dpr);
        off.width = canvas.width;
        off.height = canvas.height;
      }
      return dpr;
    };

    const drawStar4 = (c: CanvasRenderingContext2D, x: number, y: number, r: number) => {
      c.beginPath();
      c.moveTo(x, y - r * 1.45);
      c.quadraticCurveTo(x + r * 0.22, y - r * 0.22, x + r * 1.45, y);
      c.quadraticCurveTo(x + r * 0.22, y + r * 0.22, x, y + r * 1.45);
      c.quadraticCurveTo(x - r * 0.22, y + r * 0.22, x - r * 1.45, y);
      c.quadraticCurveTo(x - r * 0.22, y - r * 0.22, x, y - r * 1.45);
      c.closePath();
      c.fill();
    };

    const drawParticleLayer = (
      c: CanvasRenderingContext2D,
      layer: 'back' | 'front',
      w: number,
      h: number,
    ) => {
      c.save();
      c.globalCompositeOperation = 'lighter';
      for (const p of particles) {
        if (p.layer !== layer) continue;
        const px = p.x * w;
        const py = p.y * h;
        const twinkle = 0.55 + 0.45 * Math.sin(clock * p.speed + p.phase);
        const edgeFade = Math.min(1, Math.min(p.y * 4, (1 - p.y) * 5));
        const a = p.alpha * twinkle * Math.max(0, edgeFade);
        if (a <= 0.02) continue;

        c.globalAlpha = a;
        c.fillStyle = p.color;

        if (p.kind === 'spark') {
          drawStar4(c, px, py, p.size * 0.9);
        } else if (p.kind === 'petal') {
          c.save();
          c.translate(px, py);
          c.rotate(p.rot);
          c.beginPath();
          c.ellipse(0, 0, p.size * 1.35, p.size * 0.52, 0, 0, Math.PI * 2);
          c.fill();
          c.restore();
        } else if (p.kind === 'ember') {
          c.beginPath();
          c.ellipse(px, py, p.size * 0.55, p.size * 1.35, Math.sin(clock + p.phase) * 0.25, 0, Math.PI * 2);
          c.fill();
        } else {
          // SOLARIS radiant soft mote
          const g = c.createRadialGradient(px, py, 0, px, py, p.size * 2.1);
          g.addColorStop(0, '#ffffff');
          g.addColorStop(0.35, p.color);
          g.addColorStop(1, 'rgba(255,255,255,0)');
          c.fillStyle = g;
          c.beginPath();
          c.arc(px, py, p.size * 2.1, 0, Math.PI * 2);
          c.fill();
        }
      }
      c.restore();
    };

    const tick = (now: number) => {
      const dt = Math.min(0.05, Math.max(0.004, (now - lastTs) / 1000));
      lastTs = now;
      clock += dt;

      const dpr = syncSize();
      const w = cssW;
      const h = cssH;

      // Update damped pointer tracking & tap reaction spring
      const ptrBlend = 1 - Math.exp(-6.5 * dt);
      smoothPtrX += (pointerRef.current.x - smoothPtrX) * ptrBlend;
      smoothPtrY += (pointerRef.current.y - smoothPtrY) * ptrBlend;

      const sp = tapSpringRef.current;
      const springAcc = -sp.bounce * 165 - sp.vel * 12;
      sp.vel += springAcc * dt;
      sp.bounce += sp.vel * dt;
      if (sp.ringProgress < 1) {
        sp.ringProgress = Math.min(1, sp.ringProgress + dt * 1.75);
      }

      // Advance elemental particles
      for (const p of particles) {
        p.x += (p.vx + Math.sin(clock * 1.3 + p.phase) * 0.015) * dt;
        p.y += p.vy * dt;
        p.rot += p.rotSpeed * dt;
        if (p.y < -0.05) {
          p.y = 1.04;
          p.x = 0.14 + Math.random() * 0.72;
        }
        if (p.x < -0.05) p.x = 1.04;
        if (p.x > 1.05) p.x = -0.04;
      }

      // Advance tap burst particles
      const bursts = burstsRef.current;
      for (let i = bursts.length - 1; i >= 0; i--) {
        const b = bursts[i];
        b.life -= dt;
        if (b.life <= 0) {
          bursts.splice(i, 1);
          continue;
        }
        b.x += b.vx * dt;
        b.y += b.vy * dt;
        b.vx *= Math.pow(0.92, dt * 60);
        b.vy *= Math.pow(0.92, dt * 60);
      }

      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, w, h);

      // 1. Back Faction Elemental Aura Particles
      drawParticleLayer(ctx, 'back', w, h);

      // 1B. UR EXCLUSIVE ALMIGHTY CELESTIAL ASTROLABE MANDALA & PRISMATIC BACKDROP HALO!
      if (isUR) {
        const cx = w * 0.5 + smoothPtrX * 6;
        const cy = h * 0.34 + smoothPtrY * 4;
        const outerR = Math.min(w, h) * 0.36;
        ctx.save();
        ctx.globalCompositeOperation = 'lighter';
        // Soft prismatic nebula glow behind Sovereign
        const nebula = ctx.createRadialGradient(cx, cy, outerR * 0.08, cx, cy, outerR * 1.45);
        nebula.addColorStop(0, 'rgba(255, 255, 255, 0.24)');
        nebula.addColorStop(0.32, 'rgba(253, 224, 71, 0.22)');
        nebula.addColorStop(0.62, 'rgba(232, 121, 249, 0.16)');
        nebula.addColorStop(0.84, 'rgba(56, 232, 255, 0.1)');
        nebula.addColorStop(1, 'rgba(0, 0, 0, 0)');
        ctx.fillStyle = nebula;
        ctx.beginPath();
        ctx.arc(cx, cy, outerR * 1.45, 0, Math.PI * 2);
        ctx.fill();

        // Outer rotating golden astrolabe ring + 8 constellation diamond spikes
        ctx.translate(cx, cy);
        ctx.rotate(clock * 0.22);
        ctx.strokeStyle = 'rgba(253, 224, 71, 0.45)';
        ctx.lineWidth = 1.6;
        ctx.beginPath();
        ctx.arc(0, 0, outerR, 0, Math.PI * 2);
        ctx.stroke();
        ctx.setLineDash([8, 6]);
        ctx.strokeStyle = 'rgba(56, 232, 255, 0.38)';
        ctx.beginPath();
        ctx.arc(0, 0, outerR * 0.84, 0, Math.PI * 2);
        ctx.stroke();
        ctx.setLineDash([]);
        for (let k = 0; k < 8; k++) {
          const a = (k * Math.PI) / 4;
          const sx = Math.cos(a) * outerR;
          const sy = Math.sin(a) * outerR;
          ctx.fillStyle = k % 2 === 0 ? 'rgba(253, 224, 71, 0.72)' : 'rgba(232, 121, 249, 0.65)';
          drawStar4(ctx, sx, sy, k % 2 === 0 ? 7.5 : 5);
        }
        // Counter-rotating inner celestial octagon
        ctx.rotate(-clock * 0.5);
        ctx.strokeStyle = 'rgba(232, 121, 249, 0.34)';
        ctx.lineWidth = 1.2;
        ctx.beginPath();
        for (let k = 0; k < 8; k++) {
          const a = (k * Math.PI) / 4;
          const rx = Math.cos(a) * outerR * 0.68;
          const ry = Math.sin(a) * outerR * 0.68;
          if (k === 0) ctx.moveTo(rx, ry);
          else ctx.lineTo(rx, ry);
        }
        ctx.closePath();
        ctx.stroke();
        ctx.restore();
      }

      // 2. Tap Reaction Expanding Faction Resonance Ring behind Hero!
      if (sp.ringProgress < 1) {
        const rp = sp.ringProgress;
        const r = 45 + rp * Math.min(w, h) * 0.42;
        ctx.save();
        ctx.globalCompositeOperation = 'lighter';
        ctx.strokeStyle = themeColor;
        ctx.lineWidth = Math.max(1.5, 5 * (1 - rp));
        ctx.globalAlpha = (1 - rp) * 0.72;
        ctx.beginPath();
        ctx.arc(w * 0.5, h * 0.46, r, 0, Math.PI * 2);
        ctx.stroke();
        ctx.restore();
      }

      // 3. Render Smooth Multi-Strip Live2D-Lite Deformed Hero onto Offscreen Buffer
      const img = imgRef.current;
      if (img && img.naturalWidth > 0 && img.naturalHeight > 0) {
        offCtx.setTransform(dpr, 0, 0, dpr, 0, 0);
        offCtx.clearRect(0, 0, w, h);

        // Fit standing hero cleanly anchored at bottom-center with comfortable top breathing margin
        const padBottom = 10;
        const maxDrawH = h * 0.94;
        const maxDrawW = w * 0.92;
        const fitScale = Math.min(maxDrawW / img.naturalWidth, maxDrawH / img.naturalHeight);
        const drawW = img.naturalWidth * fitScale;
        const drawH = img.naturalHeight * fitScale;
        const baseX = (w - drawW) * 0.5;
        const baseY = h - padBottom - drawH;

        const STRIPS = 44;
        const srcStripH = img.naturalHeight / STRIPS;
        const dstStripH = drawH / STRIPS;
        const breathe = Math.sin(clock * 2.15);
        const bounceSquashX = 1 + sp.bounce * 0.75;
        const bounceSquashY = 1 - sp.bounce * 0.85;

        for (let i = 0; i < STRIPS; i++) {
          const v = (i + 0.5) / STRIPS; // 0 = top(head), 1 = bottom(boots)
          const up = 1 - v; // 1 = head, 0 = grounded boots!
          const upPow = Math.pow(up, 1.35);

          // Organic chest breathing bell-curve around upper torso (v ≈ 0.34)
          const chestD = (v - 0.34) / 0.22;
          const chestMask = Math.exp(-chestD * chestD);
          const scaleX = (1 + breathe * 0.014 * chestMask) * bounceSquashX;

          // Smooth traveling cape/hair/garment breeze wave + subtle pointer tracking sway
          const windWave =
            Math.sin(clock * 2.4 + v * 4.4) * 3.2 * Math.sin(up * Math.PI * 0.92) +
            Math.cos(clock * 1.55 + v * 2.6) * 1.4 * up;
          const ptrLean = smoothPtrX * 11 * upPow;
          const offsetX = windWave + ptrLean;

          // Smooth vertical breathing lift + tap bounce lift (UR levitates gently in celestial starlight!)
          const urLevitateY = isUR ? Math.sin(clock * 1.65) * 6.5 - 6 : 0;
          const breatheLiftY = -breathe * 4.2 * upPow;
          const ptrLiftY = smoothPtrY * 3.5 * upPow;
          const tapLiftY = sp.bounce * 28 * up;
          const dy = baseY + i * dstStripH * bounceSquashY + (drawH * (1 - bounceSquashY)) + breatheLiftY + ptrLiftY + tapLiftY + urLevitateY;
          const sw = drawW * scaleX;
          const dx = baseX + (drawW - sw) * 0.5 + offsetX;

          offCtx.drawImage(
            img,
            0,
            i * srcStripH,
            img.naturalWidth,
            Math.min(img.naturalHeight - i * srcStripH, srcStripH + 1.2),
            dx,
            dy,
            sw,
            dstStripH * bounceSquashY + 1.35,
          );
        }

        // 4. Periodic Diagonal Specular Armor/Blade Light Sheen masked cleanly to Hero Alpha!
        const glintCycle = (clock * 0.24) % 1;
        if (glintCycle < 0.28) {
          const gp = glintCycle / 0.28;
          const gx = baseX - drawW * 0.35 + gp * (drawW * 1.7);
          offCtx.save();
          offCtx.globalCompositeOperation = 'source-atop';
          const grad = offCtx.createLinearGradient(gx - 55, baseY, gx + 55, baseY + drawH * 0.75);
          grad.addColorStop(0, 'rgba(255,255,255,0)');
          grad.addColorStop(0.5, 'rgba(255,253,235,0.22)');
          grad.addColorStop(1, 'rgba(255,255,255,0)');
          offCtx.fillStyle = grad;
          offCtx.fillRect(0, 0, w, h);
          offCtx.restore();
        }

        // Composite Live2D hero with rich anime rim drop-shadow onto main canvas
        ctx.save();
        ctx.shadowColor = `${themeColor}55`;
        ctx.shadowBlur = 22;
        ctx.drawImage(off, 0, 0, w, h);
        ctx.restore();
      }

      // 5. Front Faction Elemental Sparks + Tap Burst Motes
      drawParticleLayer(ctx, 'front', w, h);

      if (bursts.length > 0) {
        ctx.save();
        ctx.globalCompositeOperation = 'lighter';
        for (const b of bursts) {
          const a = Math.max(0, b.life / b.maxLife);
          ctx.globalAlpha = a * 0.95;
          ctx.fillStyle = b.color;
          drawStar4(ctx, b.x, b.y, b.size * (0.5 + a * 0.7));
        }
        ctx.restore();
      }

      rafId = window.requestAnimationFrame(tick);
    };

    rafId = window.requestAnimationFrame(tick);
    return () => {
      window.cancelAnimationFrame(rafId);
    };
  }, [imgLoaded, imgFailed, faction, isUR, themeColor]);

  if (imgFailed) {
    return (
      <div
        onClick={onTap}
        className="relative h-[56dvh] sm:h-[82dvh] md:h-[88dvh] max-h-[820px] flex items-end justify-center animate-breathe cursor-pointer pointer-events-auto"
        title={`Tap ${heroName} to interact!`}
      >
        <ArtImage
          kind="HERO"
          id={heroId}
          src={src}
          alt={heroName}
          className="h-full w-auto max-w-[92vw] sm:max-w-[54vw] object-contain object-bottom"
        />
      </div>
    );
  }

  return (
    <div
      onClick={onTap}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') onTap();
      }}
      title={`Tap ${heroName} to interact!`}
      className="relative h-[58dvh] sm:h-[84dvh] md:h-[89dvh] w-[86vw] sm:w-[46vw] md:w-[48vw] max-w-[600px] max-h-[820px] flex items-end justify-center cursor-pointer pointer-events-auto focus:outline-none"
    >
      <canvas
        ref={canvasRef}
        aria-label={`${heroName} Live2D animated champion`}
        className="w-full h-full block"
      />
    </div>
  );
};
