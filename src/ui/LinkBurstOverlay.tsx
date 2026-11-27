import React from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Sparkles, Zap } from 'lucide-react';
import { useCombatStore } from '../store/useCombatStore';
import { ArtImage } from './ArtImage';

/**
 * Theatrical Anime Dual-Hero Split-Screen Cut-In Banner when two different Chasers
 * chain Ultimates within the 5.5s Resonance Link Window ("STARLIGHT LINK BURST!").
 */
export const LinkBurstOverlay: React.FC = () => {
  const burst = useCombatStore((s) => s.activeLinkBurst);

  return (
    <AnimatePresence>
      {burst && (
        <motion.div
          key={burst.id}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.22 }}
          className="pointer-events-none fixed inset-0 z-[45] flex items-center justify-center overflow-hidden select-none"
        >
          {/* Radiant Edge Energy Flash */}
          <motion.div
            initial={{ opacity: 0.9 }}
            animate={{ opacity: 0.28 }}
            transition={{ duration: 0.5 }}
            className="absolute inset-0"
            style={{
              background: `linear-gradient(120deg, ${burst.heroAColor}44 0%, transparent 45%, transparent 55%, ${burst.heroBColor}44 100%)`,
            }}
          />

          {/* Diagonal Split-Screen Anime Clash Ribbon */}
          <motion.div
            initial={{ scaleY: 0.15, opacity: 0 }}
            animate={{ scaleY: 1, opacity: 1 }}
            exit={{ scaleY: 0.1, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 420, damping: 28 }}
            className="relative w-full h-36 sm:h-48 overflow-hidden border-y-2 border-amber-300/90 shadow-[0_0_70px_rgba(253,224,71,0.55)] bg-[#060918]/92"
          >
            {/* Left Hero Split Panel */}
            <motion.div
              initial={{ x: -90, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
              className="absolute inset-y-0 left-0 w-[56%] overflow-hidden"
              style={{
                clipPath: 'polygon(0 0, 100% 0, 86% 100%, 0 100%)',
                background: `linear-gradient(110deg, ${burst.heroAColor}55 0%, rgba(8,12,28,0.92) 75%)`,
              }}
            >
              <ArtImage
                kind="HERO"
                id={burst.heroAId}
                src={burst.heroACard}
                alt={burst.heroAName}
                className="w-full h-full object-cover object-top opacity-80 scale-110"
              />
              <div
                className="absolute inset-0"
                style={{
                  background: `linear-gradient(90deg, transparent 20%, rgba(5,8,20,0.82) 100%)`,
                }}
              />
            </motion.div>

            {/* Right Hero Split Panel */}
            <motion.div
              initial={{ x: 90, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
              className="absolute inset-y-0 right-0 w-[56%] overflow-hidden"
              style={{
                clipPath: 'polygon(14% 0, 100% 0, 100% 100%, 0 100%)',
                background: `linear-gradient(250deg, ${burst.heroBColor}55 0%, rgba(8,12,28,0.92) 75%)`,
              }}
            >
              <ArtImage
                kind="HERO"
                id={burst.heroBId}
                src={burst.heroBCard}
                alt={burst.heroBName}
                className="w-full h-full object-cover object-top opacity-80 scale-110"
              />
              <div
                className="absolute inset-0"
                style={{
                  background: `linear-gradient(270deg, transparent 20%, rgba(5,8,20,0.82) 100%)`,
                }}
              />
            </motion.div>

            {/* Blazing Central Diagonal Energy Slash */}
            <div
              className="absolute inset-y-0 left-1/2 -translate-x-1/2 w-2.5 rotate-[14deg] bg-gradient-to-b from-white via-amber-300 to-cyan-300 shadow-[0_0_28px_#fde047,0_0_54px_#38e8ff]"
            />

            {/* Speedline Sheen */}
            <div
              className="absolute inset-0 opacity-25"
              style={{
                background:
                  'repeating-linear-gradient(-12deg, transparent 0px 10px, rgba(255,255,255,0.45) 10px 12px)',
              }}
            />

            {/* Center Emblem & Clash Title */}
            <div className="relative z-10 w-full h-full flex flex-col items-center justify-center px-4 text-center">
              <motion.div
                initial={{ scale: 1.5, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ type: 'spring', stiffness: 460, damping: 24 }}
                className="flex items-center gap-2 px-3.5 py-0.5 rounded-full bg-slate-950/90 border border-amber-300/80 text-[10px] sm:text-xs font-display font-black uppercase tracking-[0.28em] text-amber-200 shadow-[0_0_22px_rgba(253,224,71,0.75)]"
              >
                <Sparkles className="w-3.5 h-3.5 text-amber-300" />
                <span>{burst.heroAName} × {burst.heroBName}</span>
                <Sparkles className="w-3.5 h-3.5 text-cyan-300" />
              </motion.div>

              <motion.div
                initial={{ scale: 1.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ type: 'spring', stiffness: 380, damping: 22, delay: 0.04 }}
                className="font-display text-2xl sm:text-5xl font-black uppercase tracking-[0.16em] text-white mt-1"
                style={{
                  textShadow:
                    '0 0 24px rgba(253,224,71,0.95), 0 0 46px rgba(56,232,255,0.8), 0 4px 14px rgba(0,0,0,0.95)',
                }}
              >
                STARLIGHT LINK BURST!
              </motion.div>

              <div className="mt-1.5 flex items-center gap-2.5 px-3 py-0.5 rounded-full bg-slate-950/85 border border-cyan-300/60 text-[10px] sm:text-xs font-mono font-black text-cyan-200">
                <span className="text-amber-300 flex items-center gap-1">
                  <Zap className="w-3 h-3 fill-amber-300" /> +35% RESONANCE NOVA
                </span>
                <span className="text-slate-500">•</span>
                <span>+{burst.breakDamage} BREAK</span>
                <span className="text-slate-500">•</span>
                <span className="text-emerald-300">+1.5 SP</span>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
