const sharp = require('sharp');
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Master SVG design for Thuy Shop (512x512)
// Perfectly optically centered vector emblem with pure paths (no external font dependency)
function getMasterSvg() {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="512" height="512">
  <defs>
    <!-- Rich Obsidian Boutique Gradient -->
    <linearGradient id="tileGradient" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#222226" />
      <stop offset="40%" stop-color="#141417" />
      <stop offset="100%" stop-color="#09090B" />
    </linearGradient>

    <!-- Silk Ivory Monogram Fill -->
    <linearGradient id="silkGradient" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" stop-color="#FFFFFF" />
      <stop offset="100%" stop-color="#F4F2EC" />
    </linearGradient>

    <!-- Vibrant Rose / Terracotta Brand Accent -->
    <linearGradient id="accentRose" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#FB7185" />
      <stop offset="100%" stop-color="#E11D48" />
    </linearGradient>

    <!-- Inner Glow Ring -->
    <linearGradient id="ringStroke" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#3F3F46" />
      <stop offset="100%" stop-color="#18181B" />
    </linearGradient>
  </defs>

  <!-- Circular Badge Base -->
  <circle cx="256" cy="256" r="244" fill="url(#tileGradient)" stroke="url(#ringStroke)" stroke-width="12" />

  <!-- Monogram Group (Shifted by dx=-12 for mathematical and optical balance with the rose dot) -->
  <g transform="translate(-12, 0)">
    <!-- Letter T -->
    <path d="M 104 152 L 260 152 C 270 152 276 158 276 168 L 276 198 C 276 208 270 214 260 214 L 214 214 L 214 346 C 214 356 208 362 198 362 L 164 362 C 154 362 148 356 148 346 L 148 214 L 104 214 C 94 214 88 208 88 198 L 88 168 C 88 158 94 152 104 152 Z" fill="url(#silkGradient)" />

    <!-- Letter S -->
    <path d="M 284 186 C 284 162 304 150 338 150 C 378 150 402 166 406 192 C 407 200 402 206 394 206 L 360 206 C 352 206 348 202 346 196 C 344 188 336 184 328 184 C 316 184 310 190 310 198 C 310 208 318 214 342 222 L 358 228 C 392 240 410 260 410 294 C 410 336 376 362 330 362 C 286 362 260 338 258 306 C 257 298 263 292 271 292 L 306 292 C 314 292 318 296 320 302 C 324 314 334 322 346 322 C 358 322 366 316 366 304 C 366 292 356 286 334 278 L 318 272 C 290 260 284 236 284 206 Z" fill="url(#silkGradient)" />

    <!-- Signature Brand Accent Dot ("Thuy shop.") -->
    <circle cx="418" cy="342" r="23" fill="url(#accentRose)" />
  </g>
</svg>`;
}

async function build() {
  const publicDir = path.join(__dirname, '..', 'public');
  const svgContent = getMasterSvg();

  // 1. Write vector favicon.svg
  fs.writeFileSync(path.join(publicDir, 'favicon.svg'), svgContent);
  console.log('✓ Wrote favicon.svg');

  const svgBuffer = Buffer.from(svgContent);

  // 2. Generate PNG sizes
  const sizes = [
    { name: 'favicon-48x48.png', size: 48 },   // Google Search minimum multiple of 48
    { name: 'favicon-96x96.png', size: 96 },   // Google Search high-DPI
    { name: 'apple-touch-icon.png', size: 180 }, // iOS Safari
    { name: 'icon-192.png', size: 192 },       // PWA / Android
    { name: 'icon-512.png', size: 512 },       // High-res PWA
    { name: 'logo.png', size: 512 },           // Schema.org Organization logo
  ];

  for (const { name, size } of sizes) {
    await sharp(svgBuffer)
      .resize(size, size)
      .png({ quality: 100, compressionLevel: 9 })
      .toFile(path.join(publicDir, name));
    console.log(`✓ Generated ${name} (${size}x${size})`);
  }

  // 3. Generate multi-resolution favicon.ico (16, 32, 48) via Python Pillow
  const png512Path = path.join(publicDir, 'icon-512.png');
  const icoPath = path.join(publicDir, 'favicon.ico');
  const pyScript = `from PIL import Image; img = Image.open('${png512Path}'); img.save('${icoPath}', sizes=[(16, 16), (32, 32), (48, 48)])`;
  execSync(`python3 -c "${pyScript}"`);
  console.log('✓ Generated favicon.ico (16x16, 32x32, 48x48 multi-resolution ICO)');

  // 4. Write site.webmanifest
  const manifest = {
    name: 'Thuy Shop',
    short_name: 'Thuy Shop',
    description: 'Boutique thời trang & đồ lót su cao cấp',
    start_url: '/',
    display: 'standalone',
    background_color: '#F8F7F4',
    theme_color: '#121212',
    icons: [
      {
        src: '/icon-192.png',
        sizes: '192x192',
        type: 'image/png'
      },
      {
        src: '/icon-512.png',
        sizes: '512x512',
        type: 'image/png'
      }
    ]
  };
  fs.writeFileSync(path.join(publicDir, 'site.webmanifest'), JSON.stringify(manifest, null, 2));
  console.log('✓ Wrote site.webmanifest');

  console.log('\nAll Google Search & multi-device favicon assets generated successfully!');
}

build().catch((err) => {
  console.error('Build failed:', err);
  process.exit(1);
});
