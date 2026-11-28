import type { CombatContext, HeroUnit } from './CombatTypes';
import type { HitImpactStyle } from './ObjectPool';
import type { SkillDef } from '../types/game';

function hexToNum(hex: string): number {
  return parseInt(hex.replace('#', ''), 16) || 0xffffff;
}

export function getHeroHitStyle(hero: HeroUnit): HitImpactStyle {
  if (hero.def.role === 'HEALER') return 'HEAL';
  if (hero.def.role === 'TANK') return 'BLUNT';
  if (hero.def.role === 'RANGER') return 'PIERCE';
  if (hero.def.role === 'MAGE') return 'ARCANE';
  return 'SLASH';
}

/**
 * Dedicated 12-Hero Signature VFX Choreographer!
 * Gives EVERY Hero unique Skill 1, Skill 2, and unmistakable Ultimate visuals
 * built from soft-feathered anime Sprite textures (zero blocky geometry!).
 */
export function playHeroSkillVfx(
  ctx: CombatContext,
  hero: HeroUnit,
  skill: SkillDef,
  slot: 1 | 2 | 'ULT',
  tx: number,
  ty: number,
  effectiveRadius: number,
  angle: number,
): void {
  const color = hexToNum(hero.def.themeColor);
  const fx = ctx.spawnSpriteFx;

  // =========================================================================
  // 12 BESPOKE SIGNATURE ULTIMATES (Each Hero Feels Completely Unique!)
  // =========================================================================
  if (slot === 'ULT') {
    ctx.triggerShake(16);

    switch (hero.heroId) {
      case 'malakhia': {
        // MALAKHIA UR ULT: JUDGMENT OF THE FALLEN SERAPH — Crimson-Gold Eclipse Seal + Chained Hellfire Pillars + Supernova Blast!
        ctx.triggerArenaDim(0x28060d, 2.0, 0.54);
        fx({
          tex: 'magicCircle',
          x: tx,
          y: ty,
          spin: 1.5,
          scaleX: 1.15,
          scaleY: 0.72,
          endScaleX: 2.85,
          endScaleY: 1.78,
          tint: hero.transcended ? 0xfbbf24 : 0xff3355,
          alpha: 1,
          life: 1.45,
          groundLayer: true,
        });
        fx({
          tex: 'explosionNova',
          x: tx,
          y: ty - 28,
          spin: -1.6,
          scaleX: 0.45,
          endScaleX: 2.35,
          tint: 0xff3355,
          alpha: 0.96,
          life: 0.72,
          delay: 0.14,
          additive: true,
        });
        const fireCols = [0xff3355, 0xfbbf24, 0xf97316];
        for (let i = 0; i < 6; i++) {
          const a = (i * Math.PI * 2) / 6;
          const dist = i === 0 ? 0 : 95;
          const lx = tx + Math.cos(a) * dist;
          const ly = ty + Math.sin(a) * dist * 0.58;
          ctx.spawnSkyPillar(lx, ly, 86, fireCols[i % 3], true);
          fx({
            tex: 'chainLink',
            x: tx,
            y: ty - 24,
            rotation: a,
            scaleX: 1.25,
            scaleY: 0.72,
            endScaleX: 1.85,
            endScaleY: 0.35,
            tint: 0xfbbf24,
            alpha: 0.94,
            life: 0.56,
            delay: i * 0.06,
          });
        }
        ctx.spawnSlashArc(tx, ty - 26, angle, effectiveRadius * 1.12, 0xff3355);
        ctx.spawnBurst(tx, ty - 26, 0xfbbf24, 28, 105);
        return;
      }

      case 'sylvaris': {
        // SYLVARIS SR ULT: AWAKENING OF SYLVA — Bioluminescent World-Tree Magic Seal + Emerald Spirit Nova + Cascading Petals!
        ctx.triggerArenaDim(0x052019, 1.35, 0.44);
        fx({
          tex: 'magicCircle',
          x: tx,
          y: ty,
          spin: 1.35,
          scaleX: 0.95,
          scaleY: 0.6,
          endScaleX: 2.45,
          endScaleY: 1.54,
          tint: 0x34d399,
          alpha: 0.98,
          life: 1.3,
          groundLayer: true,
        });
        fx({
          tex: 'explosionNova',
          x: tx,
          y: ty - 22,
          spin: 1.1,
          scaleX: 0.38,
          endScaleX: 1.9,
          tint: 0x34d399,
          alpha: 0.9,
          life: 0.65,
          additive: true,
        });
        for (let i = 0; i < 16; i++) {
          const a = (i * Math.PI * 2) / 16;
          fx({
            tex: 'petalLeaf',
            x: tx + Math.cos(a) * (effectiveRadius * 0.48),
            y: ty + Math.sin(a) * (effectiveRadius * 0.3),
            vx: Math.cos(a) * 85,
            vy: -95 - Math.random() * 65,
            spin: (Math.random() - 0.5) * 6,
            scaleX: 0.42,
            endScaleX: 0.14,
            tint: i % 2 === 0 ? 0xa7f3d0 : 0xfde047,
            life: 0.85,
            delay: (i % 4) * 0.06,
          });
        }
        ctx.spawnSkyPillar(tx, ty, 108, 0x34d399, true);
        ctx.spawnRingWave(tx, ty, effectiveRadius, 0xa7f3d0, 0.65);
        return;
      }

      case 'astraea': {
        // ASTRAEA UR ULT: EDICT OF THE SHATTERED SKY — Almighty Prismatic Astrolabe + 8 Constellation Sky-Lances + Rainbow Nova!
        ctx.triggerArenaDim(0x160836, 2.2, 0.56);
        fx({
          tex: 'magicCircle',
          x: tx,
          y: ty,
          spin: 1.6,
          scaleX: 1.25,
          scaleY: 0.78,
          endScaleX: 2.9,
          endScaleY: 1.82,
          tint: 0xfde047,
          alpha: 1,
          life: 1.45,
          darkHalo: true,
          groundLayer: true,
        });
        fx({
          tex: 'magicCircle',
          x: tx,
          y: ty,
          spin: -2.1,
          scaleX: 0.9,
          scaleY: 0.56,
          endScaleX: 2.35,
          endScaleY: 1.46,
          tint: 0xe879f9,
          alpha: 0.96,
          life: 1.35,
          darkHalo: true,
          groundLayer: true,
        });
        const prismColors = [0xfde047, 0x38e8ff, 0xe879f9, 0xffffff];
        for (let i = 0; i < 8; i++) {
          const a = (i * Math.PI * 2) / 8;
          const dist = i === 0 ? 0 : 75 + (i % 2) * 85;
          const lx = tx + Math.cos(a) * dist;
          const ly = ty + Math.sin(a) * dist * 0.58;
          const col = prismColors[i % prismColors.length];
          const delay = i * 0.075;
          ctx.spawnSkyPillar(lx, ly, 92, col, true);
          fx({
            tex: 'lightningBolt',
            x: lx,
            y: ly - 55,
            rotation: (Math.random() - 0.5) * 0.45,
            scaleX: 1.5,
            scaleY: 1.2,
            endScaleX: 2.2,
            endScaleY: 0.25,
            tint: col,
            alpha: 1,
            life: 0.42,
            delay,
            darkHalo: true,
          });
          fx({
            tex: 'impactFlare',
            x: lx,
            y: ly - 18,
            spin: 2.0,
            scaleX: 0.85,
            endScaleX: 2.4,
            tint: 0xffffff,
            alpha: 1,
            life: 0.44,
            delay,
          });
        }
        fx({
          tex: 'ringHalo',
          x: tx,
          y: ty,
          scaleX: 0.5,
          scaleY: 0.32,
          endScaleX: 3.1,
          endScaleY: 1.95,
          tint: 0x38e8ff,
          alpha: 0.98,
          life: 0.82,
          delay: 0.45,
          darkHalo: true,
          groundLayer: true,
        });
        ctx.spawnBurst(tx, ty - 34, 0xfde047, 32, 110);
        ctx.spawnBurst(tx, ty - 34, 0xe879f9, 24, 90);
        return;
      }

      case 'vespera': {
        // VESPERA SSR ULT: CALDERA ORBITAL CANNON — Massive Molten Plasma Railbeam + Volcanic Detonation Waves!
        ctx.triggerArenaDim(0x280906, 1.35, 0.48);
        const ex = hero.x + Math.cos(angle) * skill.range;
        const ey = hero.y + Math.sin(angle) * skill.range;
        ctx.spawnBeam(hero.x, hero.y - 30, ex, ey - 30, 0xff4d2e, 54);
        ctx.spawnBeam(hero.x, hero.y - 30, ex, ey - 30, 0xfef08a, 24);
        for (let i = 0; i < 6; i++) {
          const t = (i + 1) / 6;
          const px = hero.x + (ex - hero.x) * t;
          const py = hero.y + (ey - hero.y) * t;
          const delay = i * 0.08;
          fx({
            tex: 'impactFlare',
            x: px,
            y: py - 24,
            scaleX: 0.85,
            endScaleX: 2.1,
            tint: i % 2 === 0 ? 0xfde047 : 0xff4d2e,
            alpha: 1,
            life: 0.42,
            delay,
          });
          fx({
            tex: 'fireWisp',
            x: px,
            y: py - 18,
            vy: -95,
            scaleX: 0.9,
            endScaleX: 0.18,
            tint: 0xf97316,
            alpha: 0.95,
            life: 0.55,
            delay,
            darkHalo: true,
          });
          ctx.spawnRingWave(px, py, 120, 0xff4d2e, 0.45);
        }
        ctx.spawnBurst(tx, ty - 24, 0xff4d2e, 28, 92);
        return;
      }

      case 'vaelen': {
        // VAELEN ULT: DIMENSIONAL SEVERANCE — Reality-rending 5-cut eclipse storm + pulsing Starlight Rift
        ctx.triggerArenaDim(0x1e103d, 1.25, 0.48);
        fx({
          tex: 'magicCircle',
          x: tx,
          y: ty,
          spin: 1.8,
          scaleX: 0.7,
          scaleY: 0.44,
          endScaleX: 1.95,
          endScaleY: 1.22,
          tint: 0xa855f7,
          alpha: 0.95,
          life: 1.0,
          darkHalo: true,
          groundLayer: true,
        });
        const slashAngles = [-0.62, 0.58, -1.15, 0.14, 1.08];
        slashAngles.forEach((sa, idx) => {
          const delay = idx * 0.085;
          const ox = tx + (Math.random() - 0.5) * 90;
          const oy = ty - 28 + (Math.random() - 0.5) * 54;
          const col = idx % 2 === 0 ? 0xf5c84c : 0xc084fc;
          // Long reality-crack lightning cut across entire zone
          fx({
            tex: 'lightningBolt',
            x: ox,
            y: oy,
            rotation: sa,
            scaleX: 1.65,
            scaleY: 0.95,
            endScaleX: 2.3,
            endScaleY: 0.25,
            tint: col,
            alpha: 1,
            life: 0.34,
            delay,
            darkHalo: true,
          });
          // Sweeping tapered eclipse crescent blade
          fx({
            tex: 'crescentSlash',
            x: ox,
            y: oy,
            rotation: sa,
            spin: 0.4,
            scaleX: 1.15,
            scaleY: 1.15,
            endScaleX: 1.85,
            endScaleY: 1.7,
            tint: col,
            alpha: 0.98,
            life: 0.36,
            delay,
            darkHalo: true,
          });
          fx({
            tex: 'impactFlare',
            x: ox,
            y: oy,
            rotation: sa,
            scaleX: 0.65,
            endScaleX: 1.4,
            tint: 0xffffff,
            alpha: 1,
            life: 0.28,
            delay,
          });
        });
        // Final Dimensional Collapse explosion
        fx({
          tex: 'ringHalo',
          x: tx,
          y: ty,
          scaleX: 0.5,
          scaleY: 0.32,
          endScaleX: 2.35,
          endScaleY: 1.48,
          tint: 0xfde047,
          alpha: 0.98,
          life: 0.62,
          delay: 0.42,
          darkHalo: true,
          groundLayer: true,
        });
        ctx.spawnBurst(tx, ty - 24, 0xc084fc, 22, 72);
        return;
      }

      case 'seraphina': {
        // SERAPHINA ULT: SUPERNOVA REQUIEM — Giant rotating constellation → galaxy implosion → cryo supernova + ice shards!
        ctx.triggerArenaDim(0x091638, 1.35, 0.52);
        // Giant twin counter-rotating astral magic circles
        fx({
          tex: 'magicCircle',
          x: tx,
          y: ty,
          spin: 1.4,
          scaleX: 1.1,
          scaleY: 0.68,
          endScaleX: 2.3,
          endScaleY: 1.45,
          tint: 0x38e8ff,
          alpha: 0.98,
          life: 1.1,
          darkHalo: true,
          groundLayer: true,
        });
        fx({
          tex: 'magicCircle',
          x: tx,
          y: ty,
          spin: -2.2,
          scaleX: 1.4,
          scaleY: 0.88,
          endScaleX: 0.55,
          endScaleY: 0.35,
          tint: 0x818cf8,
          alpha: 0.88,
          life: 0.42,
          groundLayer: true,
        });
        // Implosion core collapsing inward then exploding into supernova!
        fx({
          tex: 'softGlow',
          x: tx,
          y: ty - 42,
          scaleX: 2.2,
          endScaleX: 0.35,
          tint: 0x38e8ff,
          alpha: 0.85,
          life: 0.32,
          darkHalo: true,
        });
        fx({
          tex: 'softGlow',
          x: tx,
          y: ty - 42,
          scaleX: 0.5,
          endScaleX: 3.4,
          tint: 0x38e8ff,
          alpha: 0.96,
          life: 0.65,
          delay: 0.32,
          darkHalo: true,
        });
        fx({
          tex: 'impactFlare',
          x: tx,
          y: ty - 42,
          spin: 1.2,
          scaleX: 0.8,
          endScaleX: 2.5,
          tint: 0xffffff,
          alpha: 1,
          life: 0.52,
          delay: 0.32,
        });
        // 10 erupting crystalline frost shards around target zone (FREEZE visual!)
        for (let i = 0; i < 10; i++) {
          const a = (i * Math.PI * 2) / 10;
          const dist = 55 + (i % 2) * 65;
          const ix = tx + Math.cos(a) * dist;
          const iy = ty + Math.sin(a) * dist * 0.62;
          fx({
            tex: 'iceCrystal',
            x: ix,
            y: iy + 12,
            vy: -38,
            rotation: (Math.random() - 0.5) * 0.4,
            scaleX: 0.25,
            scaleY: 0.25,
            endScaleX: 0.72,
            endScaleY: 0.88,
            tint: i % 2 === 0 ? 0x7dd3fc : 0xe0f2fe,
            alpha: 0.96,
            life: 0.78,
            delay: 0.34 + i * 0.025,
            darkHalo: true,
          });
        }
        return;
      }

      case 'draven': {
        // DRAVEN ULT: CATACLYSMIC BASTION — Seismic magma fissures + volcanic lava eruptions + ash clouds!
        ctx.triggerArenaDim(0x2d0e06, 1.35, 0.46);
        // Massive molten tectonic ground cracks
        fx({
          tex: 'groundCrack',
          x: tx,
          y: ty,
          scaleX: 0.85,
          scaleY: 0.54,
          endScaleX: 2.25,
          endScaleY: 1.44,
          tint: 0xf97316,
          alpha: 1,
          life: 1.15,
          darkHalo: true,
          groundLayer: true,
        });
        fx({
          tex: 'groundCrack',
          x: tx,
          y: ty,
          rotation: 0.55,
          scaleX: 0.65,
          scaleY: 0.42,
          endScaleX: 1.75,
          endScaleY: 1.1,
          tint: 0xfef08a,
          alpha: 0.92,
          life: 0.85,
          groundLayer: true,
        });
        // Billowing volcanic smoke + roaring lava flame plumes
        for (let i = 0; i < 14; i++) {
          const a = (i * Math.PI * 2) / 14;
          const dist = 25 + Math.random() * effectiveRadius * 0.68;
          const px = tx + Math.cos(a) * dist;
          const py = ty + Math.sin(a) * dist * 0.62;
          fx({
            tex: 'smokePuff',
            x: px,
            y: py,
            vx: Math.cos(a) * 55,
            vy: -75 - Math.random() * 60,
            scaleX: 0.55,
            endScaleX: 1.35,
            tint: 0x292524,
            alpha: 0.72,
            life: 0.85,
            delay: Math.random() * 0.16,
          });
          fx({
            tex: 'fireWisp',
            x: px,
            y: py + 6,
            vx: Math.cos(a) * 35,
            vy: -140 - Math.random() * 110,
            gravity: 160,
            scaleX: 0.65,
            scaleY: 0.85,
            endScaleX: 1.15,
            endScaleY: 1.45,
            tint: i % 2 === 0 ? 0xf97316 : 0xfacc15,
            alpha: 0.98,
            life: 0.68,
            delay: Math.random() * 0.22,
            darkHalo: true,
          });
        }
        ctx.spawnRingWave(tx, ty, effectiveRadius * 1.15, 0xf97316, 0.7);
        return;
      }

      case 'elara': {
        // ELARA ULT: CELESTIAL STARFALL — 12 luminous orbital starlight arrows plunging diagonally from the heavens!
        ctx.triggerArenaDim(0x06241b, 1.35, 0.46);
        fx({
          tex: 'magicCircle',
          x: tx,
          y: ty,
          spin: -1.1,
          scaleX: 1.5,
          scaleY: 0.95,
          endScaleX: 2.0,
          endScaleY: 1.25,
          tint: 0x34d399,
          alpha: 0.88,
          life: 1.05,
          darkHalo: true,
          groundLayer: true,
        });
        for (let i = 0; i < 12; i++) {
          const delay = i * 0.06;
          const ox = tx + (Math.random() - 0.5) * effectiveRadius * 1.35;
          const oy = ty + (Math.random() - 0.5) * effectiveRadius * 0.82;
          const fallAngle = 1.18 + (Math.random() - 0.5) * 0.14;
          const startDist = 420;
          const sx = ox - Math.cos(fallAngle) * startDist;
          const sy = oy - Math.sin(fallAngle) * startDist;
          const speed = 1550;
          const flightTime = startDist / speed;
          // Diagonal falling star-arrow streaking down
          fx({
            tex: 'arrowStreak',
            x: sx,
            y: sy,
            vx: Math.cos(fallAngle) * speed,
            vy: Math.sin(fallAngle) * speed,
            rotation: fallAngle,
            scaleX: 0.95,
            scaleY: 0.82,
            endScaleX: 1.15,
            endScaleY: 0.65,
            tint: i % 3 === 0 ? 0xfef08a : 0x34d399,
            alpha: 1,
            life: flightTime + 0.05,
            delay,
            darkHalo: true,
          });
          // Ground impact crescent & moonlit flare right when arrow lands
          fx({
            tex: 'impactFlare',
            x: ox,
            y: oy,
            scaleX: 0.35,
            endScaleX: 0.92,
            tint: 0x6ee7b7,
            alpha: 0.96,
            life: 0.32,
            delay: delay + flightTime,
            darkHalo: true,
          });
          fx({
            tex: 'ringHalo',
            x: ox,
            y: oy,
            scaleX: 0.18,
            scaleY: 0.11,
            endScaleX: 0.65,
            endScaleY: 0.42,
            tint: 0x34d399,
            alpha: 0.85,
            life: 0.36,
            delay: delay + flightTime,
            groundLayer: true,
          });
        }
        return;
      }

      case 'garrick': {
        // GARRICK ULT: FORTRESS OF DAWN — Colossal Golden Hexagonal Shield Dome covering entire squad!
        ctx.triggerArenaDim(0x241905, 1.2, 0.38);
        const cx = hero.x;
        const cy = hero.y;
        fx({
          tex: 'magicCircle',
          x: cx,
          y: cy + 8,
          spin: 0.9,
          scaleX: 0.9,
          scaleY: 0.58,
          endScaleX: 2.35,
          endScaleY: 1.5,
          tint: 0xfacc15,
          alpha: 0.96,
          life: 1.15,
          darkHalo: true,
          groundLayer: true,
        });
        // Giant rising Golden Hex-Dome shield over squad
        fx({
          tex: 'hexDome',
          x: cx,
          y: cy - 36,
          scaleX: 0.55,
          scaleY: 0.45,
          endScaleX: 2.45,
          endScaleY: 1.85,
          tint: 0xfacc15,
          alpha: 0.92,
          life: 1.05,
          darkHalo: true,
        });
        // 4 Royal Solaris guardian light columns at cardinal corners
        for (let i = 0; i < 4; i++) {
          const a = (i * Math.PI) / 2 + Math.PI / 4;
          ctx.spawnSkyPillar(cx + Math.cos(a) * 145, cy + Math.sin(a) * 85, 58, 0xfde047, false);
        }
        return;
      }

      case 'lyra': {
        // LYRA ULT: HYMN OF REBIRTH — Emerald sunbeam + 28 swirling luminous blossoms + sanctuary rings!
        ctx.triggerArenaDim(0x06291e, 1.25, 0.38);
        const cx = hero.x;
        const cy = hero.y;
        ctx.spawnSkyPillar(cx, cy, 130, 0x34d399, true);
        fx({
          tex: 'magicCircle',
          x: cx,
          y: cy,
          spin: 0.8,
          scaleX: 0.8,
          scaleY: 0.5,
          endScaleX: 2.4,
          endScaleY: 1.5,
          tint: 0x34d399,
          alpha: 0.95,
          life: 1.1,
          darkHalo: true,
          groundLayer: true,
        });
        // 28 swirling ascending emerald & golden blossom petals
        for (let i = 0; i < 28; i++) {
          const a = (i * Math.PI * 2) / 14;
          const dist = 30 + Math.random() * 190;
          fx({
            tex: 'petalLeaf',
            x: cx + Math.cos(a) * dist,
            y: cy + Math.sin(a) * dist * 0.6,
            vx: -Math.sin(a) * 65,
            vy: -95 - Math.random() * 105,
            spin: (Math.random() - 0.5) * 7,
            scaleX: 0.38 + Math.random() * 0.25,
            endScaleX: 0.12,
            tint: i % 3 === 0 ? 0xfef08a : i % 2 === 0 ? 0x34d399 : 0xffffff,
            alpha: 0.96,
            life: 0.85 + Math.random() * 0.35,
            delay: Math.random() * 0.22,
            darkHalo: true,
          });
        }
        return;
      }

      case 'raze': {
        // RAZE ULT: CHAIN GUILLOTINE — 4 molten chains snap inward to bind target → giant vertical fiery scythe slam!
        ctx.triggerArenaDim(0x2b070b, 1.25, 0.48);
        // 4 Forged Molten Chains snapping inward from corners to lock target
        for (let i = 0; i < 4; i++) {
          const ca = (i * Math.PI) / 2 + Math.PI / 4;
          const dist = 240;
          const sx = tx + Math.cos(ca) * dist;
          const sy = ty - 20 + Math.sin(ca) * dist * 0.65;
          const toCenter = Math.atan2(ty - 20 - sy, tx - sx);
          fx({
            tex: 'chainLink',
            x: sx,
            y: sy,
            anchorX: 0,
            anchorY: 0.5,
            rotation: toCenter,
            scaleX: 0.2,
            scaleY: 0.65,
            endScaleX: 1.05,
            endScaleY: 0.65,
            tint: 0xf97316,
            alpha: 0.98,
            life: 0.42,
            darkHalo: true,
          });
        }
        // Colossal downward crimson-fire guillotine crescent slash!
        fx({
          tex: 'crescentSlash',
          x: tx,
          y: ty - 140,
          vy: 380,
          rotation: Math.PI / 2,
          scaleX: 1.75,
          scaleY: 1.85,
          endScaleX: 2.15,
          endScaleY: 2.05,
          tint: 0xef4444,
          alpha: 1,
          life: 0.42,
          delay: 0.16,
          darkHalo: true,
        });
        fx({
          tex: 'groundCrack',
          x: tx,
          y: ty,
          scaleX: 0.7,
          scaleY: 0.44,
          endScaleX: 1.85,
          endScaleY: 1.18,
          tint: 0xef4444,
          alpha: 0.96,
          life: 0.85,
          delay: 0.24,
          darkHalo: true,
          groundLayer: true,
        });
        // Fiery Burn-Detonation flame burst
        for (let i = 0; i < 14; i++) {
          const a = Math.random() * Math.PI * 2;
          const spd = 90 + Math.random() * 170;
          fx({
            tex: 'fireWisp',
            x: tx,
            y: ty - 15,
            vx: Math.cos(a) * spd,
            vy: Math.sin(a) * spd * 0.6 - 110,
            gravity: 170,
            scaleX: 0.62,
            endScaleX: 0.12,
            tint: i % 2 === 0 ? 0xef4444 : 0xfacc15,
            alpha: 0.98,
            life: 0.58,
            delay: 0.24,
            darkHalo: true,
          });
        }
        return;
      }

      case 'orion': {
        // ORION ULT: ORION'S JUDGMENT — 3 holographic lock-on reticles + 3 sweeping orbital plasma railgun beams + lightning!
        ctx.triggerArenaDim(0x071330, 1.3, 0.5);
        const offsets = [
          { dx: 0, dy: 0 },
          { dx: -95, dy: -36 },
          { dx: 95, dy: 34 },
        ];
        offsets.forEach(({ dx, dy }, idx) => {
          const bx = tx + dx;
          const by = ty + dy;
          const d = idx * 0.12;
          // Triangulated holographic targeting seal
          fx({
            tex: 'magicCircle',
            x: bx,
            y: by,
            spin: idx % 2 === 0 ? 2.4 : -2.4,
            scaleX: 0.95,
            scaleY: 0.6,
            endScaleX: 0.58,
            endScaleY: 0.36,
            tint: 0x38e8ff,
            alpha: 0.96,
            life: 0.65,
            delay: d,
            darkHalo: true,
            groundLayer: true,
          });
          // High-precision orbital plasma laser beam plunging diagonally
          const beamAngle = 1.35 + (idx - 1) * 0.18;
          const startX = bx - Math.cos(beamAngle) * 560;
          const startY = by - Math.sin(beamAngle) * 560;
          fx({
            tex: 'energyBeam',
            x: startX,
            y: startY,
            anchorX: 0,
            anchorY: 0.5,
            rotation: beamAngle,
            scaleX: 2.4,
            scaleY: 1.65,
            endScaleX: 2.4,
            endScaleY: 0.2,
            tint: 0x60a5fa,
            alpha: 1,
            life: 0.45,
            delay: d + 0.08,
            darkHalo: true,
          });
          fx({
            tex: 'lightningBolt',
            x: bx,
            y: by - 120,
            rotation: beamAngle,
            scaleX: 1.4,
            scaleY: 0.9,
            tint: 0xe0f2fe,
            alpha: 1,
            life: 0.36,
            delay: d + 0.08,
            darkHalo: true,
          });
          fx({
            tex: 'impactFlare',
            x: bx,
            y: by,
            scaleX: 0.65,
            endScaleX: 1.45,
            tint: 0x38e8ff,
            alpha: 1,
            life: 0.4,
            delay: d + 0.08,
            darkHalo: true,
          });
        });
        return;
      }

      case 'kael': {
        // KAEL ULT: TEMPEST BARRAGE — Swirling emerald wind cyclone + 18 rapid wind arrows!
        ctx.triggerArenaDim(0x062413, 1.2, 0.4);
        // Swirling wind vortex rings lifting upward
        for (let r = 0; r < 5; r++) {
          fx({
            tex: 'ringHalo',
            x: tx,
            y: ty - r * 28,
            vy: -90,
            spin: 4.5,
            scaleX: 0.45 + r * 0.22,
            scaleY: (0.45 + r * 0.22) * 0.45,
            endScaleX: 1.2 + r * 0.28,
            endScaleY: (1.2 + r * 0.28) * 0.45,
            tint: r % 2 === 0 ? 0x22c55e : 0x86efac,
            alpha: 0.85,
            life: 0.72,
            delay: r * 0.06,
            darkHalo: true,
          });
        }
        // Rapid storm of 18 feathered wind arrows slicing diagonally
        for (let i = 0; i < 18; i++) {
          const d = i * 0.036;
          const ox = tx + (Math.random() - 0.5) * effectiveRadius * 1.25;
          const oy = ty + (Math.random() - 0.5) * effectiveRadius * 0.75;
          const fa = 0.85 + (Math.random() - 0.5) * 0.25;
          const dist = 340;
          fx({
            tex: 'arrowStreak',
            x: ox - Math.cos(fa) * dist,
            y: oy - Math.sin(fa) * dist,
            vx: Math.cos(fa) * 1450,
            vy: Math.sin(fa) * 1450,
            rotation: fa,
            scaleX: 0.72,
            scaleY: 0.56,
            tint: i % 3 === 0 ? 0xffffff : 0x4ade80,
            alpha: 0.98,
            life: 0.28,
            delay: d,
            darkHalo: true,
          });
        }
        return;
      }

      case 'nyx': {
        // NYX ULT: INFERNO PILLAR — 3 Staggered Roaring Flame Geysers (Left → Right → Giant Center) + Ash Smoke!
        ctx.triggerArenaDim(0x290814, 1.3, 0.48);
        const geysers = [
          { dx: -92, dy: -22, sc: 0.85, delay: 0.0 },
          { dx: 92, dy: 20, sc: 0.85, delay: 0.16 },
          { dx: 0, dy: 0, sc: 1.25, delay: 0.32 },
        ];
        geysers.forEach(({ dx, dy, sc, delay }) => {
          const gx = tx + dx;
          const gy = ty + dy;
          fx({
            tex: 'skyColumn',
            x: gx,
            y: gy + 16,
            anchorX: 0.5,
            anchorY: 0.96,
            scaleX: sc * 1.05,
            scaleY: sc * 1.2,
            endScaleX: sc * 0.35,
            endScaleY: sc * 1.35,
            tint: 0xf43f5e,
            alpha: 0.95,
            life: 0.65,
            delay,
            darkHalo: true,
          });
          fx({
            tex: 'skyColumn',
            x: gx,
            y: gy + 12,
            anchorX: 0.5,
            anchorY: 0.96,
            scaleX: sc * 0.48,
            scaleY: sc * 1.1,
            endScaleX: sc * 0.12,
            endScaleY: sc * 1.25,
            tint: 0xfef08a,
            alpha: 0.98,
            life: 0.55,
            delay,
          });
          // Roaring fire wisps + dark volcanic smoke ring at base
          for (let k = 0; k < 8; k++) {
            const a = (k * Math.PI * 2) / 8;
            fx({
              tex: 'fireWisp',
              x: gx + Math.cos(a) * 28 * sc,
              y: gy + Math.sin(a) * 16 * sc,
              vx: Math.cos(a) * 55,
              vy: -135 - Math.random() * 120,
              scaleX: 0.55 * sc,
              scaleY: 0.85 * sc,
              endScaleX: 0.18,
              endScaleY: 0.25,
              tint: k % 2 === 0 ? 0xfb7185 : 0xf97316,
              alpha: 0.96,
              life: 0.58,
              delay: delay + Math.random() * 0.1,
              darkHalo: true,
            });
          }
          fx({
            tex: 'smokePuff',
            x: gx,
            y: gy - 12,
            vy: -45,
            scaleX: 0.65 * sc,
            endScaleX: 1.5 * sc,
            tint: 0x1c1917,
            alpha: 0.62,
            life: 0.72,
            delay: delay + 0.08,
          });
        });
        return;
      }

      case 'titus': {
        // TITUS ULT: CRYSTAL AEGIS — 8 glowing prism crystal monoliths erupting around squad + refractive hex shield!
        ctx.triggerArenaDim(0x16113a, 1.2, 0.42);
        const cx = hero.x;
        const cy = hero.y;
        fx({
          tex: 'hexDome',
          x: cx,
          y: cy - 32,
          scaleX: 0.6,
          scaleY: 0.5,
          endScaleX: 2.2,
          endScaleY: 1.65,
          tint: 0x818cf8,
          alpha: 0.88,
          life: 1.0,
          darkHalo: true,
        });
        for (let i = 0; i < 8; i++) {
          const a = (i * Math.PI * 2) / 8;
          const px = cx + Math.cos(a) * 128;
          const py = cy + Math.sin(a) * 78;
          fx({
            tex: 'iceCrystal',
            x: px,
            y: py + 15,
            vy: -32,
            scaleX: 0.3,
            scaleY: 0.25,
            endScaleX: 0.78,
            endScaleY: 1.05,
            tint: i % 2 === 0 ? 0xa5b4fc : 0x38e8ff,
            alpha: 0.96,
            life: 0.95,
            delay: i * 0.04,
            darkHalo: true,
          });
        }
        ctx.spawnRingWave(cx, cy, 240, 0x818cf8, 0.65);
        return;
      }

      case 'aurelia': {
        // AURELIA ULT: SANCTUARY OF ETERNAL BLOOM — Giant emerald-gold World-Tree lotus sanctuary + rising radiant petals!
        ctx.triggerArenaDim(0x06241b, 1.35, 0.42);
        const cx = hero.x;
        const cy = hero.y;
        ctx.spawnSkyPillar(cx, cy, 175, 0x34d399, true);
        fx({
          tex: 'magicCircle',
          x: cx,
          y: cy,
          spin: 1.2,
          scaleX: 0.9,
          scaleY: 0.56,
          endScaleX: 2.55,
          endScaleY: 1.6,
          tint: 0x34d399,
          alpha: 0.96,
          life: 1.2,
          darkHalo: true,
          groundLayer: true,
        });
        for (let w = 0; w < 3; w++) {
          fx({
            tex: 'ringHalo',
            x: cx,
            y: cy,
            scaleX: 0.35,
            scaleY: 0.22,
            endScaleX: 2.75,
            endScaleY: 1.72,
            tint: w === 1 ? 0xfde047 : 0x6ee7b7,
            alpha: 0.94,
            life: 0.82,
            delay: w * 0.14,
            darkHalo: true,
            groundLayer: true,
          });
        }
        for (let i = 0; i < 32; i++) {
          const a = Math.random() * Math.PI * 2;
          const dist = Math.random() * 260;
          fx({
            tex: i % 3 === 0 ? 'softGlow' : 'petalLeaf',
            x: cx + Math.cos(a) * dist,
            y: cy + Math.sin(a) * dist * 0.62,
            vy: -95 - Math.random() * 90,
            spin: (Math.random() - 0.5) * 6,
            scaleX: 0.48,
            endScaleX: 0.14,
            tint: i % 3 === 0 ? 0xfde047 : 0x34d399,
            alpha: 0.96,
            life: 0.95,
            delay: Math.random() * 0.25,
            darkHalo: true,
          });
        }
        return;
      }

      case 'zephyrion': {
        // ZEPHYRION ULT: ASTRAL ZERO SEVER — Giant golden clockwork seal + 8 ultra-fast cyan-indigo dimensional slashes!
        ctx.triggerArenaDim(0x0b0f30, 1.35, 0.54);
        fx({
          tex: 'magicCircle',
          x: tx,
          y: ty,
          spin: -3.2,
          scaleX: 1.15,
          scaleY: 0.72,
          endScaleX: 2.35,
          endScaleY: 1.48,
          tint: 0xf5c84c,
          alpha: 0.96,
          life: 1.1,
          darkHalo: true,
          groundLayer: true,
        });
        for (let i = 0; i < 8; i++) {
          const sa = (i * Math.PI) / 4 - 0.4;
          const d = i * 0.065;
          const ox = tx + (Math.random() - 0.5) * 110;
          const oy = ty - 26 + (Math.random() - 0.5) * 60;
          const col = i % 2 === 0 ? 0x38e8ff : 0x818cf8;
          fx({
            tex: 'crescentSlash',
            x: ox,
            y: oy,
            rotation: sa,
            scaleX: 1.1,
            scaleY: 1.1,
            endScaleX: 1.9,
            endScaleY: 1.65,
            tint: col,
            alpha: 1,
            life: 0.34,
            delay: d,
            darkHalo: true,
          });
          fx({
            tex: 'lightningBolt',
            x: ox,
            y: oy,
            rotation: sa,
            scaleX: 1.6,
            scaleY: 0.85,
            endScaleX: 2.35,
            endScaleY: 0.22,
            tint: 0xe0f2fe,
            alpha: 0.98,
            life: 0.3,
            delay: d,
            darkHalo: true,
          });
        }
        fx({
          tex: 'impactFlare',
          x: tx,
          y: ty - 24,
          scaleX: 0.7,
          endScaleX: 2.2,
          tint: 0x38e8ff,
          alpha: 1,
          life: 0.48,
          delay: 0.52,
          darkHalo: true,
        });
        ctx.spawnBurst(tx, ty - 24, 0x818cf8, 26, 85);
        return;
      }

      case 'ignis': {
        // IGNIS ULT: HELIOS CORONA — Blazing golden sun pillar + scorching solar rings + rising flame wisps!
        ctx.triggerArenaDim(0x2b1104, 1.3, 0.48);
        ctx.spawnSkyPillar(tx, ty, 195, 0xfb923c, true);
        fx({
          tex: 'magicCircle',
          x: tx,
          y: ty,
          spin: 1.9,
          scaleX: 0.8,
          scaleY: 0.5,
          endScaleX: 2.25,
          endScaleY: 1.4,
          tint: 0xfde047,
          alpha: 0.98,
          life: 1.0,
          darkHalo: true,
          groundLayer: true,
        });
        for (let i = 0; i < 22; i++) {
          const a = (i * Math.PI * 2) / 22;
          const spd = 95 + Math.random() * 170;
          fx({
            tex: 'fireWisp',
            x: tx,
            y: ty - 18,
            vx: Math.cos(a) * spd,
            vy: Math.sin(a) * spd * 0.62 - 120,
            gravity: 160,
            scaleX: 0.72,
            endScaleX: 0.14,
            tint: i % 2 === 0 ? 0xfb923c : 0xfde047,
            alpha: 0.98,
            life: 0.66,
            delay: Math.random() * 0.18,
            darkHalo: true,
          });
        }
        ctx.spawnRingWave(tx, ty, 245, 0xfb923c, 0.65);
        return;
      }

      case 'bram': {
        // BRAM ULT: IRONCLAD ERUPTION — Volcanic crimson shockwave dome + erupting magma embers!
        ctx.triggerArenaDim(0x26080f, 1.2, 0.44);
        const cx = hero.x;
        const cy = hero.y;
        fx({
          tex: 'hexDome',
          x: cx,
          y: cy - 30,
          scaleX: 0.65,
          scaleY: 0.5,
          endScaleX: 2.15,
          endScaleY: 1.6,
          tint: 0xf43f5e,
          alpha: 0.9,
          life: 0.95,
          darkHalo: true,
        });
        fx({
          tex: 'groundCrack',
          x: cx,
          y: cy,
          scaleX: 0.6,
          scaleY: 0.38,
          endScaleX: 2.05,
          endScaleY: 1.3,
          tint: 0xf97316,
          alpha: 0.96,
          life: 0.9,
          darkHalo: true,
          groundLayer: true,
        });
        for (let i = 0; i < 16; i++) {
          const a = Math.random() * Math.PI * 2;
          const spd = 80 + Math.random() * 150;
          fx({
            tex: 'fireWisp',
            x: cx,
            y: cy - 16,
            vx: Math.cos(a) * spd,
            vy: Math.sin(a) * spd * 0.6 - 110,
            gravity: 210,
            scaleX: 0.6,
            endScaleX: 0.14,
            tint: i % 2 === 0 ? 0xf43f5e : 0xf97316,
            alpha: 0.96,
            life: 0.58,
            darkHalo: true,
          });
        }
        ctx.spawnRingWave(cx, cy, 240, 0xf43f5e, 0.6);
        return;
      }

      case 'clara': {
        // CLARA ULT: BEACON OF HOPE — Golden Sunburst Lantern Column + expanding dawn waves + 26 rising golden motes!
        ctx.triggerArenaDim(0x291c05, 1.2, 0.36);
        const cx = hero.x;
        const cy = hero.y;
        ctx.spawnSkyPillar(cx, cy, 145, 0xfcd34d, true);
        for (let w = 0; w < 3; w++) {
          fx({
            tex: 'ringHalo',
            x: cx,
            y: cy,
            scaleX: 0.3,
            scaleY: 0.18,
            endScaleX: 2.6,
            endScaleY: 1.62,
            tint: w === 1 ? 0xffffff : 0xfcd34d,
            alpha: 0.92,
            life: 0.75,
            delay: w * 0.14,
            darkHalo: true,
            groundLayer: true,
          });
        }
        for (let i = 0; i < 26; i++) {
          const a = Math.random() * Math.PI * 2;
          const dist = Math.random() * 220;
          fx({
            tex: i % 2 === 0 ? 'softGlow' : 'petalLeaf',
            x: cx + Math.cos(a) * dist,
            y: cy + Math.sin(a) * dist * 0.6,
            vy: -85 - Math.random() * 95,
            vx: (Math.random() - 0.5) * 35,
            spin: (Math.random() - 0.5) * 4,
            scaleX: 0.32 + Math.random() * 0.22,
            endScaleX: 0.08,
            tint: i % 3 === 0 ? 0xffffff : 0xfde047,
            alpha: 0.96,
            life: 0.9,
            delay: Math.random() * 0.25,
            darkHalo: true,
          });
        }
        return;
      }

      default:
        ctx.spawnSkyPillar(tx, ty, Math.max(120, effectiveRadius * 0.85), color, true);
        ctx.spawnRingWave(tx, ty, Math.max(185, effectiveRadius), color, 0.68);
        return;
    }
  }

  // =========================================================================
  // BESPOKE SKILL 1 & SKILL 2 SIGNATURE VISUALS (Non-Blocky & Thematic!)
  // =========================================================================
  switch (skill.id) {
    case 'vaelen_s2': {
      // Twin intersecting Gold + Cosmic Violet X-Crescents!
      ctx.spawnSlashArc(hero.x + Math.cos(angle) * 28, hero.y - 24, angle - 0.25, effectiveRadius * 1.05, 0xf5c84c);
      ctx.spawnSlashArc(hero.x + Math.cos(angle) * 28, hero.y - 24, angle + 0.32, effectiveRadius * 0.98, 0xa855f7);
      fx({
        tex: 'lightningBolt',
        x: tx,
        y: ty - 24,
        rotation: angle,
        scaleX: 0.95,
        scaleY: 0.65,
        tint: 0xfde047,
        life: 0.28,
        darkHalo: true,
      });
      return;
    }
    case 'seraphina_s1': {
      // Gravity Well swirling inward astral vortex
      fx({
        tex: 'magicCircle',
        x: tx,
        y: ty,
        spin: -3.2,
        scaleX: 1.55,
        scaleY: 0.98,
        endScaleX: 0.45,
        endScaleY: 0.28,
        tint: 0x38e8ff,
        alpha: 0.95,
        life: 0.62,
        darkHalo: true,
        groundLayer: true,
      });
      fx({
        tex: 'softGlow',
        x: tx,
        y: ty - 18,
        scaleX: 1.35,
        endScaleX: 0.25,
        tint: 0x818cf8,
        alpha: 0.88,
        life: 0.48,
        darkHalo: true,
      });
      return;
    }
    case 'seraphina_s2': {
      // Starfall Cascade plunging meteors
      for (let i = 0; i < 3; i++) {
        const d = i * 0.1;
        const ox = tx + (i - 1) * 58;
        const oy = ty + (i % 2 === 0 ? -16 : 18);
        fx({
          tex: 'arrowStreak',
          x: ox - 160,
          y: oy - 310,
          vx: 720,
          vy: 1380,
          rotation: 1.09,
          scaleX: 0.95,
          scaleY: 1.15,
          tint: 0x38e8ff,
          life: 0.25,
          delay: d,
          darkHalo: true,
        });
        fx({
          tex: 'impactFlare',
          x: ox,
          y: oy,
          scaleX: 0.45,
          endScaleX: 1.15,
          tint: 0x38e8ff,
          life: 0.35,
          delay: d + 0.22,
          darkHalo: true,
        });
      }
      return;
    }
    case 'draven_s1': {
      // Magma Tectonic hammer smash with glowing ground fissures
      fx({
        tex: 'groundCrack',
        x: tx,
        y: ty,
        scaleX: 0.65,
        scaleY: 0.42,
        endScaleX: 1.45,
        endScaleY: 0.92,
        tint: 0xf97316,
        alpha: 0.96,
        life: 0.72,
        darkHalo: true,
        groundLayer: true,
      });
      ctx.spawnBurst(tx, ty - 14, 0xf97316, 16, 42);
      return;
    }
    case 'elara_s2': {
      // Constellation Volley: 6 crisp starlight arrows in a corridor
      for (let i = 0; i < 6; i++) {
        const a = angle + (i - 2.5) * 0.085;
        fx({
          tex: 'arrowStreak',
          x: hero.x,
          y: hero.y - 26,
          vx: Math.cos(a) * 1180,
          vy: Math.sin(a) * 1180,
          rotation: a,
          scaleX: 0.78,
          scaleY: 0.62,
          tint: i % 2 === 0 ? 0x34d399 : 0xe0f2fe,
          life: 0.38,
          delay: i * 0.035,
          darkHalo: true,
        });
      }
      return;
    }
    case 'garrick_s1': {
      // Vanguard Slam golden earth shock
      fx({
        tex: 'groundCrack',
        x: tx,
        y: ty,
        scaleX: 0.55,
        scaleY: 0.35,
        endScaleX: 1.35,
        endScaleY: 0.85,
        tint: 0xfacc15,
        alpha: 0.92,
        life: 0.62,
        darkHalo: true,
        groundLayer: true,
      });
      ctx.spawnRingWave(tx, ty, effectiveRadius, 0xfacc15, 0.48);
      return;
    }
    case 'garrick_s2':
    case 'draven_s2':
    case 'titus_s2': {
      // Protective Dome / Shield Aura
      fx({
        tex: 'hexDome',
        x: hero.x,
        y: hero.y - 28,
        scaleX: 0.55,
        scaleY: 0.45,
        endScaleX: 1.55,
        endScaleY: 1.2,
        tint: color,
        alpha: 0.86,
        life: 0.65,
        darkHalo: true,
      });
      return;
    }
    case 'raze_s1': {
      // Cinder Hook glowing chain streak
      fx({
        tex: 'chainLink',
        x: hero.x,
        y: hero.y - 24,
        anchorX: 0,
        anchorY: 0.5,
        rotation: angle,
        scaleX: 0.15,
        scaleY: 0.55,
        endScaleX: Math.max(0.7, skill.range / 240),
        endScaleY: 0.55,
        tint: 0xf97316,
        alpha: 0.98,
        life: 0.32,
        darkHalo: true,
      });
      return;
    }
    case 'raze_s2': {
      // Blazing Cyclone spinning fire-chain arcs
      for (let i = 0; i < 4; i++) {
        fx({
          tex: 'crescentSlash',
          x: hero.x,
          y: hero.y - 18,
          rotation: (i * Math.PI) / 2,
          spin: 5.5,
          scaleX: 0.95,
          scaleY: 0.65,
          endScaleX: 1.45,
          endScaleY: 0.95,
          tint: i % 2 === 0 ? 0xef4444 : 0xf97316,
          alpha: 0.95,
          life: 0.44,
          delay: i * 0.06,
          darkHalo: true,
        });
      }
      return;
    }
    case 'orion_s2': {
      // Twin parallel railgun beams + electric crackle
      const px = -Math.sin(angle) * 14;
      const py = Math.cos(angle) * 14;
      const ex = hero.x + Math.cos(angle) * skill.range;
      const ey = hero.y + Math.sin(angle) * skill.range;
      ctx.spawnBeam(hero.x + px, hero.y - 26 + py, ex + px, ey - 26 + py, 0x38e8ff, 14);
      ctx.spawnBeam(hero.x - px, hero.y - 26 - py, ex - px, ey - 26 - py, 0x60a5fa, 14);
      fx({
        tex: 'lightningBolt',
        x: (hero.x + ex) * 0.5,
        y: (hero.y + ey) * 0.5 - 24,
        rotation: angle,
        scaleX: 1.4,
        scaleY: 0.7,
        tint: 0xe0f2fe,
        life: 0.28,
        darkHalo: true,
      });
      return;
    }
    case 'malakhia_s1': {
      // Shattered Halo Cleave: blazing crimson-gold chained slash arc + magma explosion
      ctx.spawnSlashArc(hero.x + Math.cos(angle) * 28, hero.y - 24, angle, effectiveRadius * 1.05, 0xff3355);
      ctx.spawnSlashArc(hero.x + Math.cos(angle) * 34, hero.y - 24, angle + 0.14, effectiveRadius * 0.85, 0xfbbf24);
      fx({
        tex: 'chainLink',
        x: hero.x + Math.cos(angle) * 64,
        y: hero.y - 20 + Math.sin(angle) * 40,
        rotation: angle,
        scaleX: 1.15,
        scaleY: 0.6,
        endScaleX: 1.45,
        endScaleY: 0.28,
        tint: 0xfbbf24,
        life: 0.38,
      });
      ctx.spawnBurst(tx, ty - 22, 0xff3355, 16, 48);
      return;
    }
    case 'malakhia_s2': {
      // Sanctuary of Cinders: molten gold protective seal + crimson barrier halo
      fx({
        tex: 'magicCircle',
        x: hero.x,
        y: hero.y,
        spin: 1.6,
        scaleX: 0.8,
        scaleY: 0.5,
        endScaleX: 1.95,
        endScaleY: 1.22,
        tint: 0xfbbf24,
        alpha: 0.95,
        life: 0.72,
        groundLayer: true,
      });
      fx({
        tex: 'hexDome',
        x: hero.x,
        y: hero.y - 28,
        scaleX: 0.55,
        endScaleX: 1.45,
        tint: 0xff3355,
        alpha: 0.75,
        life: 0.58,
      });
      ctx.spawnRingWave(hero.x, hero.y, effectiveRadius, 0xfbbf24, 0.55);
      return;
    }
    case 'sylvaris_s1': {
      // Briar Star-Bind: converging emerald magic seal + swirling forest petals
      fx({
        tex: 'magicCircle',
        x: tx,
        y: ty,
        spin: -2.2,
        scaleX: 1.55,
        scaleY: 0.96,
        endScaleX: 0.42,
        endScaleY: 0.26,
        tint: 0x34d399,
        alpha: 0.96,
        life: 0.54,
        groundLayer: true,
      });
      for (let i = 0; i < 10; i++) {
        const a = (i * Math.PI * 2) / 10;
        fx({
          tex: 'petalLeaf',
          x: tx + Math.cos(a) * effectiveRadius * 0.55,
          y: ty + Math.sin(a) * effectiveRadius * 0.35,
          vx: -Math.cos(a) * 120,
          vy: -Math.sin(a) * 75 - 35,
          spin: 4.5,
          scaleX: 0.36,
          endScaleX: 0.12,
          tint: i % 2 === 0 ? 0x34d399 : 0xfde047,
          life: 0.52,
        });
      }
      ctx.spawnRingWave(tx, ty, effectiveRadius, 0x34d399, 0.48);
      return;
    }
    case 'sylvaris_s2': {
      // Moonspore Tempest: 4 cascading glowing jade bursts + emerald starburst
      for (let i = 0; i < 4; i++) {
        const a = (i * Math.PI * 2) / 4;
        const sx = tx + Math.cos(a) * 44;
        const sy = ty + Math.sin(a) * 28;
        fx({
          tex: 'explosionNova',
          x: sx,
          y: sy - 18,
          spin: 1.8,
          scaleX: 0.28,
          endScaleX: 0.92,
          tint: i % 2 === 0 ? 0x34d399 : 0xa7f3d0,
          alpha: 0.88,
          life: 0.42,
          delay: i * 0.08,
          additive: true,
        });
      }
      ctx.spawnRingWave(tx, ty, effectiveRadius, 0xa7f3d0, 0.52);
      return;
    }
    case 'astraea_s1': {
      // Astral Convergence: golden-prismatic gravity seal + converging starlight blades
      fx({
        tex: 'magicCircle',
        x: tx,
        y: ty,
        spin: -2.4,
        scaleX: 1.55,
        scaleY: 0.96,
        endScaleX: 0.45,
        endScaleY: 0.28,
        tint: 0xe879f9,
        alpha: 0.96,
        life: 0.52,
        darkHalo: true,
        groundLayer: true,
      });
      ctx.spawnRingWave(tx, ty, effectiveRadius, 0xfde047, 0.46);
      ctx.spawnBurst(tx, ty - 24, 0x38e8ff, 16, 56);
      return;
    }
    case 'astraea_s2': {
      // Prismatic Judgment: 6 cascading sky-lances of gold/cyan/fuchsia
      const cols = [0xfde047, 0x38e8ff, 0xe879f9];
      for (let i = 0; i < 6; i++) {
        const a = (i * Math.PI * 2) / 6;
        const px = tx + Math.cos(a) * (effectiveRadius * 0.42);
        const py = ty + Math.sin(a) * (effectiveRadius * 0.28);
        ctx.spawnSkyPillar(px, py, 56, cols[i % 3], false);
      }
      ctx.spawnRingWave(tx, ty, effectiveRadius, 0xe879f9, 0.5);
      return;
    }
    case 'vespera_s1': {
      // Scorch Railshot: blistering molten sniper beam + ember trail
      const ex = hero.x + Math.cos(angle) * skill.range;
      const ey = hero.y + Math.sin(angle) * skill.range;
      ctx.spawnBeam(hero.x, hero.y - 26, ex, ey - 26, 0xff4d2e, 26);
      ctx.spawnBeam(hero.x, hero.y - 26, ex, ey - 26, 0xfef08a, 10);
      ctx.spawnBurst(tx, ty - 20, 0xf97316, 14, 42);
      return;
    }
    case 'vespera_s2': {
      // Ember Cluster Barrage: 5 fiery mortar explosions + scorch ring
      for (let i = 0; i < 5; i++) {
        const a = (i * Math.PI * 2) / 5;
        const mx = tx + Math.cos(a) * (effectiveRadius * 0.46);
        const my = ty + Math.sin(a) * (effectiveRadius * 0.3);
        fx({
          tex: 'fireWisp',
          x: mx,
          y: my - 16,
          vy: -85,
          scaleX: 0.72,
          endScaleX: 0.14,
          tint: i % 2 === 0 ? 0xff4d2e : 0xfde047,
          life: 0.48,
          delay: i * 0.06,
          darkHalo: true,
        });
      }
      ctx.spawnRingWave(tx, ty, effectiveRadius, 0xff4d2e, 0.5);
      return;
    }
    case 'kael_s1': {
      // Piercing Gale razor wind lance
      fx({
        tex: 'arrowStreak',
        x: hero.x,
        y: hero.y - 24,
        vx: Math.cos(angle) * 1350,
        vy: Math.sin(angle) * 1350,
        rotation: angle,
        scaleX: 1.15,
        scaleY: 0.85,
        tint: 0x4ade80,
        life: 0.34,
        darkHalo: true,
      });
      return;
    }
    case 'kael_s2': {
      // Backstep Volley: 5 fanned wind arrows
      for (let i = 0; i < 5; i++) {
        const a = angle + (i - 2) * 0.16;
        fx({
          tex: 'arrowStreak',
          x: hero.x,
          y: hero.y - 24,
          vx: Math.cos(a) * 1120,
          vy: Math.sin(a) * 1120,
          rotation: a,
          scaleX: 0.72,
          scaleY: 0.52,
          tint: 0x22c55e,
          life: 0.32,
          darkHalo: true,
        });
      }
      return;
    }
    case 'ignis_s1':
    case 'ignis_s2':
    case 'nyx_s1':
    case 'nyx_s2': {
      // Molten fire bloom + dark smoke puffs
      for (let i = 0; i < 8; i++) {
        const a = (i * Math.PI * 2) / 8;
        fx({
          tex: 'fireWisp',
          x: tx,
          y: ty - 14,
          vx: Math.cos(a) * 115,
          vy: Math.sin(a) * 75 - 85,
          scaleX: 0.55,
          endScaleX: 0.12,
          tint: i % 2 === 0 ? 0xfb7185 : 0xf97316,
          life: 0.46,
          darkHalo: true,
        });
      }
      fx({
        tex: 'smokePuff',
        x: tx,
        y: ty - 18,
        vy: -35,
        scaleX: 0.55,
        endScaleX: 1.25,
        tint: 0x292524,
        alpha: 0.55,
        life: 0.52,
      });
      ctx.spawnRingWave(tx, ty, effectiveRadius * 0.9, 0xfb7185, 0.45);
      return;
    }
    case 'titus_s1': {
      // Prism Bash cone of crystal shards
      ctx.spawnSlashArc(hero.x + Math.cos(angle) * 24, hero.y - 22, angle, effectiveRadius, 0x818cf8);
      for (let i = 0; i < 5; i++) {
        const a = angle + (i - 2) * 0.24;
        fx({
          tex: 'iceCrystal',
          x: hero.x + Math.cos(a) * 55,
          y: hero.y - 22 + Math.sin(a) * 40,
          vx: Math.cos(a) * 140,
          vy: Math.sin(a) * 90,
          rotation: a + Math.PI / 2,
          scaleX: 0.42,
          endScaleX: 0.14,
          tint: 0xa5b4fc,
          life: 0.36,
          darkHalo: true,
        });
      }
      return;
    }
    case 'aurelia_s1':
    case 'aurelia_s2':
    case 'clara_s1':
    case 'clara_s2':
    case 'lyra_s1': {
      // Soft golden/emerald healing petals & radiant halo
      ctx.spawnRingWave(tx, ty, effectiveRadius, color, 0.52);
      for (let i = 0; i < 10; i++) {
        const a = (i * Math.PI * 2) / 10;
        fx({
          tex: 'petalLeaf',
          x: tx + Math.cos(a) * (effectiveRadius * 0.45),
          y: ty + Math.sin(a) * (effectiveRadius * 0.28),
          vy: -75 - Math.random() * 50,
          spin: (Math.random() - 0.5) * 5,
          scaleX: 0.34,
          endScaleX: 0.1,
          tint: i % 2 === 0 ? 0xffffff : color,
          life: 0.62,
          darkHalo: true,
        });
      }
      return;
    }
    default: {
      // Clean fallback for any remaining skills
      if (skill.aimType === 'LINE') {
        ctx.spawnBeam(
          hero.x,
          hero.y - 24,
          hero.x + Math.cos(angle) * skill.range,
          hero.y + Math.sin(angle) * skill.range - 24,
          color,
          20,
        );
      } else if (skill.aimType === 'CONE') {
        ctx.spawnSlashArc(hero.x, hero.y - 22, angle, Math.max(105, effectiveRadius), color);
      } else {
        ctx.spawnSkyPillar(tx, ty, Math.max(76, effectiveRadius * 0.65), color, false);
        ctx.spawnRingWave(tx, ty, Math.max(105, effectiveRadius), color, 0.52);
      }
    }
  }
}
