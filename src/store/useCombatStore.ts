import { create } from 'zustand';
import type {
  ActiveCutInState,
  BossCombatSnapshot,
  CombatLootSummary,
  HeroCombatSnapshot,
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
  autoMove: boolean;
  autoSkill: boolean;
  fps: number;
  comboCount: number;
  comboDecayRatio: number;
  bossWarning: BossWarningState | null;
  waveBanner: string | null;
  touchJoystick: TouchJoystickState | null;
  aiming: AimingState | null;
  heroes: HeroCombatSnapshot[];
  boss: BossCombatSnapshot | null;
  activeCutIn: ActiveCutInState | null;
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
  setSkillCallout: (callout: SkillCalloutState | null) => void;
  setBossWarning: (warning: BossWarningState | null) => void;
  setWaveBanner: (label: string | null) => void;
  setTouchJoystick: (joy: TouchJoystickState | null) => void;
  setImpactFlash: (on: boolean) => void;
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
  maxUltGauge: 40,
  autoMove: false,
  autoSkill: false,
  fps: 60,
  comboCount: 0,
  comboDecayRatio: 0,
  bossWarning: null,
  waveBanner: null,
  touchJoystick: null,
  aiming: null,
  heroes: [],
  boss: null,
  activeCutIn: null,
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
      ultGauge: 16,
      comboCount: 0,
      comboDecayRatio: 0,
      bossWarning: null,
      waveBanner: null,
      touchJoystick: null,
      aiming: null,
      heroes: [],
      boss: null,
      activeCutIn: null,
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
  setSkillCallout: (skillCallout) => set({ skillCallout }),
  setBossWarning: (bossWarning) => set({ bossWarning }),
  setWaveBanner: (waveBanner) => set({ waveBanner }),
  setTouchJoystick: (touchJoystick) => set({ touchJoystick }),
  setImpactFlash: (impactFlash) => set({ impactFlash }),
  showBannerToast: (bannerToast) => set({ bannerToast }),
  setCombatResult: (combatResult) => set({ combatResult }),
}));
