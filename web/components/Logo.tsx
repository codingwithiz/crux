/** Conviction Engine logomark — an amber tile with a dark editorial "C". */
export function LogoMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" className={className} aria-hidden="true" focusable="false">
      <rect width="32" height="32" rx="8" fill="var(--color-accent)" />
      <path
        d="M21.2 9.8 A8 8 0 1 0 21.2 22.2"
        fill="none"
        stroke="var(--color-accent-fg)"
        strokeWidth="3.4"
        strokeLinecap="round"
      />
    </svg>
  );
}
