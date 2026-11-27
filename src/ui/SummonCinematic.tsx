import React, { useEffect, useMemo, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { FastForward, Sparkles } from 'lucide-react';
import { audioManager } from '../engine/AudioManager';
import { useSettingsStore } from '../store/useSettingsStore';
import type { GachaPullResult, Tier } from '../types/game';

export const SUMMON_VIDEO_SRC = '/assets/cutins/summon_starfall.mp4';
export const SUMMON_POSTER_SRC = '/assets/cutins/summon_starfall_poster.jpg';

interface SummonCinematicProps {
  results: GachaPullResult[];
  highestTier: Tier;
  bannerAccent: string;
  onComplete: () => void;
  onSkip: () => void;
}

interface TierVisualTheme {
  label: string;
  badgeText: string;
  badgeClass: string;
  coreHex: string;
  accentHex: string;
  edgeGlow: string;
  /** Subtle non-destructive CSS filter during climax so the starry night sky stays lush */
  climaxFilter: string;
  /** Color-grade veil applied over the 00:04.2–00:06.0 crystal burst */
  burstColorVeil: string;
  burstVeilOpacity: number;
  flashBg: string;
}

const TIER_THEMES: Record<Tier, TierVisualTheme> = {
  R: {
    label: 'SAPPHIRE RESONANCE',
    badgeText: 'R',
    badgeClass: 'border-sky-400/60 bg-sky-500/20 text-sky-200',
    coreHex: '#38bdf8',
    accentHex: '#0ea5e9',
    edgeGlow: 'rgba(56, 189, 248, 0.34)',
    climaxFilter: 'saturate(1.12) brightness(1.04)',
    burstColorVeil:
      'radial-gradient(circle at 50% 48%, rgba(186,230,253,0.92) 0%, rgba(56,189,248,0.88) 32%, rgba(14,116,144,0.84) 68%, rgba(7,20,46,0.72) 100%)',
    burstVeilOpacity: 0.78,
    flashBg:
      'radial-gradient(circle at 50% 50%, #ffffff 0%, #e0f2fe 42%, #38bdf8 100%)',
  },
  SR: {
    label: 'AMETHYST SURGE',
    badgeText: 'SR',
    badgeClass: 'border-fuchsia-400/70 bg-fuchsia-500/25 text-fuchsia-100',
    coreHex: '#c084fc',
    accentHex: '#e879f9',
    edgeGlow: 'rgba(192, 132, 252, 0.44)',
    climaxFilter: 'saturate(1.18) brightness(1.06)',
    burstColorVeil:
      'radial-gradient(circle at 50% 48%, rgba(250,232,255,0.92) 0%, rgba(217,70,239,0.86) 34%, rgba(126,34,206,0.85) 68%, rgba(28,7,54,0.75) 100%)',
    burstVeilOpacity: 0.82,
    flashBg:
      'radial-gradient(circle at 50% 50%, #ffffff 0%, #fae8ff 40%, #c084fc 100%)',
  },
  SSR: {
    label: 'CELESTIAL SUPERNOVA',
    badgeText: 'SSR ★',
    badgeClass:
      'border-amber-300/90 bg-amber-400/25 text-amber-100 shadow-[0_0_20px_rgba(253,224,71,0.55)]',
    coreHex: '#fde047',
    accentHex: '#f59e0b',
    edgeGlow: 'rgba(253, 224, 71, 0.56)',
    climaxFilter: 'saturate(1.26) contrast(1.06) brightness(1.1)',
    burstColorVeil:
      'radial-gradient(circle at 50% 48%, rgba(255,255,255,0.45) 0%, rgba(253,224,71,0.34) 38%, rgba(245,158,11,0.18) 72%, transparent 100%)',
    burstVeilOpacity: 0.45,
    flashBg:
      'radial-gradient(circle at 50% 50%, #ffffff 0%, #fef9c3 48%, #fde047 100%)',
  },
};

function clamp01(v: number): number {
  return Math.max(0, Math.min(1, v));
}

/**
 * Full-Screen 1080p Sakuga Anime Starfall Video Summon Cinematic (6.0s)
 *
 * Replaces procedural geometric Canvas shapes with Kling 4.0 theatrical anime cinema
 * (`summon_starfall.mp4`), synchronized to tier-reactive bloom/color-grading overlays,
 * dramatic SSR golden-prismatic fakeout surge, SFX cues, and seamless whiteout handoff
 * into `SummonShowcase`.
 */
export const SummonCinematic: React.FC<SummonCinematicProps> = ({
  results,
  highestTier,
  onComplete,
  onSkip,
}) => {
  const enableScreenShake = useSettingsStore((s) => s.enableScreenShake);
  const theme = TIER_THEMES[highestTier];
  const isTenPull = results.length > 1;

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const completedRef = useRef(false);
  const sfxFlagsRef = useRef({ rift: false, crack: false, impact: false });

  const [elapsed, setElapsed] = useState(0);
  const [videoFailed, setVideoFailed] = useState(false);

  const triggerComplete = useMemo(
    () => () => {
      if (completedRef.current) return;
      completedRef.current = true;
      onComplete();
    },
    [onComplete],
  );

  // Start playback immediately + synchronize timeline progress & audio cues at 60fps
  useEffect(() => {
    const startWall = performance.now();
    let rafId = 0;

    const vid = videoRef.current;
    if (vid) {
      vid.currentTime = 0;
      const playPromise = vid.play();
      if (playPromise && typeof playPromise.catch === 'function') {
        playPromise.catch(() => {
          // If autoplay is blocked on an exotic environment, run cleanly on wall clock fallback
          setVideoFailed(true);
        });
      }
    }

    const tick = (now: number) => {
      if (completedRef.current) return;

      const v = videoRef.current;
      const wallSec = (now - startWall) / 1000;
      const hasVideoTime =
        !videoFailed && v !== null && v.readyState >= 2 && Number.isFinite(v.currentTime);
      const t = videoFailed ? wallSec : hasVideoTime ? v.currentTime : 0;

      setElapsed(t);

      // Synchronized SFX beats locked frame-accurately to summon_starfall.mp4 currentTime:
      // 0.12s: Cosmic sky rift tears open & blazing comet launches
      if (!sfxFlagsRef.current.rift && t >= 0.12) {
        sfxFlagsRef.current.rift = true;
        audioManager.playSfx('ult_chime', 0.04);
      }
      // 3.55s: Comet plunges toward suspended star crystal (+ SSR golden fakeout ignite!)
      if (!sfxFlagsRef.current.crack && t >= 3.55) {
        sfxFlagsRef.current.crack = true;
        audioManager.playSfx('prism_crack', 0.04);
      }
      // 4.65s: Crystal fractures into radial supernova halo!
      if (!sfxFlagsRef.current.impact && t >= 4.65) {
        sfxFlagsRef.current.impact = true;
        if (highestTier === 'SSR') {
          audioManager.playSfx('ssr_reveal', 0.02);
          audioManager.playSfx('ult_impact', 0.05);
        } else if (highestTier === 'SR') {
          audioManager.playSfx('ult_impact', 0.04);
        } else {
          audioManager.playSfx('shield', 0.05);
        }
      }

      // Fallback completion:
      // - If video errored, finish smoothly after 3.2s on poster animation
      // - Normal playback finishes via video `onEnded` (~6.0s) or at 5.95s video time
      // - Hard stall guard at 14s wall time so slower networks never cut off mid-burst
      if (videoFailed && wallSec >= 3.2) {
        triggerComplete();
        return;
      }
      if ((hasVideoTime && t >= 5.95) || wallSec >= 14.0) {
        triggerComplete();
        return;
      }

      rafId = requestAnimationFrame(tick);
    };

    rafId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafId);
  }, [highestTier, triggerComplete, videoFailed]);

  // Derived cinematic beat intensities synchronized to summon_starfall.mp4 (6.0s):
  // 0.0s–2.5s : Sky rift opens & comet arcs across cosmos over sunlit clouds
  // 2.5s–3.8s : Cloud sea parts, diamond star crystal revealed
  // 3.8s–4.8s : Comet beam strikes crystal (SSR fakeout gold-rainbow surge triggers at 3.55s!)
  // 4.8s–5.6s : Native rainbow crystal halo & stardust petals burst
  // 5.45s–6.0s: Luminous whiteout transition seamlessly into Hero/Relic Spotlight
  const climaxProgress = clamp01((elapsed - 3.3) / 1.5);
  const burstProgress = clamp01((elapsed - 4.25) / 0.75);
  const whiteoutProgress = videoFailed
    ? clamp01((elapsed - 2.35) / 0.75)
    : clamp01((elapsed - 5.38) / 0.56);

  // SSR dramatic fakeout flash pulse right at 3.55s–4.15s as violet anticipation shatters into gold!
  const ssrFakeoutPulse =
    highestTier === 'SSR'
      ? Math.max(0, 1 - Math.abs(elapsed - 3.72) / 0.36)
      : 0;

  // Reveal the true tier badge only once the crystal awakens (>= 3.65s) so SSR keeps its surprise!
  const tierRevealed = elapsed >= 3.65;

  // Micro impact camera shake on crystal strike (4.55s–5.35s)
  const shakeActive =
    enableScreenShake && elapsed >= 4.55 && elapsed <= 5.35;
  const shakeAmp = shakeActive
    ? (highestTier === 'SSR' ? 7 : highestTier === 'SR' ? 4 : 2) *
      (1 - (elapsed - 4.55) / 0.8)
    : 0;
  const shakeX = shakeActive ? Math.sin(elapsed * 95) * shakeAmp : 0;
  const shakeY = shakeActive ? Math.cos(elapsed * 112) * shakeAmp * 0.75 : 0;

  // Atmospheric cinematic caption phase
  const phaseCaption =
    elapsed < 1.8
      ? 'COSMIC RIFT OPENING'
      : elapsed < 3.55
        ? isTenPull
          ? 'STARFALL CONVERGENCE • 10×'
          : 'STARFALL DESCENT'
        : elapsed < 4.7
          ? highestTier === 'SSR'
            ? 'CELESTIAL OVERDRIVE!'
            : 'CRYSTAL RESONANCE'
          : theme.label;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.2 }}
      className="fixed inset-0 z-50 overflow-hidden bg-[#030510] select-none"
    >
      {/* CAMERA WRAPPER (subtle impact shake + smooth slow push on climax) */}
      <div
        className="absolute inset-0 will-change-transform"
        style={{
          transform: `translate3d(${shakeX.toFixed(2)}px, ${shakeY.toFixed(2)}px, 0) scale(${(
            1 +
            climaxProgress * 0.045 +
            burstProgress * 0.035
          ).toFixed(4)})`,
        }}
      >
        {/* PRIMARY 1080p ANIME SAKUGA SUMMON VIDEO */}
        {!videoFailed ? (
          <video
            ref={videoRef}
            src={SUMMON_VIDEO_SRC}
            poster={SUMMON_POSTER_SRC}
            autoPlay
            muted
            playsInline
            preload="auto"
            onEnded={triggerComplete}
            onError={() => setVideoFailed(true)}
            className="w-full h-full object-cover object-center"
            style={{
              filter: climaxProgress > 0.25 ? theme.climaxFilter : 'saturate(1.06)',
              transition: 'filter 0.45s ease-out',
            }}
          />
        ) : (
          <img
            src={SUMMON_POSTER_SRC}
            alt="Starfall Summon"
            className="w-full h-full object-cover object-center"
            draggable={false}
          />
        )}

        {/* TIER-REACTIVE COLOR-GRADE VEIL ON CRYSTAL BURST
            (Re-tints the crystal supernova cleanly to Sapphire for R or Amethyst for SR,
            while letting the native golden-prismatic rainbow shine at full glory for SSR!) */}
        {highestTier !== 'SSR' && burstProgress > 0 && (
          <div
            className="pointer-events-none absolute inset-0"
            style={{
              background: theme.burstColorVeil,
              mixBlendMode: 'color',
              opacity: burstProgress * theme.burstVeilOpacity,
            }}
          />
        )}

        {/* LUMINOUS RADIAL AURA BLOOM (expands around center crystal during impact) */}
        <div
          className="pointer-events-none absolute inset-0"
          style={{
            background:
              highestTier === 'SSR'
                ? `radial-gradient(circle at 50% 48%, rgba(255,255,255,0.42) 0%, rgba(253,224,71,0.36) 24%, rgba(244,114,182,0.2) 48%, transparent 74%)`
                : `radial-gradient(circle at 50% 48%, ${theme.coreHex}55 0%, ${theme.accentHex}2a 32%, transparent 70%)`,
            mixBlendMode: 'screen',
            opacity: climaxProgress * 0.65 + burstProgress * 0.45,
          }}
        />

        {/* SSR GOLDEN-PRISMATIC FAKEOUT SHOCKWAVE & RAINBOW FLARE (3.55s–5.6s) */}
        {highestTier === 'SSR' && ssrFakeoutPulse > 0.01 && (
          <div
            className="pointer-events-none absolute inset-0"
            style={{
              background:
                'radial-gradient(circle at 50% 48%, rgba(255,255,255,0.85) 0%, rgba(253,224,71,0.65) 26%, rgba(244,114,182,0.28) 54%, transparent 80%)',
              mixBlendMode: 'screen',
              opacity: ssrFakeoutPulse * 0.85,
            }}
          />
        )}

        {/* AMBIENT EDGE VIGNETTE GLOW (frames the widescreen anime art like cinema) */}
        <div
          className="pointer-events-none absolute inset-0"
          style={{
            boxShadow: `inset 0 0 110px rgba(2,4,12,0.72), inset 0 0 ${
              tierRevealed ? 95 : 40
            }px ${tierRevealed ? theme.edgeGlow : 'rgba(56,189,248,0.16)'}`,
            transition: 'box-shadow 0.55s ease-out',
          }}
        />
      </div>

      {/* SEAMLESS FINAL WHITEOUT FLASH (bridges peak crystal burst directly into Hero Showcase) */}
      <div
        className="pointer-events-none fixed inset-0 z-20"
        style={{
          background: theme.flashBg,
          opacity: Math.pow(whiteoutProgress, 1.35),
        }}
      />

      {/* SLEEK CINEMA LETTERBOX TOP BAR */}
      <div className="pointer-events-none fixed inset-x-0 top-0 z-30 h-12 sm:h-14 bg-gradient-to-b from-[#030510]/85 via-[#030510]/45 to-transparent flex items-center justify-between px-4 sm:px-6">
        <div className="flex items-center gap-2 text-[10px] sm:text-[11px] font-display font-black uppercase tracking-[0.26em] text-amber-200/90 drop-shadow-[0_2px_8px_rgba(0,0,0,0.9)]">
          <Sparkles className="w-3.5 h-3.5 text-amber-300" />
          <span>Starlight Resonance</span>
        </div>

        <div className="flex items-center gap-2.5 pointer-events-auto">
          {/* Revealed Resonance Tier Pill (only lights up after 3.65s so SSR remains a thrilling surprise) */}
          <div
            className={`px-2.5 py-1 rounded-full border text-[10px] font-display font-black uppercase tracking-[0.18em] backdrop-blur-md transition-all duration-300 ${
              tierRevealed
                ? `${theme.badgeClass} opacity-100 scale-100`
                : 'border-white/15 bg-slate-950/55 text-slate-300/80 opacity-85 scale-95'
            }`}
          >
            {tierRevealed ? `RESONANCE: ${theme.badgeText}` : 'RESONATING...'}
          </div>

          <button
            type="button"
            onClick={() => {
              audioManager.playSfx('button');
              onSkip();
            }}
            className="px-3.5 py-1.5 rounded-full bg-slate-950/75 hover:bg-slate-900/95 border border-white/25 hover:border-amber-300/70 text-[11px] font-display font-black uppercase tracking-[0.16em] text-white flex items-center gap-1.5 backdrop-blur-md shadow-lg transition cursor-pointer"
          >
            <span>Skip</span>
            <FastForward className="w-3.5 h-3.5 text-amber-300" />
          </button>
        </div>
      </div>

      {/* SLEEK CINEMA LETTERBOX BOTTOM BAR & PHASE SUBTITLE */}
      <div className="pointer-events-none fixed inset-x-0 bottom-0 z-30 h-14 sm:h-16 bg-gradient-to-t from-[#030510]/90 via-[#030510]/50 to-transparent flex flex-col items-center justify-end pb-3 sm:pb-4 px-4">
        <div
          className="font-display text-xs sm:text-sm font-black uppercase tracking-[0.34em] drop-shadow-[0_2px_10px_rgba(0,0,0,0.95)] transition-colors duration-300"
          style={{
            color: tierRevealed ? theme.coreHex : '#e2e8f0',
          }}
        >
          {phaseCaption}
        </div>
      </div>
    </motion.div>
  );
};
