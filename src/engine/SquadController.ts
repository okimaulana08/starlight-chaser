import { audioManager } from './AudioManager';
import type { CombatContext, EnemyUnit, HeroUnit } from './CombatTypes';

/**
 * Diamond squad formation offsets relative to squadAnchor (Tank front, Assault/DPS flank, Healer/Ranged rear).
 */
const DIAMOND_OFFSETS: Array<{ dx: number; dy: number }> = [
  { dx: 64, dy: 0 }, // Slot 0: Front (Tank/Lead)
  { dx: 0, dy: -56 }, // Slot 1: Upper Flank
  { dx: 0, dy: 56 }, // Slot 2: Lower Flank
  { dx: -68, dy: 0 }, // Slot 3: Rear (Healer/Ranged)
];

function hexToNum(hex: string): number {
  return parseInt(hex.replace('#', ''), 16) || 0xffffff;
}

export class SquadController {
  private keys = new Set<string>();
  private keyDownHandler: (e: KeyboardEvent) => void;
  private keyUpHandler: (e: KeyboardEvent) => void;

  constructor() {
    this.keyDownHandler = (e: KeyboardEvent) => {
      const k = e.key.toLowerCase();
      if (['w', 'a', 's', 'd', 'arrowup', 'arrowdown', 'arrowleft', 'arrowright'].includes(k)) {
        this.keys.add(k);
      }
    };
    this.keyUpHandler = (e: KeyboardEvent) => {
      this.keys.delete(e.key.toLowerCase());
    };
    window.addEventListener('keydown', this.keyDownHandler);
    window.addEventListener('keyup', this.keyUpHandler);
  }

  public destroy(): void {
    window.removeEventListener('keydown', this.keyDownHandler);
    window.removeEventListener('keyup', this.keyUpHandler);
  }

  public getManualMoveVector(): { x: number; y: number } {
    let x = 0;
    let y = 0;
    if (this.keys.has('a') || this.keys.has('arrowleft')) x -= 1;
    if (this.keys.has('d') || this.keys.has('arrowright')) x += 1;
    if (this.keys.has('w') || this.keys.has('arrowup')) y -= 1;
    if (this.keys.has('s') || this.keys.has('arrowdown')) y += 1;
    const len = Math.hypot(x, y);
    return len > 0 ? { x: x / len, y: y / len } : { x: 0, y: 0 };
  }

  private getFormationOffset(hero: HeroUnit): { dx: number; dy: number } {
    // Dynamically bias tanks to front and healers/ranged behind
    if (hero.def.role === 'TANK') return { dx: 72, dy: hero.slotIndex % 2 === 0 ? -12 : 12 };
    if (hero.def.role === 'HEALER') return { dx: -74, dy: 0 };
    return DIAMOND_OFFSETS[hero.slotIndex] ?? { dx: 0, dy: 0 };
  }

  private isPointInDanger(ctx: CombatContext, x: number, y: number): {
    inDanger: boolean;
    escapeX: number;
    escapeY: number;
  } {
    let escapeX = 0;
    let escapeY = 0;
    let inDanger = false;

    for (const tg of ctx.telegraphs) {
      const dx = x - tg.x;
      const dy = y - tg.y;
      const dist = Math.hypot(dx, dy);
      if (tg.shape === 'CIRCLE' && dist < tg.radius + 36) {
        inDanger = true;
        const len = Math.max(1, dist);
        escapeX += (dx / len) * 1.4;
        escapeY += (dy / len) * 1.4;
      } else if (tg.shape === 'CONE' && dist < tg.radius + 32) {
        const angleToPoint = Math.atan2(dy, dx);
        let diff = angleToPoint - tg.angle;
        while (diff > Math.PI) diff -= Math.PI * 2;
        while (diff < -Math.PI) diff += Math.PI * 2;
        if (Math.abs(diff) <= tg.arcSpan * 0.62) {
          inDanger = true;
          // Sidestep perpendicular to cone centerline
          const perp = diff >= 0 ? tg.angle + Math.PI / 2 : tg.angle - Math.PI / 2;
          escapeX += Math.cos(perp) * 1.5;
          escapeY += Math.sin(perp) * 1.5;
        }
      }
    }

    return { inDanger, escapeX, escapeY };
  }

  public update(ctx: CombatContext, dt: number, autoMove: boolean): void {
    const aliveHeroes = ctx.heroes.filter((h) => h.alive);
    if (aliveHeroes.length === 0) return;

    const aliveEnemies = ctx.enemies.filter((e) => e.alive);
    const manual = this.getManualMoveVector();
    const hasManualInput = manual.x !== 0 || manual.y !== 0;
    const anchorSpeed = 235;

    // 1. Update Squad Anchor Movement
    if (hasManualInput) {
      ctx.moveTarget = null;
      ctx.squadAnchor.x += manual.x * anchorSpeed * dt;
      ctx.squadAnchor.y += manual.y * anchorSpeed * dt;
    } else if (ctx.moveTarget) {
      const dx = ctx.moveTarget.x - ctx.squadAnchor.x;
      const dy = ctx.moveTarget.y - ctx.squadAnchor.y;
      const dist = Math.hypot(dx, dy);
      if (dist < 14) {
        ctx.moveTarget = null;
      } else {
        const step = Math.min(dist, anchorSpeed * dt);
        ctx.squadAnchor.x += (dx / dist) * step;
        ctx.squadAnchor.y += (dy / dist) * step;
      }
    } else if (autoMove && aliveEnemies.length > 0) {
      // Smart Auto-Move: dodge enemy red telegraphs first, else position at tactical engage distance
      const danger = this.isPointInDanger(ctx, ctx.squadAnchor.x, ctx.squadAnchor.y);
      if (danger.inDanger) {
        const len = Math.max(0.01, Math.hypot(danger.escapeX, danger.escapeY));
        ctx.squadAnchor.x += (danger.escapeX / len) * anchorSpeed * 1.12 * dt;
        ctx.squadAnchor.y += (danger.escapeY / len) * anchorSpeed * 1.12 * dt;
      } else {
        // Move smoothly toward nearest enemy group maintaining ~195px tactical stance
        const focus = aliveEnemies.find((e) => e.def.isBoss) ?? aliveEnemies[0];
        const dx = focus.x - ctx.squadAnchor.x;
        const dy = focus.y - ctx.squadAnchor.y;
        const dist = Math.hypot(dx, dy);
        if (dist > 220) {
          ctx.squadAnchor.x += (dx / dist) * anchorSpeed * 0.82 * dt;
          ctx.squadAnchor.y += (dy / dist) * anchorSpeed * 0.82 * dt;
        }
      }
    }

    // Clamp anchor inside Aurelia Bastion floor bounds
    ctx.squadAnchor.x = Math.max(
      ctx.bounds.minX + 80,
      Math.min(ctx.bounds.maxX - 80, ctx.squadAnchor.x),
    );
    ctx.squadAnchor.y = Math.max(
      ctx.bounds.minY + 70,
      Math.min(ctx.bounds.maxY - 70, ctx.squadAnchor.y),
    );

    const movingSquad = hasManualInput || ctx.moveTarget !== null;

    // 2. Update Each Hero's Timers, Positioning, Passives & Auto-Basic Attack
    for (const hero of aliveHeroes) {
      hero.animTime += dt;
      hero.cd1 = Math.max(0, hero.cd1 - dt);
      hero.cd2 = Math.max(0, hero.cd2 - dt);
      hero.basicTimer = Math.max(0, hero.basicTimer - dt);
      hero.hitFlashTimer = Math.max(0, hero.hitFlashTimer - dt);
      hero.attackSwingTimer = Math.max(0, hero.attackSwingTimer - dt);

      // Tick buffs & internal CDs
      hero.overdriveTimer = Math.max(0, hero.overdriveTimer - dt);
      hero.invincibleTimer = Math.max(0, hero.invincibleTimer - dt);
      hero.undyingTimer = Math.max(0, hero.undyingTimer - dt);
      hero.reflectTimer = Math.max(0, hero.reflectTimer - dt);
      hero.dmgReduceTimer = Math.max(0, hero.dmgReduceTimer - dt);
      hero.atkBuffTimer = Math.max(0, hero.atkBuffTimer - dt);
      hero.atkSpdBuffTimer = Math.max(0, hero.atkSpdBuffTimer - dt);
      hero.critBuffTimer = Math.max(0, hero.critBuffTimer - dt);
      hero.eclipseCritTimer = Math.max(0, hero.eclipseCritTimer - dt);
      if (hero.eclipseCritTimer <= 0) hero.eclipseCritStacks = 0;
      hero.fallingStarTimer = Math.max(0, hero.fallingStarTimer - dt);
      if (hero.fallingStarTimer <= 0) hero.fallingStarStacks = 0;

      hero.lyraPassiveCd = Math.max(0, hero.lyraPassiveCd - dt);
      hero.claraPassiveCd = Math.max(0, hero.claraPassiveCd - dt);
      hero.obsidianForgeCd = Math.max(0, hero.obsidianForgeCd - dt);
      hero.aegisSetCd = Math.max(0, hero.aegisSetCd - dt);
      hero.verdantSetCd = Math.max(0, hero.verdantSetCd - dt);

      // HoT regeneration (e.g. Lyra S1)
      if (hero.hotTimer > 0) {
        const prevSec = Math.floor(hero.hotTimer);
        hero.hotTimer = Math.max(0, hero.hotTimer - dt);
        if (Math.floor(hero.hotTimer) < prevSec) {
          ctx.healHero(hero, hero, hero.hotTickAmount, false);
        }
      }

      // Clara passive: Morning Grace (<40% HP emergency free heal)
      if (hero.heroId === 'clara' && hero.claraPassiveCd <= 0) {
        const injured = aliveHeroes.find((ally) => ally.hp / ally.maxHp < 0.4);
        if (injured) {
          hero.claraPassiveCd = 10;
          const healVal = Math.round(hero.stats.atk * 0.9 * (1 + hero.stats.healBonus));
          ctx.healHero(hero, injured, healVal, false);
          ctx.spawnRingWave(injured.x, injured.y, 70, 0xfcd34d, 0.35);
          ctx.spawnDamageText(injured.x, injured.y - 26, 'MORNING GRACE', 0xfef08a);
        }
      }

      // Determine target enemy for this hero
      let targetEnemy: EnemyUnit | null = null;
      let nearestDist = Infinity;
      for (const e of aliveEnemies) {
        const d = Math.hypot(e.x - hero.x, e.y - hero.y);
        if (d < nearestDist) {
          nearestDist = d;
          targetEnemy = e;
        }
      }

      // Desired position: formation slot when moving, or step into attack range when stationary
      const offset = this.getFormationOffset(hero);
      let goalX = ctx.squadAnchor.x + offset.dx;
      let goalY = ctx.squadAnchor.y + offset.dy;

      if (!movingSquad && targetEnemy) {
        const distToEnemy = Math.hypot(targetEnemy.x - hero.x, targetEnemy.y - hero.y);
        const desiredRange = hero.stats.attackRange + targetEnemy.def.radius * 0.7;
        if (distToEnemy > desiredRange) {
          // Approach enemy smoothly while keeping reasonable tether to squad anchor
          const angle = Math.atan2(targetEnemy.y - hero.y, targetEnemy.x - hero.x);
          goalX = targetEnemy.x - Math.cos(angle) * (desiredRange - 12);
          goalY = targetEnemy.y - Math.sin(angle) * (desiredRange - 12);
        } else {
          goalX = hero.x;
          goalY = hero.y;
        }
      }

      // Move toward goalX, goalY
      const mdx = goalX - hero.x;
      const mdy = goalY - hero.y;
      const mDist = Math.hypot(mdx, mdy);
      const speed = hero.stats.moveSpeed * (movingSquad ? 1.18 : 1.0);

      if (mDist > 6) {
        const step = Math.min(mDist, speed * dt);
        hero.vx = (mdx / mDist) * speed;
        hero.vy = (mdy / mDist) * speed;
        hero.x += (mdx / mDist) * step;
        hero.y += (mdy / mDist) * step;
        hero.facing = mdx >= 0 ? 1 : -1;

        // Kael passive Tailwind resets when moving far
        if (hero.heroId === 'kael' && step > 3.5) {
          hero.tailwindTimer = 0;
          hero.tailwindStacks = Math.max(0, hero.tailwindStacks - 1);
        }
      } else {
        hero.vx = 0;
        hero.vy = 0;
        if (hero.heroId === 'kael') {
          hero.tailwindTimer += dt;
          if (hero.tailwindTimer >= 2.0 && hero.tailwindStacks < 3) {
            hero.tailwindTimer = 0;
            hero.tailwindStacks += 1;
          }
        }
      }

      // Clamp hero to arena
      hero.x = Math.max(ctx.bounds.minX + 35, Math.min(ctx.bounds.maxX - 35, hero.x));
      hero.y = Math.max(ctx.bounds.minY + 35, Math.min(ctx.bounds.maxY - 35, hero.y));

      // 3. Auto Basic Attack when in range & not manually running away
      if (targetEnemy && !hasManualInput && hero.basicTimer <= 0) {
        const dist = Math.hypot(targetEnemy.x - hero.x, targetEnemy.y - hero.y);
        if (dist <= hero.stats.attackRange + targetEnemy.def.radius + 18) {
          hero.facing = targetEnemy.x >= hero.x ? 1 : -1;
          this.performBasicAttack(ctx, hero, targetEnemy);
        }
      }
    }
  }

  private performBasicAttack(ctx: CombatContext, hero: HeroUnit, target: EnemyUnit): void {
    // Calculate effective Attack Speed including passives & buffs
    let atkSpdMult = 1.0;
    if (hero.overdriveTimer > 0) atkSpdMult += 0.3;
    if (hero.atkSpdBuffTimer > 0) atkSpdMult += hero.atkSpdBuffValue;
    if (hero.heroId === 'kael') atkSpdMult += hero.tailwindStacks * 0.1;
    if (hero.relicId === 'relic_falling_star_bow') atkSpdMult += hero.fallingStarStacks * 0.05;

    const effectiveAtkSpd = Math.min(3.5, hero.stats.atkSpeed * atkSpdMult);
    hero.basicTimer = 1 / effectiveAtkSpd;
    hero.basicCount += 1;
    hero.attackSwingTimer = 0.18;

    const color = hexToNum(hero.def.themeColor);
    const isMelee = hero.stats.attackRange < 140;

    // Basic hit SP & Ult Gauge gain so Chaser Ultimates build briskly in every battle!
    const onBasicLand = (hitEnemy: EnemyUnit) => {
      if (!hitEnemy.alive) return;
      ctx.addSp(0.1);
      ctx.addUltGauge(0.8, 1 + hero.stats.ultGaugeBonus);
      let mult = 1.0;

      // Elara Passive: Every 4th attack -> Starlight Bolt (135% ATK + Lunar Trace)
      if (hero.heroId === 'elara' && hero.basicCount % 4 === 0) {
        mult = 1.35;
        hitEnemy.lunarTraceTimer = 5.0;
        ctx.spawnBeam(hero.x, hero.y - 26, hitEnemy.x, hitEnemy.y - 26, 0x34d399, 10);
        ctx.spawnDamageText(hitEnemy.x, hitEnemy.y - 45, 'LUNAR TRACE', 0x6ee7b7);
      }

      const res = ctx.damageEnemy(hero, hitEnemy, {
        multiplier: mult,
        isSkill: false,
      });

      // Vaelen Passive: Every 3rd basic attack implants Starfall Mark (6s)
      if (hero.heroId === 'vaelen' && hero.basicCount % 3 === 0) {
        hitEnemy.starfallMarkTimer = 6.0;
        ctx.spawnRingWave(hitEnemy.x, hitEnemy.y, 48, 0xf5c84c, 0.3);
      }

      // Vaelen Overdrive Lifesteal (+15%)
      if (hero.overdriveTimer > 0 && res.damage > 0) {
        ctx.healHero(hero, hero, Math.round(res.damage * 0.15), false);
      }

      // Seraphina Passive: Astral Orbit fires extra laser per Star Orb (25% ATK each)
      if (hero.heroId === 'seraphina' && hero.starOrbs > 0) {
        for (let i = 0; i < hero.starOrbs; i++) {
          ctx.spawnBeam(
            hero.x + (i - 1) * 18,
            hero.y - 54,
            hitEnemy.x,
            hitEnemy.y - 24,
            0x38e8ff,
            6,
          );
          ctx.damageEnemy(hero, hitEnemy, { multiplier: 0.25, isSkill: false });
        }
      }

      // Orion Passive: Critical Hits ricochet starlight to 1 nearby enemy for 45% damage
      if (hero.heroId === 'orion' && res.isCrit) {
        const other = ctx.enemies.find(
          (e) => e.alive && e.uid !== hitEnemy.uid && Math.hypot(e.x - hitEnemy.x, e.y - hitEnemy.y) < 280,
        );
        if (other) {
          ctx.spawnBeam(hitEnemy.x, hitEnemy.y - 26, other.x, other.y - 26, 0x60a5fa, 7);
          ctx.damageEnemy(hero, other, { multiplier: 0.45, isSkill: false });
        }
      }

      // Relic: Bowstring of the Falling Star -> every 4th basic launches extra star arrow (120% ATK)
      if (hero.relicId === 'relic_falling_star_bow' && hero.basicCount % 4 === 0) {
        hero.fallingStarStacks = Math.min(5, hero.fallingStarStacks + 1);
        hero.fallingStarTimer = 6.0;
        ctx.spawnProjectile({
          x: hero.x,
          y: hero.y - 28,
          tx: hitEnemy.x,
          ty: hitEnemy.y - 22,
          speed: 780,
          color: 0x38e8ff,
          radius: 7,
          fromHero: true,
          onHit: () => {
            if (hitEnemy.alive) {
              ctx.damageEnemy(hero, hitEnemy, { multiplier: 1.2, isSkill: false });
              ctx.spawnBurst(hitEnemy.x, hitEnemy.y - 22, 0x38e8ff, 8);
            }
          },
        });
      }
    };

    if (isMelee) {
      const angle = Math.atan2(target.y - hero.y, target.x - hero.x);
      ctx.spawnSlashArc(hero.x + Math.cos(angle) * 28, hero.y - 22, angle, 56, color);
      audioManager.playSfx('slash');
      onBasicLand(target);
    } else {
      ctx.spawnProjectile({
        x: hero.x,
        y: hero.y - 28,
        tx: target.x,
        ty: target.y - 24,
        speed: 680,
        color,
        radius: 6,
        fromHero: true,
        onHit: (hx, hy) => {
          ctx.spawnBurst(hx, hy, color, 5, 10);
          onBasicLand(target);
        },
      });
    }
  }
}
