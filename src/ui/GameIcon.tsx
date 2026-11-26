import React from 'react';
import type { EquipmentSlot } from '../types/game';

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
  | 'supply';

interface GameIconProps {
  name: GameIconName;
  className?: string;
  alt?: string;
}

/**
 * Renders Starlight Chasers' bespoke generated RPG menu icons (`/assets/icons/icon_<name>.webp`).
 */
export const GameIcon: React.FC<GameIconProps> = ({ name, className = 'w-6 h-6', alt = '' }) => {
  return (
    <img
      src={`/assets/icons/icon_${name}.webp`}
      alt={alt || name}
      className={`object-contain shrink-0 drop-shadow-[0_2px_6px_rgba(0,0,0,0.65)] ${className}`}
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
