import { Link } from 'react-router-dom';

/**
 * Visible breadcrumbs.
 *
 * Paired with the BreadcrumbList JSON-LD that <Seo> emits: structured data that
 * describes navigation the page does not actually show is exactly the mismatch
 * search engines treat as a spam signal, and it is useless to the person on the
 * page. If one exists, both do.
 *
 * `trail` is [{ name, path }] ending with the current page, which is rendered as
 * plain text because a link to where you already are is noise.
 */
export default function Breadcrumbs({ trail }) {
  if (!trail?.length) return null;
  const last = trail.length - 1;

  return (
    <nav aria-label="Breadcrumb" className="mb-5">
      <ol className="flex list-none flex-wrap items-center gap-x-2 gap-y-1 p-0 text-small text-ink-3">
        {trail.map((step, i) => (
          <li key={step.path} className="flex items-center gap-2">
            {i > 0 && (
              <span aria-hidden="true" className="text-ink-3">
                /
              </span>
            )}
            {i === last ? (
              <span aria-current="page" className="text-ink-2">
                {step.name}
              </span>
            ) : (
              <Link to={step.path} className="text-ink-2 no-underline hover:text-ink">
                {step.name}
              </Link>
            )}
          </li>
        ))}
      </ol>
    </nav>
  );
}
