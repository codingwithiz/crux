import type { Carousel, Slide } from "./types";
import { createClient, supabaseConfigured } from "./supabase/client";

const KEY = "ce.carousels";

function localList(): Carousel[] {
  try {
    const raw = window.localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as Carousel[]) : [];
  } catch {
    return [];
  }
}
function localWrite(all: Carousel[]) {
  try {
    window.localStorage.setItem(KEY, JSON.stringify(all));
  } catch {
    /* ignore */
  }
}

interface Row {
  id: string;
  title: string;
  slides: Slide[];
  theme_id: string;
  handle: string;
  created_at: string;
}
function rowToCarousel(r: Row): Carousel {
  return {
    id: r.id,
    title: r.title,
    slides: r.slides ?? [],
    themeId: r.theme_id,
    handle: r.handle,
    createdAt: r.created_at,
  };
}

async function currentUserId(): Promise<string | null> {
  if (!supabaseConfigured()) return null;
  try {
    const { data } = await createClient().auth.getUser();
    return data.user?.id ?? null;
  } catch {
    return null;
  }
}

/** Saved carousels — cloud (Supabase, per-user) when signed in, localStorage otherwise. */
export async function listCarousels(): Promise<Carousel[]> {
  const uid = await currentUserId();
  if (!uid) return localList();
  const { data, error } = await createClient()
    .from("carousels")
    .select("*")
    .order("created_at", { ascending: false });
  if (error || !data) return [];
  return (data as Row[]).map(rowToCarousel);
}

export async function getCarousel(id: string): Promise<Carousel | null> {
  const uid = await currentUserId();
  if (!uid) return localList().find((c) => c.id === id) ?? null;
  const { data, error } = await createClient()
    .from("carousels")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (error || !data) return null;
  return rowToCarousel(data as Row);
}

export async function saveCarousel(c: Carousel): Promise<void> {
  const uid = await currentUserId();
  if (!uid) {
    const all = localList();
    const i = all.findIndex((x) => x.id === c.id);
    if (i >= 0) all[i] = c;
    else all.unshift(c);
    localWrite(all);
    return;
  }
  await createClient()
    .from("carousels")
    .upsert(
      {
        id: c.id,
        user_id: uid,
        title: c.title,
        slides: c.slides,
        theme_id: c.themeId,
        handle: c.handle,
        created_at: c.createdAt,
      },
      { onConflict: "id" },
    );
}

export async function removeCarousel(id: string): Promise<void> {
  const uid = await currentUserId();
  if (!uid) return localWrite(localList().filter((c) => c.id !== id));
  await createClient().from("carousels").delete().eq("id", id);
}
