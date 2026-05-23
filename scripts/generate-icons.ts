import fs from 'fs';
import path from 'path';
import sharp from 'sharp';

const publicDir = path.resolve('public');

if (!fs.existsSync(publicDir)) {
  fs.mkdirSync(publicDir);
}

// Generate base SVG icon
const svgContent = `<svg width="512" height="512" viewBox="0 0 512 512" xmlns="http://www.w3.org/2000/svg">
  <rect width="512" height="512" fill="#0a0a0a" rx="120" ry="120"/>
  <path d="M256 120 L390 380 L122 380 Z" fill="#3b82f6"/>
</svg>`;

fs.writeFileSync(path.join(publicDir, 'icon.svg'), svgContent);

const sizes = [192, 512];

async function generate() {
  for (const size of sizes) {
    await sharp(Buffer.from(svgContent))
      .resize(size, size)
      .toFile(path.join(publicDir, `pwa-${size}x${size}.png`));
    console.log(`Generated ${size}x${size} icon in public folder.`);
  }
}

generate().catch(console.error);
