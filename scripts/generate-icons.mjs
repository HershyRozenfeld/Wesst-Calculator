/**
 * generate-icons.mjs — Convert icon-source.svg to PNG icons for PWA.
 *
 * Outputs:
 *   public/icons/icon-192.png
 *   public/icons/icon-512.png
 *   public/icons/icon-maskable-192.png
 *   public/icons/icon-maskable-512.png
 *   public/icons/apple-touch-icon.png  (180×180)
 *   public/favicon.svg                 (copy of source)
 */

import { readFileSync, writeFileSync, copyFileSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { Resvg } from '@resvg/resvg-js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const SVG_PATH = join(__dirname, 'icon-source.svg');
const ICONS_DIR = join(ROOT, 'public', 'icons');

// Ensure output dir exists
mkdirSync(ICONS_DIR, { recursive: true });

const svgData = readFileSync(SVG_PATH, 'utf-8');

function renderPng(svg, size) {
  const resvg = new Resvg(svg, {
    fitTo: { mode: 'width', value: size },
  });
  const rendered = resvg.render();
  return rendered.asPng();
}

/**
 * Create a maskable variant by adding 10% safe-zone padding.
 * We wrap the original SVG in a new SVG with padding.
 */
function makeMaskableSvg(originalSvg) {
  // The safe zone for maskable icons is the inner 80% circle.
  // We add ~10% padding on each side by scaling down to 80% and centering.
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">
  <rect width="512" height="512" fill="#1e3a5f"/>
  <g transform="translate(51.2, 51.2) scale(0.8)">
    ${originalSvg.replace(/<svg[^>]*>/, '').replace(/<\/svg>/, '')}
  </g>
</svg>`;
}

const sizes = [
  { name: 'icon-192.png', size: 192 },
  { name: 'icon-512.png', size: 512 },
];

const maskableSvg = makeMaskableSvg(svgData);

const maskableSizes = [
  { name: 'icon-maskable-192.png', size: 192 },
  { name: 'icon-maskable-512.png', size: 512 },
];

// Regular icons
for (const { name, size } of sizes) {
  const png = renderPng(svgData, size);
  const outPath = join(ICONS_DIR, name);
  writeFileSync(outPath, png);
  console.log(`✓ ${name} (${size}×${size})`);
}

// Maskable icons
for (const { name, size } of maskableSizes) {
  const png = renderPng(maskableSvg, size);
  const outPath = join(ICONS_DIR, name);
  writeFileSync(outPath, png);
  console.log(`✓ ${name} (${size}×${size})`);
}

// Apple touch icon (180×180)
const applePng = renderPng(svgData, 180);
writeFileSync(join(ICONS_DIR, 'apple-touch-icon.png'), applePng);
console.log('✓ apple-touch-icon.png (180×180)');

// Favicon SVG
copyFileSync(SVG_PATH, join(ROOT, 'public', 'favicon.svg'));
console.log('✓ favicon.svg');

console.log('\nDone! All icons generated.');
