import fs from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';

/**
 * High-precision white-background alpha keyer for 1:1 RPG UI icons (`public/assets/icons/`).
 * - Border-seeded BFS flood-fill cleanly strips exterior pure/near-white background.
 * - Ultra-strict pure digital-white (#FDFDFD–#FFFFFF) pocket cleanup removes enclosed white gaps
 *   (e.g. inside crossed sword rings / orbiting summon rings) while keeping shaded white marble,
 *   clouds, and specular sword gleams 100% solid.
 * - Smooth 1px anti-halo edge feathering + centered optical normalization onto 256x256 transparent WebP.
 */
async function convertIconToTransparentWebp(srcPath, destPath, size = 256) {
  const workSize = 512;
  const inputBuf = fs.readFileSync(srcPath);

  const { data, info } = await sharp(inputBuf)
    .resize(workSize, workSize, {
      fit: 'contain',
      background: { r: 255, g: 255, b: 255, alpha: 1 },
    })
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
    return min > 232 && max - min < 26;
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

  // 2. Clean enclosed flat pure-white background gaps (only on non-circular icons like summon/forge/relic/battle)
  const baseName = path.basename(srcPath).toLowerCase();
  const allowEnclosedPockets =
    baseName.includes('summon') ||
    baseName.includes('forge') ||
    baseName.includes('relic') ||
    baseName.includes('battle');

  if (allowEnclosedPockets) {
    const minPocket = Math.round(workSize * workSize * 0.0012);
    for (let i = 0; i < w * h; i++) {
      if (bgMask[i]) continue;
      const o = i * 4;
      const r = px[o];
      const g = px[o + 1];
      const b = px[o + 2];
      const max = Math.max(r, g, b);
      const min = Math.min(r, g, b);
      if (min >= 253 && max - min <= 2) {
        const pocket = [];
        const q = [i];
        const seen = new Set([i]);
        while (q.length > 0 && pocket.length < 35000) {
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
  }

  // 3. Apply alpha + smooth 1px edge anti-halo feathering
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
      if (lum > 186) {
        const scale = Math.max(0.1, 1 - ((lum - 176) / 84) * (bgN / 5.2));
        px[o + 3] = Math.round(255 * scale);
      }
    }
  }

  // 4. Trim excess transparent margin & fit cleanly onto 256x256 with subtle breathing padding
  const innerSize = size - 12;
  const trimmedBuf = await sharp(px, { raw: { width: w, height: h, channels: 4 } })
    .trim({ threshold: 10 })
    .resize(innerSize, innerSize, {
      fit: 'contain',
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    })
    .extend({
      top: 6,
      bottom: 6,
      left: 6,
      right: 6,
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    })
    .webp({ quality: 94, alphaQuality: 100 })
    .toBuffer();

  fs.writeFileSync(destPath, trimmedBuf);
  console.log(`✓ ${path.basename(destPath)} (${Math.round(trimmedBuf.length / 1024)} KB)`);
}

const iconDir = path.resolve('public/assets/icons');
let converted = 0;
for (const file of fs.readdirSync(iconDir).sort()) {
  if (!/\.(jpg|jpeg|png)$/i.test(file)) continue;
  const src = path.join(iconDir, file);
  const dest = path.join(iconDir, file.replace(/\.(jpg|jpeg|png)$/i, '.webp'));
  await convertIconToTransparentWebp(src, dest, 256);
  fs.unlinkSync(src);
  converted++;
}
console.log(`\nConverted ${converted} RPG icon(s) to crisp 256x256 transparent WebP!`);
