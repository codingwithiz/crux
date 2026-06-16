import type { Provider } from "./types";

/** Small monochrome (currentColor) provider marks for the model picker. */
export function ProviderIcon({ provider, size = 18 }: { provider: Provider; size?: number }) {
  const common = { width: size, height: size, viewBox: "0 0 24 24", fill: "none" as const };
  switch (provider) {
    case "google": // Gemini-style four-point spark
      return (
        <svg {...common} aria-hidden>
          <path
            d="M12 2c.6 4.8 2.2 6.4 7 7-4.8.6-6.4 2.2-7 7-.6-4.8-2.2-6.4-7-7 4.8-.6 6.4-2.2 7-7Z"
            fill="currentColor"
          />
        </svg>
      );
    case "openai": // hex knot (simplified)
      return (
        <svg {...common} aria-hidden>
          <path
            d="M12 2 21 7v10l-9 5-9-5V7l9-5Z"
            stroke="currentColor"
            strokeWidth="1.6"
            strokeLinejoin="round"
          />
          <circle cx="12" cy="12" r="3.2" stroke="currentColor" strokeWidth="1.6" />
        </svg>
      );
    case "anthropic": // burst / asterisk
      return (
        <svg {...common} aria-hidden>
          <g stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
            <path d="M12 3v18M3 12h18M5.6 5.6l12.8 12.8M18.4 5.6 5.6 18.4" />
          </g>
        </svg>
      );
    case "ollama": // local terminal block
    default:
      return (
        <svg {...common} aria-hidden>
          <rect x="3" y="4" width="18" height="16" rx="3" stroke="currentColor" strokeWidth="1.6" />
          <path d="M7 9l3 3-3 3M12.5 15h4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      );
  }
}
