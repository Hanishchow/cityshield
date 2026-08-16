/**
 * Encode the PNG frames from generate-frames.mjs to WebP, write the manifest,
 * and delete the intermediates. See docs/FRONTEND-SPEC.md §6.2.
 *
 * Intermediate cleanup matters: there is limited free space on this machine.
 *
 * FLOW SWAP: to replace the procedural sequence with Google Flow footage:
 *   ffmpeg -i flow-hero.mp4 -vf "fps=24,scale=1600:900" -q:v 75 \
 *     public/hero/frames/desktop/f%04d.webp
 * then update frameCount + source in frames.json. No component changes.
 */

import { execFileSync } from 'node:child_process';
import { mkdirSync, rmSync, writeFileSync, readdirSync, statSync, copyFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = join(HERE, '..', '..');
const TMP = join(HERE, '.tmp');
const OUT = join(ROOT, 'public', 'hero');

const SETS = [
  { name: 'desktop', width: 1600, height: 900 },
  { name: 'mobile', width: 800, height: 450 },
];
const QUALITY = 75;

rmSync(OUT, { recursive: true, force: true });
mkdirSync(join(OUT, 'frames'), { recursive: true });

let frameCount = 0;

for (const set of SETS) {
  const inDir = join(TMP, set.name);
  const outDir = join(OUT, 'frames', set.name);
  mkdirSync(outDir, { recursive: true });

  execFileSync(
    'ffmpeg',
    [
      '-y',
      '-loglevel', 'error',
      '-i', join(inDir, 'f%04d.png'),
      '-c:v', 'libwebp',
      '-lossless', '0',
      '-q:v', String(QUALITY),
      '-preset', 'picture',
      // ffmpeg's image2 muxer numbers output from 1 unless told otherwise;
      // the component indexes frames from 0.
      '-start_number', '0',
      join(outDir, 'f%04d.webp'),
    ],
    { stdio: 'inherit' },
  );

  const files = readdirSync(outDir).filter((f) => f.endsWith('.webp'));
  frameCount = files.length;
  const bytes = files.reduce((sum, f) => sum + statSync(join(outDir, f)).size, 0);
  console.log(
    `${set.name.padEnd(8)} ${files.length} frames  ${(bytes / 1024 / 1024).toFixed(2)} MB  ` +
      `(${Math.round(bytes / files.length / 1024)} KB/frame)`,
  );
}

// Poster = frame 0 of the desktop set. Used for reduced-motion, Save-Data,
// decode failure, and as the preloaded LCP element.
copyFileSync(join(OUT, 'frames', 'desktop', 'f0000.webp'), join(OUT, 'poster.webp'));

writeFileSync(
  join(OUT, 'frames.json'),
  JSON.stringify(
    {
      version: 1,
      frameCount,
      // Paths are BASE-RELATIVE (no leading slash) so the hero works when the
      // app is served from a sub-path such as GitHub Pages. The component
      // prefixes import.meta.env.BASE_URL.
      sets: {
        desktop: { width: 1600, height: 900, path: 'hero/frames/desktop/f{i}.webp' },
        mobile: { width: 800, height: 450, path: 'hero/frames/mobile/f{i}.webp' },
      },
      indexPad: 4,
      poster: 'hero/poster.webp',
      source: 'procedural-v1',
    },
    null,
    2,
  ) + '\n',
);

rmSync(TMP, { recursive: true, force: true });
console.log('manifest written · intermediates cleaned');
