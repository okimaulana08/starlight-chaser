import React, { useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { RefreshCw, ShoppingBag, Sparkles, CheckCircle2 } from 'lucide-react';
import { EQUIPMENT_SETS, RARITY_COLORS, formatStatValue, getEnhancedMainStatValue } from '../data/equipment';
import { HEROES } from '../data/heroes';
import {
  MATERIAL_META,
  SHOP_OFFERS,
  type ShopCategory,
  type ShopOffer,
} from '../data/materials';
import { RELIC_MAP } from '../data/relics';
import { audioManager } from '../engine/AudioManager';
import {
  MAX_RELIC_RANK,
  SHOP_RESTOCK_GOLD_COST,
  usePlayerStore,
} from '../store/usePlayerStore';
import type { EquipmentInstance } from '../types/game';
import { ArtImage } from './ArtImage';
import { EquipIcon, GameIcon, MaterialIcon } from './GameIcon';
import {
  CornerFiligree,
  RpgBackButton,
  RpgButton,
  RpgTabs,
} from './RpgKit';
import { RarityCrest, RoleBadge } from './RoleBadge';
import { StarlightBackdrop } from './StarlightBackdrop';

interface ShopScreenProps {
  initialTab?: ShopCategory;
  onBack: () => void;
}

export const ShopScreen: React.FC<ShopScreenProps> = ({ initialTab = 'GROWTH', onBack }) => {
  const {
    gold,
    starDust,
    relicFragments,
    starlightCrystals,
    expPotions,
    bondGifts,
    forgeStones,
    starIronIngots,
    astralAnvilCores,
    starCores,
    factionEssences,
    dungeonTickets,
    roster,
    ownedRelics,
    relicRanks,
    shopPurchases,
    shopResetDay,
    buyShopItem,
    buyHeroShards,
    restockShop,
  } = usePlayerStore();

  const [tab, setTab] = useState<ShopCategory>(initialTab);
  const [toast, setToast] = useState<{ text: string; ok: boolean } | null>(null);
  const [recentCrateGear, setRecentCrateGear] = useState<EquipmentInstance | null>(null);

  const todayKey = (() => {
    const d = new Date();
    return `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;
  })();

  const activePurchases = shopResetDay === todayKey ? shopPurchases : {};

  const tabOffers = useMemo(
    () => SHOP_OFFERS.filter((o) => o.category === tab),
    [tab],
  );

  const ownedHeroList = useMemo(
    () => HEROES.filter((h) => Boolean(roster[h.id])),
    [roster],
  );

  const notify = (text: string, ok: boolean) => {
    setToast({ text, ok });
    window.setTimeout(() => setToast(null), 2800);
  };

  const handleBuy = (offer: ShopOffer) => {
    const res = buyShopItem(offer.id);
    notify(res.message, res.ok);
    if (res.ok) {
      audioManager.playSfx(
        offer.reward.kind === 'RELIC' || offer.reward.kind === 'GEAR_CRATE'
          ? 'ssr_reveal'
          : 'forge',
      );
      if (res.droppedGear) {
        setRecentCrateGear(res.droppedGear);
      }
    } else {
      audioManager.playSfx('button');
    }
  };

  const getCurrencyLabel = (offer: ShopOffer) => {
    if (offer.currency === 'GOLD') return `${offer.price.toLocaleString()} Gold`;
    if (offer.currency === 'STAR_DUST') return `${offer.price} Dust`;
    if (offer.currency === 'RELIC_FRAGMENTS') return `${offer.price} Frags`;
    return `${offer.price} Crystals`;
  };

  const canAfford = (offer: ShopOffer) => {
    if (offer.currency === 'GOLD') return gold >= offer.price;
    if (offer.currency === 'STAR_DUST') return starDust >= offer.price;
    if (offer.currency === 'RELIC_FRAGMENTS') return relicFragments >= offer.price;
    return starlightCrystals >= offer.price;
  };

  const accentByTab: Record<ShopCategory, string> = {
    GROWTH: '#34d399',
    AWAKEN: '#e879f9',
    FORGE: '#f5c84c',
    RELIC: '#38e8ff',
  };

  return (
    <div className="relative w-full h-full flex flex-col overflow-hidden select-none">
      <StarlightBackdrop variant="FORGE" accentColor={accentByTab[tab]} />

      {/* TOP BAR */}
      <div className="relative z-20 flex flex-wrap items-center justify-between gap-2 px-3 sm:px-5 safe-top pb-2">
        <div className="flex items-center gap-2.5">
          <RpgBackButton onClick={onBack} />
          <GameIcon name="shop" className="w-7 h-7 sm:w-8 sm:h-8" />
          <div>
            <h1 className="font-display text-base sm:text-xl font-black text-white tracking-[0.14em] text-glow-gold leading-none">
              STARLIGHT EMPORIUM
            </h1>
            <div className="text-[10px] sm:text-xs text-slate-300 mt-0.5">
              Growth Supplies • Biome Awakening • Forge Catalysts • Relic Vault
            </div>
          </div>
        </div>

        {/* Currencies + Restock */}
        <div className="flex items-center gap-1.5 text-[10px] sm:text-xs font-mono overflow-x-auto max-w-full">
          <span
            className="rpg-panel-subtle px-2.5 py-1 text-amber-300 flex items-center gap-1.5 shrink-0 font-bold"
            title="Gold"
          >
            <GameIcon name="gold" className="w-4 h-4" /> {gold.toLocaleString()}
          </span>
          <span
            className="rpg-panel-subtle px-2.5 py-1 text-fuchsia-300 flex items-center gap-1.5 shrink-0 font-bold"
            title="Starlight Dust (from Gacha dupes)"
          >
            <GameIcon name="star_dust" className="w-4 h-4" /> {starDust}
          </span>
          <span
            className="rpg-panel-subtle px-2.5 py-1 text-cyan-300 flex items-center gap-1.5 shrink-0 font-bold"
            title="Relic Fragments (from Mini-Boss & Boss drops)"
          >
            <GameIcon name="relic" className="w-4 h-4" /> {relicFragments}
          </span>
          <button
            onClick={() => {
              const res = restockShop();
              notify(res.message, res.ok);
              audioManager.playSfx(res.ok ? 'forge' : 'button');
            }}
            className="rpg-panel-subtle hover:border-amber-300 px-2.5 py-1 text-amber-200 font-display font-bold uppercase text-[10px] flex items-center gap-1 shrink-0 transition"
            title={`Refresh daily purchase stock (${SHOP_RESTOCK_GOLD_COST.toLocaleString()} Gold)`}
          >
            <RefreshCw className="w-3 h-3 text-amber-300" />
            <span>Restock ({SHOP_RESTOCK_GOLD_COST.toLocaleString()}g)</span>
          </button>
        </div>
      </div>

      {/* CATEGORY TABS + LIVE INVENTORY STRIP */}
      <div className="relative z-20 px-3 sm:px-5 pb-2 flex flex-wrap items-center justify-between gap-2">
        <RpgTabs
          layoutId="shop-category-tabs"
          value={tab}
          onChange={setTab}
          items={[
            { key: 'GROWTH', label: 'Level & Bond', icon: 'supply', accent: 'gold' },
            { key: 'AWAKEN', label: 'Awakening', icon: 'summon', accent: 'gold' },
            { key: 'FORGE', label: 'Forge & Gear', icon: 'forge', accent: 'gold' },
            { key: 'RELIC', label: 'Relic Vault', icon: 'relic', accent: 'cyan' },
          ]}
        />

        {/* Contextual Stock Strip (Pure Icon + Count) */}
        <div className="flex items-center gap-2 text-[10px] font-mono overflow-x-auto max-w-full">
          {tab === 'GROWTH' && (
            <>
              <span className="px-2.5 py-1 rounded-lg bg-slate-950/80 border border-emerald-400/35 text-emerald-300 font-bold flex items-center gap-1.5" title="Starlight EXP Elixirs">
                <MaterialIcon material="expPotions" className="w-4 h-4" /> {expPotions}
              </span>
              <span className="px-2.5 py-1 rounded-lg bg-slate-950/80 border border-rose-400/35 text-rose-300 font-bold flex items-center gap-1.5" title="Celestial Bond Keepsakes">
                <MaterialIcon material="bondGifts" className="w-4 h-4" /> {bondGifts}
              </span>
              <span className="px-2.5 py-1 rounded-lg bg-slate-950/80 border border-fuchsia-400/35 text-fuchsia-200 font-bold flex items-center gap-1.5" title="Rift Dungeon Tickets">
                <GameIcon name="dungeon_ticket" className="w-4 h-4" /> {dungeonTickets ?? 0}
              </span>
            </>
          )}
          {tab === 'AWAKEN' && (
            <>
              <span className="px-2 py-1 rounded-lg bg-slate-950/80 border border-amber-400/35 text-amber-300 font-bold flex items-center gap-1" title="Solaris Core">
                <MaterialIcon material="essence_SOLARIS" className="w-4 h-4" /> {factionEssences.SOLARIS}
              </span>
              <span className="px-2 py-1 rounded-lg bg-slate-950/80 border border-cyan-400/35 text-cyan-300 font-bold flex items-center gap-1" title="Astral Prism">
                <MaterialIcon material="essence_ASTRAL" className="w-4 h-4" /> {factionEssences.ASTRAL}
              </span>
              <span className="px-2 py-1 rounded-lg bg-slate-950/80 border border-emerald-400/35 text-emerald-300 font-bold flex items-center gap-1" title="Verdant Dew">
                <MaterialIcon material="essence_VERDANT" className="w-4 h-4" /> {factionEssences.VERDANT}
              </span>
              <span className="px-2 py-1 rounded-lg bg-slate-950/80 border border-orange-400/35 text-orange-300 font-bold flex items-center gap-1" title="Ashen Ember">
                <MaterialIcon material="essence_ASHEN" className="w-4 h-4" /> {factionEssences.ASHEN}
              </span>
              <span className="px-2 py-1 rounded-lg bg-slate-950/80 border border-fuchsia-400/45 text-fuchsia-300 font-bold flex items-center gap-1" title="Starlight Core">
                <MaterialIcon material="starCores" className="w-4 h-4" /> {starCores}
              </span>
            </>
          )}
          {tab === 'FORGE' && (
            <>
              <span className="px-2.5 py-1 rounded-lg bg-slate-950/80 border border-violet-400/35 text-violet-300 font-bold flex items-center gap-1.5" title="Forge Stones">
                <MaterialIcon material="forgeStones" className="w-4 h-4" /> {forgeStones}
              </span>
              <span className="px-2.5 py-1 rounded-lg bg-slate-950/80 border border-sky-400/35 text-sky-300 font-bold flex items-center gap-1.5" title="Star-Iron Ingots">
                <MaterialIcon material="starIronIngots" className="w-4 h-4" /> {starIronIngots}
              </span>
              <span className="px-2.5 py-1 rounded-lg bg-slate-950/80 border border-amber-400/40 text-amber-200 font-bold flex items-center gap-1.5" title="Astral Anvil Cores">
                <MaterialIcon material="astralAnvilCores" className="w-4 h-4" /> {astralAnvilCores}
              </span>
            </>
          )}
          {tab === 'RELIC' && (
            <span className="px-2.5 py-1 rounded-lg bg-slate-950/80 border border-cyan-400/40 text-cyan-200">
              Owned Relics: {ownedRelics.length}/8 • Bosses drop Relics & Fragments!
            </span>
          )}
        </div>
      </div>

      {/* TOAST & FORGED GEAR REVEAL */}
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: -12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className={`fixed top-16 left-1/2 -translate-x-1/2 z-50 px-4 py-2 rounded-xl border backdrop-blur-md text-xs font-bold shadow-2xl flex items-center gap-2 ${
              toast.ok
                ? 'bg-emerald-950/90 border-emerald-400 text-emerald-200'
                : 'bg-rose-950/90 border-rose-400 text-rose-200'
            }`}
          >
            <Sparkles className="w-4 h-4" />
            <span>{toast.text}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* MAIN SHOP GRID */}
      <main className="relative z-10 flex-1 overflow-y-auto px-3 sm:px-5 pb-5 space-y-4 min-h-0">
        {recentCrateGear && tab === 'FORGE' && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            className="rpg-ornate-card p-3 flex flex-wrap items-center justify-between gap-3 border-amber-300/70"
            style={{ borderLeft: `4px solid ${RARITY_COLORS[recentCrateGear.rarity]}` }}
          >
            <div className="flex items-center gap-3">
              <div
                className="w-11 h-11 rounded-xl bg-slate-900 border-2 flex items-center justify-center"
                style={{ borderColor: RARITY_COLORS[recentCrateGear.rarity] }}
              >
                <EquipIcon slot={recentCrateGear.slot} className="w-8 h-8" />
              </div>
              <div>
                <div className="text-[10px] font-display font-black uppercase text-amber-300">
                  ★ Newly Forged Equipment Added to Inventory!
                </div>
                <div className="font-display font-bold text-sm text-white">
                  <span style={{ color: RARITY_COLORS[recentCrateGear.rarity] }}>
                    [{recentCrateGear.rarity}]
                  </span>{' '}
                  {recentCrateGear.name} ({EQUIPMENT_SETS[recentCrateGear.setId].name})
                </div>
                <div className="text-xs font-mono text-amber-200 flex flex-wrap gap-x-2.5">
                  <span>
                    {formatStatValue(
                      recentCrateGear.mainStat.stat,
                      getEnhancedMainStatValue(recentCrateGear),
                    )}
                  </span>
                  {recentCrateGear.subStats.map((s, i) => (
                    <span key={i} className="text-slate-300">
                      {formatStatValue(s.stat, s.value)}
                    </span>
                  ))}
                </div>
              </div>
            </div>
            <RpgButton variant="slate" size="xs" onClick={() => setRecentCrateGear(null)}>
              Dismiss
            </RpgButton>
          </motion.div>
        )}

        {/* SHOP OFFER CARDS */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
          {tabOffers.map((offer) => {
            const bought = activePurchases[offer.id] ?? 0;
            const remaining = offer.dailyLimit > 0 ? Math.max(0, offer.dailyLimit - bought) : null;
            const soldOut = remaining !== null && remaining <= 0;
            const affordable = canAfford(offer);

            const relicDef =
              offer.reward.kind === 'RELIC' ? RELIC_MAP[offer.reward.relicId] : null;
            const relicOwned = relicDef ? ownedRelics.includes(relicDef.id) : false;
            const relicRank = relicDef ? relicRanks[relicDef.id] ?? 0 : 0;
            const relicMaxed = relicOwned && relicRank >= MAX_RELIC_RANK;

            return (
              <motion.div
                key={offer.id}
                whileHover={{ y: -3 }}
                transition={{ type: 'spring', stiffness: 360, damping: 26 }}
                className="relative rpg-ornate-card p-3.5 flex flex-col justify-between gap-3 overflow-hidden"
                style={{
                  borderColor: `${offer.accentColor}66`,
                  borderTop: `3px solid ${offer.accentColor}`,
                }}
              >
                <CornerFiligree color={offer.accentColor} size={8} opacity={0.6} />

                <div className="flex items-start gap-3">
                  {/* Offer Artwork / Material Emblem */}
                  {relicDef ? (
                    <div className="relative w-16 aspect-[3/4] rounded-xl overflow-hidden border-2 shrink-0 bg-slate-950" style={{ borderColor: offer.accentColor }}>
                      <ArtImage
                        kind="RELIC"
                        id={relicDef.id}
                        src={relicDef.assetCard}
                        alt={relicDef.name}
                        className="w-full h-full object-cover"
                      />
                      {relicOwned && (
                        <span className="absolute bottom-0 inset-x-0 bg-black/85 text-[9px] font-mono font-black text-center text-cyan-300">
                          R{relicRank}/{MAX_RELIC_RANK}
                        </span>
                      )}
                    </div>
                  ) : (
                    <div
                      className="w-14 h-14 rounded-2xl border-2 flex items-center justify-center shrink-0"
                      style={{
                        borderColor: `${offer.accentColor}aa`,
                        background: `radial-gradient(circle, ${offer.accentColor}30 0%, rgba(7,10,24,0.95) 78%)`,
                        boxShadow: `inset 0 0 14px ${offer.accentColor}28`,
                      }}
                    >
                      {offer.reward.kind === 'MATERIAL' && (
                        <MaterialIcon material={offer.reward.material} className="w-10 h-10" />
                      )}
                      {offer.reward.kind === 'OMNI_ESSENCE' && (
                        <GameIcon name="crystal" className="w-9 h-9" />
                      )}
                      {offer.reward.kind === 'GEAR_CRATE' && (
                        <EquipIcon slot="WEAPON" className="w-10 h-10" />
                      )}
                    </div>
                  )}

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      {offer.badge && (
                        <span
                          className="px-1.5 py-0.5 rounded text-[8px] font-display font-black uppercase border"
                          style={{
                            borderColor: `${offer.accentColor}88`,
                            backgroundColor: `${offer.accentColor}22`,
                            color: offer.accentColor,
                          }}
                        >
                          {offer.badge}
                        </span>
                      )}
                      {remaining !== null && (
                        <span className="text-[9px] font-mono text-slate-400 font-bold">
                          Stock {remaining}/{offer.dailyLimit}
                        </span>
                      )}
                    </div>
                    <h3 className="font-display font-black text-sm text-white leading-tight mt-1">
                      {offer.name}
                    </h3>
                    <p className="text-[11px] text-slate-300 mt-1 leading-snug">
                      {relicDef ? relicDef.passiveDesc : offer.subtitle}
                    </p>
                    {offer.reward.kind === 'MATERIAL' && (
                      <div className="text-[9px] text-slate-400 mt-1">
                        Also drops: {MATERIAL_META[offer.reward.material].farmHint}
                      </div>
                    )}
                  </div>
                </div>

                <div className="pt-2 border-t border-white/10 flex items-center justify-between gap-2">
                  <span
                    className={`font-mono text-xs font-black ${
                      affordable ? 'text-amber-300' : 'text-rose-300'
                    }`}
                  >
                    {getCurrencyLabel(offer)}
                  </span>

                  <RpgButton
                    variant={
                      relicMaxed || soldOut
                        ? 'slate'
                        : offer.currency === 'RELIC_FRAGMENTS'
                          ? 'cyan'
                          : offer.currency === 'STAR_DUST'
                            ? 'violet'
                            : 'gold'
                    }
                    size="xs"
                    disabled={soldOut || relicMaxed || !affordable}
                    onClick={() => handleBuy(offer)}
                    className="font-display font-black uppercase tracking-wider px-3"
                  >
                    {relicMaxed ? (
                      <>
                        <CheckCircle2 className="w-3 h-3" /> Max R5
                      </>
                    ) : soldOut ? (
                      'Sold Out'
                    ) : relicDef ? (
                      relicOwned ? `Refine R${relicRank + 1}` : 'Craft Relic'
                    ) : (
                      <>
                        <ShoppingBag className="w-3 h-3" /> Buy
                      </>
                    )}
                  </RpgButton>
                </div>
              </motion.div>
            );
          })}
        </div>

        {/* BONUS SECTION ON AWAKEN TAB: HERO SHARD EXCHANGE (STAR DUST) */}
        {tab === 'AWAKEN' && (
          <div className="rpg-panel p-3.5 sm:p-4 space-y-3 border-fuchsia-400/35">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <h2 className="font-display text-sm sm:text-base font-black text-white tracking-wider uppercase flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-fuchsia-300" />
                  Chaser Shard Exchange (Star Dust)
                </h2>
                <p className="text-[11px] text-slate-300">
                  Convert surplus Gacha Star Dust into +5 Hero Shards for any owned Chaser (used for Starlight Constellation C1–C6 upgrades).
                </p>
              </div>
              <span className="px-2.5 py-1 rounded-lg bg-fuchsia-950/70 border border-fuchsia-400/45 font-mono text-xs font-bold text-fuchsia-200">
                Your Dust: {starDust}
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2.5">
              {ownedHeroList.map((h) => {
                const own = roster[h.id];
                const dustCost = h.tier === 'SSR' ? 20 : h.tier === 'SR' ? 12 : 8;
                return (
                  <div
                    key={h.id}
                    className="rounded-xl p-2 bg-slate-950/85 border border-slate-800 flex flex-col gap-2"
                  >
                    <div className="flex items-center gap-2">
                      <div
                        className="w-10 h-12 rounded-lg overflow-hidden border shrink-0"
                        style={{ borderColor: h.themeColor }}
                      >
                        <ArtImage
                          kind="HERO"
                          id={h.id}
                          src={h.assets.card}
                          alt={h.name}
                          className="w-full h-full object-cover object-top"
                        />
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-1">
                          <RarityCrest tier={h.tier} size="xs" />
                          <RoleBadge role={h.role} variant="medallion" size="sm" />
                        </div>
                        <div className="font-display font-bold text-xs text-white truncate mt-0.5">
                          {h.name}
                        </div>
                        <div className="text-[10px] font-mono text-cyan-300">
                          Shards: {own.shards}
                        </div>
                      </div>
                    </div>
                    <RpgButton
                      variant="violet"
                      size="xs"
                      disabled={starDust < dustCost}
                      onClick={() => {
                        const res = buyHeroShards(h.id);
                        notify(res.message, res.ok);
                        audioManager.playSfx(res.ok ? 'forge' : 'button');
                      }}
                      className="w-full font-display font-black uppercase"
                    >
                      +5 Shards ({dustCost} Dust)
                    </RpgButton>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </main>
    </div>
  );
};
