/**
 * WCAG 2.1 relative luminance and contrast ratio.
 *
 * These read the *resolved* colour off the live DOM rather than a hardcoded
 * hex, so the styleguide reports what actually renders in the current palette
 * and theme. An asserted contrast table is worth nothing; a measured one
 * catches the case where a token changed and the docs did not.
 */

/** Parse any CSS colour the browser can resolve into [r,g,b] 0-255. */
export function parseColor(css) {
  const m = String(css).match(/rgba?\(([^)]+)\)/);
  if (m) {
    const parts = m[1].split(/[\s,/]+/).filter(Boolean).map(Number);
    return [parts[0], parts[1], parts[2]];
  }
  const hex = String(css).trim().replace('#', '');
  if (hex.length === 3) {
    return [0, 1, 2].map((i) => parseInt(hex[i] + hex[i], 16));
  }
  if (hex.length >= 6) {
    return [0, 2, 4].map((i) => parseInt(hex.slice(i, i + 2), 16));
  }
  return [0, 0, 0];
}

const channel = (v) => {
  const s = v / 255;
  return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
};

export function luminance(css) {
  const [r, g, b] = parseColor(css);
  return 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b);
}

export function contrastRatio(a, b) {
  const la = luminance(a);
  const lb = luminance(b);
  const [hi, lo] = la > lb ? [la, lb] : [lb, la];
  return (hi + 0.05) / (lo + 0.05);
}

/** Resolve a CSS custom property against the document root. */
export function tokenValue(name) {
  if (typeof window === 'undefined') return '';
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim();
}

/**
 * `decorative` is exempt by WCAG: 1.4.11 governs UI components and meaningful
 * graphics, not purely ornamental separators or fills. It is listed rather than
 * hidden so the exemption is visible and arguable, not silently assumed.
 *
 * @param {number} ratio
 * @param {'normal'|'large'|'ui'|'decorative'} kind
 */
export function verdict(ratio, kind = 'normal') {
  if (kind === 'decorative') return { label: 'n/a', pass: true, exempt: true };
  const min = kind === 'normal' ? 4.5 : 3;
  if (kind === 'normal' && ratio >= 7) return { label: 'AAA', pass: true };
  if (ratio >= min) return { label: 'AA', pass: true };
  return { label: 'FAIL', pass: false };
}
