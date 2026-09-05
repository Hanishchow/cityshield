/**
 * GitHub Pages has no SPA rewrite: a direct hit on /city-shield/sos looks for a
 * file that does not exist and returns 404. Serving a copy of index.html as
 * 404.html boots the app, and the router reads the real URL from there.
 *
 * Also drops .nojekyll — Jekyll ignores paths beginning with an underscore,
 * which would silently break assets if any ever land there.
 */

import { copyFileSync, writeFileSync, existsSync, readdirSync, statSync, mkdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const DIST = join(dirname(fileURLToPath(import.meta.url)), '..', 'dist');

if (!existsSync(join(DIST, 'index.html'))) {
  console.error('postbuild: dist/index.html missing — run the build first');
  process.exit(1);
}

copyFileSync(join(DIST, 'index.html'), join(DIST, '404.html'));
writeFileSync(join(DIST, '.nojekyll'), '');

/**
 * Static routes get a real directory index so Pages answers 200 rather than
 * serving 404.html with a 404 status. Dynamic routes (/track/:id) can't be
 * enumerated and still rely on the 404.html fallback, which works in a browser.
 */
const STATIC_ROUTES = ['sos', 'report'];
/* /track/:id and /live/:id are dynamic and cannot be enumerated; they fall back
   to 404.html, which boots the app and routes correctly. */
for (const route of STATIC_ROUTES) {
  mkdirSync(join(DIST, route), { recursive: true });
  copyFileSync(join(DIST, 'index.html'), join(DIST, route, 'index.html'));
}

// Report the real deployed size so budget regressions are visible.
const size = (dir) =>
  readdirSync(dir, { withFileTypes: true }).reduce((sum, e) => {
    const p = join(dir, e.name);
    return sum + (e.isDirectory() ? size(p) : statSync(p).size);
  }, 0);


/* ------------------------------------------------------------------ *
 * Crawler surface
 *
 * Generated here rather than committed as static files, so the sitemap can
 * never disagree with STATIC_ROUTES. A sitemap listing a route the app no
 * longer serves is worse than no sitemap at all.
 * ------------------------------------------------------------------ */

const SITE_URL = (process.env.VITE_SITE_URL || 'https://hanishchow.github.io/cityshield').replace(
  /\/+$/,
  '',
);

/* Only pages worth indexing. Live incident views and the styleguide carry
   noindex in their markup; listing them here would contradict that. */
const INDEXABLE = [
  { path: '/', priority: '1.0', changefreq: 'weekly' },
  { path: '/sos', priority: '0.9', changefreq: 'monthly' },
  { path: '/report', priority: '0.8', changefreq: 'monthly' },
];

/* The path robots.txt rules must be written against: '/city-shield/' on a
   GitHub project page, '/' once a custom domain is connected. */
const BASE_PATH = `${new URL(`${SITE_URL}/`).pathname}`;

const today = new Date().toISOString().slice(0, 10);

writeFileSync(
  join(DIST, 'sitemap.xml'),
  `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${INDEXABLE.map(
  (u) => `  <url>
    <loc>${SITE_URL}${u.path}</loc>
    <lastmod>${today}</lastmod>
    <changefreq>${u.changefreq}</changefreq>
    <priority>${u.priority}</priority>
  </url>`,
).join('\n')}
</urlset>
`,
);

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
- ${SITE_URL}/sos : the emergency control
- ${SITE_URL}/report : reporting a civic or non-urgent issue

## Contact

Emergency: 112 (India, all services)
`,
);

console.log(
  `postbuild: 404.html + .nojekyll + ${STATIC_ROUTES.length} route indexes · ` +
    `dist total ${(size(DIST) / 1024 / 1024).toFixed(2)} MB`,
);
