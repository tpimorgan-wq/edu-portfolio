import sharp from 'sharp';
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const publicDir = join(__dirname, '..', 'public');

const icons = [
  { input: 'icon-192.svg', output: 'icon-192.png', size: 192 },
  { input: 'icon-512.svg', output: 'icon-512.png', size: 512 },
];

for (const icon of icons) {
  const svgBuffer = readFileSync(join(publicDir, icon.input));
  await sharp(svgBuffer, { density: 300 })
    .resize(icon.size, icon.size)
    .png()
    .toFile(join(publicDir, icon.output));
  console.log(`Created ${icon.output} (${icon.size}x${icon.size})`);
}
