import React from 'react';
import type { CommissionReward } from '../data/commissions';
import { MATERIAL_META } from '../data/materials';
import type { MaterialKey } from '../types/game';
import { GameIcon, MaterialIcon, type GameIconName } from './GameIcon';
import { CornerFiligree } from './RpgKit';

export interface VisualRewardEntry {
  key: string;
  label: string;
  qtyText: string;
  color: string;
  rarityLabel?: string;
  iconKind: 'GAME' | 'MATERIAL' | 'ALL_ESSENCES' | 'CRATE';
  gameIcon?: GameIconName;
  materialKey?: MaterialKey;
  crateRarity?: 'EPIC' | 'LEGENDARY';
}

export function formatCompactQty(n: number): string {
  if (n >= 1000000) return `${(n / 1000000).toFixed(1).replace(/\.0$/, '')}M`;
  if (n >= 10000) return `${Math.round(n / 1000)}K`;
  if (n >= 1000) return `${(n / 1000).toFixed(1).replace(/\.0$/, '')}K`;
  return n.toLocaleString();
}

export function buildVisualRewards(
  reward: CommissionReward,
  opts?: { allFactionEssences?: number },
): VisualRewardEntry[] {
  const list: VisualRewardEntry[] = [];

  if (reward.crystals) {
    list.push({
      key: 'crystals',
      label: `Starlight Crystals ×${reward.crystals.toLocaleString()}`,
      qtyText: `×${formatCompactQty(reward.crystals)}`,
      color: '#38e8ff',
      iconKind: 'GAME',
      gameIcon: 'crystal',
    });
  }
  if (reward.gearCrateRarity) {
    const isLeg = reward.gearCrateRarity === 'LEGENDARY';
    list.push({
      key: `crate_${reward.gearCrateRarity}`,
      label: `${isLeg ? 'Legendary' : 'Epic'} Equipment Crate ×1`,
      qtyText: isLeg ? 'LEG' : 'EPIC',
      color: isLeg ? '#fde047' : '#c084fc',
      rarityLabel: isLeg ? 'SSR' : 'SR',
      iconKind: 'CRATE',
      crateRarity: reward.gearCrateRarity,
    });
  }
  if (reward.astralAnvilCores) {
    list.push({
      key: 'astralAnvilCores',
      label: `${MATERIAL_META.astralAnvilCores.name} ×${reward.astralAnvilCores}`,
      qtyText: `×${reward.astralAnvilCores}`,
      color: MATERIAL_META.astralAnvilCores.color,
      iconKind: 'MATERIAL',
      materialKey: 'astralAnvilCores',
    });
  }
  if (reward.starCores) {
    list.push({
      key: 'starCores',
      label: `${MATERIAL_META.starCores.name} ×${reward.starCores}`,
      qtyText: `×${reward.starCores}`,
      color: MATERIAL_META.starCores.color,
      iconKind: 'MATERIAL',
      materialKey: 'starCores',
    });
  }
  if (opts?.allFactionEssences && opts.allFactionEssences > 0) {
    list.push({
      key: 'all_essences',
      label: `All 4 Faction Essences ×${opts.allFactionEssences} each`,
      qtyText: `×${opts.allFactionEssences}×4`,
      color: '#f5c84c',
      iconKind: 'ALL_ESSENCES',
    });
  }
  if (reward.relicFragments) {
    list.push({
      key: 'relicFragments',
      label: `${MATERIAL_META.relicFragments.name} ×${reward.relicFragments}`,
      qtyText: `×${reward.relicFragments}`,
      color: MATERIAL_META.relicFragments.color,
      iconKind: 'MATERIAL',
      materialKey: 'relicFragments',
    });
  }
  if (reward.dungeonTickets) {
    list.push({
      key: 'dungeonTickets',
      label: `Rift Dungeon Tickets ×${reward.dungeonTickets}`,
      qtyText: `×${reward.dungeonTickets}`,
      color: '#e879f9',
      iconKind: 'GAME',
      gameIcon: 'dungeon_ticket',
    });
  }
  if (reward.starIronIngots) {
    list.push({
      key: 'starIronIngots',
      label: `${MATERIAL_META.starIronIngots.name} ×${reward.starIronIngots}`,
      qtyText: `×${reward.starIronIngots}`,
      color: MATERIAL_META.starIronIngots.color,
      iconKind: 'MATERIAL',
      materialKey: 'starIronIngots',
    });
  }
  if (reward.forgeStones) {
    list.push({
      key: 'forgeStones',
      label: `${MATERIAL_META.forgeStones.name} ×${reward.forgeStones}`,
      qtyText: `×${reward.forgeStones}`,
      color: MATERIAL_META.forgeStones.color,
      iconKind: 'MATERIAL',
      materialKey: 'forgeStones',
    });
  }
  if (reward.bondGifts) {
    list.push({
      key: 'bondGifts',
      label: `${MATERIAL_META.bondGifts.name} ×${reward.bondGifts}`,
      qtyText: `×${reward.bondGifts}`,
      color: MATERIAL_META.bondGifts.color,
      iconKind: 'MATERIAL',
      materialKey: 'bondGifts',
    });
  }
  if (reward.expPotions) {
    list.push({
      key: 'expPotions',
      label: `${MATERIAL_META.expPotions.name} ×${reward.expPotions}`,
      qtyText: `×${reward.expPotions}`,
      color: MATERIAL_META.expPotions.color,
      iconKind: 'MATERIAL',
      materialKey: 'expPotions',
    });
  }
  if (reward.gold) {
    list.push({
      key: 'gold',
      label: `Gold ×${reward.gold.toLocaleString()}`,
      qtyText: formatCompactQty(reward.gold),
      color: '#fbbf24',
      iconKind: 'GAME',
      gameIcon: 'gold',
    });
  }

  return list;
}

interface RewardItemTileProps {
  entry: VisualRewardEntry;
  size?: 'xs' | 'sm' | 'md' | 'lg';
  claimed?: boolean;
}

/**
 * Tactile jewel-framed mobile RPG Item Slot Tile displaying real hand-painted WebP icons,
 * rarity radial aura glow, filigree corners, and crisp bottom quantity badge.
 */
export const RewardItemTile: React.FC<RewardItemTileProps> = ({
  entry,
  size = 'sm',
  claimed = false,
}) => {
  const boxCls =
    size === 'xs'
      ? 'w-9 h-9 rounded-lg'
      : size === 'sm'
        ? 'w-11 h-11 rounded-xl'
        : size === 'md'
          ? 'w-[54px] h-[54px] rounded-xl'
          : 'w-[68px] h-[68px] rounded-2xl';

  const iconCls =
    size === 'xs'
      ? 'w-6 h-6'
      : size === 'sm'
        ? 'w-7 h-7'
        : size === 'md'
          ? 'w-9 h-9'
          : 'w-12 h-12';

  const qtyCls =
    size === 'xs'
      ? 'text-[8px] py-0'
      : size === 'sm'
        ? 'text-[9px] py-[1px]'
        : size === 'md'
          ? 'text-[10px] py-[1px]'
          : 'text-[11px] py-0.5';

  return (
    <div
      title={entry.label}
      className={`relative shrink-0 overflow-hidden flex items-center justify-center select-none transition-transform hover:scale-105 ${boxCls} ${
        claimed ? 'opacity-65 saturate-75' : ''
      }`}
      style={{
        background: `radial-gradient(circle at 50% 35%, ${entry.color}42 0%, rgba(12, 18, 42, 0.96) 66%, rgba(5, 8, 22, 0.99) 100%)`,
        border: `1.5px solid ${entry.color}cc`,
        boxShadow: claimed
          ? 'inset 0 1px 0 rgba(255,255,255,0.12)'
          : `0 6px 14px rgba(0,0,0,0.6), 0 0 12px ${entry.color}36, inset 0 1px 0 rgba(255,255,255,0.28)`,
      }}
    >
      {size !== 'xs' && <CornerFiligree color={entry.color} size={size === 'lg' ? 9 : 6} opacity={0.7} />}

      {/* Glossy top sheen */}
      <div
        className="pointer-events-none absolute inset-x-0 top-0 h-[40%] opacity-30"
        style={{ background: 'linear-gradient(180deg, rgba(255,255,255,0.65), transparent)' }}
      />

      {/* Real WebP Item Artwork */}
      <div className="relative z-10 pb-2 flex items-center justify-center">
        {entry.iconKind === 'GAME' && entry.gameIcon && (
          <GameIcon name={entry.gameIcon} className={iconCls} alt={entry.label} />
        )}
        {entry.iconKind === 'MATERIAL' && entry.materialKey && (
          <MaterialIcon material={entry.materialKey} className={iconCls} />
        )}
        {entry.iconKind === 'CRATE' && (
          <GameIcon name="reward_chest" className={iconCls} alt={entry.label} />
        )}
        {entry.iconKind === 'ALL_ESSENCES' && (
          <div className="grid grid-cols-2 gap-0.5 p-0.5">
            <MaterialIcon material="essence_SOLARIS" className={size === 'lg' ? 'w-5 h-5' : 'w-3.5 h-3.5'} />
            <MaterialIcon material="essence_ASTRAL" className={size === 'lg' ? 'w-5 h-5' : 'w-3.5 h-3.5'} />
            <MaterialIcon material="essence_VERDANT" className={size === 'lg' ? 'w-5 h-5' : 'w-3.5 h-3.5'} />
            <MaterialIcon material="essence_ASHEN" className={size === 'lg' ? 'w-5 h-5' : 'w-3.5 h-3.5'} />
          </div>
        )}
      </div>

      {/* Crisp bottom quantity pill */}
      <span
        className={`absolute bottom-0 inset-x-0 z-20 bg-gradient-to-t from-black/95 via-black/85 to-black/35 font-mono font-black text-center leading-tight px-0.5 truncate ${qtyCls}`}
        style={{ color: entry.color }}
      >
        {entry.qtyText}
      </span>
    </div>
  );
};

interface RewardStripProps {
  reward: CommissionReward;
  allFactionEssences?: number;
  size?: 'xs' | 'sm' | 'md' | 'lg';
  claimed?: boolean;
  className?: string;
}

export const RewardItemStrip: React.FC<RewardStripProps> = ({
  reward,
  allFactionEssences,
  size = 'sm',
  claimed = false,
  className = '',
}) => {
  const entries = buildVisualRewards(reward, { allFactionEssences });
  return (
    <div className={`flex flex-wrap items-center gap-1.5 ${className}`}>
      {entries.map((e) => (
        <RewardItemTile key={e.key} entry={e} size={size} claimed={claimed} />
      ))}
    </div>
  );
};
