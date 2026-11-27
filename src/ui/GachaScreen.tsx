import React, { useCallback, useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { ShoppingBag } from 'lucide-react';
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
import { RarityCrest } from './RoleBadge';
import { StarlightBackdrop } from './StarlightBackdrop';
import { SummonCinematic } from './SummonCinematic';
import { SummonResultsStage, SummonSpotlight } from './SummonShowcase';

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
  const [phase, setPhase] = useState<'IDLE' | 'CINEMATIC' | 'SPOTLIGHT' | 'REVEAL'>('IDLE');
  const [pendingResults, setPendingResults] = useState<GachaPullResult[]>([]);
  const [spotlightIndex, setSpotlightIndex] = useState(0);
  const [inspectedResult, setInspectedResult] = useState<GachaPullResult | null>(null);
  const [summonSeq, setSummonSeq] = useState(0);
  const [showSparkShop, setShowSparkShop] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [failedBgs, setFailedBgs] = useState<Record<string, boolean>>({});

  // Build spotlight showcase queue:
  // - 1× pull: always spotlight the pulled Hero or Relic directly
  // - 10× pull: spotlight every SSR (Hero & Relic); if none, spotlight the best/first new SR pull
  const spotlightQueue = useMemo<GachaPullResult[]>(() => {
    if (pendingResults.length === 0) return [];
    if (pendingResults.length === 1) return [pendingResults[0]];
    const ssrs = pendingResults.filter((r) => r.tier === 'SSR');
    if (ssrs.length > 0) return ssrs;
    const newSr = pendingResults.find((r) => r.tier === 'SR' && r.isNew);
    if (newSr) return [newSr];
    const anySr = pendingResults.find((r) => r.tier === 'SR');
    return anySr ? [anySr] : [];
  }, [pendingResults]);

  const currentSpotlight = spotlightQueue[spotlightIndex] ?? null;
  const isStandaloneSingle = pendingResults.length === 1;

  // Preload pulled SSR Heroes' 1080p Sakuga Cut-In MP4s silently while the 4.25s meteor cinematic plays!
  const preloadSsrVideos = useMemo(() => {
    const urls = new Set<string>();
    for (const r of pendingResults) {
      if (r.kind === 'HERO' && r.tier === 'SSR') {
        const vid = HERO_MAP[r.id]?.assets.cutInVideo;
        if (vid) urls.add(vid);
      }
    }
    return Array.from(urls);
  }, [pendingResults]);

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

  const handleSummon = useCallback(
    (count: 1 | 10) => {
      const out = pullBanner(banner, count);
      if (!out.ok) {
        setErrorMsg(out.error ?? 'Not enough Starlight Crystals.');
        setTimeout(() => setErrorMsg(null), 2600);
        return;
      }
      setPendingResults(out.results);
      setSpotlightIndex(0);
      setInspectedResult(null);
      setSummonSeq((s) => s + 1);
      setPhase('CINEMATIC');
    },
    [banner, pullBanner],
  );

  const handleCinematicComplete = useCallback(() => {
    if (spotlightQueue.length > 0) {
      setSpotlightIndex(0);
      setPhase('SPOTLIGHT');
    } else {
      setPhase('REVEAL');
    }
  }, [spotlightQueue.length]);

  const handleCinematicSkip = useCallback(() => {
    const hasSsr = pendingResults.some((r) => r.tier === 'SSR');
    if (hasSsr && spotlightQueue.length > 0) {
      setSpotlightIndex(0);
      setPhase('SPOTLIGHT');
    } else if (isStandaloneSingle && spotlightQueue.length > 0) {
      setSpotlightIndex(0);
      setPhase('SPOTLIGHT');
    } else {
      setPhase('REVEAL');
    }
  }, [isStandaloneSingle, pendingResults, spotlightQueue.length]);

  const handleSpotlightNext = useCallback(() => {
    if (isStandaloneSingle) {
      setPhase('IDLE');
      return;
    }
    if (spotlightIndex + 1 < spotlightQueue.length) {
      setSpotlightIndex((i) => i + 1);
    } else {
      setPhase('REVEAL');
    }
  }, [isStandaloneSingle, spotlightIndex, spotlightQueue.length]);

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
      {/* Base Celestial Fallback Layer */}
      <StarlightBackdrop variant="SUMMON" accentColor={banner.accentColor} />

      {/* Bespoke Full-Bleed Event Summon Background per Banner (Cross-fades smoothly!) */}
      <AnimatePresence mode="sync">
        {banner.backgroundAsset && !failedBgs[banner.id] && (
          <motion.div
            key={banner.id}
            initial={{ opacity: 0, scale: 1.04 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
            className="pointer-events-none absolute inset-0 z-[1] overflow-hidden"
          >
            <img
              src={banner.backgroundAsset}
              alt={banner.name}
              onError={() => setFailedBgs((prev) => ({ ...prev, [banner.id]: true }))}
              className="w-full h-full object-cover object-center"
              draggable={false}
            />
            {/* Balanced cinema veil: showcases vibrant event art behind heroes on left while keeping right console razor-crisp */}
            <div
              className="absolute inset-0"
              style={{
                background:
                  'linear-gradient(95deg, rgba(6,9,22,0.34) 0%, rgba(6,9,22,0.22) 44%, rgba(6,9,22,0.72) 78%, rgba(5,7,18,0.88) 100%)',
              }}
            />
            <div className="absolute inset-x-0 top-0 h-28 bg-gradient-to-b from-[#050712]/80 via-[#050712]/35 to-transparent" />
            <div className="absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-[#050712]/85 to-transparent" />
          </motion.div>
        )}
      </AnimatePresence>

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

      {/* SILENT PRELOADER FOR PULLED SSR HERO 1080P SAKUGA VIDEO CUT-INS */}
      {preloadSsrVideos.length > 0 && phase !== 'IDLE' && (
        <div className="hidden" aria-hidden="true">
          {preloadSsrVideos.map((src) => (
            <video key={src} src={src} preload="auto" muted playsInline />
          ))}
        </div>
      )}

      {/* ACT 1–3: FULL-ANIMATION 60 FPS CELESTIAL STARFALL SUMMON CINEMATIC */}
      <AnimatePresence>
        {phase === 'CINEMATIC' && (
          <SummonCinematic
            key={`cinematic_${summonSeq}`}
            results={pendingResults}
            highestTier={highestTier}
            bannerAccent={banner.accentColor}
            onComplete={handleCinematicComplete}
            onSkip={handleCinematicSkip}
          />
        )}
      </AnimatePresence>

      {/* ACT 4: FULL-SCREEN HERO / SSR VIDEO CUT-IN / RELIC SPOTLIGHT SHOWCASE */}
      <AnimatePresence>
        {phase === 'SPOTLIGHT' && currentSpotlight && (
          <SummonSpotlight
            key={`spotlight_${summonSeq}_${spotlightIndex}_${currentSpotlight.id}`}
            result={currentSpotlight}
            queueIndex={spotlightIndex}
            queueTotal={spotlightQueue.length}
            isStandaloneSingle={isStandaloneSingle}
            banner={banner}
            crystals={starlightCrystals}
            onNext={handleSpotlightNext}
            onSkipAll={() => setPhase(isStandaloneSingle ? 'IDLE' : 'REVEAL')}
            onSummonAgain={handleSummon}
          />
        )}
      </AnimatePresence>

      {/* ACT 5: 3D CARD-FLIP CASCADE RESULTS STAGE */}
      <AnimatePresence>
        {phase === 'REVEAL' && !inspectedResult && (
          <SummonResultsStage
            key={`results_${summonSeq}`}
            results={pendingResults}
            highestTier={highestTier}
            banner={banner}
            crystals={starlightCrystals}
            onConfirm={() => setPhase('IDLE')}
            onSummonAgain={handleSummon}
            onInspectResult={(res) => setInspectedResult(res)}
          />
        )}
      </AnimatePresence>

      {/* OPTIONAL CARD SHOWCASE REPLAY FROM RESULTS GRID */}
      <AnimatePresence>
        {phase === 'REVEAL' && inspectedResult && (
          <SummonSpotlight
            key={`replay_${inspectedResult.id}`}
            result={inspectedResult}
            queueIndex={0}
            queueTotal={1}
            isReplay
            banner={banner}
            crystals={starlightCrystals}
            onNext={() => setInspectedResult(null)}
            onSkipAll={() => setInspectedResult(null)}
          />
        )}
      </AnimatePresence>

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
