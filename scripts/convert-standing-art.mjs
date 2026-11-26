import fs from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';

/**
 * High-precision transparent cutout converter for full-body 3:4 Lobby & MVP Standing Anime Art
 * generated on solid #FFFFFF background (e.g. Kling Image 4.0).
 * Preserves cel-shaded white/silver armor & hair protected by dark anime linework,
 * keys exterior pure-white backdrop + interior pure-white gaps (between boots/cape/arms),
 * applies smooth anti-aliased edge feathering, and outputs crisp 768x1024 WebP.
 *
 * Usage:
 *   node scripts/convert-standing-art.mjs <srcPath> <destRelWebp> [width=768] [height=1024]
 */
export async function convertStandingToTransparentWebp(
  srcPath,
  destRelWebp,
  outW = 768,
  outH = 1024,
) {
  const dest = path.resolve(destRelWebp);
  fs.mkdirSync(path.dirname(dest), { recursive: true });

  const inputBuf = fs.readFileSync(srcPath);
  const { data, info } = await sharp(inputBuf)
    .resize(outW, outH, { fit: 'contain', background: { r: 255, g: 255, b: 255, alpha: 1 } })
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  const w = info.width;
  const h = info.height;
  const px = new Uint8Array(data);
  const visited = new Uint8Array(w * h);
  const bgMask = new Uint8Array(w * h);

  // Exterior near-white tolerance (also gently captures ultra-pale anti-aliased white fringe)
  const isNearWhite = (idx) => {
    const o = idx * 4;
    const r = px[o];
    const g = px[o + 1];
    const b = px[o + 2];
    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    return min >= 238 && max - min <= 20;
  };

  // 1. Border-seeded BFS flood-fill for exterior white backdrop
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

  // 2. Clean enclosed pure digital-white (#FAFAFA-#FFFFFF) cutouts (gaps between boots, legs, cape, arm)
  // Strict threshold (min >= 252, chroma <= 4) preserves shaded white armor & silver hair!
  const minPocket = Math.round(w * h * 0.00018);
  const pocketChecked = new Uint8Array(w * h);
  for (let i = 0; i < w * h; i++) {
    if (bgMask[i] || pocketChecked[i]) continue;
    const o = i * 4;
    const r = px[o];
    const g = px[o + 1];
    const b = px[o + 2];
    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    if (min >= 252 && max - min <= 4) {
      const pocket = [];
      const q = [i];
      pocketChecked[i] = 1;
      while (q.length > 0 && pocket.length < 120000) {
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
          if (n < 0 || bgMask[n] || pocketChecked[n]) continue;
          const no = n * 4;
          const nr = px[no];
          const ng = px[no + 1];
          const nb = px[no + 2];
          if (Math.min(nr, ng, nb) >= 247 && Math.max(nr, ng, nb) - Math.min(nr, ng, nb) <= 8) {
            pocketChecked[n] = 1;
            q.push(n);
          }
        }
      }
      if (pocket.length >= minPocket) {
        for (const pIdx of pocket) bgMask[pIdx] = 1;
      }
    }
  }

  // 3. Apply alpha + smooth 2px anti-aliased edge de-fringing (removes white halo around dark outlines & glowing blades)
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
      const r = px[o];
      const g = px[o + 1];
      const b = px[o + 2];
      const lum = (r + g + b) / 3;
      const sat = Math.max(r, g, b) - Math.min(r, g, b);
      // Softly feather bright low-saturation halo pixels adjacent to background
      if (lum > 185 && sat < 45) {
        const alphaScale = Math.max(0.08, 1 - ((lum - 175) / 82) * (bgN / 4.8));
        px[o + 3] = Math.round(255 * alphaScale);
      } else if (lum > 225 && sat < 85) {
        // Soft pastel glow fringe (e.g., pink/gold blade outer glow on white): convert to translucent colored glow
        const alphaScale = Math.max(0.25, 1 - ((lum - 215) / 45) * (bgN / 5.5));
        px[o + 3] = Math.round(255 * alphaScale);
      }
    }
  }

  // Trim excess empty margin & anchor feet cleanly near bottom with subtle breathing room
  const trimmed = await sharp(px, { raw: { width: w, height: h, channels: 4 } })
    .trim({ threshold: 10 })
    .png()
    .toBuffer();

  await sharp(trimmed)
    .resize(outW - 24, outH - 28, {
      fit: 'inside',
      withoutEnlargement: false,
    })
    .extend({
      top: 16,
      bottom: 12,
      left: 12,
      right: 12,
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    })
    .webp({ quality: 92, alphaQuality: 100 })
    .toFile(dest);

  const meta = await sharp(dest).metadata();
  const stat = fs.statSync(dest);
  console.log(
    `✓ Transparent Standing Cutout -> ${destRelWebp} (${meta.width}x${meta.height}, ${Math.round(stat.size / 1024)} KB)`,
  );
}

if (process.argv[1]?.endsWith('convert-standing-art.mjs')) {
  const src = process.argv[2];
  const dest = process.argv[3];
  if (!src || !dest) {
    console.error('Usage: node scripts/convert-standing-art.mjs <srcPath> <destRelWebp>');
    process.exit(1);
  }
  await convertStandingToTransparentWebp(
    src,
    dest,
    parseInt(process.argv[4] || '768', 10),
    parseInt(process.argv[5] || '1024', 10),
  );
}
