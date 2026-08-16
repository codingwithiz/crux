"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient, supabaseConfigured } from "@/lib/supabase/client";
import { migrateLocalToCloud } from "@/lib/migrate";
import { clearLocalState, syncLocalStateOwner } from "@/lib/local-state";

export function AuthButton() {
  const router = useRouter();
  const [email, setEmail] = useState<string | null>(null);
  // Lazy init avoids a synchronous setState in the effect (cascading renders).
  const [ready, setReady] = useState(() => !supabaseConfigured());

  useEffect(() => {
    if (!supabaseConfigured()) return;
    const supabase = createClient();

    // Whoever is signed in owns this browser's local data. When that changes —
    // sign-in, sign-out, or a different account — the previous user's drafts,
    // in-progress conviction and handle are cleared before anything renders
    // them. Reload after a wipe so nothing already on screen is stale.
    const reconcile = (userId: string | null) => {
      if (syncLocalStateOwner(userId) && userId) router.refresh();
    };

    supabase.auth.getUser().then(({ data }) => {
      const user = data.user ?? null;
      reconcile(user?.id ?? null);
      setEmail(user?.email ?? null);
      setReady(true);
      if (user) void migrateLocalToCloud(user.id);
    });

    const { data: sub } = supabase.auth.onAuthStateChange((event, session) => {
      const user = session?.user ?? null;
      reconcile(user?.id ?? null);
      setEmail(user?.email ?? null);
      if (event === "SIGNED_IN" && user) void migrateLocalToCloud(user.id);
    });
    return () => sub.subscription.unsubscribe();
  }, [router]);

  // Cloud not configured → nothing to show (localStorage mode).
  if (!supabaseConfigured() || !ready) return null;

  if (email) {
    return (
      <button
        onClick={async () => {
          await createClient().auth.signOut();
          // Don't wait for the auth event: the next render must not be able to
          // read this user's drafts or in-progress conviction.
          clearLocalState();
          setEmail(null);
          router.refresh();
        }}
        className="ml-1 rounded-control border border-line px-3 py-1.5 text-sm text-muted transition hover:bg-surface hover:text-fg"
        title={email}
      >
        {email.split("@")[0]} · sign out
      </button>
    );
  }

  return (
    <Link
      href="/login"
      className="ml-1 rounded-control border border-line px-3 py-1.5 text-sm text-fg transition hover:bg-surface"
    >
      Sign in
    </Link>
  );
}
