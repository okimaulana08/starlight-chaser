import { Assets, Container, Graphics, RenderTexture, Renderer, Sprite, Texture } from 'pixi.js';
import { FACTIONS } from '../data/factions';
import { HERO_MAP } from '../data/heroes';
import { RELIC_MAP } from '../data/relics';
import type { EnemyDef, HeroDef, Role } from '../types/game';

/**
 * AssetManager loads real .webp artwork and transparent full-body battle sprites
 * from /public/assets/ with clean, high-craft fallbacks (zero boxy/pawn silhouettes!).
 */

const textureCache = new Map<string, Texture>();
const failedUrls = new Set<string>();
const svgFallbackCache = new Map<string, string>();

export function releaseCombatTextures(): void {
  for (const [key, tex] of textureCache.entries()) {
    if (key.startsWith('proc_')) {
      tex.destroy(true);
      textureCache.delete(key);
    }
  }
}

export async function tryLoadPixiTexture(url: string): Promise<Texture | null> {
  if (!url || failedUrls.has(url)) return null;
  if (textureCache.has(url)) return textureCache.get(url)!;
  try {
    const tex = await Assets.load<Texture>(url);
    if (tex) {
      textureCache.set(url, tex);
      return tex;
    }
  } catch {
    failedUrls.add(url);
  }
  return null;
}

function hexStringToNumber(hex: string): number {
  return parseInt(hex.replace('#', ''), 16) || 0xffffff;
}

/**
 * Minimal invisible/glowing base texture used until either:
 * 1. The hero's real full-body transparent sprite (`public/assets/sprites/battle_<id>.webp`) loads, OR
 * 2. The sleek vertical 2.5D Anime Hero Standee (`attachHeroPortraitCrest`) renders cleanly above the shadow.
 */
export function getProceduralHeroTexture(renderer: Renderer, hero: HeroDef): Texture {
  const key = `proc_hero_${hero.id}`;
  if (textureCache.has(key)) return textureCache.get(key)!;

  // Transparent anchor placeholder (the crisp standee frame renders in fallbackCrestGroup!)
  const g = new Graphics();
  const factionHex = FACTIONS[hero.faction].accentHex;
  g.ellipse(64, 118, 28, 8).fill({ color: factionHex, alpha: 0.18 });

  const rt = RenderTexture.create({ width: 128, height: 128, resolution: 1 });
  renderer.render({ container: g, target: rt });
  g.destroy();
  textureCache.set(key, rt);
  return rt;
}

/**
 * Renders a sleek 2.5D vertical chamfered Anime Hero Standee using the hero's REAL anime artwork
 * (zero chess-pawn skirt, zero boxy vector shapes!) whenever a dedicated full-body cutout sprite
 * (`public/assets/sprites/battle_<id>.webp`) has not been supplied yet.
 */
export function attachHeroPortraitCrest(container: Container, hero: HeroDef): Sprite {
  const tierHex =
    hero.tier === 'UR'
      ? 0xe879f9
      : hero.tier === 'SSR'
        ? 0xf5c84c
        : hero.tier === 'SR'
          ? 0xc084fc
          : 0x38bdf8;
  const themeHex = hexStringToNumber(hero.themeColor);

  const w = 68;
  const h = 92;
  const topY = -102;
  const cut = 12;

  // Sleek tapered anime shield-crest standee silhouette (pointed bottom anchoring onto magic ring!)
  const crestPoly = [
    -w / 2 + cut,
    topY,
    w / 2 - cut,
    topY,
    w / 2,
    topY + cut,
    w / 2,
    topY + h - 18,
    0,
    topY + h + 4,
    -w / 2,
    topY + h - 18,
    -w / 2,
    topY + cut,
  ];

  // Outer drop glow + metallic backing
  const backing = new Graphics();
  backing
    .poly(crestPoly)
    .fill({ color: 0x090e20 })
    .stroke({ color: 0x050712, width: 5 });
  container.addChild(backing);

  const portrait = new Sprite();
  portrait.anchor.set(0.5, 0.32);
  portrait.position.set(0, topY + h * 0.44);
  portrait.visible = false;

  const mask = new Graphics();
  mask.poly(crestPoly).fill({ color: 0xffffff });
  container.addChild(mask);
  container.addChild(portrait);
  portrait.mask = mask;

  // Crisp double-beveled gilded RPG frame + bottom faction gem
  const rim = new Graphics();
  rim.poly(crestPoly).stroke({ color: tierHex, width: 3 });
  rim
    .poly([0, topY + h - 4, 6, topY + h + 4, 0, topY + h + 12, -6, topY + h + 4])
    .fill({ color: themeHex })
    .stroke({ color: 0xffffff, width: 1.5 });
  container.addChild(rim);

  tryLoadPixiTexture(hero.assets.card).then((tex) => {
    if (!tex || portrait.destroyed) return;
    portrait.texture = tex;
    const scale = Math.max((w + 8) / tex.width, (h + 8) / tex.height);
    portrait.scale.set(scale);
    portrait.visible = true;
  });

  return portrait;
}

/**
 * Invisible/minimal placeholder weapon node (real anime artwork already shows each hero's weapon,
 * and combat attacks unleash dramatic PixiJS additive slash arcs, beams, and impact shockwaves!).
 */
export function buildHeroWeaponGraphic(_role: Role, _themeColorHex: string): Graphics {
  const g = new Graphics();
  g.visible = false;
  return g;
}

export function getProceduralEnemyTexture(renderer: Renderer, enemy: EnemyDef): Texture {
  const key = `proc_enemy_${enemy.id}`;
  if (textureCache.has(key)) return textureCache.get(key)!;

  const size = enemy.isBoss ? 256 : 128;
  const cx = size / 2;
  const g = new Graphics();
  const color = hexStringToNumber(enemy.themeColor);
  g.ellipse(cx, size - 16, size * 0.28, size * 0.09).fill({ color: 0x05020a, alpha: 0.45 });
  g.circle(cx, size * 0.55, size * 0.24)
    .fill({ color: 0x1e1b4b })
    .stroke({ color, width: 3 });

  const rt = RenderTexture.create({ width: size, height: size, resolution: 1 });
  renderer.render({ container: g, target: rt });
  g.destroy();
  textureCache.set(key, rt);
  return rt;
}

export function getFallbackCardSvg(kind: 'HERO' | 'RELIC' | 'ENEMY', id: string): string {
  const key = `${kind}_${id}`;
  if (svgFallbackCache.has(key)) return svgFallbackCache.get(key)!;

  let primary = '#f5c84c';
  let secondary = '#1e1b4b';
  let emblem = '★';
  let initial = id.slice(0, 2).toUpperCase();

  if (kind === 'HERO' && HERO_MAP[id]) {
    const h = HERO_MAP[id];
    primary = h.themeColor;
    secondary = FACTIONS[h.faction].color;
    initial = h.name.slice(0, 1).toUpperCase();
    emblem =
      h.role === 'TANK'
        ? '⛨'
        : h.role === 'ASSAULT'
          ? '⚔'
          : h.role === 'RANGER'
            ? '➶'
            : h.role === 'MAGE'
              ? '✦'
              : '✚';
  } else if (kind === 'RELIC' && RELIC_MAP[id]) {
    const r = RELIC_MAP[id];
    primary = r.tier === 'SSR' ? '#f5c84c' : r.tier === 'SR' ? '#c084fc' : '#38bdf8';
    secondary = '#1e293b';
    emblem = '◈';
    initial = r.name.slice(0, 1).toUpperCase();
  } else {
    primary = '#d946ef';
    secondary = '#3b0764';
    emblem = '☠';
  }

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 300 400">
    <defs>
      <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stop-color="#0b1026"/>
        <stop offset="55%" stop-color="${secondary}" stop-opacity="0.42"/>
        <stop offset="100%" stop-color="#070913"/>
      </linearGradient>
    </defs>
    <rect width="300" height="400" fill="url(#bg)"/>
    <circle cx="150" cy="155" r="46" fill="#131c38" stroke="${primary}" stroke-width="3"/>
    <text x="150" y="172" text-anchor="middle" font-family="Georgia,serif" font-size="48" fill="${primary}">${emblem}</text>
    <text x="260" y="378" text-anchor="end" font-family="Georgia,serif" font-size="72" font-weight="bold" fill="${primary}" opacity="0.14">${initial}</text>
  </svg>`;

  const uri = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
  svgFallbackCache.set(key, uri);
  return uri;
}
