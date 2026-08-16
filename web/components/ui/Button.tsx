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
  // A printed-ink press rather than a floating pill: a hard offset shadow that
  // collapses on click, so the button behaves like something stamped down.
  primary:
    "bg-accent text-accent-fg shadow-press enabled:hover:brightness-110 active:shadow-none active:translate-x-[2px] active:translate-y-[2px]",
  secondary: "border border-line text-fg hover:border-accent/50 hover:bg-surface",
  ghost: "text-muted hover:bg-surface hover:text-fg",
  danger: "border border-line text-danger hover:border-danger/50 hover:bg-danger/10",
};

/**
 * Unavailable, not broken.
 *
 * Every variant used to share `disabled:opacity-50`, which on a filled amber
 * primary produces a muddy olive that still reads as a button you can press —
 * and /think opens with exactly that as the only control on the page. An
 * unavailable action should recede to an outline, not dim to sludge.
 *
 * Loading is deliberately excluded: a button mid-request is still the primary
 * action and must keep its fill, even though it is also `disabled`.
 */
const INERT = "bg-transparent text-muted shadow-none ring-1 ring-line";

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
  const inert = !!disabled && !loading;
  return (
    <button
      {...rest}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      className={`ce-press inline-flex items-center justify-center gap-1.5 rounded-control font-medium transition duration-(--dur-fast) ease-out disabled:cursor-not-allowed ${VARIANTS[variant]} ${SIZES[size]} ${inert ? INERT : ""} ${className}`}
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
