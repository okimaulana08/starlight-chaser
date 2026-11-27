import React, { useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { FastForward, Play, Sparkles } from 'lucide-react';
import { HERO_MAP } from '../data/heroes';
import { RELIC_MAP } from '../data/relics';
import { audioManager } from '../engine/AudioManager';
import { useSettingsStore } from '../store/useSettingsStore';
import type { BannerDef, GachaPullResult, Tier } from '../types/game';
import { ArtImage } from './ArtImage';
import { CollectibleCard } from './CollectibleCard';
import { GameIcon } from './GameIcon';
import { RarityCrest, RoleBadge } from './RoleBadge';

interface AmbientParticlesProps {
  tier: Tier;
  themeColor: string;
}

/**
 * 60 FPS Ambient Celebration Particle Field behind Spotlight & Results Stages.
 */
const CelebrationCanvas: React.FC<AmbientParticlesProps> = ({ tier, themeColor }) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    let w = window.innerWidth;
    let h = window.innerHeight;
    const resize = () => {
      w = window.innerWidth;
      h = window.innerHeight;
      canvas.width = Math.floor(w * dpr);
      canvas.height = Math.floor(h * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();
    window.addEventListener('resize', resize);

    const palette =
      tier === 'SSR'
        ? ['#fde047', '#ffffff', '#f472b6', '#38e8ff', themeColor]
        : tier === 'SR'
          ? ['#c084fc', '#f5d0fe', '#818cf8', themeColor]
          : ['#38bdf8', '#bae6fd', '#60a5fa', themeColor];

    const count = tier === 'SSR' ? 88 : tier === 'SR' ? 56 : 38;
    const motes = Array.from({ length: count }, (_, i) => ({
      x: Math.random() * w,
      y: Math.random() * h,
      vx: (Math.random() - 0.5) * 28,
      vy: -(24 + Math.random() * 64),
      size: Math.random() * (tier === 'SSR' ? 4.4 : 3.2) + 1.4,
      color: palette[i % palette.length],
      phase: Math.random() * Math.PI * 2,
      speed: 1.5 + Math.random() * 2.5,
      isStar: i % 4 === 0,
    }));

    let last = performance.now();
    let raf = 0;

    const frame = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      ctx.clearRect(0, 0, w, h);
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';

      for (const m of motes) {
        m.phase += dt * m.speed;
        m.x += (m.vx + Math.sin(m.phase) * 18) * dt;
        m.y += m.vy * dt;
        if (m.y < -20) {
          m.y = h + 20;
          m.x = Math.random() * w;
        }
        if (m.x < -20) m.x = w + 20;
        if (m.x > w + 20) m.x = -20;

        const twinkle = 0.35 + (Math.sin(m.phase * 1.8) * 0.5 + 0.5) * 0.65;
        ctx.fillStyle = m.color;
        ctx.globalAlpha = twinkle * 0.85;

        if (m.isStar) {
          const r = m.size * 1.9;
          ctx.save();
          ctx.translate(m.x, m.y);
          ctx.beginPath();
          for (let k = 0; k < 8; k++) {
            const ang = (k * Math.PI) / 4;
            const rad = k % 2 === 0 ? r : r * 0.25;
            if (k === 0) ctx.moveTo(Math.cos(ang) * rad, Math.sin(ang) * rad);
            else ctx.lineTo(Math.cos(ang) * rad, Math.sin(ang) * rad);
          }
          ctx.closePath();
          ctx.fill();
          ctx.restore();
        } else {
          ctx.beginPath();
          ctx.arc(m.x, m.y, m.size, 0, Math.PI * 2);
          ctx.fill();
        }
      }

      ctx.restore();
      raf = requestAnimationFrame(frame);
    };

    raf = requestAnimationFrame(frame);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('resize', resize);
    };
  }, [tier, themeColor]);

  return <canvas ref={canvasRef} className="pointer-events-none absolute inset-0 w-full h-full z-[2]" />;
};

interface SummonSpotlightProps {
  result: GachaPullResult;
  queueIndex: number;
  queueTotal: number;
  /** True for 1× pull where Confirm & Summon Again are shown directly on the showcase */
  isStandaloneSingle?: boolean;
  /** True when replaying a card from the 10× results grid */
  isReplay?: boolean;
  banner: BannerDef;
  crystals: number;
  onNext: () => void;
  onSkipAll: () => void;
  onSummonAgain?: (count: 1 | 10) => void;
}

export const SummonSpotlight: React.FC<SummonSpotlightProps> = ({
  result,
  queueIndex,
  queueTotal,
  isStandaloneSingle = false,
  isReplay = false,
  banner,
  crystals,
  onNext,
  onSkipAll,
  onSummonAgain,
}) => {
  const enableUltVideo = useSettingsStore((s) => s.enableUltVideo);
  const hero = result.kind === 'HERO' ? HERO_MAP[result.id] : null;
  const relic = result.kind === 'RELIC' ? RELIC_MAP[result.id] : null;
  const hasSsrVideo = Boolean(
    enableUltVideo && hero && result.tier === 'SSR' && hero.assets.cutInVideo,
  );

  // Choreography sub-stage: SILHOUETTE -> (VIDEO for SSR Hero) -> STAGE
  const [subPhase, setSubPhase] = useState<'SILHOUETTE' | 'VIDEO' | 'STAGE'>(() =>
    hero && (result.tier === 'SSR' || result.tier === 'SR') ? 'SILHOUETTE' : 'STAGE',
  );
  const [videoFailed, setVideoFailed] = useState(false);
  const videoRef = useRef<HTMLVideoElement | null>(null);

  // Reset choreography whenever spotlight item changes
  useEffect(() => {
    setVideoFailed(false);
    const shouldSilhouette = Boolean(hero && (result.tier === 'SSR' || result.tier === 'SR'));
    setSubPhase(shouldSilhouette ? 'SILHOUETTE' : 'STAGE');
  }, [result.id, queueIndex, hero, result.tier]);

  // Auto-advance SILHOUETTE -> VIDEO (for SSR Hero) or STAGE
  useEffect(() => {
    if (subPhase !== 'SILHOUETTE') return;
    const ms = result.tier === 'SSR' ? 680 : 440;
    const timer = window.setTimeout(() => {
      if (hasSsrVideo && !videoFailed) {
        setSubPhase('VIDEO');
      } else {
        setSubPhase('STAGE');
      }
    }, ms);
    return () => window.clearTimeout(timer);
  }, [subPhase, hasSsrVideo, videoFailed, result.tier]);

  // Auto-play 1080p SSR Sakuga Cut-In Video & cap duration at 3.2s so it stays punchy!
  useEffect(() => {
    if (subPhase !== 'VIDEO') return;
    const vid = videoRef.current;
    if (!vid) {
      setSubPhase('STAGE');
      return;
    }
    vid.currentTime = 0;
    vid.playbackRate = 1.18;
    const playPromise = vid.play();
    if (playPromise && typeof playPromise.catch === 'function') {
      playPromise.catch(() => {
        setVideoFailed(true);
        setSubPhase('STAGE');
      });
    }
    const maxCap = window.setTimeout(() => setSubPhase('STAGE'), 3300);
    return () => window.clearTimeout(maxCap);
  }, [subPhase]);

  // Accent SFX when Grand Standing Stage opens
  useEffect(() => {
    if (subPhase === 'STAGE') {
      audioManager.playSfx(result.tier === 'SSR' ? 'ssr_reveal' : 'ult_chime', 0.04);
    }
  }, [subPhase, result.tier, result.id]);

  const accentColor =
    hero?.themeColor ??
    (result.tier === 'SSR' ? '#f5c84c' : result.tier === 'SR' ? '#c084fc' : '#38bdf8');
  const starCount = result.tier === 'SSR' ? 5 : result.tier === 'SR' ? 4 : 3;

  const handleStageClick = () => {
    if (subPhase === 'SILHOUETTE') {
      setSubPhase(hasSsrVideo && !videoFailed ? 'VIDEO' : 'STAGE');
      return;
    }
    if (subPhase === 'VIDEO') {
      setSubPhase('STAGE');
      return;
    }
    if (!isStandaloneSingle) {
      onNext();
    }
  };

  const canAffordSingle = crystals >= banner.singleCost;

  return (
    <motion.div
      key={`${result.id}_${queueIndex}`}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.3 }}
      onClick={handleStageClick}
      className="fixed inset-0 z-50 bg-[#040612] flex flex-col items-center justify-center overflow-hidden select-none cursor-pointer"
    >
      {/* Arrival White-Gold Flash Dissolve from Supernova */}
      <motion.div
        initial={{ opacity: 0.92 }}
        animate={{ opacity: 0 }}
        transition={{ duration: 0.55, ease: 'easeOut' }}
        className="pointer-events-none fixed inset-0 z-40"
        style={{
          background:
            result.tier === 'SSR'
              ? 'radial-gradient(circle, #ffffff 0%, #fef08a 60%, #f59e0b 100%)'
              : result.tier === 'SR'
                ? 'radial-gradient(circle, #ffffff 0%, #e9d5ff 60%, #9333ea 100%)'
                : 'radial-gradient(circle, #ffffff 0%, #bae6fd 65%, #0284c7 100%)',
        }}
      />

      {/* SUB-PHASE 1: DRAMATIC SILHOUETTE SUSPENSE FLASH */}
      {subPhase === 'SILHOUETTE' && hero && (
        <div className="relative w-full h-full flex flex-col items-center justify-center p-6 overflow-hidden">
          <div
            className="pointer-events-none absolute inset-0"
            style={{
              background:
                result.tier === 'SSR'
                  ? 'radial-gradient(circle at 50% 48%, rgba(253,224,71,0.38) 0%, rgba(124,45,18,0.22) 38%, rgba(4,6,18,0.98) 78%)'
                  : 'radial-gradient(circle at 50% 48%, rgba(192,132,252,0.34) 0%, rgba(59,7,100,0.22) 40%, rgba(4,6,18,0.98) 78%)',
            }}
          />
          {/* High-contrast spinning speed rays (full-bleed at any resolution) */}
          <div className="pointer-events-none absolute inset-0 overflow-hidden flex items-center justify-center">
            <div
              className="w-[260vmax] h-[260vmax] shrink-0 opacity-35 animate-spin"
              style={{
                animationDuration: '12s',
                background:
                  result.tier === 'SSR'
                    ? 'repeating-conic-gradient(from 0deg, rgba(253,224,71,0.72) 0deg 5deg, transparent 5deg 16deg)'
                    : 'repeating-conic-gradient(from 0deg, rgba(192,132,252,0.68) 0deg 5deg, transparent 5deg 18deg)',
              }}
            />
          </div>

          <motion.div
            initial={{ scale: 1.32, opacity: 0 }}
            animate={{ scale: 1.02, opacity: 1 }}
            transition={{ duration: 0.42, ease: [0.22, 1, 0.36, 1] }}
            className="relative z-10 h-[62dvh] sm:h-[78dvh] flex items-end justify-center"
          >
            <ArtImage
              kind="HERO"
              id={hero.id}
              src={hero.assets.standing}
              alt="Mystery Hero Silhouette"
              className="h-full w-auto object-contain object-bottom"
              style={{
                filter:
                  result.tier === 'SSR'
                    ? 'brightness(0) drop-shadow(0 0 28px rgba(253,224,71,0.98)) drop-shadow(0 0 60px rgba(244,114,182,0.7))'
                    : 'brightness(0) drop-shadow(0 0 26px rgba(192,132,252,0.95))',
              }}
            />
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.14, duration: 0.3 }}
            className="relative z-20 -mt-12 text-center px-6 py-2.5 rounded-full bg-slate-950/85 border border-amber-300/50 backdrop-blur-md shadow-2xl"
          >
            <p className="font-serif-italic italic text-sm sm:text-xl text-amber-100 tracking-wide">
              “{hero.quote}”
            </p>
          </motion.div>
        </div>
      )}

      {/* SUB-PHASE 2: FULL-BLEED 1080P SSR SAKUGA VIDEO CUT-IN! */}
      {subPhase === 'VIDEO' && hero && hero.assets.cutInVideo && (
        <motion.div
          initial={{ opacity: 0, scale: 1.06 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.32 }}
          className="relative w-full h-full bg-black flex items-center justify-center overflow-hidden"
        >
          <video
            ref={videoRef}
            src={hero.assets.cutInVideo}
            poster={hero.assets.cutIn ?? hero.assets.card}
            autoPlay
            muted
            playsInline
            preload="auto"
            onEnded={() => setSubPhase('STAGE')}
            onError={() => {
              setVideoFailed(true);
              setSubPhase('STAGE');
            }}
            className="w-full h-full object-cover object-center"
          />

          {/* Cinema Letterbox + Golden Vignette */}
          <div
            className="pointer-events-none absolute inset-0"
            style={{
              background:
                'linear-gradient(180deg, rgba(4,6,18,0.88) 0%, transparent 18%, transparent 74%, rgba(4,6,18,0.95) 100%)',
            }}
          />

          {/* Top Left SSR Arrival Badge */}
          <motion.div
            initial={{ x: -30, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            transition={{ delay: 0.18 }}
            className="pointer-events-none absolute top-5 left-5 sm:top-7 sm:left-8 flex items-center gap-2.5 px-3.5 py-1.5 rounded-full bg-slate-950/80 border border-amber-300/70 backdrop-blur-md shadow-[0_0_24px_rgba(253,224,71,0.4)]"
          >
            <RarityCrest tier="SSR" size="xs" />
            <span className="font-display font-black text-[10px] sm:text-xs uppercase tracking-[0.24em] text-amber-200">
              ✦ CELESTIAL RESONANCE ARRIVAL
            </span>
          </motion.div>

          {/* Dramatic Bottom Quote & Name Banner */}
          <motion.div
            initial={{ y: 24, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.25, duration: 0.4 }}
            className="pointer-events-none absolute inset-x-0 bottom-5 sm:bottom-8 flex flex-col items-center text-center px-6"
          >
            <div className="px-5 py-2 rounded-full bg-slate-950/75 border border-amber-300/40 backdrop-blur-md shadow-2xl max-w-2xl">
              <div className="font-serif-italic italic text-base sm:text-2xl text-amber-50 drop-shadow-[0_2px_10px_rgba(0,0,0,0.95)]">
                “{hero.quote}”
              </div>
            </div>
            <div className="mt-2.5 text-[10px] sm:text-xs font-display font-extrabold uppercase tracking-[0.3em] text-amber-300 drop-shadow-[0_2px_6px_rgba(0,0,0,0.95)] animate-pulse">
              Tap Anywhere to Reveal →
            </div>
          </motion.div>
        </motion.div>
      )}

      {/* SUB-PHASE 3: GRAND FULL-BODY HERO OR MYTHIC RELIC REVEAL STAGE */}
      {subPhase === 'STAGE' && (
        <div className="relative w-full h-full flex flex-col items-center justify-center p-4 sm:p-8 overflow-hidden">
          {/* Deep Tier Radial Aura */}
          <div
            className="pointer-events-none absolute inset-0"
            style={{
              background:
                result.tier === 'SSR'
                  ? `radial-gradient(circle at 38% 50%, ${accentColor}48 0%, rgba(245,200,76,0.18) 32%, rgba(4,6,18,0.97) 75%)`
                  : result.tier === 'SR'
                    ? `radial-gradient(circle at 38% 50%, ${accentColor}40 0%, rgba(168,85,247,0.18) 36%, rgba(4,6,18,0.97) 75%)`
                    : `radial-gradient(circle at 38% 50%, ${accentColor}34 0%, rgba(56,189,248,0.15) 36%, rgba(4,6,18,0.97) 75%)`,
            }}
          />

          {/* Rotating Conic Volumetric Light Shafts (full-bleed at any resolution) */}
          <div className="pointer-events-none absolute inset-0 overflow-hidden flex items-center justify-center">
            <div
              className="w-[260vmax] h-[260vmax] shrink-0 opacity-25 animate-spin"
              style={{
                animationDuration: result.tier === 'SSR' ? '26s' : '38s',
                background:
                  result.tier === 'SSR'
                    ? 'repeating-conic-gradient(from 0deg, rgba(253,224,71,0.68) 0deg 7deg, transparent 7deg 22deg)'
                    : result.tier === 'SR'
                      ? 'repeating-conic-gradient(from 0deg, rgba(192,132,252,0.58) 0deg 8deg, transparent 8deg 26deg)'
                      : 'repeating-conic-gradient(from 0deg, rgba(56,189,248,0.48) 0deg 8deg, transparent 8deg 28deg)',
              }}
            />
          </div>

          {/* 60 FPS Ambient Celebration Particles */}
          <CelebrationCanvas tier={result.tier} themeColor={accentColor} />

          {/* Main Showcase Content: Hero or Relic */}
          <div className="relative z-10 w-full max-w-5xl flex flex-col sm:flex-row items-center justify-center gap-4 sm:gap-8">
            {/* LEFT: Full-Body Standing Hero OR Floating Relic Medallion */}
            {hero ? (
              <motion.div
                initial={{ opacity: 0, x: -72, scale: 1.16 }}
                animate={{ opacity: 1, x: 0, scale: 1 }}
                transition={{ type: 'spring', stiffness: 185, damping: 22 }}
                className="relative h-[46dvh] sm:h-[78dvh] max-h-[680px] flex items-end justify-center shrink-0"
              >
                {/* Pedestal Halo Glow */}
                <div
                  className="pointer-events-none absolute bottom-4 w-56 sm:w-80 h-14 rounded-full blur-xl opacity-65"
                  style={{ background: accentColor }}
                />
                <ArtImage
                  kind="HERO"
                  id={hero.id}
                  src={hero.assets.standing}
                  alt={hero.name}
                  className="relative h-full w-auto object-contain object-bottom animate-breathe"
                  style={{
                    filter: `drop-shadow(0 24px 44px rgba(0,0,0,0.96)) drop-shadow(0 0 38px ${accentColor}88)`,
                  }}
                />
              </motion.div>
            ) : relic ? (
              <motion.div
                initial={{ opacity: 0, scale: 0.65, rotateY: 90 }}
                animate={{ opacity: 1, scale: 1, rotateY: 0 }}
                transition={{ type: 'spring', stiffness: 210, damping: 20 }}
                className="relative flex items-center justify-center shrink-0 [perspective:1000px]"
              >
                {/* Rotating Relic Astrolabe Halo */}
                <div
                  className="pointer-events-none absolute w-64 h-64 sm:w-80 sm:h-80 rounded-full border-2 border-dashed animate-spin opacity-60"
                  style={{
                    animationDuration: '18s',
                    borderColor: accentColor,
                    boxShadow: `0 0 55px ${accentColor}55`,
                  }}
                />
                <motion.div
                  animate={{ y: [0, -10, 0] }}
                  transition={{ duration: 3.4, repeat: Infinity, ease: 'easeInOut' }}
                  className="relative w-44 sm:w-64"
                >
                  <CollectibleCard
                    kind="RELIC"
                    id={relic.id}
                    src={relic.assetCard}
                    name={relic.name}
                    subtitle={`${relic.preferredRole} Relic`}
                    tier={relic.tier}
                    role={relic.preferredRole}
                    isNew={result.isNew}
                    interactive={false}
                  />
                </motion.div>
              </motion.div>
            ) : null}

            {/* RIGHT: Grand Lore & Rarity Plaque */}
            <motion.div
              initial={{ opacity: 0, x: 40 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.14, duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
              className="relative max-w-md text-center sm:text-left space-y-2.5 sm:space-y-3"
            >
              {/* Animated Sequential Stars */}
              <div className="flex items-center justify-center sm:justify-start gap-1">
                {Array.from({ length: starCount }, (_, i) => (
                  <motion.span
                    key={i}
                    initial={{ scale: 0, rotate: -45, opacity: 0 }}
                    animate={{ scale: 1, rotate: 0, opacity: 1 }}
                    transition={{
                      delay: 0.18 + i * 0.08,
                      type: 'spring',
                      stiffness: 420,
                      damping: 18,
                    }}
                    className="text-lg sm:text-2xl leading-none"
                    style={{
                      color:
                        result.tier === 'SSR'
                          ? '#fde047'
                          : result.tier === 'SR'
                            ? '#d8b4fe'
                            : '#7dd3fc',
                      textShadow: `0 0 14px ${accentColor}`,
                    }}
                  >
                    ★
                  </motion.span>
                ))}
              </div>

              {/* Crest + Role + Faction + New/Rate-Up Pills */}
              <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2">
                <RarityCrest tier={result.tier} size="md" />
                {(hero?.role || relic?.preferredRole) && (
                  <RoleBadge
                    role={(hero?.role ?? relic?.preferredRole)!}
                    variant="pill"
                    size="md"
                  />
                )}
                {hero && (
                  <span className="px-2.5 py-0.5 rounded-full bg-slate-900/90 border border-slate-600/70 text-[10px] font-display font-bold uppercase tracking-widest text-slate-200">
                    {hero.faction}
                  </span>
                )}
                {result.isFeatured && (
                  <span className="px-2.5 py-0.5 rounded-full bg-amber-400/20 border border-amber-300/70 text-amber-200 font-display font-black text-[10px] uppercase tracking-widest">
                    ★ RATE-UP
                  </span>
                )}
                {result.isNew ? (
                  <span className="px-2.5 py-0.5 rounded-full bg-amber-400 text-slate-950 font-black text-[10px] uppercase tracking-widest shadow-[0_0_16px_rgba(251,191,36,0.75)]">
                    NEW {hero ? 'HERO' : 'RELIC'}!
                  </span>
                ) : (
                  <span className="px-2.5 py-0.5 rounded-full bg-fuchsia-950/90 border border-fuchsia-400/60 text-fuchsia-200 font-mono font-bold text-[10px]">
                    {result.shardsGained > 0 ? `+${result.shardsGained} Shards • ` : ''}+
                    {result.starDustGained} Star Dust
                  </span>
                )}
              </div>

              {/* Title & Name */}
              <div>
                <h2 className="font-display text-4xl sm:text-6xl font-black text-white text-glow-gold leading-none">
                  {hero ? hero.name : relic?.name}
                </h2>
                <div className="text-sm sm:text-lg font-serif-italic italic text-cyan-200 tracking-wider mt-1">
                  {hero ? hero.title : `${relic?.preferredRole ?? ''} Starlight Relic`}
                </div>
              </div>

              {/* Hero Quote OR Relic Passive + Lore */}
              {hero ? (
                <>
                  <p
                    className="text-xs sm:text-sm text-slate-100 italic bg-slate-950/80 border-l-4 px-3.5 py-2.5 backdrop-blur-md shadow-xl"
                    style={{ borderColor: accentColor }}
                  >
                    “{hero.quote}”
                  </p>
                  <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2 pt-0.5">
                    <div className="text-[11px] bg-slate-900/80 border border-slate-700/70 px-3 py-1 rounded-lg text-slate-300">
                      <span className="text-amber-300 font-display font-black uppercase tracking-wider mr-1.5">
                        ULTIMATE:
                      </span>
                      <span className="text-white font-semibold">{hero.ultimate.name}</span>
                    </div>
                    {hasSsrVideo && !videoFailed && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setSubPhase('VIDEO');
                        }}
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-amber-400/15 hover:bg-amber-400/25 border border-amber-300/50 text-[10px] font-display font-black uppercase tracking-wider text-amber-200 transition-colors"
                      >
                        <Play className="w-3 h-3 fill-amber-200" />
                        <span>Replay Cut-In</span>
                      </button>
                    )}
                  </div>
                </>
              ) : relic ? (
                <div className="space-y-2">
                  <div className="text-xs sm:text-sm text-cyan-100 bg-slate-950/80 border border-cyan-400/40 rounded-lg px-3.5 py-2.5 backdrop-blur-md">
                    <span className="text-[10px] font-display font-black uppercase tracking-widest text-amber-300 block mb-0.5">
                      Relic Resonance Effect
                    </span>
                    {relic.passiveDesc}
                  </div>
                  <p className="text-xs text-slate-300 italic">{relic.lore}</p>
                </div>
              ) : null}

              {/* Footer Controls: Standalone 1× vs Queue vs Replay */}
              {isStandaloneSingle ? (
                <div
                  onClick={(e) => e.stopPropagation()}
                  className="pt-3 flex flex-wrap items-center justify-center sm:justify-start gap-3"
                >
                  <button
                    onClick={onNext}
                    className="rpg-blade px-7 py-2.5 text-white font-display font-black text-xs sm:text-sm uppercase tracking-[0.2em]"
                  >
                    Confirm
                  </button>
                  {onSummonAgain && (
                    <button
                      disabled={!canAffordSingle}
                      onClick={() => onSummonAgain(1)}
                      className={`px-6 py-2.5 font-display font-black text-xs sm:text-sm uppercase tracking-[0.16em] flex items-center gap-2 ${
                        canAffordSingle
                          ? 'rpg-battle-cta text-slate-950'
                          : 'rounded-xl bg-slate-900/80 border border-slate-700 text-slate-500 cursor-not-allowed'
                      }`}
                    >
                      <GameIcon name="crystal" className="w-4 h-4" />
                      <span>Summon 1× Again ({banner.singleCost})</span>
                    </button>
                  )}
                </div>
              ) : (
                <div className="pt-2 flex items-center justify-center sm:justify-start gap-2 text-amber-300 text-xs font-black uppercase tracking-[0.24em] animate-pulse">
                  <Sparkles className="w-4 h-4" />
                  <span>
                    {isReplay
                      ? 'Tap Anywhere to Return →'
                      : queueIndex + 1 < queueTotal
                        ? `Tap for Next Showcase (${queueIndex + 1}/${queueTotal}) →`
                        : 'Tap to View All Results →'}
                  </span>
                </div>
              )}
            </motion.div>
          </div>
        </div>
      )}

      {/* Top-Right Skip Control */}
      {!isStandaloneSingle && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            onSkipAll();
          }}
          className="fixed top-3.5 right-4 z-30 flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-slate-950/85 hover:bg-slate-900 border border-amber-300/40 hover:border-amber-300 text-[11px] sm:text-xs font-display font-extrabold uppercase tracking-[0.18em] text-slate-200 hover:text-amber-200 backdrop-blur-md shadow-xl transition-all"
        >
          <span>{isReplay ? 'Close' : 'Skip All'}</span>
          <FastForward className="w-3.5 h-3.5" />
        </button>
      )}
    </motion.div>
  );
};

interface SummonResultsStageProps {
  results: GachaPullResult[];
  highestTier: Tier;
  banner: BannerDef;
  crystals: number;
  onConfirm: () => void;
  onSummonAgain: (count: 1 | 10) => void;
  onInspectResult: (result: GachaPullResult) => void;
}

export const SummonResultsStage: React.FC<SummonResultsStageProps> = ({
  results,
  highestTier,
  banner,
  crystals,
  onConfirm,
  onSummonAgain,
  onInspectResult,
}) => {
  const ssrCount = results.filter((r) => r.tier === 'SSR').length;
  const srCount = results.filter((r) => r.tier === 'SR').length;
  const rCount = results.filter((r) => r.tier === 'R').length;
  const totalDust = results.reduce((sum, r) => sum + r.starDustGained, 0);
  const totalShards = results.reduce((sum, r) => sum + r.shardsGained, 0);

  const repeatCount: 1 | 10 = results.length > 1 ? 10 : 1;
  const repeatCost = repeatCount === 10 ? banner.tenCost : banner.singleCost;
  const canAffordRepeat = crystals >= repeatCost;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 bg-[#040612]/96 backdrop-blur-md flex flex-col items-center justify-center p-3 sm:p-5 overflow-y-auto select-none"
    >
      {/* Radiant Backdrop Glow & Ambient Motes */}
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            highestTier === 'SSR'
              ? 'radial-gradient(circle at 50% 24%, rgba(253,224,71,0.22) 0%, rgba(244,114,182,0.08) 38%, rgba(4,6,18,0.98) 76%)'
              : highestTier === 'SR'
                ? 'radial-gradient(circle at 50% 24%, rgba(192,132,252,0.22) 0%, rgba(79,70,229,0.08) 40%, rgba(4,6,18,0.98) 76%)'
                : 'radial-gradient(circle at 50% 24%, rgba(56,189,248,0.18) 0%, rgba(14,116,144,0.08) 40%, rgba(4,6,18,0.98) 76%)',
        }}
      />
      <CelebrationCanvas tier={highestTier} themeColor={banner.accentColor} />

      {/* Header + Tier Summary Chips */}
      <motion.div
        initial={{ opacity: 0, y: -14 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative z-10 text-center mb-2 sm:mb-3"
      >
        <h2 className="font-display text-2xl sm:text-4xl font-black text-white tracking-[0.22em] text-glow-gold">
          SUMMON RESULTS
        </h2>
        {highestTier === 'SSR' && (
          <div className="text-[11px] sm:text-xs font-black uppercase tracking-[0.28em] text-amber-300 mt-0.5 animate-pulse">
            ★ CELESTIAL SSR RESONANCE ACHIEVED ★
          </div>
        )}

        <div className="mt-2 flex flex-wrap items-center justify-center gap-1.5 sm:gap-2 text-[10px] sm:text-xs font-mono font-bold">
          {ssrCount > 0 && (
            <span className="px-2.5 py-0.5 rounded-full bg-amber-400/20 border border-amber-300/70 text-amber-200">
              ★ {ssrCount} SSR
            </span>
          )}
          {srCount > 0 && (
            <span className="px-2.5 py-0.5 rounded-full bg-fuchsia-500/20 border border-fuchsia-400/60 text-fuchsia-200">
              ✦ {srCount} SR
            </span>
          )}
          {rCount > 0 && (
            <span className="px-2.5 py-0.5 rounded-full bg-sky-500/15 border border-sky-400/50 text-sky-200">
              {rCount} R
            </span>
          )}
          <span className="px-2.5 py-0.5 rounded-full bg-slate-900/90 border border-slate-700 text-amber-300">
            +{results.length} Starlight Tokens
          </span>
          {totalShards > 0 && (
            <span className="px-2.5 py-0.5 rounded-full bg-slate-900/90 border border-fuchsia-500/40 text-fuchsia-200">
              +{totalShards} Shards
            </span>
          )}
          {totalDust > 0 && (
            <span className="px-2.5 py-0.5 rounded-full bg-slate-900/90 border border-cyan-500/40 text-cyan-200">
              +{totalDust} Star Dust
            </span>
          )}
        </div>
      </motion.div>

      {/* 3D Choreographed Card-Flip Cascade Grid */}
      <div
        className={`relative z-10 grid gap-2.5 sm:gap-3 my-2 sm:my-3 w-full max-w-5xl [perspective:1200px] ${
          results.length === 1 ? 'grid-cols-1 max-w-xs' : 'grid-cols-2 sm:grid-cols-5'
        }`}
      >
        {results.map((res, idx) => {
          const role =
            res.kind === 'HERO'
              ? HERO_MAP[res.id]?.role
              : RELIC_MAP[res.id]?.preferredRole;
          const sub =
            res.kind === 'HERO'
              ? HERO_MAP[res.id]?.title
              : `${RELIC_MAP[res.id]?.preferredRole ?? ''} Relic`;
          const flipDelay = idx * 0.075;
          return (
            <motion.div
              key={`${res.id}_${idx}`}
              initial={{ opacity: 0, rotateY: 112, scale: 0.72, y: 26 }}
              animate={{ opacity: 1, rotateY: 0, scale: 1, y: 0 }}
              transition={{
                type: 'spring',
                stiffness: res.tier === 'SSR' ? 230 : 310,
                damping: 20,
                delay: flipDelay,
              }}
              whileHover={{ y: -4, scale: 1.03 }}
              onClick={() => onInspectResult(res)}
              className="relative cursor-pointer group"
            >
              {/* Rarity Landing Pulse Ring for SSR & SR */}
              {(res.tier === 'SSR' || res.tier === 'SR') && (
                <motion.div
                  initial={{ opacity: 0.9, scale: 0.7 }}
                  animate={{ opacity: 0, scale: 1.45 }}
                  transition={{ delay: flipDelay + 0.12, duration: 0.65, ease: 'easeOut' }}
                  className="pointer-events-none absolute -inset-2 rounded-2xl border-2"
                  style={{
                    borderColor: res.tier === 'SSR' ? '#fde047' : '#c084fc',
                    boxShadow:
                      res.tier === 'SSR'
                        ? '0 0 36px rgba(253,224,71,0.85)'
                        : '0 0 24px rgba(192,132,252,0.75)',
                  }}
                />
              )}
              <CollectibleCard
                kind={res.kind}
                id={res.id}
                src={res.assetCard}
                name={res.name}
                subtitle={results.length === 1 ? sub : undefined}
                tier={res.tier}
                role={role}
                isNew={res.isNew}
                compact={results.length > 1}
                interactive={false}
                footerExtra={
                  !res.isNew ? (
                    <div className="text-[10px] text-fuchsia-200 font-mono font-bold">
                      {res.shardsGained > 0 ? `+${res.shardsGained} Shards • ` : ''}+
                      {res.starDustGained} Dust
                    </div>
                  ) : undefined
                }
              />
            </motion.div>
          );
        })}
      </div>

      <div className="relative z-10 text-[10px] text-slate-400 tracking-wider uppercase mb-2">
        Tap any card to view full showcase
      </div>

      {/* Bottom Action Bar: Confirm + Instant Summon Again */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: Math.min(0.65, results.length * 0.06) }}
        className="relative z-10 flex flex-wrap items-center justify-center gap-3 mt-1"
      >
        <button
          onClick={onConfirm}
          className="rpg-blade px-8 py-3 text-white font-display font-black text-xs sm:text-sm uppercase tracking-[0.2em]"
        >
          Confirm
        </button>
        <button
          disabled={!canAffordRepeat}
          onClick={() => onSummonAgain(repeatCount)}
          className={`px-7 py-3 font-display font-black text-xs sm:text-sm uppercase tracking-[0.16em] flex items-center gap-2 ${
            canAffordRepeat
              ? 'rpg-battle-cta text-slate-950'
              : 'rounded-xl bg-slate-900/80 border border-slate-700 text-slate-500 cursor-not-allowed'
          }`}
        >
          <GameIcon name="summon" className="w-4 h-4 sm:w-5 sm:h-5" />
          <span>
            Summon {repeatCount}× Again ({repeatCost.toLocaleString()})
          </span>
        </button>
      </motion.div>
    </motion.div>
  );
};
