import type { RelicDef } from '../types/game';

export const RELICS: RelicDef[] = [
  {
    id: 'relic_first_eclipse',
    name: 'Blade of the First Eclipse',
    tier: 'SSR',
    preferredRole: 'ASSAULT',
    passiveDesc:
      'Triggering a Mark or landing a Critical Hit grants +8% Crit DMG for 6s (stacks up to 5 times, +40% max).',
    lore: 'A radiant fragment of the First Solaris Commander’s greatsword that cleaved an eclipse in two during the Starfall Shattering.',
    bonuses: {
      atk: 65,
      critRate: 0.08,
      critDmg: 0.2,
    },
    assetCard: '/assets/relics/relic_first_eclipse.webp',
  },
  {
    id: 'relic_astrolabe_lumina',
    name: 'Astrolabe of Lumina',
    tier: 'SSR',
    preferredRole: 'MAGE',
    passiveDesc:
      'Start every stage with +10 Ultimate Gauge and expand all AoE skill radii by +12%.',
    lore: 'An antique celestial cartography engine built atop Lumina Observatory capable of folding local space along star-lines.',
    bonuses: {
      atk: 72,
      startingGauge: 10,
      aoeRadiusBonus: 0.12,
    },
    assetCard: '/assets/relics/relic_astrolabe_lumina.webp',
  },
  {
    id: 'relic_obsidian_forge',
    name: 'Heart of the Obsidian Forge',
    tier: 'SSR',
    preferredRole: 'TANK',
    passiveDesc:
      'When your Shield breaks or HP falls below 50%, unleashes a magma pulse (150% DEF) and grants +15% Damage Reduction for 6s (12s CD).',
    lore: 'The eternal volcanic core excavated from Ferrum Caldera; even a dimensional fracture could not extinguish its embers.',
    bonuses: {
      hp: 420,
      def: 55,
      shieldBonus: 0.15,
    },
    assetCard: '/assets/relics/relic_obsidian_forge.webp',
  },
  {
    id: 'relic_falling_star_bow',
    name: 'Bowstring of the Falling Star',
    tier: 'SSR',
    preferredRole: 'RANGER',
    passiveDesc:
      'Every 4th basic attack launches an extra starlight arrow (120% ATK) and grants +5% Attack Speed (stacks up to 5 times).',
    lore: 'Woven by Sylva’s elder wardens from luminous filaments shed by a falling star-pillar.',
    bonuses: {
      atk: 60,
      critRate: 0.1,
      atkSpeed: 0.14,
    },
    assetCard: '/assets/relics/relic_falling_star_bow.webp',
  },
  {
    id: 'relic_world_tree_tear',
    name: 'Tear of the World Tree',
    tier: 'SR',
    preferredRole: 'HEALER',
    passiveDesc:
      'Excess healing (Overheal) converts into a protective emerald Shield up to 10% of the target’s Max HP.',
    lore: 'Primordial dew crystallized into living emerald the moment Sylva Canopy first felt the tremor of the Shattering.',
    bonuses: {
      hp: 260,
      atk: 42,
      healBonus: 0.16,
    },
    assetCard: '/assets/relics/relic_world_tree_tear.webp',
  },
  {
    id: 'relic_cinder_chain',
    name: 'Chain of the Cinder Warden',
    tier: 'SR',
    preferredRole: 'ASSAULT',
    passiveDesc:
      'Deals +18% bonus damage to enemies afflicted with Burn, Stun, or DEF Shred.',
    lore: 'Forged in the deep prison bastions of the Ashen Legion, each blackened link still hums with searing runes.',
    bonuses: {
      atk: 50,
      critRate: 0.06,
      dmgBonusVsDebuffed: 0.18,
    },
    assetCard: '/assets/relics/relic_cinder_chain.webp',
  },
  {
    id: 'relic_prism_aegis',
    name: 'Prism Aegis Core',
    tier: 'SR',
    preferredRole: 'TANK',
    passiveDesc:
      'Begin combat with a 15% Max HP Shield; increases Provoke duration by +1.5s.',
    lore: 'A faceted arcane crystal carried by Astral Sanctum vanguards to refract destructive beams across the frontline.',
    bonuses: {
      hp: 310,
      def: 42,
      shieldBonus: 0.12,
    },
    assetCard: '/assets/relics/relic_prism_aegis.webp',
  },
  {
    id: 'relic_dawnlight_lantern',
    name: 'Lantern of Dawnlight',
    tier: 'R',
    preferredRole: 'HEALER',
    passiveDesc:
      'Casting Skill 1 grants an extra +10% ATK Buff to healed allies for 5s.',
    lore: 'An expedition lantern carried by early Solaris scouts that refuses to dim inside Void storms.',
    bonuses: {
      hp: 180,
      atk: 28,
      healBonus: 0.1,
    },
    assetCard: '/assets/relics/relic_dawnlight_lantern.webp',
  },
];

export const RELIC_MAP: Record<string, RelicDef> = Object.fromEntries(
  RELICS.map((r) => [r.id, r]),
);
