import React, { useCallback, useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { ShoppingBag } from 'lucide-react';
import {
  EVENT_HERO_BANNERS,
  HERO_BANNER_STANDARD,
  PET_BANNER,
  RELIC_BANNER,
} from '../data/banners';
import { HEROES, HERO_MAP } from '../data/heroes';
import { PET_MAP } from '../data/pets';
import { RELIC_MAP } from '../data/relics';
import { audioManager } from '../engine/AudioManager';
import { usePlayerStore } from '../store/usePlayerStore';
import { getSSRProbability, getURProbability, isURBanner } from '../systems/GachaSystem';
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
import { SUMMON_POSTER_SRC, SUMMON_VIDEO_SRC, SummonCinematic } from './SummonCinematic';
import { SummonResultsStage, SummonSpotlight } from './SummonShowcase';

export type SummonMainTab = 'EVENT' | 'HERO' | 'PET' | 'RELIC';

interface GachaScreenProps {
  initialTab?: SummonMainTab;
  onBack: () => void;
}

export const GachaScreen: React.FC<GachaScreenProps> = ({ initialTab = 'EVENT', onBack }) => {
  const {
    starlightCrystals,
    starlightTokens,
    pityCounterUR,
    pityCounterHero,
    pityCounterRelic,
    pityCounterPet,
    guaranteedFeaturedUR,
    guaranteedFeaturedHero,
    guaranteedFeaturedRelic,
    guaranteedFeaturedPet,
    pullBanner,
    sparkExchange,
  } = usePlayerStore();

  const [mainTab, setMainTab] = useState<SummonMainTab>(initialTab);
  const [activeEventId, setActiveEventId] = useState<string>(EVENT_HERO_BANNERS[0].id);
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
  // - 10× pull: spotlight every UR & SSR (UR first!); if none, spotlight the best/first new SR pull
  const spotlightQueue = useMemo<GachaPullResult[]>(() => {
    if (pendingResults.length === 0) return [];
    if (pendingResults.length === 1) return [pendingResults[0]];
    const highTiers = pendingResults
      .filter((r) => r.tier === 'UR' || r.tier === 'SSR')
      .sort((a, b) => (a.tier === 'UR' ? -1 : b.tier === 'UR' ? 1 : 0));
    if (highTiers.length > 0) return highTiers;
    const newSr = pendingResults.find((r) => r.tier === 'SR' && r.isNew);
    if (newSr) return [newSr];
    const anySr = pendingResults.find((r) => r.tier === 'SR');
    return anySr ? [anySr] : [];
  }, [pendingResults]);

  const currentSpotlight = spotlightQueue[spotlightIndex] ?? null;
  const isStandaloneSingle = pendingResults.length === 1;

  // Preload pulled UR & SSR Heroes' 1080p Sakuga Cut-In MP4s silently while the meteor cinematic plays!
  const preloadSsrVideos = useMemo(() => {
    const urls = new Set<string>();
    for (const r of pendingResults) {
      if (r.kind === 'HERO' && (r.tier === 'UR' || r.tier === 'SSR')) {
        const vid = HERO_MAP[r.id]?.assets.cutInVideo;
        if (vid) urls.add(vid);
      }
    }
    return Array.from(urls);
  }, [pendingResults]);

  const activeEventBanner =
    EVENT_HERO_BANNERS.find((b) => b.id === activeEventId) ?? EVENT_HERO_BANNERS[0];

  const banner =
    mainTab === 'EVENT'
      ? activeEventBanner
      : mainTab === 'HERO'
        ? HERO_BANNER_STANDARD
        : mainTab === 'PET'
          ? PET_BANNER
          : RELIC_BANNER;

  const isUrEvent = isURBanner(banner);
  const isPetBanner = banner.type === 'PET';
  const isStandardHeroBanner = Boolean(banner.isStandardPool);
  const pity = isUrEvent
    ? (pityCounterUR ?? 0)
    : isPetBanner
      ? (pityCounterPet ?? 0)
      : mainTab === 'RELIC'
        ? pityCounterRelic
        : pityCounterHero;
  const guaranteed = isUrEvent
    ? Boolean(guaranteedFeaturedUR)
    : isPetBanner
      ? Boolean(guaranteedFeaturedPet)
      : mainTab === 'RELIC'
        ? guaranteedFeaturedRelic
        : guaranteedFeaturedHero;
  const nextUrRate = getURProbability(pity, banner);
  const nextSsrRate = getSSRProbability(pity, banner);

  const sparkUrHeroes = useMemo(() => HEROES.filter((h) => h.tier === 'UR'), []);
  const sparkSsrHeroes = useMemo(() => HEROES.filter((h) => h.tier === 'SSR'), []);

  const excludedEventNames = useMemo(
    () => (banner.excludedEventHeroIds ?? []).map((id) => HERO_MAP[id]?.name ?? id),
    [banner.excludedEventHeroIds],
  );

  const highestTier = pendingResults.some((r) => r.tier === 'UR')
    ? 'UR'
    : pendingResults.some((r) => r.tier === 'SSR')
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
    const hasHigh = pendingResults.some((r) => r.tier === 'UR' || r.tier === 'SSR');
    if (hasHigh && spotlightQueue.length > 0) {
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
      : banner.type === 'PET'
        ? {
            id,
            name: PET_MAP[id].name,
            sub: PET_MAP[id].title,
            card: PET_MAP[id].assets.card,
            standing: PET_MAP[id].assets.sprite,
            themeColor: PET_MAP[id].themeColor,
            tier: PET_MAP[id].tier,
            role: undefined,
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
      <div className="relative z-20 flex flex-wrap items-center justify-between gap-2 px-3 sm:px-5 safe-top pb-1.5">
        <div className="flex items-center gap-2 overflow-x-auto max-w-full">
          <RpgBackButton onClick={onBack} />

          {/* Unified Celestial Sliding Main Summon Switcher */}
          <RpgTabs
            layoutId="gacha-main-tabs"
            value={mainTab}
            onChange={setMainTab}
            items={[
              { key: 'EVENT', label: '✦ Event', icon: 'summon', accent: 'gold' },
              { key: 'HERO', label: 'Hero Summon', icon: 'heroes', accent: 'gold' },
              { key: 'PET', label: '🐾 Pets', icon: 'summon', accent: 'cyan' },
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

      {/* EVENT SUB-TABS RIBBON (Shown when mainTab === 'EVENT') */}
      {mainTab === 'EVENT' && (
        <div className="relative z-20 px-3 sm:px-5 pb-1.5 flex items-center gap-2 overflow-x-auto">
          <div className="inline-flex items-center gap-1.5 p-1 rounded-full bg-slate-950/80 border border-white/15 backdrop-blur-md shadow-[0_8px_24px_rgba(0,0,0,0.6)]">
            {EVENT_HERO_BANNERS.map((ev) => {
              const selected = ev.id === activeEventBanner.id;
              const evIsUr = isURBanner(ev);
              return (
                <button
                  key={ev.id}
                  type="button"
                  onClick={() => {
                    audioManager.playSfx('button');
                    setActiveEventId(ev.id);
                  }}
                  className={`relative px-3 sm:px-4 py-1.5 rounded-full text-[11px] sm:text-xs font-display font-black uppercase tracking-wider transition flex items-center gap-1.5 shrink-0 ${
                    selected
                      ? evIsUr
                        ? 'bg-gradient-to-r from-fuchsia-500/85 via-purple-500/85 to-amber-400/85 text-white shadow-[0_0_18px_rgba(232,121,249,0.55)] border border-white/60'
                        : 'bg-gradient-to-r from-emerald-500/85 to-teal-400/85 text-slate-950 shadow-[0_0_18px_rgba(52,211,153,0.45)] border border-emerald-200/80'
                      : 'text-slate-300 hover:text-white hover:bg-white/5 border border-transparent'
                  }`}
                >
                  <span>{ev.eventSubTabLabel ?? ev.name}</span>
                  <span
                    className={`px-1.5 py-0.5 rounded-full text-[8px] font-black tracking-widest ${
                      selected
                        ? evIsUr
                          ? 'bg-slate-950/60 text-amber-200'
                          : 'bg-slate-950/75 text-emerald-200'
                        : evIsUr
                          ? 'bg-fuchsia-500/20 text-fuchsia-300'
                          : 'bg-emerald-500/20 text-emerald-300'
                    }`}
                  >
                    {evIsUr ? 'UR' : 'SSR'}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* FULL-BLEED CELESTIAL SUMMON ALTAR STAGE (Side-by-Side on Mobile Landscape & Desktop!) */}
      <main className="relative z-10 flex-1 grid grid-cols-1 sm:grid-cols-12 items-center px-3 sm:px-5 safe-bottom gap-3 sm:gap-5 min-h-0 overflow-y-auto sm:overflow-hidden">
        {/* LEFT/CENTER: Full-Body Standing Hero Ensemble (HERO Banner) or Collectible Relics (RELIC Banner) */}
        <div className="sm:col-span-6 lg:col-span-7 relative flex items-end justify-center pt-1 sm:pt-0 h-[36dvh] sm:h-full">
          {banner.type === 'HERO' ? (
            <div className="relative flex items-end justify-center w-full h-full max-h-[600px]">
              {/* UR Exclusive Prismatic Celestial Astrolabe Pedestal Ring */}
              {isUrEvent && (
                <div
                  className="pointer-events-none absolute bottom-[22%] w-64 h-64 sm:w-96 sm:h-96 rounded-full border-2 border-dashed border-amber-200/45 animate-spin z-0"
                  style={{
                    animationDuration: '24s',
                    boxShadow: '0 0 65px rgba(232,121,249,0.38), inset 0 0 42px rgba(56,232,255,0.28)',
                  }}
                />
              )}
              {/* Dual Standing Champions Over Celestial Summon Pedestal */}
              <div
                className={`pointer-events-none absolute bottom-3 w-[82%] max-w-md h-14 rounded-full border-2 blur-[1px] ${
                  isUrEvent
                    ? 'border-fuchsia-300/70 bg-gradient-to-r from-amber-400/20 via-fuchsia-500/25 to-cyan-400/20 shadow-[0_0_52px_rgba(232,121,249,0.55)]'
                    : 'border-amber-300/45 bg-amber-400/10 shadow-[0_0_40px_rgba(245,200,76,0.35)]'
                }`}
              />
              {featuredItems.map((item, i) => (
                <div
                  key={item.id}
                  className={`relative flex flex-col items-center justify-end h-[92%] sm:h-[88%] ${
                    featuredItems.length === 1
                      ? 'z-20'
                      : i === 0
                        ? 'z-20 -mr-10 sm:-mr-14'
                        : 'z-10 -ml-6 sm:-ml-10 opacity-95'
                  }`}
                >
                  <div
                    className="pointer-events-none absolute bottom-[22%] w-40 sm:w-56 h-40 sm:h-56 rounded-full blur-3xl opacity-45"
                    style={{
                      background:
                        item.tier === 'UR'
                          ? 'radial-gradient(circle, #ffffff, #fde047 35%, #e879f9 75%)'
                          : item.themeColor,
                    }}
                  />
                  <ArtImage
                    kind="HERO"
                    id={item.id}
                    src={item.standing}
                    alt={item.name}
                    className={`relative h-full w-auto object-contain object-bottom animate-breathe ${
                      featuredItems.length === 1
                        ? 'max-w-[82vw] sm:max-w-[46vw]'
                        : 'max-w-[46vw] sm:max-w-[30vw]'
                    }`}
                    style={{
                      filter:
                        item.tier === 'UR'
                          ? 'drop-shadow(0 18px 34px rgba(4,6,16,0.95)) drop-shadow(0 0 26px rgba(232,121,249,0.72)) drop-shadow(0 0 14px rgba(253,224,71,0.55))'
                          : `drop-shadow(0 16px 28px rgba(4,6,16,0.92)) drop-shadow(0 0 18px ${item.themeColor}55)`,
                    }}
                  />
                  {/* Floating Rate-Up Nameplate */}
                  <div
                    className={`relative z-30 -mt-6 px-3 py-1 rounded-full bg-slate-950/92 backdrop-blur-md flex items-center gap-1.5 shadow-xl border ${
                      item.tier === 'UR'
                        ? 'border-white/85 shadow-[0_0_24px_rgba(232,121,249,0.75)]'
                        : 'border-amber-300/60'
                    }`}
                  >
                    <RarityCrest tier={item.tier} size="xs" />
                    <span className="font-display font-black text-xs sm:text-sm text-white tracking-wider">
                      {item.name}
                    </span>
                    <span
                      className={`hidden md:inline text-[9px] font-black uppercase ${
                        item.tier === 'UR'
                          ? 'text-fuchsia-200'
                          : isStandardHeroBanner
                            ? 'text-cyan-200'
                            : 'text-amber-300'
                      }`}
                    >
                      {item.tier === 'UR'
                        ? '❖ LIMITED UR'
                        : isStandardHeroBanner
                          ? '★ HERO POOL'
                          : '★ RATE-UP'}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          ) : banner.type === 'PET' ? (
            <div className="relative flex items-center justify-center w-full h-full max-h-[560px]">
              {/* Starlight Sanctuary Floating Pet Pedestal */}
              <div
                className="pointer-events-none absolute bottom-[18%] w-60 h-60 sm:w-80 sm:h-80 rounded-full border-2 border-dashed border-cyan-300/45 animate-spin z-0"
                style={{
                  animationDuration: '26s',
                  boxShadow: '0 0 60px rgba(56,232,255,0.32), inset 0 0 36px rgba(245,200,76,0.25)',
                }}
              />
              <div className="pointer-events-none absolute bottom-5 w-[78%] max-w-md h-12 rounded-full border-2 border-cyan-300/60 bg-gradient-to-r from-cyan-400/15 via-amber-400/20 to-orange-400/15 shadow-[0_0_46px_rgba(56,232,255,0.45)] blur-[1px]" />
              <div className="relative z-10 flex items-end justify-center gap-1 sm:gap-3 w-full px-2">
                {[featuredItems[2], featuredItems[0], featuredItems[1]].filter(Boolean).map((item, idx) => {
                  const isCenter = idx === 1;
                  return (
                    <motion.div
                      key={item.id}
                      animate={{ y: isCenter ? [0, -14, 0] : [0, -9, 0] }}
                      transition={{
                        duration: isCenter ? 3.2 : 3.6 + idx * 0.3,
                        repeat: Infinity,
                        ease: 'easeInOut',
                      }}
                      className={`relative flex flex-col items-center ${
                        isCenter ? 'z-20 -mx-3 sm:-mx-4 pb-6' : 'z-10 pb-1 opacity-95'
                      }`}
                    >
                      <div
                        className="pointer-events-none absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-28 sm:w-44 h-28 sm:h-44 rounded-full blur-3xl opacity-50"
                        style={{ background: item.themeColor }}
                      />
                      <ArtImage
                        kind="PET"
                        id={item.id}
                        src={item.standing}
                        alt={item.name}
                        className={`relative object-contain ${
                          isCenter
                            ? 'w-40 h-40 sm:w-64 sm:h-64 md:w-72 md:h-72'
                            : 'w-28 h-28 sm:w-44 sm:h-44 md:w-52 md:h-52'
                        }`}
                        style={{
                          filter: `drop-shadow(0 16px 28px rgba(4,6,16,0.92)) drop-shadow(0 0 22px ${item.themeColor}88)`,
                        }}
                      />
                      <div
                        className="relative z-30 -mt-2 px-2.5 py-0.5 rounded-full bg-slate-950/92 backdrop-blur-md flex items-center gap-1.5 shadow-xl border"
                        style={{ borderColor: `${item.themeColor}99` }}
                      >
                        <RarityCrest tier={item.tier} size="xs" />
                        <span className="font-display font-black text-[11px] sm:text-xs text-white tracking-wider">
                          {item.name}
                        </span>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
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
                    kind="RELIC"
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
            <div className="flex flex-wrap items-center gap-2">
              <div
                className="text-[9px] sm:text-[10px] font-display font-black uppercase tracking-[0.24em]"
                style={{ color: banner.accentColor }}
              >
                {isUrEvent
                  ? '❖ LIMITED CELESTIAL SOVEREIGN EVENT ❖'
                  : isPetBanner
                    ? '🐾 STARLIGHT COMPANION SANCTUARY'
                    : isStandardHeroBanner
                      ? '★ PERMANENT STARLIGHT HERO SUMMON'
                      : banner.type === 'HERO'
                        ? '★ LIMITED SSR EVENT BANNER'
                        : 'ANCIENT RELIC ALTAR'}
              </div>
              {isUrEvent && (
                <span className="px-2 py-0.5 rounded-full bg-gradient-to-r from-amber-300/25 via-fuchsia-500/30 to-cyan-400/25 border border-white/75 text-[9px] font-display font-black uppercase tracking-widest text-white shadow-[0_0_14px_rgba(232,121,249,0.7)] animate-pulse">
                  UR DEBUT
                </span>
              )}
              {isStandardHeroBanner && (
                <span className="px-2 py-0.5 rounded-full bg-amber-400/20 border border-amber-300/70 text-[9px] font-display font-black uppercase tracking-widest text-amber-200">
                  STANDARD POOL
                </span>
              )}
              {isPetBanner && (
                <span className="px-2 py-0.5 rounded-full bg-cyan-400/20 border border-cyan-300/75 text-[9px] font-display font-black uppercase tracking-widest text-cyan-200">
                  NEW PETS
                </span>
              )}
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
                {isUrEvent
                  ? 'UR Sovereign Pity'
                  : isPetBanner
                    ? 'SSR Pet Pity Counter'
                    : 'SSR Pity Counter'}
              </span>
              <span className="font-mono font-bold text-sm text-white">
                <span className={isUrEvent ? 'text-fuchsia-300' : isPetBanner ? 'text-cyan-300' : 'text-amber-300'}>
                  {pity}
                </span>{' '}
                / {banner.hardPity}{' '}
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
              <span
                className={`font-mono font-bold ${isUrEvent ? 'text-fuchsia-200' : isPetBanner ? 'text-cyan-200' : 'text-amber-300'}`}
              >
                {isUrEvent
                  ? `UR: ${(nextUrRate * 100).toFixed(1)}% • SSR: ${(nextSsrRate * 100).toFixed(1)}%`
                  : `SSR Rate: ${(nextSsrRate * 100).toFixed(1)}%`}
              </span>
              <span
                className={`px-2 py-0.5 rounded-full text-[10px] font-display font-black uppercase tracking-wider border ${
                  isUrEvent
                    ? 'bg-fuchsia-500/20 border-fuchsia-300/70 text-fuchsia-100'
                    : isPetBanner
                      ? 'bg-cyan-500/20 border-cyan-300/70 text-cyan-100'
                      : isStandardHeroBanner
                        ? 'bg-amber-500/15 border-amber-400/55 text-amber-200'
                        : guaranteed
                          ? 'bg-emerald-500/15 border-emerald-400/50 text-emerald-300'
                          : 'bg-cyan-500/15 border-cyan-400/45 text-cyan-200'
                }`}
              >
                {isUrEvent
                  ? `❖ 100% ${HERO_MAP[banner.poolUR?.[0] ?? '']?.name ?? 'UR'} on UR`
                  : isPetBanner
                    ? '🐾 100% Aetherion on SSR'
                    : isStandardHeroBanner
                      ? `★ Equal Odds (${banner.poolSSR.length} SSR)`
                      : guaranteed
                        ? '★ 100% Featured'
                        : '50/50 Featured Rate-Up'}
              </span>
            </div>
          </div>

          {isStandardHeroBanner && excludedEventNames.length > 0 && (
            <div className="rounded-xl bg-slate-950/75 border border-amber-400/25 px-3 py-2 text-[11px] leading-relaxed space-y-0.5">
              <div className="text-amber-200 font-bold">
                Pool: {banner.poolSSR.length} SSR • {banner.poolSR.length} SR • {banner.poolR.length} R{' '}
                <span className="text-slate-400 font-normal">
                  ({banner.poolSSR.length + banner.poolSR.length + banner.poolR.length} Heroes)
                </span>
              </div>
              <div className="text-slate-400">
                Excludes active Event Heroes:{' '}
                <span className="text-fuchsia-200 font-semibold">{excludedEventNames.join(', ')}</span>
              </div>
            </div>
          )}

          <div className="text-[11px] text-slate-400 leading-relaxed">
            {isUrEvent ? (
              <>
                Base: <strong className="text-fuchsia-200">UR 0.6%</strong> •{' '}
                <strong className="text-amber-300">
                  {banner.featuredIds.some((id) => HERO_MAP[id]?.tier === 'SSR')
                    ? `SSR 2.5% (${banner.featuredIds
                        .filter((id) => HERO_MAP[id]?.tier === 'SSR')
                        .map((id) => HERO_MAP[id]?.name)
                        .join('/')} 50% Up)`
                    : 'SSR 2.5% (All SSR Pool)'}
                </strong>{' '}
                • <strong className="text-violet-300">SR 17.5%</strong>. SSR pulls keep UR Pity intact!
                10× guarantees SR+.
              </>
            ) : isPetBanner ? (
              <>
                Base: <strong className="text-amber-300">SSR Aetherion 4%</strong> •{' '}
                <strong className="text-orange-300">SR Cinderfang 22%</strong> •{' '}
                <strong className="text-cyan-300">R Lumina 74%</strong>. Duplicates auto-refine Pet
                Rank (R1→R5)! 10× guarantees SR+.
              </>
            ) : (
              <>
                Base: <strong className="text-amber-300">SSR 2.5%</strong> •{' '}
                <strong className="text-fuchsia-300">SR 17.5%</strong> •{' '}
                <strong className="text-sky-300">R 80%</strong>. Every pull awards +1 Starlight Token.
                10× guarantees SR+.
              </>
            )}
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
              <span className="text-[10px] sm:text-[11px] font-mono text-cyan-300 mt-0.5">
                {banner.singleCost.toLocaleString()} Crystals
              </span>
            </button>
            <button
              onClick={() => handleSummon(10)}
              className="rpg-battle-cta py-2.5 sm:py-3.5 px-3 sm:px-4 text-slate-950 flex flex-col items-center justify-center"
            >
              <span className="font-display font-black text-xs sm:text-sm uppercase tracking-wider flex items-center gap-1.5">
                <GameIcon name="summon" className="w-4 h-4 sm:w-5 sm:h-5" /> 10× Summon
              </span>
              <span className="text-[10px] sm:text-[11px] font-mono font-bold text-amber-950 mt-0.5">
                {banner.tenCost.toLocaleString()} Crystals
              </span>
            </button>
          </div>
        </div>
      </main>

      {/* SILENT PRELOADER FOR 1080p SUMMON STARFALL VIDEO + PULLED SSR HERO CUT-IN MP4s */}
      <div className="hidden" aria-hidden="true">
        <video src={SUMMON_VIDEO_SRC} poster={SUMMON_POSTER_SRC} preload="auto" muted playsInline />
        {phase !== 'IDLE' &&
          preloadSsrVideos.map((src) => (
            <video key={src} src={src} preload="auto" muted playsInline />
          ))}
      </div>

      {/* ACT 1–3: FULL-SCREEN 1080p ANIME SAKUGA STARFALL SUMMON VIDEO */}
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
                  Redeem 160 Tokens for UR Sovereign, 120 for SSR Hero/Relic, or 80/40 for Companion Pets (Balance:{' '}
                  <span className="text-amber-300 font-mono font-bold text-sm">{starlightTokens}</span>)
                </p>
              </div>
              <RpgButton variant="slate" size="sm" onClick={() => setShowSparkShop(false)}>
                Close
              </RpgButton>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
              {sparkUrHeroes.map((h) => (
                <div key={h.id} className="flex flex-col gap-1.5">
                  <CollectibleCard
                    kind="HERO"
                    id={h.id}
                    src={h.assets.card}
                    name={h.name}
                    subtitle={h.title}
                    tier={h.tier}
                    role={h.role}
                    topBannerLabel="❖ LIMITED UR"
                    compact
                    interactive={false}
                  />
                  <RpgButton
                    variant="gold"
                    size="xs"
                    disabled={starlightTokens < 160}
                    onClick={() => {
                      if (sparkExchange('HERO', h.id)) audioManager.playSfx('ssr_reveal');
                    }}
                    className="w-full font-display font-black uppercase tracking-wider"
                  >
                    Exchange 160
                  </RpgButton>
                </div>
              ))}

              {sparkSsrHeroes.map((h) => (
                <div key={h.id} className="flex flex-col gap-1.5">
                  <CollectibleCard
                    kind="HERO"
                    id={h.id}
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
                      if (sparkExchange('HERO', h.id)) audioManager.playSfx('ssr_reveal');
                    }}
                    className="w-full font-display font-black uppercase tracking-wider"
                  >
                    Exchange 120
                  </RpgButton>
                </div>
              ))}

              {[...PET_BANNER.poolSSR, ...PET_BANNER.poolSR].map((pid) => {
                const p = PET_MAP[pid];
                if (!p) return null;
                const cost = p.tier === 'SSR' ? 80 : 40;
                return (
                  <div key={pid} className="flex flex-col gap-1.5">
                    <CollectibleCard
                      kind="PET"
                      id={pid}
                      src={p.assets.card}
                      name={p.name}
                      subtitle={p.title}
                      tier={p.tier}
                      topBannerLabel="🐾 PET"
                      compact
                      interactive={false}
                    />
                    <RpgButton
                      variant="cyan"
                      size="xs"
                      disabled={starlightTokens < cost}
                      onClick={() => {
                        if (sparkExchange('PET', pid)) audioManager.playSfx('ssr_reveal');
                      }}
                      className="w-full font-display font-black uppercase tracking-wider"
                    >
                      Exchange {cost}
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
