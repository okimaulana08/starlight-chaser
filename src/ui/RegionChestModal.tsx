import React, { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { CheckCircle2, Lock, Sparkles, X } from 'lucide-react';
import {
  EQUIPMENT_SETS,
  RARITY_COLORS,
  formatStatValue,
  getEnhancedMainStatValue,
} from '../data/equipment';
import {
  MATERIAL_META,
  REGION_CHEST_REWARDS,
  factionToEssenceKey,
} from '../data/materials';
import { audioManager } from '../engine/AudioManager';
import { usePlayerStore } from '../store/usePlayerStore';
import type { EquipmentInstance, RegionDef } from '../types/game';
import { EquipIcon, GameIcon, MaterialIcon } from './GameIcon';
import { CornerFiligree, RpgButton, RpgLootTile, RpgProgressBar } from './RpgKit';

interface RegionChestModalProps {
  open: boolean;
  region: RegionDef;
  clearedCount: number;
  onClose: () => void;
}

export const RegionChestModal: React.FC<RegionChestModalProps> = ({
  open,
  region,
  clearedCount,
  onClose,
}) => {
  const { claimedRegionChests, claimRegionChest } = usePlayerStore();
  const [claimedGear, setClaimedGear] = useState<EquipmentInstance | null>(null);
  const [justClaimed, setJustClaimed] = useState(false);

  const reward = REGION_CHEST_REWARDS[region.id];
  if (!reward) return null;

  const isAlreadyClaimed = (claimedRegionChests ?? []).includes(region.id);
  const isUnlocked = clearedCount >= region.stageCount;
  const essenceKey = factionToEssenceKey(reward.essenceFaction);
  const essenceMeta = MATERIAL_META[essenceKey];

  const handleClaim = () => {
    if (!isUnlocked || isAlreadyClaimed) return;
    const res = claimRegionChest(region.id);
    if (res.ok) {
      audioManager.playSfx('ssr_reveal');
      setClaimedGear(res.droppedGear ?? null);
      setJustClaimed(true);
    }
  };

  const handleClose = () => {
    setJustClaimed(false);
    setClaimedGear(null);
    onClose();
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={handleClose}
          className="fixed inset-0 z-50 bg-[#030510]/85 backdrop-blur-md flex items-center justify-center p-3 sm:p-4 select-none"
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 18 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.94, y: 12 }}
            transition={{ type: 'spring', stiffness: 360, damping: 26 }}
            onClick={(e) => e.stopPropagation()}
            className="relative rpg-panel w-full max-w-xl overflow-hidden border-amber-400/60 shadow-[0_24px_64px_rgba(0,0,0,0.9)]"
          >
            <CornerFiligree color={region.themeColor} size={11} opacity={0.85} />

            {/* Top Header */}
            <div className="px-4 sm:px-5 pt-4 pb-3 border-b border-amber-400/25 bg-slate-950/75 flex items-center justify-between gap-3">
              <div className="flex items-center gap-3 min-w-0">
                <div
                  className={`w-14 h-14 rounded-2xl border-2 flex items-center justify-center shrink-0 ${
                    isUnlocked && !isAlreadyClaimed
                      ? 'border-amber-300 bg-amber-400/20 shadow-[0_0_24px_rgba(245,200,76,0.5)] animate-pulse'
                      : 'border-slate-700 bg-slate-900/90'
                  }`}
                >
                  <GameIcon name="reward_chest" className="w-11 h-11" />
                </div>
                <div className="min-w-0">
                  <div
                    className="text-[10px] font-display font-black uppercase tracking-[0.22em]"
                    style={{ color: region.themeColor }}
                  >
                    CHAPTER {region.chapter} COMPLETION REWARD
                  </div>
                  <h2 className="font-display text-lg sm:text-2xl font-black text-white text-glow-gold truncate">
                    {reward.title}
                  </h2>
                  <div className="text-xs text-slate-300 truncate">{region.name}</div>
                </div>
              </div>
              <button
                onClick={handleClose}
                className="p-2 rounded-xl bg-slate-900 border border-slate-700 text-slate-300 hover:text-amber-300 transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Body */}
            <div className="p-4 sm:p-5 space-y-4">
              {/* Completion Progress */}
              <div className="rounded-xl bg-slate-950/80 border border-amber-400/25 p-3 space-y-1.5">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-display font-bold uppercase tracking-wider text-slate-300">
                    Area Exploration Progress
                  </span>
                  <span
                    className={`font-mono font-black ${
                      isUnlocked ? 'text-emerald-400' : 'text-amber-300'
                    }`}
                  >
                    {clearedCount} / {region.stageCount} Stages
                  </span>
                </div>
                <RpgProgressBar
                  value={clearedCount}
                  max={region.stageCount}
                  heightClass="h-2.5"
                  gradient={
                    isUnlocked
                      ? 'linear-gradient(90deg, #10b981 0%, #fde047 100%)'
                      : `linear-gradient(90deg, ${region.themeColor} 0%, #fde047 100%)`
                  }
                />
              </div>

              {/* Reward Contents Grid */}
              <div>
                <div className="text-[10px] font-display font-black uppercase tracking-[0.22em] text-amber-300 mb-2 flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5" />
                  {justClaimed ? 'Rewards Acquired!' : 'Chest Treasure Contents'}
                </div>

                <div className="flex flex-wrap justify-center sm:justify-start gap-2">
                  <RpgLootTile color="#38e8ff" subLabel="Crystals" bottomLabel={`+${reward.crystals}`} index={0}>
                    <GameIcon name="crystal" className="w-8 h-8" />
                  </RpgLootTile>
                  <RpgLootTile color="#f5c84c" subLabel="Gold" bottomLabel={`+${reward.gold.toLocaleString()}`} index={1}>
                    <GameIcon name="gold" className="w-8 h-8" />
                  </RpgLootTile>
                  <RpgLootTile color="#34d399" subLabel="EXP" bottomLabel={`×${reward.expPotions}`} index={2}>
                    <MaterialIcon material="expPotions" className="w-8 h-8" />
                  </RpgLootTile>
                  <RpgLootTile color={essenceMeta.color} subLabel={essenceMeta.shortName} bottomLabel={`×${reward.essenceQty}`} index={3}>
                    <MaterialIcon material={essenceKey} className="w-8 h-8" />
                  </RpgLootTile>
                  <RpgLootTile color="#e879f9" subLabel="Star Core" bottomLabel={`×${reward.starCores}`} index={4}>
                    <MaterialIcon material="starCores" className="w-8 h-8" />
                  </RpgLootTile>
                  <RpgLootTile color="#a78bfa" subLabel="Stones" bottomLabel={`×${reward.forgeStones}`} index={5}>
                    <MaterialIcon material="forgeStones" className="w-8 h-8" />
                  </RpgLootTile>
                  <RpgLootTile color="#38bdf8" subLabel="Star-Iron" bottomLabel={`×${reward.starIronIngots}`} index={6}>
                    <MaterialIcon material="starIronIngots" className="w-8 h-8" />
                  </RpgLootTile>
                  {reward.astralAnvilCores > 0 && (
                    <RpgLootTile color="#f5c84c" subLabel="Anvil Core" bottomLabel={`×${reward.astralAnvilCores}`} index={7}>
                      <MaterialIcon material="astralAnvilCores" className="w-8 h-8" />
                    </RpgLootTile>
                  )}
                  <RpgLootTile color="#22d3ee" subLabel="Relic Frag" bottomLabel={`×${reward.relicFragments}`} index={8}>
                    <GameIcon name="relic" className="w-8 h-8" />
                  </RpgLootTile>
                  <RpgLootTile
                    color={RARITY_COLORS[reward.gearRarity]}
                    topTag={reward.gearRarity.slice(0, 3)}
                    bottomLabel={EQUIPMENT_SETS[reward.gearSetId].name.split(' ')[0]}
                    index={9}
                  >
                    <EquipIcon slot={claimedGear?.slot ?? 'WEAPON'} className="w-9 h-9" />
                  </RpgLootTile>
                </div>
              </div>

              {/* Newly Claimed Gear Spotlight */}
              {claimedGear && (
                <motion.div
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="rpg-ornate-card p-3 flex items-center gap-3 border-amber-300/75"
                  style={{ borderLeft: `4px solid ${RARITY_COLORS[claimedGear.rarity]}` }}
                >
                  <div
                    className="w-11 h-11 rounded-xl bg-slate-900 border-2 flex items-center justify-center shrink-0"
                    style={{ borderColor: RARITY_COLORS[claimedGear.rarity] }}
                  >
                    <EquipIcon slot={claimedGear.slot} className="w-8 h-8" />
                  </div>
                  <div className="min-w-0">
                    <div className="text-[10px] font-display font-black uppercase text-emerald-300">
                      ★ GUARANTEED {claimedGear.rarity} SET EQUIPMENT RECEIVED!
                    </div>
                    <div className="font-display font-bold text-sm text-white truncate">
                      {claimedGear.name} ({EQUIPMENT_SETS[claimedGear.setId].name})
                    </div>
                    <div className="text-xs font-mono text-amber-200 flex flex-wrap gap-x-2.5">
                      <span>
                        {formatStatValue(
                          claimedGear.mainStat.stat,
                          getEnhancedMainStatValue(claimedGear),
                        )}
                      </span>
                      {claimedGear.subStats.map((s, i) => (
                        <span key={i} className="text-slate-300">
                          {formatStatValue(s.stat, s.value)}
                        </span>
                      ))}
                    </div>
                  </div>
                </motion.div>
              )}

              {/* Footer CTA */}
              <div className="flex items-center justify-end gap-2 pt-2 border-t border-white/10">
                <RpgButton variant="slate" size="md" onClick={handleClose}>
                  Close
                </RpgButton>
                {isAlreadyClaimed ? (
                  <span className="px-4 py-2 rounded-xl bg-emerald-500/20 border border-emerald-400/50 text-emerald-300 text-xs font-display font-black uppercase flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4" /> Chest Claimed
                  </span>
                ) : isUnlocked ? (
                  <RpgButton
                    variant="gold"
                    size="md"
                    onClick={handleClaim}
                    className="font-display font-black uppercase tracking-wider px-6"
                  >
                    <Sparkles className="w-4 h-4" /> Claim Reward Chest
                  </RpgButton>
                ) : (
                  <span className="px-4 py-2 rounded-xl bg-slate-900 border border-slate-700 text-slate-400 text-xs font-display font-bold uppercase flex items-center gap-1.5">
                    <Lock className="w-3.5 h-3.5" /> Clear {region.stageCount - clearedCount} More Stage
                    {region.stageCount - clearedCount > 1 ? 's' : ''}
                  </span>
                )}
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
