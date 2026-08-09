/**
 * Why an item placed where it did, in the user's own words.
 *
 * Ranking blends popularity with overlap against what you've written and the
 * topics you follow, but the feed only ever showed the result — an order with
 * no stated reason reads as arbitrary, and there was no way to tell whether it
 * knew anything about you at all. These are the matched terms; nothing here is
 * inferred or generated.
 */
export function WhyThis({ why, className = "" }: { why?: string[]; className?: string }) {
  if (!why?.length) return null;
  // Three is enough to be convincing; more turns a reason into a word cloud.
  const shown = why.slice(0, 3);
  return (
    <p className={`mt-2 text-xs text-cool ${className}`}>
      Because you follow{" "}
      {shown.map((w, i) => (
        <span key={w}>
          {i > 0 && (i === shown.length - 1 ? " and " : ", ")}
          <span className="font-medium">{w}</span>
        </span>
      ))}
    </p>
  );
}
