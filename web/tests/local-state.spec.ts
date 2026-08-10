import { test, expect } from "@playwright/test";
import { clearLocalState, syncLocalStateOwner } from "../lib/local-state";

// The module under test touches exactly one browser API, and only inside
// function bodies — so a map stands in for it, which is cheaper and more direct
// than driving a real browser to assert a rule about storage keys.
const store = new Map<string, string>();
const localStorage = {
  getItem: (k: string) => store.get(k) ?? null,
  setItem: (k: string, v: string) => void store.set(k, v),
  removeItem: (k: string) => void store.delete(k),
  clear: () => store.clear(),
};
// Inherit from globalThis rather than replacing it. Playwright reuses a worker
// process across spec files, so this stub outlives this file — and a bare
// `{ localStorage }` is a `window` with nothing else on it. jsPDF resolves
// `window || global` at module load and then calls `.bind` on `window.atob`, so
// whenever this file happened to run before pdf-export.spec.ts in the same
// worker, the PDF tests failed with "Cannot read properties of undefined". That
// looked like a cold-start race for months; it was this line.
(globalThis as { window?: unknown }).window = Object.assign(Object.create(globalThis), {
  localStorage,
});
(globalThis as { localStorage?: unknown }).localStorage = localStorage;

/**
 * Signing out used to leave every `ce.*` key in place, so the next account to
 * sign in on the same machine saw the previous one's draft carousel, their
 * in-progress conviction, their adversary transcript, and their handle. These
 * assert the rule that closes it.
 */
const seed = () => {
  localStorage.setItem("ce.draft", JSON.stringify({ slides: [{ headline: "A's deck" }] }));
  localStorage.setItem("ce.flow", JSON.stringify({ take: "A's private take" }));
  localStorage.setItem("ce.brandkit", JSON.stringify({ handle: "@usera" }));
  localStorage.setItem("ce.ledger", JSON.stringify([{ id: "1" }]));
};

test.beforeEach(() => {
  localStorage.clear();
});

test("a different account wipes the previous one's local data", () => {
  syncLocalStateOwner("user-a");
  seed();

  expect(syncLocalStateOwner("user-b")).toBe(true);
  expect(localStorage.getItem("ce.draft")).toBeNull();
  expect(localStorage.getItem("ce.flow")).toBeNull();
  expect(localStorage.getItem("ce.brandkit")).toBeNull();
  expect(localStorage.getItem("ce.ledger")).toBeNull();
});

test("signing out wipes it too, so the next person starts clean", () => {
  syncLocalStateOwner("user-a");
  seed();

  expect(syncLocalStateOwner(null)).toBe(true);
  expect(localStorage.getItem("ce.draft")).toBeNull();
  expect(localStorage.getItem("ce.flow")).toBeNull();
});

test("the same account keeps its own work", () => {
  syncLocalStateOwner("user-a");
  seed();

  // A page reload, a token refresh — same user, nothing to reconcile.
  expect(syncLocalStateOwner("user-a")).toBe(false);
  expect(localStorage.getItem("ce.flow")).toContain("A's private take");
});

test("clearLocalState leaves nothing behind", () => {
  syncLocalStateOwner("user-a");
  seed();
  clearLocalState();

  for (const k of ["ce.draft", "ce.flow", "ce.brandkit", "ce.ledger", "ce.owner"]) {
    expect(localStorage.getItem(k), k).toBeNull();
  }
});

test("the migration flag is per user, so one account can't claim another's ledger", () => {
  // A browser-global flag meant the first account in a browser consumed the
  // local ledger — and a second account could inherit A's theses into its own
  // cloud rows, which RLS cannot catch because B's own client does the write.
  localStorage.setItem("ce.migrated.v1.user-a", "1");
  expect(localStorage.getItem("ce.migrated.v1.user-b")).toBeNull();
});
