/**
 * Why an item is in front of you, in the user's own words.
 *
 * Three registers, because there are three different truths and they were once
 * collapsed into one sentence. An item can be here because you asked for the
 * topic, or because it brushes something you've written about, or for no
 * personal reason at all — and the last case must say nothing rather than
 * inventing a reason. Conflating the first two is what produced "Because you
 * follow data" for a user who had never typed the word: it came from a sentence
 * inside one of their saved takes. Nothing here is inferred or generated.
 */
export function WhyThis({
  why,
  related,
  viaInterest,
  className = "",
}: {
  why?: string[];
  related?: string[];
  /** Set when the item was *fetched* for a topic, which outranks any match. */
  viaInterest?: string;
  className?: string;
}) {
  // Three is enough to be convincing; more turns a reason into a word cloud.
  const followed = viaInterest ? [viaInterest] : (why ?? []).slice(0, 3);
  const touches = followed.length ? [] : (related ?? []).slice(0, 2);
  if (!followed.length && !touches.length) return null;

  return (
    // `text-cool` on ink, paper ink on paper: the recall blue is tuned for a
    // near-black ground and reads as a stray link on warm stock.
    <p className={`mt-2 text-xs text-cool [.ce-plate_&]:text-paper-muted ${className}`}>
      {followed.length ? "Because you follow " : "Related to what you've written about "}
      <Terms words={followed.length ? followed : touches} />
    </p>
  );
}

function Terms({ words }: { words: string[] }) {
  return (
    <>
      {words.map((w, i) => (
        <span key={w}>
          {i > 0 && (i === words.length - 1 ? " and " : ", ")}
          <span className="font-medium">{w}</span>
        </span>
      ))}
    </>
  );
}
