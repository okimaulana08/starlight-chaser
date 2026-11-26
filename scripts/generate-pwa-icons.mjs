import fs from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';

/**
 * Generates crisp Starlight Chasers PWA app icons (192, 512, 512-maskable, 180 Apple Touch, 64 favicon)
 * combining Vaelen's real anime portrait with a gilded celestial border emblem.
 */
const OUT_DIR = path.resolve('public/icons');
fs.mkdirSync(OUT_DIR, { recursive: true });

const srcArt = path.resolve('public/assets/heroes/hero_vaelen_card.webp');

async function buildIcon(size, filename, maskable = false) {
  const inset = maskable ? Math.round(size * 0.14) : 0;
  const innerSize = size - inset * 2;

  const portrait = await sharp(srcArt)
    .resize(innerSize, innerSize, { fit: 'cover', position: 'top' })
    .toBuffer();

  // Gilded diamond starlight frame overlay
  const frameSvg = Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
    <defs>
      <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stop-color="#fde68a"/>
        <stop offset="50%" stop-color="#f5c84c"/>
        <stop offset="100%" stop-color="#a855f7"/>
      </linearGradient>
    </defs>
    <rect x="${inset + 4}" y="${inset + 4}" width="${innerSize - 8}" height="${innerSize - 8}" rx="${Math.round(innerSize * 0.16)}" fill="none" stroke="url(#g)" stroke-width="${Math.max(4, Math.round(size * 0.032))}"/>
    <polygon points="${size * 0.5},${inset + size * 0.03} ${size * 0.5 + size * 0.055},${inset + size * 0.085} ${size * 0.5},${inset + size * 0.14} ${size * 0.5 - size * 0.055},${inset + size * 0.085}" fill="#fde047" stroke="#070913" stroke-width="${Math.max(2, Math.round(size * 0.01))}"/>
  </svg>`);

  const base = sharp({
    create: {
      width: size,
      height: size,
      channels: 4,
      background: { r: 7, g: 9, b: 19, alpha: 1 },
    },
  });

  await base
    .composite([
      { input: portrait, left: inset, top: inset },
      { input: frameSvg, left: 0, top: 0 },
    ])
    .png()
    .toFile(path.join(OUT_DIR, filename));

  console.log(`✓ public/icons/${filename} (${size}x${size}${maskable ? ' maskable' : ''})`);
}

await buildIcon(512, 'icon-512.png', false);
await buildIcon(512, 'icon-512-maskable.png', true);
await buildIcon(192, 'icon-192.png', false);
await buildIcon(180, 'apple-touch-icon.png', false);
await buildIcon(64, 'favicon.png', false);
