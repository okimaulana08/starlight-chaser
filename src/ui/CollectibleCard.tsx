import React from 'react';
import { Lock } from 'lucide-react';
import type { Role, Tier } from '../types/game';
import { ArtImage } from './ArtImage';
import { RarityCrest, RoleBadge } from './RoleBadge';

export interface CollectibleCardProps {
  kind: 'HERO' | 'RELIC' | 'PET';
  id: string;
  src: string;
  name: string;
  subtitle?: string;
  tier: Tier;
  role?: Role;
  transcended?: boolean;
  locked?: boolean;
  isNew?: boolean;
  topBannerLabel?: string;
  compact?: boolean;
  interactive?: boolean;
  onClick?: () => void;
  footerExtra?: React.ReactNode;
  className?: string;
}

const TIER_PALETTE: Record<
  Tier,
  {
    accent: string;
    secondary: string;
    innerBorder: string;
    vignetteTop: string;
    vignetteBottom: string;
    nameColor: string;
    titleColor: string;
  }
> = {
  UR: {
    accent: '#ffffff',
    secondary: '#e879f9',
    innerBorder: 'rgba(255, 255, 255, 0.78)',
    vignetteTop:
      'radial-gradient(ellipse 100% 52% at 50% 0%, rgba(253, 224, 71, 0.34) 0%, rgba(232, 121, 249, 0.22) 38%, rgba(56, 232, 255, 0.14) 68%, transparent 100%)',
    vignetteBottom:
      'linear-gradient(to top, rgba(14, 4, 28, 0.97) 0%, rgba(36, 12, 66, 0.82) 28%, rgba(232, 121, 249, 0.18) 54%, transparent 78%)',
    nameColor: '#ffffff',
    titleColor: '#f5d0fe',
  },
  SSR: {
    accent: '#fde047',
    secondary: '#38e8ff',
    innerBorder: 'rgba(253, 224, 71, 0.58)',
    vignetteTop:
      'radial-gradient(ellipse 95% 48% at 50% 0%, rgba(253, 224, 71, 0.28) 0%, rgba(244, 114, 182, 0.1) 48%, transparent 100%)',
    vignetteBottom:
      'linear-gradient(to top, rgba(16, 8, 2, 0.96) 0%, rgba(34, 18, 8, 0.78) 28%, rgba(245, 158, 11, 0.1) 52%, transparent 74%)',
    nameColor: '#fffbeb',
    titleColor: '#fde68a',
  },
  SR: {
    accent: '#d8b4fe',
    secondary: '#a855f7',
    innerBorder: 'rgba(192, 132, 252, 0.52)',
    vignetteTop:
      'radial-gradient(ellipse 90% 44% at 50% 0%, rgba(192, 132, 252, 0.28) 0%, rgba(99, 102, 241, 0.1) 52%, transparent 100%)',
    vignetteBottom:
      'linear-gradient(to top, rgba(14, 5, 28, 0.96) 0%, rgba(32, 12, 58, 0.78) 28%, rgba(168, 85, 247, 0.12) 52%, transparent 74%)',
    nameColor: '#faf5ff',
    titleColor: '#e9d5ff',
  },
  R: {
    accent: '#7dd3fc',
    secondary: '#38bdf8',
    innerBorder: 'rgba(125, 211, 252, 0.44)',
    vignetteTop:
      'radial-gradient(ellipse 85% 40% at 50% 0%, rgba(56, 189, 248, 0.22) 0%, transparent 100%)',
    vignetteBottom:
      'linear-gradient(to top, rgba(5, 13, 28, 0.96) 0%, rgba(10, 28, 52, 0.78) 28%, rgba(56, 189, 248, 0.08) 50%, transparent 72%)',
    nameColor: '#f0f9ff',
    titleColor: '#bae6fd',
  },
};

const MOTE_SEEDS = [
  { left: '14%', bottom: '18%', delay: '0s', dur: '3.2s', size: 4 },
  { left: '34%', bottom: '26%', delay: '1.1s', dur: '3.8s', size: 3 },
  { left: '66%', bottom: '20%', delay: '0.5s', dur: '3.4s', size: 4 },
  { left: '84%', bottom: '30%', delay: '1.9s', dur: '4.1s', size: 3 },
  { left: '50%', bottom: '14%', delay: '2.5s', dur: '3.6s', size: 3.5 },
  { left: '22%', bottom: '44%', delay: '0.8s', dur: '2.9s', size: 4.5 },
  { left: '76%', bottom: '52%', delay: '1.6s', dur: '3.1s', size: 4 },
  { left: '46%', bottom: '36%', delay: '2.1s', dur: '3.5s', size: 4.5 },
];

/**
 * Ornate SVG Corner Filigree & Inner Cathedral Bevel customized per rarity tier.
 */
const FiligreeOverlay: React.FC<{ tier: Tier; compact?: boolean }> = ({ tier, compact }) => {
  const stroke =
    tier === 'UR'
      ? '#fff7cc'
      : tier === 'SSR'
        ? '#fde047'
        : tier === 'SR'
          ? '#d8b4fe'
          : '#7dd3fc';
  const strokeSub =
    tier === 'UR'
      ? '#e879f9'
      : tier === 'SSR'
        ? '#38e8ff'
        : tier === 'SR'
          ? '#a855f7'
          : '#38bdf8';

  return (
    <svg
      viewBox="0 0 300 400"
      preserveAspectRatio="none"
      className="pointer-events-none absolute inset-0 w-full h-full z-20"
    >
      {/* Inner recessed hairline bevel */}
      <path
        d="M 16 7 L 284 7 L 293 16 L 293 384 L 284 393 L 16 393 L 7 384 L 7 16 Z"
        fill="none"
        stroke={stroke}
        strokeOpacity={tier === 'UR' ? 0.92 : tier === 'SSR' ? 0.65 : tier === 'SR' ? 0.5 : 0.4}
        strokeWidth={tier === 'UR' ? (compact ? 2.2 : 1.9) : compact ? 1.8 : 1.4}
      />

      {/* UR Almighty Inner Celestial Second Frame & Twin Astrolabe Crown Wings */}
      {tier === 'UR' && (
        <g>
          <path
            d="M 22 13 L 278 13 L 287 22 L 287 378 L 278 387 L 22 387 L 13 378 L 13 22 Z"
            fill="none"
            stroke="#38e8ff"
            strokeOpacity="0.52"
            strokeWidth="1"
            strokeDasharray="6 4"
          />
          {/* Grand Sovereign Celestial Crown Apex */}
          <path d="M 96 7 L 130 16 L 150 24 L 170 16 L 204 7" fill="none" stroke="#fde047" strokeWidth="2.2" />
          <path d="M 118 12 L 150 21 L 182 12" fill="none" stroke="#e879f9" strokeWidth="1.5" strokeOpacity="0.95" />
          <polygon points="150,2 159,12 150,22 141,12" fill="#fde047" />
          <polygon points="150,5 155,12 150,19 145,12" fill="#ffffff" />
          <polygon points="122,9 127,13 122,17 117,13" fill="#38e8ff" />
          <polygon points="178,9 183,13 178,17 173,13" fill="#e879f9" />
          {/* Side Starlight Pillar Wing Accents */}
          <polygon points="4,200 10,190 14,200 10,210" fill="#fde047" fillOpacity="0.9" />
          <polygon points="296,200 290,190 286,200 290,210" fill="#fde047" fillOpacity="0.9" />
        </g>
      )}

      {/* Top-Center Crown Gem Apex */}
      {tier === 'SSR' && (
        <g>
          <path d="M 118 7 L 150 18 L 182 7" fill="none" stroke={stroke} strokeWidth="1.8" strokeOpacity="0.9" />
          <polygon points="150,3 156,10 150,17 144,10" fill={stroke} />
          <polygon points="150,6 153,10 150,14 147,10" fill="#ffffff" />
        </g>
      )}
      {tier === 'SR' && (
        <polygon points="150,4 155,10 150,16 145,10" fill={stroke} fillOpacity="0.9" />
      )}

      {/* 4 Ornate Corner Filigree Brackets */}
      {[
        '',
        'translate(300,0) scale(-1,1)',
        'translate(0,400) scale(1,-1)',
        'translate(300,400) scale(-1,-1)',
      ].map((tr, i) => (
        <g key={i} transform={tr}>
          <path
            d="M 7 42 L 7 16 L 16 7 L 42 7"
            fill="none"
            stroke={stroke}
            strokeWidth={tier === 'UR' ? 3.8 : tier === 'SSR' ? 3.2 : 2.5}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          {tier === 'UR' && (
            <>
              <path
                d="M 13 38 L 13 18 L 18 13 L 38 13"
                fill="none"
                stroke="#38e8ff"
                strokeWidth="1.8"
                strokeOpacity="0.95"
              />
              <path
                d="M 19 30 L 19 21 L 21 19 L 30 19"
                fill="none"
                stroke={strokeSub}
                strokeWidth="1.4"
                strokeOpacity="0.9"
              />
              <polygon points="15,15 24,15 15,24" fill="#fde047" />
              <circle cx="17.5" cy="17.5" r="2.2" fill="#ffffff" />
            </>
          )}
          {tier === 'SSR' && (
            <>
              <path
                d="M 13 30 L 13 18 L 18 13 L 30 13"
                fill="none"
                stroke={strokeSub}
                strokeWidth="1.4"
                strokeOpacity="0.85"
              />
              <polygon points="16,16 21,16 16,21" fill={stroke} opacity="0.9" />
            </>
          )}
          {tier === 'SR' && (
            <path
              d="M 13 26 L 13 17 L 17 13 L 26 13"
              fill="none"
              stroke={strokeSub}
              strokeWidth="1.2"
              strokeOpacity="0.75"
            />
          )}
        </g>
      ))}
    </svg>
  );
};

/**
 * AAA Anime Gacha Collectible Card with:
 * - Chamfered beveled architecture & animated rotating conic rarity border
 * - Tier-accurate color grading & atmospheric halo vignette over artwork
 * - Holographic foil diagonal shimmer sweep + rising stardust motes (SSR / SR)
 * - Sculpted ornate SVG corner filigree
 * - Aesthetic calligraphic foil SSR/SR/R crest & illustrated Class/Job role medallion
 */
export const CollectibleCard: React.FC<CollectibleCardProps> = ({
  kind,
  id,
  src,
  name,
  subtitle,
  tier,
  role,
  transcended = false,
  locked = false,
  isNew = false,
  topBannerLabel,
  compact = false,
  interactive = true,
  onClick,
  footerExtra,
  className = '',
}) => {
  const pal = TIER_PALETTE[tier];

  const shellClass =
    tier === 'UR'
      ? 'card-shell-ur'
      : tier === 'SSR'
        ? 'card-shell-ssr'
        : tier === 'SR'
          ? 'card-shell-sr'
          : 'card-shell-r';

  const conicClass =
    tier === 'UR'
      ? 'card-conic-ur'
      : tier === 'SSR'
        ? 'card-conic-ssr'
        : tier === 'SR'
          ? 'card-conic-sr'
          : 'card-conic-r';

  const artGradeClass = locked
    ? 'grade-art-locked'
    : tier === 'UR'
      ? 'grade-art-ur'
      : tier === 'SSR'
        ? 'grade-art-ssr'
        : tier === 'SR'
          ? 'grade-art-sr'
          : 'grade-art-r';

  const WrapperTag = onClick ? 'button' : 'div';
  const moteCount = locked ? 0 : tier === 'UR' ? 8 : tier === 'SSR' ? 5 : tier === 'SR' ? 3 : 0;

  return (
    <WrapperTag
      type={onClick ? 'button' : undefined}
      onClick={onClick}
      className={`group relative aspect-[3/4] w-full text-left transition-all duration-300 ${
        interactive ? 'hover:-translate-y-1.5 hover:scale-[1.02] cursor-pointer' : ''
      } ${shellClass} ${className}`}
    >
      {/* OUTER CHAMFERED METALLIC BEZEL WITH ANIMATED CONIC RARITY BORDER */}
      <div
        className={`relative w-full h-full card-chamfer overflow-hidden bg-slate-950 ${
          tier === 'UR' ? 'p-[3.5px] sm:p-[4px]' : 'p-[2.5px] sm:p-[3px]'
        }`}
      >
        {/* Spinning Holographic Conic Foil Layer */}
        <div
          className={`pointer-events-none absolute top-1/2 left-1/2 w-[180%] h-[180%] ${conicClass} ${
            locked ? 'opacity-55' : 'opacity-100'
          }`}
        />

        {/* INNER CHAMFERED CARD CANVAS */}
        <div className="relative w-full h-full card-chamfer-inner overflow-hidden bg-[#060916]">
          {/* LAYER 1: Character / Relic Full-Bleed Artwork with Tier Color Grading */}
          <ArtImage
            kind={kind}
            id={id}
            src={src}
            alt={name}
            className={`w-full h-full object-cover object-top transition-transform duration-500 ${
              interactive ? 'group-hover:scale-[1.06]' : ''
            } ${artGradeClass}`}
          />

          {/* LAYER 2: Tier Atmospheric Color Grading & Rim Halo Overlays */}
          <div
            className={`pointer-events-none absolute inset-0 z-10 ${
              tier === 'UR' || tier === 'SSR' ? 'animate-card-aura' : ''
            }`}
            style={{ background: pal.vignetteTop }}
          />
          <div
            className="pointer-events-none absolute inset-0 z-10"
            style={{ background: pal.vignetteBottom }}
          />
          {/* UR Exclusive Holographic Celestial Lattice + Rotating Astrolabe Crest */}
          {!locked && tier === 'UR' && (
            <>
              <div className="pointer-events-none absolute inset-0 z-10 ur-holo-lattice opacity-65" />
              <div
                className="pointer-events-none absolute left-1/2 bottom-10 -translate-x-1/2 w-36 h-36 rounded-full border border-amber-200/25 border-dashed animate-spin z-10"
                style={{ animationDuration: '20s' }}
              />
            </>
          )}
          {/* Subtle inner color-graded edge glow */}
          <div
            className="pointer-events-none absolute inset-0 z-10"
            style={{
              boxShadow: locked
                ? 'inset 0 0 28px rgba(4, 7, 18, 0.85)'
                : tier === 'UR'
                  ? 'inset 0 0 26px rgba(255, 255, 255, 0.42), inset 0 0 46px rgba(232, 121, 249, 0.34), inset 0 0 64px rgba(56, 232, 255, 0.2)'
                  : tier === 'SSR'
                    ? 'inset 0 0 22px rgba(253, 224, 71, 0.34), inset 0 0 42px rgba(244, 114, 182, 0.14)'
                    : tier === 'SR'
                      ? 'inset 0 0 20px rgba(192, 132, 252, 0.32)'
                      : 'inset 0 0 16px rgba(56, 189, 248, 0.24)',
            }}
          />

          {/* LAYER 3: Animated Holographic Diagonal Shimmer Sweep */}
          {!locked && (tier === 'UR' || tier === 'SSR' || tier === 'SR') && (
            <div className="pointer-events-none absolute inset-0 z-10 overflow-hidden">
              <div
                className={`absolute inset-y-0 -left-1/2 w-[72%] ${
                  tier === 'UR'
                    ? 'card-shimmer-ur'
                    : tier === 'SSR'
                      ? 'card-shimmer-ssr'
                      : 'card-shimmer-sr'
                }`}
              />
              {tier === 'UR' && (
                <div className="absolute inset-y-0 -left-1/2 w-[62%] card-shimmer-ur-secondary" />
              )}
            </div>
          )}
          {/* Hover specular flash for all tiers (including R) */}
          <div className="pointer-events-none absolute inset-0 z-10 opacity-0 group-hover:opacity-100 transition-opacity duration-300 bg-gradient-to-tr from-transparent via-white/10 to-white/20" />

          {/* LAYER 3B: Rising Starlight Sparkle Motes inside UR, SSR & SR cards */}
          {moteCount > 0 && (
            <div className="pointer-events-none absolute inset-0 z-10 overflow-hidden">
              {MOTE_SEEDS.slice(0, moteCount).map((m, idx) => (
                <span
                  key={idx}
                  className="absolute rounded-full animate-card-mote"
                  style={{
                    left: m.left,
                    bottom: m.bottom,
                    width: `${m.size}px`,
                    height: `${m.size}px`,
                    animationDelay: m.delay,
                    animationDuration: m.dur,
                    background:
                      tier === 'UR'
                        ? idx % 3 === 0
                          ? '#ffffff'
                          : idx % 3 === 1
                            ? '#fde047'
                            : idx % 2 === 0
                              ? '#38e8ff'
                              : '#f0abfc'
                        : tier === 'SSR'
                          ? idx % 2 === 0
                            ? '#fef08a'
                            : '#67e8f9'
                          : '#e9d5ff',
                    boxShadow:
                      tier === 'UR'
                        ? '0 0 10px rgba(255, 255, 255, 0.95), 0 0 16px rgba(232, 121, 249, 0.9)'
                        : tier === 'SSR'
                          ? '0 0 8px rgba(253, 224, 71, 0.95)'
                          : '0 0 7px rgba(192, 132, 252, 0.9)',
                  }}
                />
              ))}
            </div>
          )}

          {/* LAYER 4: Ornate Architectural SVG Corner Filigree */}
          <FiligreeOverlay tier={tier} compact={compact} />

          {/* LAYER 5: TOP CHROME — Sculpted Foil Rarity Crest + Illustrated Class Role Medallion */}
          <div
            className={`absolute top-2 inset-x-2 z-30 flex items-start justify-between gap-1 ${
              compact ? 'top-1.5 inset-x-1.5' : 'sm:top-2.5 sm:inset-x-2.5'
            }`}
          >
            <div className="flex flex-col items-start gap-1.5">
              <RarityCrest
                tier={tier}
                size={compact ? 'xs' : 'sm'}
                showStars={!compact}
              />
              {transcended && !locked && (
                <span className="mt-0.5 px-1.5 py-0.5 rounded bg-gradient-to-r from-amber-300 via-yellow-200 to-fuchsia-300 text-slate-950 font-display font-black text-[8px] sm:text-[9px] uppercase tracking-widest shadow-[0_0_16px_rgba(253,224,71,0.95)] border border-white">
                  ❖ TRANSCENDED
                </span>
              )}
              {isNew && (
                <span className="mt-0.5 px-1.5 py-0.5 bg-gradient-to-r from-emerald-400 to-cyan-300 text-slate-950 font-display font-black text-[8px] uppercase tracking-wider shadow-[0_0_12px_rgba(52,211,153,0.85)]">
                  ★ NEW
                </span>
              )}
              {topBannerLabel && (
                <span className="mt-0.5 px-1.5 py-0.5 bg-amber-400/95 text-slate-950 font-display font-black text-[8px] uppercase tracking-wider shadow-[0_0_12px_rgba(245,200,76,0.8)]">
                  {topBannerLabel}
                </span>
              )}
            </div>

            <div className="flex flex-col items-end gap-1">
              {role && (
                <RoleBadge
                  role={role}
                  variant="medallion"
                  size={compact ? 'sm' : 'md'}
                />
              )}
              {locked && (
                <div
                  title="Not Yet Unlocked"
                  className="w-6 h-6 rounded-full bg-slate-950/90 border border-amber-400/45 flex items-center justify-center shadow-[0_2px_8px_rgba(0,0,0,0.8)]"
                >
                  <Lock className="w-3 h-3 text-amber-200/80" />
                </div>
              )}
            </div>
          </div>

          {/* LAYER 6: SCULPTED BOTTOM NAMEPLATE WITH ORNAMENTAL DIVIDER */}
          <div
            className={`absolute inset-x-0 bottom-0 z-30 ${
              compact ? 'px-2 pb-2 pt-5' : 'px-3 pb-2.5 pt-7'
            }`}
          >
            {/* Ornamental Hairline + Center Diamond */}
            <div className="flex items-center gap-1.5 mb-1">
              <div
                className="flex-1 h-[1px]"
                style={{
                  background: `linear-gradient(90deg, transparent, ${pal.accent})`,
                }}
              />
              <span
                className="w-1.5 h-1.5 rotate-45 shrink-0"
                style={{
                  background: pal.accent,
                  boxShadow: `0 0 8px ${pal.accent}`,
                }}
              />
              <div
                className="flex-1 h-[1px]"
                style={{
                  background: `linear-gradient(90deg, ${pal.accent}, transparent)`,
                }}
              />
            </div>

            {tier === 'UR' && !compact && (
              <div className="text-[8px] font-display font-black uppercase tracking-[0.26em] text-transparent bg-clip-text bg-gradient-to-r from-amber-200 via-cyan-200 to-fuchsia-200 mb-0.5">
                ❖ CELESTIAL SOVEREIGN ❖
              </div>
            )}
            <div
              className={`font-display font-black tracking-[0.06em] truncate leading-tight ${
                compact ? 'text-xs' : 'text-sm sm:text-base'
              }`}
              style={{
                color: pal.nameColor,
                textShadow:
                  tier === 'UR'
                    ? '0 2px 12px rgba(0,0,0,0.98), 0 0 16px rgba(232,121,249,0.85), 0 0 26px rgba(253,224,71,0.55)'
                    : tier === 'SSR'
                      ? '0 2px 10px rgba(0,0,0,0.95), 0 0 14px rgba(245,200,76,0.5)'
                      : '0 2px 8px rgba(0,0,0,0.95)',
              }}
            >
              {name}
            </div>

            {subtitle && (
              <div
                className={`font-serif-italic italic font-bold truncate leading-tight mt-0.5 ${
                  compact ? 'text-[10px]' : 'text-xs sm:text-[13px]'
                }`}
                style={{ color: pal.titleColor }}
              >
                {subtitle}
              </div>
            )}

            {footerExtra && <div className="mt-1">{footerExtra}</div>}
          </div>
        </div>
      </div>
    </WrapperTag>
  );
};
