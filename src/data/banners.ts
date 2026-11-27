import type { BannerDef } from '../types/game';

export const HERO_BANNER_NEW: BannerDef = {
  id: 'banner_hero_chrono_bloom',
  type: 'HERO',
  name: 'Chrono & Eternal Bloom',
  subtitle: 'NEW Featured SSR Rate-Up: Aurelia (SSR Healer) & Zephyrion (Chrono Blade)',
  featuredIds: ['aurelia', 'zephyrion'],
  poolSSR: ['aurelia', 'zephyrion', 'vaelen', 'seraphina', 'draven', 'elara'],
  poolSR: ['ignis', 'garrick', 'lyra', 'raze', 'orion'],
  poolR: ['bram', 'kael', 'nyx', 'titus', 'clara'],
  softPity: 60,
  hardPity: 80,
  singleCost: 160,
  tenCost: 1600,
  sparkCost: 120,
  accentColor: '#34d399',
  backgroundAsset: '/assets/banners/bg_summon_chrono_bloom.webp',
};

export const HERO_BANNER: BannerDef = {
  id: 'banner_hero_eclipse',
  type: 'HERO',
  name: 'Eclipse & Constellation',
  subtitle: 'Featured SSR Rate-Up: Vaelen & Seraphina',
  featuredIds: ['vaelen', 'seraphina'],
  poolSSR: ['vaelen', 'seraphina', 'draven', 'elara', 'aurelia', 'zephyrion'],
  poolSR: ['garrick', 'lyra', 'raze', 'orion', 'ignis'],
  poolR: ['kael', 'nyx', 'titus', 'clara', 'bram'],
  softPity: 60,
  hardPity: 80,
  singleCost: 160,
  tenCost: 1600,
  sparkCost: 120,
  accentColor: '#f5c84c',
  backgroundAsset: '/assets/banners/bg_summon_eclipse.webp',
};

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

export const BANNERS = [HERO_BANNER_NEW, HERO_BANNER, RELIC_BANNER];
