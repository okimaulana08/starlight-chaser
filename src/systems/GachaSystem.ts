import { HERO_MAP } from '../data/heroes';
import { RELIC_MAP } from '../data/relics';
import type { BannerDef, GachaPullResult, Tier } from '../types/game';

/**
 * Exact Soft/Hard Pity formula from GDD Section 4.4 + Limited UR Event Banner:
 * - UR Event Banner: base 0.6% UR, soft pity at 70 (+3.2% per pull), hard pity at 100 (100% UR).
 * - Hero Banner: base 2.5% SSR, soft pity at 60 (+4.5% per pull), hard pity at 80.
 * - Relic Banner: base 2.5% SSR, soft pity at 45 (+5.5% per pull), hard pity at 60.
 */
export function isURBanner(banner: BannerDef): boolean {
  return Boolean(banner.poolUR && banner.poolUR.length > 0);
}

export function getURProbability(pityCount: number, banner: BannerDef): number {
  if (!isURBanner(banner)) return 0;
  const base = banner.urBaseRate ?? 0.006;
  const nextPullNumber = pityCount + 1;
  if (nextPullNumber >= banner.hardPity) return 1.0;
  if (nextPullNumber < banner.softPity) return base;
  return Math.min(1.0, base + 0.032 * (nextPullNumber - (banner.softPity - 1)));
}

export function getSSRProbability(pityCount: number, banner: BannerDef): number {
  if (isURBanner(banner)) return 0.025;
  const nextPullNumber = pityCount + 1;
  if (nextPullNumber >= banner.hardPity) return 1.0;
  if (nextPullNumber < banner.softPity) return 0.025;
  const slope = banner.type === 'HERO' ? 0.045 : 0.055;
  return Math.min(1.0, 0.025 + slope * (nextPullNumber - (banner.softPity - 1)));
}

function pickRandom<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

export interface PullStateInput {
  pityCounter: number;
  guaranteedFeatured: boolean;
  ownedIds: Set<string>;
}

export interface PullBatchOutput {
  results: GachaPullResult[];
  nextPityCounter: number;
  nextGuaranteedFeatured: boolean;
}

export function executeGachaPulls(
  banner: BannerDef,
  count: 1 | 10,
  input: PullStateInput,
): PullBatchOutput {
  let pity = input.pityCounter;
  let guaranteed = input.guaranteedFeatured;
  const owned = new Set(input.ownedIds);
  const results: GachaPullResult[] = [];
  let gotSRPlus = false;
  const hasURPool = isURBanner(banner);

  for (let i = 0; i < count; i++) {
    const urChance = hasURPool ? getURProbability(pity, banner) : 0;
    const ssrChance = getSSRProbability(pity, banner);
    const srChance = 0.175;
    const roll = Math.random();

    let tier: Tier;
    if (hasURPool && roll < urChance) {
      tier = 'UR';
    } else if (roll < urChance + ssrChance) {
      tier = 'SSR';
    } else if (roll < urChance + ssrChance + srChance) {
      tier = 'SR';
    } else {
      tier = 'R';
    }

    // 10-pull guarantees at least one SR or higher on the 10th slot
    if (count === 10 && i === 9 && !gotSRPlus && tier === 'R') {
      tier = 'SR';
    }

    if (tier === 'UR' || tier === 'SSR' || tier === 'SR') {
      gotSRPlus = true;
    }

    let pickedId: string;
    let isFeatured = false;

    if (tier === 'UR' && banner.poolUR && banner.poolUR.length > 0) {
      pity = 0;
      const featuredURs = banner.featuredIds.filter((id) => banner.poolUR!.includes(id));
      pickedId = featuredURs.length > 0 ? pickRandom(featuredURs) : pickRandom(banner.poolUR);
      isFeatured = true;
      guaranteed = false;
    } else if (tier === 'SSR') {
      if (!hasURPool) {
        pity = 0;
        const winFeatured = guaranteed || Math.random() < 0.5;
        if (winFeatured) {
          pickedId = pickRandom(banner.featuredIds);
          isFeatured = true;
          guaranteed = false;
        } else {
          const offBanner = banner.poolSSR.filter((id) => !banner.featuredIds.includes(id));
          pickedId = offBanner.length > 0 ? pickRandom(offBanner) : pickRandom(banner.poolSSR);
          isFeatured = false;
          guaranteed = true;
        }
      } else {
        // On a UR Event Banner, pulling an SSR still advances UR pity! Featured SSR (e.g. Vespera) gets 50% rate-up.
        pity += 1;
        const featuredSSRs = banner.featuredIds.filter((id) => banner.poolSSR.includes(id));
        if (featuredSSRs.length > 0 && Math.random() < 0.5) {
          pickedId = pickRandom(featuredSSRs);
          isFeatured = true;
        } else {
          const offBanner = banner.poolSSR.filter((id) => !featuredSSRs.includes(id));
          pickedId = offBanner.length > 0 ? pickRandom(offBanner) : pickRandom(banner.poolSSR);
          isFeatured = false;
        }
      }
    } else {
      pity += 1;
      pickedId = tier === 'SR' ? pickRandom(banner.poolSR) : pickRandom(banner.poolR);
    }

    const isNew = !owned.has(pickedId);
    owned.add(pickedId);

    // Duplicate rewards
    let shardsGained = 0;
    let starDustGained = 0;
    if (!isNew) {
      if (tier === 'UR') {
        shardsGained = banner.type === 'HERO' ? 30 : 0;
        starDustGained = 100;
      } else if (tier === 'SSR') {
        shardsGained = banner.type === 'HERO' ? 20 : 0;
        starDustGained = 50;
      } else if (tier === 'SR') {
        shardsGained = banner.type === 'HERO' ? 10 : 0;
        starDustGained = 20;
      } else {
        shardsGained = banner.type === 'HERO' ? 5 : 0;
        starDustGained = 8;
      }
    }

    if (banner.type === 'HERO') {
      const hero = HERO_MAP[pickedId];
      results.push({
        kind: 'HERO',
        id: pickedId,
        name: hero.name,
        tier,
        isFeatured,
        isNew,
        shardsGained,
        starDustGained,
        assetCard: hero.assets.card,
        themeColor: hero.themeColor,
        quote: hero.quote,
      });
    } else {
      const relic = RELIC_MAP[pickedId];
      results.push({
        kind: 'RELIC',
        id: pickedId,
        name: relic.name,
        tier,
        isFeatured,
        isNew,
        shardsGained,
        starDustGained,
        assetCard: relic.assetCard,
        themeColor:
          tier === 'UR'
            ? '#e879f9'
            : tier === 'SSR'
              ? '#f5c84c'
              : tier === 'SR'
                ? '#a855f7'
                : '#38bdf8',
      });
    }
  }

  return {
    results,
    nextPityCounter: pity,
    nextGuaranteedFeatured: guaranteed,
  };
}
