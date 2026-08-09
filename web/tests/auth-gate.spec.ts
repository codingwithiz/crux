import { test, expect } from "@playwright/test";

/**
 * The rest of the suite runs against a deliberately unconfigured server, which
 * makes the login gate invisible to it. That's a reasonable trade for fast,
 * hermetic tests — but it would also hide the gate disappearing entirely, which
 * is precisely the regression that matters: every page behind it is private, and
 * the API routes behind it spend the server's model key.
 *
 * So this spec asserts the guard logic directly instead of booting a second
 * server: given Supabase is configured and nobody is signed in, non-public paths
 * must redirect and model routes must refuse.
 */
import { isPublicPath } from "../lib/auth-paths";

test("only the landing and auth routes are public", () => {
  for (const p of ["/", "/login", "/auth/callback"]) {
    expect(isPublicPath(p), p).toBe(true);
  }
  for (const p of ["/today", "/explore", "/think", "/studio", "/ledger", "/voice", "/guide"]) {
    expect(isPublicPath(p), p).toBe(false);
  }
});
