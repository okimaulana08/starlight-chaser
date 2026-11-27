import React, { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import {
  ChevronDown,
  Clock,
  Crosshair,
  Film,
  Flame,
  Heart,
  Shield,
  Skull,
  Snowflake,
  Sparkles,
  Swords,
  Wind,
  X,
  Zap,
} from 'lucide-react';
import { audioManager } from '../engine/AudioManager';
import type { AimType, HeroDef, OwnedHeroState, SkillDef, SkillEffectTag } from '../types/game';
import { CornerFiligree, RpgProgressBar } from './RpgKit';

interface SkillInspectorProps {
  hero: HeroDef;
  owned: OwnedHeroState;
}

type SkillTabKey = 'PASSIVE' | 'S1' | 'S2' | 'ULT';

const EFFECT_META: Record<
  SkillEffectTag,
  { label: string; color: string; icon: 'zap' | 'flame' | 'shield' | 'heart' | 'skull' | 'sparkle' | 'sword' | 'snow' }
> = {
  GATHER: { label: 'Gather', color: '#38e8ff', icon: 'sparkle' },
  PULL: { label: 'Pull', color: '#38e8ff', icon: 'sparkle' },
  STUN_CANCEL: { label: 'Stun • Cancel Cast', color: '#fbbf24', icon: 'zap' },
  PROVOKE: { label: 'Provoke', color: '#f97316', icon: 'shield' },
  SHIELD: { label: 'Shield', color: '#38bdf8', icon: 'shield' },
  HEAL: { label: 'Heal', color: '#34d399', icon: 'heart' },
  CLEANSE: { label: 'Cleanse', color: '#6ee7b7', icon: 'sparkle' },
  INVINCIBLE: { label: 'Invincible', color: '#fde047', icon: 'shield' },
  UNDYING: { label: 'Undying', color: '#fb7185', icon: 'shield' },
  BURN: { label: 'Burn DoT', color: '#fb923c', icon: 'flame' },
  BURN_DETONATE: { label: 'Burn Detonate', color: '#f97316', icon: 'flame' },
  FREEZE: { label: 'Freeze', color: '#7dd3fc', icon: 'snow' },
  DEF_SHRED: { label: 'DEF Shred', color: '#f43f5e', icon: 'sword' },
  ATK_BUFF: { label: 'ATK Up', color: '#f5c84c', icon: 'sword' },
  CRIT_BUFF: { label: 'Crit Up', color: '#fb923c', icon: 'zap' },
  DAMAGE_REDUCE: { label: 'DMG Reduce', color: '#60a5fa', icon: 'shield' },
  REFLECT: { label: 'Reflect', color: '#c084fc', icon: 'shield' },
  LIFESTEAL: { label: 'Lifesteal', color: '#f43f5e', icon: 'heart' },
  EXECUTE: { label: 'Execute Bonus', color: '#e879f9', icon: 'skull' },
  SP_GAIN: { label: 'SP Restore', color: '#38e8ff', icon: 'zap' },
  MULTI_HIT: { label: 'Multi-Hit', color: '#f5c84c', icon: 'sword' },
};

function renderMiniTagIcon(kind: string, cls = 'w-3 h-3') {
  switch (kind) {
    case 'zap':
      return <Zap className={cls} />;
    case 'flame':
      return <Flame className={cls} />;
    case 'shield':
      return <Shield className={cls} />;
    case 'heart':
      return <Heart className={cls} />;
    case 'skull':
      return <Skull className={cls} />;
    case 'snow':
      return <Snowflake className={cls} />;
    case 'sword':
      return <Swords className={cls} />;
    default:
      return <Sparkles className={cls} />;
  }
}

function renderSkillCrestIcon(skill: SkillDef | null, isPassive: boolean, cls = 'w-5 h-5') {
  if (isPassive || !skill) return <Sparkles className={cls} />;
  if (skill.effects.includes('HEAL')) return <Heart className={cls} />;
  if (skill.effects.includes('FREEZE')) return <Snowflake className={cls} />;
  if (skill.effects.includes('BURN') || skill.effects.includes('BURN_DETONATE')) {
    return <Flame className={cls} />;
  }
  if (skill.effects.includes('SHIELD') || skill.effects.includes('PROVOKE') || skill.effects.includes('INVINCIBLE')) {
    return <Shield className={cls} />;
  }
  if (skill.effects.includes('STUN_CANCEL')) return <Zap className={cls} />;
  if (skill.effects.includes('EXECUTE')) return <Skull className={cls} />;
  if (skill.aimType === 'DASH') return <Wind className={cls} />;
  if (skill.aimType === 'LINE') return <Crosshair className={cls} />;
  return <Swords className={cls} />;
}

/**
 * Highlights numbers, multipliers, percentages, durations & key combat keywords in bright accents.
 */
function renderHighlightedText(text: string): React.ReactNode {
  const tokenRegex =
    /(\+?\d+(?:\.\d+)?%\s*(?:ATK|DEF|HP|Max HP|Crit Rate|Crit DMG|Bonus DMG|DMG|Shield|Heal|Speed|ATK Speed)?|\b\d+(?:\.\d+)?s\b|\b(?:Stun|Broken|Burn|Freeze|Shield|Provoke|Cleanse|Invincible|Undying|DEF Shred|Cancel Cast|Overdrive|Starfall Mark|Lunar Trace|Critical strikes?|Execute|executing)\b)/gi;

  const parts = text.split(tokenRegex);
  return parts.map((part, idx) => {
    if (!part) return null;
    if (/^\+?\d/.test(part)) {
      return (
        <span key={idx} className="font-mono font-bold text-amber-300">
          {part}
        </span>
      );
    }
    if (/^(?:Stun|Cancel Cast|Broken|Freeze)$/i.test(part)) {
      return (
        <span key={idx} className="font-bold text-cyan-300">
          {part}
        </span>
      );
    }
    if (/^(?:Burn|Execute|executing|DEF Shred)$/i.test(part)) {
      return (
        <span key={idx} className="font-bold text-orange-300">
          {part}
        </span>
      );
    }
    if (/^(?:Shield|Provoke|Cleanse|Invincible|Undying)$/i.test(part)) {
      return (
        <span key={idx} className="font-bold text-emerald-300">
          {part}
        </span>
      );
    }
    if (/^(?:Overdrive|Starfall Mark|Lunar Trace|Critical strikes?)$/i.test(part)) {
      return (
        <span key={idx} className="font-bold text-fuchsia-300">
          {part}
        </span>
      );
    }
    return <React.Fragment key={idx}>{part}</React.Fragment>;
  });
}

/**
 * Tiny Tactical Aim Pattern Diagram SVG showing how the skill lands in 2.5D combat.
 */
const AimDiagram: React.FC<{ aimType: AimType; color: string }> = ({ aimType, color }) => {
  return (
    <div
      className="flex flex-col items-center justify-center px-2 py-1.5 rounded-xl bg-slate-950/90 border shrink-0"
      style={{ borderColor: `${color}45` }}
      title={`Targeting Shape: ${aimType}`}
    >
      <svg viewBox="0 0 48 32" className="w-11 h-7">
        {/* Caster dot */}
        <circle cx="10" cy="16" r="3" fill="#fde047" />
        {aimType === 'CIRCLE' && (
          <>
            <line x1="13" y1="16" x2="24" y2="16" stroke={color} strokeWidth="1.2" strokeDasharray="2 2" opacity="0.65" />
            <ellipse cx="33" cy="16" rx="10" ry="8" fill={`${color}30`} stroke={color} strokeWidth="1.6" />
          </>
        )}
        {aimType === 'CONE' && (
          <path d="M 12 16 L 40 5 A 28 28 0 0 1 40 27 Z" fill={`${color}30`} stroke={color} strokeWidth="1.6" />
        )}
        {aimType === 'LINE' && (
          <rect x="14" y="12" width="29" height="8" rx="3" fill={`${color}32`} stroke={color} strokeWidth="1.6" />
        )}
        {aimType === 'DASH' && (
          <>
            <path d="M 13 16 L 35 16" stroke={color} strokeWidth="2.2" strokeLinecap="round" />
            <path d="M 30 10 L 38 16 L 30 22" fill="none" stroke={color} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
          </>
        )}
        {aimType === 'SELF' && (
          <circle cx="10" cy="16" r="10" fill={`${color}28`} stroke={color} strokeWidth="1.6" strokeDasharray="3 2" />
        )}
      </svg>
      <span className="text-[8px] font-display font-black uppercase tracking-widest" style={{ color }}>
        {aimType}
      </span>
    </div>
  );
};

export const SkillInspector: React.FC<SkillInspectorProps> = ({ hero, owned }) => {
  const [selected, setSelected] = useState<SkillTabKey>('S1');
  const [bondExpanded, setBondExpanded] = useState(false);
  const [playingUltVideo, setPlayingUltVideo] = useState(false);

  const slots: Array<{
    key: SkillTabKey;
    short: string;
    costLabel: string;
    accent: string;
    skill: SkillDef | null;
    name: string;
  }> = [
    {
      key: 'PASSIVE',
      short: 'PAS',
      costLabel: 'TRAIT',
      accent: '#f5c84c',
      skill: null,
      name: hero.passive.name,
    },
    {
      key: 'S1',
      short: 'S1',
      costLabel: `${hero.skills[0].spCost} SP`,
      accent: '#38e8ff',
      skill: hero.skills[0],
      name: hero.skills[0].name,
    },
    {
      key: 'S2',
      short: 'S2',
      costLabel: `${hero.skills[1].spCost} SP`,
      accent: '#60a5fa',
      skill: hero.skills[1],
      name: hero.skills[1].name,
    },
    {
      key: 'ULT',
      short: 'ULT',
      costLabel: `${hero.ultimate.gaugeCost ?? 40} ULT`,
      accent: '#e879f9',
      skill: hero.ultimate,
      name: hero.ultimate.name,
    },
  ];

  const activeSlot = slots.find((s) => s.key === selected) ?? slots[1];
  const activeSkill = activeSlot.skill;
  const bondBonusPct = ((owned.bondLevel - 1) * 1.5).toFixed(1);
  const isTranscendedAura = Boolean(owned.transcended && hero.transcendence?.upgradedSovereignAura);
  const activeAura = isTranscendedAura
    ? hero.transcendence!.upgradedSovereignAura!
    : hero.sovereignAura;

  return (
    <div className="flex-1 flex flex-col gap-3 min-h-0 overflow-y-auto pr-0.5">
      {/* 0. UR EXCLUSIVE SOVEREIGN LEADER AURA PLAQUE (UPGRADES ON TRANSCENDENCE) */}
      {activeAura && (
        <div
          className={`rounded-xl p-2.5 border ${
            isTranscendedAura
              ? 'bg-gradient-to-r from-amber-500/20 via-fuchsia-500/25 to-cyan-500/20 border-amber-300/80 shadow-[0_0_26px_rgba(251,191,36,0.32)]'
              : 'bg-gradient-to-r from-amber-500/15 via-fuchsia-500/20 to-cyan-500/15 border-fuchsia-300/65 shadow-[0_0_22px_rgba(232,121,249,0.28)]'
          }`}
        >
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-1.5 text-[10px] font-display font-black uppercase tracking-[0.2em] text-transparent bg-clip-text bg-gradient-to-r from-amber-200 via-white to-fuchsia-200">
              <span>
                {isTranscendedAura
                  ? `❖ TRANSCENDED SOVEREIGN — ${activeAura.name}`
                  : `❖ UR SOVEREIGN AUTHORITY — ${activeAura.name}`}
              </span>
            </div>
            {isTranscendedAura && (
              <span className="shrink-0 px-1.5 py-0.5 rounded bg-amber-400/20 border border-amber-300/70 text-[8px] font-display font-black uppercase tracking-widest text-amber-200">
                EMPYREAN
              </span>
            )}
          </div>
          <p className="text-[11px] text-fuchsia-100/90 leading-relaxed mt-1">
            {renderHighlightedText(activeAura.description)}
          </p>
        </div>
      )}

      {/* 1. INTERACTIVE 4-MEDALLION SKILL SELECTOR BAR */}
      <div className="grid grid-cols-4 gap-2">
        {slots.map((slot) => {
          const isSel = selected === slot.key;
          const isUlt = slot.key === 'ULT';
          return (
            <motion.button
              key={slot.key}
              whileHover={{ y: -2 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => {
                setSelected(slot.key);
                setPlayingUltVideo(false);
                audioManager.playSfx('button');
              }}
              className={`relative rounded-2xl py-2 px-1.5 flex flex-col items-center gap-1 border transition overflow-hidden ${
                isSel
                  ? 'bg-slate-900/95 shadow-[0_8px_22px_rgba(0,0,0,0.65)]'
                  : 'bg-slate-950/75 border-slate-800/90 hover:border-slate-600'
              }`}
              style={{
                borderColor: isSel ? slot.accent : undefined,
                boxShadow: isSel ? `0 0 20px ${slot.accent}38, inset 0 0 18px ${slot.accent}1a` : undefined,
              }}
            >
              {isSel && (
                <motion.span
                  layoutId="skill-medallion-active"
                  transition={{ type: 'spring', stiffness: 420, damping: 30 }}
                  className="pointer-events-none absolute inset-0 rounded-2xl border-2"
                  style={{ borderColor: slot.accent }}
                />
              )}

              {/* Sculpted Hex/Diamond Medallion */}
              <div
                className={`relative w-10 h-10 sm:w-11 sm:h-11 rounded-xl flex items-center justify-center border transition ${
                  isUlt ? 'rotate-3' : ''
                }`}
                style={{
                  borderColor: `${slot.accent}${isSel ? 'ee' : '66'}`,
                  background: `radial-gradient(circle at 35% 30%, ${slot.accent}${isSel ? '44' : '22'} 0%, rgba(7,10,24,0.96) 75%)`,
                  color: slot.accent,
                  boxShadow: isSel ? `0 0 16px ${slot.accent}66` : undefined,
                }}
              >
                {renderSkillCrestIcon(slot.skill, slot.key === 'PASSIVE', 'w-5 h-5')}
                <span
                  className="absolute -top-1.5 -right-1.5 px-1 rounded text-[8px] font-display font-black bg-slate-950 border leading-tight"
                  style={{ borderColor: `${slot.accent}99`, color: slot.accent }}
                >
                  {slot.short}
                </span>
              </div>

              <div className="text-[10px] font-bold text-white truncate max-w-full leading-tight">
                {slot.name.split(' ')[0]}
              </div>
              <span
                className="text-[8px] font-mono font-bold uppercase px-1.5 py-0.5 rounded-full bg-slate-950/90 border"
                style={{ borderColor: `${slot.accent}45`, color: slot.accent }}
              >
                {slot.costLabel}
              </span>
            </motion.button>
          );
        })}
      </div>

      {/* 2. ANIMATED SKILL SPOTLIGHT CARD */}
      <AnimatePresence mode="wait">
        <motion.div
          key={`${hero.id}_${selected}`}
          initial={{ opacity: 0, y: 10, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -8, scale: 0.98 }}
          transition={{ duration: 0.18, ease: [0.22, 1, 0.36, 1] }}
          className="relative rpg-ornate-card p-3.5 sm:p-4 space-y-3 overflow-hidden"
          style={{
            borderColor: `${activeSlot.accent}88`,
            borderLeft: `4px solid ${activeSlot.accent}`,
            background: `linear-gradient(145deg, rgba(11,16,38,0.96) 0%, ${activeSlot.accent}14 100%)`,
          }}
        >
          <CornerFiligree color={activeSlot.accent} size={9} opacity={0.75} />

          {/* Header: Big Emblem + Skill Title + Aim Diagram */}
          <div className="flex items-start justify-between gap-2.5">
            <div className="flex items-center gap-3 min-w-0">
              <div
                className="w-12 h-12 rounded-2xl border-2 flex items-center justify-center shrink-0"
                style={{
                  borderColor: activeSlot.accent,
                  color: activeSlot.accent,
                  background: `radial-gradient(circle, ${activeSlot.accent}33 0%, rgba(5,8,22,0.95) 75%)`,
                  boxShadow: `0 0 22px ${activeSlot.accent}45`,
                }}
              >
                {renderSkillCrestIcon(activeSkill, selected === 'PASSIVE', 'w-6 h-6')}
              </div>
              <div className="min-w-0">
                <div
                  className="text-[9px] font-display font-black uppercase tracking-[0.22em]"
                  style={{ color: activeSlot.accent }}
                >
                  {selected === 'PASSIVE'
                    ? 'INNATE PASSIVE TRAIT'
                    : selected === 'ULT'
                      ? 'CELESTIAL ULTIMATE BURST'
                      : `ACTIVE SKILL ${selected === 'S1' ? '1' : '2'}`}
                </div>
                <h3 className="font-display text-base sm:text-lg font-black text-white leading-tight truncate mt-0.5">
                  {activeSlot.name}
                </h3>
                {/* Metric Chips */}
                {activeSkill ? (
                  <div className="flex flex-wrap items-center gap-1.5 mt-1.5">
                    {activeSkill.multiplier > 0 && (
                      <span className="px-2 py-0.5 rounded-lg bg-amber-400/15 border border-amber-400/45 font-mono text-[10px] font-black text-amber-200">
                        {Math.round(activeSkill.multiplier * 100)}%{' '}
                        {activeSkill.scalesWithDef ? 'DEF' : 'ATK'}
                      </span>
                    )}
                    {activeSkill.hitCount && activeSkill.hitCount > 1 && (
                      <span className="px-2 py-0.5 rounded-lg bg-fuchsia-500/15 border border-fuchsia-400/45 font-mono text-[10px] font-black text-fuchsia-200">
                        {activeSkill.hitCount}× HITS
                      </span>
                    )}
                    <span className="px-2 py-0.5 rounded-lg bg-cyan-500/15 border border-cyan-400/40 font-mono text-[10px] font-bold text-cyan-200">
                      {selected === 'ULT'
                        ? `${activeSkill.gaugeCost ?? 40} Gauge`
                        : `${activeSkill.spCost} SP`}
                    </span>
                    {activeSkill.cooldown > 0 && (
                      <span className="px-2 py-0.5 rounded-lg bg-slate-900/90 border border-slate-700 font-mono text-[10px] font-bold text-slate-300 flex items-center gap-1">
                        <Clock className="w-2.5 h-2.5 text-slate-400" />
                        {activeSkill.cooldown}s
                      </span>
                    )}
                  </div>
                ) : (
                  <div className="mt-1 inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-amber-400/15 border border-amber-400/40 text-[10px] font-bold text-amber-200">
                    <Sparkles className="w-3 h-3" /> Always Active in Combat
                  </div>
                )}
              </div>
            </div>

            {activeSkill && (
              <AimDiagram aimType={activeSkill.aimType} color={activeSlot.accent} />
            )}
          </div>

          {/* Tactical Effect Tag Pills */}
          {activeSkill && activeSkill.effects.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {activeSkill.effects.map((tag) => {
                const meta = EFFECT_META[tag];
                if (!meta) return null;
                return (
                  <span
                    key={tag}
                    className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold border"
                    style={{
                      borderColor: `${meta.color}66`,
                      backgroundColor: `${meta.color}18`,
                      color: meta.color,
                    }}
                  >
                    {renderMiniTagIcon(meta.icon, 'w-3 h-3')}
                    {meta.label}
                  </span>
                );
              })}
            </div>
          )}

          {/* Highlighted Scannable Description */}
          <div className="rounded-xl bg-slate-950/75 border border-white/10 p-3 text-xs sm:text-[13px] text-slate-200 leading-relaxed">
            {renderHighlightedText(
              activeSkill ? activeSkill.description : hero.passive.description,
            )}
          </div>

          {/* Awakening Skill Bonus Hint (★3 & ★6 Milestones) */}
          {(selected === 'S1' || selected === 'S2' || selected === 'ULT') && (
            <div className="flex items-center justify-between text-[10px] px-2.5 py-1.5 rounded-lg bg-slate-950/60 border border-slate-800">
              <span className="text-slate-400">
                {selected === 'ULT' ? '★6 Awakening Mastery' : '★3 Awakening Mastery'}
              </span>
              <span
                className={`font-bold ${
                  (selected === 'ULT' ? owned.awakening >= 6 : owned.awakening >= 3)
                    ? 'text-emerald-300'
                    : 'text-slate-500'
                }`}
              >
                {selected === 'ULT'
                  ? owned.awakening >= 6
                    ? 'ACTIVE (+15% ULT DMG)'
                    : 'Unlock at ★6 (+15% ULT DMG)'
                  : owned.awakening >= 3
                    ? 'ACTIVE (+10% Skill DMG)'
                    : 'Unlock at ★3 (+10% Skill DMG)'}
              </span>
            </div>
          )}

          {/* Transcendence Combat Empowerment Strip */}
          {owned.transcended && hero.transcendence && (selected === 'PASSIVE' || selected === 'ULT') && (
            <div className="flex items-start justify-between gap-2 text-[10px] px-2.5 py-1.5 rounded-lg bg-gradient-to-r from-amber-500/15 via-fuchsia-500/15 to-cyan-500/15 border border-amber-300/60">
              <span className="font-display font-black uppercase tracking-wider text-amber-200 shrink-0">
                ❖ Empyrean Empowered
              </span>
              <span className="text-right font-bold text-amber-100 leading-snug">
                {hero.id === 'hero_astraea'
                  ? selected === 'PASSIVE'
                    ? '5-Stack Six-Star Barrage (260% True DMG + 0.8 SP)'
                    : '12s Empyrean Domain (0.9s rapid starfall bolts)'
                  : hero.transcendence.summary}
              </span>
            </div>
          )}

          {/* SSR Animated Ultimate Cut-In Preview Theater */}
          {selected === 'ULT' && hero.assets.cutInVideo && (
            <div>
              {!playingUltVideo ? (
                <motion.button
                  whileHover={{ scale: 1.01 }}
                  whileTap={{ scale: 0.97 }}
                  onClick={() => {
                    audioManager.playSfx('ult_chime');
                    setPlayingUltVideo(true);
                  }}
                  className="w-full py-2 px-3 rounded-xl bg-gradient-to-r from-fuchsia-500/25 via-amber-400/20 to-cyan-500/25 border border-fuchsia-400/65 hover:border-amber-300 text-amber-200 text-xs font-display font-black uppercase tracking-wider flex items-center justify-center gap-2 transition shadow-[0_0_18px_rgba(232,121,249,0.22)]"
                >
                  <Film className="w-4 h-4 text-fuchsia-300" />
                  <span>Preview 1080p SSR Ultimate Cut-In</span>
                </motion.button>
              ) : (
                <div
                  className="relative rounded-xl overflow-hidden border-2 bg-black shadow-[0_0_24px_rgba(232,121,249,0.35)]"
                  style={{ borderColor: hero.themeColor }}
                >
                  <video
                    src={hero.assets.cutInVideo}
                    poster={hero.assets.cutIn}
                    autoPlay
                    loop
                    muted
                    playsInline
                    className="w-full aspect-video object-cover"
                  />
                  <button
                    onClick={() => setPlayingUltVideo(false)}
                    className="absolute top-2 right-2 p-1 rounded-full bg-black/80 border border-white/25 text-white hover:text-amber-300 transition"
                    title="Close Cut-In Preview"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                  <div className="absolute bottom-2 left-2 px-2 py-0.5 rounded bg-black/80 border border-amber-300/45 text-[9px] font-display font-black uppercase tracking-widest text-amber-200">
                    ✦ {hero.ultimate.name}
                  </div>
                </div>
              )}
            </div>
          )}
        </motion.div>
      </AnimatePresence>

      {/* 3. COMPACT COLLAPSIBLE BOND RESONANCE BAR */}
      <div className="rounded-xl bg-slate-950/75 border border-rose-500/30 overflow-hidden">
        <button
          onClick={() => {
            setBondExpanded((b) => !b);
            audioManager.playSfx('button');
          }}
          className="w-full px-3 py-2 flex items-center justify-between gap-2 hover:bg-rose-500/10 transition"
        >
          <div className="flex items-center gap-2 min-w-0">
            <Heart className="w-3.5 h-3.5 text-rose-400 fill-rose-400 shrink-0" />
            <span className="font-display font-bold text-xs text-rose-200">
              Bond Lv.{owned.bondLevel}/10
            </span>
            <span className="text-[10px] font-mono text-emerald-300 font-bold">
              (+{bondBonusPct}% All Stats)
            </span>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <div className="w-16 sm:w-24">
              <RpgProgressBar
                value={owned.bondLevel}
                max={10}
                heightClass="h-1.5"
                gradient="linear-gradient(90deg, #e11d48 0%, #fb7185 100%)"
                glowColor="rgba(251,113,133,0.55)"
              />
            </div>
            <ChevronDown
              className={`w-3.5 h-3.5 text-rose-300 transition-transform ${
                bondExpanded ? 'rotate-180' : ''
              }`}
            />
          </div>
        </button>

        <AnimatePresence initial={false}>
          {bondExpanded && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="overflow-hidden"
            >
              <div className="px-3 pb-3 pt-1 border-t border-rose-500/20 text-xs text-slate-300 italic leading-relaxed">
                "{hero.bondStory}"
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};
