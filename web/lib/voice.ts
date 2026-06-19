import type { VoiceProfile } from "./types";
import { createClient, supabaseConfigured } from "./supabase/client";

const KEY = "ce.voice";

/**
 * The built-in default voice, distilled from the founder's own LinkedIn posts.
 * This is the "me-first" seed: out of the box the Expressor already writes with
 * a real, opinionated style. Signed-in users can replace it with their own.
 */
export const DEFAULT_VOICE_GUIDE = `Write like an energetic, achievement-driven engineer who tells a story and isn't afraid to show the struggle. Specifically:
- HOOK: open with a bold, specific line — a transformation arc ("From almost giving up to…"), a hard number/result, or a provocative quote. Make it earned, never clickbait.
- Be relentlessly concrete: use real numbers, names, and specifics over vague claims. Precision is the flex.
- Humble-confident: own the mistakes and the hard parts plainly ("we learned things the hard way"), then show the growth. Confidence comes from the work, not bravado. A line like "we're still far from experts, but…" fits.
- Structure payoffs as tight, bold-headed takeaways (1, 2, 3) — a short label + one punchy sentence each.
- Use rhetorical teasers to create rhythm: "The wild part?", "The twist?", "Here's what changed." Then deliver.
- Allow a reflective turn — pause to question the obvious, then pull out a broader principle.
- Energetic and a little playful: light, natural slang and humor are welcome ("absolute cinema", "goated", "haha"), never forced or cringe.
- Forward-looking close: end with momentum and an invitation, not a hard sell.
Above all: this expresses the user's OWN committed thesis. Match the STYLE, never fabricate achievements, numbers, or opinions that aren't in the thesis.`;

/** A couple of short hooks from the corpus — light few-shot flavor for the model. */
export const DEFAULT_VOICE_SAMPLES = [
  "From Zero to 2nd in the World in 2 Months — we ranked 2nd globally in a Kaggle competition against 250+ teams. The wild part? We moved from 3rd to 2nd on the private leaderboard by just 0.0003 (absolute cinema). The twist? We were completely new to Machine Learning. It all started with curiosity.",
  "From almost giving up to becoming the Grand Winner at APAC. A few takeaways from 11 months of building: 1) System Design — this is where vibe coding won't replace you. 2) Error Handling & Testing — we ran thousands of test runs and obsessed over UX. 3) Extreme Ownership — countless discussions debating every approach. Taking that level of ownership is what pushed us across the finish line.",
];

export const DEFAULT_VOICE: VoiceProfile = {
  samples: DEFAULT_VOICE_SAMPLES,
  guide: DEFAULT_VOICE_GUIDE,
  tone: "energetic, concrete, humble-confident, lightly playful",
  emoji: true,
  updatedAt: "default",
};

/** One-click starting points so a user gets a distinct voice without samples. */
export interface VoicePreset {
  id: string;
  name: string;
  blurb: string;
  guide: string;
  tone: string;
  emoji: boolean;
}
export const VOICE_PRESETS: VoicePreset[] = [
  {
    id: "operator",
    name: "Punchy operator",
    blurb: "Direct, concrete, results-first.",
    tone: "direct, concrete, confident, no fluff",
    emoji: false,
    guide:
      "Write like a sharp operator who respects the reader's time. Open with the point, never a wind-up. Short declarative sentences, one idea per line. Concrete nouns, real numbers, named specifics over adjectives. End on the implication, not a summary. No hedging, no hype, no emoji.",
  },
  {
    id: "analyst",
    name: "Calm analyst",
    blurb: "Measured, precise, evidence-led.",
    tone: "measured, precise, neutral, evidence-led",
    emoji: false,
    guide:
      "Write like a careful analyst. Lead with the claim, then the evidence. Define any term in a few words. Separate what is known from what is uncertain. Prefer 'because' and 'so' over drama. Calm and exact — no exclamation marks, no emoji. Close with the so-what.",
  },
  {
    id: "builder",
    name: "Playful builder",
    blurb: "Energetic, story-driven, a little fun.",
    tone: "energetic, concrete, humble-confident, lightly playful",
    emoji: true,
    guide:
      "Write like an energetic builder telling a story. Bold, specific hook — a transformation arc or a hard number. Show the struggle and the lesson. Use rhetorical teasers ('The wild part?') then deliver. Tight, bold-headed takeaways. Light, natural humor and the occasional emoji — never forced. Forward-looking close.",
  },
  {
    id: "academic",
    name: "Clear academic",
    blurb: "Rigorous but readable.",
    tone: "rigorous, structured, plain, didactic",
    emoji: false,
    guide:
      "Write like a great teacher: rigorous but plain. Build from first principles, one step at a time. Define terms, give a concrete example for each abstract point, and state assumptions. Structured and numbered where it helps. No jargon for its own sake, no emoji. End with the general principle.",
  },
];

function localRead(): VoiceProfile | null {
  try {
    const raw = window.localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as VoiceProfile) : null;
  } catch {
    return null;
  }
}
function localWrite(v: VoiceProfile) {
  try {
    window.localStorage.setItem(KEY, JSON.stringify(v));
  } catch {
    /* ignore */
  }
}

interface Row {
  samples: string[] | null;
  guide: string | null;
  tone: string | null;
  emoji: boolean | null;
  updated_at: string;
}
function rowToVoice(r: Row): VoiceProfile {
  return {
    samples: r.samples ?? [],
    guide: r.guide ?? undefined,
    tone: r.tone ?? undefined,
    emoji: r.emoji ?? true,
    updatedAt: r.updated_at,
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

/** The user's saved voice, or null if they haven't set one (then use DEFAULT_VOICE). */
export async function getVoice(): Promise<VoiceProfile | null> {
  const uid = await currentUserId();
  if (!uid) return localRead();
  const { data, error } = await createClient()
    .from("user_voice")
    .select("samples,guide,tone,emoji,updated_at")
    .eq("user_id", uid)
    .maybeSingle();
  if (error || !data) return null;
  return rowToVoice(data as Row);
}

export async function saveVoice(v: VoiceProfile): Promise<void> {
  const next = { ...v, updatedAt: new Date().toISOString() };
  const uid = await currentUserId();
  if (!uid) return localWrite(next);
  await createClient()
    .from("user_voice")
    .upsert(
      {
        user_id: uid,
        samples: next.samples,
        guide: next.guide ?? null,
        tone: next.tone ?? null,
        emoji: next.emoji,
        updated_at: next.updatedAt,
      },
      { onConflict: "user_id" },
    );
}

/** What the Expressor should actually use: the saved voice, else the default. */
export function effectiveVoice(v: VoiceProfile | null): VoiceProfile {
  if (!v || (!v.guide && v.samples.length === 0)) return DEFAULT_VOICE;
  return v;
}
