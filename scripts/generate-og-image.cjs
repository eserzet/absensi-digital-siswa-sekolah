const sharp = require('sharp');
const path = require('path');
const fs = require('fs');

async function generateOgImage() {
  const width = 1200;
  const height = 630;

  const publicDir = path.resolve(__dirname, '../public');
  const distDir = path.resolve(__dirname, '../dist');
  const logoPath = path.join(publicDir, 'school-logo.png');

  if (!fs.existsSync(logoPath)) {
    throw new Error('school-logo.png not found in public/');
  }

  // Resize logo to fit nicely in 1200x630 canvas
  const logoHeight = 280;
  const resizedLogoBuffer = await sharp(logoPath)
    .resize({ height: logoHeight, fit: 'inside' })
    .toBuffer();

  const logoMeta = await sharp(resizedLogoBuffer).metadata();
  const logoWidth = logoMeta.width;

  // Background SVG with brand colors (Emerald #047857, Slate #0f172a, subtle gradients & styling)
  const bgSvg = Buffer.from(`
    <svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="#ffffff"/>
          <stop offset="50%" stop-color="#f8fafc"/>
          <stop offset="100%" stop-color="#ecfdf5"/>
        </linearGradient>
        <linearGradient id="bar" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stop-color="#047857"/>
          <stop offset="50%" stop-color="#059669"/>
          <stop offset="100%" stop-color="#10b981"/>
        </linearGradient>
        <filter id="shadow" x="-10%" y="-10%" width="120%" height="120%">
          <feDropShadow dx="0" dy="8" stdDeviation="16" flood-color="#047857" flood-opacity="0.12"/>
        </filter>
      </defs>

      <!-- Background -->
      <rect width="${width}" height="${height}" fill="url(#bg)"/>

      <!-- Top decorative brand bar -->
      <rect x="0" y="0" width="${width}" height="14" fill="url(#bar)"/>

      <!-- Bottom decorative brand bar -->
      <rect x="0" y="${height - 8}" width="${width}" height="8" fill="url(#bar)"/>

      <!-- Subtle background circle accents -->
      <circle cx="100" cy="530" r="180" fill="#10b981" opacity="0.06"/>
      <circle cx="1100" cy="100" r="220" fill="#047857" opacity="0.05"/>

      <!-- Center Card Background -->
      <rect x="120" y="50" width="960" height="520" rx="24" fill="#ffffff" filter="url(#shadow)" stroke="#e2e8f0" stroke-width="2"/>

      <!-- Text Elements (Right side or bottom) -->
      <!-- App Badge -->
      <rect x="580" y="110" width="220" height="38" rx="19" fill="#ecfdf5" stroke="#a7f3d0" stroke-width="1.5"/>
      <text x="690" y="135" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif" font-size="14" font-weight="700" fill="#047857" text-anchor="middle" letter-spacing="1">SISTEM ABSENSI DIGITAL</text>

      <!-- Main Title -->
      <text x="580" y="210" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif" font-size="52" font-weight="900" fill="#0f172a" letter-spacing="-1">SMASTIKA</text>
      <text x="580" y="265" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif" font-size="34" font-weight="800" fill="#047857">ABSENSI</text>

      <!-- School Name -->
      <text x="580" y="325" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif" font-size="24" font-weight="700" fill="#334155">SMA Informatika Nurul Bayan</text>

      <!-- Features Pill tags -->
      <g transform="translate(580, 360)">
        <!-- Tag 1: QR Code -->
        <rect x="0" y="0" width="145" height="34" rx="8" fill="#f1f5f9"/>
        <text x="72.5" y="22" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif" font-size="14" font-weight="600" fill="#475569" text-anchor="middle">QR Code Scan</text>

        <!-- Tag 2: GPS Lokasi -->
        <rect x="155" y="0" width="130" height="34" rx="8" fill="#f1f5f9"/>
        <text x="220" y="22" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif" font-size="14" font-weight="600" fill="#475569" text-anchor="middle">Validasi GPS</text>

        <!-- Tag 3: Kamera -->
        <rect x="295" y="0" width="150" height="34" rx="8" fill="#f1f5f9"/>
        <text x="370" y="22" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif" font-size="14" font-weight="600" fill="#475569" text-anchor="middle">Foto Kamera</text>
      </g>

      <!-- Website URL watermark -->
      <text x="580" y="440" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif" font-size="16" font-weight="500" fill="#94a3b8">https://www.smastika-absensi.my.id</text>
    </svg>
  `);

  // Composite background with logo placed on the left side
  const logoLeft = Math.round(180 + (340 - logoWidth) / 2);
  const logoTop = Math.round(50 + (520 - logoHeight) / 2);

  const baseImage = await sharp(bgSvg)
    .composite([
      {
        input: resizedLogoBuffer,
        top: logoTop,
        left: logoLeft,
      },
    ])
    .png()
    .toBuffer();

  // 1. Output og-image.jpg (High quality, optimized ~120KB for WhatsApp)
  const jpgBuffer = await sharp(baseImage)
    .jpeg({ quality: 88, progressive: true })
    .toBuffer();

  // 2. Output og-image.png
  const pngBuffer = await sharp(baseImage)
    .png({ compressionLevel: 8 })
    .toBuffer();

  // Save to public/
  fs.writeFileSync(path.join(publicDir, 'og-image.jpg'), jpgBuffer);
  fs.writeFileSync(path.join(publicDir, 'og-image.png'), pngBuffer);

  // Save to dist/ if dist exists
  if (fs.existsSync(distDir)) {
    fs.writeFileSync(path.join(distDir, 'og-image.jpg'), jpgBuffer);
    fs.writeFileSync(path.join(distDir, 'og-image.png'), pngBuffer);
  }

  console.log(`[OG-IMAGE] Generated successfully!`);
  console.log(`JPEG size: ${jpgBuffer.length} bytes (${Math.round(jpgBuffer.length / 1024)} KB)`);
  console.log(`PNG size:  ${pngBuffer.length} bytes (${Math.round(pngBuffer.length / 1024)} KB)`);
}

generateOgImage().catch(console.error);
