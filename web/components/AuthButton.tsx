"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient, supabaseConfigured } from "@/lib/supabase/client";

export function AuthButton() {
  const router = useRouter();
  const [email, setEmail] = useState<string | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (!supabaseConfigured()) {
      setReady(true);
      return;
    }
    const supabase = createClient();
    supabase.auth.getUser().then(({ data }) => {
      setEmail(data.user?.email ?? null);
      setReady(true);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      setEmail(session?.user?.email ?? null);
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
