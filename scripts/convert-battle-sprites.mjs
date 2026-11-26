import fs from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';

/**
 * Reusable high-precision white-background alpha keyer for full-body 2.5D battle sprites!
 * Uses border-seeded BFS flood-fill + interior pure-white pocket cleanup + smooth anti-aliased edge feathering,
 * preserving internal white/cream armor & clothing protected by crisp dark anime linework.
 *
 * Usage:
 *   node scripts/convert-battle-sprites.mjs <srcPath> <destRelWebp> [size=512]
 */
export async function convertSpriteToTransparentWebp(srcPath, destRelWebp, size = 512) {
  const dest = path.resolve(destRelWebp);
  fs.mkdirSync(path.dirname(dest), { recursive: true });

  const { data, info } = await sharp(srcPath)
    .resize(size, size, { fit: 'contain', background: { r: 255, g: 255, b: 255, alpha: 1 } })
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
    return min > 230 && max - min < 28;
  };

  // 1. Border-seeded BFS flood-fill for exterior backdrop
  const queue = new Int32Array(w * h);
  let head = 0;
  let tail = 0;
  const seed = (x, y) => {
    const idx = y * w + x;
    if (!visited[idx] && isNearWhite(idx)) {
      visited[idx] = 1;
      bgMask[idx] = 1;
      queue[tail++] = idx;
    }
  };

  for (let x = 0; x < w; x++) {
    seed(x, 0);
    seed(x, h - 1);
  }
  for (let y = 0; y < h; y++) {
    seed(0, y);
    seed(w - 1, y);
  }

  while (head < tail) {
    const cur = queue[head++];
    const x = cur % w;
    const y = (cur - x) / w;
    if (x > 0) seed(x - 1, y);
    if (x < w - 1) seed(x + 1, y);
    if (y > 0) seed(x, y - 1);
    if (y < h - 1) seed(x, y + 1);
  }

  // 2. Clean large pure digital-white (#FCFCFC-#FFFFFF) enclosed cutouts (e.g., between legs/bowstrings)
  // Using strict min >= 252 & chroma <= 3 preserves shaded cel-anime white armor & cloaks!
  const minPocket = Math.round((size * size) * 0.00085);
  for (let i = 0; i < w * h; i++) {
    if (bgMask[i]) continue;
    const o = i * 4;
    const r = px[o];
    const g = px[o + 1];
    const b = px[o + 2];
    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    if (min >= 252 && max - min <= 3) {
      const pocket = [];
      const q = [i];
      const seen = new Set([i]);
      while (q.length > 0 && pocket.length < 30000) {
        const idx = q.pop();
        pocket.push(idx);
        const x = idx % w;
        const y = (idx - x) / w;
        const ns = [
          x > 0 ? idx - 1 : -1,
          x < w - 1 ? idx + 1 : -1,
          y > 0 ? idx - w : -1,
          y < h - 1 ? idx + w : -1,
        ];
        for (const n of ns) {
          if (n < 0 || bgMask[n] || seen.has(n)) continue;
          const no = n * 4;
          const nr = px[no];
          const ng = px[no + 1];
          const nb = px[no + 2];
          if (Math.min(nr, ng, nb) >= 249 && Math.max(nr, ng, nb) - Math.min(nr, ng, nb) <= 6) {
            seen.add(n);
            q.push(n);
          }
        }
      }
      if (pocket.length >= minPocket) {
        for (const pIdx of pocket) bgMask[pIdx] = 1;
      }
    }
  }

  // 3. Apply alpha + smooth 1px edge fringe feathering
  for (let i = 0; i < w * h; i++) {
    const o = i * 4;
    if (bgMask[i]) {
      px[o + 3] = 0;
      continue;
    }
    const x = i % w;
    const y = (i - x) / w;
    let bgN = 0;
    for (let dy = -1; dy <= 1; dy++) {
      for (let dx = -1; dx <= 1; dx++) {
        const nx = x + dx;
        const ny = y + dy;
        if (nx >= 0 && nx < w && ny >= 0 && ny < h && bgMask[ny * w + nx]) bgN++;
      }
    }
    if (bgN > 0) {
      const lum = (px[o] + px[o + 1] + px[o + 2]) / 3;
      if (lum > 188) {
        const scale = Math.max(0.12, 1 - ((lum - 178) / 82) * (bgN / 5.5));
        px[o + 3] = Math.round(255 * scale);
      }
    }
  }

  // Trim excess empty transparent margin & pad slightly so feet sit consistently at the bottom!
  await sharp(px, { raw: { width: w, height: h, channels: 4 } })
    .trim({ threshold: 10 })
    .resize(size, size, {
      fit: 'contain',
      position: 'south',
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    })
    .webp({ quality: 92, alphaQuality: 100 })
    .toFile(dest);

  console.log(`✓ Transparent Battle Sprite -> ${destRelWebp} (${size}x${size})`);
}

// Batch mode: running `npm run convert-sprites` auto-converts all .jpg/.png files in
// public/assets/sprites/ and public/assets/enemies/ to transparent alpha WebP!
if (process.argv[1]?.endsWith('convert-battle-sprites.mjs')) {
  if (process.argv[2] && process.argv[3]) {
    await convertSpriteToTransparentWebp(
      process.argv[2],
      process.argv[3],
      parseInt(process.argv[4] || '512', 10),
    );
  } else {
    const folders = [
      { dir: 'public/assets/sprites', size: 512 },
      { dir: 'public/assets/enemies', size: 512 },
    ];
    let count = 0;
    for (const { dir, size } of folders) {
      const abs = path.resolve(dir);
      if (!fs.existsSync(abs)) continue;
      for (const file of fs.readdirSync(abs)) {
        if (!/\.(jpg|jpeg|png)$/i.test(file)) continue;
        const src = path.join(abs, file);
        const targetSize = file.includes('boss_') ? 1024 : size;
        const destRel = path.join(dir, file.replace(/\.(jpg|jpeg|png)$/i, '.webp'));
        await convertSpriteToTransparentWebp(src, destRel, targetSize);
        fs.unlinkSync(src);
        count++;
      }
    }
    console.log(
      count > 0
        ? `\nConverted & cleaned ${count} battle sprite(s) to transparent alpha WebP!`
        : 'No .jpg/.png sprites found in public/assets/sprites/ or public/assets/enemies/.',
    );
  }
}
