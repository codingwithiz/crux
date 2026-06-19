"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient, supabaseConfigured } from "@/lib/supabase/client";
import { migrateLocalToCloud } from "@/lib/migrate";

export function AuthButton() {
  const router = useRouter();
  const [email, setEmail] = useState<string | null>(null);
  // Lazy init avoids a synchronous setState in the effect (cascading renders).
  const [ready, setReady] = useState(() => !supabaseConfigured());

  useEffect(() => {
    if (!supabaseConfigured()) return;
    const supabase = createClient();
    supabase.auth.getUser().then(({ data }) => {
      setEmail(data.user?.email ?? null);
      setReady(true);
      if (data.user) void migrateLocalToCloud();
    });
    const { data: sub } = supabase.auth.onAuthStateChange((event, session) => {
      setEmail(session?.user?.email ?? null);
      if (event === "SIGNED_IN") void migrateLocalToCloud();
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  // Cloud not configured → nothing to show (localStorage mode).
  if (!supabaseConfigured() || !ready) return null;

  if (email) {
    return (
      <button
        onClick={async () => {
          await createClient().auth.signOut();
          setEmail(null);
          router.refresh();
        }}
        className="ml-1 rounded-md border border-line px-3 py-1.5 text-sm text-muted transition hover:bg-surface hover:text-fg"
        title={email}
      >
        {email.split("@")[0]} · sign out
      </button>
    );
  }

  return (
    <Link
      href="/login"
      className="ml-1 rounded-md border border-line px-3 py-1.5 text-sm text-fg transition hover:bg-surface"
    >
      Sign in
    </Link>
  );
}
