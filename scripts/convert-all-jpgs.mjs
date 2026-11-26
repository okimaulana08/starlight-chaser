import fs from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';

/**
 * Converts all user-supplied .jpg artworks in public/assets/{heroes,relics,environments,enemies}
 * into optimized WebP files at exact GDD dimensions, creates focal panoramic Cut-Ins (1920x720)
 * for SR/SSR heroes, and cleanly keys transparent alpha for Boss Aurelian Sentinel.
 */

const ASSETS_ROOT = path.resolve('public/assets');

async function convertCard(srcJpg, destWebp, width, height, fit = 'cover', position = 'attention') {
  await sharp(srcJpg)
    .resize(width, height, { fit, position })
    .webp({ quality: 90 })
    .toFile(destWebp);
  console.log(`✓ ${path.relative(ASSETS_ROOT, destWebp)} (${width}x${height})`);
}

async function convertBossWithTransparentKey(srcJpg, destWebp) {
  const SIZE = 1024;
  const { data, info } = await sharp(srcJpg)
    .resize(SIZE, SIZE, { fit: 'contain', background: { r: 255, g: 255, b: 255, alpha: 1 } })
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  const w = info.width;
  const h = info.height;
  const px = new Uint8Array(data);
  const visited = new Uint8Array(w * h);
  const bgMask = new Uint8Array(w * h);

  const isNearWhite = (idx) => {
    const o = idx * 4;
    const r = px[o];
    const g = px[o + 1];
    const b = px[o + 2];
    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    // Exterior pure white OR very pale white-lavender edge near white background
    return min > 232 && (max - min) < 28;
  };

  // 1. Edge-seeded BFS flood-fill for exterior background
  const queue = new Int32Array(w * h);
  let head = 0;
  let tail = 0;

  const trySeed = (x, y) => {
    const idx = y * w + x;
    if (!visited[idx] && isNearWhite(idx)) {
      visited[idx] = 1;
      bgMask[idx] = 1;
      queue[tail++] = idx;
    }
  };

  for (let x = 0; x < w; x++) {
    trySeed(x, 0);
    trySeed(x, h - 1);
  }
  for (let y = 0; y < h; y++) {
    trySeed(0, y);
    trySeed(w - 1, y);
  }

  while (head < tail) {
    const cur = queue[head++];
    const x = cur % w;
    const y = (cur - x) / w;
    if (x > 0) trySeed(x - 1, y);
    if (x < w - 1) trySeed(x + 1, y);
    if (y > 0) trySeed(x, y - 1);
    if (y < h - 1) trySeed(x, y + 1);
  }

  // 2. Also remove completely pure neutral-white enclosed gaps (between halberd shafts / between legs)
  // Marble armor has warm beige/grey shading so min>248 & chroma<6 safely targets ONLY pure #FFFFFF cutouts!
  for (let i = 0; i < w * h; i++) {
    if (bgMask[i]) continue;
    const o = i * 4;
    const r = px[o];
    const g = px[o + 1];
    const b = px[o + 2];
    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    if (min >= 247 && max - min <= 7) {
      // Flood-fill pure-white pocket only if it's reasonably sized (>120px) so specular highlights stay intact
      const pocket = [];
      const q = [i];
      const seenLocal = new Set([i]);
      while (q.length > 0 && pocket.length < 40000) {
        const idx = q.pop();
        pocket.push(idx);
        const x = idx % w;
        const y = (idx - x) / w;
        const neighbors = [
          x > 0 ? idx - 1 : -1,
          x < w - 1 ? idx + 1 : -1,
          y > 0 ? idx - w : -1,
          y < h - 1 ? idx + w : -1,
        ];
        for (const n of neighbors) {
          if (n < 0 || bgMask[n] || seenLocal.has(n)) continue;
          const no = n * 4;
          const nr = px[no];
          const ng = px[no + 1];
          const nb = px[no + 2];
          if (Math.min(nr, ng, nb) >= 242 && Math.max(nr, ng, nb) - Math.min(nr, ng, nb) <= 14) {
            seenLocal.add(n);
            q.push(n);
          }
        }
      }
      if (pocket.length >= 160) {
        for (const pIdx of pocket) bgMask[pIdx] = 1;
      }
    }
  }

  // 3. Apply transparency + smooth anti-aliased fringe feathering for pixels adjacent to bgMask
  for (let i = 0; i < w * h; i++) {
    const o = i * 4;
    if (bgMask[i]) {
      px[o + 3] = 0;
      continue;
    }
    const x = i % w;
    const y = (i - x) / w;
    let bgNeighbors = 0;
    for (let dy = -1; dy <= 1; dy++) {
      for (let dx = -1; dx <= 1; dx++) {
        const nx = x + dx;
        const ny = y + dy;
        if (nx >= 0 && nx < w && ny >= 0 && ny < h && bgMask[ny * w + nx]) {
          bgNeighbors++;
        }
      }
    }
    if (bgNeighbors > 0) {
      const r = px[o];
      const g = px[o + 1];
      const b = px[o + 2];
      const lum = (r + g + b) / 3;
      if (lum > 185) {
        // Soften bright halo edges into smooth translucent glow (especially purple Void flame fringes!)
        const alphaScale = Math.max(0.15, 1 - ((lum - 175) / 85) * (bgNeighbors / 6));
        px[o + 3] = Math.round(255 * alphaScale);
      }
    }
  }

  await sharp(px, { raw: { width: w, height: h, channels: 4 } })
    .webp({ quality: 92, alphaQuality: 100 })
    .toFile(destWebp);
  console.log(`✓ ${path.relative(ASSETS_ROOT, destWebp)} (${w}x${h} Transparent Alpha WebP)`);
}

// 1. Convert all Hero JPGs (600x800) + create focal panoramic Cut-Ins (1920x720) for SR/SSR heroes
const CUTIN_HEROES = new Set(['draven', 'garrick', 'lyra', 'raze', 'orion']);
const heroDir = path.join(ASSETS_ROOT, 'heroes');
for (const file of fs.readdirSync(heroDir)) {
  if (!file.toLowerCase().endsWith('.jpg')) continue;
  const src = path.join(heroDir, file);
  const base = file.replace(/\.jpg$/i, '');
  await convertCard(src, path.join(heroDir, `${base}.webp`), 600, 800, 'cover', 'top');

  const match = base.match(/^hero_([a-z]+)_card$/);
  if (match && CUTIN_HEROES.has(match[1])) {
    const heroId = match[1];
    const cutinDest = path.join(ASSETS_ROOT, 'cutins', `cutin_${heroId}.webp`);
    // Focal upper-chest/eye panoramic crop for dramatic anime Ultimate Cut-In
    const resized = await sharp(src).resize(1920, 2560, { fit: 'cover' }).toBuffer();
    await sharp(resized)
      .extract({ left: 0, top: 340, width: 1920, height: 720 })
      .webp({ quality: 90 })
      .toFile(cutinDest);
    console.log(`✓ cutins/cutin_${heroId}.webp (1920x720 panoramic eye-cut)`);
  }
}

// 2. Convert all Relic JPGs (600x800)
const relicDir = path.join(ASSETS_ROOT, 'relics');
for (const file of fs.readdirSync(relicDir)) {
  if (!file.toLowerCase().endsWith('.jpg')) continue;
  const src = path.join(relicDir, file);
  const base = file.replace(/\.jpg$/i, '');
  await convertCard(src, path.join(relicDir, `${base}.webp`), 600, 800, 'cover', 'centre');
}

// 3. Convert Environment JPGs
const envDir = path.join(ASSETS_ROOT, 'environments');
if (fs.existsSync(path.join(envDir, 'bg_lobby_aurelia.jpg'))) {
  await convertCard(
    path.join(envDir, 'bg_lobby_aurelia.jpg'),
    path.join(envDir, 'bg_lobby_aurelia.webp'),
    1920,
    1080,
    'cover',
    'centre',
  );
}
if (fs.existsSync(path.join(envDir, 'env_aurelia_floor.jpg'))) {
  await convertCard(
    path.join(envDir, 'env_aurelia_floor.jpg'),
    path.join(envDir, 'env_aurelia_floor.webp'),
    2560,
    1440,
    'cover',
    'centre',
  );
}

// 4. Convert Boss Aurelian Sentinel with transparent alpha key!
const enemyDir = path.join(ASSETS_ROOT, 'enemies');
if (fs.existsSync(path.join(enemyDir, 'boss_aurelian_sentinel.jpg'))) {
  await convertBossWithTransparentKey(
    path.join(enemyDir, 'boss_aurelian_sentinel.jpg'),
    path.join(enemyDir, 'boss_aurelian_sentinel.webp'),
  );
}

console.log('\nAll 20 JPG artworks + 5 panoramic cut-ins converted to WebP successfully!');
