/**
 * Colour-grade the extracted mark and emit the web variants.
 *
 * The source render is slightly desaturated, so the enamel blues read flat
 * against the ice-blue layout. This lifts saturation and adds a gentle
 * S-curve to contrast.
 *
 * Two deliberate constraints:
 *  - Saturation is scaled, not clamped upward from a floor, so the near-neutral
 *    silver rim STAYS silver. A vibrance-style boost that lifts low-saturation
 *    pixels hardest would tint the chrome blue and wreck the material read.
 *  - The alpha channel is untouched, so the keyed edge stays clean.
 *
 *   node scripts/brand/enhance-logo.mjs [saturation] [contrast]
 */

import { createCanvas, loadImage } from '@napi-rs/canvas';
import { writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
/* Masters in brand-src/ are build inputs and are never published; only the
   graded web variants are written into public/. */
const OUT = join(ROOT, 'brand-src');
const WEB = join(ROOT, 'public', 'brand');

const SAT = Number(process.argv[2] ?? 1.45);
const CONTRAST = Number(process.argv[3] ?? 1.14);

const clamp = (v) => (v < 0 ? 0 : v > 255 ? 255 : v);

/* Rec. 709 luma — matches how the eye weights the channels, so a saturation
   scale about this point does not shift perceived brightness. */
const luma = (r, g, b) => 0.2126 * r + 0.7152 * g + 0.0722 * b;

/* Smooth S-curve around mid grey; gentler at the extremes than a linear
   contrast scale, which would crush the rim highlights to flat white. */
function scurve(v, amount) {
  const n = v / 255;
  const c = n < 0.5
    ? 0.5 * Math.pow(2 * n, amount)
    : 1 - 0.5 * Math.pow(2 * (1 - n), amount);
  return c * 255;
}

async function grade(srcName, outName) {
  const img = await loadImage(join(OUT, srcName));
  const c = createCanvas(img.width, img.height);
  const ctx = c.getContext('2d');
  ctx.drawImage(img, 0, 0);
  const data = ctx.getImageData(0, 0, img.width, img.height);
  const px = data.data;

  for (let i = 0; i < px.length; i += 4) {
    if (px[i + 3] === 0) continue;
    let r = px[i], g = px[i + 1], b = px[i + 2];

    const y = luma(r, g, b);
    r = y + (r - y) * SAT;
    g = y + (g - y) * SAT;
    b = y + (b - y) * SAT;

    px[i] = clamp(scurve(clamp(r), CONTRAST));
    px[i + 1] = clamp(scurve(clamp(g), CONTRAST));
    px[i + 2] = clamp(scurve(clamp(b), CONTRAST));
  }
  ctx.putImageData(data, 0, 0);
  writeFileSync(join(OUT, outName), c.toBuffer('image/png'));
  return c;
}

async function resizeFrom(canvas, outName, targetW) {
  const h = Math.round((canvas.height / canvas.width) * targetW);
  const c = createCanvas(targetW, h);
  const cx = c.getContext('2d');
  cx.imageSmoothingEnabled = true;
  cx.imageSmoothingQuality = 'high';
  cx.drawImage(canvas, 0, 0, targetW, h);
  const buf = c.toBuffer('image/png');
  writeFileSync(join(WEB, outName), buf);
  console.log(`web/${outName.padEnd(22)} ${targetW}x${h}  ${(buf.length / 1024).toFixed(0)}KB`);
}

console.log(`grading: saturation ${SAT}, contrast ${CONTRAST}`);
const mark = await grade('logo-mark.png', 'logo-mark-graded.png');
await resizeFrom(mark, 'logo-mark-96.png', 96);
await resizeFrom(mark, 'logo-mark-320.png', 320);

await grade('logo-full.png', 'logo-full-graded.png');
// full lockup stays a master only; nothing on the site references it yet
console.log('done');
