export interface AttackSpriteConfig {
  url: string;
  /** Optional physical scale compensation for wide forward-lunging silhouettes inside square frames */
  scaleBoost?: number;
}

/**
 * Declarative Multi-Pose Action Keyframe Manifest (2A Batch 1 + Batch 2 — Kling Image 4.0 Transparent WebPs).
 * Covers ALL 6 SSR Heroes + 4 SR Heroes + 2 R Starter Heroes (12 Heroes total!) + Ch.1 Boss Sentinel.
 * Heroes natively face RIGHT; Enemies & Bosses natively face LEFT.
 * CombatEngine ONLY fetches URLs listed here — guaranteeing 0 failed 404 network requests!
 */
export const HERO_ATTACK_SPRITES: Partial<Record<string, AttackSpriteConfig>> = {
  // UR Sovereign & New SSR
  astraea: {
    url: '/assets/sprites/battle_astraea_atk.webp',
    scaleBoost: 1.12,
  },
  vespera: {
    url: '/assets/sprites/battle_vespera_atk.webp',
    scaleBoost: 1.14,
  },
  // Batch 1 — Starter Squad
  vaelen: {
    url: '/assets/sprites/battle_vaelen_atk.webp',
    scaleBoost: 1.14,
  },
  garrick: {
    url: '/assets/sprites/battle_garrick_atk.webp',
    scaleBoost: 1.04,
  },
  nyx: {
    url: '/assets/sprites/battle_nyx_atk.webp',
    scaleBoost: 1.12,
  },
  clara: {
    url: '/assets/sprites/battle_clara_atk.webp',
    scaleBoost: 1.0,
  },
  // Batch 2 — All Remaining SSRs + 3 SRs
  seraphina: {
    url: '/assets/sprites/battle_seraphina_atk.webp',
    scaleBoost: 1.1,
  },
  draven: {
    url: '/assets/sprites/battle_draven_atk.webp',
    scaleBoost: 1.1,
  },
  elara: {
    url: '/assets/sprites/battle_elara_atk.webp',
    scaleBoost: 1.1,
  },
  aurelia: {
    url: '/assets/sprites/battle_aurelia_atk.webp',
    scaleBoost: 0.96,
  },
  zephyrion: {
    url: '/assets/sprites/battle_zephyrion_atk.webp',
    scaleBoost: 1.06,
  },
  lyra: {
    url: '/assets/sprites/battle_lyra_atk.webp',
    scaleBoost: 1.0,
  },
  raze: {
    url: '/assets/sprites/battle_raze_atk.webp',
    scaleBoost: 1.24,
  },
  orion: {
    url: '/assets/sprites/battle_orion_atk.webp',
    scaleBoost: 1.18,
  },
};

export const ENEMY_ATTACK_SPRITES: Partial<Record<string, AttackSpriteConfig>> = {
  '/assets/enemies/boss_aurelian_sentinel.webp': {
    url: '/assets/enemies/boss_aurelian_sentinel_atk.webp',
    scaleBoost: 1.07,
  },
  aurelian_sentinel: {
    url: '/assets/enemies/boss_aurelian_sentinel_atk.webp',
    scaleBoost: 1.07,
  },
};
