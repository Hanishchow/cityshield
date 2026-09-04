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
  import.meta.env.VITE_SITE_URL || 'https://hanishchow.github.io/city-shield'
).replace(/\/+$/, '');

export const SITE_NAME = 'City Shield';

/** An app path ('/sos') to its absolute canonical URL. */
export function absoluteUrl(path = '/') {
  const clean = `/${String(path).replace(/^\/+/, '')}`;
  return `${SITE_URL}${clean === '/' ? '/' : clean}`;
}

export const OG_IMAGE = `${SITE_URL}/social/og-default.png`;

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
