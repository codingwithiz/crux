"use client";

import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

/**
 * A page settling into place on navigation.
 *
 * Route changes were the largest state change in the app and the only one with
 * no transition at all — every link was a hard cut. Keying on the pathname
 * remounts the subtree, which replays the CSS animation; no library, no
 * measurement, ~10 lines.
 *
 * Deliberately not View Transitions: `experimental.viewTransition` exists in
 * Next 16.2 but React 19.2 does not ship `unstable_ViewTransition`, so turning
 * it on requires the React experimental channel. When that lands, the
 * shared-element morph (a take growing into its deck) is the upgrade, and this
 * wrapper is what it replaces.
 */
export function RouteTransition({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  return (
    <div key={pathname} className="ce-route-enter">
      {children}
    </div>
  );
}
