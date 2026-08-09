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
  return pathname === "/" || pathname === "/login" || pathname.startsWith("/auth");
}
