import React, { useState } from 'react';
import { Sparkles } from 'lucide-react';
import { HERO_MAP } from '../data/heroes';
import { audioManager } from '../engine/AudioManager';
import { ArtImage } from './ArtImage';
import { GameIcon } from './GameIcon';
import { StarlightBackdrop } from './StarlightBackdrop';

interface TitleScreenProps {
  onEnterLobby: () => void;
}

/**
 * Authentic Mobile Anime RPG Title / Splash Screen ("TAP ANYWHERE TO START").
 * Features the 4 SSR Flagship Champions standing ensemble, animated Aurelia sky,
 * gilded crest typography, and unlocks WebAudio cleanly on first tap.
 */
export const TitleScreen: React.FC<TitleScreenProps> = ({ onEnterLobby }) => {
  const [entering, setEntering] = useState(false);

  const handleStart = () => {
    if (entering) return;
    setEntering(true);
    audioManager.playSfx('ult_chime');
    audioManager.playBgm('lobby');
    window.setTimeout(() => {
      onEnterLobby();
    }, 360);
  };

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={handleStart}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') handleStart();
      }}
      className={`relative w-full h-full overflow-hidden select-none cursor-pointer transition-opacity duration-300 ${
        entering ? 'opacity-0 scale-105' : 'opacity-100 scale-100'
      }`}
    >
      {/* LAYER 0: Painted Aurelia Sky Backdrop + Floating Starlight Motes */}
      <StarlightBackdrop variant="LOBBY" accentColor="#f5c84c" />

      {/* Warm Celestial Radiance Behind Ensemble */}
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            'radial-gradient(circle at 50% 44%, rgba(245,200,76,0.24) 0%, rgba(56,232,255,0.12) 32%, rgba(5,7,18,0.82) 86%)',
        }}
      />

      {/* LAYER 1: 4 SSR Flagship Standing Cutout Key-Visual Ensemble */}
      <div className="pointer-events-none absolute inset-x-0 bottom-0 top-[8%] flex items-end justify-center overflow-hidden">
        {/* Far Left: Draven */}
        <div className="hidden sm:flex items-end h-[66dvh] md:h-[74dvh] max-h-[680px] -mr-20 md:-mr-24 opacity-90 translate-y-4">
          <ArtImage
            kind="HERO"
            id="draven"
            src={HERO_MAP.draven.assets.standing}
            alt="Draven"
            className="h-full w-auto object-contain object-bottom drop-shadow-[0_14px_30px_rgba(0,0,0,0.9)]"
          />
        </div>

        {/* Mid Left: Seraphina */}
        <div className="flex items-end h-[60dvh] sm:h-[74dvh] md:h-[82dvh] max-h-[760px] -mr-14 sm:-mr-16 md:-mr-20 opacity-95 translate-y-2 animate-breathe">
          <ArtImage
            kind="HERO"
            id="seraphina"
            src={HERO_MAP.seraphina.assets.standing}
            alt="Seraphina"
            className="h-full w-auto object-contain object-bottom drop-shadow-[0_14px_34px_rgba(56,232,255,0.35)]"
          />
        </div>

        {/* Center Heroic Lead: Vaelen */}
        <div className="relative z-10 flex items-end h-[68dvh] sm:h-[82dvh] md:h-[90dvh] max-h-[820px] animate-breathe">
          <ArtImage
            kind="HERO"
            id="vaelen"
            src={HERO_MAP.vaelen.assets.standing}
            alt="Vaelen"
            className="h-full w-auto object-contain object-bottom drop-shadow-[0_18px_40px_rgba(245,200,76,0.42)]"
          />
        </div>

        {/* Mid Right: Elara */}
        <div className="flex items-end h-[58dvh] sm:h-[72dvh] md:h-[80dvh] max-h-[740px] -ml-14 sm:-ml-16 md:-ml-20 opacity-95 translate-y-2 animate-breathe">
          <ArtImage
            kind="HERO"
            id="elara"
            src={HERO_MAP.elara.assets.standing}
            alt="Elara"
            className="h-full w-auto object-contain object-bottom drop-shadow-[0_14px_34px_rgba(52,211,153,0.35)]"
          />
        </div>
      </div>

      {/* Bottom Cinematic Contrast Veil for Title & Prompt */}
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-[56%] bg-gradient-to-t from-[#040612] via-[#040612]/80 to-transparent z-20" />

      {/* LAYER 2: Gilded Logo Crest + TAP ANYWHERE TO START */}
      <div className="relative z-30 w-full h-full flex flex-col justify-between items-center safe-area-pad py-4 sm:py-6 text-center">
        {/* Top Micro Version & Server Pill */}
        <div className="w-full flex items-center justify-between px-2 sm:px-4">
          <div className="rpg-panel-subtle px-2.5 py-1 flex items-center gap-1.5 text-[10px] font-bold tracking-widest uppercase text-cyan-200">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span>AETHERIA • GLOBAL</span>
          </div>
          <div className="rpg-panel-subtle px-2.5 py-1 text-[10px] font-mono text-slate-300">
            v1.0 PWA
          </div>
        </div>

        {/* Bottom Center Logo Emblem + Pulsing Prompt */}
        <div className="flex flex-col items-center gap-2 sm:gap-3 pb-2 sm:pb-5 max-w-2xl px-4">
          <div className="flex items-center gap-2 px-3 py-0.5 rounded-full bg-amber-400/15 border border-amber-300/50 text-amber-200 text-[9px] sm:text-[11px] font-black uppercase tracking-[0.28em]">
            <GameIcon name="summon" className="w-4 h-4" />
            <span>2.5D TACTICAL ANIME ACTION-RPG</span>
          </div>

          <h1 className="font-display text-3xl sm:text-5xl md:text-6xl font-black tracking-[0.16em] text-white text-glow-gold leading-none">
            STARLIGHT CHASERS
          </h1>

          <div className="flex items-center gap-3 w-full max-w-md">
            <div className="flex-1 h-px bg-gradient-to-r from-transparent via-amber-400/80 to-amber-300" />
            <span className="font-serif-italic italic text-xs sm:text-base tracking-[0.22em] text-cyan-200">
              Chase the Fallen Stars
            </span>
            <div className="flex-1 h-px bg-gradient-to-l from-transparent via-amber-400/80 to-amber-300" />
          </div>

          {/* Pulsing Mobile RPG Tap-To-Start Ribbon */}
          <div className="mt-2 sm:mt-4 px-7 sm:px-10 py-2 sm:py-2.5 rounded-full bg-gradient-to-r from-transparent via-slate-950/90 to-transparent border-y border-amber-300/60 flex items-center gap-2.5 animate-pulse shadow-[0_0_28px_rgba(245,200,76,0.35)]">
            <Sparkles className="w-4 h-4 text-amber-300" />
            <span className="font-display text-xs sm:text-base font-black uppercase tracking-[0.3em] text-amber-100">
              {entering ? 'ENTERING AURELIA BASTION...' : 'TAP ANYWHERE TO START'}
            </span>
            <Sparkles className="w-4 h-4 text-amber-300" />
          </div>
        </div>
      </div>
    </div>
  );
};
