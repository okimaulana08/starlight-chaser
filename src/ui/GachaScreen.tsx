import React, { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { ShoppingBag, Sparkles, Star } from 'lucide-react';
import { HERO_BANNER, HERO_BANNER_NEW, RELIC_BANNER } from '../data/banners';
import { HERO_MAP } from '../data/heroes';
import { RELIC_MAP } from '../data/relics';
import { audioManager } from '../engine/AudioManager';
import { usePlayerStore } from '../store/usePlayerStore';
import { getSSRProbability } from '../systems/GachaSystem';
import type { GachaPullResult } from '../types/game';
import { ArtImage } from './ArtImage';
import { CollectibleCard } from './CollectibleCard';
import { GameIcon } from './GameIcon';
import {
  CornerFiligree,
  RpgBackButton,
  RpgButton,
  RpgProgressBar,
  RpgTabs,
} from './RpgKit';
import { RarityCrest, RoleBadge } from './RoleBadge';
import { StarlightBackdrop } from './StarlightBackdrop';

interface GachaScreenProps {
  onBack: () => void;
}

export const GachaScreen: React.FC<GachaScreenProps> = ({ onBack }) => {
  const {
    starlightCrystals,
    starlightTokens,
    pityCounterHero,
    pityCounterRelic,
    guaranteedFeaturedHero,
    guaranteedFeaturedRelic,
    pullBanner,
    sparkExchange,
  } = usePlayerStore();

  const [bannerTab, setBannerTab] = useState<'NEW_HERO' | 'HERO' | 'RELIC'>('NEW_HERO');
  const [phase, setPhase] = useState<'IDLE' | 'PRISM' | 'SPOTLIGHT' | 'REVEAL'>('IDLE');
  const [pendingResults, setPendingResults] = useState<GachaPullResult[]>([]);
  const [spotlightIndex, setSpotlightIndex] = useState(0);
  const [prismCracked, setPrismCracked] = useState(false);
  const [showSparkShop, setShowSparkShop] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const ssrHeroPulls = pendingResults.filter((r) => r.tier === 'SSR' && r.kind === 'HERO');
  const currentSpotlight = ssrHeroPulls[spotlightIndex] ?? null;

  const banner =
    bannerTab === 'NEW_HERO'
      ? HERO_BANNER_NEW
      : bannerTab === 'HERO'
        ? HERO_BANNER
        : RELIC_BANNER;
  const pity = bannerTab === 'RELIC' ? pityCounterRelic : pityCounterHero;
  const guaranteed = bannerTab === 'RELIC' ? guaranteedFeaturedRelic : guaranteedFeaturedHero;
  const nextSsrRate = getSSRProbability(pity, banner);

  const highestTier = pendingResults.some((r) => r.tier === 'SSR')
    ? 'SSR'
    : pendingResults.some((r) => r.tier === 'SR')
      ? 'SR'
      : 'R';

  const handleSummon = (count: 1 | 10) => {
    const out = pullBanner(banner, count);
    if (!out.ok) {
      setErrorMsg(out.error ?? 'Not enough Starlight Crystals.');
      setTimeout(() => setErrorMsg(null), 2600);
      return;
    }
    setPendingResults(out.results);
    setSpotlightIndex(0);
    setPrismCracked(false);
    setPhase('PRISM');
    audioManager.playSfx('ult_chime');
  };

  const handleCrackPrism = () => {
    if (prismCracked) return;
    setPrismCracked(true);
    audioManager.playSfx(highestTier === 'SSR' ? 'ssr_reveal' : 'prism_crack');
    const hasSsrHero = pendingResults.some((r) => r.tier === 'SSR' && r.kind === 'HERO');
    setTimeout(() => setPhase(hasSsrHero ? 'SPOTLIGHT' : 'REVEAL'), 720);
  };

  const featuredItems = banner.featuredIds.map((id) =>
    banner.type === 'HERO'
      ? {
          id,
          name: HERO_MAP[id].name,
          sub: HERO_MAP[id].title,
          card: HERO_MAP[id].assets.card,
          standing: HERO_MAP[id].assets.standing,
          themeColor: HERO_MAP[id].themeColor,
          tier: HERO_MAP[id].tier,
          role: HERO_MAP[id].role,
        }
      : {
          id,
          name: RELIC_MAP[id].name,
          sub: `${RELIC_MAP[id].preferredRole} Starlight Relic`,
          card: RELIC_MAP[id].assetCard,
          standing: RELIC_MAP[id].assetCard,
          themeColor: '#38e8ff',
          tier: RELIC_MAP[id].tier,
          role: RELIC_MAP[id].preferredRole,
        },
  );

  return (
    <div className="relative w-full h-full flex flex-col overflow-hidden select-none">
      <StarlightBackdrop variant="SUMMON" accentColor={banner.accentColor} />

      {/* FLOATING TOP CORNERS (Responsive Mobile & Desktop) */}
      <div className="relative z-20 flex flex-wrap items-center justify-between gap-2 px-3 sm:px-5 safe-top pb-2">
        <div className="flex items-center gap-2">
          <RpgBackButton onClick={onBack} />

          {/* Unified Celestial Sliding Banner Switcher */}
          <RpgTabs
            layoutId="gacha-banner-tabs"
            value={bannerTab}
            onChange={setBannerTab}
            items={[
              { key: 'NEW_HERO', label: 'New SSR', icon: 'summon', accent: 'gold' },
              { key: 'HERO', label: 'Eclipse', icon: 'heroes', accent: 'gold' },
              { key: 'RELIC', label: 'Relics', icon: 'relic', accent: 'cyan' },
            ]}
          />
        </div>

        <div className="flex items-center gap-1.5 sm:gap-2">
          <div className="rpg-panel-subtle px-2.5 sm:px-3.5 py-1.5 flex items-center gap-1.5 text-xs font-bold">
            <GameIcon name="crystal" className="w-4 h-4 sm:w-5 sm:h-5" />
            <span className="font-mono text-white">{starlightCrystals.toLocaleString()}</span>
          </div>
          <button
            onClick={() => setShowSparkShop(true)}
            className="rpg-panel-subtle hover:border-amber-400 px-2.5 sm:px-3.5 py-1.5 flex items-center gap-1 text-[11px] sm:text-xs font-extrabold uppercase text-amber-300"
          >
            <ShoppingBag className="w-3.5 h-3.5" />
            <span>{starlightTokens}/120</span>
          </button>
        </div>
      </div>

      {/* FULL-BLEED CELESTIAL SUMMON ALTAR STAGE (Side-by-Side on Mobile Landscape & Desktop!) */}
      <main className="relative z-10 flex-1 grid grid-cols-1 sm:grid-cols-12 items-center px-3 sm:px-5 safe-bottom gap-3 sm:gap-5 min-h-0 overflow-y-auto sm:overflow-hidden">
        {/* LEFT/CENTER: Full-Body Standing Hero Ensemble (HERO Banner) or Collectible Relics (RELIC Banner) */}
        <div className="sm:col-span-6 lg:col-span-7 relative flex items-end justify-center pt-1 sm:pt-0 h-[36dvh] sm:h-full">
          {banner.type === 'HERO' ? (
            <div className="relative flex items-end justify-center w-full h-full max-h-[600px]">
              {/* Dual Standing SSR Champions Over Celestial Summon Pedestal */}
              <div className="pointer-events-none absolute bottom-3 w-[82%] max-w-md h-14 rounded-full border-2 border-amber-300/45 bg-amber-400/10 blur-[1px] shadow-[0_0_40px_rgba(245,200,76,0.35)]" />
              {featuredItems.map((item, i) => (
                <div
                  key={item.id}
                  className={`relative flex flex-col items-center justify-end h-[92%] sm:h-[88%] ${
                    i === 0 ? 'z-20 -mr-10 sm:-mr-14' : 'z-10 -ml-6 sm:-ml-10 opacity-95'
                  }`}
                >
                  <div
                    className="pointer-events-none absolute bottom-[22%] w-40 sm:w-56 h-40 sm:h-56 rounded-full blur-3xl opacity-35"
                    style={{ background: item.themeColor }}
                  />
                  <ArtImage
                    kind="HERO"
                    id={item.id}
                    src={item.standing}
                    alt={item.name}
                    className="relative h-full w-auto max-w-[46vw] sm:max-w-[30vw] object-contain object-bottom animate-breathe"
                    style={{
                      filter: `drop-shadow(0 16px 28px rgba(4,6,16,0.92)) drop-shadow(0 0 18px ${item.themeColor}55)`,
                    }}
                  />
                  {/* Floating SSR Rate-Up Nameplate */}
                  <div className="relative z-30 -mt-6 px-3 py-1 rounded-full bg-slate-950/90 border border-amber-300/60 backdrop-blur-md flex items-center gap-1.5 shadow-xl">
                    <RarityCrest tier={item.tier} size="xs" />
                    <span className="font-display font-black text-xs sm:text-sm text-white tracking-wider">
                      {item.name}
                    </span>
                    <span className="hidden md:inline text-[9px] font-black uppercase text-amber-300">
                      ★ RATE-UP
                    </span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="relative flex items-end justify-center gap-2.5 sm:gap-4 md:gap-6 my-auto">
              {featuredItems.map((item, i) => (
                <div
                  key={item.id}
                  className={`w-36 sm:w-36 md:w-52 lg:w-64 transition-transform duration-500 ${
                    i === 0 ? '-translate-y-1 sm:-translate-y-2' : 'translate-y-1.5 sm:translate-y-3'
                  }`}
                >
                  <CollectibleCard
                    kind={banner.type}
                    id={item.id}
                    src={item.card}
                    name={item.name}
                    subtitle={item.sub}
                    tier={item.tier}
                    role={item.role}
                    topBannerLabel="★ RATE-UP"
                  />
                </div>
              ))}
            </div>
          )}
        </div>

        {/* RIGHT: Sculpted Summon Altar Console */}
        <div className="relative sm:col-span-6 lg:col-span-5 rpg-panel p-3 sm:p-4 md:p-6 flex flex-col gap-2.5 sm:gap-3.5 border-amber-400/40 max-h-full overflow-y-auto">
          <CornerFiligree color={banner.accentColor} size={10} opacity={0.6} />
          <div>
            <div
              className="text-[9px] sm:text-[10px] font-display font-black uppercase tracking-[0.24em]"
              style={{ color: banner.accentColor }}
            >
              {banner.type === 'HERO' ? 'STARLIGHT RESONANCE BANNER' : 'ANCIENT RELIC ALTAR'}
            </div>
            <h1 className="font-display text-xl sm:text-2xl md:text-4xl font-black text-white text-glow-gold mt-0.5 leading-tight">
              {banner.name}
            </h1>
            <p className="ls-hide text-xs text-slate-300 mt-1">{banner.subtitle}</p>
          </div>

          {/* Sculpted Crystalline Pity & Rate Readout */}
          <div className="rpg-ornate-card p-3.5 space-y-2.5 overflow-hidden">
            <CornerFiligree color={banner.accentColor} size={7} opacity={0.55} />
            <div className="flex items-center justify-between text-xs">
              <span className="font-display text-slate-300 uppercase tracking-[0.16em] text-[10px] font-bold">
                SSR Pity Counter
              </span>
              <span className="font-mono font-bold text-sm text-white">
                <span className="text-amber-300">{pity}</span> / {banner.hardPity}{' '}
                <span className="text-slate-400 text-[11px] font-sans">(Soft @{banner.softPity})</span>
              </span>
            </div>

            <RpgProgressBar
              value={pity}
              max={banner.hardPity}
              heightClass="h-3.5"
              milestonePct={(banner.softPity / banner.hardPity) * 100}
              milestoneLabel={`Soft Pity starts at ${banner.softPity}`}
            />

            <div className="flex items-center justify-between text-xs">
              <span className="font-mono text-amber-300 font-bold">
                SSR Rate: {(nextSsrRate * 100).toFixed(1)}%
              </span>
              <span
                className={`px-2 py-0.5 rounded-full text-[10px] font-display font-black uppercase tracking-wider border ${
                  guaranteed
                    ? 'bg-emerald-500/15 border-emerald-400/50 text-emerald-300'
                    : 'bg-cyan-500/15 border-cyan-400/45 text-cyan-200'
                }`}
              >
                {guaranteed ? '★ 100% Featured' : '50/50 Featured Rate-Up'}
              </span>
            </div>
          </div>

          <div className="text-[11px] text-slate-400 leading-relaxed">
            Base: <strong className="text-amber-300">SSR 2.5%</strong> •{' '}
            <strong className="text-fuchsia-300">SR 17.5%</strong> •{' '}
            <strong className="text-sky-300">R 80%</strong>. Every pull awards +1 Starlight Token.
            10× guarantees SR+.
          </div>

          {errorMsg && (
            <div className="text-xs font-bold text-rose-300 bg-rose-950/70 border border-rose-500/50 px-3 py-2">
              {errorMsg}
            </div>
          )}

          {/* Heroic Angled Summon Triggers */}
          <div className="grid grid-cols-2 gap-2.5 sm:gap-3 pt-0.5">
            <button
              onClick={() => handleSummon(1)}
              className="rpg-blade py-2.5 sm:py-3.5 px-3 sm:px-4 text-center flex flex-col items-center justify-center"
              style={{ borderLeftColor: '#38e8ff' }}
            >
              <span className="font-display font-extrabold text-xs sm:text-sm text-white uppercase tracking-wider">
                1× Summon
              </span>
              <span className="text-[10px] sm:text-[11px] font-mono text-cyan-300 mt-0.5">160 Crystals</span>
            </button>
            <button
              onClick={() => handleSummon(10)}
              className="rpg-battle-cta py-2.5 sm:py-3.5 px-3 sm:px-4 text-slate-950 flex flex-col items-center justify-center"
            >
              <span className="font-display font-black text-xs sm:text-sm uppercase tracking-wider flex items-center gap-1.5">
                <GameIcon name="summon" className="w-4 h-4 sm:w-5 sm:h-5" /> 10× Summon
              </span>
              <span className="text-[10px] sm:text-[11px] font-mono font-bold text-amber-950 mt-0.5">
                1,600 Crystals
              </span>
            </button>
          </div>
        </div>
      </main>

      {/* COSMIC FALLING STAR / METEOR SUMMON RITUAL */}
      {phase === 'PRISM' && (
        <div className="fixed inset-0 z-50 bg-[#030510]/96 backdrop-blur-md flex flex-col items-center justify-center p-6 overflow-hidden">
          {/* Cosmic Sky Radial Glow colored by highest pulled rarity */}
          <div
            className="pointer-events-none absolute inset-0 transition-all duration-500"
            style={{
              background:
                highestTier === 'SSR'
                  ? 'radial-gradient(circle at 50% 45%, rgba(253,224,71,0.34) 0%, rgba(244,114,182,0.18) 38%, rgba(4,6,18,0.98) 78%)'
                  : highestTier === 'SR'
                    ? 'radial-gradient(circle at 50% 45%, rgba(192,132,252,0.34) 0%, rgba(99,102,241,0.16) 40%, rgba(4,6,18,0.98) 78%)'
                    : 'radial-gradient(circle at 50% 45%, rgba(56,232,255,0.28) 0%, rgba(29,78,216,0.14) 40%, rgba(4,6,18,0.98) 78%)',
            }}
          />

          {/* Plunging Diagonal Shooting Star / Meteor Comet Trail! */}
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center overflow-hidden">
            <div className="animate-gacha-meteor flex items-center">
              <div
                className="w-64 sm:w-96 h-2.5 sm:h-3.5 rounded-full blur-[1px]"
                style={{
                  background:
                    highestTier === 'SSR'
                      ? 'linear-gradient(90deg, #ffffff 0%, #fde047 25%, #f472b6 60%, transparent 100%)'
                      : highestTier === 'SR'
                        ? 'linear-gradient(90deg, #ffffff 0%, #d8b4fe 30%, #9333ea 65%, transparent 100%)'
                        : 'linear-gradient(90deg, #ffffff 0%, #7dd3fc 30%, #0284c7 65%, transparent 100%)',
                }}
              />
            </div>
          </div>

          <div className="relative z-10 font-display text-xs sm:text-base uppercase tracking-[0.34em] text-amber-200 font-black mb-6 text-center drop-shadow">
            {prismCracked
              ? highestTier === 'SSR'
                ? '★ CELESTIAL SSR STARFALL!! ★'
                : 'STARLIGHT RESONANCE UNLEASHED!'
              : 'TAP THE FALLEN STAR TO SUMMON'}
          </div>

          {/* Interactive Radiant Astrolabe Core */}
          <button
            onClick={handleCrackPrism}
            className={`relative z-10 w-52 h-52 sm:w-64 sm:h-64 flex items-center justify-center transition-all duration-500 cursor-pointer ${
              prismCracked ? 'scale-150 opacity-0' : 'hover:scale-105'
            }`}
          >
            {/* Outer Spinning Astrolabe Ring */}
            <div
              className="absolute inset-0 rounded-full border-2 border-dashed animate-spin"
              style={{
                animationDuration: '9s',
                borderColor:
                  highestTier === 'SSR'
                    ? '#fde047'
                    : highestTier === 'SR'
                      ? '#c084fc'
                      : '#38e8ff',
              }}
            />
            {/* Counter-Spinning Inner Constellation Ring */}
            <div
              className="absolute inset-5 rounded-full border-2 animate-spin"
              style={{
                animationDuration: '6s',
                animationDirection: 'reverse',
                borderColor:
                  highestTier === 'SSR'
                    ? 'rgba(244,114,182,0.85)'
                    : highestTier === 'SR'
                      ? 'rgba(168,85,247,0.8)'
                      : 'rgba(56,189,248,0.8)',
              }}
            />
            {/* Blazing Starlight Core Orb */}
            <div
              className="w-28 h-28 sm:w-32 sm:h-32 rounded-full flex items-center justify-center border-4 border-white/90 animate-pulse"
              style={{
                background:
                  highestTier === 'SSR'
                    ? 'radial-gradient(circle, #ffffff 0%, #fde047 38%, #f472b6 76%, #7c3aed 100%)'
                    : highestTier === 'SR'
                      ? 'radial-gradient(circle, #ffffff 0%, #e879f9 42%, #7e22ce 100%)'
                      : 'radial-gradient(circle, #ffffff 0%, #7dd3fc 42%, #1d4ed8 100%)',
                boxShadow:
                  highestTier === 'SSR'
                    ? '0 0 90px rgba(253,224,71,0.98), 0 0 140px rgba(244,114,182,0.7)'
                    : highestTier === 'SR'
                      ? '0 0 80px rgba(192,132,252,0.95)'
                      : '0 0 70px rgba(56,232,255,0.9)',
              }}
            >
              <Star className="w-12 h-12 sm:w-14 sm:h-14 text-white fill-white drop-shadow-[0_0_16px_rgba(255,255,255,1)]" />
            </div>
          </button>

          {/* Full-Screen Flash Burst upon Shatter */}
          {prismCracked && (
            <div className="pointer-events-none fixed inset-0 z-20 bg-white animate-pulse opacity-85" />
          )}

          <button
            onClick={() => setPhase('REVEAL')}
            className="relative z-10 mt-8 px-4 py-1.5 rounded-full bg-slate-950/75 border border-slate-700 text-xs uppercase tracking-widest text-slate-300 hover:text-amber-300"
          >
            Skip Animation →
          </button>
        </div>
      )}

      {/* FULL-SCREEN SSR HERO STANDING SPOTLIGHT REVEAL! */}
      {phase === 'SPOTLIGHT' && currentSpotlight && (() => {
        const ssrHero = HERO_MAP[currentSpotlight.id];
        if (!ssrHero) return null;
        return (
          <div
            onClick={() => {
              if (spotlightIndex + 1 < ssrHeroPulls.length) {
                setSpotlightIndex((i) => i + 1);
                audioManager.playSfx('ssr_reveal');
              } else {
                setPhase('REVEAL');
              }
            }}
            className="fixed inset-0 z-50 bg-[#050714] flex flex-col sm:flex-row items-center justify-center p-4 sm:p-10 cursor-pointer overflow-hidden select-none"
          >
            {/* Rotating Golden Sunburst Light Rays */}
            <div
              className="pointer-events-none absolute w-[1100px] h-[1100px] opacity-25 animate-spin"
              style={{
                animationDuration: '30s',
                background:
                  'repeating-conic-gradient(from 0deg, rgba(253,224,71,0.65) 0deg 8deg, transparent 8deg 24deg)',
              }}
            />
            <div
              className="pointer-events-none absolute inset-0"
              style={{
                background: `radial-gradient(circle at 42% 50%, ${ssrHero.themeColor}44 0%, rgba(5,7,18,0.92) 72%)`,
              }}
            />

            {/* Full-Body Standing Cutout Spotlight */}
            <div className="relative z-10 h-[52dvh] sm:h-[82dvh] max-h-[720px] flex items-end justify-center animate-screen-in">
              <ArtImage
                kind="HERO"
                id={ssrHero.id}
                src={ssrHero.assets.standing}
                alt={ssrHero.name}
                className="h-full w-auto object-contain object-bottom"
                style={{
                  filter: `drop-shadow(0 20px 42px rgba(0,0,0,0.95)) drop-shadow(0 0 36px ${ssrHero.themeColor}88)`,
                }}
              />
            </div>

            {/* Hero Lore / Crest Spotlight Plaque */}
            <div className="relative z-10 sm:ml-6 max-w-md text-center sm:text-left mt-2 sm:mt-0 space-y-2">
              <div className="flex items-center justify-center sm:justify-start gap-2">
                <RarityCrest tier="SSR" size="md" />
                <RoleBadge role={ssrHero.role} variant="pill" size="md" />
                {currentSpotlight.isNew && (
                  <span className="px-2.5 py-0.5 rounded-full bg-amber-400 text-slate-950 font-black text-[10px] uppercase tracking-widest">
                    NEW HERO!
                  </span>
                )}
              </div>
              <h2 className="font-display text-4xl sm:text-6xl font-black text-white text-glow-gold leading-none">
                {ssrHero.name}
              </h2>
              <div className="text-sm sm:text-base font-serif-italic italic text-cyan-200 tracking-wider">
                {ssrHero.title}
              </div>
              <p className="text-xs sm:text-sm text-slate-200 italic bg-slate-950/75 border-l-4 border-amber-400 px-3.5 py-2.5">
                "{ssrHero.quote}"
              </p>
              <div className="pt-2 flex items-center justify-center sm:justify-start gap-2 text-amber-300 text-xs font-black uppercase tracking-[0.24em] animate-pulse">
                <Sparkles className="w-4 h-4" />
                <span>Tap Anywhere to Continue →</span>
              </div>
            </div>

            <button
              onClick={(e) => {
                e.stopPropagation();
                setPhase('REVEAL');
              }}
              className="absolute top-4 right-4 z-20 px-3.5 py-1.5 rounded-full bg-slate-950/80 border border-slate-700 text-xs uppercase tracking-widest text-slate-300 hover:text-amber-300"
            >
              Skip →
            </button>
          </div>
        );
      })()}

      {/* SUMMON REVEAL STAGE */}
      {phase === 'REVEAL' && (
        <div className="fixed inset-0 z-50 bg-[#040610]/95 backdrop-blur-md flex flex-col items-center justify-center p-4 overflow-y-auto">
          <h2 className="font-display text-3xl font-black text-white tracking-[0.2em] text-glow-gold mb-1">
            SUMMON RESULTS
          </h2>
          {highestTier === 'SSR' && (
            <div className="text-xs font-black uppercase tracking-[0.28em] text-amber-300 mb-4 animate-pulse">
              ★ CELESTIAL SSR RESONANCE ACHIEVED ★
            </div>
          )}

          <div
            className={`grid gap-3 my-4 w-full max-w-5xl [perspective:1000px] ${
              pendingResults.length === 1 ? 'grid-cols-1 max-w-xs' : 'grid-cols-2 sm:grid-cols-5'
            }`}
          >
            {pendingResults.map((res, idx) => {
              const role =
                res.kind === 'HERO'
                  ? HERO_MAP[res.id]?.role
                  : RELIC_MAP[res.id]?.preferredRole;
              const sub =
                res.kind === 'HERO'
                  ? HERO_MAP[res.id]?.title
                  : `${RELIC_MAP[res.id]?.preferredRole ?? ''} Relic`;
              return (
                <motion.div
                  key={`${res.id}_${idx}`}
                  initial={{ opacity: 0, rotateY: 85, scale: 0.78, y: 18 }}
                  animate={{ opacity: 1, rotateY: 0, scale: 1, y: 0 }}
                  transition={{
                    type: 'spring',
                    stiffness: res.tier === 'SSR' ? 260 : 340,
                    damping: 22,
                    delay: idx * 0.07,
                  }}
                >
                  <CollectibleCard
                    kind={res.kind}
                    id={res.id}
                    src={res.assetCard}
                    name={res.name}
                    subtitle={pendingResults.length === 1 ? sub : undefined}
                    tier={res.tier}
                    role={role}
                    isNew={res.isNew}
                    compact={pendingResults.length > 1}
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

          <button
            onClick={() => setPhase('IDLE')}
            className="rpg-battle-cta mt-2 px-10 py-3 text-slate-950 font-display font-black text-sm uppercase tracking-[0.2em]"
          >
            Confirm
          </button>
        </div>
      )}

      {/* SPARK EXCHANGE MODAL */}
      <AnimatePresence>
      {showSparkShop && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4"
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.92, y: 14 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.94, y: 10 }}
            transition={{ type: 'spring', stiffness: 360, damping: 28 }}
            className="relative rpg-panel p-6 max-w-3xl w-full max-h-[85vh] overflow-y-auto border-amber-400/50"
          >
            <CornerFiligree color="#f5c84c" size={10} opacity={0.65} />
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="font-display text-2xl font-black text-white tracking-wider">
                  STARLIGHT SPARK EXCHANGE
                </h3>
                <p className="text-xs text-slate-300">
                  Redeem 120 Starlight Tokens for any SSR Hero or Relic (Balance:{' '}
                  <span className="text-amber-300 font-mono font-bold text-sm">{starlightTokens}</span>)
                </p>
              </div>
              <RpgButton variant="slate" size="sm" onClick={() => setShowSparkShop(false)}>
                Close
              </RpgButton>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
              {HERO_BANNER.poolSSR.map((hid) => {
                const h = HERO_MAP[hid];
                return (
                  <div key={hid} className="flex flex-col gap-1.5">
                    <CollectibleCard
                      kind="HERO"
                      id={hid}
                      src={h.assets.card}
                      name={h.name}
                      subtitle={h.title}
                      tier={h.tier}
                      role={h.role}
                      compact
                      interactive={false}
                    />
                    <RpgButton
                      variant="gold"
                      size="xs"
                      disabled={starlightTokens < 120}
                      onClick={() => {
                        if (sparkExchange('HERO', hid)) audioManager.playSfx('ssr_reveal');
                      }}
                      className="w-full font-display font-black uppercase tracking-wider"
                    >
                      Exchange 120
                    </RpgButton>
                  </div>
                );
              })}

              {RELIC_BANNER.poolSSR.map((rid) => {
                const r = RELIC_MAP[rid];
                return (
                  <div key={rid} className="flex flex-col gap-1.5">
                    <CollectibleCard
                      kind="RELIC"
                      id={rid}
                      src={r.assetCard}
                      name={r.name}
                      tier={r.tier}
                      role={r.preferredRole}
                      compact
                      interactive={false}
                    />
                    <RpgButton
                      variant="cyan"
                      size="xs"
                      disabled={starlightTokens < 120}
                      onClick={() => {
                        if (sparkExchange('RELIC', rid)) audioManager.playSfx('ssr_reveal');
                      }}
                      className="w-full font-display font-black uppercase tracking-wider"
                    >
                      Exchange 120
                    </RpgButton>
                  </div>
                );
              })}
            </div>
          </motion.div>
        </motion.div>
      )}
      </AnimatePresence>
    </div>
  );
};
