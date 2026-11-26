import fs from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';

/**
 * Usage: node scripts/convert-webp.mjs <srcPath> <destRelPath> <width> <height>
 */
const [, , srcPath, destRelPath, widthStr, heightStr] = process.argv;
if (!srcPath || !destRelPath) {
  console.error('Usage: node scripts/convert-webp.mjs <src> <destRel> <w> <h>');
  process.exit(1);
}

const destPath = path.resolve(destRelPath);
fs.mkdirSync(path.dirname(destPath), { recursive: true });

const width = parseInt(widthStr || '600', 10);
const height = parseInt(heightStr || '800', 10);

await sharp(srcPath)
  .resize(width, height, { fit: 'cover', position: 'attention' })
  .webp({ quality: 88 })
  .toFile(destPath);

console.log(`Converted -> ${destRelPath} (${width}x${height} WebP 88%)`);
