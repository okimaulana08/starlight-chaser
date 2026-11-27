/**
 * Declarative Multi-Pose Action Keyframe Manifest (2A Engine Infrastructure).
 * Register any transparent Attack/Cast pose WebP here (heroes face RIGHT, enemies/bosses face LEFT).
 * CombatEngine ONLY fetches URLs listed here — guaranteeing 0 failed 404 network requests!
 *
 * Example when adding generated sprites:
 *   vaelen: '/assets/sprites/battle_vaelen_atk.webp',
 *   boss_aurelian_sentinel: '/assets/enemies/boss_aurelian_sentinel_atk.webp',
 */
export const HERO_ATTACK_SPRITES: Partial<Record<string, string>> = {};

export const ENEMY_ATTACK_SPRITES: Partial<Record<string, string>> = {};
