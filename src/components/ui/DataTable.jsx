import { cn } from '../../lib/utils/format.js';

/**
 * Dense technical table.
 *
 * Procurement audiences scan tables, not feature cards. This is the primary
 * content device on this site - not a fallback for when a card grid won't fit.
 *
 * columns: [{ key, header, align, mono, strong, width }]
 */
export default function DataTable({ columns, rows, caption, className, rowKey }) {
  return (
    <div className={cn('overflow-x-auto', className)}>
      <table className="w-full min-w-[560px] border-collapse text-left">
        {caption && <caption className="pb-3 text-left text-small text-ink-3">{caption}</caption>}
        <thead>
          <tr className="border-b border-line-strong">
            {columns.map((c) => (
              <th
                key={c.key}
                scope="col"
                style={c.width ? { width: c.width } : undefined}
                className={cn('label-caps pb-2.5 pr-5', c.align === 'right' && 'pr-0 text-right')}
              >
                {c.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr key={rowKey ? row[rowKey] : i} className="border-b border-line last:border-0">
              {columns.map((c) => (
                <td
                  key={c.key}
                  className={cn(
                    'py-3 pr-5 align-top text-small',
                    c.mono && 'font-data',
                    c.align === 'right' && 'pr-0 text-right',
                    c.strong ? 'font-medium text-ink' : 'text-ink-2',
                  )}
                >
                  {row[c.key]}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
