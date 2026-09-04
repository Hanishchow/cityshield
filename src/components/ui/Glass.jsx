import { cn } from '../../lib/utils/format.js';

/**
 * Glass surface.
 *
 * `solid` is not a graceful fallback - it is the required variant on the
 * emergency path. A translucent panel inherits whatever sits behind it, so its
 * contrast cannot be guaranteed. Nothing on /sos or /track may use glass.
 */
export default function Glass({ as: Tag = 'div', solid = false, className, children, ...rest }) {
  return (
    <Tag className={cn(solid ? 'glass-solid' : 'glass', className)} {...rest}>
      {children}
    </Tag>
  );
}
