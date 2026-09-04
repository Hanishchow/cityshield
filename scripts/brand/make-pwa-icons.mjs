import { createCanvas, loadImage } from '@napi-rs/canvas';
import { writeFileSync } from 'node:fs';

/**
 * Square PWA icons from the shield master.
 *
 * The shield is taller than it is wide (350x381), and a PWA icon must be
 * square: a non-square icon is either rejected or letterboxed unpredictably by
 * the installer. So it is centred on a square field rather than stretched.
 *
 * Two variants, because they are not the same picture:
 *  - `any`      keeps the mark near the edges; the launcher draws it as-is.
 *  - `maskable` insets it to 60% so the mark survives being cropped to a circle
 *               or a squircle. Shipping only `any` is why so many installed
 *               apps show a logo with its corners sliced off.
 */

const SRC = 'brand-src/logo-mark-graded.png';
const GROUND = '#14294f';

async function emit(size, { maskable }) {
  const img = await loadImage(SRC);
  const canvas = createCanvas(size, size);
  const ctx = canvas.getContext('2d');

  if (maskable) {
    ctx.fillStyle = GROUND;
    ctx.fillRect(0, 0, size, size);
  }

  /* 0.60 for maskable keeps the mark inside the guaranteed-visible safe zone;
     0.86 for `any` leaves only enough margin to avoid touching the edge. */
  const fit = size * (maskable ? 0.6 : 0.86);
  const scale = Math.min(fit / img.width, fit / img.height);
  const w = img.width * scale;
  const h = img.height * scale;
  ctx.drawImage(img, (size - w) / 2, (size - h) / 2, w, h);

  const out = `public/brand/icon-${size}${maskable ? '-maskable' : ''}.png`;
  writeFileSync(out, canvas.toBuffer('image/png'));
  console.log(out, `${size}x${size}`, maskable ? 'maskable' : 'any');
}

for (const size of [192, 512]) {
  await emit(size, { maskable: false });
  await emit(size, { maskable: true });
}
