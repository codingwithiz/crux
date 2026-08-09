import type { ButtonHTMLAttributes, ReactNode } from "react";

type Variant = "primary" | "secondary" | "ghost" | "danger";
type Size = "sm" | "md";

/**
 * The app's button.
 *
 * There were 23 hand-rolled primaries across 13 files in six different size
 * permutations, and only nine of them carried the press animation — so two
 * buttons that looked identical behaved differently depending on which file you
 * were in. Variants encode intent; sizes are the two that were actually in use.
 */
const VARIANTS: Record<Variant, string> = {
  primary: "bg-accent text-accent-fg hover:brightness-110",
  secondary: "border border-line text-fg hover:bg-surface",
  ghost: "text-muted hover:bg-surface hover:text-fg",
  danger: "border border-line text-danger hover:bg-danger/10",
};

const SIZES: Record<Size, string> = {
  // 44px tall: a touch target, not a desktop-only affordance.
  md: "px-5 py-2.5 text-sm",
  sm: "px-3 py-1.5 text-sm",
};

export function Button({
  variant = "secondary",
  size = "md",
  loading = false,
  loadingLabel,
  className = "",
  children,
  disabled,
  ...rest
}: {
  variant?: Variant;
  size?: Size;
  /** Shows `loadingLabel` and blocks input, without the caller juggling both. */
  loading?: boolean;
  loadingLabel?: string;
  children: ReactNode;
} & Omit<ButtonHTMLAttributes<HTMLButtonElement>, "className" | "children"> & {
    className?: string;
  }) {
  return (
    <button
      {...rest}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      className={`ce-press inline-flex items-center justify-center gap-1.5 rounded-lg font-medium transition disabled:cursor-not-allowed disabled:opacity-50 ${VARIANTS[variant]} ${SIZES[size]} ${className}`}
    >
      {loading && (
        <span
          aria-hidden
          className="h-3.5 w-3.5 shrink-0 animate-spin rounded-full border-2 border-current border-t-transparent opacity-70"
        />
      )}
      {loading ? (loadingLabel ?? children) : children}
    </button>
  );
}
