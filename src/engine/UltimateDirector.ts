import { useCombatStore } from '../store/useCombatStore';
import { audioManager } from './AudioManager';
import type { CombatContext, HeroUnit } from './CombatTypes';
import type { SkillDef } from '../types/game';

/**
 * 4-Phase Anime Ultimate Choreography Director (GDD Section 5.4):
 * - Phase 1 (0.00 - 0.15s): Freeze & Dim (timeScale = 0.05, camera zoom 1.12x to caster)
 * - Phase 2 (0.15 - 0.90s): Dynamic 2D Panoramic Cut-In overlay (SSR full, SR compact, R fast VFX)
 * - Phase 3 (0.90 - 1.05s): 2 B&W High-Contrast Impact Frames (~65ms) + 15px Camera Shake
 * - Phase 4 (1.05 - 1.90s): Restore timeScale = 1.0, fire full Arena VFX, Decals & Damage!
 */
export class UltimateDirector {
  private active = false;
  private elapsed = 0;
  private hero: HeroUnit | null = null;
  private skill: SkillDef | null = null;
  private targetX = 0;
  private targetY = 0;
  private phaseTriggered = { p2: false, p3: false, p4: false };
  private onExecutePayload:
    | ((hero: HeroUnit, skill: SkillDef, tx: number, ty: number) => void)
    | null = null;

  public isRunning(): boolean {
    return this.active;
  }

  public start(
    ctx: CombatContext,
    hero: HeroUnit,
    skill: SkillDef,
    tx: number,
    ty: number,
    onExecutePayload: (hero: HeroUnit, skill: SkillDef, tx: number, ty: number) => void,
  ): void {
    this.active = true;
    this.elapsed = 0;
    this.hero = hero;
    this.skill = skill;
    this.targetX = tx;
    this.targetY = ty;
    this.onExecutePayload = onExecutePayload;
    this.phaseTriggered = { p2: false, p3: false, p4: false };

    ctx.ultActive = true;
    ctx.timeScale = 0.05;
    ctx.cameraZoomTarget = 1.12;
    ctx.cameraFocus = { x: hero.x, y: hero.y };

    audioManager.playSfx('ult_chime', 0);

    const store = useCombatStore.getState();
    store.setActiveCutIn({
      heroId: hero.heroId,
      heroName: hero.def.name,
      heroTitle: hero.def.title,
      ultName: skill.name,
      tier: hero.def.tier,
      faction: hero.def.faction,
      themeColor: hero.def.themeColor,
      cutInAsset: hero.def.assets.cutIn,
      cutInVideo: hero.def.assets.cutInVideo,
      cardAsset: hero.def.assets.card,
      phase: 'FREEZE',
    });
  }

  public update(ctx: CombatContext, realDt: number): void {
    if (!this.active || !this.hero || !this.skill) return;
    this.elapsed += realDt;

    const store = useCombatStore.getState();
    const isFastR = this.hero.def.tier === 'R';
    const hasVideo = Boolean(this.hero.def.assets.cutInVideo);
    const is2x = store.speedMultiplier === 2;
    const tCutIn = 0.05;
    const tImpact = hasVideo
      ? is2x
        ? 1.5
        : 2.38
      : isFastR
        ? 0.78
        : this.hero.def.tier === 'SR'
          ? 0.92
          : 1.04;
    const tPayload = tImpact + 0.11;
    const tEnd = tPayload + 0.35;

    // Phase 2: Dynamic 2D / Animated Video Cut-In
    if (!this.phaseTriggered.p2 && this.elapsed >= tCutIn) {
      this.phaseTriggered.p2 = true;
      store.setActiveCutIn({
        heroId: this.hero.heroId,
        heroName: this.hero.def.name,
        heroTitle: this.hero.def.title,
        ultName: this.skill.name,
        tier: this.hero.def.tier,
        faction: this.hero.def.faction,
        themeColor: this.hero.def.themeColor,
        cutInAsset: this.hero.def.assets.cutIn,
        cutInVideo: this.hero.def.assets.cutInVideo,
        cardAsset: this.hero.def.assets.card,
        phase: 'CUTIN',
      });
    }

    // Phase 3: Impact Frames (~65ms high-contrast B&W flash + heavy camera shake)
    if (!this.phaseTriggered.p3 && this.elapsed >= tImpact) {
      this.phaseTriggered.p3 = true;
      store.setImpactFlash(true);
      ctx.triggerShake(15);
      audioManager.playSfx('ult_impact', 0.04);
      setTimeout(() => {
        useCombatStore.getState().setImpactFlash(false);
      }, 70);
    }

    // Phase 4: Arena VFX & Aftermath
    if (!this.phaseTriggered.p4 && this.elapsed >= tPayload) {
      this.phaseTriggered.p4 = true;
      store.setActiveCutIn(null);
      ctx.timeScale = 1.0;
      ctx.cameraZoomTarget = 1.0;
      ctx.cameraFocus = null;
      this.onExecutePayload?.(this.hero, this.skill, this.targetX, this.targetY);
    }

    if (this.elapsed >= tEnd) {
      this.active = false;
      ctx.ultActive = false;
      this.hero = null;
      this.skill = null;
    }
  }

  public forceClear(ctx: CombatContext): void {
    this.active = false;
    ctx.ultActive = false;
    ctx.timeScale = 1.0;
    ctx.cameraZoomTarget = 1.0;
    ctx.cameraFocus = null;
    useCombatStore.getState().setActiveCutIn(null);
    useCombatStore.getState().setImpactFlash(false);
  }
}
