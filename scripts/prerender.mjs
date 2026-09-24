/**
 * Static HTML for every public page.
 *
 * The app is client-rendered, so what GitHub Pages served was an empty shell:
 * no title, no description, no canonical, nothing in the body. Googlebot runs
 * the JavaScript; most other crawlers and every link-preview scraper do not, and
 * they saw a blank page. This gives each page in PAGES its own document,
 * dist/<route>/index.html, carrying the head tags <Seo> would render plus a
 * short text summary inside #root that React replaces on mount.
 *
 * The copy comes from src/lib/seo.js, loaded through Vite so that SITE_URL and
 * every string are exactly what the bundle was built with. Nothing is restated
 * here; a tag added to <Seo> belongs in head() below as well.
 *
 * Also writes, from the same route list:
 *  - 404.html. GitHub Pages has no SPA rewrite, so /track/:id, /live/:id and
 *    unknown paths get this file, which boots the app and lets the router read
 *    the real URL. It stays an empty shell (these pages are private or do not
 *    exist) and is marked noindex.
 *  - sitemap.xml, so it can never list a page that has no HTML of its own.
 *
 * Runs straight after `vite build`, before postbuild.mjs, because it needs the
 * untouched dist/index.html as its template.
 */

import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createServer } from 'vite';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const DIST = join(ROOT, 'dist');

const HEAD = '<!--app-head-->';
const HTML = '<!--app-html-->';

const shellPath = join(DIST, 'index.html');
if (!existsSync(shellPath)) {
  console.error('prerender: dist/index.html missing - run `vite build` first');
  process.exit(1);
}
const shell = readFileSync(shellPath, 'utf8');
if (!shell.includes(HEAD) || !shell.includes(HTML)) {
  console.error(`prerender: dist/index.html has no ${HEAD} / ${HTML} marker - rebuild it`);
  process.exit(1);
}

/* seo.js reads import.meta.env, which only exists inside Vite. Production mode
   so the same .env files apply as for the build. Nothing listens on a port. */
const vite = await createServer({
  root: ROOT,
  mode: 'production',
  logLevel: 'error',
  appType: 'custom',
  server: { middlewareMode: true, hmr: false, watch: null },
});
let seo;
try {
  seo = await vite.ssrLoadModule('/src/lib/seo.js');
} finally {
  await vite.close();
}

const escapeText = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const escapeAttr = (s) => escapeText(s).replace(/"/g, '&quot;');

/* data-prerender marks every tag main.jsx removes before React mounts. */
const tag = (name, attrs) =>
  `<${name} ${Object.entries(attrs)
    .map(([k, v]) => `${k}="${escapeAttr(v)}"`)
    .join(' ')} data-prerender />`;

/* `<` escaped so no string in the data can close the script element. */
const jsonLd = (data) =>
  `<script type="application/ld+json" data-prerender>${JSON.stringify(data).replace(/</g, '\\u003c')}</script>`;

/** The tags <Seo> renders, in the same order. `path` is absent on 404.html. */
function head({ path, title, description, breadcrumbs, noindex = false }) {
  const fullTitle = seo.pageTitle(title);
  const url = path && seo.absoluteUrl(path);
  return [
    `<title data-prerender>${escapeText(fullTitle)}</title>`,
    tag('meta', { name: 'description', content: description }),
    url && tag('link', { rel: 'canonical', href: url }),
    noindex && tag('meta', { name: 'robots', content: 'noindex, nofollow' }),
    tag('meta', { property: 'og:type', content: 'website' }),
    tag('meta', { property: 'og:site_name', content: seo.SITE_NAME }),
    tag('meta', { property: 'og:title', content: fullTitle }),
    tag('meta', { property: 'og:description', content: description }),
    url && tag('meta', { property: 'og:url', content: url }),
    tag('meta', { property: 'og:image', content: seo.OG_IMAGE }),
    tag('meta', { property: 'og:image:width', content: '1200' }),
    tag('meta', { property: 'og:image:height', content: '630' }),
    tag('meta', { property: 'og:locale', content: 'en_IN' }),
    tag('meta', { name: 'twitter:card', content: 'summary_large_image' }),
    tag('meta', { name: 'twitter:title', content: fullTitle }),
    tag('meta', { name: 'twitter:description', content: description }),
    tag('meta', { name: 'twitter:image', content: seo.OG_IMAGE }),
    tag('meta', { name: 'twitter:image:alt', content: seo.OG_IMAGE_ALT }),
    /* App.jsx renders these two on every route; <Seo> adds the breadcrumbs. */
    url && jsonLd(seo.organizationSchema()),
    url && jsonLd(seo.websiteSchema()),
    url && breadcrumbs && jsonLd(seo.breadcrumbSchema(breadcrumbs)),
  ]
    .filter(Boolean)
    .join('\n    ');
}

/* Utility classes the app already uses, so they survive Tailwind's purge. The
   112 line is the home hero's own: whatever state the page is in, the way to
   reach real responders is on it. */
const body = ({ heading, summary }) => `
      <main class="mx-auto max-w-2xl px-5 py-24">
        <h1 class="text-h1 text-ink">${escapeText(heading)}</h1>
        <p class="mt-3 text-body text-ink-2">${escapeText(summary)}</p>
        <p class="mt-3 text-small text-ink-3">Prototype on mock data. In a real emergency, call <a href="tel:112">112</a>.</p>
      </main>
    `;

/* Function replacements: a string one would treat any `$&` in the copy as a
   pattern. */
const render = (headHtml, bodyHtml) =>
  shell.replace(HEAD, () => headHtml).replace(HTML, () => bodyHtml);

const pages = Object.values(seo.PAGES);

/* 404.html first: it is built from the shell, and '/' is about to overwrite
   dist/index.html. */
writeFileSync(
  join(DIST, '404.html'),
  render(head({ description: seo.PAGES.home.description, noindex: true }), ''),
);

for (const page of pages) {
  const dir = join(DIST, page.path);
  mkdirSync(dir, { recursive: true });
  writeFileSync(join(dir, 'index.html'), render(head(page), body(page)));
}

const today = new Date().toISOString().slice(0, 10);

writeFileSync(
  join(DIST, 'sitemap.xml'),
  `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${pages
  .map(
    (p) => `  <url>
    <loc>${seo.absoluteUrl(p.path)}</loc>
    <lastmod>${today}</lastmod>
    <changefreq>${p.changefreq}</changefreq>
    <priority>${p.priority}</priority>
  </url>`,
  )
  .join('\n')}
</urlset>
`,
);

console.log(
  `prerender: ${pages.map((p) => p.path).join(' ')} + 404.html + sitemap.xml · ${seo.SITE_URL}`,
);
