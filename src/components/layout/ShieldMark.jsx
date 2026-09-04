/**
 * Wordmark glyph. A shield outline whose interior is a three-node convergence -
 * the product thesis (PRD §3) reduced to a mark.
 */
export default function ShieldMark({ className }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
      <path
        d="M12 2.5 4.5 5.5v6.2c0 4.6 3.1 8.4 7.5 9.8 4.4-1.4 7.5-5.2 7.5-9.8V5.5L12 2.5Z"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinejoin="round"
      />
      <circle cx="12" cy="12.2" r="1.7" fill="currentColor" />
      <path
        d="M12 12.2 8.2 8.6M12 12.2l3.8-3.6M12 12.2v4.6"
        stroke="currentColor"
        strokeWidth="1.2"
        strokeLinecap="round"
        opacity="0.55"
      />
    </svg>
  );
}
