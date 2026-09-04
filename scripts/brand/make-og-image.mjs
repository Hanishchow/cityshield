import { createCanvas, loadImage, GlobalFonts } from '@napi-rs/canvas';
import { writeFileSync, existsSync } from 'node:fs';

/**
 * The Open Graph share card, 1200x630.
 *
 * Generated rather than exported by hand so it cannot drift from the brand, and
 * committed rather than rendered at request time because social scrapers do not
 * execute JavaScript and will not wait around for an image service.
 *
 * Text is baked in at a size that survives the thumbnail: most people see this
 * at roughly a third of its real dimensions in a feed, so anything set at body
 * size is illegible where it actually gets looked at.
 */

const W = 1200;
const H = 630;

for (const [file, name] of [
  ['node_modules/@fontsource-variable/public-sans/files/public-sans-latin-wght-normal.woff2', 'PublicSans'],
]) {
  if (existsSync(file)) GlobalFonts.registerFromPath(file, name);
}

const canvas = createCanvas(W, H);
const ctx = canvas.getContext('2d');

const bg = ctx.createLinearGradient(0, 0, W, H);
bg.addColorStop(0, '#0d1b33');
bg.addColorStop(0.55, '#14294f');
bg.addColorStop(1, '#1c3a6e');
ctx.fillStyle = bg;
ctx.fillRect(0, 0, W, H);

/* Faint grid: the instrument motif the site uses, at an opacity that reads as
   texture rather than decoration once the card is scaled down. */
ctx.strokeStyle = 'rgba(169, 204, 227, 0.07)';
ctx.lineWidth = 1;
for (let x = 0; x <= W; x += 60) {
  ctx.beginPath();
  ctx.moveTo(x, 0);
  ctx.lineTo(x, H);
  ctx.stroke();
}
for (let y = 0; y <= H; y += 60) {
  ctx.beginPath();
  ctx.moveTo(0, y);
  ctx.lineTo(W, y);
  ctx.stroke();
}

const shield = await loadImage('brand-src/logo-mark-graded.png');
const sh = 300;
const sw = (shield.width / shield.height) * sh;
ctx.drawImage(shield, W - sw - 90, (H - sh) / 2, sw, sh);

const X = 84;
ctx.fillStyle = '#a9cce3';
ctx.font = '500 26px PublicSans, sans-serif';
ctx.fillText('BENGALURU  ·  EMERGENCY RESPONSE', X, 150);

ctx.fillStyle = '#ffffff';
ctx.font = '300 78px PublicSans, sans-serif';
ctx.fillText('Six helplines.', X, 275);
ctx.font = '800 78px PublicSans, sans-serif';
ctx.fillText('One incident.', X, 365);

ctx.fillStyle = 'rgba(255,255,255,0.78)';
ctx.font = '400 29px PublicSans, sans-serif';
ctx.fillText('Every responding agency on the same record.', X, 432);

/* The signal bar. Red is reserved for emergency across the whole product, and
   this is the one place on the card it is allowed to appear. */
ctx.fillStyle = '#c8102e';
ctx.fillRect(X, 492, 96, 6);

ctx.fillStyle = 'rgba(255,255,255,0.62)';
ctx.font = '400 24px PublicSans, sans-serif';
ctx.fillText('In a real emergency, call 112', X, 545);

writeFileSync('public/social/og-default.png', canvas.toBuffer('image/png'));
console.log(`public/social/og-default.png ${W}x${H}`);
