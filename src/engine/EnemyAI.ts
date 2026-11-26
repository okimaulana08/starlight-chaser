import { Graphics } from 'pixi.js';
import { audioManager } from './AudioManager';
import type { CombatContext, EnemyTelegraph, EnemyUnit, HeroUnit } from './CombatTypes';

export class EnemyAI {
  public update(
    ctx: CombatContext,
    dt: number,
    telegraphLayer: { addChild: (g: Graphics) => void },
  ): void {
    const aliveHeroes = ctx.heroes.filter((h) => h.alive);
    if (aliveHeroes.length === 0) return;

    // 1. Update active red/orange telegraphs visuals
    for (const tg of ctx.telegraphs) {
      tg.elapsed += dt;
      const progress = Math.min(1, tg.elapsed / Math.max(0.05, tg.duration));
      const color = tg.cancelable ? 0xf97316 : 0xef4444;
      tg.gfx.clear();

      if (tg.shape === 'CIRCLE') {
        tg.gfx
          .ellipse(tg.x, tg.y, tg.radius, tg.radius * 0.68)
          .fill({ color, alpha: 0.14 })
          .stroke({ color, width: 3, alpha: 0.9 });
        // Expanding inner fill showing exact cast completion timing
        tg.gfx
          .ellipse(tg.x, tg.y, tg.radius * progress, tg.radius * 0.68 * progress)
          .fill({ color, alpha: 0.32 });
      } else {
        // CONE telegraph
        const startA = tg.angle - tg.arcSpan * 0.5;
        const endA = tg.angle + tg.arcSpan * 0.5;
        tg.gfx
          .moveTo(tg.x, tg.y)
          .arc(tg.x, tg.y, tg.radius, startA, endA)
          .lineTo(tg.x, tg.y)
          .fill({ color, alpha: 0.16 })
          .stroke({ color, width: 3, alpha: 0.9 });
        tg.gfx
          .moveTo(tg.x, tg.y)
          .arc(tg.x, tg.y, tg.radius * progress, startA, endA)
          .lineTo(tg.x, tg.y)
          .fill({ color, alpha: 0.34 });
      }
    }

    // 2. Update every living enemy
    for (const enemy of ctx.enemies) {
      if (!enemy.alive) continue;
      enemy.animTime += dt;
      enemy.hitFlashTimer = Math.max(0, enemy.hitFlashTimer - dt);
      enemy.basicTimer = Math.max(0, enemy.basicTimer - dt);
      enemy.aiCooldown = Math.max(0, enemy.aiCooldown - dt);

      // Debuff timers
      enemy.stunTimer = Math.max(0, enemy.stunTimer - dt);
      enemy.freezeTimer = Math.max(0, enemy.freezeTimer - dt);
      enemy.slowTimer = Math.max(0, enemy.slowTimer - dt);
      enemy.provokeTimer = Math.max(0, enemy.provokeTimer - dt);
      if (enemy.provokeTimer <= 0) enemy.provokeTargetHeroId = null;
      enemy.starfallMarkTimer = Math.max(0, enemy.starfallMarkTimer - dt);
      enemy.lunarTraceTimer = Math.max(0, enemy.lunarTraceTimer - dt);
      enemy.defShredTimer = Math.max(0, enemy.defShredTimer - dt);
      if (enemy.defShredTimer <= 0) enemy.defShredValue = 0;
      enemy.atkDownTimer = Math.max(0, enemy.atkDownTimer - dt);
      if (enemy.atkDownTimer <= 0) enemy.atkDownValue = 0;

      // Broken timer (from Cancel Cast)
      if (enemy.isBroken) {
        enemy.brokenTimer -= dt;
        if (enemy.brokenTimer <= 0) {
          enemy.isBroken = false;
          enemy.brokenTimer = 0;
        }
        continue; // Staggered during Broken
      }

      // Burn DoT ticks (GDD: 1.2% Max HP/s per stack, capped at 40% source ATK per stack vs Boss)
      if (enemy.burnStacks > 0) {
        enemy.burnTimer -= dt;
        enemy.burnTickTimer -= dt;
        if (enemy.burnTickTimer <= 0) {
          enemy.burnTickTimer = 1.0;
          let perStack = enemy.maxHp * 0.012;
          if (enemy.def.isBoss) {
            perStack = Math.min(perStack, Math.max(65, enemy.burnSourceAtk * 0.4));
          }
          const burnDmg = Math.max(12, Math.round(perStack * enemy.burnStacks));
          enemy.hp = Math.max(0, enemy.hp - burnDmg);
          ctx.spawnDamageText(enemy.x, enemy.y - 34, `${burnDmg}`, 0xfb923c, false);
          ctx.spawnBurst(enemy.x, enemy.y - 20, 0xf97316, 4, 14);
          if (enemy.hp <= 0) {
            this.handleEnemyDeath(ctx, enemy);
            continue;
          }
        }
        if (enemy.burnTimer <= 0) {
          enemy.burnStacks = 0;
        }
      }

      // Skip action if Stunned or Frozen
      if (enemy.stunTimer > 0 || enemy.freezeTimer > 0) {
        continue;
      }

      // Boss Phase 2 Transition (<50% HP): Overcharged Starfall + 15-Hit Count Shield
      if (enemy.def.isBoss && !enemy.phase2Triggered && enemy.hp / enemy.maxHp <= 0.5) {
        enemy.phase2Triggered = true;
        enemy.phase = 2;
        enemy.maxHitShield = 15;
        enemy.hitShield = 15;
        ctx.triggerShake(12);
        ctx.spawnRingWave(enemy.x, enemy.y, 260, 0xd946ef, 0.65);
        ctx.spawnDamageText(enemy.x, enemy.y - 84, 'PHASE 2: HIT SHIELD (15)', 0xf0abfc, true);
        ctx.notifyBanner('PHASE 2 — OVERCHARGED STARFALL! Break the 15-Hit Shield with Multi-Hit skills!');
      }

      // Handle ongoing cast
      if (enemy.isCasting) {
        enemy.castElapsed += dt;
        if (enemy.castElapsed >= enemy.castDuration) {
          this.resolveEnemyCast(ctx, enemy, telegraphLayer);
        }
        continue;
      }

      // Pick target hero (respect Provoke first, else Tank bias / nearest hero)
      const targetHero = this.pickTargetHero(enemy, aliveHeroes);
      if (!targetHero) continue;

      const dx = targetHero.x - enemy.x;
      const dy = targetHero.y - enemy.y;
      const dist = Math.hypot(dx, dy);
      enemy.facing = dx >= 0 ? 1 : -1;

      // Boss Special Pattern AI
      if (enemy.def.isBoss && enemy.aiCooldown <= 0) {
        this.startBossPattern(ctx, enemy, targetHero, telegraphLayer);
        continue;
      }

      // Armored Golem Ground Slam Telegraph
      if (enemy.def.id === 'armored_golem' && enemy.aiCooldown <= 0 && dist < 210) {
        this.startGolemSlam(ctx, enemy, targetHero, telegraphLayer);
        continue;
      }

      // Move toward target if outside attack range
      const desiredRange = enemy.def.attackRange + 16;
      if (dist > desiredRange) {
        const speedMult = enemy.slowTimer > 0 ? 0.7 : 1.0;
        const step = enemy.def.moveSpeed * speedMult * dt;
        enemy.x += (dx / dist) * step;
        enemy.y += (dy / dist) * step;
        enemy.x = Math.max(ctx.bounds.minX + 40, Math.min(ctx.bounds.maxX - 40, enemy.x));
        enemy.y = Math.max(ctx.bounds.minY + 40, Math.min(ctx.bounds.maxY - 40, enemy.y));
      } else if (enemy.basicTimer <= 0) {
        enemy.basicTimer = 1 / enemy.def.atkSpeed;
        const atkMult = enemy.atkDownTimer > 0 ? 1 - enemy.atkDownValue : 1.0;
        const dmg = enemy.atk * atkMult;

        if (enemy.def.attackRange > 150) {
          // Ranged caster (Rift Acolyte)
          ctx.spawnProjectile({
            x: enemy.x,
            y: enemy.y - 26,
            tx: targetHero.x,
            ty: targetHero.y - 22,
            speed: 420,
            color: 0xc084fc,
            radius: 7,
            fromHero: false,
            onHit: (hx, hy) => {
              ctx.spawnBurst(hx, hy, 0xc084fc, 5, 10);
              if (targetHero.alive) {
                ctx.damageHero(enemy, targetHero, dmg, true);
              }
            },
          });
        } else {
          // Melee strike
          ctx.spawnSlashArc(
            enemy.x + (dx / Math.max(1, dist)) * 28,
            enemy.y - 20,
            Math.atan2(dy, dx),
            enemy.def.isBoss ? 86 : 48,
            enemy.def.isBoss ? 0xd946ef : 0xa855f7,
          );
          ctx.damageHero(enemy, targetHero, dmg, false);
        }
      }
    }
  }

  private pickTargetHero(enemy: EnemyUnit, aliveHeroes: HeroUnit[]): HeroUnit | null {
    if (enemy.provokeTargetHeroId) {
      const provoker = aliveHeroes.find((h) => h.heroId === enemy.provokeTargetHeroId);
      if (provoker) return provoker;
    }
    let best: HeroUnit | null = null;
    let bestScore = Infinity;
    for (const h of aliveHeroes) {
      const dist = Math.hypot(h.x - enemy.x, h.y - enemy.y);
      // Slight frontline bias toward Tanks
      const score = h.def.role === 'TANK' ? dist * 0.72 : dist;
      if (score < bestScore) {
        bestScore = score;
        best = h;
      }
    }
    return best;
  }

  private addTelegraph(
    ctx: CombatContext,
    telegraphLayer: { addChild: (g: Graphics) => void },
    tg: Omit<EnemyTelegraph, 'gfx'>,
  ): void {
    const gfx = new Graphics();
    telegraphLayer.addChild(gfx);
    ctx.telegraphs.push({ ...tg, gfx });
  }

  private startGolemSlam(
    ctx: CombatContext,
    enemy: EnemyUnit,
    target: HeroUnit,
    telegraphLayer: { addChild: (g: Graphics) => void },
  ): void {
    enemy.isCasting = true;
    enemy.castName = 'Marble Quake';
    enemy.castDuration = 1.5;
    enemy.castElapsed = 0;
    enemy.castCancelable = false;
    enemy.castAction = 'GOLEM_SLAM';
    enemy.castTargetX = target.x;
    enemy.castTargetY = target.y;
    enemy.aiCooldown = 6.5;

    this.addTelegraph(ctx, telegraphLayer, {
      id: `tg_${Date.now()}_${Math.random()}`,
      enemyUid: enemy.uid,
      shape: 'CIRCLE',
      x: target.x,
      y: target.y,
      radius: 120,
      angle: 0,
      arcSpan: 0,
      duration: 1.5,
      elapsed: 0,
      cancelable: false,
    });
  }

  private startBossPattern(
    ctx: CombatContext,
    boss: EnemyUnit,
    target: HeroUnit,
    telegraphLayer: { addChild: (g: Graphics) => void },
  ): void {
    const roll = Math.random();
    const angle = Math.atan2(target.y - boss.y, target.x - boss.x);

    if (roll < 0.4) {
      // Sweeping Halberd (1.2s wide red cone)
      boss.isCasting = true;
      boss.castName = 'Sweeping Halberd';
      boss.castDuration = 1.2;
      boss.castElapsed = 0;
      boss.castCancelable = false;
      boss.castAction = 'SWEEP';
      boss.castAngle = angle;
      boss.aiCooldown = 4.6;

      this.addTelegraph(ctx, telegraphLayer, {
        id: `tg_sweep_${Date.now()}`,
        enemyUid: boss.uid,
        shape: 'CONE',
        x: boss.x,
        y: boss.y,
        radius: 265,
        angle,
        arcSpan: 1.45,
        duration: 1.2,
        elapsed: 0,
        cancelable: false,
      });
    } else if (roll < 0.78 || boss.phase === 1) {
      // Void Shockwave (2.5s CANCELABLE CAST!)
      boss.isCasting = true;
      boss.castName = 'Void Shockwave';
      boss.castDuration = 2.5;
      boss.castElapsed = 0;
      boss.castCancelable = true;
      boss.castAction = 'SHOCKWAVE';
      boss.castTargetX = boss.x;
      boss.castTargetY = boss.y;
      boss.aiCooldown = 7.2;

      this.addTelegraph(ctx, telegraphLayer, {
        id: `tg_shock_${Date.now()}`,
        enemyUid: boss.uid,
        shape: 'CIRCLE',
        x: boss.x,
        y: boss.y,
        radius: 340,
        angle: 0,
        arcSpan: 0,
        duration: 2.5,
        elapsed: 0,
        cancelable: true,
      });
      ctx.notifyBanner('BOSS CASTING VOID SHOCKWAVE — Interrupt with STUN_CANCEL!');
    } else {
      // Phase 2: Skyfall Judgment (4 sequential tracking red circles!)
      boss.isCasting = true;
      boss.castName = 'Skyfall Judgment';
      boss.castDuration = 1.1;
      boss.castElapsed = 0;
      boss.castCancelable = false;
      boss.castAction = 'SKYFALL';
      boss.aiCooldown = 6.8;

      for (let i = 0; i < 4; i++) {
        ctx.delayedStrikes.push({
          delay: i * 0.62,
          fn: () => {
            if (!boss.alive || boss.isBroken) return;
            const tx = ctx.squadAnchor.x + (Math.random() - 0.5) * 90;
            const ty = ctx.squadAnchor.y + (Math.random() - 0.5) * 70;
            const tgId = `tg_sky_${Date.now()}_${i}`;
            this.addTelegraph(ctx, telegraphLayer, {
              id: tgId,
              enemyUid: boss.uid,
              shape: 'CIRCLE',
              x: tx,
              y: ty,
              radius: 105,
              angle: 0,
              arcSpan: 0,
              duration: 1.05,
              elapsed: 0,
              cancelable: false,
            });
            ctx.delayedStrikes.push({
              delay: 1.05,
              fn: () => {
                ctx.telegraphs = ctx.telegraphs.filter((t) => {
                  if (t.id === tgId) {
                    t.gfx.destroy();
                    return false;
                  }
                  return true;
                });
                if (!boss.alive) return;
                ctx.spawnRingWave(tx, ty, 115, 0xe879f9, 0.35);
                ctx.spawnBurst(tx, ty - 20, 0xd946ef, 14, 30);
                ctx.triggerShake(6);
                for (const h of ctx.heroes) {
                  if (h.alive && Math.hypot(h.x - tx, h.y - ty) <= 112) {
                    ctx.damageHero(boss, h, boss.atk * 1.45, true);
                  }
                }
              },
            });
          },
        });
      }
    }
  }

  private resolveEnemyCast(
    ctx: CombatContext,
    enemy: EnemyUnit,
    _telegraphLayer: { addChild: (g: Graphics) => void },
  ): void {
    const action = enemy.castAction;
    enemy.isCasting = false;
    enemy.castAction = null;

    // Remove this enemy's non-skyfall telegraphs
    if (action !== 'SKYFALL') {
      ctx.telegraphs = ctx.telegraphs.filter((t) => {
        if (t.enemyUid === enemy.uid) {
          t.gfx.destroy();
          return false;
        }
        return true;
      });
    }

    const atkMult = enemy.atkDownTimer > 0 ? 1 - enemy.atkDownValue : 1.0;

    if (action === 'GOLEM_SLAM') {
      ctx.spawnRingWave(enemy.castTargetX, enemy.castTargetY, 125, 0xef4444, 0.4);
      ctx.spawnBurst(enemy.castTargetX, enemy.castTargetY, 0xf87171, 14, 24);
      ctx.triggerShake(6);
      for (const h of ctx.heroes) {
        if (h.alive && Math.hypot(h.x - enemy.castTargetX, h.y - enemy.castTargetY) <= 125) {
          ctx.damageHero(enemy, h, enemy.atk * 1.65 * atkMult, false);
        }
      }
    } else if (action === 'SWEEP') {
      ctx.spawnSlashArc(enemy.x, enemy.y - 22, enemy.castAngle, 265, 0xf43f5e);
      ctx.triggerShake(9);
      audioManager.playSfx('slash');
      for (const h of ctx.heroes) {
        if (!h.alive) continue;
        const dx = h.x - enemy.x;
        const dy = h.y - enemy.y;
        const dist = Math.hypot(dx, dy);
        if (dist <= 270) {
          let diff = Math.atan2(dy, dx) - enemy.castAngle;
          while (diff > Math.PI) diff -= Math.PI * 2;
          while (diff < -Math.PI) diff += Math.PI * 2;
          if (Math.abs(diff) <= 0.78) {
            ctx.damageHero(enemy, h, enemy.atk * 1.9 * atkMult, false);
          }
        }
      }
    } else if (action === 'SHOCKWAVE') {
      ctx.spawnRingWave(enemy.x, enemy.y, 355, 0xd946ef, 0.6);
      ctx.spawnBurst(enemy.x, enemy.y - 25, 0xf43f5e, 28, 70);
      ctx.triggerShake(14);
      audioManager.playSfx('ult_impact');
      for (const h of ctx.heroes) {
        if (h.alive && Math.hypot(h.x - enemy.x, h.y - enemy.y) <= 355) {
          ctx.damageHero(enemy, h, enemy.atk * 2.7 * atkMult, false);
        }
      }
    }
  }

  public handleEnemyDeath(ctx: CombatContext, enemy: EnemyUnit): void {
    enemy.alive = false;
    enemy.container.visible = false;
    ctx.defeatedEnemyIds.add(enemy.def.id);
    ctx.telegraphs = ctx.telegraphs.filter((t) => {
      if (t.enemyUid === enemy.uid) {
        t.gfx.destroy();
        return false;
      }
      return true;
    });
    ctx.spawnBurst(enemy.x, enemy.y - 24, 0xc084fc, enemy.def.isBoss ? 44 : 16, 45);
    ctx.spawnRingWave(enemy.x, enemy.y, enemy.def.isBoss ? 220 : 85, 0xf5c84c, 0.45);
    if (enemy.def.isBoss) {
      ctx.triggerShake(16);
      audioManager.playSfx('victory');
    }
  }
}
