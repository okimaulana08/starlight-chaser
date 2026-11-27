import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { audioManager } from '../engine/AudioManager';
import type { GameSettings } from '../types/game';

export const DEFAULT_GAME_SETTINGS: GameSettings = {
  bgmVolume: 0.28,
  sfxVolume: 0.45,
  muted: false,
  enableUltVideo: true,
  enableScreenShake: true,
  enableDamageNumbers: true,
  defaultBattleSpeed: 1,
  defaultAutoSkill: false,
  defaultAutoMove: false,
};

interface SettingsStore extends GameSettings {
  setBgmVolume: (volume: number) => void;
  setSfxVolume: (volume: number) => void;
  setMuted: (muted: boolean) => void;
  toggleMuted: () => boolean;
  setEnableUltVideo: (on: boolean) => void;
  setEnableScreenShake: (on: boolean) => void;
  setEnableDamageNumbers: (on: boolean) => void;
  setDefaultBattleSpeed: (speed: 1 | 2) => void;
  setDefaultAutoSkill: (on: boolean) => void;
  setDefaultAutoMove: (on: boolean) => void;
  resetSettings: () => void;
}

export const useSettingsStore = create<SettingsStore>()(
  persist(
    (set, get) => ({
      ...DEFAULT_GAME_SETTINGS,

      setBgmVolume: (volume) => {
        const clamped = Math.max(0, Math.min(1, Number(volume.toFixed(2))));
        audioManager.setBgmVolume(clamped);
        set({ bgmVolume: clamped });
      },

      setSfxVolume: (volume) => {
        const clamped = Math.max(0, Math.min(1, Number(volume.toFixed(2))));
        audioManager.setSfxVolume(clamped);
        set({ sfxVolume: clamped });
      },

      setMuted: (muted) => {
        audioManager.setMuted(muted);
        set({ muted });
      },

      toggleMuted: () => {
        const next = !get().muted;
        audioManager.setMuted(next);
        set({ muted: next });
        return next;
      },

      setEnableUltVideo: (enableUltVideo) => set({ enableUltVideo }),
      setEnableScreenShake: (enableScreenShake) => set({ enableScreenShake }),
      setEnableDamageNumbers: (enableDamageNumbers) => set({ enableDamageNumbers }),
      setDefaultBattleSpeed: (defaultBattleSpeed) => set({ defaultBattleSpeed }),
      setDefaultAutoSkill: (defaultAutoSkill) => set({ defaultAutoSkill }),
      setDefaultAutoMove: (defaultAutoMove) => set({ defaultAutoMove }),

      resetSettings: () => {
        audioManager.applySettings(DEFAULT_GAME_SETTINGS);
        set({ ...DEFAULT_GAME_SETTINGS });
      },
    }),
    {
      name: 'starlight-chasers-settings-v1',
      onRehydrateStorage: () => (state) => {
        if (state) {
          audioManager.applySettings({
            bgmVolume: state.bgmVolume,
            sfxVolume: state.sfxVolume,
            muted: state.muted,
          });
        }
      },
    },
  ),
);
