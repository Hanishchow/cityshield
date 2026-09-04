import { cn } from '../../lib/utils/format.js';

/**
 * Numbered section header. The index is a monospaced instrument marking - it
 * keeps a long document navigable without turning every section into an
 * identical card.
 */
export default function SectionHead({ index, title, lead, serif = false, className }) {
  return (
    <header className={cn('border-b border-line pb-4', className)}>
      <div className="flex items-baseline gap-4">
        {index && <span className="font-data text-micro text-ink-3">{index}</span>}
        <h2 className={cn('text-h2 text-ink', serif && 'font-semibold')}>{title}</h2>
      </div>
      {lead && <p className="mt-3 max-w-prose text-body text-ink-2">{lead}</p>}
    </header>
  );
}
