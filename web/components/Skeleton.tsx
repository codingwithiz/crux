/** A subtle loading placeholder — used instead of spinners for list loads. */
export function Skeleton({ className }: { className?: string }) {
  return <div className={`animate-pulse rounded-lg bg-surface-3/60 ${className ?? ""}`} />;
}
