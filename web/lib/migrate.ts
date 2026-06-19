import { addThesis } from "./ledger";
import type { Thesis } from "./types";

const FLAG = "ce.migrated.v1";

/**
 * One-time push of locally-stored theses to the cloud after first sign-in, so
 * work done in localStorage mode isn't stranded. Safe to call repeatedly —
 * guarded by a flag. The caller must ensure the user is signed in (addThesis
 * routes to the cloud only then). Carousels stay local until re-saved in the
 * Studio (their image upload needs the editor).
 */
export async function migrateLocalToCloud(): Promise<void> {
  try {
    if (typeof window === "undefined" || localStorage.getItem(FLAG)) return;
    const raw = localStorage.getItem("ce.ledger");
    const theses: Thesis[] = raw ? JSON.parse(raw) : [];
    localStorage.setItem(FLAG, "1"); // set first so a mid-way failure won't double-insert
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
