/**
 * Canonical site identity.
 *
 * One source of truth for the absolute origin. Canonical tags, Open Graph URLs,
 * the sitemap and every JSON-LD @id have to agree exactly — a canonical that
 * disagrees with the sitemap tells a crawler two different things about the same
 * page, which is worse than shipping neither.
 *
 * Override with VITE_SITE_URL when a custom domain is connected.
 */
export const SITE_URL = (
  import.meta.env.VITE_SITE_URL || 'https://hanishchow.github.io/cityshield'
).replace(/\/+$/, '');

export const SITE_NAME = 'City Shield';

/**
 * An app path ('/sos') to its absolute canonical URL.
 *
 * Always with a trailing slash. Each page is served from a directory index
 * (sos/index.html), and GitHub Pages answers '/sos' with a 301 to '/sos/'. A
 * canonical or sitemap entry has to be the URL that returns 200, not the one
 * that redirects to it.
 */
export function absoluteUrl(path = '/') {
  const clean = `/${String(path).replace(/^\/+|\/+$/g, '')}`;
  return `${SITE_URL}${clean === '/' ? '/' : `${clean}/`}`;
}

export const OG_IMAGE = `${SITE_URL}/social/og-default.png`;

export const OG_IMAGE_ALT =
  'City Shield: one emergency incident record shared by every responding agency in Bengaluru';

/* The home page uses the bare site name. Everywhere else is suffixed, so every
   title in a search result is unique AND identifiable at a glance. */
export function pageTitle(title) {
  return title ? `${title} | ${SITE_NAME}` : `${SITE_NAME}: one incident, every agency`;
}

/**
 * The public, indexable pages.
 *
 * The pages read their title, description and breadcrumbs from here, and so
 * does scripts/prerender.mjs when it writes each page's static HTML and the
 * sitemap. One copy means the HTML a crawler fetches and the page React renders
 * cannot drift apart.
 *
 * `heading` and `summary` repeat the page's own visible h1 and lead paragraph.
 * They are only the static stand-in shown before the app mounts (or to a
 * crawler that never runs it), so keep them in step with the page when its
 * copy changes.
 *
 * /track, /live and /styleguide are deliberately absent: they carry noindex.
 */
export const PAGES = {
  home: {
    path: '/',
    description:
      'Raise one emergency in Bengaluru and every responding agency - ambulance, police, fire, BBMP civic - attaches to the same record. No choosing which helpline to call.',
    heading: 'Six helplines. One incident.',
    summary:
      'A Bengaluru service that replaces knowing which number to call with a single action, then keeps every responding agency attached to the same record instead of six disconnected phone calls.',
    changefreq: 'weekly',
    priority: '1.0',
  },
  sos: {
    path: '/sos',
    title: 'Emergency SOS',
    description:
      'Hold to raise an emergency immediately. Your location and its accuracy are sent to the agencies that need it, and 112 stays one tap away.',
    breadcrumbs: [
      { name: 'Home', path: '/' },
      { name: 'Emergency SOS', path: '/sos' },
    ],
    heading: 'Hold to send an alert.',
    summary:
      'Hold for two seconds. Your location starts being captured the moment you press down, so nothing is lost while you decide.',
    changefreq: 'monthly',
    priority: '0.9',
  },
  report: {
    path: '/report',
    title: 'Report an issue',
    description:
      'Report a civic or non-life-threatening issue in Bengaluru - roads, water, drainage, debris - into the same shared record the emergency services use.',
    breadcrumbs: [
      { name: 'Home', path: '/' },
      { name: 'Report an issue', path: '/report' },
    ],
    heading: 'Report a civic issue.',
    summary:
      'Roads, water, garbage, streetlights and drainage. This is a queue, not a dispatch - it never shares an alerting path with emergencies.',
    changefreq: 'monthly',
    priority: '0.8',
  },
};

/**
 * Structured data.
 *
 * EmergencyService rather than a bare Organization: the schema.org type has to
 * describe what the thing actually is, and mistyping it is how you end up
 * eligible for the wrong rich results.
 *
 * `areaServed` is Bengaluru specifically. This service does not work outside it,
 * and claiming a wider area in structured data is a claim to users, not just to
 * a crawler.
 */
export function organizationSchema() {
  return {
    '@context': 'https://schema.org',
    '@type': 'EmergencyService',
    '@id': `${SITE_URL}/#organization`,
    name: SITE_NAME,
    url: `${SITE_URL}/`,
    logo: `${SITE_URL}/brand/icon-512.png`,
    image: OG_IMAGE,
    description:
      'One emergency incident record that ambulance, police, fire and civic services in Bengaluru all attach to, instead of separate calls to separate helplines.',
    areaServed: {
      '@type': 'City',
      name: 'Bengaluru',
      address: {
        '@type': 'PostalAddress',
        addressLocality: 'Bengaluru',
        addressRegion: 'Karnataka',
        addressCountry: 'IN',
      },
    },
    availableLanguage: [{ '@type': 'Language', name: 'English' }],
    /* The public emergency number, not ours. Someone who finds this in a search
       result and taps the phone number must reach actual responders. */
    telephone: '+91-112',
    openingHoursSpecification: {
      '@type': 'OpeningHoursSpecification',
      dayOfWeek: [
        'Monday',
        'Tuesday',
        'Wednesday',
        'Thursday',
        'Friday',
        'Saturday',
        'Sunday',
      ],
      opens: '00:00',
      closes: '23:59',
    },
  };
}

export function websiteSchema() {
  return {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    '@id': `${SITE_URL}/#website`,
    url: `${SITE_URL}/`,
    name: SITE_NAME,
    publisher: { '@id': `${SITE_URL}/#organization` },
    inLanguage: 'en-IN',
  };
}

/** `trail` is [{ name, path }], ending with the current page. */
export function breadcrumbSchema(trail) {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: trail.map((step, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      name: step.name,
      item: absoluteUrl(step.path),
    })),
  };
}
