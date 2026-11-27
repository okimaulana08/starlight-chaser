import React, { useEffect, useMemo, useRef, useState } from 'react';
import { HERO_MAP } from '../data/heroes';
import { getFallbackCardSvg } from '../engine/AssetManager';
import { useCombatStore } from '../store/useCombatStore';
import { useSettingsStore } from '../store/useSettingsStore';
import { RarityCrest } from './RoleBadge';

export const UltimateCutInOverlay: React.FC = () => {
  const activeCutIn = useCombatStore((s) => s.activeCutIn);
  const skillCallout = useCombatStore((s) => s.skillCallout);
  const impactFlash = useCombatStore((s) => s.impactFlash);
  const speedMultiplier = useCombatStore((s) => s.speedMultiplier);
  const heroes = useCombatStore((s) => s.heroes);
  const enableUltVideo = useSettingsStore((s) => s.enableUltVideo);

  const [cutInFallback, setCutInFallback] = useState(false);
  const [videoFailed, setVideoFailed] = useState(false);
  const videoRef = useRef<HTMLVideoElement | null>(null);

  useEffect(() => {
    setCutInFallback(false);
    setVideoFailed(false);
  }, [activeCutIn?.heroId, activeCutIn?.cutInAsset, activeCutIn?.cutInVideo]);

  // Preload active squad's SSR Ultimate Cut-In videos silently so playback starts with 0ms latency!
  const preloadVideos = useMemo(() => {
    const urls = new Set<string>();
    for (const h of heroes) {
      const vid = HERO_MAP[h.heroId]?.assets.cutInVideo;
      if (vid) urls.add(vid);
    }
    return Array.from(urls);
  }, [heroes]);

  useEffect(() => {
    const vid = videoRef.current;
    if (!vid || activeCutIn?.phase !== 'CUTIN' || !activeCutIn.cutInVideo || videoFailed) return;
    vid.currentTime = 0;
    vid.playbackRate = speedMultiplier === 2 ? 1.85 : 1.24;
    const p = vid.play();
    if (p && typeof p.catch === 'function') {
      p.catch(() => setVideoFailed(true));
    }
  }, [activeCutIn?.heroId, activeCutIn?.phase, activeCutIn?.cutInVideo, speedMultiplier, videoFailed]);

  // All 12 Heroes (SSR, SR & R) show real anime art, and 4 SSR Heroes play 1080p Kling 4.0 Sakuga Video Cut-Ins!
  const imgSrc =
    !cutInFallback && (activeCutIn?.cutInAsset || activeCutIn?.cardAsset)
      ? (activeCutIn.cutInAsset ?? activeCutIn.cardAsset)
      : activeCutIn
        ? getFallbackCardSvg('HERO', activeCutIn.heroId)
        : '';

  const showVideo = Boolean(enableUltVideo && activeCutIn?.cutInVideo && !videoFailed);

  return (
    <div className="pointer-events-none fixed inset-0 z-50 overflow-hidden">
      {/* Silent Preloader for Deployed SSR Animated Ultimate Cut-Ins */}
      {preloadVideos.length > 0 && (
        <div className="hidden" aria-hidden="true">
          {preloadVideos.map((src) => (
            <video key={src} src={src} preload="auto" muted playsInline />
          ))}
        </div>
      )}

      {/* NON-BLOCKING ANIME SKILL CALLOUT STRIP (Slides smoothly on S1 / S2 casts!) */}
      {skillCallout && !activeCutIn && (
        <div
          key={skillCallout.id}
          className="absolute left-3 sm:left-5 top-[22%] sm:top-[20%] z-40 animate-skill-callout"
        >
          <div
            className="flex items-center gap-2.5 pr-5 pl-1.5 py-1.5 rounded-r-full rounded-l-full bg-slate-950/95 border-2 backdrop-blur-md shadow-[0_8px_28px_rgba(0,0,0,0.85)]"
            style={{
              borderColor: skillCallout.themeColor,
              boxShadow: `0 0 24px ${skillCallout.themeColor}66, 0 8px 24px rgba(0,0,0,0.85)`,
            }}
          >
            <div
              className="w-10 h-10 sm:w-12 sm:h-12 rounded-full overflow-hidden border-2 shrink-0 bg-slate-900"
              style={{ borderColor: skillCallout.themeColor }}
            >
              <img
                src={skillCallout.cardAsset}
                alt={skillCallout.heroName}
                className="w-full h-full object-cover object-top"
              />
            </div>
            <div className="leading-tight">
              <div
                className="text-[9px] sm:text-[10px] font-black uppercase tracking-[0.22em]"
                style={{ color: skillCallout.themeColor }}
              >
                {skillCallout.heroName} SKILL!
              </div>
              <div className="font-display text-sm sm:text-lg font-black uppercase tracking-wider text-white drop-shadow-[0_2px_6px_rgba(0,0,0,0.95)]">
                {skillCallout.skillName}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Phase 1: Dramatic Dark Freeze Vignette */}
      {activeCutIn && (
        <div
          className="absolute inset-0 transition-opacity duration-150"
          style={{
            background:
              'radial-gradient(circle at center, rgba(7,9,19,0.28) 0%, rgba(4,6,15,0.88) 100%)',
          }}
        />
      )}

      {/* Phase 2: Full-Width Dynamic 3-Layer Anime Panoramic / Animated Video Ultimate Cut-In */}
      {activeCutIn && activeCutIn.phase === 'CUTIN' && (
        <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 flex items-center justify-center">
          <div
            key={`${activeCutIn.heroId}_${activeCutIn.ultName}`}
            className={`relative w-[114vw] ${
              showVideo ? 'h-44 sm:h-60 md:h-[340px]' : 'h-36 sm:h-52 md:h-72'
            } overflow-hidden animate-cutin-slide border-y-4 shadow-[0_0_80px_rgba(0,0,0,0.96)]`}
            style={{
              borderColor: activeCutIn.themeColor,
              background: `linear-gradient(105deg, #070913 0%, ${activeCutIn.themeColor}55 44%, #0c1229 100%)`,
            }}
          >
            {/* Layer 1: Animated Diagonal Anime Speed-Lines */}
            <div
              className="absolute inset-0 opacity-45"
              style={{
                backgroundImage: `repeating-linear-gradient(-12deg, transparent, transparent 12px, ${activeCutIn.themeColor}66 12px, ${activeCutIn.themeColor}66 16px)`,
              }}
            />

            {/* Layer 2: 1080p Animated Sakuga Video (SSR) OR Panoramic Cut-In Artwork */}
            {showVideo ? (
              <video
                ref={videoRef}
                src={activeCutIn.cutInVideo}
                poster={imgSrc}
                autoPlay
                muted
                playsInline
                preload="auto"
                onError={() => setVideoFailed(true)}
                className="absolute inset-0 w-full h-full object-cover object-center opacity-100 scale-110 skew-x-[10deg]"
              />
            ) : (
              <img
                src={imgSrc}
                alt={activeCutIn.heroName}
                onError={() => setCutInFallback(true)}
                className="absolute inset-0 w-full h-full object-cover object-center opacity-95 scale-105 skew-x-[10deg]"
              />
            )}

            {/* Dramatic left-to-right readability gradient (lighter on video so animation shines!) */}
            <div
              className="absolute inset-0"
              style={{
                background: showVideo
                  ? 'linear-gradient(90deg, rgba(6,9,22,0.88) 0%, rgba(6,9,22,0.36) 44%, rgba(6,9,22,0.06) 100%)'
                  : 'linear-gradient(90deg, rgba(6,9,22,0.95) 0%, rgba(6,9,22,0.45) 50%, transparent 100%)',
              }}
            />

            {/* Layer 3: Sculpted Rarity Crest & Ultimate Skill Title */}
            <div className="relative z-10 h-full flex flex-col justify-center px-8 sm:px-20 md:px-24 skew-x-[10deg]">
              <div className="flex items-center gap-2 sm:gap-3 mb-1">
                <RarityCrest tier={activeCutIn.tier} size="sm" />
                <span className="text-[10px] sm:text-sm uppercase tracking-[0.18em] sm:tracking-[0.26em] text-amber-200 font-bold truncate">
                  {activeCutIn.heroName} — {activeCutIn.heroTitle}
                </span>
                {showVideo && (
                  <span className="hidden sm:inline-flex items-center px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-[0.2em] bg-amber-400/20 border border-amber-300/70 text-amber-200">
                    ✦ SSR ULTIMATE
                  </span>
                )}
              </div>
              <h2
                className="font-display text-2xl sm:text-5xl md:text-6xl font-black uppercase tracking-wider text-white drop-shadow-[0_4px_24px_rgba(0,0,0,0.95)] leading-tight"
                style={{ textShadow: `0 0 32px ${activeCutIn.themeColor}` }}
              >
                {activeCutIn.ultName}
              </h2>
            </div>
          </div>
        </div>
      )}

      {/* Phase 3: High-Contrast Manga Impact Frame (~70ms) */}
      {impactFlash && (
        <div className="absolute inset-0 bg-white mix-blend-difference opacity-95" />
      )}
    </div>
  );
};
