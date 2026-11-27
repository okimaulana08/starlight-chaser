import React, { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { FastForward, Sparkles, Swords } from 'lucide-react';
import { HERO_MAP } from '../data/heroes';
import { audioManager } from '../engine/AudioManager';
import type { ActiveBossBanter } from '../types/game';
import { ArtImage } from './ArtImage';
import { CornerFiligree } from './RpgKit';
import { RarityCrest, RoleBadge } from './RoleBadge';

interface BossBanterOverlayProps {
  banter: ActiveBossBanter;
  onComplete: () => void;
}

/**
 * Full-Screen Anime Visual Novel Pre-Boss Confrontation Banter Overlay.
 * Features dynamic left Hero vs right Chapter Boss standing portraits with active speaker spotlight,
 * smooth typewriter text reveal, 1-tap fast-forward/advance, and instant Skip button.
 */
export const BossBanterOverlay: React.FC<BossBanterOverlayProps> = ({ banter, onComplete }) => {
  const [lineIdx, setLineIdx] = useState(0);
  const [typedChars, setTypedChars] = useState(0);

  const hero = HERO_MAP[banter.heroId] ?? HERO_MAP.vaelen;
  const line = banter.lines[lineIdx] ?? banter.lines[0];
  const fullText = line?.text ?? '';
  const isTyping = typedChars < fullText.length;
  const isLastLine = lineIdx >= banter.lines.length - 1;
  const heroSpeaking = line?.speakerSide === 'HERO';

  useEffect(() => {
    setLineIdx(0);
    setTypedChars(0);
  }, [banter.id]);

  // Smooth typewriter reveal (20ms/char)
  useEffect(() => {
    if (!fullText) return;
    setTypedChars(0);
    let count = 0;
    const timer = window.setInterval(() => {
      count += 2;
      if (count >= fullText.length) {
        setTypedChars(fullText.length);
        window.clearInterval(timer);
      } else {
        setTypedChars(count);
      }
    }, 24);
    return () => window.clearInterval(timer);
  }, [lineIdx, fullText]);

  const handleAdvance = () => {
    if (isTyping) {
      setTypedChars(fullText.length);
      return;
    }
    audioManager.playSfx('button');
    if (isLastLine) {
      onComplete();
    } else {
      setLineIdx((i) => i + 1);
    }
  };

  const handleSkip = (e: React.MouseEvent) => {
    e.stopPropagation();
    audioManager.playSfx('button');
    onComplete();
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.24 }}
      onClick={handleAdvance}
      className="fixed inset-0 z-50 flex flex-col justify-between overflow-hidden select-none cursor-pointer bg-[#040612]/80 backdrop-blur-md"
    >
      {/* Dramatic Chapter Atmospheric Glow */}
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background: heroSpeaking
            ? `radial-gradient(circle at 26% 52%, ${hero.themeColor}38 0%, rgba(4,6,18,0.78) 58%, rgba(3,4,12,0.96) 100%)`
            : `radial-gradient(circle at 74% 52%, ${banter.accentColor}44 0%, rgba(120,16,48,0.22) 38%, rgba(4,6,18,0.95) 82%)`,
        }}
      />

      {/* TOP CINEMA LETTERBOX BAR + CHAPTER HEADER + SKIP */}
      <div className="relative z-30 flex items-center justify-between gap-2 px-4 sm:px-7 py-3 bg-gradient-to-b from-black/95 via-black/75 to-transparent border-b border-amber-300/20">
        <div className="flex items-center gap-2 min-w-0">
          <Swords className="w-4 h-4 text-amber-300 shrink-0" />
          <span className="font-display font-black text-[10px] sm:text-xs uppercase tracking-[0.26em] text-amber-200 truncate">
            {banter.chapterLabel}
          </span>
        </div>

        <button
          onClick={handleSkip}
          className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-slate-950/90 hover:bg-slate-900 border border-amber-300/45 hover:border-amber-300 text-[10px] sm:text-xs font-display font-extrabold uppercase tracking-[0.18em] text-slate-200 hover:text-amber-200 shadow-lg transition shrink-0"
        >
          <span>Skip Story</span>
          <FastForward className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* DUAL STANDING CHARACTER STAGE (Hero Left vs Boss Right) */}
      <div className="pointer-events-none relative z-10 flex-1 flex items-end justify-between px-2 sm:px-10 md:px-16 overflow-hidden -mb-14 sm:-mb-20">
        {/* LEFT: Active Squad Lead Hero */}
        <motion.div
          animate={{
            scale: heroSpeaking ? 1.04 : 0.92,
            x: heroSpeaking ? 10 : -14,
            opacity: heroSpeaking ? 1 : 0.62,
            filter: heroSpeaking
              ? `brightness(1.04) drop-shadow(0 18px 34px rgba(0,0,0,0.95)) drop-shadow(0 0 26px ${hero.themeColor}77)`
              : 'brightness(0.45) saturate(0.75) drop-shadow(0 16px 28px rgba(0,0,0,0.9))',
          }}
          transition={{ type: 'spring', stiffness: 240, damping: 24 }}
          className="relative h-[54dvh] sm:h-[74dvh] max-h-[620px] flex items-end justify-start"
        >
          <ArtImage
            kind="HERO"
            id={hero.id}
            src={hero.assets.standing}
            alt={hero.name}
            className="h-full w-auto max-w-[48vw] object-contain object-bottom"
          />
        </motion.div>

        {/* RIGHT: Chapter Boss Silhouette / Cutout */}
        <motion.div
          animate={{
            scale: !heroSpeaking ? 1.05 : 0.92,
            x: !heroSpeaking ? -10 : 14,
            opacity: !heroSpeaking ? 1 : 0.62,
            filter: !heroSpeaking
              ? `brightness(1.06) drop-shadow(0 18px 34px rgba(0,0,0,0.95)) drop-shadow(0 0 32px ${banter.accentColor}88)`
              : 'brightness(0.42) saturate(0.75) drop-shadow(0 16px 28px rgba(0,0,0,0.9))',
          }}
          transition={{ type: 'spring', stiffness: 240, damping: 24 }}
          className="relative h-[56dvh] sm:h-[76dvh] max-h-[640px] flex items-end justify-end"
        >
          <ArtImage
            kind="ENEMY"
            id={banter.bossName}
            src={banter.bossAsset}
            alt={banter.bossName}
            className="h-full w-auto max-w-[50vw] object-contain object-bottom"
          />
        </motion.div>
      </div>

      {/* BOTTOM SCULPTED ANIME VN DIALOGUE PLAQUE */}
      <div className="relative z-30 w-full max-w-4xl mx-auto px-3 sm:px-6 pb-4 sm:pb-7">
        <div
          className="relative rpg-panel px-4 sm:px-7 py-3.5 sm:py-5 border-2 shadow-[0_14px_45px_rgba(0,0,0,0.92)]"
          style={{
            borderColor: heroSpeaking ? `${hero.themeColor}aa` : `${banter.accentColor}bb`,
          }}
        >
          <CornerFiligree
            color={heroSpeaking ? hero.themeColor : banter.accentColor}
            size={9}
            opacity={0.75}
          />

          {/* Floating Speaker Nameplate Header */}
          <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
            <div className="flex items-center gap-2">
              {heroSpeaking ? (
                <>
                  <RarityCrest tier={hero.tier} size="xs" />
                  <RoleBadge role={hero.role} variant="medallion" size="sm" />
                </>
              ) : (
                <span className="px-2 py-0.5 rounded bg-rose-600 border border-rose-300/70 text-[9px] font-display font-black uppercase tracking-widest text-white">
                  BOSS
                </span>
              )}
              <span className="font-display font-black text-base sm:text-xl text-white tracking-wider text-glow-gold">
                {line.speakerName}
              </span>
              <span className="hidden sm:inline text-xs font-serif-italic italic text-cyan-200/90">
                — {line.speakerTitle}
              </span>
            </div>

            {/* Dialogue Progress Pips */}
            <div className="flex items-center gap-1.5">
              {banter.lines.map((_, idx) => (
                <span
                  key={idx}
                  className={`h-1.5 rounded-full transition-all ${
                    idx === lineIdx
                      ? 'w-5 bg-amber-300 shadow-[0_0_8px_rgba(253,224,71,0.9)]'
                      : idx < lineIdx
                        ? 'w-2 bg-amber-400/60'
                        : 'w-2 bg-slate-700'
                  }`}
                />
              ))}
            </div>
          </div>

          {/* Typewriter Dialogue Text */}
          <AnimatePresence mode="wait">
            <motion.p
              key={lineIdx}
              initial={{ opacity: 0.35 }}
              animate={{ opacity: 1 }}
              className="min-h-[3.2rem] sm:min-h-[3.6rem] text-sm sm:text-lg text-slate-100 leading-relaxed font-medium"
            >
              “{fullText.slice(0, typedChars)}”
              {isTyping && (
                <span className="inline-block w-1.5 h-4 ml-1 bg-amber-300 animate-pulse align-middle" />
              )}
            </motion.p>
          </AnimatePresence>

          {/* Footer Prompt */}
          <div className="mt-2 flex items-center justify-end gap-1.5 text-[10px] sm:text-xs font-display font-black uppercase tracking-[0.22em] text-amber-300 animate-pulse">
            <Sparkles className="w-3.5 h-3.5" />
            <span>
              {isTyping
                ? 'Tap to Complete'
                : isLastLine
                  ? 'Tap to Begin Battle →'
                  : 'Tap to Continue →'}
            </span>
          </div>
        </div>
      </div>
    </motion.div>
  );
};
