import { addThesis } from "./ledger";
import type { Thesis } from "./types";

/**
 * Per-user, deliberately. A browser-global flag meant the *first* account to
 * sign in claimed whatever was in local storage — and if a second account
 * signed in before that flag was set, it inherited the first user's theses into
 * its own cloud rows. Row-level security cannot catch that: the write is made by
 * the second user's own client with their own id, so the policy is satisfied.
 * Keying the flag by user makes "who consumed this" part of the record.
 */
const flagFor = (userId: string) => `ce.migrated.v1.${userId}`;

/**
 * One-time push of locally-stored theses to the cloud after first sign-in, so
 * work done in localStorage mode isn't stranded. Safe to call repeatedly.
 * Carousels stay local until re-saved in the Studio (their image upload needs
 * the editor).
 */
export async function migrateLocalToCloud(userId: string): Promise<void> {
  try {
    if (typeof window === "undefined" || !userId) return;
    const flag = flagFor(userId);
    if (localStorage.getItem(flag)) return;

    const raw = localStorage.getItem("ce.ledger");
    const theses: Thesis[] = raw ? JSON.parse(raw) : [];
    localStorage.setItem(flag, "1"); // set first so a mid-way failure won't double-insert
    for (const t of theses) {
      try {
        await addThesis(t);
      } catch {
        /* skip dupes / errors */
      }
    }
  } catch {
    /* ignore */
  }
}
