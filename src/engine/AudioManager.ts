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

export type SynthSfxKey = 'perfect_dodge' | 'boss_break' | 'link_burst' | 'lobby_tap';

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
  private bossEnraged = false;
  private webAudioCtx: AudioContext | null = null;

  private getAudioContext(): AudioContext | null {
    if (typeof window === 'undefined') return null;
    if (!this.webAudioCtx) {
      const Ctx = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!Ctx) return null;
      try {
        this.webAudioCtx = new Ctx();
      } catch {
        return null;
      }
    }
    if (this.webAudioCtx.state === 'suspended') {
      this.webAudioCtx.resume().catch(() => {});
    }
    return this.webAudioCtx;
  }

  public isMuted(): boolean {
    return this.muted;
  }

  public getVolumes(): { bgmVolume: number; sfxVolume: number; muted: boolean } {
    return {
      bgmVolume: this.bgmVolume,
      sfxVolume: this.sfxVolume,
      muted: this.muted,
    };
  }

  public applySettings(opts: { bgmVolume: number; sfxVolume: number; muted: boolean }): void {
    this.bgmVolume = Math.max(0, Math.min(1, opts.bgmVolume));
    this.sfxVolume = Math.max(0, Math.min(1, opts.sfxVolume));
    this.muted = opts.muted;
    Howler.mute(this.muted);
    if (this.currentBgmKey) {
      const cur = this.bgmMap.get(this.currentBgmKey);
      if (cur && cur.playing()) {
        cur.volume(this.bgmVolume);
      }
    }
    this.sfxMap.forEach((howl) => howl.volume(this.sfxVolume));
  }

  public setBgmVolume(volume: number): void {
    this.bgmVolume = Math.max(0, Math.min(1, volume));
    if (this.currentBgmKey) {
      const cur = this.bgmMap.get(this.currentBgmKey);
      if (cur && cur.playing()) {
        cur.volume(this.bgmVolume);
      }
    }
  }

  public setSfxVolume(volume: number): void {
    this.sfxVolume = Math.max(0, Math.min(1, volume));
    this.sfxMap.forEach((howl) => howl.volume(this.sfxVolume));
  }

  public setMuted(muted: boolean): void {
    this.muted = muted;
    Howler.mute(this.muted);
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

  /**
   * Bespoke WebAudio synthesized SFX for high-impact tactile beats:
   * - perfect_dodge: Starlight Reflex time-warp sub-drop + crystalline chime
   * - boss_break: Glass-shatter harmonic burst + sub-bass boom
   * - link_burst: Dual-hero triumphant starlight chord swell
   * - lobby_tap: Warm pentatonic celestial harp bell
   */
  public playSynthSfx(key: SynthSfxKey): void {
    if (this.muted || this.sfxVolume <= 0.01) return;
    const ac = this.getAudioContext();
    if (!ac) return;

    try {
      const now = ac.currentTime;
      const gainScale = Math.max(0.05, Math.min(0.6, this.sfxVolume * 0.48));

      if (key === 'perfect_dodge') {
        // Time-warp frequency drop + sparkling high shimmer
        const osc = ac.createOscillator();
        const g = ac.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(520, now);
        osc.frequency.exponentialRampToValueAtTime(92, now + 0.34);
        g.gain.setValueAtTime(gainScale * 0.85, now);
        g.gain.exponentialRampToValueAtTime(0.001, now + 0.38);
        osc.connect(g).connect(ac.destination);
        osc.start(now);
        osc.stop(now + 0.4);

        const chime = ac.createOscillator();
        const cg = ac.createGain();
        chime.type = 'triangle';
        chime.frequency.setValueAtTime(1174.66, now + 0.04); // D6
        chime.frequency.exponentialRampToValueAtTime(1760, now + 0.22); // A6
        cg.gain.setValueAtTime(gainScale * 0.45, now + 0.04);
        cg.gain.exponentialRampToValueAtTime(0.001, now + 0.42);
        chime.connect(cg).connect(ac.destination);
        chime.start(now + 0.04);
        chime.stop(now + 0.44);
      } else if (key === 'boss_break') {
        // Resonant sub-boom + cascading crystalline shatter pings
        const sub = ac.createOscillator();
        const sg = ac.createGain();
        sub.type = 'sawtooth';
        sub.frequency.setValueAtTime(135, now);
        sub.frequency.exponentialRampToValueAtTime(38, now + 0.42);
        sg.gain.setValueAtTime(gainScale * 0.7, now);
        sg.gain.exponentialRampToValueAtTime(0.001, now + 0.45);
        sub.connect(sg).connect(ac.destination);
        sub.start(now);
        sub.stop(now + 0.48);

        [1567.98, 2093.0, 2637.02, 3135.96].forEach((freq, idx) => {
          const t = now + idx * 0.032;
          const shard = ac.createOscillator();
          const shg = ac.createGain();
          shard.type = 'triangle';
          shard.frequency.setValueAtTime(freq, t);
          shard.frequency.exponentialRampToValueAtTime(freq * 0.86, t + 0.22);
          shg.gain.setValueAtTime(gainScale * 0.36, t);
          shg.gain.exponentialRampToValueAtTime(0.001, t + 0.24);
          shard.connect(shg).connect(ac.destination);
          shard.start(t);
          shard.stop(t + 0.26);
        });
      } else if (key === 'link_burst') {
        // Ascending radiant Starlight major-9th arpeggio swell
        [523.25, 659.25, 783.99, 987.77, 1174.66, 1567.98].forEach((freq, idx) => {
          const t = now + idx * 0.045;
          const osc = ac.createOscillator();
          const g = ac.createGain();
          osc.type = idx % 2 === 0 ? 'triangle' : 'sine';
          osc.frequency.setValueAtTime(freq, t);
          g.gain.setValueAtTime(0.001, t);
          g.gain.linearRampToValueAtTime(gainScale * 0.42, t + 0.03);
          g.gain.exponentialRampToValueAtTime(0.001, t + 0.55);
          osc.connect(g).connect(ac.destination);
          osc.start(t);
          osc.stop(t + 0.58);
        });
      } else if (key === 'lobby_tap') {
        // Gentle warm celestial harp chime
        const notes = [659.25, 783.99, 987.77, 1318.51];
        const base = notes[Math.floor(Math.random() * 2)];
        [base, base * 1.5].forEach((freq, idx) => {
          const t = now + idx * 0.055;
          const osc = ac.createOscillator();
          const g = ac.createGain();
          osc.type = 'sine';
          osc.frequency.setValueAtTime(freq, t);
          g.gain.setValueAtTime(gainScale * 0.34, t);
          g.gain.exponentialRampToValueAtTime(0.001, t + 0.38);
          osc.connect(g).connect(ac.destination);
          osc.start(t);
          osc.stop(t + 0.4);
        });
      }
    } catch {
      // Safe fallback if AudioContext unavailable
    }
  }

  /**
   * Shifts Boss BGM playback tempo & energy upward (+12% pace) during Phase 2 Enrage (<40% HP).
   */
  public setBossEnrage(enraged: boolean): void {
    this.bossEnraged = enraged;
    const bossHowl = this.bgmMap.get('boss');
    if (bossHowl && this.currentBgmKey === 'boss') {
      try {
        bossHowl.rate(enraged ? 1.12 : 1.0);
        if (!this.muted && bossHowl.playing()) {
          const targetVol = Math.min(1, this.bgmVolume * (enraged ? 1.14 : 1.0));
          bossHowl.fade(bossHowl.volume(), targetVol, 500);
        }
      } catch {
        // Safe fallback
      }
    }
  }

  public playBgm(key: BgmKey): void {
    if (this.currentBgmKey === key) {
      if (key !== 'boss' && this.bossEnraged) this.setBossEnrage(false);
      return;
    }
    this.bossEnraged = false;
    if (this.currentBgmKey) {
      const prev = this.bgmMap.get(this.currentBgmKey);
      prev?.rate(1.0);
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
    this.bossEnraged = false;
    if (this.currentBgmKey) {
      const cur = this.bgmMap.get(this.currentBgmKey);
      cur?.rate(1.0);
      cur?.stop();
      this.currentBgmKey = null;
    }
  }
}

export const audioManager = new AudioManager();
