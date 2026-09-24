/**
 * Runs after prerender.mjs, which has already written each public page's HTML,
 * the 404.html SPA fallback and sitemap.xml.
 *
 * Drops .nojekyll — Jekyll ignores paths beginning with an underscore, which
 * would silently break assets if any ever land there.
 */

import { writeFileSync, readFileSync, existsSync, readdirSync, statSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const DIST = join(dirname(fileURLToPath(import.meta.url)), '..', 'dist');

if (!existsSync(join(DIST, 'index.html')) || !existsSync(join(DIST, '404.html'))) {
  console.error('postbuild: dist/index.html or 404.html missing — run the full build first');
  process.exit(1);
}

/**
 * Stamp the build id into the service worker.
 *
 * A service worker is only reinstalled when its own bytes differ from the
 * installed copy. A hardcoded version meant sw.js was byte-identical on every
 * deploy, so `activate` never fired, stale caches were never purged, and people
 * kept getting the previous build until they hard-reloaded. Deriving the id
 * from the built entry bundle ties cache lifetime to actual content.
 */
const entry =
  readdirSync(join(DIST, 'assets')).find((f) => /^index-.*\.js$/.test(f)) ?? String(Date.now());
const BUILD_ID = entry.replace(/^index-|\.js$/g, '');

const swPath = join(DIST, 'sw.js');
if (existsSync(swPath)) {
  const sw = readFileSync(swPath, 'utf8');
  if (!sw.includes('__BUILD_ID__')) {
    console.error('postbuild: sw.js has no __BUILD_ID__ placeholder - cache would never invalidate');
    process.exit(1);
  }
  writeFileSync(swPath, sw.replaceAll('__BUILD_ID__', BUILD_ID));
}

writeFileSync(join(DIST, '.nojekyll'), '');

// Report the real deployed size so budget regressions are visible.
const size = (dir) =>
  readdirSync(dir, { withFileTypes: true }).reduce((sum, e) => {
    const p = join(dir, e.name);
    return sum + (e.isDirectory() ? size(p) : statSync(p).size);
  }, 0);


/* ------------------------------------------------------------------ *
 * Crawler surface
 *
 * Generated here rather than committed as static files, so both follow
 * VITE_SITE_URL. The sitemap is written by prerender.mjs, from the same page
 * list as the HTML it points at: a sitemap listing a route the app no longer
 * serves is worse than no sitemap at all.
 * ------------------------------------------------------------------ */

const SITE_URL = (process.env.VITE_SITE_URL || 'https://hanishchow.github.io/cityshield').replace(
  /\/+$/,
  '',
);

/* The path robots.txt rules must be written against: '/city-shield/' on a
   GitHub project page, '/' once a custom domain is connected. Crawlers only
   read robots.txt at the host root, so on a project page this file is inert
   and the noindex tags on those pages do the work; it takes effect once the
   site is served from its own domain. */
const BASE_PATH = `${new URL(`${SITE_URL}/`).pathname}`;

writeFileSync(
  join(DIST, 'robots.txt'),
  `User-agent: *
Allow: /

# Individual incident records are private to the person who raised them and to
# the agencies handling them. They are not content, and they must never be
# indexed. Paths are origin-relative, so they carry the deploy sub-path -
# "Disallow: /track/" would match nothing on a project page served at
# /city-shield/.
Disallow: ${BASE_PATH}track/
Disallow: ${BASE_PATH}live/
Disallow: ${BASE_PATH}styleguide

Sitemap: ${SITE_URL}/sitemap.xml
`,
);

/* llms.txt: a plain-language brief for language models, which increasingly
   summarise a service to someone instead of showing them the page. Getting
   summarised wrong matters more than usual here - the failure mode is a person
   believing this dispatches real ambulances today. */
writeFileSync(
  join(DIST, 'llms.txt'),
  `# City Shield

> A Bengaluru emergency service prototype. One incident record that ambulance,
> police, fire and BBMP civic services all attach to, replacing the need to know
> which of eight public helplines to call.

## What it does

- One action raises an incident. The citizen never chooses a department; a
  server-side routing policy assigns a primary agency and attaches secondaries.
- Location is captured with its accuracy and source shown, never as a falsely
  precise pin.
- Every responding agency shares one record and can see the others.
- Live tracking shows units converging on the incident on a real map.

## Important limitations

- This is a PROTOTYPE. It does NOT dispatch real emergency services. Real
  dispatch requires an integration with ERSS-112 that needs a government
  agreement.
- Responder positions shown in live tracking are simulated, and labelled as such
  in the interface.
- BBMP ward numbers are stand-in data; ward boundaries are not available in the
  underlying map data.
- In a real emergency in India, call 112.

## Pages

- ${SITE_URL}/ : what the service is, what it covers, how it works
- ${SITE_URL}/sos/ : the emergency control
- ${SITE_URL}/report/ : reporting a civic or non-urgent issue

## Contact

Emergency: 112 (India, all services)
`,
);

console.log(
  `postbuild: .nojekyll + robots.txt + llms.txt · ` +
    `dist total ${(size(DIST) / 1024 / 1024).toFixed(2)} MB`,
);
