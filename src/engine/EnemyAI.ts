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
      } else if (tg.shape === 'LINE') {
        // Full-arena laser corridor telegraph (Cross-Beam!)
        const halfLen = (tg.length ?? 760) * 0.5;
        const halfW = (tg.width ?? 88) * 0.5;
        const cos = Math.cos(tg.angle);
        const sin = Math.sin(tg.angle);
        const px = -sin;
        const py = cos;
        const x1 = tg.x - cos * halfLen;
        const y1 = tg.y - sin * halfLen;
        const x2 = tg.x + cos * halfLen;
        const y2 = tg.y + sin * halfLen;

        // Outer corridor danger footprint
        tg.gfx
          .poly([
            x1 + px * halfW,
            y1 + py * halfW,
            x2 + px * halfW,
            y2 + py * halfW,
            x2 - px * halfW,
            y2 - py * halfW,
            x1 - px * halfW,
            y1 - py * halfW,
          ])
          .fill({ color: 0xf43f5e, alpha: 0.16 })
          .stroke({ color: 0xfb7185, width: 2.5, alpha: 0.9 });

        // Expanding central charge core
        const fillW = halfW * progress;
        tg.gfx
          .poly([
            x1 + px * fillW,
            y1 + py * fillW,
            x2 + px * fillW,
            y2 + py * fillW,
            x2 - px * fillW,
            y2 - py * fillW,
            x1 - px * fillW,
            y1 - py * fillW,
          ])
          .fill({ color: 0xe879f9, alpha: 0.25 + progress * 0.25 });

        // Razor bright center laser line
        tg.gfx
          .moveTo(x1, y1)
          .lineTo(x2, y2)
          .stroke({ color: 0xfef08a, width: 2 + progress * 4, alpha: 0.75 });
      } else if (tg.shape === 'RING') {
        // Donut Blast with glowing Emerald-Cyan Inner SAFE ZONE!
        const innerR = tg.innerRadius ?? 155;
        const outerR = tg.radius;
        tg.gfx
          .ellipse(tg.x, tg.y, outerR, outerR * 0.68)
          .fill({ color: 0xef4444, alpha: 0.18 + progress * 0.18 })
          .ellipse(tg.x, tg.y, innerR, innerR * 0.68)
          .cut();
        // Expanding danger wave ring moving from inner edge -> outer edge
        const sweepR = innerR + (outerR - innerR) * progress;
        tg.gfx
          .ellipse(tg.x, tg.y, sweepR, sweepR * 0.68)
          .stroke({ color: 0xf43f5e, width: 5, alpha: 0.88 });
        tg.gfx
          .ellipse(tg.x, tg.y, outerR, outerR * 0.68)
          .stroke({ color: 0xef4444, width: 3, alpha: 0.92 });
        // Safe Zone glowing cyan-emerald sanctuary circle
        tg.gfx
          .ellipse(tg.x, tg.y, innerR, innerR * 0.68)
          .fill({ color: 0x10b981, alpha: 0.12 })
          .stroke({ color: 0x34d399, width: 3.5, alpha: 0.95 });
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

    const aliveEnemies = ctx.enemies.filter((e) => e.alive);

    // 2. Update every living enemy
    for (const enemy of aliveEnemies) {
      enemy.animTime += dt;
      enemy.hitFlashTimer = Math.max(0, enemy.hitFlashTimer - dt);
      enemy.basicTimer = Math.max(0, enemy.basicTimer - dt);
      enemy.aiCooldown = Math.max(0, enemy.aiCooldown - dt);
      enemy.attackSwingTimer = Math.max(0, enemy.attackSwingTimer - dt);

      // Pause offensive AI briefly while Boss Skyfall Slam / Rift Portal Entrance plays out!
      if (enemy.spawnIntroTimer > 0) {
        enemy.vx *= 0.8;
        enemy.vy *= 0.8;
        continue;
      }

      // Always integrate decaying spring knockback (even while staggered/casting!)
      if (Math.abs(enemy.knockVx) > 1 || Math.abs(enemy.knockVy) > 1) {
        enemy.x = Math.max(ctx.bounds.minX + 40, Math.min(ctx.bounds.maxX - 40, enemy.x + enemy.knockVx * dt));
        enemy.y = Math.max(ctx.bounds.minY + 40, Math.min(ctx.bounds.maxY - 40, enemy.y + enemy.knockVy * dt));
        const kbDecay = Math.exp(-10.5 * dt);
        enemy.knockVx *= kbDecay;
        enemy.knockVy *= kbDecay;
      } else {
        enemy.knockVx = 0;
        enemy.knockVy = 0;
      }

      // Smooth interpolated enemy dash (e.g., Tempest Drake Dive) + ghost afterimages
      if (enemy.dashState) {
        const dash = enemy.dashState;
        dash.elapsed += dt;
        const p = Math.min(1, dash.elapsed / Math.max(0.06, dash.duration));
        const ep = 1 - Math.pow(1 - p, 3);
        const prevX = enemy.x;
        const prevY = enemy.y;
        enemy.x = dash.startX + (dash.endX - dash.startX) * ep;
        enemy.y = dash.startY + (dash.endY - dash.startY) * ep;
        enemy.vx = (enemy.x - prevX) / Math.max(0.008, dt);
        enemy.vy = (enemy.y - prevY) / Math.max(0.008, dt);
        dash.ghostTimer -= dt;
        if (dash.ghostTimer <= 0) {
          dash.ghostTimer = 0.032;
          const sc = enemy.baseScaleY ?? 1;
          const arcLift = Math.sin(p * Math.PI) * dash.arcHeight;
          ctx.spawnGhostAfterimage(
            enemy.liveMesh.texture,
            enemy.x,
            enemy.y - arcLift,
            sc * (enemy.facing >= 0 ? -1 : 1),
            sc,
            dash.color,
            0.48,
            0.22,
          );
        }
        if (p >= 1) {
          enemy.x = dash.endX;
          enemy.y = dash.endY;
          enemy.vx *= 0.2;
          enemy.vy *= 0.2;
          enemy.squashX = 1.2;
          enemy.squashY = 0.82;
          ctx.spawnFootstepDust(enemy.x, enemy.y, dash.endX - dash.startX, dash.endY - dash.startY, 1.5);
          enemy.dashState = null;
        }
        continue;
      }

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

      // Broken timer (from Break Gauge depletion or Cancel Cast)
      if (enemy.isBroken) {
        enemy.brokenTimer -= dt;
        const brake = Math.exp(-10 * dt);
        enemy.vx *= brake;
        enemy.vy *= brake;
        if (enemy.brokenTimer <= 0) {
          enemy.isBroken = false;
          enemy.brokenTimer = 0;
          enemy.breakGauge = enemy.maxBreakGauge;
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

      // Boss Phase 2 Transition (<=50% HP): Overcharged Starfall + 15-Hit Count Shield
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

      // Boss Phase 2 ENRAGE (<=40% HP): Faster attacks, shorter cooldowns, fiery overdrive aura!
      if (enemy.def.isBoss && !enemy.enraged && enemy.hp / enemy.maxHp <= 0.4) {
        enemy.enraged = true;
        ctx.triggerShake(14);
        ctx.triggerArenaDim(0xbe123c, 0.55, 0.28);
        ctx.spawnRingWave(enemy.x, enemy.y, 310, 0xf43f5e, 0.6);
        ctx.spawnRingWave(enemy.x, enemy.y, 220, 0xfde047, 0.48);
        ctx.spawnBurst(enemy.x, enemy.y - 42, 0xf43f5e, 26, 56);
        ctx.spawnDamageText(enemy.x, enemy.y - 108, '⚠ ENRAGED OVERDRIVE! ⚠', 0xfb7185, true);
        ctx.notifyBanner('⚠ BOSS ENRAGED! +18% Attack Speed — Dodge Cross-Beams & Ring Novas!');
        audioManager.playSfx('ult_impact', 0.04);
        audioManager.setBossEnrage(true);
      }

      // Handle ongoing cast — smoothly brake velocity while winding up!
      if (enemy.isCasting) {
        const brake = Math.exp(-10 * dt);
        enemy.vx *= brake;
        enemy.vy *= brake;
        enemy.x = Math.max(ctx.bounds.minX + 40, Math.min(ctx.bounds.maxX - 40, enemy.x + enemy.vx * dt));
        enemy.y = Math.max(ctx.bounds.minY + 40, Math.min(ctx.bounds.maxY - 40, enemy.y + enemy.vy * dt));
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
      // Facing hysteresis (14px deadzone avoids jittery sprite flipping)
      if (Math.abs(dx) > 14) {
        enemy.facing = dx >= 0 ? 1 : -1;
      }

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

      // New Elite & Kroco Bespoke Combat Patterns!
      if (enemy.def.id === 'obsidian_knight' && enemy.aiCooldown <= 0 && dist < 240) {
        this.startObsidianCleave(ctx, enemy, targetHero, telegraphLayer);
        continue;
      }
      if (enemy.def.id === 'astral_weaver' && enemy.aiCooldown <= 0 && dist < 360) {
        this.startAstralNova(ctx, enemy, telegraphLayer);
        continue;
      }
      if (enemy.def.id === 'briar_behemoth' && enemy.aiCooldown <= 0 && dist < 280) {
        this.startBriarEruption(ctx, enemy, targetHero, telegraphLayer);
        continue;
      }
      if (enemy.def.id === 'tempest_drake' && enemy.aiCooldown <= 0 && dist < 320) {
        this.startTempestDive(ctx, enemy, targetHero, telegraphLayer);
        continue;
      }
      if (enemy.def.id === 'void_wisp' && enemy.aiCooldown <= 0 && dist < 130) {
        this.startWispBurst(ctx, enemy, telegraphLayer);
        continue;
      }
      if (enemy.def.id === 'cinder_imp' && enemy.aiCooldown <= 0 && dist < 310) {
        this.startCinderLob(ctx, enemy, targetHero, telegraphLayer);
        continue;
      }

      // Smooth Physics Steering + Organic Flanking + Boids Crowd Separation
      const desiredRange = enemy.def.attackRange + 16;
      const speedMult = enemy.slowTimer > 0 ? 0.7 : 1.0;
      const maxSpeed = enemy.def.moveSpeed * speedMult;

      let desVx = 0;
      let desVy = 0;

      if (dist > desiredRange) {
        // Aim for an organic flank position around target Hero so melee packs fan out naturally!
        const flankRadius = Math.max(46, Math.min(desiredRange * 0.85, 115));
        const aimAngle = Math.atan2(enemy.y - targetHero.y, enemy.x - targetHero.x) + enemy.flankAngle * 0.35;
        const goalX = enemy.def.isBoss
          ? targetHero.x
          : targetHero.x + Math.cos(aimAngle) * flankRadius;
        const goalY = enemy.def.isBoss
          ? targetHero.y
          : targetHero.y + Math.sin(aimAngle) * flankRadius * 0.75;
        const gdx = goalX - enemy.x;
        const gdy = goalY - enemy.y;
        const gDist = Math.hypot(gdx, gdy);
        if (gDist > 6) {
          const arrival = gDist < 55 ? gDist / 55 : 1.0;
          desVx = (gdx / gDist) * maxSpeed * arrival;
          desVy = (gdy / gDist) * maxSpeed * arrival;
        }
      }

      // Boids Soft Separation: Enemy<->Enemy spacing so minions/elites never collapse onto 1 pixel!
      let sepX = 0;
      let sepY = 0;
      for (const other of aliveEnemies) {
        if (other.uid === enemy.uid) continue;
        const sx = enemy.x - other.x;
        const sy = enemy.y - other.y;
        const sd = Math.hypot(sx, sy);
        const minSep = (enemy.def.radius + other.def.radius) * 1.18;
        if (sd > 0.01 && sd < minSep) {
          const push = ((minSep - sd) / minSep) * (enemy.def.isBoss ? 55 : 175);
          sepX += (sx / sd) * push;
          sepY += (sy / sd) * push;
        } else if (sd <= 0.01) {
          sepX += Math.cos(enemy.flankAngle) * 75;
          sepY += Math.sin(enemy.flankAngle) * 75;
        }
      }

      // Weight-calibrated inertia: Bosses/Golems feel heavy & deliberate, minions feel agile!
      const isHeavy =
        enemy.def.isBoss || enemy.def.id === 'armored_golem' || enemy.def.id === 'briar_behemoth';
      const accelRate = isHeavy ? 5.2 : 9.2;
      const brakeRate = isHeavy ? 7.5 : 12.0;
      const targetVx = desVx + sepX;
      const targetVy = desVy + sepY;
      const isAccel = Math.hypot(targetVx, targetVy) > Math.hypot(enemy.vx, enemy.vy);
      const blend = 1 - Math.exp(-(isAccel ? accelRate : brakeRate) * dt);
      enemy.vx += (targetVx - enemy.vx) * blend;
      enemy.vy += (targetVy - enemy.vy) * blend;

      enemy.x = Math.max(ctx.bounds.minX + 40, Math.min(ctx.bounds.maxX - 40, enemy.x + enemy.vx * dt));
      enemy.y = Math.max(ctx.bounds.minY + 40, Math.min(ctx.bounds.maxY - 40, enemy.y + enemy.vy * dt));

      const curSpeed = Math.hypot(enemy.vx, enemy.vy);
      const isFloating =
        enemy.def.id === 'rift_acolyte' ||
        enemy.def.id === 'void_wisp' ||
        enemy.def.id === 'astral_weaver';

      // Distance-driven monster stride phase + grounded stomp dust
      if (curSpeed > 22) {
        enemy.stridePhase += (curSpeed / (isHeavy ? 38 : 26)) * dt;
        const gate = Math.floor(enemy.stridePhase / Math.PI);
        if (!isFloating && gate !== enemy.stepDustGate) {
          enemy.stepDustGate = gate;
          enemy.squashX = Math.max(enemy.squashX, isHeavy ? 1.07 : 1.05);
          enemy.squashY = Math.min(enemy.squashY, isHeavy ? 0.93 : 0.95);
          ctx.spawnFootstepDust(
            enemy.x,
            enemy.y,
            enemy.vx,
            enemy.vy,
            enemy.def.isBoss ? 1.55 : isHeavy ? 1.25 : 0.82,
          );
        }
      } else if (curSpeed < 3) {
        enemy.vx = 0;
        enemy.vy = 0;
      }

      if (dist <= desiredRange + 8 && enemy.basicTimer <= 0) {
        const rageSpd = enemy.enraged ? 1.18 : 1.0;
        const worldSpd = enemy.atkSpeedMult ?? 1.0;
        enemy.basicTimer = 1 / (enemy.def.atkSpeed * rageSpd * worldSpd);
        enemy.attackSwingDuration = isHeavy ? 0.34 : 0.26;
        enemy.attackSwingTimer = enemy.attackSwingDuration;
        enemy.springLeanVel += isHeavy ? 6.5 : 8.5;
        enemy.squashX = 1.11;
        enemy.squashY = 0.91;
        const atkMult = enemy.atkDownTimer > 0 ? 1 - enemy.atkDownValue : 1.0;
        const dmg = enemy.atk * atkMult;

        if (enemy.def.attackRange > 150) {
          // Ranged caster (Rift Acolyte, Cinder Imp, Astral Weaver)
          const projColor =
            enemy.def.id === 'cinder_imp'
              ? 0xf97316
              : enemy.def.id === 'astral_weaver'
                ? 0x38e8ff
                : 0xc084fc;
          ctx.spawnProjectile({
            x: enemy.x,
            y: enemy.y - 26,
            tx: targetHero.x,
            ty: targetHero.y - 22,
            speed: enemy.def.id === 'cinder_imp' ? 390 : 420,
            color: projColor,
            radius: enemy.def.isMiniBoss ? 9 : 7,
            fromHero: false,
            onHit: (hx, hy) => {
              ctx.spawnBurst(hx, hy, projColor, 5, 10);
              if (targetHero.alive) {
                ctx.damageHero(enemy, targetHero, dmg, true);
              }
            },
          });
        } else {
          // Melee strike colored by enemy theme
          const slashColor =
            enemy.def.isBoss
              ? 0xd946ef
              : enemy.def.id === 'frost_lancer'
                ? 0x7dd3fc
                : enemy.def.id === 'solar_construct'
                  ? 0xf5c84c
                  : enemy.def.id === 'briar_crawler' || enemy.def.id === 'briar_behemoth'
                    ? 0x34d399
                    : enemy.def.id === 'obsidian_knight'
                      ? 0xf43f5e
                      : 0xa855f7;
          ctx.spawnSlashArc(
            enemy.x + (dx / Math.max(1, dist)) * 28,
            enemy.y - 20,
            Math.atan2(dy, dx),
            enemy.def.isBoss ? 86 : enemy.def.isMiniBoss ? 68 : 48,
            slashColor,
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

  private startObsidianCleave(
    ctx: CombatContext,
    enemy: EnemyUnit,
    target: HeroUnit,
    telegraphLayer: { addChild: (g: Graphics) => void },
  ): void {
    const angle = Math.atan2(target.y - enemy.y, target.x - enemy.x);
    enemy.isCasting = true;
    enemy.castName = 'Crimson Cleave';
    enemy.castDuration = 1.35;
    enemy.castElapsed = 0;
    enemy.castCancelable = false;
    enemy.castAction = 'OBSIDIAN_CLEAVE';
    enemy.castAngle = angle;
    enemy.aiCooldown = 6.0;

    this.addTelegraph(ctx, telegraphLayer, {
      id: `tg_obs_${Date.now()}_${Math.random()}`,
      enemyUid: enemy.uid,
      shape: 'CONE',
      x: enemy.x,
      y: enemy.y,
      radius: 210,
      angle,
      arcSpan: 1.25,
      duration: 1.35,
      elapsed: 0,
      cancelable: false,
    });
  }

  private startAstralNova(
    ctx: CombatContext,
    enemy: EnemyUnit,
    telegraphLayer: { addChild: (g: Graphics) => void },
  ): void {
    enemy.isCasting = true;
    enemy.castName = 'Rift Nova';
    enemy.castDuration = 2.1;
    enemy.castElapsed = 0;
    enemy.castCancelable = true;
    enemy.castAction = 'ASTRAL_NOVA';
    enemy.castTargetX = enemy.x;
    enemy.castTargetY = enemy.y;
    enemy.aiCooldown = 7.5;

    this.addTelegraph(ctx, telegraphLayer, {
      id: `tg_nova_${Date.now()}_${Math.random()}`,
      enemyUid: enemy.uid,
      shape: 'CIRCLE',
      x: enemy.x,
      y: enemy.y,
      radius: 240,
      angle: 0,
      arcSpan: 0,
      duration: 2.1,
      elapsed: 0,
      cancelable: true,
    });
    ctx.notifyBanner('ELITE CASTING RIFT NOVA — Interrupt with STUN_CANCEL!');
  }

  private startBriarEruption(
    ctx: CombatContext,
    enemy: EnemyUnit,
    target: HeroUnit,
    telegraphLayer: { addChild: (g: Graphics) => void },
  ): void {
    enemy.isCasting = true;
    enemy.castName = 'Root Eruption';
    enemy.castDuration = 1.45;
    enemy.castElapsed = 0;
    enemy.castCancelable = false;
    enemy.castAction = 'BRIAR_ERUPTION';
    enemy.castTargetX = target.x;
    enemy.castTargetY = target.y;
    enemy.aiCooldown = 6.8;

    this.addTelegraph(ctx, telegraphLayer, {
      id: `tg_briar_${Date.now()}_${Math.random()}`,
      enemyUid: enemy.uid,
      shape: 'CIRCLE',
      x: target.x,
      y: target.y,
      radius: 135,
      angle: 0,
      arcSpan: 0,
      duration: 1.45,
      elapsed: 0,
      cancelable: false,
    });
  }

  private startTempestDive(
    ctx: CombatContext,
    enemy: EnemyUnit,
    target: HeroUnit,
    telegraphLayer: { addChild: (g: Graphics) => void },
  ): void {
    const angle = Math.atan2(target.y - enemy.y, target.x - enemy.x);
    enemy.isCasting = true;
    enemy.castName = 'Gale Dive';
    enemy.castDuration = 1.25;
    enemy.castElapsed = 0;
    enemy.castCancelable = false;
    enemy.castAction = 'TEMPEST_DIVE';
    enemy.castAngle = angle;
    enemy.castTargetX = target.x;
    enemy.castTargetY = target.y;
    enemy.aiCooldown = 5.6;

    this.addTelegraph(ctx, telegraphLayer, {
      id: `tg_gale_${Date.now()}_${Math.random()}`,
      enemyUid: enemy.uid,
      shape: 'CONE',
      x: enemy.x,
      y: enemy.y,
      radius: 255,
      angle,
      arcSpan: 0.72,
      duration: 1.25,
      elapsed: 0,
      cancelable: false,
    });
  }

  private startWispBurst(
    ctx: CombatContext,
    enemy: EnemyUnit,
    telegraphLayer: { addChild: (g: Graphics) => void },
  ): void {
    enemy.isCasting = true;
    enemy.castName = 'Rift Burst';
    enemy.castDuration = 1.05;
    enemy.castElapsed = 0;
    enemy.castCancelable = false;
    enemy.castAction = 'WISP_BURST';
    enemy.castTargetX = enemy.x;
    enemy.castTargetY = enemy.y;
    enemy.aiCooldown = 5.4;

    this.addTelegraph(ctx, telegraphLayer, {
      id: `tg_wisp_${Date.now()}_${Math.random()}`,
      enemyUid: enemy.uid,
      shape: 'CIRCLE',
      x: enemy.x,
      y: enemy.y,
      radius: 105,
      angle: 0,
      arcSpan: 0,
      duration: 1.05,
      elapsed: 0,
      cancelable: false,
    });
  }

  private startCinderLob(
    ctx: CombatContext,
    enemy: EnemyUnit,
    target: HeroUnit,
    telegraphLayer: { addChild: (g: Graphics) => void },
  ): void {
    enemy.isCasting = true;
    enemy.castName = 'Magma Lob';
    enemy.castDuration = 1.25;
    enemy.castElapsed = 0;
    enemy.castCancelable = false;
    enemy.castAction = 'CINDER_LOB';
    enemy.castTargetX = target.x;
    enemy.castTargetY = target.y;
    enemy.aiCooldown = 6.2;

    this.addTelegraph(ctx, telegraphLayer, {
      id: `tg_cinder_${Date.now()}_${Math.random()}`,
      enemyUid: enemy.uid,
      shape: 'CIRCLE',
      x: target.x,
      y: target.y,
      radius: 90,
      angle: 0,
      arcSpan: 0,
      duration: 1.25,
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
    const cdScale = boss.enraged ? 0.78 : 1.0;

    if (roll < 0.24) {
      // Sweeping Halberd (1.2s wide red cone)
      boss.isCasting = true;
      boss.castName = 'Sweeping Halberd';
      boss.castDuration = 1.2;
      boss.castElapsed = 0;
      boss.castCancelable = false;
      boss.castAction = 'SWEEP';
      boss.castAngle = angle;
      boss.aiCooldown = 4.4 * cdScale;

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
    } else if (roll < 0.44) {
      // NEW Boss 2.0 Pattern 1: Eclipse Cross-Beam (Twin perpendicular laser corridors!)
      const baseAngle = boss.phase === 2 ? Math.PI * 0.25 : 0;
      boss.isCasting = true;
      boss.castName = boss.phase === 2 ? 'Eclipse X-Beam' : 'Eclipse Cross-Beam';
      boss.castDuration = boss.enraged ? 1.38 : 1.55;
      boss.castElapsed = 0;
      boss.castCancelable = false;
      boss.castAction = 'CROSS_BEAM';
      boss.castAngle = baseAngle;
      boss.castTargetX = boss.x;
      boss.castTargetY = boss.y;
      boss.aiCooldown = 5.6 * cdScale;

      for (const offset of [0, Math.PI * 0.5]) {
        this.addTelegraph(ctx, telegraphLayer, {
          id: `tg_beam_${Date.now()}_${offset.toFixed(2)}`,
          enemyUid: boss.uid,
          shape: 'LINE',
          x: boss.x,
          y: boss.y,
          radius: 520,
          length: 1080,
          width: 96,
          angle: baseAngle + offset,
          arcSpan: 0,
          duration: boss.castDuration,
          elapsed: 0,
          cancelable: false,
        });
      }
      ctx.notifyBanner('⚡ BOSS CHARGING CROSS-BEAM — Evade out of laser lanes!');
    } else if (roll < 0.62) {
      // NEW Boss 2.0 Pattern 2: Abyssal Ring Nova (Outer crimson blast with glowing Inner SAFE ZONE!)
      boss.isCasting = true;
      boss.castName = 'Abyssal Ring Nova';
      boss.castDuration = boss.enraged ? 1.65 : 1.85;
      boss.castElapsed = 0;
      boss.castCancelable = false;
      boss.castAction = 'RING_NOVA';
      boss.castTargetX = boss.x;
      boss.castTargetY = boss.y;
      boss.aiCooldown = 6.2 * cdScale;

      this.addTelegraph(ctx, telegraphLayer, {
        id: `tg_ring_${Date.now()}`,
        enemyUid: boss.uid,
        shape: 'RING',
        x: boss.x,
        y: boss.y,
        radius: 530,
        innerRadius: 165,
        angle: 0,
        arcSpan: 0,
        duration: boss.castDuration,
        elapsed: 0,
        cancelable: false,
      });
      ctx.notifyBanner('◎ ABYSSAL RING NOVA — Move into the GREEN SAFE ZONE or Perfect Dodge!');
    } else if (roll < 0.80) {
      // Void Shockwave (2.4s CANCELABLE CAST!)
      boss.isCasting = true;
      boss.castName = 'Void Shockwave';
      boss.castDuration = 2.4;
      boss.castElapsed = 0;
      boss.castCancelable = true;
      boss.castAction = 'SHOCKWAVE';
      boss.castTargetX = boss.x;
      boss.castTargetY = boss.y;
      boss.aiCooldown = 6.8 * cdScale;

      this.addTelegraph(ctx, telegraphLayer, {
        id: `tg_shock_${Date.now()}`,
        enemyUid: boss.uid,
        shape: 'CIRCLE',
        x: boss.x,
        y: boss.y,
        radius: 340,
        angle: 0,
        arcSpan: 0,
        duration: 2.4,
        elapsed: 0,
        cancelable: true,
      });
      ctx.notifyBanner('BOSS CASTING VOID SHOCKWAVE — Interrupt with STUN_CANCEL!');
    } else {
      // NEW Boss 2.0 Pattern 3: Starfall Meteor Barrage (5 staggered tracking meteor strikes with Sky Pillars!)
      const meteorCount = boss.enraged ? 6 : boss.phase === 2 ? 5 : 4;
      boss.isCasting = true;
      boss.castName = 'Starfall Meteor Barrage';
      boss.castDuration = 1.1;
      boss.castElapsed = 0;
      boss.castCancelable = false;
      boss.castAction = 'METEOR_BARRAGE';
      boss.aiCooldown = 6.4 * cdScale;
      ctx.notifyBanner('☄ STARFALL METEOR BARRAGE — Time Squad Evade for Starlight Reflex!');

      for (let i = 0; i < meteorCount; i++) {
        ctx.delayedStrikes.push({
          delay: i * (boss.enraged ? 0.48 : 0.56),
          fn: () => {
            if (!boss.alive || boss.isBroken) return;
            const spread = i === 0 ? 40 : 125;
            const tx = Math.max(
              ctx.bounds.minX + 75,
              Math.min(ctx.bounds.maxX - 75, ctx.squadAnchor.x + (Math.random() - 0.5) * spread * 2),
            );
            const ty = Math.max(
              ctx.bounds.minY + 75,
              Math.min(ctx.bounds.maxY - 75, ctx.squadAnchor.y + (Math.random() - 0.5) * spread * 1.4),
            );
            const tgId = `tg_meteor_${Date.now()}_${i}`;
            const meteorDur = boss.enraged ? 0.92 : 1.04;
            this.addTelegraph(ctx, telegraphLayer, {
              id: tgId,
              enemyUid: boss.uid,
              shape: 'CIRCLE',
              x: tx,
              y: ty,
              radius: 112,
              angle: 0,
              arcSpan: 0,
              duration: meteorDur,
              elapsed: 0,
              cancelable: false,
            });
            ctx.delayedStrikes.push({
              delay: meteorDur,
              fn: () => {
                ctx.telegraphs = ctx.telegraphs.filter((t) => {
                  if (t.id === tgId) {
                    t.gfx.destroy();
                    return false;
                  }
                  return true;
                });
                if (!boss.alive) return;
                ctx.spawnSkyPillar(tx, ty, 78, boss.enraged ? 0xf43f5e : 0xd946ef, false);
                ctx.spawnRingWave(tx, ty, 125, 0xf97316, 0.38);
                ctx.spawnBurst(tx, ty - 20, 0xfde047, 16, 36);
                ctx.triggerShake(7);
                audioManager.playSfx('hit', 0.08);
                for (const h of ctx.heroes) {
                  if (h.alive && Math.hypot(h.x - tx, h.y - ty) <= 116) {
                    ctx.damageHero(boss, h, boss.atk * (boss.enraged ? 1.6 : 1.45), true);
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
    enemy.attackSwingDuration = 0.42;
    enemy.attackSwingTimer = 0.42;
    enemy.springLeanVel += 11.5;
    enemy.squashX = 1.18;
    enemy.squashY = 0.84;

    // Remove this enemy's non-barrage telegraphs
    if (action !== 'SKYFALL' && action !== 'METEOR_BARRAGE') {
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
    } else if (action === 'OBSIDIAN_CLEAVE') {
      ctx.spawnSlashArc(enemy.x, enemy.y - 22, enemy.castAngle, 210, 0xf43f5e);
      ctx.triggerShake(7);
      audioManager.playSfx('slash');
      for (const h of ctx.heroes) {
        if (!h.alive) continue;
        const dx = h.x - enemy.x;
        const dy = h.y - enemy.y;
        if (Math.hypot(dx, dy) <= 215) {
          let diff = Math.atan2(dy, dx) - enemy.castAngle;
          while (diff > Math.PI) diff -= Math.PI * 2;
          while (diff < -Math.PI) diff += Math.PI * 2;
          if (Math.abs(diff) <= 0.68) {
            ctx.damageHero(enemy, h, enemy.atk * 1.75 * atkMult, false);
          }
        }
      }
    } else if (action === 'ASTRAL_NOVA') {
      ctx.spawnRingWave(enemy.x, enemy.y, 245, 0x38e8ff, 0.55);
      ctx.spawnBurst(enemy.x, enemy.y - 24, 0xa855f7, 22, 52);
      ctx.triggerShake(10);
      audioManager.playSfx('ult_impact');
      for (const h of ctx.heroes) {
        if (h.alive && Math.hypot(h.x - enemy.x, h.y - enemy.y) <= 245) {
          ctx.damageHero(enemy, h, enemy.atk * 1.95 * atkMult, false);
        }
      }
    } else if (action === 'BRIAR_ERUPTION') {
      ctx.spawnRingWave(enemy.castTargetX, enemy.castTargetY, 140, 0x34d399, 0.45);
      ctx.spawnBurst(enemy.castTargetX, enemy.castTargetY, 0x10b981, 16, 28);
      ctx.triggerShake(6);
      // Treant regrows 8% Max HP on slam!
      const healAmt = Math.round(enemy.maxHp * 0.08);
      enemy.hp = Math.min(enemy.maxHp, enemy.hp + healAmt);
      ctx.spawnDamageText(enemy.x, enemy.y - 54, `+${healAmt}`, 0x34d399, false);
      for (const h of ctx.heroes) {
        if (h.alive && Math.hypot(h.x - enemy.castTargetX, h.y - enemy.castTargetY) <= 140) {
          ctx.damageHero(enemy, h, enemy.atk * 1.6 * atkMult, false);
        }
      }
    } else if (action === 'TEMPEST_DIVE') {
      ctx.spawnSlashArc(enemy.x, enemy.y - 26, enemy.castAngle, 255, 0x22d3ee);
      ctx.spawnRingWave(enemy.castTargetX, enemy.castTargetY, 110, 0xa3e635, 0.35);
      ctx.triggerShake(7);
      // Smooth winged dive halfway toward target with ghost afterimage trail!
      const diveEndX = Math.max(
        ctx.bounds.minX + 60,
        Math.min(ctx.bounds.maxX - 60, (enemy.x + enemy.castTargetX) * 0.5),
      );
      const diveEndY = Math.max(
        ctx.bounds.minY + 60,
        Math.min(ctx.bounds.maxY - 60, (enemy.y + enemy.castTargetY) * 0.5),
      );
      enemy.dashState = {
        startX: enemy.x,
        startY: enemy.y,
        endX: diveEndX,
        endY: diveEndY,
        elapsed: 0,
        duration: 0.22,
        color: 0x22d3ee,
        ghostTimer: 0,
        arcHeight: 36,
      };
      for (const h of ctx.heroes) {
        if (!h.alive) continue;
        const dx = h.x - diveEndX;
        const dy = h.y - diveEndY;
        if (Math.hypot(dx, dy) <= 170) {
          ctx.damageHero(enemy, h, enemy.atk * 1.7 * atkMult, false);
        }
      }
    } else if (action === 'WISP_BURST') {
      ctx.spawnRingWave(enemy.x, enemy.y, 110, 0x38e8ff, 0.35);
      ctx.spawnBurst(enemy.x, enemy.y - 16, 0x38e8ff, 12, 22);
      for (const h of ctx.heroes) {
        if (h.alive && Math.hypot(h.x - enemy.x, h.y - enemy.y) <= 110) {
          ctx.damageHero(enemy, h, enemy.atk * 1.55 * atkMult, false);
        }
      }
    } else if (action === 'CINDER_LOB') {
      ctx.spawnRingWave(enemy.castTargetX, enemy.castTargetY, 94, 0xf97316, 0.35);
      ctx.spawnBurst(enemy.castTargetX, enemy.castTargetY, 0xfb923c, 12, 18);
      for (const h of ctx.heroes) {
        if (h.alive && Math.hypot(h.x - enemy.castTargetX, h.y - enemy.castTargetY) <= 94) {
          ctx.damageHero(enemy, h, enemy.atk * 1.45 * atkMult, true);
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
            ctx.damageHero(enemy, h, enemy.atk * 1.8 * atkMult, false);
          }
        }
      }
    } else if (action === 'CROSS_BEAM') {
      const halfLen = 540;
      const hitHalfW = 54;
      ctx.triggerShake(13);
      audioManager.playSfx('ult_impact', 0.05);
      for (const offset of [0, Math.PI * 0.5]) {
        const a = enemy.castAngle + offset;
        const cos = Math.cos(a);
        const sin = Math.sin(a);
        const x1 = enemy.castTargetX - cos * halfLen;
        const y1 = enemy.castTargetY - sin * halfLen;
        const x2 = enemy.castTargetX + cos * halfLen;
        const y2 = enemy.castTargetY + sin * halfLen;
        ctx.spawnBeam(x1, y1 - 18, x2, y2 - 18, enemy.enraged ? 0xf43f5e : 0xe879f9, 44);
        ctx.spawnBeam(x1, y1 - 18, x2, y2 - 18, 0xfef08a, 14);
      }
      ctx.spawnRingWave(enemy.castTargetX, enemy.castTargetY, 195, 0xf43f5e, 0.48);
      for (const h of ctx.heroes) {
        if (!h.alive) continue;
        let hit = false;
        for (const offset of [0, Math.PI * 0.5]) {
          const a = enemy.castAngle + offset;
          const dx = h.x - enemy.castTargetX;
          const dy = h.y - enemy.castTargetY;
          const along = dx * Math.cos(a) + dy * Math.sin(a);
          const perp = Math.abs(-dx * Math.sin(a) + dy * Math.cos(a));
          if (Math.abs(along) <= halfLen && perp <= hitHalfW) {
            hit = true;
            break;
          }
        }
        if (hit) {
          ctx.damageHero(enemy, h, enemy.atk * (enemy.enraged ? 2.05 : 1.85) * atkMult, true);
        }
      }
    } else if (action === 'RING_NOVA') {
      const innerR = 165;
      const outerR = 530;
      ctx.triggerShake(14);
      audioManager.playSfx('ult_impact', 0.04);
      ctx.spawnRingWave(enemy.castTargetX, enemy.castTargetY, outerR, 0xf43f5e, 0.58);
      ctx.spawnRingWave(enemy.castTargetX, enemy.castTargetY, innerR, 0x34d399, 0.44);
      for (let k = 0; k < 8; k++) {
        const ang = (k * Math.PI * 2) / 8;
        const bx = enemy.castTargetX + Math.cos(ang) * 310;
        const by = enemy.castTargetY + Math.sin(ang) * 215;
        ctx.spawnBurst(bx, by, 0xf43f5e, 10, 32);
      }
      for (const h of ctx.heroes) {
        if (!h.alive) continue;
        const d = Math.hypot(h.x - enemy.castTargetX, h.y - enemy.castTargetY);
        if (d > innerR - 8 && d <= outerR + 12) {
          ctx.damageHero(enemy, h, enemy.atk * (enemy.enraged ? 2.15 : 1.9) * atkMult, true);
        }
      }
    } else if (action === 'SHOCKWAVE') {
      ctx.spawnRingWave(enemy.x, enemy.y, 355, 0xd946ef, 0.6);
      ctx.spawnBurst(enemy.x, enemy.y - 25, 0xf43f5e, 28, 70);
      ctx.triggerShake(14);
      audioManager.playSfx('ult_impact');
      for (const h of ctx.heroes) {
        if (h.alive && Math.hypot(h.x - enemy.x, h.y - enemy.y) <= 355) {
          ctx.damageHero(enemy, h, enemy.atk * 2.5 * atkMult, false);
        }
      }
    }
  }

  public handleEnemyDeath(ctx: CombatContext, enemy: EnemyUnit): void {
    enemy.alive = false;
    enemy.isCasting = false;
    enemy.castAction = null;
    enemy.dissolveDuration = enemy.def.isBoss ? 0.65 : 0.44;
    enemy.dissolveTimer = enemy.dissolveDuration;
    enemy.hpBarGfx.clear();
    enemy.statusGfx.clear();
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
    ctx.spawnLootOrbs(
      enemy.x,
      enemy.y,
      enemy.def.isBoss ? 9 : enemy.def.isMiniBoss ? 5 : 3,
      enemy.def.isBoss,
    );
    if (enemy.def.isBoss) {
      ctx.triggerShake(16);
      audioManager.playSfx('victory');
    }
  }
}
