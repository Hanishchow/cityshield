/**
 * Validate configured API keys with one real authenticated call each.
 * See docs/CHECKLIST.md Stage 6.
 *
 *   npm run check:keys
 *
 * Rules:
 *  - Key VALUES are never printed. Masked to the first 6 characters.
 *  - A failing key is REPORTED, never silently fallen back from.
 *  - Unconfigured keys are SKIPPED, and that exits 0 — the app is designed to
 *    run fully on mocks.
 */

import { readFileSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');

/** Minimal .env.local reader — no dependency needed for four lines of config. */
function loadEnv() {
  const env = { ...process.env };
  for (const file of ['.env.local', '.env']) {
    const path = join(ROOT, file);
    if (!existsSync(path)) continue;
    for (const line of readFileSync(path, 'utf8').split('\n')) {
      const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
      if (m && !env[m[1]]) env[m[1]] = m[2].replace(/^["']|["']$/g, '');
    }
  }
  return env;
}

const mask = (v) => (v ? `${v.slice(0, 6)}${'•'.repeat(Math.max(0, Math.min(12, v.length - 6)))}` : '');

const env = loadEnv();

const CHECKS = [
  {
    name: 'Maps / geocoding',
    key: 'VITE_MAPS_API_KEY',
    async run(value) {
      // Google Geocoding API. Swap this call if you choose Ola Maps or Mappls.
      const url =
        'https://maps.googleapis.com/maps/api/geocode/json' +
        `?latlng=12.9784,77.6408&key=${encodeURIComponent(value)}`;
      const res = await fetch(url);
      const body = await res.json().catch(() => ({}));
      if (body.status === 'OK') return { ok: true, detail: body.results?.[0]?.formatted_address };
      return { ok: false, detail: `${body.status ?? res.status}: ${body.error_message ?? 'no detail'}` };
    },
  },
  {
    name: 'Places / facilities',
    key: 'VITE_PLACES_API_KEY',
    async run(value) {
      const url =
        'https://maps.googleapis.com/maps/api/place/nearbysearch/json' +
        `?location=12.9784,77.6408&radius=2000&type=hospital&key=${encodeURIComponent(value)}`;
      const res = await fetch(url);
      const body = await res.json().catch(() => ({}));
      if (body.status === 'OK' || body.status === 'ZERO_RESULTS')
        return { ok: true, detail: `${body.results?.length ?? 0} results` };
      return { ok: false, detail: `${body.status ?? res.status}: ${body.error_message ?? 'no detail'}` };
    },
  },
];

let failures = 0;
console.log('');

for (const check of CHECKS) {
  const value = env[check.key];

  if (!value) {
    console.log(`  SKIPPED   ${check.name.padEnd(22)} ${check.key} not configured — using mock`);
    continue;
  }

  process.stdout.write(`  ...       ${check.name.padEnd(22)} ${mask(value)}\r`);
  try {
    const { ok, detail } = await check.run(value);
    if (ok) {
      console.log(`  PASS      ${check.name.padEnd(22)} ${mask(value)}  ${detail ?? ''}`);
    } else {
      failures += 1;
      console.log(`  FAIL      ${check.name.padEnd(22)} ${mask(value)}  ${detail}`);
    }
  } catch (err) {
    failures += 1;
    console.log(`  FAIL      ${check.name.padEnd(22)} ${mask(value)}  ${err.message}`);
  }
}

console.log('');
if (failures) {
  console.log(`  ${failures} key check(s) failed. The app still runs — those adapters stay mocked.`);
  process.exit(1);
}
console.log('  All configured keys passed.\n');
