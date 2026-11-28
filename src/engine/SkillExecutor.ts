import { Graphics } from 'pixi.js';
import { audioManager } from './AudioManager';
import { calculateHealAmount, calculateShieldAmount } from './CombatMath';
import type { CombatContext, EnemyUnit, HeroUnit } from './CombatTypes';
import { playHeroSkillVfx } from './HeroVfxChoreographer';
import type { SkillDef } from '../types/game';

function hexToNum(hex: string): number {
  return parseInt(hex.replace('#', ''), 16) || 0xffffff;
}

export interface PendingAim {
  heroId: string;
  slot: 1 | 2 | 'ULT';
  skill: SkillDef;
}

export class SkillExecutor {
  public readonly aimGfx = new Graphics();
  public pendingAim: PendingAim | null = null;
  private autoSkillTimer = 0.45;

  constructor() {
    this.aimGfx.visible = false;
  }

  public startAiming(ctx: CombatContext, heroId: string, slot: 1 | 2 | 'ULT'): boolean {
    const hero = ctx.heroes.find((h) => h.heroId === heroId && h.alive);
    if (!hero) return false;

    const skill = slot === 'ULT' ? hero.def.ultimate : hero.def.skills[slot - 1];
    if (!this.canCast(ctx, hero, slot, skill)) return false;

    // SELF skills & ULTIMATES cast immediately on tap (Grand Chase style — instant cinematic Ultimate Cut-In!)
    if (skill.aimType === 'SELF') {
      this.castSkill(ctx, hero, slot, hero.x, hero.y);
      return true;
    }

    if (slot === 'ULT') {
      const target =
        ctx.enemies.find((e) => e.alive && e.def.isBoss) ??
        ctx.enemies.find((e) => e.alive);
      this.castSkill(
        ctx,
        hero,
        'ULT',
        target ? target.x : hero.x + hero.facing * 180,
        target ? target.y : hero.y,
      );
      return true;
    }

    this.pendingAim = { heroId, slot, skill };
    this.aimGfx.visible = true;
    return true;
  }

  public cancelAiming(): void {
    this.pendingAim = null;
    this.aimGfx.visible = false;
    this.aimGfx.clear();
  }

  public canCast(ctx: CombatContext, hero: HeroUnit, slot: 1 | 2 | 'ULT', skill: SkillDef): boolean {
    if (!hero.alive || ctx.ultActive) return false;
    if (slot === 'ULT') {
      const cost = skill.gaugeCost ?? 45;
      const isLinkChain =
        ctx.linkWindowTimer > 0 &&
        ctx.linkPartnerHeroId !== null &&
        ctx.linkPartnerHeroId !== hero.heroId;
      if (hero.ultCd > 0) return false;
      if (ctx.globalUltCd > 0 && !isLinkChain) return false;
      return ctx.ultGauge >= cost;
    }
    const cd = slot === 1 ? hero.cd1 : hero.cd2;
    return cd <= 0 && ctx.sp >= skill.spCost;
  }

  public renderAimTelegraph(ctx: CombatContext, pointerX: number, pointerY: number): void {
    if (!this.pendingAim) {
      this.aimGfx.visible = false;
      return;
    }
    const hero = ctx.heroes.find((h) => h.heroId === this.pendingAim!.heroId);
    if (!hero || !hero.alive) {
      this.cancelAiming();
      return;
    }

    const { skill } = this.pendingAim;
    const color = hexToNum(hero.def.themeColor);
    const radius = skill.radius * (1 + hero.stats.aoeRadiusBonus);
    const dx = pointerX - hero.x;
    const dy = pointerY - hero.y;
    const dist = Math.hypot(dx, dy);
    const clampedDist = Math.min(dist, skill.range || 320);
    const angle = Math.atan2(dy, dx);
    const tx = hero.x + Math.cos(angle) * clampedDist;
    const ty = hero.y + Math.sin(angle) * clampedDist;

    this.aimGfx.clear();
    this.aimGfx.visible = true;

    // Outer max range dashed-feel ring around hero
    if (skill.range > 0) {
      this.aimGfx
        .ellipse(hero.x, hero.y, skill.range, skill.range * 0.72)
        .stroke({ color: 0xffffff, width: 1.5, alpha: 0.28 });
    }

    if (skill.aimType === 'CIRCLE') {
      this.aimGfx
        .ellipse(tx, ty, radius, radius * 0.68)
        .fill({ color, alpha: 0.22 })
        .stroke({ color, width: 3, alpha: 0.92 });
      this.aimGfx.circle(tx, ty, 6).fill({ color: 0xffffff, alpha: 0.95 });
    } else if (skill.aimType === 'CONE') {
      const span = 0.68;
      this.aimGfx
        .moveTo(hero.x, hero.y)
        .arc(hero.x, hero.y, radius, angle - span, angle + span)
        .lineTo(hero.x, hero.y)
        .fill({ color, alpha: 0.24 })
        .stroke({ color, width: 3, alpha: 0.92 });
    } else if (skill.aimType === 'LINE' || skill.aimType === 'DASH') {
      const len = skill.aimType === 'DASH' ? clampedDist : skill.range;
      const halfW = Math.max(24, radius * 0.45);
      const ex = hero.x + Math.cos(angle) * len;
      const ey = hero.y + Math.sin(angle) * len;
      const px = -Math.sin(angle) * halfW;
      const py = Math.cos(angle) * halfW;

      this.aimGfx
        .poly([
          hero.x + px,
          hero.y + py,
          ex + px,
          ey + py,
          ex - px,
          ey - py,
          hero.x - px,
          hero.y - py,
        ])
        .fill({ color, alpha: 0.24 })
        .stroke({ color, width: 3, alpha: 0.92 });
      this.aimGfx.circle(ex, ey, 10).fill({ color, alpha: 0.65 });
    }
  }

  public confirmAim(ctx: CombatContext, pointerX: number, pointerY: number): boolean {
    if (!this.pendingAim) return false;
    const { heroId, slot } = this.pendingAim;
    const hero = ctx.heroes.find((h) => h.heroId === heroId && h.alive);
    this.cancelAiming();
    if (!hero) return false;
    return this.castSkill(ctx, hero, slot, pointerX, pointerY);
  }

  public castSkill(
    ctx: CombatContext,
    hero: HeroUnit,
    slot: 1 | 2 | 'ULT',
    rawTx: number,
    rawTy: number,
  ): boolean {
    const skill = slot === 'ULT' ? hero.def.ultimate : hero.def.skills[slot - 1];
    if (!this.canCast(ctx, hero, slot, skill)) return false;

    // Clamp target within skill range
    let tx = rawTx;
    let ty = rawTy;
    if (skill.range > 0) {
      const dx = rawTx - hero.x;
      const dy = rawTy - hero.y;
      const d = Math.hypot(dx, dy);
      if (d > skill.range) {
        tx = hero.x + (dx / d) * skill.range;
        ty = hero.y + (dy / d) * skill.range;
      }
    }
    tx = Math.max(ctx.bounds.minX + 40, Math.min(ctx.bounds.maxX - 40, tx));
    ty = Math.max(ctx.bounds.minY + 40, Math.min(ctx.bounds.maxY - 40, ty));

    if (slot === 'ULT') {
      const cost = skill.gaugeCost ?? 45;
      ctx.ultGauge = Math.max(0, ctx.ultGauge - cost);
      const baseUltCd =
        skill.cooldown > 1
          ? skill.cooldown
          : hero.def.tier === 'UR'
            ? 22
            : hero.def.tier === 'SSR'
              ? 20
              : hero.def.tier === 'SR'
                ? 18
                : 16;
      const effectiveUltCd = Math.max(
        10,
        Number((baseUltCd * (1 - Math.min(0.25, hero.stats.cdr))).toFixed(1)),
      );
      hero.maxUltCd = effectiveUltCd;
      hero.ultCd = effectiveUltCd;
      ctx.globalUltCd = 3.0;
      ctx.triggerUltimate(hero, skill, tx, ty);
      return true;
    }

    // Spend SP & add balanced Ultimate Gauge (+3.0 per SP spent for tactical pacing!)
    ctx.sp = Math.max(0, ctx.sp - skill.spCost);
    ctx.addUltGauge(skill.spCost * 3.0, 1 + hero.stats.ultGaugeBonus);

    // Chrono 4-piece Set: 25% chance to refund 0.5 SP on active skill cast
    const hasChrono4 = hero.stats.activeSets.some((s) => s.setId === 'CHRONO' && s.count >= 4);
    if (hasChrono4 && Math.random() < 0.25) {
      ctx.addSp(0.5);
      ctx.spawnDamageText(hero.x, hero.y - 52, '+0.5 SP', 0x38bdf8);
    }

    const effectiveCd = Math.max(1.2, skill.cooldown * (1 - hero.stats.cdr));
    if (slot === 1) hero.cd1 = effectiveCd;
    else hero.cd2 = effectiveCd;

    // Astraea UR Passive (Crown of Six Stars): Any ally casting an active skill ignites 1 Starlight Blade (6 stacks, or 5 when Transcended)!
    const astraea = ctx.heroes.find((h) => h.alive && h.heroId === 'astraea');
    if (astraea) {
      const neededStacks = astraea.transcended ? 5 : 6;
      astraea.starlightBlades = Math.min(neededStacks, astraea.starlightBlades + 1);
      if (astraea.starlightBlades >= neededStacks) {
        astraea.starlightBlades = 0;
        const target =
          ctx.enemies.find((e) => e.alive && e.def.isBoss) ??
          ctx.enemies.find((e) => e.alive);
        if (target) {
          const spBonus = astraea.transcended ? 0.8 : 0.6;
          ctx.addSp(spBonus);
          ctx.spawnDamageText(
            astraea.x,
            astraea.y - 68,
            astraea.transcended ? '❖ EMPYREAN BARRAGE! +0.8 SP' : '✦ SIX-STAR BARRAGE! +0.6 SP',
            astraea.transcended ? 0xfde047 : 0xf0abfc,
            true,
          );
          for (let b = 0; b < 6; b++) {
            const ang = (b * Math.PI * 2) / 6;
            const ox = astraea.x + Math.cos(ang) * 42;
            const oy = astraea.y - 54 + Math.sin(ang) * 24;
            ctx.spawnBeam(ox, oy, target.x, target.y - 26, b % 2 === 0 ? 0xfde047 : 0x38e8ff, astraea.transcended ? 11 : 9);
          }
          ctx.spawnRingWave(target.x, target.y, astraea.transcended ? 155 : 130, astraea.transcended ? 0xfde047 : 0xe879f9, 0.45);
          ctx.damageEnemy(astraea, target, {
            multiplier: astraea.transcended ? 2.6 : 2.2,
            isSkill: true,
            isTrueDamage: true,
            hitShieldHits: 6,
            breakDamage: astraea.transcended ? 24 : 18,
          });
        }
      }
    }

    this.executeSkillPayload(ctx, hero, skill, slot, tx, ty);
    return true;
  }

  /**
   * Executes the full tactical effects of any Skill 1, Skill 2, or Ultimate (called by UltimateDirector on Phase 4).
   */
  public executeSkillPayload(
    ctx: CombatContext,
    hero: HeroUnit,
    skill: SkillDef,
    slot: 1 | 2 | 'ULT',
    tx: number,
    ty: number,
  ): void {
    const isUlt = slot === 'ULT';
    const color = hexToNum(hero.def.themeColor);
    const radius = skill.radius * (1 + hero.stats.aoeRadiusBonus);
    const angle = Math.atan2(ty - hero.y, tx - hero.x);
    hero.facing = tx >= hero.x ? 1 : -1;
    hero.attackSwingDuration = 0.36;
    hero.attackSwingTimer = 0.36;
    hero.springLeanVel += 10.5;
    hero.squashX = 1.14;
    hero.squashY = 0.88;

    // Phantom Silhouette Afterimage burst on every Active Skill & Ultimate launch!
    if (hero.hasFullSprite) {
      const sc = hero.baseScaleY ?? 0.9;
      const ghostTint = isUlt ? 0xfde047 : color;
      ctx.spawnGhostAfterimage(
        hero.liveMesh.texture,
        hero.x - hero.facing * 16,
        hero.y,
        sc * hero.facing,
        sc,
        ghostTint,
        isUlt ? 0.65 : 0.48,
        isUlt ? 0.34 : 0.24,
      );
      ctx.spawnGhostAfterimage(
        hero.liveMesh.texture,
        hero.x - hero.facing * 32,
        hero.y - 4,
        sc * hero.facing * 1.03,
        sc * 1.03,
        color,
        isUlt ? 0.44 : 0.28,
        isUlt ? 0.28 : 0.19,
      );
    }

    // Trigger sleek Mini Anime Skill Callout strip on S1 / S2 casts + hero-specific casting aura!
    if (!isUlt) {
      ctx.triggerSkillCallout(hero, skill.name, slot);
      ctx.spawnRingWave(hero.x, hero.y, 74, color, 0.36);
    } else {
      // Launch each hero's BESPOKE Signature Ultimate Choreography (all 12 heroes unique!)
      playHeroSkillVfx(ctx, hero, skill, 'ULT', tx, ty, radius, angle);
    }

    // Seraphina Passive: Casting any active skill conjures 1 Star Orb (except S2 consumes them first)
    let consumedOrbs = 0;
    if (hero.heroId === 'seraphina') {
      if (skill.id === 'seraphina_s2') {
        consumedOrbs = hero.starOrbs;
        hero.starOrbs = 0;
      } else if (isUlt) {
        hero.starOrbs = 3;
      } else {
        hero.starOrbs = Math.min(3, hero.starOrbs + 1);
      }
    }

    // DASH movement skills (Vaelen S1, Elara S1) with luminous anime afterimage ghost trail!
    if (skill.aimType === 'DASH') {
      const originX = hero.x;
      const originY = hero.y;
      ctx.spawnBeam(originX, originY - 24, tx, ty - 24, color, 16);
      ctx.spawnBurst(originX, originY - 20, color, 12);
      // 4 staggered luminous anime afterimage dash silhouettes along path
      for (let step = 0; step < 4; step++) {
        const t = (step + 1) / 5;
        const ax = originX + (tx - originX) * t;
        const ay = originY + (ty - originY) * t - 26;
        ctx.spawnSpriteFx({
          tex: 'crescentSlash',
          x: ax,
          y: ay,
          rotation: angle,
          scaleX: 0.48 + step * 0.08,
          scaleY: 0.52,
          endScaleX: 0.85,
          endScaleY: 0.25,
          tint: step % 2 === 0 ? color : 0xffffff,
          alpha: 0.82,
          life: 0.26,
          delay: step * 0.025,
          darkHalo: true,
        });
      }
      if (hero.heroId === 'elara') {
        // Elara detonates decoy at origin and vaults smoothly in a luminous arc to target!
        hero.dashState = {
          startX: originX,
          startY: originY,
          endX: tx,
          endY: ty,
          elapsed: 0,
          duration: 0.26,
          color,
          ghostTimer: 0,
          arcHeight: 42,
        };
        hero.atkSpdBuffTimer = 4.0;
        hero.atkSpdBuffValue = 0.35;
        ctx.spawnRingWave(originX, originY, radius, color, 0.38);
        this.applyDamageInArea(ctx, hero, skill, isUlt, originX, originY, radius, angle);
        audioManager.playSfx('slash');
        return;
      }
      // Vaelen & Zephyrion dash smoothly through foes along line leaving tinted silhouette afterimages!
      hero.dashState = {
        startX: originX,
        startY: originY,
        endX: tx,
        endY: ty,
        elapsed: 0,
        duration: 0.24,
        color,
        ghostTimer: 0,
        arcHeight: 16,
      };
      const hitEnemies = this.findEnemiesInShape(ctx, 'LINE', originX, originY, tx, ty, radius, angle);
      for (const e of hitEnemies) {
        if (hero.heroId === 'vaelen') e.starfallMarkTimer = 6.0;
        this.applySkillHitToEnemy(ctx, hero, skill, e, isUlt, 1.0);
      }
      if (skill.id === 'zephyrion_s1') {
        hero.cd2 = Math.max(0, hero.cd2 - 1.5);
      }
      ctx.spawnRingWave(tx, ty, 95, color, 0.35);
      audioManager.playSfx('slash');
      return;
    }

    // HEALER & SUPPORT SKILLS (Lyra, Clara, Garrick S2/Ult, Draven S2, Titus S2/Ult)
    if (skill.effects.includes('HEAL') || (skill.aimType === 'SELF' && skill.effects.includes('SHIELD') && !skill.effects.includes('BURN_DETONATE') && skill.id !== 'raze_s2' && skill.id !== 'draven_ult')) {
      const centerX = skill.aimType === 'SELF' ? hero.x : tx;
      const centerY = skill.aimType === 'SELF' ? hero.y : ty;
      const allies = ctx.heroes.filter(
        (a) => a.alive && (skill.aimType === 'SELF' || Math.hypot(a.x - centerX, a.y - centerY) <= radius + 90),
      );

      if (skill.id === 'lyra_s2') {
        // Sanctuary Bloom 6s zone
        ctx.addZone({
          id: `zone_${Date.now()}`,
          kind: 'SANCTUARY_BLOOM',
          ownerHeroId: hero.heroId,
          x: centerX,
          y: centerY,
          radius,
          remaining: 6.0,
          maxDuration: 6.0,
          tickTimer: 0.1,
          color: 0x10b981,
        });
        audioManager.playSfx('heal');
        return;
      }

      if (!isUlt) {
        playHeroSkillVfx(ctx, hero, skill, slot, centerX, centerY, radius, angle);
      } else {
        ctx.spawnRingWave(centerX, centerY, radius, color, 0.5);
      }

      for (const ally of allies) {
        if (skill.effects.includes('HEAL')) {
          const healAmt =
            skill.id === 'lyra_ult' || skill.id === 'clara_ult' || skill.id === 'aurelia_ult'
              ? Math.round(ally.maxHp * skill.multiplier * (1 + hero.stats.healBonus))
              : calculateHealAmount(hero.stats.atk, skill.multiplier, hero.stats.healBonus);
          const overflow = Math.max(0, ally.hp + healAmt - ally.maxHp);
          ctx.healHero(hero, ally, healAmt, true);

          // Aurelia Passive (Blossom Covenant): excess healing converts into Starlight Barrier + +12% ATK
          if (hero.heroId === 'aurelia') {
            if (overflow > 0) {
              ctx.grantShield(hero, ally, Math.min(Math.round(ally.maxHp * 0.2), overflow), false);
            }
            ally.atkBuffTimer = Math.max(ally.atkBuffTimer, 6.0);
            ally.atkBuffValue = Math.max(ally.atkBuffValue, 0.12);
          }

          if (skill.id === 'lyra_s1' || skill.id === 'aurelia_s2') {
            ally.hotTimer = 4.5;
            ally.hotTickAmount = calculateHealAmount(hero.stats.atk, 0.38, hero.stats.healBonus);
          }
          // Relic: Lantern of Dawnlight (+10% ATK buff on S1 heal)
          if (hero.relicId === 'relic_dawnlight_lantern' && slot === 1) {
            ally.atkBuffTimer = Math.max(ally.atkBuffTimer, 5.0);
            ally.atkBuffValue = Math.max(ally.atkBuffValue, 0.1);
          }
        }

        if (skill.effects.includes('SHIELD')) {
          const isSelfOnly = skill.id === 'titus_s2';
          if (!isSelfOnly || ally.heroId === hero.heroId) {
            const shieldAmt =
              skill.id === 'clara_s2' || skill.id === 'aurelia_s2'
                ? Math.round(hero.stats.atk * skill.multiplier * hero.stats.shieldPower)
                : calculateShieldAmount(hero.maxHp, skill.multiplier, hero.stats.shieldPower);
            ctx.grantShield(
              hero,
              ally,
              shieldAmt,
              skill.id === 'draven_s2' || skill.id === 'bram_s2' || skill.id === 'malakhia_s2',
            );
          }
        }

        if (skill.effects.includes('ATK_BUFF')) {
          ally.atkBuffTimer = isUlt ? (skill.id === 'aurelia_ult' ? 9.0 : 8.0) : 6.0;
          ally.atkBuffValue = skill.id === 'aurelia_ult' ? 0.25 : isUlt ? 0.2 : 0.18;
        }
        if (skill.effects.includes('INVINCIBLE')) {
          ally.invincibleTimer = skill.id === 'aurelia_ult' ? 2.0 : 1.5;
        }
        if (skill.effects.includes('DAMAGE_REDUCE')) {
          ally.dmgReduceTimer = 6.0;
          ally.dmgReduceValue = skill.id === 'garrick_ult' ? 0.5 : 0.25;
        }
        if (skill.effects.includes('REFLECT')) {
          ally.reflectTimer = 6.0;
        }
      }

      if (skill.effects.includes('PROVOKE')) {
        for (const e of ctx.enemies) {
          if (e.alive && Math.hypot(e.x - hero.x, e.y - hero.y) <= radius + 40) {
            e.provokeTimer = 4.0 + (hero.relicId === 'relic_prism_aegis' ? 1.5 : 0);
            e.provokeTargetHeroId = hero.heroId;
          }
        }
      }

      if (skill.id === 'lyra_ult' || skill.id === 'aurelia_ult') {
        const spGain = skill.id === 'aurelia_ult' ? 1.5 : 2.0;
        ctx.addSp(spGain);
        ctx.spawnDamageText(hero.x, hero.y - 58, `+${spGain.toFixed(1)} SP`, 0x38e8ff, true);
      }

      audioManager.playSfx(skill.effects.includes('HEAL') ? 'heal' : 'shield');
      return;
    }

    // ORION S1: Astral Beacon Zone (7s +18% Crit Rate & 40% ATK/s)
    if (skill.id === 'orion_s1') {
      ctx.addZone({
        id: `beacon_${Date.now()}`,
        kind: 'ASTRAL_BEACON',
        ownerHeroId: hero.heroId,
        x: tx,
        y: ty,
        radius,
        remaining: 7.0,
        maxDuration: 7.0,
        tickTimer: 0.1,
        color: 0x38e8ff,
      });
      ctx.spawnRingWave(tx, ty, radius, 0x38e8ff, 0.4);
      audioManager.playSfx('shield');
      return;
    }

    // OFFENSIVE / HYBRID SKILLS (Single hit, Multi-hit, Zones, Gather, Pull, Burn Detonate)
    const effectiveRadius =
      skill.id === 'seraphina_s2'
        ? radius * (1 + consumedOrbs * 0.15)
        : skill.id === 'astraea_s1' && hero.ascensionTimer > 0
          ? radius * 1.25
          : radius;
    const orbBonusMult = skill.id === 'seraphina_s2' ? 1 + consumedOrbs * 0.35 : 1.0;

    // Special zones & UR/SSR signature enhancements
    if (skill.id === 'astraea_ult') {
      // UR CELESTIAL DOMAIN (9s, or 12s when Transcended!) + ASCENSION FORM + SQUAD ATK/ATKSPD BUFF!
      const domainDur = hero.transcended ? 12.0 : 9.0;
      hero.ascensionTimer = domainDur;
      for (const ally of ctx.heroes) {
        if (!ally.alive) continue;
        ally.atkBuffTimer = Math.max(ally.atkBuffTimer, domainDur);
        ally.atkBuffValue = Math.max(ally.atkBuffValue, hero.transcended ? 0.25 : 0.2);
        ally.atkSpdBuffTimer = Math.max(ally.atkSpdBuffTimer, domainDur);
        ally.atkSpdBuffValue = Math.max(ally.atkSpdBuffValue, hero.transcended ? 0.2 : 0.15);
      }
      ctx.addZone({
        id: `celestial_domain_${Date.now()}`,
        kind: 'CELESTIAL_DOMAIN',
        ownerHeroId: hero.heroId,
        x: tx,
        y: ty,
        radius: hero.transcended ? 450 : 410,
        remaining: domainDur,
        maxDuration: domainDur,
        tickTimer: hero.transcended ? 0.9 : 1.2,
        color: hero.transcended ? 0xfde047 : 0xe879f9,
      });
      ctx.notifyBanner(
        hero.transcended
          ? '❖ EMPYREAN CELESTIAL DOMAIN — TRANSCENDED ARCHON UNLEASHED! ❖'
          : '❖ CELESTIAL DOMAIN EXPANDED — ASTRAEA ASCENSION FORM! ❖',
      );
    } else if (skill.id === 'astraea_s2') {
      // Prismatic Judgment also cloaks the squad in a 15% Max HP Starlight Aegis!
      for (const ally of ctx.heroes) {
        if (!ally.alive) continue;
        const shAmt = Math.round(ally.maxHp * 0.15 * hero.stats.shieldPower);
        ctx.grantShield(hero, ally, shAmt, false);
      }
    } else if (skill.id === 'astraea_s1' && hero.ascensionTimer > 0) {
      // Ascension Form: echoing prismatic starlight pulse 0.24s later!
      ctx.delayedStrikes.push({
        delay: 0.24,
        fn: () => {
          if (!hero.alive) return;
          ctx.spawnRingWave(tx, ty, effectiveRadius, 0x38e8ff, 0.42);
          ctx.spawnBurst(tx, ty - 24, 0xfde047, 14, 48);
          this.applyDamageInArea(ctx, hero, skill, false, tx, ty, effectiveRadius, angle, 0.55, false);
        },
      });
    } else if (skill.id === 'velaris_ult') {
      // UR ZERO MERIDIAN RIFT (9s, or 12s when Transcended!) + ECLIPSE OVERDRIVE (+25% AtkSpd, +20% Lifesteal)!
      const riftDur = hero.transcended ? 12.0 : 9.0;
      hero.overdriveTimer = Math.max(hero.overdriveTimer, riftDur);
      hero.atkSpdBuffTimer = Math.max(hero.atkSpdBuffTimer, riftDur);
      hero.atkSpdBuffValue = Math.max(hero.atkSpdBuffValue, hero.transcended ? 0.32 : 0.25);
      hero.atkBuffTimer = Math.max(hero.atkBuffTimer, riftDur);
      hero.atkBuffValue = Math.max(hero.atkBuffValue, hero.transcended ? 0.25 : 0.18);
      ctx.addZone({
        id: `zero_meridian_rift_${Date.now()}`,
        kind: 'CELESTIAL_DOMAIN',
        ownerHeroId: hero.heroId,
        x: tx,
        y: ty,
        radius: hero.transcended ? 430 : 390,
        remaining: riftDur,
        maxDuration: riftDur,
        tickTimer: hero.transcended ? 0.9 : 1.2,
        color: hero.transcended ? 0xfde047 : 0x818cf8,
      });
      ctx.notifyBanner(
        hero.transcended
          ? '❖ EMPYREAN ZERO MERIDIAN — ECLIPSE MONARCH UNLEASHED! ❖'
          : '❖ ZERO MERIDIAN RIFT OPENED — VELARIS ECLIPSE OVERDRIVE! ❖',
      );
    } else if (skill.id === 'velaris_s2') {
      // Horizon Sever grants Velaris +25% Crit Rate (6s) + 18% Max HP Starlight Barrier
      hero.critBuffTimer = Math.max(hero.critBuffTimer, 6.0);
      hero.critBuffValue = Math.max(hero.critBuffValue, 0.25);
      const shAmt = Math.round(hero.maxHp * 0.18 * hero.stats.shieldPower);
      ctx.grantShield(hero, hero, shAmt, false);
    } else if (skill.id === 'malakhia_s1') {
      // Shattered Halo Cleave wraps Malakhia in a 16% Max HP Cinder Shield
      const shAmt = Math.round(hero.maxHp * 0.16 * hero.stats.shieldPower);
      ctx.grantShield(hero, hero, shAmt, true);
    } else if (skill.id === 'malakhia_ult') {
      // UR ASHEN ECLIPSE DOMAIN (8s, or 11s when Transcended!) + SERAPHIC OVERDRIVE!
      const domDur = hero.transcended ? 11.0 : 8.0;
      hero.overdriveTimer = Math.max(hero.overdriveTimer, domDur);
      hero.atkSpdBuffTimer = Math.max(hero.atkSpdBuffTimer, domDur);
      hero.atkSpdBuffValue = Math.max(hero.atkSpdBuffValue, 0.2);
      hero.dmgReduceTimer = Math.max(hero.dmgReduceTimer, domDur);
      hero.dmgReduceValue = Math.max(hero.dmgReduceValue, 0.22);
      ctx.addZone({
        id: `ashen_eclipse_domain_${Date.now()}`,
        kind: 'CELESTIAL_DOMAIN',
        ownerHeroId: hero.heroId,
        x: tx,
        y: ty,
        radius: hero.transcended ? 430 : 385,
        remaining: domDur,
        maxDuration: domDur,
        tickTimer: hero.transcended ? 0.9 : 1.2,
        color: hero.transcended ? 0xfbbf24 : 0xff3355,
      });
      ctx.notifyBanner(
        hero.transcended
          ? '❖ APOTHEOSIS OF THE CRIMSON ECLIPSE — SERAPHIC OVERDRIVE! ❖'
          : '❖ ASHEN ECLIPSE DOMAIN — JUDGMENT OF THE FALLEN SERAPH! ❖',
      );
    } else if (skill.id === 'sylvaris_ult') {
      // Awakening of Sylva blooms a 6s Verdant Sanctuary Zone (HP & SP regen!)
      ctx.addZone({
        id: `verdant_sanctuary_${Date.now()}`,
        kind: 'VERDANT_SANCTUARY',
        ownerHeroId: hero.heroId,
        x: tx,
        y: ty,
        radius: effectiveRadius + 40,
        remaining: 6.0,
        maxDuration: 6.0,
        tickTimer: 0.4,
        color: 0x34d399,
      });
      ctx.notifyBanner('✿ AWAKENING OF SYLVA — VERDANT SANCTUARY (+HP & +SP)! ✿');
    } else if (skill.id === 'vaelen_ult') {
      ctx.addZone({
        id: `rift_${Date.now()}`,
        kind: 'STARLIGHT_RIFT',
        ownerHeroId: hero.heroId,
        x: tx,
        y: ty,
        radius: effectiveRadius,
        remaining: 4.0,
        maxDuration: 4.0,
        tickTimer: 0.5,
        color: 0xa855f7,
      });
    } else if (skill.id === 'draven_ult') {
      hero.undyingTimer = 3.0;
      ctx.addZone({
        id: `caldera_${Date.now()}`,
        kind: 'LAVA_CALDERA',
        ownerHeroId: hero.heroId,
        x: tx,
        y: ty,
        radius: effectiveRadius,
        remaining: 7.0,
        maxDuration: 7.0,
        tickTimer: 0.4,
        color: 0xf97316,
      });
    } else if (skill.id === 'orion_ult') {
      // Resets Twin Railburst CD immediately
      hero.cd2 = 0;
    } else if (skill.id === 'zephyrion_ult') {
      // Resets Chrono Blink immediately
      hero.cd1 = 0;
    } else if (skill.id === 'zephyrion_s2') {
      hero.critBuffTimer = 6.0;
      hero.critBuffValue = 0.25;
    } else if (skill.id === 'bram_ult') {
      hero.dmgReduceTimer = 6.0;
      hero.dmgReduceValue = 0.3;
    } else if (skill.id === 'garrick_s1') {
      // Garrick leaps smoothly in a heroic shield-slam arc instead of snapping instantly!
      const dist = Math.hypot(tx - hero.x, ty - hero.y);
      const stopBack = Math.min(36, dist * 0.25);
      const landX = Math.max(
        ctx.bounds.minX + 45,
        Math.min(ctx.bounds.maxX - 45, tx - Math.cos(angle) * stopBack),
      );
      const landY = Math.max(
        ctx.bounds.minY + 45,
        Math.min(ctx.bounds.maxY - 45, ty - Math.sin(angle) * stopBack),
      );
      hero.dashState = {
        startX: hero.x,
        startY: hero.y,
        endX: landX,
        endY: landY,
        elapsed: 0,
        duration: 0.28,
        color,
        ghostTimer: 0,
        arcHeight: 54,
      };
    } else if (skill.id === 'kael_s2') {
      // Backstep Volley vaults smoothly backward in a readable arc instead of teleporting!
      const backX = Math.max(
        ctx.bounds.minX + 45,
        Math.min(ctx.bounds.maxX - 45, hero.x - Math.cos(angle) * 65),
      );
      const backY = Math.max(
        ctx.bounds.minY + 45,
        Math.min(ctx.bounds.maxY - 45, hero.y - Math.sin(angle) * 45),
      );
      hero.dashState = {
        startX: hero.x,
        startY: hero.y,
        endX: backX,
        endY: backY,
        elapsed: 0,
        duration: 0.22,
        color,
        ghostTimer: 0,
        arcHeight: 28,
      };
    }

    const hitCount = skill.hitCount ?? 1;
    if (!isUlt) {
      playHeroSkillVfx(ctx, hero, skill, slot, tx, ty, effectiveRadius, angle);
    }
    if (hitCount > 1) {
      // Stagger multi-hit waves so Hit-Count Shield visibly shatters and numbers cascade!
      const interval = Math.min(0.11, 0.72 / hitCount);
      for (let i = 0; i < hitCount; i++) {
        ctx.delayedStrikes.push({
          delay: i * interval,
          fn: () => {
            if (!hero.alive) return;
            const jitterX = tx + (Math.random() - 0.5) * 44;
            const jitterY = ty + (Math.random() - 0.5) * 30;
            if (!isUlt && i % 2 === 1) {
              ctx.spawnBurst(jitterX, jitterY - 18, color, 6, 22);
            }
            this.applyDamageInArea(
              ctx,
              hero,
              skill,
              isUlt,
              tx,
              ty,
              effectiveRadius,
              angle,
              orbBonusMult / hitCount,
              i === 0,
            );
            audioManager.playSfx(i === 0 ? 'slash' : 'hit', 0.16);
          },
        });
      }
    } else {
      ctx.triggerShake(isUlt ? 15 : 7);
      audioManager.playSfx(isUlt ? 'ult_impact' : 'slash');
      this.applyDamageInArea(ctx, hero, skill, isUlt, tx, ty, effectiveRadius, angle, orbBonusMult, true);
    }
  }

  private findEnemiesInShape(
    ctx: CombatContext,
    aimType: SkillDef['aimType'],
    ox: number,
    oy: number,
    tx: number,
    ty: number,
    radius: number,
    angle: number,
  ): EnemyUnit[] {
    const out: EnemyUnit[] = [];
    for (const e of ctx.enemies) {
      if (!e.alive) continue;
      if (aimType === 'CIRCLE' || aimType === 'SELF') {
        const cx = aimType === 'SELF' ? ox : tx;
        const cy = aimType === 'SELF' ? oy : ty;
        if (Math.hypot(e.x - cx, e.y - cy) <= radius + e.def.radius) out.push(e);
      } else if (aimType === 'CONE') {
        const dx = e.x - ox;
        const dy = e.y - oy;
        const dist = Math.hypot(dx, dy);
        if (dist <= radius + e.def.radius) {
          let diff = Math.atan2(dy, dx) - angle;
          while (diff > Math.PI) diff -= Math.PI * 2;
          while (diff < -Math.PI) diff += Math.PI * 2;
          if (Math.abs(diff) <= 0.85) out.push(e);
        }
      } else {
        // LINE / DASH corridor
        const lx = tx - ox;
        const ly = ty - oy;
        const lenSq = Math.max(1, lx * lx + ly * ly);
        const t = Math.max(0, Math.min(1, ((e.x - ox) * lx + (e.y - oy) * ly) / lenSq));
        const px = ox + t * lx;
        const py = oy + t * ly;
        if (Math.hypot(e.x - px, e.y - py) <= Math.max(46, radius * 0.65) + e.def.radius) {
          out.push(e);
        }
      }
    }
    return out;
  }

  private applyDamageInArea(
    ctx: CombatContext,
    hero: HeroUnit,
    skill: SkillDef,
    isUlt: boolean,
    tx: number,
    ty: number,
    radius: number,
    angle: number,
    scaleFactor = 1.0,
    applyCrowdControl = true,
  ): void {
    const lineEndX = skill.aimType === 'LINE' ? hero.x + Math.cos(angle) * skill.range : tx;
    const lineEndY = skill.aimType === 'LINE' ? hero.y + Math.sin(angle) * skill.range : ty;
    const targets = this.findEnemiesInShape(
      ctx,
      skill.aimType,
      hero.x,
      hero.y,
      lineEndX,
      lineEndY,
      radius,
      angle,
    );

    // Raze S2 spreads highest Burn stacks among nearby foes
    let maxBurnToSpread = 0;
    if (skill.id === 'raze_s2') {
      for (const t of targets) maxBurnToSpread = Math.max(maxBurnToSpread, t.burnStacks);
    }

    let vaelenMarkTriggered = false;

    for (const enemy of targets) {
      if (!enemy.alive) continue;

      if (applyCrowdControl) {
        if (skill.effects.includes('GATHER') && !enemy.def.isBoss) {
          const cx = skill.aimType === 'SELF' ? hero.x : tx;
          const cy = skill.aimType === 'SELF' ? hero.y : ty;
          enemy.x = enemy.x * 0.25 + cx * 0.75 + (Math.random() - 0.5) * 24;
          enemy.y = enemy.y * 0.25 + cy * 0.75 + (Math.random() - 0.5) * 18;
        }
        if (skill.effects.includes('PULL')) {
          if (enemy.def.isBoss) {
            const pullEndX = Math.max(
              ctx.bounds.minX + 45,
              Math.min(ctx.bounds.maxX - 45, enemy.x - Math.cos(angle) * (enemy.def.radius + 45)),
            );
            const pullEndY = Math.max(
              ctx.bounds.minY + 45,
              Math.min(ctx.bounds.maxY - 45, enemy.y - Math.sin(angle) * (enemy.def.radius + 35)),
            );
            hero.dashState = {
              startX: hero.x,
              startY: hero.y,
              endX: pullEndX,
              endY: pullEndY,
              elapsed: 0,
              duration: 0.24,
              color: hexToNum(hero.def.themeColor),
              ghostTimer: 0,
              arcHeight: 18,
            };
          } else {
            enemy.x = hero.x + Math.cos(angle) * 72;
            enemy.y = hero.y + Math.sin(angle) * 58;
          }
        }
        if (skill.effects.includes('PROVOKE')) {
          enemy.provokeTimer = 4.5 + (hero.relicId === 'relic_prism_aegis' ? 1.5 : 0);
          enemy.provokeTargetHeroId = hero.heroId;
        }
        if (skill.effects.includes('DEF_SHRED')) {
          enemy.defShredTimer = skill.id === 'malakhia_ult' ? 7.0 : 5.0;
          enemy.defShredValue = Math.max(
            enemy.defShredValue,
            skill.id === 'malakhia_ult'
              ? 0.25
              : skill.id === 'seraphina_s1'
                ? 0.2
                : skill.id === 'ignis_s1' || skill.id === 'ignis_ult'
                  ? 0.18
                  : 0.12,
          );
        }
        if (hero.heroId === 'sylvaris') {
          enemy.verdantBloomTimer = 6.0;
        }
        if (skill.effects.includes('FREEZE') && !enemy.def.isBoss) {
          enemy.freezeTimer = Math.max(enemy.freezeTimer, 2.5);
        }
        if (skill.id === 'elara_ult') {
          enemy.lunarTraceTimer = 5.0;
        }
        if (skill.effects.includes('BURN') || hero.heroId === 'nyx' || hero.heroId === 'ignis') {
          const addStacks =
            skill.id === 'nyx_ult'
              ? 5
              : skill.id === 'ignis_ult'
                ? 4
                : skill.id === 'bram_ult'
                  ? 3
                  : skill.id === 'nyx_s1' || skill.id === 'draven_s1' || skill.id === 'ignis_s1'
                    ? 2
                    : 1;
          enemy.burnStacks = Math.min(5, Math.max(enemy.burnStacks + addStacks, maxBurnToSpread));
          enemy.burnTimer = 6.0;
          enemy.burnSourceAtk = Math.max(enemy.burnSourceAtk, hero.stats.atk);
        }
      }

      if (skill.id === 'vaelen_s2' && enemy.starfallMarkTimer > 0) {
        vaelenMarkTriggered = true;
      }

      this.applySkillHitToEnemy(ctx, hero, skill, enemy, isUlt, scaleFactor, applyCrowdControl);
    }

    if (vaelenMarkTriggered) {
      hero.overdriveTimer = 6.0;
      ctx.spawnRingWave(hero.x, hero.y, 110, 0xf5c84c, 0.35);
      ctx.spawnDamageText(hero.x, hero.y - 54, 'OVERDRIVE!', 0xfde047, true);
    }
  }

  private applySkillHitToEnemy(
    ctx: CombatContext,
    hero: HeroUnit,
    skill: SkillDef,
    enemy: EnemyUnit,
    isUlt: boolean,
    scaleFactor: number,
    applyCC = true,
  ): void {
    // Cancel Cast / STUN_CANCEL check!
    if (applyCC && skill.effects.includes('STUN_CANCEL')) {
      if (enemy.isCasting && enemy.castCancelable) {
        ctx.triggerEnemyBreak(enemy, 4.0, '⚡ CAST INTERRUPTED! +50% DMG');
        ctx.notifyBanner(`CANCEL CAST! ${enemy.def.name} is BROKEN for 4.0s (+50% DMG)!`);
      } else if (!enemy.def.isBoss) {
        enemy.stunTimer = Math.max(enemy.stunTimer, 1.15);
      }
    }

    // Nyx S2 & Ignis S2: Burn Detonation consumes Burn stacks for explosive damage!
    if (skill.id === 'nyx_s2' || skill.id === 'ignis_s2') {
      const stacks = Math.max(1, enemy.burnStacks);
      enemy.burnStacks = 0;
      enemy.burnTimer = 0;
      const perStack = skill.id === 'ignis_s2' ? 0.85 : 0.75;
      ctx.damageEnemy(hero, enemy, {
        multiplier: perStack * stacks,
        isSkill: true,
        canTriggerMark: true,
      });
      ctx.spawnBurst(enemy.x, enemy.y - 20, skill.id === 'ignis_s2' ? 0xfb923c : 0xf97316, 18, 34);
      return;
    }

    let bonusDmg = 0;
    if (skill.effects.includes('EXECUTE') && enemy.hp / enemy.maxHp < 0.35) {
      bonusDmg += 0.4;
    }
    if (hero.heroId === 'zephyrion' && (enemy.isBroken || enemy.hp / enemy.maxHp < 0.4)) {
      bonusDmg += 0.3;
    }
    if ((skill.id === 'raze_ult' || hero.heroId === 'ignis') && enemy.burnStacks > 0) {
      bonusDmg += skill.id === 'raze_ult' ? 0.4 : 0.2;
    }

    const extraAtkMult =
      skill.id === 'draven_s1'
        ? 0.8
        : skill.id === 'draven_ult'
          ? 1.8
          : skill.id === 'bram_s1'
            ? 0.7
            : skill.id === 'bram_ult'
              ? 1.4
              : 0;

    const hasHeavyBreakCC =
      skill.effects.includes('STUN_CANCEL') ||
      skill.effects.includes('FREEZE') ||
      skill.effects.includes('GATHER') ||
      skill.effects.includes('PULL') ||
      skill.effects.includes('PROVOKE');
    const breakDamage =
      (isUlt ? 34 : hasHeavyBreakCC ? 24 : 14) * Math.min(1, Math.max(0.25, scaleFactor));

    const res = ctx.damageEnemy(hero, enemy, {
      multiplier: skill.multiplier * scaleFactor,
      scalesWithDef: skill.scalesWithDef,
      extraAtkMultiplier: extraAtkMult * scaleFactor,
      isSkill: true,
      isUlt,
      bonusCritRate:
        skill.id === 'astraea_s2' && hero.ascensionTimer > 0
          ? 1.0
          : skill.id === 'kael_s1'
            ? 0.25
            : skill.id === 'zephyrion_s2'
              ? 0.2
              : 0,
      bonusDmgMult: bonusDmg,
      hitShieldHits: 1,
      breakDamage,
      canTriggerMark: applyCC,
    });
    // Vespera S2 (Ember Cluster Barrage): Thermal Mini-Detonation on targets with 3+ Burn stacks WITHOUT consuming Burn!
    if (applyCC && skill.id === 'vespera_s2' && enemy.alive && enemy.burnStacks >= 3) {
      ctx.damageEnemy(hero, enemy, {
        multiplier: 0.65 * enemy.burnStacks,
        isSkill: true,
        canTriggerMark: false,
      });
      ctx.spawnBurst(enemy.x, enemy.y - 24, 0xff4d2e, 14, 38);
      ctx.spawnDamageText(enemy.x, enemy.y - 52, 'THERMAL DETONATE!', 0xfdba74, true);
    }
    if (hero.heroId === 'zephyrion' && res.isCrit) {
      hero.cd1 = Math.max(0, hero.cd1 - 0.5);
      hero.cd2 = Math.max(0, hero.cd2 - 0.5);
    }
  }

  /**
   * Smart Auto-Skill AI per GDD Section 2.1:
   * Priority 1: Heal if any ally < 65% HP
   * Priority 2: Cancel Cast (STUN_CANCEL) if boss is casting
   * Priority 3: Shield / Gather / Multi-hit vs Hit-Count Shield
   * Priority 4: Ultimate & DPS burst rotation
   */
  public updateAutoSkill(ctx: CombatContext, dt: number, enabled: boolean): void {
    if (!enabled || ctx.ultActive || this.pendingAim) return;
    this.autoSkillTimer -= dt;
    if (this.autoSkillTimer > 0) return;
    this.autoSkillTimer = 0.45;

    const aliveEnemies = ctx.enemies.filter((e) => e.alive);
    if (aliveEnemies.length === 0) return;

    const aliveHeroes = ctx.heroes.filter((h) => h.alive);
    const boss = aliveEnemies.find((e) => e.def.isBoss);
    const primaryTarget = boss ?? aliveEnemies[0];

    // 1. Heal priority if any ally < 65% HP
    const lowAlly = aliveHeroes.find((h) => h.hp / h.maxHp < 0.65);
    if (lowAlly) {
      for (const h of aliveHeroes) {
        if (h.def.role !== 'HEALER') continue;
        if (this.canCast(ctx, h, 'ULT', h.def.ultimate) && lowAlly.hp / lowAlly.maxHp < 0.45) {
          this.castSkill(ctx, h, 'ULT', lowAlly.x, lowAlly.y);
          return;
        }
        if (this.canCast(ctx, h, 1, h.def.skills[0])) {
          this.castSkill(ctx, h, 1, lowAlly.x, lowAlly.y);
          return;
        }
        if (this.canCast(ctx, h, 2, h.def.skills[1])) {
          this.castSkill(ctx, h, 2, lowAlly.x, lowAlly.y);
          return;
        }
      }
    }

    // 2. Boss Cancel Cast interrupt priority!
    if (boss && boss.isCasting && boss.castCancelable) {
      for (const h of aliveHeroes) {
        for (const slot of [1, 2, 'ULT'] as const) {
          const sk = slot === 'ULT' ? h.def.ultimate : h.def.skills[slot - 1];
          if (sk.effects.includes('STUN_CANCEL') && this.canCast(ctx, h, slot, sk)) {
            this.castSkill(ctx, h, slot, boss.x, boss.y);
            return;
          }
        }
      }
    }

    // 3. Fire Ultimate if ready & tactically worthwhile (prioritize Starlight Link Burst chaining, don't overkill a single dying mob!)
    const ultReady = aliveHeroes
      .filter((h) => this.canCast(ctx, h, 'ULT', h.def.ultimate))
      .sort((a, b) => {
        const score = (h: HeroUnit) => {
          let s =
            h.def.tier === 'UR' ? 42 : h.def.tier === 'SSR' ? 30 : h.def.tier === 'SR' ? 20 : 10;
          if (ctx.linkWindowTimer > 0 && ctx.linkPartnerHeroId && h.heroId !== ctx.linkPartnerHeroId) {
            s += 65; // Chain Starlight Link Burst immediately!
          }
          if (boss && boss.hitShield > 0 && h.def.ultimate.effects.includes('MULTI_HIT')) s += 40;
          if (h.def.role === 'HEALER') s -= 20;
          return s;
        };
        return score(b) - score(a);
      });
    if (ultReady.length > 0 && aliveEnemies.length > 0) {
      const hasBossOrMiniBoss = aliveEnemies.some((e) => e.def.isBoss || e.def.isMiniBoss);
      const hasLinkPartnerReady =
        ctx.linkWindowTimer > 0 &&
        ctx.linkPartnerHeroId !== null &&
        ultReady.some((h) => h.heroId !== ctx.linkPartnerHeroId);
      const primaryHealthy = primaryTarget.hp / Math.max(1, primaryTarget.maxHp) >= 0.35;
      const shouldFireAutoUlt =
        hasBossOrMiniBoss || aliveEnemies.length >= 2 || primaryHealthy || hasLinkPartnerReady;
      if (shouldFireAutoUlt) {
        const caster = ultReady[0];
        const anyAllyInjured = aliveHeroes.some((h) => h.hp / h.maxHp < 0.78);
        const casterCanLink =
          ctx.linkWindowTimer > 0 &&
          ctx.linkPartnerHeroId !== null &&
          caster.heroId !== ctx.linkPartnerHeroId;
        // Avoid burning Healer Ult on full-HP trash waves unless chaining a Link Burst or fighting a Boss
        if (caster.def.role !== 'HEALER' || anyAllyInjured || casterCanLink || hasBossOrMiniBoss) {
          this.castSkill(ctx, caster, 'ULT', primaryTarget.x, primaryTarget.y);
          return;
        }
      }
    }

    // 4. Gather / Shield / Buff / Burst rotation (keep >= 1 SP reserve if boss might cast soon)
    const reserveSp = boss && !boss.isBroken ? 1.0 : 0;
    for (const h of aliveHeroes) {
      // Gather first if 2+ mobs spread out
      if (aliveEnemies.length >= 2) {
        for (const slot of [1, 2] as const) {
          const sk = h.def.skills[slot - 1];
          if (
            (sk.effects.includes('GATHER') || sk.effects.includes('SHIELD')) &&
            ctx.sp >= sk.spCost + reserveSp &&
            this.canCast(ctx, h, slot, sk)
          ) {
            this.castSkill(ctx, h, slot, primaryTarget.x, primaryTarget.y);
            return;
          }
        }
      }
    }

    // General DPS skills
    for (const h of aliveHeroes) {
      if (h.def.role === 'HEALER') continue;
      for (const slot of [2, 1] as const) {
        const sk = h.def.skills[slot - 1];
        if (ctx.sp >= sk.spCost + reserveSp && this.canCast(ctx, h, slot, sk)) {
          this.castSkill(ctx, h, slot, primaryTarget.x, primaryTarget.y);
          return;
        }
      }
    }
  }
}
