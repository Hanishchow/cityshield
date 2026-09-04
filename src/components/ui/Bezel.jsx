import { cn } from '../../lib/utils/format.js';

/**
 * A panel seated in a machined tray: outer shell, hairline, inner core with
 * concentric radius. Instrument housing, not a flat card.
 */
export default function Bezel({
  as: Tag = 'div',
  sunken = false,
  className,
  coreClassName,
  children,
  ...rest
}) {
  return (
    <Tag className={cn('bezel', sunken && 'bezel-sunken', className)} {...rest}>
      <div className={cn('bezel-core', coreClassName)}>{children}</div>
    </Tag>
  );
}
