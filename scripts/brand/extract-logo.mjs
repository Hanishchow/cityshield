/**
 * Extract usable brand assets from the supplied logo mockup.
 *
 * The source is a photograph of the logo embossed on textured paper, so it
 * carries a paper background, grain and drop shadows. Shipping it raw would
 * put a grey rectangle in the header and break entirely on the dark theme.
 *
 * This keys the paper to transparency by distance from the sampled paper
 * colour, then auto-crops the shield mark and the wordmark into separate
 * assets by finding the empty row band between them.
 *
 *   node scripts/brand/extract-logo.mjs
 */

import { createCanvas, loadImage } from '@napi-rs/canvas';
import { mkdirSync, writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = join(HERE, '..', '..');
/* Masters live OUTSIDE public/ so they are never deployed. Only the small
   web variants belong in the published bundle. */
const OUT = join(ROOT, 'brand-src');
const WEB = join(ROOT, 'public', 'brand');
const SRC = process.argv[2] || 'C:/Users/yakka/Downloads/citysheild logo.png';

/* Paper is light and near-neutral; the mark is either saturated blue or a
   mid-grey chrome rim. Keying purely on luminance would eat the rim, so this
   keys on distance from the sampled paper colour instead. */
const T0 = Number(process.argv[3] ?? 30); // below this distance: fully paper
const T1 = Number(process.argv[4] ?? 66); // above this distance: fully mark

mkdirSync(OUT, { recursive: true });
mkdirSync(WEB, { recursive: true });

const img = await loadImage(SRC);
const W = img.width;
const H = img.height;
console.log(`source ${W}x${H}`);

const canvas = createCanvas(W, H);
const ctx = canvas.getContext('2d');
ctx.drawImage(img, 0, 0);
const data = ctx.getImageData(0, 0, W, H);
const px = data.data;

/* Median of the border ring. A mean is dragged around by vignetting and by
   the drop shadow; the median lands on the true ground colour. */
const bR = [], bG = [], bB = [];
const EDGE = 14;
for (let y = 0; y < H; y++) {
  for (let x = 0; x < W; x++) {
    const edge = x < EDGE || y < EDGE || x >= W - EDGE || y >= H - EDGE;
    if (!edge) continue;
    const i = (y * W + x) * 4;
    bR.push(px[i]); bG.push(px[i + 1]); bB.push(px[i + 2]);
  }
}
const med = (a) => { a.sort((x, y) => x - y); return a[a.length >> 1]; };
const pr = med(bR), pg = med(bG), pb = med(bB);
console.log(`paper sampled: rgb(${pr.toFixed(0)}, ${pg.toFixed(0)}, ${pb.toFixed(0)})`);

/* Alpha from distance to paper */
const rowHas = new Uint8Array(H);
const colHas = new Uint8Array(W);
for (let y = 0; y < H; y++) {
  for (let x = 0; x < W; x++) {
    const i = (y * W + x) * 4;
    const d = Math.hypot(px[i] - pr, px[i + 1] - pg, px[i + 2] - pb);
    let a = (d - T0) / (T1 - T0);
    a = a < 0 ? 0 : a > 1 ? 1 : a;
    px[i + 3] = Math.round(a * 255);
    if (a > 0.45) {
      rowHas[y] = 1;
      colHas[x] = 1;
    }
  }
}
ctx.putImageData(data, 0, 0);

/* Split the mark from the wordmark at the row carrying the LEAST ink.
   A zero-ink gap does not exist here: the shield's contact shadow bridges the
   two blocks, so searching for an empty band finds nothing. */
const rows = [...rowHas];
const firstRow = rows.indexOf(1);
const lastRow = rows.lastIndexOf(1);

const rowInk = new Int32Array(H);
for (let y = firstRow; y <= lastRow; y++) {
  let c = 0;
  for (let x = 0; x < W; x++) if (px[(y * W + x) * 4 + 3] > 115) c++;
  rowInk[y] = c;
}

/* Search the middle band only, so we never split inside the shield itself */
const bandTop = firstRow + Math.round((lastRow - firstRow) * 0.45);
const bandBottom = firstRow + Math.round((lastRow - firstRow) * 0.85);
let min = Infinity;
for (let y = bandTop; y <= bandBottom; y++) if (rowInk[y] < min) min = rowInk[y];

/* Take the TOPMOST row near that minimum, not the absolute minimum. The rows
   just under the shield's point and the rows just above the wordmark are both
   near-empty; the absolute minimum can land below the wordmark's cap line and
   clip letter tops into the mark crop. */
const tolerance = min + 10;
let split = -1;
for (let y = bandTop; y <= bandBottom; y++) {
  if (rowInk[y] <= tolerance) {
    split = y;
    break;
  }
}
console.log(
  `content rows ${firstRow}-${lastRow}; split at ${split} (${min} ink px, ` +
    `searched ${bandTop}-${bandBottom})`,
);

function boundsIn(y0, y1) {
  let x0 = W, x1 = 0, ty0 = H, ty1 = 0;
  for (let y = y0; y <= y1; y++) {
    for (let x = 0; x < W; x++) {
      if (px[(y * W + x) * 4 + 3] > 115) {
        if (x < x0) x0 = x;
        if (x > x1) x1 = x;
        if (y < ty0) ty0 = y;
        if (y > ty1) ty1 = y;
      }
    }
  }
  return { x0, x1, y0: ty0, y1: ty1 };
}

/* `limitY` stops the padding reaching across the split. Without it the mark
   crop's 8px bottom pad reached row 650 and pulled in the wordmark's cap tops. */
function crop(name, b, pad = 8, limitY = H) {
  const x0 = Math.max(0, b.x0 - pad);
  const y0 = Math.max(0, b.y0 - pad);
  const w = Math.min(W, b.x1 + pad) - x0;
  const h = Math.min(limitY, Math.min(H, b.y1 + pad)) - y0;
  const c = createCanvas(w, h);
  c.getContext('2d').drawImage(canvas, x0, y0, w, h, 0, 0, w, h);
  writeFileSync(join(OUT, name), c.toBuffer('image/png'));
  console.log(`${name.padEnd(20)} ${w}x${h}`);
}

if (split > 0) {
  crop('logo-mark.png', boundsIn(firstRow, split), 8, split - 2);
  crop('logo-wordmark.png', boundsIn(split + 3, lastRow));
} else {
  console.log('no clear gap found — emitting the full lockup only');
}
crop('logo-full.png', boundsIn(firstRow, lastRow));

/* Web-sized variants. The full-resolution mark is ~240KB, which is far too
   heavy for something that renders at 30px in the header on every page. */
async function resize(srcName, outName, targetW) {
  const src = await loadImage(join(OUT, srcName));
  const h = Math.round((src.height / src.width) * targetW);
  const c = createCanvas(targetW, h);
  const cx = c.getContext('2d');
  cx.imageSmoothingEnabled = true;
  cx.imageSmoothingQuality = 'high';
  cx.drawImage(src, 0, 0, targetW, h);
  const buf = c.toBuffer('image/png');
  writeFileSync(join(WEB, outName), buf);
  console.log(`web/${outName.padEnd(20)} ${targetW}x${h}  ${(buf.length / 1024).toFixed(0)}KB`);
}

/* 2x the largest display size, so it stays sharp on HiDPI */
await resize('logo-mark.png', 'logo-mark-96.png', 96);
await resize('logo-mark.png', 'logo-mark-320.png', 320);

console.log('done ->', OUT);
