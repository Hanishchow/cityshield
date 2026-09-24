import { useLocation } from 'react-router-dom';
import {
  SITE_NAME,
  OG_IMAGE,
  OG_IMAGE_ALT,
  absoluteUrl,
  breadcrumbSchema,
  pageTitle,
} from '../../lib/seo.js';

/**
 * Per-page document head.
 *
 * React 19 hoists <title>, <meta> and <link> rendered anywhere in the tree into
 * <head>, so this needs no helmet library and no extra dependency.
 *
 * The pages are client-rendered, and a crawler that does not execute JavaScript
 * (most social-preview scrapers among them) never sees any of this. So
 * scripts/prerender.mjs writes the same tags into each public page's static
 * HTML at build time, from the same lib/seo.js copy. main.jsx drops those
 * static copies before React mounts, and from then on this component owns the
 * head. A tag added here belongs in the prerender too.
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

  const fullTitle = pageTitle(title);

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
      <meta name="twitter:image:alt" content={OG_IMAGE_ALT} />

      {breadcrumbs && (
        <script type="application/ld+json">
          {JSON.stringify(breadcrumbSchema(breadcrumbs))}
        </script>
      )}
    </>
  );
}
