import { Howl, Howler } from 'howler';

export type SfxKey =
  | 'slash'
  | 'hit'
  | 'crit'
  | 'heal'
  | 'shield'
  | 'cancel_cast'
  | 'ult_chime'
  | 'ult_impact'
  | 'prism_crack'
  | 'ssr_reveal'
  | 'button'
  | 'forge'
  | 'victory';

export type BgmKey = 'lobby' | 'battle' | 'boss';

const SFX_PATHS: Record<SfxKey, string> = {
  slash: '/assets/audio/sfx_slash.wav',
  hit: '/assets/audio/sfx_hit.wav',
  crit: '/assets/audio/sfx_crit.wav',
  heal: '/assets/audio/sfx_heal.wav',
  shield: '/assets/audio/sfx_shield.wav',
  cancel_cast: '/assets/audio/sfx_cancel_cast.wav',
  ult_chime: '/assets/audio/sfx_ult_chime.wav',
  ult_impact: '/assets/audio/sfx_ult_impact.wav',
  prism_crack: '/assets/audio/sfx_prism_crack.wav',
  ssr_reveal: '/assets/audio/sfx_ssr_reveal.wav',
  button: '/assets/audio/sfx_button.wav',
  forge: '/assets/audio/sfx_forge.wav',
  victory: '/assets/audio/sfx_victory.wav',
};

const BGM_PATHS: Record<BgmKey, string> = {
  lobby: '/assets/audio/bgm_lobby.wav',
  battle: '/assets/audio/bgm_battle.wav',
  boss: '/assets/audio/bgm_boss.wav',
};

class AudioManager {
  private sfxMap = new Map<SfxKey, Howl>();
  private bgmMap = new Map<BgmKey, Howl>();
  private currentBgmKey: BgmKey | null = null;
  private muted = false;
  private bgmVolume = 0.28;
  private sfxVolume = 0.45;
  private lastPlayedAt = new Map<SfxKey, number>();

  public isMuted(): boolean {
    return this.muted;
  }

  public toggleMute(): boolean {
    this.muted = !this.muted;
    Howler.mute(this.muted);
    return this.muted;
  }

  private getOrCreateSfx(key: SfxKey): Howl {
    let howl = this.sfxMap.get(key);
    if (!howl) {
      howl = new Howl({
        src: [SFX_PATHS[key]],
        volume: this.sfxVolume,
        preload: true,
        onloaderror: () => {
          // Gracefully ignore before Sprint 5 audio synthesis is generated
        },
      });
      this.sfxMap.set(key, howl);
    }
    return howl;
  }

  public playSfx(key: SfxKey, rateVariance = 0.08): void {
    if (this.muted) return;
    const now = performance.now();
    const prev = this.lastPlayedAt.get(key) ?? 0;
    if (now - prev < 45) return; // Throttle rapid multi-hit bursts
    this.lastPlayedAt.set(key, now);

    try {
      const howl = this.getOrCreateSfx(key);
      if (howl.state() === 'loaded') {
        const id = howl.play();
        if (rateVariance > 0) {
          howl.rate(1 + (Math.random() * 2 - 1) * rateVariance, id);
        }
      }
    } catch {
      // Safe fallback
    }
  }

  public playBgm(key: BgmKey): void {
    if (this.currentBgmKey === key) return;
    if (this.currentBgmKey) {
      const prev = this.bgmMap.get(this.currentBgmKey);
      prev?.fade(prev.volume(), 0, 450);
      setTimeout(() => prev?.stop(), 470);
    }
    this.currentBgmKey = key;

    let howl = this.bgmMap.get(key);
    if (!howl) {
      howl = new Howl({
        src: [BGM_PATHS[key]],
        loop: true,
        volume: 0,
        preload: true,
        onloaderror: () => {
          // Safe before audio assets are built
        },
      });
      this.bgmMap.set(key, howl);
    }

    const startFade = () => {
      if (this.currentBgmKey !== key) return;
      if (!howl!.playing()) {
        howl!.volume(0);
        howl!.play();
      }
      howl!.fade(0, this.bgmVolume, 600);
    };

    if (howl.state() === 'loaded') {
      startFade();
    } else {
      howl.once('load', startFade);
    }
  }

  public stopBgm(): void {
    if (this.currentBgmKey) {
      this.bgmMap.get(this.currentBgmKey)?.stop();
      this.currentBgmKey = null;
    }
  }
}

export const audioManager = new AudioManager();
