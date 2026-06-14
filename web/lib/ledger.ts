import type { Thesis } from "./types";

const KEY = "ce.ledger";

/** The Thesis Ledger — the compounding moat. MVP: client localStorage. */
export function getLedger(): Thesis[] {
  try {
    const raw = window.localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as Thesis[]) : [];
  } catch {
    return [];
  }
}

export function addThesis(t: Thesis): void {
  try {
    const all = getLedger();
    all.unshift(t);
    window.localStorage.setItem(KEY, JSON.stringify(all));
  } catch {
    /* ignore */
  }
}

export function removeThesis(id: string): void {
  try {
    window.localStorage.setItem(KEY, JSON.stringify(getLedger().filter((t) => t.id !== id)));
  } catch {
    /* ignore */
  }
}
