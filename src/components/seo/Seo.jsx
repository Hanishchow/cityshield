import { useLocation } from 'react-router-dom';
import { SITE_NAME, OG_IMAGE, absoluteUrl, breadcrumbSchema } from '../../lib/seo.js';

/**
 * Per-page document head.
 *
 * React 19 hoists <title>, <meta> and <link> rendered anywhere in the tree into
 * <head>, so this needs no helmet library and no extra dependency.
 *
 * Note what this does NOT solve: the pages are client-rendered, so a crawler
 * that does not execute JavaScript sees only the shell. Googlebot does render,
 * but many crawlers and most social-preview scrapers do not. Fixing that
 * properly means prerendering, which is flagged rather than pretended away.
 */
export default function Seo({
  title,
  description,
  /** Pages that must never be indexed: live incident views, the styleguide. */
  noindex = false,
  breadcrumbs,
  image = OG_IMAGE,
  type = 'website',
}) {
  const { pathname } = useLocation();
  const url = absoluteUrl(pathname);

  /* The home page uses the bare site name. Everywhere else is suffixed, so every
     title in a search result is unique AND identifiable at a glance. */
  const fullTitle = title ? `${title} — ${SITE_NAME}` : `${SITE_NAME} — one incident, every agency`;

  return (
    <>
      <title>{fullTitle}</title>
      {description && <meta name="description" content={description} />}

      {/* A canonical must be absolute and must point at the URL we actually want
          indexed, which for a client-routed app is the path as served. */}
      <link rel="canonical" href={url} />

      {noindex && <meta name="robots" content="noindex, nofollow" />}

      <meta property="og:type" content={type} />
      <meta property="og:site_name" content={SITE_NAME} />
      <meta property="og:title" content={fullTitle} />
      {description && <meta property="og:description" content={description} />}
      <meta property="og:url" content={url} />
      <meta property="og:image" content={image} />
      <meta property="og:image:width" content="1200" />
      <meta property="og:image:height" content="630" />
      <meta property="og:locale" content="en_IN" />

      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={fullTitle} />
      {description && <meta name="twitter:description" content={description} />}
      <meta name="twitter:image" content={image} />
      {/* Alt text on the share image too: it is an image, and it is read out. */}
      <meta
        name="twitter:image:alt"
        content="City Shield — one emergency incident record shared by every responding agency in Bengaluru"
      />

      {breadcrumbs && (
        <script type="application/ld+json">
          {JSON.stringify(breadcrumbSchema(breadcrumbs))}
        </script>
      )}
    </>
  );
}
