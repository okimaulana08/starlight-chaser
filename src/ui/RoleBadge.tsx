import React from 'react';
import type { Role, Tier } from '../types/game';

export const ROLE_META: Record<
  Role,
  { label: string; asset: string; color: string; bg: string; border: string }
> = {
  TANK: {
    label: 'Tank',
    asset: '/assets/icons/role_tank.webp',
    color: '#60a5fa',
    bg: 'rgba(15, 32, 74, 0.92)',
    border: 'rgba(96, 165, 250, 0.78)',
  },
  ASSAULT: {
    label: 'Assault',
    asset: '/assets/icons/role_assault.webp',
    color: '#fb7185',
    bg: 'rgba(64, 12, 28, 0.92)',
    border: 'rgba(251, 113, 133, 0.78)',
  },
  RANGER: {
    label: 'Ranger',
    asset: '/assets/icons/role_ranger.webp',
    color: '#34d399',
    bg: 'rgba(6, 44, 34, 0.92)',
    border: 'rgba(52, 211, 153, 0.78)',
  },
  MAGE: {
    label: 'Mage',
    asset: '/assets/icons/role_mage.webp',
    color: '#c084fc',
    bg: 'rgba(42, 16, 78, 0.92)',
    border: 'rgba(192, 132, 252, 0.78)',
  },
  HEALER: {
    label: 'Healer',
    asset: '/assets/icons/role_healer.webp',
    color: '#2dd4bf',
    bg: 'rgba(10, 44, 42, 0.92)',
    border: 'rgba(45, 212, 191, 0.78)',
  },
};

interface RoleBadgeProps {
  role: Role;
  /** 'medallion' = circular floating emblem with tooltip; 'pill' = crest + styled text label */
  variant?: 'medallion' | 'pill';
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

/**
 * Illustrated Class/Job Badge using Starlight Chasers' bespoke generated role crest emblems.
 */
export const RoleBadge: React.FC<RoleBadgeProps> = ({
  role,
  variant = 'medallion',
  size = 'md',
  className = '',
}) => {
  const meta = ROLE_META[role];

  if (variant === 'pill') {
    const iconCls = size === 'sm' ? 'w-4 h-4' : size === 'lg' ? 'w-6 h-6' : 'w-5 h-5';
    const textCls = size === 'sm' ? 'text-[9px]' : size === 'lg' ? 'text-xs' : 'text-[10px]';
    return (
      <span
        title={`${meta.label} Class`}
        className={`inline-flex items-center gap-1.5 pl-1 pr-2 py-0.5 rounded-full border backdrop-blur-md shadow-[0_2px_10px_rgba(0,0,0,0.7)] ${className}`}
        style={{
          background: meta.bg,
          borderColor: meta.border,
          boxShadow: `0 0 12px ${meta.color}33, inset 0 1px 0 rgba(255,255,255,0.22)`,
        }}
      >
        <img
          src={meta.asset}
          alt={meta.label}
          className={`${iconCls} object-contain shrink-0 drop-shadow-[0_1px_3px_rgba(0,0,0,0.85)]`}
          draggable={false}
        />
        <span
          className={`${textCls} font-display font-extrabold uppercase tracking-[0.14em] leading-none`}
          style={{ color: meta.color }}
        >
          {meta.label}
        </span>
      </span>
    );
  }

  const boxCls =
    size === 'sm'
      ? 'w-7 h-7 p-0.5'
      : size === 'lg'
        ? 'w-11 h-11 p-1'
        : 'w-9 h-9 p-0.5';

  return (
    <div
      title={`${meta.label} Class`}
      className={`relative rounded-full flex items-center justify-center border-[1.5px] backdrop-blur-md shrink-0 ${boxCls} ${className}`}
      style={{
        background: `radial-gradient(circle at 30% 25%, ${meta.color}35, ${meta.bg} 78%)`,
        borderColor: meta.border,
        boxShadow: `0 4px 14px rgba(0,0,0,0.75), 0 0 14px ${meta.color}44, inset 0 1px 1px rgba(255,255,255,0.35)`,
      }}
    >
      <img
        src={meta.asset}
        alt={meta.label}
        className="w-full h-full object-contain drop-shadow-[0_2px_4px_rgba(0,0,0,0.85)]"
        draggable={false}
      />
    </div>
  );
};

interface RarityCrestProps {
  tier: Tier;
  size?: 'xs' | 'sm' | 'md' | 'lg';
  showStars?: boolean;
  className?: string;
}

/**
 * Aesthetic Sculpted Foil Typography Crest for SSR / SR / R rarity emblems.
 */
export const RarityCrest: React.FC<RarityCrestProps> = ({
  tier,
  size = 'md',
  showStars = false,
  className = '',
}) => {
  const starCount = tier === 'SSR' ? 5 : tier === 'SR' ? 4 : 3;

  const textSize =
    size === 'xs'
      ? 'text-[11px] tracking-[0.06em]'
      : size === 'sm'
        ? 'text-sm tracking-[0.08em]'
        : size === 'lg'
          ? 'text-2xl tracking-[0.1em]'
          : 'text-base sm:text-lg tracking-[0.08em]';

  const padCls =
    size === 'xs'
      ? 'px-1.5 py-0.5'
      : size === 'sm'
        ? 'px-2 py-0.5'
        : size === 'lg'
          ? 'px-3.5 py-1'
          : 'px-2.5 py-0.5';

  const plaqueStyle: Record<Tier, React.CSSProperties> = {
    SSR: {
      background:
        'linear-gradient(125deg, rgba(24,14,4,0.92) 0%, rgba(56,28,8,0.88) 55%, rgba(28,12,42,0.92) 100%)',
      borderColor: 'rgba(253, 224, 71, 0.85)',
      boxShadow:
        '0 4px 16px rgba(0,0,0,0.75), 0 0 18px rgba(245,200,76,0.45), inset 0 1px 0 rgba(255,251,235,0.55)',
    },
    SR: {
      background:
        'linear-gradient(125deg, rgba(22,8,44,0.92) 0%, rgba(54,18,92,0.88) 60%, rgba(18,12,48,0.92) 100%)',
      borderColor: 'rgba(192, 132, 252, 0.82)',
      boxShadow:
        '0 4px 14px rgba(0,0,0,0.72), 0 0 14px rgba(168,85,247,0.42), inset 0 1px 0 rgba(245,208,254,0.4)',
    },
    R: {
      background:
        'linear-gradient(125deg, rgba(8,22,42,0.92) 0%, rgba(14,48,78,0.86) 60%, rgba(8,18,36,0.92) 100%)',
      borderColor: 'rgba(125, 211, 252, 0.72)',
      boxShadow:
        '0 4px 12px rgba(0,0,0,0.7), 0 0 10px rgba(56,189,248,0.32), inset 0 1px 0 rgba(224,242,254,0.35)',
    },
  };

  const textClass =
    tier === 'SSR'
      ? 'rarity-text-ssr'
      : tier === 'SR'
        ? 'rarity-text-sr'
        : 'rarity-text-r';

  return (
    <div className={`inline-flex flex-col items-start gap-0.5 ${className}`}>
      <div
        className={`relative inline-flex items-center gap-1 border backdrop-blur-md ${padCls}`}
        style={{
          ...plaqueStyle[tier],
          clipPath: 'polygon(6px 0%, 100% 0%, calc(100% - 6px) 100%, 0% 100%)',
        }}
      >
        {tier === 'SSR' && (
          <span className="text-[9px] text-amber-200 animate-pulse leading-none select-none">✦</span>
        )}
        <span
          className={`font-rarity font-black leading-none inline-block -skew-x-12 pr-0.5 ${textSize} ${textClass}`}
        >
          {tier}
        </span>
        {tier === 'SSR' && (
          <span className="text-[8px] text-cyan-200 animate-pulse leading-none select-none">✦</span>
        )}
      </div>

      {showStars && (
        <div className="flex items-center gap-[1px] pl-1">
          {Array.from({ length: starCount }, (_, i) => (
            <span
              key={i}
              className="text-[8px] leading-none"
              style={{
                color: tier === 'SSR' ? '#fde047' : tier === 'SR' ? '#d8b4fe' : '#7dd3fc',
                textShadow:
                  tier === 'SSR'
                    ? '0 0 6px rgba(253,224,71,0.9)'
                    : tier === 'SR'
                      ? '0 0 5px rgba(192,132,252,0.85)'
                      : '0 0 4px rgba(56,189,248,0.7)',
              }}
            >
              ★
            </span>
          ))}
        </div>
      )}
    </div>
  );
};
