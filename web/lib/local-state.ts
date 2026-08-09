/**
 * Everything Crux keeps in this browser, and the rule for when it stops being
 * yours.
 *
 * These keys are scoped to the *browser*; auth is scoped to the *session*. With
 * nothing bridging the two, signing out left every one of them in place — so the
 * next person to sign in on the same machine saw the previous account's
 * in-progress conviction, their adversary transcript, their draft carousel, and
 * their handle stamped on the output. Clearing on sign-out and on a change of
 * user is what connects them.
 */
const KEYS = [
  "ce.draft", // handoff buffer: flow → studio
  "ce.flow", // in-progress conviction, including the chat transcript
  "ce.ledger", // theses, when signed out
  "ce.carousels", // saved decks, when signed out
  "ce.voice", // writing voice + interests
  "ce.brandkit", // handle and display name
  "ce.settings", // model preferences
] as const;

/**
 * Which account this browser's local data belongs to. Deliberately outside
 * KEYS — it is the marker, not the data.
 */
const OWNER = "ce.owner";

export function clearLocalState(): void {
  try {
    for (const k of KEYS) window.localStorage.removeItem(k);
    window.localStorage.removeItem(OWNER);
  } catch {
    /* private mode / quota — nothing to clear anyway */
  }
}

/**
 * Reconcile local data with whoever is signed in now.
 *
 * Called on sign-in, sign-out and token refresh. A different user than last time
 * means the local data is not theirs, so it goes. Passing null (signed out)
 * clears too: the next person to use this browser starts clean.
 *
 * Returns true when it wiped, so callers can refresh anything already rendered.
 */
export function syncLocalStateOwner(userId: string | null): boolean {
  try {
    const previous = window.localStorage.getItem(OWNER);
    if (previous === (userId ?? null)) return false;

    // Signed out, or a different account: this data is not the current user's.
    clearLocalState();
    if (userId) window.localStorage.setItem(OWNER, userId);
    return true;
  } catch {
    return false;
  }
}
