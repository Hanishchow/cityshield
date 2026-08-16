export function cn(...parts) {
  return parts.filter(Boolean).join(' ');
}

export function km(value) {
  if (value == null || Number.isNaN(value)) return '—';
  return value < 1 ? `${Math.round(value * 1000)} m` : `${value.toFixed(1)} km`;
}

export function metres(value) {
  if (value == null || Number.isNaN(value)) return '—';
  return `±${Math.round(value)} m`;
}

export function clockTime(iso) {
  if (!iso) return '—';
  return new Date(iso).toLocaleTimeString('en-IN', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });
}

export function relativeSeconds(iso, now = Date.now()) {
  if (!iso) return null;
  return Math.max(0, Math.round((now - new Date(iso).getTime()) / 1000));
}

export function elapsed(iso, now = Date.now()) {
  const s = relativeSeconds(iso, now);
  if (s == null) return '—';
  if (s < 60) return `${s}s`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ${s % 60}s`;
  return `${Math.floor(m / 60)}h ${m % 60}m`;
}

/**
 * Accuracy quality band. Drives honest presentation — we show the radius, not a
 * falsely precise pin (PRD §10.2).
 */
export function accuracyBand(accuracy) {
  if (accuracy == null) return { label: 'Unknown', tone: 'warn' };
  if (accuracy <= 15) return { label: 'Precise', tone: 'ok' };
  if (accuracy <= 50) return { label: 'Approximate', tone: 'warn' };
  return { label: 'Poor', tone: 'signal' };
}
