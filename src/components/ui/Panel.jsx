import { cn } from '../../lib/utils/format.js';

/**
 * The site's single surface primitive.
 *
 * Everything is a panel: nav, sections, tables, forms, the emergency controls.
 * One surface language throughout - mixing glass panels with flat sections is
 * what made the earlier build read as two designs stitched together.
 *
 * `read` raises opacity for long-form copy. Chrome can be thin and airy;
 * paragraphs cannot sit on a thin wash and stay legible.
 */
export default function Panel({ as: Tag = 'div', read = false, className, children, ...rest }) {
  return (
    <Tag className={cn('panel', read && 'panel-read', className)} {...rest}>
      {children}
    </Tag>
  );
}
