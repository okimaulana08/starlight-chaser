import type { BannerDef } from '../types/game';

export const HERO_BANNER_UR: BannerDef = {
  id: 'banner_hero_sovereign_ur',
  type: 'HERO',
  name: 'Sovereign of the Fifth Pillar',
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

export const HERO_BANNER_NEW: BannerDef = {
  id: 'banner_hero_chrono_bloom',
  type: 'HERO',
  name: 'Chrono & Eternal Bloom',
  subtitle: 'Featured SSR Rate-Up: Aurelia (SSR Healer) & Zephyrion (Chrono Blade)',
  featuredIds: ['aurelia', 'zephyrion'],
  poolSSR: ['aurelia', 'zephyrion', 'vespera', 'vaelen', 'seraphina', 'draven', 'elara'],
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
  poolSSR: ['vaelen', 'seraphina', 'vespera', 'draven', 'elara', 'aurelia', 'zephyrion'],
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

export const BANNERS = [HERO_BANNER_UR, HERO_BANNER_NEW, HERO_BANNER, PET_BANNER, RELIC_BANNER];
