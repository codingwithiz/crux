import type { Carousel } from "./types";
import { coerceSlides } from "./carousel/convert";
import { createClient, supabaseConfigured } from "./supabase/client";

const KEY = "ce.carousels";

// Postgres `id` columns are uuid; legacy localStorage records used nanoid. Coerce
// so a stray non-uuid id can never crash the insert. (Phase 2 cloud migration owns
// the persistent remap of any legacy local data.)
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
function toUuid(id: string): string {
  return UUID_RE.test(id) ? id : crypto.randomUUID();
}

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
  slides: unknown[];
  theme_id: string;
  handle: string;
  created_at: string;
  image_urls?: string[] | null;
}
function rowToCarousel(r: Row): Carousel {
  return {
    id: r.id,
    title: r.title,
    slides: coerceSlides(r.slides ?? []),
    designId: r.theme_id,
    handle: r.handle,
    createdAt: r.created_at,
    imageUrls: r.image_urls ?? undefined,
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
  // Surface a real failure (e.g. missing table / RLS) instead of an empty list.
  if (error) throw new Error(`Couldn't load carousels: ${error.message}`);
  return ((data as Row[]) ?? []).map(rowToCarousel);
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
  const { error } = await createClient()
    .from("carousels")
    .upsert(
      {
        id: toUuid(c.id),
        user_id: uid,
        title: c.title,
        slides: c.slides,
        theme_id: c.designId,
        handle: c.handle,
        created_at: c.createdAt,
        image_urls: c.imageUrls ?? [],
      },
      { onConflict: "id" },
    );
  // Don't pretend it saved — let the Studio show the real reason (RLS, missing
  // migration, etc.) so a "saved" carousel can't silently vanish from the Library.
  if (error) throw new Error(error.message);
}

/**
 * Upload the rendered slide PNGs to the public `carousels` storage bucket under
 * the signed-in user's folder and return their public URLs. No-op (returns [])
 * when not signed in or Storage isn't reachable — the caller falls back to the
 * Gallery's on-demand re-render. Path: "{uid}/{carouselId}/slide-NN.png".
 */
export async function uploadCarouselImages(
  carouselId: string,
  blobs: Blob[],
): Promise<string[]> {
  const uid = await currentUserId();
  if (!uid || blobs.length === 0) return [];
  const supabase = createClient();
  const urls: string[] = [];
  for (let i = 0; i < blobs.length; i++) {
    const path = `${uid}/${carouselId}/slide-${String(i + 1).padStart(2, "0")}.png`;
    const { error } = await supabase.storage
      .from("carousels")
      .upload(path, blobs[i], { contentType: "image/png", upsert: true });
    if (error) return []; // storage not set up (run 0005) — degrade gracefully
    urls.push(supabase.storage.from("carousels").getPublicUrl(path).data.publicUrl);
  }
  return urls;
}

export async function removeCarousel(id: string): Promise<void> {
  const uid = await currentUserId();
  if (!uid) return localWrite(localList().filter((c) => c.id !== id));
  const supabase = createClient();
  // Best-effort: clear the carousel's image folder before dropping the row.
  try {
    const folder = `${uid}/${id}`;
    const { data } = await supabase.storage.from("carousels").list(folder);
    if (data?.length) {
      await supabase.storage.from("carousels").remove(data.map((f) => `${folder}/${f.name}`));
    }
  } catch {
    /* storage not set up — ignore */
  }
  await supabase.from("carousels").delete().eq("id", id);
}
