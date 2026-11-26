import fs from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';

const targets = [
  'public/assets/enemies/enemy_armored_golem.webp',
  'public/assets/enemies/enemy_rift_acolyte.webp',
];

for (const rel of targets) {
  const abs = path.resolve(rel);
  const inputBuf = fs.readFileSync(abs);
  const buf = await sharp(inputBuf).flop().webp({ quality: 92, alphaQuality: 100 }).toBuffer();
  fs.writeFileSync(abs, buf);
  console.log(`✓ Flipped horizontally (now facing LEFT): ${rel}`);
}
