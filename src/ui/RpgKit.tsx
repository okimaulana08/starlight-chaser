import React, { useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import gsap from 'gsap';
import { ArrowLeft } from 'lucide-react';
import { RARITY_COLORS } from '../data/equipment';
import { audioManager } from '../engine/AudioManager';
import type { EquipmentInstance, EquipmentSlot } from '../types/game';
import { EquipIcon, GameIcon, type GameIconName } from './GameIcon';

/**
 * Crisp inline SVG gold filigree corner accents for AAA Mobile RPG panels, sockets & loot tiles.
 */
export const CornerFiligree: React.FC<{
  color?: string;
  size?: number;
  opacity?: number;
}> = ({ color = '#f5c84c', size = 10, opacity = 0.72 }) => {
  const s = size;
  return (
    <div className="pointer-events-none absolute inset-0 z-10 overflow-hidden rounded-[inherit]">
      {/* Top-left */}
      <svg
        width={s}
        height={s}
        viewBox="0 0 12 12"
        className="absolute top-1 left-1"
        style={{ opacity }}
      >
        <path d="M1 11V2.5L2.5 1H11" fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" />
        <circle cx="2.5" cy="2.5" r="1.2" fill={color} />
      </svg>
      {/* Top-right */}
      <svg
        width={s}
        height={s}
        viewBox="0 0 12 12"
        className="absolute top-1 right-1 -scale-x-100"
        style={{ opacity }}
      >
        <path d="M1 11V2.5L2.5 1H11" fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" />
        <circle cx="2.5" cy="2.5" r="1.2" fill={color} />
      </svg>
      {/* Bottom-left */}
      <svg
        width={s}
        height={s}
        viewBox="0 0 12 12"
        className="absolute bottom-1 left-1 -scale-y-100"
        style={{ opacity }}
      >
        <path d="M1 11V2.5L2.5 1H11" fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" />
        <circle cx="2.5" cy="2.5" r="1.2" fill={color} />
      </svg>
      {/* Bottom-right */}
      <svg
        width={s}
        height={s}
        viewBox="0 0 12 12"
        className="absolute bottom-1 right-1 -scale-x-100 -scale-y-100"
        style={{ opacity }}
      >
        <path d="M1 11V2.5L2.5 1H11" fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" />
        <circle cx="2.5" cy="2.5" r="1.2" fill={color} />
      </svg>
    </div>
  );
};

/**
 * GSAP-powered smooth tactical count-up number for PWR, HP, ATK, DEF, Damage & Gold.
 */
export const AnimatedNumber: React.FC<{
  value: number;
  prefix?: string;
  suffix?: string;
  duration?: number;
  className?: string;
  startFromZero?: boolean;
}> = ({
  value,
  prefix = '',
  suffix = '',
  duration = 0.55,
  className = '',
  startFromZero = false,
}) => {
  const spanRef = useRef<HTMLSpanElement | null>(null);
  const currentRef = useRef<{ v: number }>({ v: startFromZero ? 0 : value });

  useEffect(() => {
    const el = spanRef.current;
    if (!el) return;
    const tween = gsap.to(currentRef.current, {
      v: value,
      duration,
      ease: 'power2.out',
      onUpdate: () => {
        if (spanRef.current) {
          spanRef.current.textContent = `${prefix}${Math.round(currentRef.current.v).toLocaleString()}${suffix}`;
        }
      },
    });
    return () => {
      tween.kill();
    };
  }, [value, prefix, suffix, duration]);

  return (
    <span ref={spanRef} className={`font-mono ${className}`}>
      {prefix}
      {Math.round(startFromZero ? 0 : value).toLocaleString()}
      {suffix}
    </span>
  );
};

export type RpgButtonVariant = 'emerald' | 'cyan' | 'violet' | 'rose' | 'gold' | 'slate';

const BTN_STYLES: Record<
  RpgButtonVariant,
  { bg: string; border: string; text: string; glow: string; rim: string }
> = {
  emerald: {
    bg: 'linear-gradient(180deg, rgba(16, 125, 92, 0.92) 0%, rgba(6, 78, 59, 0.96) 58%, rgba(4, 47, 38, 0.99) 100%)',
    border: 'rgba(52, 211, 153, 0.72)',
    text: '#d1fae5',
    glow: 'rgba(16, 185, 129, 0.34)',
    rim: 'rgba(167, 243, 208, 0.55)',
  },
  cyan: {
    bg: 'linear-gradient(180deg, rgba(14, 116, 144, 0.92) 0%, rgba(12, 74, 110, 0.96) 58%, rgba(8, 47, 73, 0.99) 100%)',
    border: 'rgba(56, 232, 255, 0.72)',
    text: '#cffafe',
    glow: 'rgba(56, 232, 255, 0.34)',
    rim: 'rgba(165, 243, 252, 0.55)',
  },
  violet: {
    bg: 'linear-gradient(180deg, rgba(126, 34, 206, 0.92) 0%, rgba(88, 28, 135, 0.96) 58%, rgba(59, 7, 100, 0.99) 100%)',
    border: 'rgba(217, 70, 239, 0.74)',
    text: '#f5d0fe',
    glow: 'rgba(192, 132, 252, 0.38)',
    rim: 'rgba(245, 208, 254, 0.55)',
  },
  rose: {
    bg: 'linear-gradient(180deg, rgba(159, 18, 57, 0.92) 0%, rgba(107, 15, 42, 0.96) 58%, rgba(68, 9, 28, 0.99) 100%)',
    border: 'rgba(251, 113, 133, 0.7)',
    text: '#ffe4e6',
    glow: 'rgba(244, 63, 94, 0.34)',
    rim: 'rgba(254, 205, 211, 0.52)',
  },
  gold: {
    bg: 'linear-gradient(180deg, #fef08a 0%, #f5c84c 38%, #d99116 78%, #a86104 100%)',
    border: '#fff7cc',
    text: '#0f172a',
    glow: 'rgba(245, 200, 76, 0.52)',
    rim: 'rgba(255, 255, 255, 0.85)',
  },
  slate: {
    bg: 'linear-gradient(180deg, rgba(30, 41, 78, 0.92) 0%, rgba(15, 23, 46, 0.96) 60%, rgba(9, 13, 28, 0.99) 100%)',
    border: 'rgba(148, 163, 184, 0.45)',
    text: '#e2e8f0',
    glow: 'rgba(148, 163, 184, 0.2)',
    rim: 'rgba(255, 255, 255, 0.24)',
  },
};

interface RpgButtonProps {
  variant?: RpgButtonVariant;
  size?: 'xs' | 'sm' | 'md';
  disabled?: boolean;
  title?: string;
  onClick?: (e: React.MouseEvent<HTMLButtonElement>) => void;
  className?: string;
  children: React.ReactNode;
}

/**
 * Tactile 3D beveled jewel/metallic RPG action button with top specular sheen & spring press.
 */
export const RpgButton: React.FC<RpgButtonProps> = ({
  variant = 'slate',
  size = 'sm',
  disabled = false,
  title,
  onClick,
  className = '',
  children,
}) => {
  const st = BTN_STYLES[variant];
  const pad =
    size === 'xs'
      ? 'px-2.5 py-1 text-[10px]'
      : size === 'md'
        ? 'px-4 py-2.5 text-xs'
        : 'px-3 py-2 text-[11px]';

  return (
    <motion.button
      type="button"
      disabled={disabled}
      title={title}
      onClick={onClick}
      whileHover={disabled ? undefined : { y: -1.5, filter: 'brightness(1.09)' }}
      whileTap={disabled ? undefined : { scale: 0.94, y: 0.5 }}
      transition={{ type: 'spring', stiffness: 460, damping: 24 }}
      className={`relative overflow-hidden rounded-xl font-bold tracking-wide flex items-center justify-center gap-1.5 select-none disabled:opacity-35 disabled:cursor-not-allowed ${pad} ${className}`}
      style={{
        background: st.bg,
        border: `1.5px solid ${st.border}`,
        color: st.text,
        boxShadow: `0 6px 16px rgba(0,0,0,0.58), 0 0 14px ${st.glow}, inset 0 1px 0 ${st.rim}, inset 0 -2px 0 rgba(2,6,23,0.72)`,
      }}
    >
      {/* Top glass specular highlight */}
      <span
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-1 top-0.5 h-[42%] rounded-t-lg opacity-35"
        style={{
          background: 'linear-gradient(180deg, rgba(255,255,255,0.55) 0%, transparent 100%)',
        }}
      />
      <span className="relative z-10 flex items-center justify-center gap-1.5">{children}</span>
    </motion.button>
  );
};

/**
 * Unified sculpted beveled Lobby / Back crest button matching RpgTabs geometry.
 */
export const RpgBackButton: React.FC<{
  onClick: () => void;
  label?: string;
}> = ({ onClick, label = 'Lobby' }) => (
  <motion.button
    type="button"
    onClick={() => {
      audioManager.playSfx('button');
      onClick();
    }}
    whileHover={{ y: -1, borderColor: 'rgba(253,224,71,0.75)' }}
    whileTap={{ scale: 0.94 }}
    transition={{ type: 'spring', stiffness: 440, damping: 24 }}
    className="relative overflow-hidden rounded-xl px-3 py-1.5 sm:py-2 text-xs font-display font-extrabold uppercase tracking-wider text-slate-100 hover:text-amber-300 flex items-center gap-1.5 shrink-0"
    style={{
      background:
        'linear-gradient(180deg, rgba(26, 37, 74, 0.94) 0%, rgba(11, 17, 38, 0.96) 100%)',
      border: '1.5px solid rgba(245, 200, 76, 0.36)',
      boxShadow:
        '0 6px 16px rgba(0,0,0,0.55), inset 0 1px 0 rgba(255,251,235,0.22), inset 0 -2px 0 rgba(2,6,23,0.75)',
    }}
  >
    <ArrowLeft className="w-4 h-4 text-amber-300" />
    <span className="hidden sm:inline">{label}</span>
  </motion.button>
);

export interface RpgTabItem<T extends string> {
  key: T;
  label: string;
  icon?: GameIconName;
  accent?: 'gold' | 'cyan';
}

interface RpgTabsProps<T extends string> {
  layoutId: string;
  items: RpgTabItem<T>[];
  value: T;
  onChange: (val: T) => void;
  fullWidth?: boolean;
  className?: string;
}

/**
 * Sculpted celestial segmented tab ribbon with Framer Motion `layoutId` spring-gliding crest.
 */
export function RpgTabs<T extends string>({
  layoutId,
  items,
  value,
  onChange,
  fullWidth = false,
  className = '',
}: RpgTabsProps<T>) {
  return (
    <div
      className={`relative inline-flex items-center gap-1 p-1 rounded-xl border border-amber-400/30 bg-slate-950/85 backdrop-blur-md shadow-[0_8px_22px_rgba(0,0,0,0.55),inset_0_1px_0_rgba(255,255,255,0.08)] ${
        fullWidth ? 'w-full' : ''
      } ${className}`}
    >
      {items.map((item) => {
        const active = item.key === value;
        const isCyan = item.accent === 'cyan';
        return (
          <button
            key={item.key}
            type="button"
            onClick={() => {
              if (!active) audioManager.playSfx('button');
              onChange(item.key);
            }}
            className={`relative z-10 ${
              fullWidth ? 'flex-1' : 'shrink-0'
            } px-3 sm:px-4 py-1.5 text-[11px] sm:text-xs font-display font-extrabold uppercase tracking-wider rounded-lg transition-colors flex items-center justify-center gap-1.5 ${
              active ? 'text-slate-950' : 'text-slate-300 hover:text-white'
            }`}
          >
            {active && (
              <motion.div
                layoutId={layoutId}
                transition={{ type: 'spring', stiffness: 420, damping: 32 }}
                className="absolute inset-0 rounded-lg -z-10"
                style={{
                  background: isCyan
                    ? 'linear-gradient(180deg, #a5f3fc 0%, #38e8ff 45%, #0284c7 100%)'
                    : 'linear-gradient(180deg, #fef08a 0%, #f5c84c 45%, #d97706 100%)',
                  border: isCyan ? '1px solid #ecfeff' : '1px solid #fffbeb',
                  boxShadow: isCyan
                    ? '0 0 18px rgba(56,232,255,0.55), inset 0 1px 0 rgba(255,255,255,0.85)'
                    : '0 0 18px rgba(245,200,76,0.55), inset 0 1px 0 rgba(255,255,255,0.85)',
                }}
              />
            )}
            {item.icon && <GameIcon name={item.icon} className="w-4 h-4" />}
            <span className="truncate">{item.label}</span>
          </button>
        );
      })}
    </div>
  );
}

const SLOT_DISPLAY_LABEL: Record<EquipmentSlot, string> = {
  WEAPON: 'WEAPON',
  ARMOR: 'ARMOR',
  ACCESSORY: 'CHARM',
  EMBLEM: 'EMBLEM',
};

/**
 * Ornate beveled equipment / relic jewel socket with inline SVG filigree & rarity radial backlight.
 */
export const RpgEquipSlot: React.FC<{
  slot?: EquipmentSlot;
  isRelic?: boolean;
  item?: EquipmentInstance | null;
  relicName?: string | null;
  selected: boolean;
  onClick: () => void;
}> = ({ slot, isRelic = false, item, relicName, selected, onClick }) => {
  const accentColor = isRelic
    ? '#e879f9'
    : item
      ? RARITY_COLORS[item.rarity]
      : selected
        ? '#f5c84c'
        : '#64748b';

  const label = isRelic ? 'RELIC' : slot ? SLOT_DISPLAY_LABEL[slot] : 'GEAR';
  const filled = isRelic ? Boolean(relicName) : Boolean(item);

  return (
    <motion.button
      type="button"
      onClick={() => {
        audioManager.playSfx('button');
        onClick();
      }}
      whileHover={{ x: -2, scale: 1.03 }}
      whileTap={{ scale: 0.95 }}
      transition={{ type: 'spring', stiffness: 460, damping: 26 }}
      className="relative sm:w-32 px-1.5 sm:px-2 py-1.5 rounded-xl text-left flex items-center gap-2 overflow-hidden backdrop-blur-md transition-colors"
      style={{
        background: selected
          ? `linear-gradient(135deg, ${accentColor}30 0%, rgba(14, 21, 48, 0.95) 60%, rgba(7, 10, 24, 0.98) 100%)`
          : 'linear-gradient(145deg, rgba(18, 26, 56, 0.9) 0%, rgba(7, 10, 24, 0.96) 100%)',
        border: `1.5px solid ${selected ? '#fde047' : filled ? `${accentColor}99` : 'rgba(100,116,139,0.42)'}`,
        boxShadow: selected
          ? `0 0 18px rgba(245,200,76,0.45), inset 0 1px 0 rgba(255,255,255,0.28)`
          : filled
            ? `0 6px 14px rgba(0,0,0,0.58), inset 0 0 14px ${accentColor}1f`
            : '0 6px 14px rgba(0,0,0,0.52)',
      }}
    >
      <CornerFiligree color={selected ? '#fde047' : accentColor} size={7} opacity={selected ? 0.9 : 0.45} />

      {/* Sculpted Square Jewel Socket Icon */}
      <div
        className="relative w-7 h-7 sm:w-8 sm:h-8 rounded-lg flex items-center justify-center shrink-0 overflow-hidden"
        style={{
          background: filled
            ? `radial-gradient(circle at 50% 45%, ${accentColor}44 0%, rgba(8, 12, 28, 0.96) 76%)`
            : 'rgba(8, 12, 26, 0.85)',
          border: `1px solid ${filled ? `${accentColor}88` : 'rgba(71, 85, 105, 0.5)'}`,
        }}
      >
        {isRelic ? (
          <GameIcon
            name="relic"
            className={`w-5 h-5 sm:w-6 sm:h-6 ${filled ? '' : 'opacity-40 grayscale'}`}
          />
        ) : slot ? (
          <EquipIcon
            slot={slot}
            className={`w-5 h-5 sm:w-6 sm:h-6 ${filled ? '' : 'opacity-35 grayscale'}`}
          />
        ) : null}
        {item && (
          <span
            className="absolute bottom-0 right-0 px-1 rounded-tl text-[8px] font-mono font-black leading-tight bg-slate-950/90"
            style={{ color: accentColor }}
          >
            +{item.enhanceLevel}
          </span>
        )}
      </div>

      {/* Label & Set Name */}
      <div className="min-w-0 flex-1">
        <div
          className="text-[7px] sm:text-[8px] font-display font-black uppercase tracking-[0.12em] leading-none truncate"
          style={{ color: isRelic ? '#f0abfc' : selected ? '#fde047' : '#94a3b8' }}
        >
          {label}
        </div>
        <div
          className="text-[9px] sm:text-[10px] font-bold truncate mt-0.5 leading-tight"
          style={{ color: filled ? (isRelic ? '#ffffff' : accentColor) : '#64748b' }}
        >
          {isRelic ? (relicName ?? 'Empty') : item ? item.setId.split('_')[0] : 'Empty'}
        </div>
      </div>
    </motion.button>
  );
};

interface RpgProgressBarProps {
  value: number;
  max: number;
  gradient?: string;
  glowColor?: string;
  heightClass?: string;
  milestonePct?: number;
  milestoneLabel?: string;
  animateFromZero?: boolean;
  delay?: number;
}

/**
 * Crystalline beveled RPG progress gauge with animated starlight shimmer, leading glow tip & milestone pin.
 */
export const RpgProgressBar: React.FC<RpgProgressBarProps> = ({
  value,
  max,
  gradient = 'linear-gradient(90deg, #38e8ff 0%, #c084fc 52%, #f5c84c 100%)',
  glowColor = 'rgba(245, 200, 76, 0.55)',
  heightClass = 'h-3',
  milestonePct,
  milestoneLabel,
  animateFromZero = false,
  delay = 0,
}) => {
  const pct = Math.max(0, Math.min(100, (value / Math.max(1, max)) * 100));

  return (
    <div className="relative">
      <div
        className={`relative w-full ${heightClass} rounded-full overflow-hidden p-[2px]`}
        style={{
          background: 'linear-gradient(180deg, rgba(4, 7, 18, 0.96) 0%, rgba(17, 25, 52, 0.9) 100%)',
          border: '1px solid rgba(245, 200, 76, 0.34)',
          boxShadow: 'inset 0 2px 6px rgba(0,0,0,0.85), 0 1px 0 rgba(255,255,255,0.1)',
        }}
      >
        <motion.div
          initial={animateFromZero ? { width: '0%' } : false}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 0.72, delay, ease: [0.22, 1, 0.36, 1] }}
          className="relative h-full rounded-full overflow-hidden"
          style={{
            background: gradient,
            boxShadow: pct > 1 ? `0 0 14px ${glowColor}` : 'none',
          }}
        >
          {/* Animated diagonal energy sheen */}
          <div className="absolute inset-0 rpg-gauge-energy" />
          {/* Top glossy rim */}
          <div className="absolute inset-x-0 top-0 h-[42%] bg-gradient-to-b from-white/45 to-transparent rounded-full" />
          {/* Leading starlight tip */}
          {pct > 3 && (
            <div className="absolute right-0 top-1/2 -translate-y-1/2 w-2.5 h-full rounded-full bg-white/90 blur-[1px]" />
          )}
        </motion.div>

        {/* Optional milestone pin (e.g. Soft Pity @60) */}
        {milestonePct !== undefined && (
          <div
            className="pointer-events-none absolute top-0 bottom-0 w-[2px] bg-amber-300/90 shadow-[0_0_8px_#fde047]"
            style={{ left: `${milestonePct}%` }}
            title={milestoneLabel}
          />
        )}
      </div>
    </div>
  );
};

interface RpgLootTileProps {
  color: string;
  topTag?: string;
  bottomLabel: string;
  subLabel?: string;
  selected?: boolean;
  onClick?: () => void;
  title?: string;
  index?: number;
  children: React.ReactNode;
}

/**
 * Beveled RPG Treasure Loot Tile with SVG gold corner filigree, glass sheen & Framer Motion cascade drop-in.
 */
export const RpgLootTile: React.FC<RpgLootTileProps> = ({
  color,
  topTag,
  bottomLabel,
  subLabel,
  selected = false,
  onClick,
  title,
  index = 0,
  children,
}) => {
  const Tag = onClick ? motion.button : motion.div;
  return (
    <Tag
      type={onClick ? 'button' : undefined}
      onClick={onClick}
      title={title}
      initial={{ opacity: 0, y: 14, scale: 0.84 }}
      animate={{ opacity: 1, y: 0, scale: selected ? 1.06 : 1 }}
      whileHover={onClick ? { y: -2, scale: 1.07 } : { y: -1.5 }}
      whileTap={onClick ? { scale: 0.94 } : undefined}
      transition={{
        type: 'spring',
        stiffness: 380,
        damping: 24,
        delay: 0.25 + index * 0.06,
      }}
      className={`ls-victory-tile rpg-glass-sheen relative w-16 h-16 sm:w-[76px] sm:h-[76px] rounded-xl overflow-hidden flex flex-col items-center justify-center ${
        selected ? 'ring-2 ring-amber-200' : ''
      } ${onClick ? 'cursor-pointer' : ''}`}
      style={{
        background: `radial-gradient(circle at 50% 38%, ${color}33 0%, rgba(12, 18, 40, 0.96) 62%, rgba(5, 8, 20, 0.99) 100%)`,
        border: `1.5px solid ${selected ? '#fffbeb' : `${color}b8`}`,
        boxShadow: selected
          ? `0 0 24px ${color}88, inset 0 1px 0 rgba(255,255,255,0.4)`
          : `0 8px 18px rgba(0,0,0,0.65), 0 0 14px ${color}30, inset 0 1px 0 rgba(255,255,255,0.22)`,
      }}
    >
      <CornerFiligree color={selected ? '#fef08a' : color} size={8} opacity={0.75} />
      {topTag && (
        <span
          className="absolute top-0.5 left-1.5 z-20 text-[8px] font-display font-black uppercase tracking-wider"
          style={{ color }}
        >
          {topTag}
        </span>
      )}
      <div className="relative z-10 flex flex-col items-center justify-center pb-2.5">
        {children}
        {subLabel && (
          <span className="text-[8px] uppercase text-slate-300/90 font-bold leading-none mt-0.5">
            {subLabel}
          </span>
        )}
      </div>
      <span
        className="absolute bottom-0 inset-x-0 z-20 bg-gradient-to-t from-black/95 via-black/85 to-transparent text-[9px] sm:text-[10px] font-mono font-bold text-center leading-tight py-0.5 px-1 truncate"
        style={{ color }}
      >
        {bottomLabel}
      </span>
    </Tag>
  );
};
