/**
 * A loading placeholder.
 *
 * A sweep rather than a pulse: a block fading in and out says "something is
 * here"; a sweep travelling across it says "something is coming". Shape it like
 * the thing it stands in for — five identical grey bars are a worse wait than
 * one skeleton that already looks like a headline over a byline.
 */
export function Skeleton({ className }: { className?: string }) {
  return <div className={`ce-shimmer rounded-control bg-surface-3/60 ${className ?? ""}`} />;
}

/** A feed row: source chip, title, two lines of detail. Mirrors FeedItem so the
 *  layout does not jump when the real items land. */
export function FeedItemSkeleton() {
  return (
    <div className="rounded-control border border-line bg-surface/40 p-3">
      <div className="flex items-center justify-between gap-2">
        <Skeleton className="h-3 w-20" />
        <Skeleton className="h-3 w-24" />
      </div>
      <Skeleton className="mt-2.5 h-4 w-3/4" />
      <Skeleton className="mt-2 h-3 w-full" />
      <Skeleton className="mt-1.5 h-3 w-5/6" />
    </div>
  );
}
