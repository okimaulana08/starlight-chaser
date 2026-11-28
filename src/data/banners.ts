import type { BannerDef } from '../types/game';
import { HEROES } from './heroes';

/**
 * Active Event Banners displayed under the Summon > EVENT tab (with sub-tabs).
 * Any hero featured here (UR or SSR rate-up) is automatically excluded from the permanent Hero Summon pool!
 */
export const HERO_BANNER_UR_VELARIS: BannerDef = {
  id: 'banner_hero_zero_meridian_ur',
  type: 'HERO',
  name: 'Sovereign of the Zero Meridian',
  eventSubTabLabel: '❖ UR • Zero Meridian',
  subtitle:
    'NEW LIMITED UR EVENT — Featured: Velaris (UR Astral Assault Sovereign • Boss-Slayer & Empyrean Transcendence)',
  featuredIds: ['velaris'],
  poolUR: ['velaris'],
  poolSSR: ['vespera', 'aurelia', 'zephyrion', 'vaelen', 'seraphina', 'draven', 'elara'],
  poolSR: ['ignis', 'garrick', 'lyra', 'raze', 'orion'],
  poolR: ['bram', 'kael', 'nyx', 'titus', 'clara'],
  isLimitedEvent: true,
  urBaseRate: 0.006,
  softPity: 70,
  hardPity: 100,
  singleCost: 160,
  tenCost: 1600,
  sparkCost: 160,
  accentColor: '#818cf8',
  backgroundAsset: '/assets/banners/bg_summon_velaris_ur.webp',
};

export const HERO_BANNER_UR: BannerDef = {
  id: 'banner_hero_sovereign_ur',
  type: 'HERO',
  name: 'Sovereign of the Fifth Pillar',
  eventSubTabLabel: '❖ UR • Fifth Pillar',
  subtitle:
    'LIMITED UR EVENT — Featured: Astraea (UR Celestial Sovereign) & Vespera (SSR Cinder-Rail Valkyrie)',
  featuredIds: ['astraea', 'vespera'],
  poolUR: ['astraea'],
  poolSSR: ['vespera', 'aurelia', 'zephyrion', 'vaelen', 'seraphina', 'draven', 'elara'],
  poolSR: ['ignis', 'garrick', 'lyra', 'raze', 'orion'],
  poolR: ['bram', 'kael', 'nyx', 'titus', 'clara'],
  isLimitedEvent: true,
  urBaseRate: 0.006,
  softPity: 70,
  hardPity: 100,
  singleCost: 160,
  tenCost: 1600,
  sparkCost: 160,
  accentColor: '#e879f9',
  backgroundAsset: '/assets/banners/bg_summon_sovereign_ur.webp',
};

export const HERO_BANNER_EVENT_SSR: BannerDef = {
  id: 'banner_hero_chrono_bloom',
  type: 'HERO',
  name: 'Chrono & Eternal Bloom',
  eventSubTabLabel: '★ SSR • Chrono & Bloom',
  subtitle: 'LIMITED SSR EVENT — Featured: Aurelia (Saintess of the World-Tree) & Zephyrion (Chrono Eclipse Blade)',
  featuredIds: ['aurelia', 'zephyrion'],
  poolSSR: ['aurelia', 'zephyrion', 'vespera', 'vaelen', 'seraphina', 'draven', 'elara'],
  poolSR: ['ignis', 'garrick', 'lyra', 'raze', 'orion'],
  poolR: ['bram', 'kael', 'nyx', 'titus', 'clara'],
  isLimitedEvent: true,
  softPity: 60,
  hardPity: 80,
  singleCost: 160,
  tenCost: 1600,
  sparkCost: 120,
  accentColor: '#34d399',
  backgroundAsset: '/assets/banners/bg_summon_chrono_bloom.webp',
};

// Backward-compatible export alias
export const HERO_BANNER_NEW = HERO_BANNER_EVENT_SSR;

export const EVENT_HERO_BANNERS: BannerDef[] = [
  HERO_BANNER_UR_VELARIS,
  HERO_BANNER_UR,
  HERO_BANNER_EVENT_SSR,
];

/**
 * Dynamic set of all Hero IDs currently featured in active Event banners.
 * Excluded automatically from the permanent Hero Summon pool until their Event ends!
 */
export const ACTIVE_EVENT_HERO_IDS: string[] = Array.from(
  new Set(EVENT_HERO_BANNERS.flatMap((b) => [...(b.poolUR ?? []), ...b.featuredIds])),
);

const standardHeroes = HEROES.filter((h) => !ACTIVE_EVENT_HERO_IDS.includes(h.id));
const standardPoolSSR = standardHeroes.filter((h) => h.tier === 'SSR').map((h) => h.id);
const standardPoolSR = standardHeroes.filter((h) => h.tier === 'SR').map((h) => h.id);
const standardPoolR = standardHeroes.filter((h) => h.tier === 'R').map((h) => h.id);

/**
 * Permanent Hero Summon Banner (replaces Eclipse & Constellation).
 * Contains ALL heroes EXCEPT heroes currently featured in the Event tab (including ex-Eclipse Vaelen & Seraphina).
 */
export const HERO_BANNER_STANDARD: BannerDef = {
  id: 'banner_hero_standard',
  type: 'HERO',
  name: 'Starlight Hero Summon',
  subtitle:
    'Permanent Chaser Roster — All Standard Heroes (Vaelen, Seraphina, Draven, Elara + all SR & R; excludes active Event Heroes)',
  featuredIds: ['vaelen', 'seraphina'],
  poolSSR: standardPoolSSR,
  poolSR: standardPoolSR,
  poolR: standardPoolR,
  isStandardPool: true,
  excludedEventHeroIds: ACTIVE_EVENT_HERO_IDS,
  softPity: 60,
  hardPity: 80,
  singleCost: 160,
  tenCost: 1600,
  sparkCost: 120,
  accentColor: '#f5c84c',
  backgroundAsset: '/assets/banners/bg_summon_eclipse.webp',
};

// Backward-compatible export alias
export const HERO_BANNER = HERO_BANNER_STANDARD;

export const RELIC_BANNER: BannerDef = {
  id: 'banner_relic_starfall',
  type: 'RELIC',
  name: 'Echoes of the Fallen Pillars',
  subtitle: 'Featured SSR Relics: Blade of the First Eclipse & Astrolabe of Lumina',
  featuredIds: ['relic_first_eclipse', 'relic_astrolabe_lumina'],
  poolSSR: [
    'relic_first_eclipse',
    'relic_astrolabe_lumina',
    'relic_obsidian_forge',
    'relic_falling_star_bow',
  ],
  poolSR: ['relic_world_tree_tear', 'relic_cinder_chain', 'relic_prism_aegis'],
  poolR: ['relic_dawnlight_lantern'],
  softPity: 45,
  hardPity: 60,
  singleCost: 160,
  tenCost: 1600,
  sparkCost: 120,
  accentColor: '#38e8ff',
  backgroundAsset: '/assets/banners/bg_summon_relics.webp',
};

export const PET_BANNER: BannerDef = {
  id: 'banner_pet_sanctuary',
  type: 'PET',
  name: 'Starlight Companion Sanctuary',
  subtitle: 'Summon Celestial Pets: Aetherion (SSR), Cinderfang (SR) & Lumina (R)',
  featuredIds: ['pet_aetherion', 'pet_cinderfang', 'pet_lumina'],
  poolSSR: ['pet_aetherion'],
  poolSR: ['pet_cinderfang'],
  poolR: ['pet_lumina'],
  ssrBaseRate: 0.04,
  srBaseRate: 0.22,
  softPity: 30,
  hardPity: 45,
  singleCost: 120,
  tenCost: 1200,
  sparkCost: 80,
  accentColor: '#38e8ff',
  backgroundAsset: '/assets/banners/bg_summon_pets.webp',
};

export const BANNERS = [
  ...EVENT_HERO_BANNERS,
  HERO_BANNER_STANDARD,
  PET_BANNER,
  RELIC_BANNER,
];
