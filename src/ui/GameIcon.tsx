import React, { useState } from 'react';
import { MATERIAL_META } from '../data/materials';
import type { EquipmentSlot, MaterialKey } from '../types/game';

export type GameIconName =
  | 'battle'
  | 'heroes'
  | 'summon'
  | 'codex'
  | 'forge'
  | 'worldmap'
  | 'crystal'
  | 'gold'
  | 'relic'
  | 'supply'
  | 'shop'
  | 'reward_chest'
  | 'star_dust';

interface GameIconProps {
  name: GameIconName;
  className?: string;
  alt?: string;
}

/**
 * Renders Starlight Chasers' bespoke generated RPG menu icons (`/assets/icons/icon_<name>.webp`)
 * with safe fallback if an asset is still loading or newly introduced.
 */
export const GameIcon: React.FC<GameIconProps> = ({ name, className = 'w-6 h-6', alt = '' }) => {
  const [failed, setFailed] = useState(false);
  const primarySrc =
    name === 'star_dust'
      ? '/assets/icons/mat_star_dust.webp'
      : `/assets/icons/icon_${name}.webp`;
  const src =
    failed && (name === 'shop' || name === 'reward_chest')
      ? '/assets/icons/icon_supply.webp'
      : failed && name === 'star_dust'
        ? '/assets/icons/icon_crystal.webp'
        : primarySrc;
  return (
    <img
      src={src}
      alt={alt || name}
      onError={() => {
        if (!failed) setFailed(true);
      }}
      className={`object-contain shrink-0 drop-shadow-[0_2px_6px_rgba(0,0,0,0.65)] ${className}`}
      draggable={false}
    />
  );
};

interface MaterialIconProps {
  material: MaterialKey;
  className?: string;
}

/**
 * Renders hand-painted RPG material icons (4 Faction Essences, Starlight Core, Star-Iron Ingot,
 * Astral Anvil Core, Relic Fragments, etc.) with automatic fallback to core menu icons.
 */
export const MaterialIcon: React.FC<MaterialIconProps> = ({ material, className = 'w-6 h-6' }) => {
  const meta = MATERIAL_META[material];
  const [failed, setFailed] = useState(false);

  if (failed) {
    return (
      <span
        className={`inline-flex items-center justify-center rounded-lg border ${className}`}
        style={{
          borderColor: `${meta.color}88`,
          background: `radial-gradient(circle, ${meta.color}40 0%, rgba(8,12,26,0.9) 75%)`,
          boxShadow: `0 0 10px ${meta.color}44`,
        }}
      >
        <GameIcon name={meta.fallbackIcon} className="w-[82%] h-[82%]" alt={meta.name} />
      </span>
    );
  }

  return (
    <img
      src={meta.iconAsset}
      alt={meta.name}
      onError={() => setFailed(true)}
      className={`object-contain shrink-0 drop-shadow-[0_2px_6px_rgba(0,0,0,0.7)] ${className}`}
      draggable={false}
    />
  );
};

const EQUIP_ICON_MAP: Record<EquipmentSlot, string> = {
  WEAPON: '/assets/icons/equip_weapon.webp',
  ARMOR: '/assets/icons/equip_armor.webp',
  ACCESSORY: '/assets/icons/equip_accessory.webp',
  EMBLEM: '/assets/icons/equip_boot.webp',
};

interface EquipIconProps {
  slot: EquipmentSlot;
  className?: string;
  alt?: string;
}

/**
 * Renders Starlight Chasers' hand-painted transparent RPG equipment icons for Weapon, Armor, Accessory & Emblem slots.
 */
export const EquipIcon: React.FC<EquipIconProps> = ({ slot, className = 'w-7 h-7', alt }) => {
  return (
    <img
      src={EQUIP_ICON_MAP[slot]}
      alt={alt || slot}
      className={`object-contain shrink-0 drop-shadow-[0_3px_8px_rgba(0,0,0,0.75)] ${className}`}
      draggable={false}
    />
  );
};
