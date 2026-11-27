import { create } from 'zustand';
import type {
  ActiveBossBanter,
  ActiveCutInState,
  ActiveLinkBurstState,
  BossCombatSnapshot,
  CombatLootSummary,
  HeroCombatSnapshot,
  LinkWindowState,
  PetCombatSnapshot,
} from '../types/game';

export interface AimingState {
  heroId: string;
  skillSlot: 1 | 2 | 'ULT';
  skillName: string;
}

export interface SkillCalloutState {
  id: number;
  heroId: string;
  heroName: string;
  skillName: string;
  cardAsset: string;
  themeColor: string;
  isUlt: boolean;
}

export interface BossWarningState {
  id: number;
  name: string;
  title: string;
}

export interface TouchJoystickState {
  originX: number;
  originY: number;
  knobX: number;
  knobY: number;
}

interface CombatStore {
  inCombat: boolean;
  paused: boolean;
  speedMultiplier: 1 | 2;
  stageId: string;
  stageName: string;
  waveIndex: number;
  totalWaves: number;
  waveLabel: string;
  elapsedSec: number;
  sp: number;
  maxSp: number;
  ultGauge: number;
  maxUltGauge: number;
  globalUltCd: number;
  autoMove: boolean;
  autoSkill: boolean;
  fps: number;
  comboCount: number;
  comboDecayRatio: number;
  evadeCd: number;
  evadeMaxCd: number;
  inDangerZone: boolean;
  perfectDodgeId: number;
  perfectDodgeActive: boolean;
  bossWarning: BossWarningState | null;
  waveBanner: string | null;
  touchJoystick: TouchJoystickState | null;
  aiming: AimingState | null;
  heroes: HeroCombatSnapshot[];
  activePet: PetCombatSnapshot | null;
  boss: BossCombatSnapshot | null;
  activeCutIn: ActiveCutInState | null;
  activeBanter: ActiveBossBanter | null;
  linkWindow: LinkWindowState | null;
  activeLinkBurst: ActiveLinkBurstState | null;
  skillCallout: SkillCalloutState | null;
  impactFlash: boolean;
  bannerToast: string | null;
  combatResult: CombatLootSummary | null;

  resetForStage: (stageId: string, stageName: string, totalWaves: number) => void;
  setSnapshot: (partial: Partial<CombatStore>) => void;
  toggleAutoMove: () => void;
  toggleAutoSkill: () => void;
  toggleSpeed: () => void;
  togglePause: () => void;
  setAiming: (aiming: AimingState | null) => void;
  setActiveCutIn: (cutIn: ActiveCutInState | null) => void;
  setActiveBanter: (banter: ActiveBossBanter | null) => void;
  setLinkWindow: (win: LinkWindowState | null) => void;
  setActiveLinkBurst: (burst: ActiveLinkBurstState | null) => void;
  setSkillCallout: (callout: SkillCalloutState | null) => void;
  setBossWarning: (warning: BossWarningState | null) => void;
  setWaveBanner: (label: string | null) => void;
  setTouchJoystick: (joy: TouchJoystickState | null) => void;
  setImpactFlash: (on: boolean) => void;
  setPerfectDodge: (active: boolean) => void;
  showBannerToast: (msg: string | null) => void;
  setCombatResult: (res: CombatLootSummary | null) => void;
}

export const useCombatStore = create<CombatStore>((set) => ({
  inCombat: false,
  paused: false,
  speedMultiplier: 1,
  stageId: 'stage_1_1',
  stageName: 'Aurelia Outer Gates',
  waveIndex: 1,
  totalWaves: 2,
  waveLabel: 'Wave 1',
  elapsedSec: 0,
  sp: 4,
  maxSp: 10,
  ultGauge: 0,
  maxUltGauge: 90,
  globalUltCd: 0,
  autoMove: true,
  autoSkill: true,
  fps: 60,
  comboCount: 0,
  comboDecayRatio: 0,
  evadeCd: 0,
  evadeMaxCd: 5,
  inDangerZone: false,
  perfectDodgeId: 0,
  perfectDodgeActive: false,
  bossWarning: null,
  waveBanner: null,
  touchJoystick: null,
  aiming: null,
  heroes: [],
  activePet: null,
  boss: null,
  activeCutIn: null,
  activeBanter: null,
  linkWindow: null,
  activeLinkBurst: null,
  skillCallout: null,
  impactFlash: false,
  bannerToast: null,
  combatResult: null,

  resetForStage: (stageId, stageName, totalWaves) =>
    set({
      inCombat: true,
      paused: false,
      stageId,
      stageName,
      waveIndex: 1,
      totalWaves,
      waveLabel: 'Wave 1',
      elapsedSec: 0,
      sp: 5,
      ultGauge: 8,
      maxUltGauge: 90,
      globalUltCd: 0,
      comboCount: 0,
      comboDecayRatio: 0,
      evadeCd: 0,
      evadeMaxCd: 5,
      inDangerZone: false,
      perfectDodgeActive: false,
      bossWarning: null,
      waveBanner: null,
      touchJoystick: null,
      aiming: null,
      heroes: [],
      activePet: null,
      boss: null,
      activeCutIn: null,
      activeBanter: null,
      linkWindow: null,
      activeLinkBurst: null,
      skillCallout: null,
      impactFlash: false,
      bannerToast: null,
      combatResult: null,
    }),

  setSnapshot: (partial) => set((state) => ({ ...state, ...partial })),
  toggleAutoMove: () => set((s) => ({ autoMove: !s.autoMove })),
  toggleAutoSkill: () => set((s) => ({ autoSkill: !s.autoSkill })),
  toggleSpeed: () => set((s) => ({ speedMultiplier: s.speedMultiplier === 1 ? 2 : 1 })),
  togglePause: () => set((s) => ({ paused: !s.paused })),
  setAiming: (aiming) => set({ aiming }),
  setActiveCutIn: (activeCutIn) => set({ activeCutIn }),
  setActiveBanter: (activeBanter) => set({ activeBanter }),
  setLinkWindow: (linkWindow) => set({ linkWindow }),
  setActiveLinkBurst: (activeLinkBurst) => set({ activeLinkBurst }),
  setSkillCallout: (skillCallout) => set({ skillCallout }),
  setBossWarning: (bossWarning) => set({ bossWarning }),
  setWaveBanner: (waveBanner) => set({ waveBanner }),
  setTouchJoystick: (touchJoystick) => set({ touchJoystick }),
  setImpactFlash: (impactFlash) => set({ impactFlash }),
  setPerfectDodge: (active) =>
    set((s) => ({
      perfectDodgeActive: active,
      perfectDodgeId: active ? s.perfectDodgeId + 1 : s.perfectDodgeId,
    })),
  showBannerToast: (bannerToast) => set({ bannerToast }),
  setCombatResult: (combatResult) => set({ combatResult }),
}));
