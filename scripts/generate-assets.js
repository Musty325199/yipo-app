const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

const ASSETS_DIR = path.join(__dirname, '..', 'assets', 'images');
const ARTIFACTS_DIR = 'C:\\Users\\HP\\.gemini\\antigravity\\brain\\b6e33ec5-aba0-44db-89d5-6c9e25982eff';

if (!fs.existsSync(ASSETS_DIR)) {
  fs.mkdirSync(ASSETS_DIR, { recursive: true });
}
if (!fs.existsSync(ARTIFACTS_DIR)) {
  fs.mkdirSync(ARTIFACTS_DIR, { recursive: true });
}

// Design tokens
const CREAM = '#F4EEE0';
const INK = '#10241E';
const SAFFRON = '#F0B429';
const WHITE = '#FFFFFF';

// Helper to generate the 8 dots ring SVG
// count = 8, 1 saffron shifted outward, 7 other dots
function generateRingSVG({
  width = 1024,
  height = 1024,
  bgColor = null,
  dotColor = INK,
  saffronColor = SAFFRON,
  radius = 240,
  dotRadius = 42,
  saffronRadius = 58,
  outwardShift = 72,
  allWhite = false
}) {
  const cx = width / 2;
  const cy = height / 2;
  const count = 8;
  // Let saffron dot be at index 1 (approx 45 degrees, top right - natural and dynamic)
  // or index 0 (12 o'clock: -90 deg)
  // Let's use index 1 (-45 deg, or 1:30 on clock face) which gives a prominent stepping-out feel.
  const saffronIndex = 1;

  let dotsSvg = '';
  for (let i = 0; i < count; i++) {
    const angle = (i * 2 * Math.PI / count) - (Math.PI / 2) + (Math.PI / 8);
    const isSaffron = (i === saffronIndex);

    const r = isSaffron ? (radius + outwardShift) : radius;
    const size = isSaffron ? saffronRadius : dotRadius;
    const x = cx + r * Math.cos(angle);
    const y = cy + r * Math.sin(angle);
    const fill = allWhite ? WHITE : (isSaffron ? saffronColor : dotColor);

    dotsSvg += `  <circle cx="${x.toFixed(2)}" cy="${y.toFixed(2)}" r="${size.toFixed(2)}" fill="${fill}" />\n`;
  }

  const bgRect = bgColor ? `<rect width="${width}" height="${height}" fill="${bgColor}" rx="${width * 0.22}" />\n` : '';
  const fullBgRect = bgColor ? `<rect width="${width}" height="${height}" fill="${bgColor}" />\n` : '';

  return {
    standalone: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" width="${width}" height="${height}">
${fullBgRect}${dotsSvg}</svg>`,
    roundedIcon: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" width="${width}" height="${height}">
${fullBgRect}${dotsSvg}</svg>`,
    transparent: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" width="${width}" height="${height}">
${dotsSvg}</svg>`
  };
}

async function buildAssets() {
  console.log('Generating SVG and PNG assets for Yípo...');

  // 1. App Icon 1024x1024 (Cream background, 7 ink dots, 1 saffron dot stepping outward)
  const appIconSvg = generateRingSVG({
    width: 1024,
    height: 1024,
    bgColor: CREAM,
    dotColor: INK,
    saffronColor: SAFFRON,
    radius: 260,
    dotRadius: 44,
    saffronRadius: 62,
    outwardShift: 76
  }).standalone;

  const appIconBuffer = await sharp(Buffer.from(appIconSvg))
    .png()
    .toBuffer();

  const iconPath = path.join(ASSETS_DIR, 'icon.png');
  fs.writeFileSync(iconPath, appIconBuffer);
  fs.writeFileSync(path.join(ARTIFACTS_DIR, 'icon.png'), appIconBuffer);
  console.log('Created icon.png (1024x1024)');

  // 2. Android Adaptive Icon:
  // Background: Solid #10241E
  const adaptiveBgSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1024 1024" width="1024" height="1024">
    <rect width="1024" height="1024" fill="${INK}" />
  </svg>`;
  const adaptiveBgBuffer = await sharp(Buffer.from(adaptiveBgSvg))
    .png()
    .toBuffer();
  fs.writeFileSync(path.join(ASSETS_DIR, 'android-icon-background.png'), adaptiveBgBuffer);

  // Foreground: Inside safe zone (central 66%, ~676px). Radius 170 + dot radius fits well within 676px.
  // Dots are cream on ink background, with saffron dot stepping out
  const adaptiveFgSvg = generateRingSVG({
    width: 1024,
    height: 1024,
    bgColor: null,
    dotColor: CREAM,
    saffronColor: SAFFRON,
    radius: 175,
    dotRadius: 30,
    saffronRadius: 44,
    outwardShift: 52
  }).transparent;

  const adaptiveFgBuffer = await sharp(Buffer.from(adaptiveFgSvg))
    .png()
    .toBuffer();
  fs.writeFileSync(path.join(ASSETS_DIR, 'android-icon-foreground.png'), adaptiveFgBuffer);
  fs.writeFileSync(path.join(ARTIFACTS_DIR, 'android-icon-foreground.png'), adaptiveFgBuffer);
  console.log('Created android-icon-foreground.png & android-icon-background.png');

  // Combined preview for Android adaptive icon
  const adaptivePreviewBuffer = await sharp(Buffer.from(adaptiveBgSvg))
    .composite([{ input: adaptiveFgBuffer }])
    .png()
    .toBuffer();
  fs.writeFileSync(path.join(ARTIFACTS_DIR, 'android-adaptive-preview.png'), adaptivePreviewBuffer);

  // 3. Monochrome icon for Android 13+ themed icons (all white/alpha, within safe zone)
  const monochromeSvg = generateRingSVG({
    width: 1024,
    height: 1024,
    bgColor: null,
    allWhite: true,
    radius: 175,
    dotRadius: 30,
    saffronRadius: 44,
    outwardShift: 52
  }).transparent;

  const monochromeBuffer = await sharp(Buffer.from(monochromeSvg))
    .png()
    .toBuffer();
  fs.writeFileSync(path.join(ASSETS_DIR, 'android-icon-monochrome.png'), monochromeBuffer);
  fs.writeFileSync(path.join(ARTIFACTS_DIR, 'android-icon-monochrome.png'), monochromeBuffer);
  console.log('Created android-icon-monochrome.png');

  // 4. Splash image:
  // Background #10241E, 512x512 splash icon for clean scaling
  const splashIconSvg = generateRingSVG({
    width: 512,
    height: 512,
    bgColor: null,
    dotColor: CREAM,
    saffronColor: SAFFRON,
    radius: 120,
    dotRadius: 21,
    saffronRadius: 30,
    outwardShift: 36
  }).transparent;

  const splashIconBuffer = await sharp(Buffer.from(splashIconSvg))
    .png()
    .toBuffer();
  fs.writeFileSync(path.join(ASSETS_DIR, 'splash-icon.png'), splashIconBuffer);
  fs.writeFileSync(path.join(ARTIFACTS_DIR, 'splash-icon.png'), splashIconBuffer);
  console.log('Created splash-icon.png');

  // Full splash preview (with background #10241E)
  const fullSplashSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1080 2340" width="1080" height="2340">
    <rect width="1080" height="2340" fill="${INK}" />
  </svg>`;
  const splashPreviewFg = generateRingSVG({
    width: 1080,
    height: 2340,
    bgColor: null,
    dotColor: CREAM,
    saffronColor: SAFFRON,
    radius: 160,
    dotRadius: 28,
    saffronRadius: 40,
    outwardShift: 48
  }).transparent;
  const fullSplashPreviewBuffer = await sharp(Buffer.from(fullSplashSvg))
    .composite([{ input: Buffer.from(splashPreviewFg) }])
    .png()
    .toBuffer();
  fs.writeFileSync(path.join(ARTIFACTS_DIR, 'splash-preview.png'), fullSplashPreviewBuffer);

  // 5. Notification icon (pure white on transparent, 96x96 and 1024x1024)
  const notifSvg = generateRingSVG({
    width: 256,
    height: 256,
    bgColor: null,
    allWhite: true,
    radius: 70,
    dotRadius: 13,
    saffronRadius: 19,
    outwardShift: 22
  }).transparent;

  const notifBuffer = await sharp(Buffer.from(notifSvg))
    .png()
    .toBuffer();
  fs.writeFileSync(path.join(ASSETS_DIR, 'notification-icon.png'), notifBuffer);
  fs.writeFileSync(path.join(ARTIFACTS_DIR, 'notification-icon.png'), notifBuffer);
  console.log('Created notification-icon.png');

  // 6. Favicon (64x64)
  const faviconSvg = generateRingSVG({
    width: 64,
    height: 64,
    bgColor: CREAM,
    dotColor: INK,
    saffronColor: SAFFRON,
    radius: 16,
    dotRadius: 3,
    saffronRadius: 4.5,
    outwardShift: 5
  }).standalone;

  const faviconBuffer = await sharp(Buffer.from(faviconSvg))
    .png()
    .toBuffer();
  fs.writeFileSync(path.join(ASSETS_DIR, 'favicon.png'), faviconBuffer);
  console.log('Created favicon.png');

  // Also save the master SVG
  fs.writeFileSync(path.join(ASSETS_DIR, 'logo.svg'), appIconSvg);

  console.log('All assets successfully generated!');
}

buildAssets().catch(err => {
  console.error('Asset generation failed:', err);
  process.exit(1);
});
