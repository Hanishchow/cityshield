/**
 * Trace the shield's outline from the extracted mark's alpha channel.
 *
 * This is what makes the 3D object *your* logo rather than an approximation:
 * the extruded contour is measured from the artwork, not drawn by eye.
 *
 * Moore-neighbour boundary tracing on the alpha mask, then Ramer-Douglas-Peucker
 * simplification down to a few dozen points — enough for a smooth bevel, few
 * enough to keep the triangle count sane.
 *
 *   node scripts/brand/trace-silhouette.mjs [alphaThreshold] [rdpEpsilon]
 */

import { loadImage, createCanvas } from '@napi-rs/canvas';
import { writeFileSync, mkdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const SRC = join(ROOT, 'brand-src', 'logo-mark.png');
const OUT_DIR = join(ROOT, 'src', 'features', 'hero');

const ALPHA = Number(process.argv[2] ?? 140);
const EPSILON = Number(process.argv[3] ?? 1.1);

const img = await loadImage(SRC);
const W = img.width;
const H = img.height;
const canvas = createCanvas(W, H);
const ctx = canvas.getContext('2d');
ctx.drawImage(img, 0, 0);
const px = ctx.getImageData(0, 0, W, H).data;

const solid = (x, y) =>
  x >= 0 && y >= 0 && x < W && y < H && px[(y * W + x) * 4 + 3] >= ALPHA;

/* Find a starting boundary pixel: first solid pixel scanning top-down */
let start = null;
outer: for (let y = 0; y < H; y++) {
  for (let x = 0; x < W; x++) {
    if (solid(x, y)) {
      start = [x, y];
      break outer;
    }
  }
}
if (!start) throw new Error('no solid pixels found — check the alpha threshold');

/* Moore-neighbour tracing, clockwise from the west neighbour */
const N8 = [
  [-1, 0], [-1, -1], [0, -1], [1, -1],
  [1, 0], [1, 1], [0, 1], [-1, 1],
];

function trace() {
  const contour = [];
  let cur = start;
  let backtrack = 0; // index into N8 we came from
  const maxSteps = W * H * 4;
  let steps = 0;

  do {
    contour.push(cur);
    let found = false;
    for (let i = 1; i <= 8; i++) {
      const dir = (backtrack + i) % 8;
      const nx = cur[0] + N8[dir][0];
      const ny = cur[1] + N8[dir][1];
      if (solid(nx, ny)) {
        // the direction we arrived from, rotated to sit behind the new pixel
        backtrack = (dir + 5) % 8;
        cur = [nx, ny];
        found = true;
        break;
      }
    }
    if (!found) break;
    steps++;
  } while ((cur[0] !== start[0] || cur[1] !== start[1]) && steps < maxSteps);

  return contour;
}

const raw = trace();
console.log(`traced ${raw.length} boundary points (alpha >= ${ALPHA})`);

/* Ramer-Douglas-Peucker */
function perpDistance(p, a, b) {
  const dx = b[0] - a[0];
  const dy = b[1] - a[1];
  const len = Math.hypot(dx, dy);
  if (len === 0) return Math.hypot(p[0] - a[0], p[1] - a[1]);
  return Math.abs(dy * p[0] - dx * p[1] + b[0] * a[1] - b[1] * a[0]) / len;
}

function rdp(points, eps) {
  if (points.length < 3) return points;
  let maxD = 0;
  let idx = 0;
  for (let i = 1; i < points.length - 1; i++) {
    const d = perpDistance(points[i], points[0], points[points.length - 1]);
    if (d > maxD) {
      maxD = d;
      idx = i;
    }
  }
  if (maxD > eps) {
    const left = rdp(points.slice(0, idx + 1), eps);
    const right = rdp(points.slice(idx), eps);
    return left.slice(0, -1).concat(right);
  }
  return [points[0], points[points.length - 1]];
}

const simplified = rdp(raw, EPSILON);
console.log(`simplified to ${simplified.length} points (epsilon ${EPSILON})`);

/* Normalise: centre on the artwork's bounding box, y-up, longest side = 2 */
let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
for (const [x, y] of simplified) {
  if (x < minX) minX = x;
  if (x > maxX) maxX = x;
  if (y < minY) minY = y;
  if (y > maxY) maxY = y;
}
const w = maxX - minX;
const h = maxY - minY;
const scale = 2 / Math.max(w, h);

const points = simplified.map(([x, y]) => [
  +(((x - minX) - w / 2) * scale).toFixed(4),
  // flip Y: image space is y-down, 3D is y-up
  +((h / 2 - (y - minY)) * scale).toFixed(4),
]);

mkdirSync(OUT_DIR, { recursive: true });
const payload = {
  source: 'brand-src/logo-mark.png alpha channel',
  alphaThreshold: ALPHA,
  epsilon: EPSILON,
  /* UV mapping needs the artwork's aspect so the face texture lands square on
     the extruded front face rather than stretched. */
  aspect: +(w / h).toFixed(4),
  bounds: { w: +(w * scale).toFixed(4), h: +(h * scale).toFixed(4) },
  points,
};
writeFileSync(join(OUT_DIR, 'shieldOutline.json'), JSON.stringify(payload, null, 1) + '\n');
console.log(
  `wrote shieldOutline.json — ${points.length} points, aspect ${payload.aspect}, ` +
    `bounds ${payload.bounds.w} x ${payload.bounds.h}`,
);
