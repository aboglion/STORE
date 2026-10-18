import fs from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';

const publicDir = path.resolve('public');

// 1. Standard SVG Icon (512x512)
const standardSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="512" height="512">
  <defs>
    <linearGradient id="brandGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#A56230"/>
      <stop offset="50%" stop-color="#95582B"/>
      <stop offset="100%" stop-color="#6F3C18"/>
    </linearGradient>
    <linearGradient id="bagGrad" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" stop-color="#FFFFFF"/>
      <stop offset="100%" stop-color="#FAF4EB"/>
    </linearGradient>
    <filter id="shadow" x="-10%" y="-10%" width="120%" height="120%">
      <feDropShadow dx="0" dy="16" stdDeviation="20" flood-color="#000000" flood-opacity="0.25"/>
    </filter>
  </defs>
  
  <!-- Rounded container -->
  <rect width="512" height="512" rx="112" fill="url(#brandGrad)"/>
  
  <!-- Subtle inner glow border -->
  <rect x="4" y="4" width="504" height="504" rx="108" fill="none" stroke="#FFFFFF" stroke-opacity="0.15" stroke-width="4"/>
  
  <!-- Shopping Bag Symbol -->
  <g filter="url(#shadow)" transform="translate(0, 10)">
    <!-- Handle -->
    <path d="M196 200 v-36 a60 60 0 0 1 120 0 v36" 
          fill="none" 
          stroke="#FAF4EB" 
          stroke-width="26" 
          stroke-linecap="round"/>
    
    <!-- Bag Body -->
    <path d="M152 200 h208 l-18 184 a30 30 0 0 1-30 28 h-112 a30 30 0 0 1-30-28 Z" 
          fill="url(#bagGrad)"/>
    
    <!-- Bag Fold / Stitch Accent -->
    <path d="M152 200 h208" 
          stroke="#E2D4C3" 
          stroke-width="6" 
          stroke-linecap="round"/>
          
    <!-- Warm Emblem in center (wheat/leaf motif) -->
    <path d="M256 260 c-18 20 -20 44 0 66 c20 -22 18 -46 0 -66 Z" 
          fill="#95582B"/>
    <path d="M256 326 v20" 
          stroke="#95582B" 
          stroke-width="6" 
          stroke-linecap="round"/>
  </g>
</svg>`;

// 2. Maskable SVG Icon (Full-bleed 512x512 background, inner icon within 80% safe zone circle)
const maskableSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="512" height="512">
  <defs>
    <linearGradient id="brandGradMask" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#A56230"/>
      <stop offset="50%" stop-color="#95582B"/>
      <stop offset="100%" stop-color="#6F3C18"/>
    </linearGradient>
    <linearGradient id="bagGradMask" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" stop-color="#FFFFFF"/>
      <stop offset="100%" stop-color="#FAF4EB"/>
    </linearGradient>
    <filter id="shadowMask" x="-10%" y="-10%" width="120%" height="120%">
      <feDropShadow dx="0" dy="12" stdDeviation="16" flood-color="#000000" flood-opacity="0.25"/>
    </filter>
  </defs>
  
  <!-- Full-bleed background for maskable (no rounded corners, Android will mask it) -->
  <rect width="512" height="512" fill="url(#brandGradMask)"/>
  
  <!-- Scaled down to 74% and centered inside 512 to be safely inside the 80% circle -->
  <g transform="translate(256, 256) scale(0.74) translate(-256, -246)" filter="url(#shadowMask)">
    <!-- Handle -->
    <path d="M196 200 v-36 a60 60 0 0 1 120 0 v36" 
          fill="none" 
          stroke="#FAF4EB" 
          stroke-width="26" 
          stroke-linecap="round"/>
    
    <!-- Bag Body -->
    <path d="M152 200 h208 l-18 184 a30 30 0 0 1-30 28 h-112 a30 30 0 0 1-30-28 Z" 
          fill="url(#bagGradMask)"/>
    
    <!-- Bag Fold / Stitch Accent -->
    <path d="M152 200 h208" 
          stroke="#E2D4C3" 
          stroke-width="6" 
          stroke-linecap="round"/>
          
    <!-- Warm Emblem in center -->
    <path d="M256 260 c-18 20 -20 44 0 66 c20 -22 18 -46 0 -66 Z" 
          fill="#95582B"/>
    <path d="M256 326 v20" 
          stroke="#95582B" 
          stroke-width="6" 
          stroke-linecap="round"/>
  </g>
</svg>`;

async function main() {
  console.log('Generating PWA icons in public/...');

  // Save SVG
  fs.writeFileSync(path.join(publicDir, 'icon.svg'), standardSvg, 'utf-8');

  // Generate 192x192 PNG
  await sharp(Buffer.from(standardSvg))
    .resize(192, 192)
    .png({ quality: 95 })
    .toFile(path.join(publicDir, 'icon-192.png'));

  // Generate 512x512 PNG
  await sharp(Buffer.from(standardSvg))
    .resize(512, 512)
    .png({ quality: 95 })
    .toFile(path.join(publicDir, 'icon-512.png'));

  // Generate Maskable 192x192 PNG
  await sharp(Buffer.from(maskableSvg))
    .resize(192, 192)
    .png({ quality: 95 })
    .toFile(path.join(publicDir, 'icon-maskable-192.png'));

  // Generate Maskable 512x512 PNG
  await sharp(Buffer.from(maskableSvg))
    .resize(512, 512)
    .png({ quality: 95 })
    .toFile(path.join(publicDir, 'icon-maskable-512.png'));

  // Generate Apple Touch Icon (180x180) - iOS applies its own rounded corners
  await sharp(Buffer.from(standardSvg))
    .resize(180, 180)
    .png({ quality: 95 })
    .toFile(path.join(publicDir, 'apple-touch-icon.png'));

  console.log('✅ All PWA icons generated successfully:');
  console.log(' - public/icon.svg');
  console.log(' - public/icon-192.png');
  console.log(' - public/icon-512.png');
  console.log(' - public/icon-maskable-192.png');
  console.log(' - public/icon-maskable-512.png');
  console.log(' - public/apple-touch-icon.png');
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
