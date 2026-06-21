/** Crux logomark — an amber tile with a dark crosshair ("get to the crux"). */
export function LogoMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" className={className} aria-hidden="true" focusable="false">
      <rect width="32" height="32" rx="8" fill="var(--color-accent)" />
      <g fill="none" stroke="var(--color-accent-fg)" strokeWidth="2.4" strokeLinecap="round">
        <circle cx="16" cy="16" r="6.5" />
        <path d="M16 4.5v4M16 23.5v4M4.5 16h4M23.5 16h4" />
      </g>
    </svg>
  );
}
