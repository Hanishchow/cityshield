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
const STATIC_ROUTES = ['sos', 'services', 'report', 'about'];
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

console.log(
  `postbuild: 404.html + .nojekyll + ${STATIC_ROUTES.length} route indexes · ` +
    `dist total ${(size(DIST) / 1024 / 1024).toFixed(2)} MB`,
);
