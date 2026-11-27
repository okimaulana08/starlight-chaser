import React, { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { CheckCircle2, Film, Sparkles, X } from 'lucide-react';
import { ENEMIES } from '../data/enemies';
import { FACTIONS, FACTION_LIST } from '../data/factions';
import { HEROES } from '../data/heroes';
import { RELICS } from '../data/relics';
import { audioManager } from '../engine/AudioManager';
import { CODEX_MILESTONES, usePlayerStore } from '../store/usePlayerStore';
import type { EnemyDef, HeroDef, RelicDef } from '../types/game';
import { ArtImage } from './ArtImage';
import { CollectibleCard } from './CollectibleCard';
import { GameIcon } from './GameIcon';
import {
  CornerFiligree,
  RpgBackButton,
  RpgButton,
  RpgTabs,
} from './RpgKit';
import { RarityCrest, RoleBadge } from './RoleBadge';
import { StarlightBackdrop } from './StarlightBackdrop';

interface CodexScreenProps {
  onBack: () => void;
}

type InspectItem =
  | { kind: 'HERO'; data: HeroDef }
  | { kind: 'RELIC'; data: RelicDef }
  | { kind: 'ENEMY'; data: EnemyDef };

export const CodexScreen: React.FC<CodexScreenProps> = ({ onBack }) => {
  const { unlockedCodexIds, claimedCodexMilestones, claimCodexMilestone } = usePlayerStore();
  const [tab, setTab] = useState<'HEROES' | 'RELICS' | 'BESTIARY' | 'WORLD'>('HEROES');
  const [inspect, setInspect] = useState<InspectItem | null>(null);
  const [previewUltVideo, setPreviewUltVideo] = useState(false);

  const totalEntries = HEROES.length + RELICS.length + ENEMIES.length;
  const unlockedCount = unlockedCodexIds.length;
  const globalStatPct = Math.floor(unlockedCount / 5);

  return (
    <div className="relative w-full h-full flex flex-col overflow-hidden select-none">
      <StarlightBackdrop variant="CODEX" accentColor="#c084fc" />

      {/* FLOATING TOP ARCHIVE BAR */}
      <div className="relative z-20 flex flex-wrap items-center justify-between gap-2 px-3 sm:px-5 safe-top pb-2">
        <div className="flex items-center gap-2.5">
          <RpgBackButton onClick={onBack} />
          <GameIcon name="codex" className="w-7 h-7 sm:w-8 sm:h-8" />
          <div>
            <h1 className="font-display text-base sm:text-xl font-black text-white tracking-[0.12em] sm:tracking-[0.16em] text-glow-gold leading-none">
              STARLIGHT CODEX
            </h1>
            <div className="text-[10px] sm:text-xs text-slate-300 mt-0.5">
              Bonus:{' '}
              <span className="font-mono text-amber-300 font-bold">
                +{globalStatPct}% ATK/HP
              </span>{' '}
              • <span className="font-mono font-bold text-cyan-200">{unlockedCount}/{totalEntries}</span>
            </div>
          </div>
        </div>

        {/* Sculpted Sliding Category Ribbon */}
        <div className="overflow-x-auto max-w-full pb-0.5">
          <RpgTabs
            layoutId="codex-main-tabs"
            value={tab}
            onChange={setTab}
            items={[
              { key: 'HEROES', label: `Heroes (${HEROES.length})` },
              { key: 'RELICS', label: `Relics (${RELICS.length})`, accent: 'cyan' },
              { key: 'BESTIARY', label: `Bestiary (${ENEMIES.length})` },
              { key: 'WORLD', label: 'Lore' },
            ]}
          />
        </div>
      </div>

      {/* Milestone Rewards Strip */}
      <div className="relative z-20 px-3 sm:px-5 py-1.5 flex items-center gap-2 overflow-x-auto">
        {CODEX_MILESTONES.map((m) => {
          const reached = unlockedCount >= m.threshold;
          const claimed = claimedCodexMilestones.includes(m.threshold);
          return (
            <motion.button
              key={m.threshold}
              disabled={!reached || claimed}
              whileHover={reached && !claimed ? { y: -1.5, scale: 1.02 } : undefined}
              whileTap={reached && !claimed ? { scale: 0.95 } : undefined}
              onClick={() => {
                if (claimCodexMilestone(m.threshold)) audioManager.playSfx('ssr_reveal');
              }}
              className={`shrink-0 px-3 py-1.5 rounded-xl border text-left transition flex items-center gap-2 ${
                claimed
                  ? 'bg-emerald-950/60 border-emerald-500/45 text-emerald-300'
                  : reached
                    ? 'bg-gradient-to-r from-amber-500/25 to-amber-400/15 border-amber-300 text-amber-200 shadow-[0_0_16px_rgba(245,200,76,0.3)]'
                    : 'bg-slate-950/75 border-slate-700/70 text-slate-400'
              }`}
            >
              {claimed ? (
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
              ) : (
                <GameIcon name="supply" className="w-4 h-4" />
              )}
              <span className="text-[11px] font-bold">
                <span className="font-mono">{m.threshold}</span> Entries → <span className="font-mono text-amber-200">+{m.crystals}</span> Crystals
              </span>
            </motion.button>
          );
        })}
      </div>

      {/* GALLERY CONTENT */}
      <main className="relative z-10 flex-1 px-5 pb-5 pt-2 overflow-y-auto">
        {tab === 'HEROES' && (
          <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-4 lg:grid-cols-6 gap-3 sm:gap-4">
            {HEROES.map((h) => {
              const unlocked = unlockedCodexIds.includes(h.id);
              return (
                <CollectibleCard
                  key={h.id}
                  kind="HERO"
                  id={h.id}
                  src={h.assets.card}
                  name={h.name}
                  subtitle={h.title}
                  tier={h.tier}
                  role={h.role}
                  locked={!unlocked}
                  onClick={() => {
                    audioManager.playSfx('button');
                    setPreviewUltVideo(false);
                    setInspect({ kind: 'HERO', data: h });
                  }}
                />
              );
            })}
          </div>
        )}

        {tab === 'RELICS' && (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4 max-w-5xl">
            {RELICS.map((r) => {
              const unlocked = unlockedCodexIds.includes(r.id);
              return (
                <CollectibleCard
                  key={r.id}
                  kind="RELIC"
                  id={r.id}
                  src={r.assetCard}
                  name={r.name}
                  subtitle={`${r.preferredRole} Starlight Relic`}
                  tier={r.tier}
                  role={r.preferredRole}
                  locked={!unlocked}
                  onClick={() => {
                    audioManager.playSfx('button');
                    setInspect({ kind: 'RELIC', data: r });
                  }}
                />
              );
            })}
          </div>
        )}

        {tab === 'BESTIARY' && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {ENEMIES.map((e) => (
              <motion.button
                key={e.id}
                whileHover={{ y: -3, scale: 1.015 }}
                whileTap={{ scale: 0.97 }}
                transition={{ type: 'spring', stiffness: 400, damping: 26 }}
                onClick={() => {
                  audioManager.playSfx('button');
                  setInspect({ kind: 'ENEMY', data: e });
                }}
                className="rpg-ornate-card p-3.5 text-left hover:border-amber-300/75 transition flex flex-col gap-3 overflow-hidden"
                style={{ borderColor: `${e.themeColor}45` }}
              >
                <CornerFiligree color={e.themeColor} size={8} opacity={0.6} />
                <div
                  className="aspect-square rounded-xl overflow-hidden border bg-slate-950/90"
                  style={{
                    borderColor: `${e.themeColor}44`,
                    background: `radial-gradient(circle at 50% 45%, ${e.themeColor}1c 0%, rgba(5, 8, 22, 0.98) 72%)`,
                  }}
                >
                  <ArtImage
                    kind="ENEMY"
                    id={e.id}
                    src={e.assetKey}
                    alt={e.name}
                    className="w-full h-full object-contain p-2.5 drop-shadow-[0_10px_18px_rgba(0,0,0,0.85)]"
                  />
                </div>
                <div>
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-display font-bold text-base text-white truncate">
                      {e.name}
                    </span>
                    <span
                      className="text-[10px] px-2 py-0.5 rounded-full font-display font-black shrink-0 border"
                      style={{
                        backgroundColor: `${e.themeColor}22`,
                        borderColor: `${e.themeColor}60`,
                        color: e.themeColor,
                      }}
                    >
                      {e.isBoss ? (e.chapter ? `CH.${e.chapter} BOSS` : 'BOSS') : e.isMiniBoss ? 'ELITE' : 'VOID'}
                    </span>
                  </div>
                  <div className="text-[11px] font-semibold text-amber-200/85 mt-0.5 truncate">
                    {e.title}
                  </div>
                  <p className="text-xs text-slate-300/85 mt-1 line-clamp-3 leading-relaxed">{e.lore}</p>
                </div>
              </motion.button>
            ))}
          </div>
        )}

        {tab === 'WORLD' && (
          <div className="max-w-4xl space-y-4">
            <div className="rpg-panel p-6 border-amber-400/35">
              <div className="flex items-center gap-2 text-xs uppercase tracking-[0.25em] text-amber-300 font-black mb-2">
                <Sparkles className="w-4 h-4" /> Chronicle of Aetheria
              </div>
              <h2 className="font-display text-2xl font-extrabold text-white mb-2">
                The Starfall Shattering
              </h2>
              <p className="text-sm text-slate-300 leading-relaxed">
                Beneath four ancient Star Pillars, Aetheria thrived in celestial harmony until{' '}
                <strong className="text-amber-300">The Starfall Shattering</strong> fractured the
                sky, tearing open Void Rifts and raining down mythic{' '}
                <strong className="text-cyan-300">Starlight Relics</strong>. As the Chaser
                Commander, unite champions of all four factions to reclaim every fallen star and
                uncover the hand that broke the heavens.
              </p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              {FACTION_LIST.map((f) => (
                <div
                  key={f.id}
                  className="rpg-panel p-4 border-l-4"
                  style={{ borderLeftColor: f.color }}
                >
                  <div className="font-display font-bold text-lg" style={{ color: f.color }}>
                    {f.name}
                  </div>
                  <div className="text-xs text-white font-semibold">{f.chapterTitle}</div>
                  <div className="text-xs text-slate-400 mt-1">{f.biomeTheme}</div>
                  <div className="mt-2.5 pt-2 border-t border-slate-800 text-xs space-y-1">
                    <div>
                      <span className="text-slate-400">2-Hero:</span>{' '}
                      <span className="text-white font-semibold">{f.bonus2Desc}</span>
                    </div>
                    <div>
                      <span className="text-slate-400">3-Hero:</span>{' '}
                      <span className="text-amber-300 font-semibold">{f.bonus3Desc}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </main>

      {/* INSPECTOR MODAL */}
      <AnimatePresence>
      {inspect && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={() => setInspect(null)}
          className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4"
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.92, y: 14 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.94, y: 8 }}
            transition={{ type: 'spring', stiffness: 360, damping: 28 }}
            onClick={(e) => e.stopPropagation()}
            className="relative rpg-panel p-6 max-w-3xl w-full max-h-[88vh] overflow-y-auto grid grid-cols-1 md:grid-cols-12 gap-5 border-amber-400/50"
          >
            <CornerFiligree color="#f5c84c" size={11} opacity={0.7} />
            <div className="md:col-span-5">
              {inspect.kind === 'ENEMY' ? (
                <div className="aspect-[3/4] overflow-hidden border-2 border-fuchsia-400/50 bg-slate-950 p-3">
                  <ArtImage
                    kind="ENEMY"
                    id={inspect.data.id}
                    src={inspect.data.assetKey}
                    alt={inspect.data.name}
                    className="w-full h-full object-contain"
                  />
                </div>
              ) : (
                <CollectibleCard
                  kind={inspect.kind}
                  id={inspect.data.id}
                  src={
                    inspect.kind === 'HERO'
                      ? inspect.data.assets.card
                      : inspect.data.assetCard
                  }
                  name={inspect.data.name}
                  subtitle={
                    inspect.kind === 'HERO'
                      ? inspect.data.title
                      : `${inspect.data.preferredRole} Relic`
                  }
                  tier={inspect.data.tier}
                  role={
                    inspect.kind === 'HERO'
                      ? inspect.data.role
                      : inspect.data.preferredRole
                  }
                  interactive={false}
                />
              )}
            </div>
            <div className="md:col-span-7 flex flex-col justify-between gap-4">
              {inspect.kind === 'HERO' && (
                <div className="space-y-2.5">
                  <div className="flex flex-wrap items-center gap-2">
                    <RarityCrest tier={inspect.data.tier} size="md" />
                    <RoleBadge role={inspect.data.role} variant="pill" size="md" />
                    <span className="text-xs font-bold text-slate-300">
                      {FACTIONS[inspect.data.faction].name}
                    </span>
                  </div>
                  <h2 className="font-display text-3xl font-black text-white">
                    {inspect.data.name}
                  </h2>
                  <p className="text-xs text-amber-200 italic">"{inspect.data.quote}"</p>
                  <p className="text-xs text-slate-200 leading-relaxed">{inspect.data.lore}</p>
                  <div className="space-y-1.5 pt-2 border-t border-slate-800 text-xs">
                    {inspect.data.sovereignAura && (
                      <div className="rounded-lg p-2 bg-gradient-to-r from-amber-500/15 via-fuchsia-500/20 to-cyan-500/15 border border-fuchsia-300/65">
                        <strong className="text-fuchsia-200 uppercase tracking-wider text-[10px] block">
                          ❖ UR Sovereign Authority ({inspect.data.sovereignAura.name})
                        </strong>
                        <span className="text-slate-100">{inspect.data.sovereignAura.description}</span>
                      </div>
                    )}
                    <div>
                      <strong className="text-amber-300">Passive ({inspect.data.passive.name}):</strong>{' '}
                      <span className="text-slate-300">{inspect.data.passive.description}</span>
                    </div>
                    <div>
                      <strong className="text-cyan-300">S1 ({inspect.data.skills[0].name}):</strong>{' '}
                      <span className="text-slate-300">{inspect.data.skills[0].description}</span>
                    </div>
                    <div>
                      <strong className="text-cyan-300">S2 ({inspect.data.skills[1].name}):</strong>{' '}
                      <span className="text-slate-300">{inspect.data.skills[1].description}</span>
                    </div>
                    <div>
                      <strong className="text-fuchsia-300">ULT ({inspect.data.ultimate.name}):</strong>{' '}
                      <span className="text-slate-300">{inspect.data.ultimate.description}</span>
                    </div>
                  </div>
                  {inspect.data.assets.cutInVideo && (
                    <div className="pt-2">
                      {!previewUltVideo ? (
                        <button
                          onClick={() => {
                            audioManager.playSfx('ult_chime');
                            setPreviewUltVideo(true);
                          }}
                          className="w-full py-2 px-3 rounded-lg bg-gradient-to-r from-amber-400/20 via-fuchsia-500/20 to-cyan-400/20 border border-amber-300/60 hover:border-amber-200 text-amber-200 text-xs font-display font-black uppercase tracking-wider flex items-center justify-center gap-2 transition"
                        >
                          <Film className="w-4 h-4 text-amber-300" />
                          <span>
                            Preview Animated {inspect.data.tier} Ultimate Cut-In
                          </span>
                        </button>
                      ) : (
                        <div
                          className="relative rounded-lg overflow-hidden border-2 bg-black shadow-[0_0_24px_rgba(245,200,76,0.3)]"
                          style={{ borderColor: inspect.data.themeColor }}
                        >
                          <video
                            src={inspect.data.assets.cutInVideo}
                            poster={inspect.data.assets.cutIn}
                            autoPlay
                            loop
                            muted
                            playsInline
                            className="w-full aspect-video object-cover"
                          />
                          <button
                            onClick={() => setPreviewUltVideo(false)}
                            className="absolute top-1.5 right-1.5 p-1 rounded-full bg-black/75 border border-white/25 text-white hover:text-amber-300 transition"
                            title="Close Video Preview"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                          <div className="absolute bottom-1.5 left-2 px-2 py-0.5 rounded bg-black/75 border border-amber-300/40 text-[9px] font-display font-black uppercase tracking-widest text-amber-200">
                            ✦ {inspect.data.ultimate.name}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
              {inspect.kind === 'RELIC' && (
                <div className="space-y-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <RarityCrest tier={inspect.data.tier} size="md" />
                    <RoleBadge role={inspect.data.preferredRole} variant="pill" size="md" />
                  </div>
                  <h2 className="font-display text-3xl font-black text-white">
                    {inspect.data.name}
                  </h2>
                  <div className="bg-slate-950/80 border-l-2 border-l-cyan-400 p-3 text-xs text-cyan-200">
                    <strong>Passive:</strong> {inspect.data.passiveDesc}
                  </div>
                  <p className="text-xs text-slate-300 leading-relaxed">{inspect.data.lore}</p>
                </div>
              )}
              {inspect.kind === 'ENEMY' && (
                <div className="space-y-3">
                  <span
                    className="inline-block px-2.5 py-0.5 text-xs font-black border"
                    style={{
                      backgroundColor: `${inspect.data.themeColor}22`,
                      borderColor: `${inspect.data.themeColor}66`,
                      color: inspect.data.themeColor,
                    }}
                  >
                    {inspect.data.isBoss
                      ? `CHAPTER ${inspect.data.chapter ?? 1} BOSS`
                      : inspect.data.isMiniBoss
                        ? 'ELITE CONSTRUCT'
                        : 'VOID ANOMALY'}
                  </span>
                  <h2 className="font-display text-3xl font-black text-white leading-tight">
                    {inspect.data.name}
                  </h2>
                  <div className="text-xs font-serif-italic italic font-bold text-amber-200/90 -mt-1">
                    {inspect.data.title}
                  </div>
                  <p className="text-xs text-slate-200 leading-relaxed">{inspect.data.lore}</p>
                </div>
              )}
              <div className="self-end">
                <RpgButton variant="slate" size="md" onClick={() => setInspect(null)}>
                  Close Archive
                </RpgButton>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
      </AnimatePresence>
    </div>
  );
};
