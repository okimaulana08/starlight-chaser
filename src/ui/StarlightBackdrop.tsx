import React, { useEffect, useRef, useState } from 'react';

interface StarlightBackdropProps {
  variant?: 'LOBBY' | 'SUMMON' | 'FORGE' | 'CODEX';
  accentColor?: string;
}

/**
 * Full-bleed living celestial world backdrop:
 * - In LOBBY mode, renders the full-resolution painted Aurelia Bastion sky terrace
 *   (`bg_lobby_aurelia.webp`) at vivid clarity with animated rising golden starlight embers
 *   and faint astrolabe rings layered smoothly over it!
 * - In SUMMON / FORGE / CODEX modes, blends a tinted atmospheric backdrop of Aurelia
 *   with animated constellation rings, volumetric glow, and rising starlight particles.
 */
export const StarlightBackdrop: React.FC<StarlightBackdropProps> = ({
  variant = 'LOBBY',
  accentColor = '#f5c84c',
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [customBgReady, setCustomBgReady] = useState(true);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let raf = 0;
    let width = (canvas.width = window.innerWidth);
    let height = (canvas.height = window.innerHeight);

    const handleResize = () => {
      width = canvas.width = window.innerWidth;
      height = canvas.height = window.innerHeight;
    };
    window.addEventListener('resize', handleResize);

    const motes = Array.from({ length: 64 }, () => ({
      x: Math.random() * width,
      y: Math.random() * height,
      r: 0.9 + Math.random() * 2.6,
      vy: -(12 + Math.random() * 26),
      vx: (Math.random() - 0.5) * 14,
      alpha: 0.28 + Math.random() * 0.72,
      twinkle: Math.random() * Math.PI * 2,
      isGold: Math.random() > 0.35,
    }));

    let last = performance.now();
    const render = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      const t = now * 0.001;

      ctx.clearRect(0, 0, width, height);

      // If no painted BG image loaded, paint deep celestial sky gradient fallback
      if (!customBgReady) {
        const sky = ctx.createLinearGradient(0, 0, width * 0.45, height);
        sky.addColorStop(0, '#0a1230');
        sky.addColorStop(0.5, '#132352');
        sky.addColorStop(1, '#090b1a');
        ctx.fillStyle = sky;
        ctx.fillRect(0, 0, width, height);
      }

      // Soft colored atmospheric aura matching current Hero / Banner accent
      const glowX = variant === 'LOBBY' ? width * 0.32 : width * 0.5;
      const glowY = variant === 'LOBBY' ? height * 0.4 : height * 0.38;
      const rad = ctx.createRadialGradient(
        glowX,
        glowY,
        10,
        glowX,
        glowY,
        Math.max(width, height) * 0.55,
      );
      rad.addColorStop(0, `${accentColor}${variant === 'LOBBY' ? '22' : '38'}`);
      rad.addColorStop(0.45, 'rgba(56, 232, 255, 0.09)');
      rad.addColorStop(1, 'rgba(5, 7, 18, 0)');
      ctx.fillStyle = rad;
      ctx.fillRect(0, 0, width, height);

      // Faint rotating Celestial Astrolabe Rings
      ctx.save();
      ctx.translate(glowX, glowY);
      ctx.rotate(t * 0.04);
      ctx.strokeStyle =
        variant === 'LOBBY' ? 'rgba(253, 224, 71, 0.14)' : 'rgba(245, 200, 76, 0.18)';
      ctx.lineWidth = 1.3;
      ctx.setLineDash([12, 18]);
      ctx.beginPath();
      ctx.arc(0, 0, Math.min(width, height) * 0.34, 0, Math.PI * 2);
      ctx.stroke();

      ctx.rotate(-t * 0.08);
      ctx.strokeStyle = 'rgba(56, 232, 255, 0.12)';
      ctx.setLineDash([6, 22]);
      ctx.beginPath();
      ctx.arc(0, 0, Math.min(width, height) * 0.46, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();

      // Rising luminous golden & cyan Starlight Embers
      for (const m of motes) {
        m.y += m.vy * dt;
        m.x += (m.vx + Math.sin(t + m.twinkle) * 8) * dt;
        if (m.y < -15) {
          m.y = height + 15;
          m.x = Math.random() * width;
        }
        const pulse = 0.55 + 0.45 * Math.sin(t * 2.8 + m.twinkle);
        const a = m.alpha * pulse;
        ctx.fillStyle = m.isGold
          ? `rgba(253, 224, 71, ${a})`
          : `rgba(125, 211, 252, ${a})`;
        ctx.beginPath();
        ctx.arc(m.x, m.y, m.r, 0, Math.PI * 2);
        ctx.fill();
      }

      raf = requestAnimationFrame(render);
    };

    raf = requestAnimationFrame(render);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('resize', handleResize);
    };
  }, [variant, accentColor, customBgReady]);

  return (
    <div className="pointer-events-none fixed inset-0 z-0 overflow-hidden bg-[#060916]">
      {/* Real Painted Aurelia Bastion Sky Terrace */}
      {customBgReady && (
        <img
          src="/assets/environments/bg_lobby_aurelia.webp"
          alt=""
          onError={() => setCustomBgReady(false)}
          className={`absolute inset-0 w-full h-full object-cover object-center transition-all duration-700 ${
            variant === 'LOBBY'
              ? 'opacity-90 scale-[1.02]'
              : variant === 'SUMMON'
                ? 'opacity-40 scale-105 blur-[2px] saturate-125'
                : 'opacity-30 scale-105 blur-[3px]'
          }`}
        />
      )}

      {/* Atmospheric Readability Veil (subtle in Lobby so sky shines, deeper in menus) */}
      <div
        className="absolute inset-0"
        style={{
          background:
            variant === 'LOBBY'
              ? 'linear-gradient(95deg, rgba(6,9,22,0.52) 0%, rgba(6,9,22,0.14) 48%, rgba(6,9,22,0.68) 100%), radial-gradient(ellipse at center, transparent 42%, rgba(4,6,16,0.62) 100%)'
              : variant === 'SUMMON'
                ? 'radial-gradient(circle at 42% 38%, rgba(28,16,66,0.45), rgba(5,7,18,0.86) 78%)'
                : 'linear-gradient(180deg, rgba(7,10,24,0.72) 0%, rgba(5,7,18,0.88) 100%)',
        }}
      />

      {/* Animated Starlight Motes & Celestial Rings Overlay */}
      <canvas ref={canvasRef} className="absolute inset-0 w-full h-full" />
    </div>
  );
};
