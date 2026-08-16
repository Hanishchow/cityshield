/**
 * Procedural hero frame generator. See docs/FRONTEND-SPEC.md §6.
 *
 * Renders the product thesis as motion: a city at rest, one incident ignites,
 * three agencies acknowledge, response vectors converge, and — the final beat —
 * the agencies end up connected to EACH OTHER, not just to the incident.
 *
 * Deterministic: seeded, no Math.random() at render time, so regeneration is
 * byte-stable and diffs are reviewable.
 *
 * Output: PNG frames into .tmp/, consumed by encode.mjs.
 */

import { createCanvas } from '@napi-rs/canvas';
import { mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const TMP = join(HERE, '.tmp');

const FRAMES = 120;
const W = 1600;
const H = 900;

const SETS = [
  { name: 'desktop', width: 1600, height: 900 },
  { name: 'mobile', width: 800, height: 450 },
];

/* ---------- palette (mirrors styles/tokens.css) ---------- */
const P = {
  ground: '#FBFAF8',
  block: '#F0EEE8',
  blockAlt: '#EDEAE3',
  road: '#DAD6CE',
  roadMajor: '#C4BFB4',
  water: '#DFE9F1',
  ink: '#12151A',
  civic: '#1E3A5F',
  signal: '#C8102E',
};

/* ---------- maths ---------- */
const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
const remap = (v, a, b) => clamp((v - a) / (b - a));
const smooth = (t) => t * t * (3 - 2 * t);
const easeInOut = (t) => (t < 0.5 ? 2 * t * t : 1 - (-2 * t + 2) ** 2 / 2);

function seeded(seed) {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/* ---------- street network (generated once, reused every frame) ---------- */
const rand = seeded(20260817);

function buildNetwork() {
  const xs = [];
  for (let x = -240; x < 1900; x += 78 + rand() * 74) xs.push(Math.round(x));
  const ys = [];
  for (let y = -200; y < 1120; y += 70 + rand() * 66) ys.push(Math.round(y));

  const majorX = new Set(xs.filter((_, i) => i % 3 === 1));
  const majorY = new Set(ys.filter((_, i) => i % 3 === 2));

  // Minor streets don't span the whole city — they terminate at arterials.
  // This is what stops the render reading as graph paper.
  const spanX = xs.map((x) => {
    if (majorX.has(x)) return { from: -200, to: 1120 };
    const a = ys[Math.floor(rand() * ys.length * 0.45)];
    const b = ys[Math.floor(ys.length * 0.55 + rand() * ys.length * 0.45)];
    return { from: a, to: b };
  });
  const spanY = ys.map((y) => {
    if (majorY.has(y)) return { from: -240, to: 1900 };
    const a = xs[Math.floor(rand() * xs.length * 0.45)];
    const b = xs[Math.floor(xs.length * 0.55 + rand() * xs.length * 0.45)];
    return { from: a, to: b };
  });

  // Blocks — irregular, occasionally spanning two cells
  const blocks = [];
  const taken = new Set();
  for (let i = 0; i < xs.length - 1; i++) {
    for (let j = 0; j < ys.length - 1; j++) {
      if (taken.has(`${i},${j}`) || rand() > 0.72) continue;
      const wide = rand() > 0.82 && i < xs.length - 2;
      const tall = !wide && rand() > 0.86 && j < ys.length - 2;
      if (wide) taken.add(`${i + 1},${j}`);
      if (tall) taken.add(`${i},${j + 1}`);
      const inset = 5 + rand() * 9;
      blocks.push({
        x: xs[i] + inset,
        y: ys[j] + inset,
        w: (wide ? xs[i + 2] : xs[i + 1]) - xs[i] - inset * 2,
        h: (tall ? ys[j + 2] : ys[j + 1]) - ys[j] - inset * 2,
        alt: rand() > 0.55,
      });
    }
  }

  return { xs, ys, majorX, majorY, spanX, spanY, blocks };
}

const NET = buildNetwork();

/** Snap to the nearest grid line so nodes and routes sit on streets. */
const snapX = (v) => NET.xs.reduce((a, b) => (Math.abs(b - v) < Math.abs(a - v) ? b : a));
const snapY = (v) => NET.ys.reduce((a, b) => (Math.abs(b - v) < Math.abs(a - v) ? b : a));

const INCIDENT = { x: snapX(820), y: snapY(470) };

// Kept inside the safe area — the camera pushes in 16% and rotates, so nodes
// placed near the raw edges drift out of frame by the final beat.
const AGENCIES = [
  { key: 'ambulance', x: snapX(395), y: snapY(245) },
  { key: 'police', x: snapX(1235), y: snapY(335) },
  { key: 'fire', x: snapX(625), y: snapY(720) },
];

/** L-shaped route with a mid-grid bend — reads as travelling along streets. */
function routeFor(a) {
  const bendX = snapX((a.x + INCIDENT.x) / 2);
  return [
    { x: a.x, y: a.y },
    { x: bendX, y: a.y },
    { x: bendX, y: INCIDENT.y },
    { x: INCIDENT.x, y: INCIDENT.y },
  ];
}
const ROUTES = AGENCIES.map(routeFor);

function polylineLength(pts) {
  let total = 0;
  for (let i = 1; i < pts.length; i++) total += Math.hypot(pts[i].x - pts[i - 1].x, pts[i].y - pts[i - 1].y);
  return total;
}

/** Stroke the first `progress` fraction of a polyline; returns the head point. */
function strokePartial(ctx, pts, progress) {
  const total = polylineLength(pts);
  let remaining = total * clamp(progress);
  ctx.beginPath();
  ctx.moveTo(pts[0].x, pts[0].y);
  let head = pts[0];
  for (let i = 1; i < pts.length && remaining > 0; i++) {
    const seg = Math.hypot(pts[i].x - pts[i - 1].x, pts[i].y - pts[i - 1].y);
    if (remaining >= seg) {
      ctx.lineTo(pts[i].x, pts[i].y);
      head = pts[i];
      remaining -= seg;
    } else {
      const k = remaining / seg;
      head = {
        x: pts[i - 1].x + (pts[i].x - pts[i - 1].x) * k,
        y: pts[i - 1].y + (pts[i].y - pts[i - 1].y) * k,
      };
      ctx.lineTo(head.x, head.y);
      remaining = 0;
    }
  }
  ctx.stroke();
  return head;
}

/* ---------- frame render ---------- */
function renderFrame(ctx, t, scale) {
  ctx.save();
  ctx.scale(scale, scale);

  ctx.fillStyle = P.ground;
  ctx.fillRect(0, 0, W, H);

  // Camera: slow push-in with a slight drift
  const cam = 1 + 0.16 * easeInOut(t);
  const panX = -40 * easeInOut(t);
  const panY = -18 * easeInOut(t);
  ctx.save();
  ctx.translate(W / 2 + panX, H / 2 + panY);
  ctx.scale(cam, cam);
  // Slight rotation — a real map extract is never axis-aligned to the viewport
  ctx.rotate(-0.048);
  ctx.translate(-W / 2, -H / 2);

  // The city is present from the very first frame. An earlier version faded the
  // grid in from t=0, which made frame 0 — and therefore the poster and the
  // whole top of the page — completely blank.
  const gridA = 1;

  // Lake — Bengaluru reads wrong without water
  ctx.globalAlpha = gridA;
  ctx.fillStyle = P.water;
  ctx.beginPath();
  ctx.ellipse(1215, 625, 178, 96, -0.26, 0, Math.PI * 2);
  ctx.fill();

  // Blocks
  for (const b of NET.blocks) {
    ctx.fillStyle = b.alt ? P.blockAlt : P.block;
    ctx.fillRect(b.x, b.y, b.w, b.h);
  }

  // Streets — minor roads terminate at arterials rather than spanning the city
  ctx.lineCap = 'butt';
  NET.xs.forEach((x, i) => {
    const major = NET.majorX.has(x);
    const span = NET.spanX[i];
    ctx.strokeStyle = major ? P.roadMajor : P.road;
    ctx.lineWidth = major ? 5.5 : 2.2;
    ctx.beginPath();
    ctx.moveTo(x, span.from);
    ctx.lineTo(x, span.to);
    ctx.stroke();
  });
  NET.ys.forEach((y, i) => {
    const major = NET.majorY.has(y);
    const span = NET.spanY[i];
    ctx.strokeStyle = major ? P.roadMajor : P.road;
    ctx.lineWidth = major ? 5.5 : 2.2;
    ctx.beginPath();
    ctx.moveTo(span.from, y);
    ctx.lineTo(span.to, y);
    ctx.stroke();
  });

  // Diagonal arterial — breaks the grid, gives the city a spine
  ctx.strokeStyle = P.roadMajor;
  ctx.lineWidth = 7;
  ctx.beginPath();
  ctx.moveTo(-240, 250);
  ctx.lineTo(1900, 780);
  ctx.stroke();
  ctx.globalAlpha = 1;

  /* ----- incident ignites ----- */
  const incidentIn = smooth(remap(t, 0.1, 0.2));
  const fade = 1 - smooth(remap(t, 0.9, 1)) * 0.45; // red recedes at the end

  if (incidentIn > 0) {
    // Expanding accuracy rings
    for (let r = 0; r < 3; r++) {
      const phase = (t * 3.2 + r * 0.33) % 1;
      const radius = 26 + phase * 120;
      ctx.globalAlpha = incidentIn * (1 - phase) * 0.6 * fade;
      ctx.strokeStyle = P.signal;
      ctx.lineWidth = 2.4;
      ctx.beginPath();
      ctx.arc(INCIDENT.x, INCIDENT.y, radius, 0, Math.PI * 2);
      ctx.stroke();
    }
    ctx.globalAlpha = incidentIn * fade;
    ctx.fillStyle = P.signal;
    ctx.beginPath();
    ctx.arc(INCIDENT.x, INCIDENT.y, 9 * incidentIn, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;
  }

  /* ----- agencies acknowledge, then converge ----- */
  AGENCIES.forEach((a, i) => {
    const appear = smooth(remap(t, 0.3 + i * 0.05, 0.4 + i * 0.05));
    if (appear <= 0) return;

    const vector = smooth(remap(t, 0.45 + i * 0.04, 0.78));

    if (vector > 0) {
      ctx.globalAlpha = 0.92;
      ctx.strokeStyle = P.civic;
      ctx.lineWidth = 3.4;
      ctx.lineJoin = 'round';
      ctx.lineCap = 'round';
      const head = strokePartial(ctx, ROUTES[i], vector);

      if (vector < 1) {
        ctx.fillStyle = P.civic;
        ctx.beginPath();
        ctx.arc(head.x, head.y, 5, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalAlpha = 1;
    }

    // Agency node
    const r = 13 * appear;
    ctx.fillStyle = P.ground;
    ctx.beginPath();
    ctx.arc(a.x, a.y, r + 4, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = appear;
    ctx.strokeStyle = P.civic;
    ctx.lineWidth = 2.6;
    ctx.beginPath();
    ctx.arc(a.x, a.y, r, 0, Math.PI * 2);
    ctx.stroke();
    ctx.fillStyle = P.civic;
    ctx.beginPath();
    ctx.arc(a.x, a.y, r * 0.38, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;
  });

  /* ----- the point of the whole thing: agencies connect to EACH OTHER ----- */
  const link = smooth(remap(t, 0.8, 0.97));
  if (link > 0) {
    ctx.globalAlpha = link * 0.8;
    ctx.strokeStyle = P.civic;
    ctx.lineWidth = 2.2;
    ctx.setLineDash([9, 7]);
    for (let i = 0; i < AGENCIES.length; i++) {
      const a = AGENCIES[i];
      const b = AGENCIES[(i + 1) % AGENCIES.length];
      const mx = (a.x + b.x) / 2;
      const my = (a.y + b.y) / 2;
      // Bow the arc away from the incident so the triangle reads clearly
      const cx = mx + (mx - INCIDENT.x) * 0.18;
      const cy = my + (my - INCIDENT.y) * 0.18;
      ctx.beginPath();
      ctx.moveTo(a.x, a.y);
      ctx.quadraticCurveTo(cx, cy, b.x, b.y);
      ctx.stroke();
    }
    ctx.setLineDash([]);
    ctx.globalAlpha = 1;
  }

  ctx.restore(); // camera

  // Edge fade — pulls focus to the convergence and hides the grid running out
  const vig = ctx.createRadialGradient(W / 2, H / 2, H * 0.46, W / 2, H / 2, H * 1.02);
  vig.addColorStop(0, 'rgba(251,250,248,0)');
  vig.addColorStop(1, 'rgba(251,250,248,0.62)');
  ctx.fillStyle = vig;
  ctx.fillRect(0, 0, W, H);

  ctx.restore(); // scale
}

/* ---------- run ---------- */
rmSync(TMP, { recursive: true, force: true });

for (const set of SETS) {
  const dir = join(TMP, set.name);
  mkdirSync(dir, { recursive: true });
  const scale = set.width / W;
  const canvas = createCanvas(set.width, set.height);
  const ctx = canvas.getContext('2d');

  for (let f = 0; f < FRAMES; f++) {
    const t = f / (FRAMES - 1);
    ctx.clearRect(0, 0, set.width, set.height);
    renderFrame(ctx, t, scale);
    writeFileSync(join(dir, `f${String(f).padStart(4, '0')}.png`), canvas.toBuffer('image/png'));
  }
  console.log(`rendered ${FRAMES} frames  ${set.name}  ${set.width}x${set.height}`);
}

console.log('frames written to', TMP);
