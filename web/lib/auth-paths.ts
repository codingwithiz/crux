/**
 * Which paths a signed-out visitor may see.
 *
 * Everything else is private: the pages hold your ledger, and the routes behind
 * them spend the server's model key. Kept here rather than inline in proxy.ts so
 * the rule has one definition and can be asserted directly — the browser suite
 * runs against an unconfigured server where the gate is deliberately inert, so
 * it cannot notice this rule regressing.
 */
export function isPublicPath(pathname: string): boolean {
  return (
    pathname === "/" ||
    pathname === "/login" ||
    // The landing page's second CTA is "See how it works" → /guide, and it was
    // bouncing signed-out visitors to /login. The guide holds no user data and
    // spends no model key; it is documentation.
    pathname === "/guide" ||
    pathname.startsWith("/auth")
  );
}

const LOCAL_HOST = /^(localhost|127\.0\.0\.1|\[::1\])(:\d+)?$/;

/**
 * The origin to send a user back to after the OAuth exchange.
 *
 * On Vercel `request.url`'s origin is an internal hostname, so the public host
 * has to come from `x-forwarded-host`. That part was right; the scheme was
 * hardcoded to `https`, and `next dev` also sets `x-forwarded-host` — so every
 * local Google sign-in was redirected to `https://localhost:3000`, which the
 * plain-HTTP dev server is not listening on.
 *
 * The scheme is decided by the host rather than by `x-forwarded-proto`: a
 * client can put any value in a forwarded header, and "https unless the host is
 * loopback" cannot be talked into downgrading a real deployment.
 */
export function publicOrigin(forwardedHost: string | null, requestUrl: string): string {
  if (!forwardedHost) return new URL(requestUrl).origin;
  return `${LOCAL_HOST.test(forwardedHost) ? "http" : "https"}://${forwardedHost}`;
}
