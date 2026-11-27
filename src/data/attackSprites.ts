export interface AttackSpriteConfig {
  url: string;
  /** Optional physical scale compensation for wide forward-lunging silhouettes inside square frames */
  scaleBoost?: number;
}

/**
 * Declarative Multi-Pose Action Keyframe Manifest (2A Batch 1 — Kling Image 4.0 Transparent WebPs).
 * Heroes natively face RIGHT; Enemies & Bosses natively face LEFT.
 * CombatEngine ONLY fetches URLs listed here — guaranteeing 0 failed 404 network requests!
 */
export const HERO_ATTACK_SPRITES: Partial<Record<string, AttackSpriteConfig>> = {
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
