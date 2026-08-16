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
import { isPublicPath, publicOrigin } from "../lib/auth-paths";

test("only the landing and auth routes are public", () => {
  // /guide is documentation: no user data, no model key. It is linked from the
  // public landing page, where gating it bounced visitors to /login.
  for (const p of ["/", "/login", "/auth/callback", "/guide"]) {
    expect(isPublicPath(p), p).toBe(true);
  }
  for (const p of ["/today", "/explore", "/think", "/studio", "/ledger", "/voice", "/gallery"]) {
    expect(isPublicPath(p), p).toBe(false);
  }
});

/**
 * The OAuth callback used to hardcode `https://` onto x-forwarded-host. That is
 * correct on Vercel and wrong in `next dev`, which sets the same header on a
 * plain-HTTP server — so signing in with Google locally bounced the user to
 * https://localhost:3000, which nothing is listening on.
 */
test("the post-OAuth origin is https for a real host and http only for loopback", () => {
  const url = "http://10.0.0.1/auth/callback?code=x";

  for (const h of ["localhost:3000", "127.0.0.1:3000", "localhost", "[::1]:3000"]) {
    expect(publicOrigin(h, url), h).toBe(`http://${h}`);
  }

  // A deployment must never be downgraded, including by a lookalike hostname.
  for (const h of ["crux-content-engine.vercel.app", "crux.dev", "localhost.evil.com", "127.0.0.1.evil.com"]) {
    expect(publicOrigin(h, url), h).toBe(`https://${h}`);
  }

  // No forwarded host (a direct request): fall back to the request's own origin.
  expect(publicOrigin(null, "http://localhost:3000/auth/callback?code=x")).toBe(
    "http://localhost:3000",
  );
});
