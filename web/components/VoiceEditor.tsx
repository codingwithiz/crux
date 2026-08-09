"use client";

import { useEffect, useState } from "react";
import { getSettings } from "@/lib/settings";
import { getVoice, saveVoice, DEFAULT_VOICE, VOICE_PRESETS } from "@/lib/voice";
import type { VoiceProfile } from "@/lib/types";

export function VoiceEditor() {
  const [samples, setSamples] = useState<string[]>([""]);
  const [guide, setGuide] = useState("");
  const [tone, setTone] = useState("");
  const [emoji, setEmoji] = useState(true);
  const [interests, setInterests] = useState<string[]>([]);
  const [interestDraft, setInterestDraft] = useState("");
  const [isDefault, setIsDefault] = useState(true);
  const [loaded, setLoaded] = useState(false);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  useEffect(() => {
    void (async () => {
      const v = await getVoice();
      const base: VoiceProfile = v ?? DEFAULT_VOICE;
      setSamples(base.samples.length ? base.samples : [""]);
      setGuide(base.guide ?? "");
      setTone(base.tone ?? "");
      setEmoji(base.emoji);
      setInterests(base.interests ?? []);
      setIsDefault(!v);
      setLoaded(true);
    })();
  }, []);

  function setSample(i: number, val: string) {
    setSamples((s) => s.map((x, k) => (k === i ? val : x)));
  }
  function addSample() {
    setSamples((s) => [...s, ""]);
  }
  function removeSample(i: number) {
    setSamples((s) => (s.length <= 1 ? [""] : s.filter((_, k) => k !== i)));
  }

  function cleanSamples(): string[] {
    return samples.map((s) => s.trim()).filter(Boolean);
  }

  function addInterest() {
    // Split on commas so pasting "agents, evals, robotics" does the obvious thing.
    const next = interestDraft
      .split(",")
      .map((k) => k.trim().toLowerCase())
      .filter((k) => k.length > 1 && !interests.includes(k));
    if (next.length) setInterests((cur) => [...cur, ...next].slice(0, 24));
    setInterestDraft("");
  }

  async function distill() {
    const clean = cleanSamples();
    if (!clean.length) {
      setMsg("Paste at least one writing sample first.");
      return;
    }
    setBusy(true);
    setMsg(null);
    try {
      const res = await fetch("/api/voice", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ samples: clean, settings: getSettings() }),
      });
      const j = (await res.json()) as { guide?: string; error?: string };
      if (!res.ok || !j.guide) {
        throw new Error(
          j.error === "no_model"
            ? "No model key — add one in the Model menu (top-right)."
            : j.error || "Distill failed",
        );
      }
      setGuide(j.guide);
      setMsg("Voice guide generated — review it, then Save.");
    } catch (e) {
      setMsg((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function save() {
    setBusy(true);
    setMsg(null);
    try {
      await saveVoice({
        samples: cleanSamples(),
        guide: guide.trim() || undefined,
        tone: tone.trim() || undefined,
        emoji,
        interests,
        updatedAt: new Date().toISOString(),
      });
      setIsDefault(false);
      setMsg("Saved — carousels sound like you, and your feed follows your interests.");
    } catch (e) {
      setMsg("Save failed: " + (e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function resetToDefault() {
    setSamples(DEFAULT_VOICE.samples);
    setGuide(DEFAULT_VOICE.guide ?? "");
    setTone(DEFAULT_VOICE.tone ?? "");
    setEmoji(DEFAULT_VOICE.emoji);
    setMsg("Loaded the built-in default — edit and Save to keep it.");
  }

  function applyPreset(p: { guide: string; tone: string; emoji: boolean }) {
    setGuide(p.guide);
    setTone(p.tone);
    setEmoji(p.emoji);
    setMsg("Loaded a preset — tweak it, add your samples, then Save.");
  }

  if (!loaded) return <p className="text-muted">Loading your voice…</p>;

  return (
    <div className="space-y-6">
      <div className="rounded-xl border border-line bg-surface/40 p-4 text-sm">
        <p className="font-medium">
          {isDefault ? "Using the built-in default voice" : "Using your saved voice"}
        </p>
        <p className="mt-1 text-muted">
          Paste a few of your real posts, distill them into a style guide, and every carousel the
          Expressor writes will match your voice — your hooks, rhythm, and tone. It only borrows
          STYLE; your committed thesis stays the opinion.
        </p>
      </div>

      <div>
        <label className="text-sm font-medium">Start from a preset</label>
        <div className="mt-2 flex flex-wrap gap-2">
          {VOICE_PRESETS.map((p) => (
            <button
              key={p.id}
              onClick={() => applyPreset(p)}
              title={p.blurb}
              className="rounded-lg border border-line px-3 py-1.5 text-xs text-muted transition hover:bg-surface hover:text-fg"
            >
              {p.name}
            </button>
          ))}
        </div>
      </div>

      <div>
        <div className="flex items-center justify-between">
          <label className="text-sm font-medium">Your writing samples</label>
          <button onClick={addSample} className="text-xs text-accent hover:underline">
            + Add sample
          </button>
        </div>
        <div className="mt-2 space-y-3">
          {samples.map((s, i) => (
            <div key={i} className="relative">
              <textarea
                value={s}
                onChange={(e) => setSample(i, e.target.value)}
                rows={4}
                placeholder="Paste one of your posts here…"
                className="w-full resize-y rounded-lg border border-line bg-ink px-3 py-2 text-sm outline-none focus:border-accent"
              />
              <button
                onClick={() => removeSample(i)}
                className="absolute right-2 top-2 rounded px-2 py-0.5 text-xs text-muted hover:text-red-400"
                title="Remove"
              >
                ✕
              </button>
            </div>
          ))}
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <button
          onClick={distill}
          disabled={busy}
          className="rounded-lg border border-line px-4 py-2 text-sm hover:bg-surface disabled:opacity-50"
        >
          {busy ? "Working…" : "Distill voice guide with AI"}
        </button>
        <button
          onClick={resetToDefault}
          className="text-xs text-muted underline-offset-4 hover:text-fg hover:underline"
        >
          Load the built-in default
        </button>
      </div>

      <div>
        <label className="text-sm font-medium">Interests</label>
        <p className="text-xs text-muted">
          Topics you want surfaced. Until you&rsquo;ve committed a few opinions there&rsquo;s nothing
          for the feed to learn from — these fill that gap, and keep steering it afterwards.
        </p>
        <div className="mt-2 flex gap-2">
          <input
            value={interestDraft}
            onChange={(e) => setInterestDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === ",") {
                e.preventDefault();
                addInterest();
              }
            }}
            placeholder="agents, evals, robotics…"
            aria-label="Add an interest"
            className="w-full rounded-lg border border-line bg-ink px-3 py-2 text-sm outline-none focus:border-accent"
          />
          <button
            onClick={addInterest}
            disabled={!interestDraft.trim()}
            className="shrink-0 rounded-lg border border-line px-4 py-2 text-sm hover:bg-surface disabled:opacity-50"
          >
            Add
          </button>
        </div>
        {interests.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-2">
            {interests.map((k) => (
              <button
                key={k}
                onClick={() => setInterests((cur) => cur.filter((x) => x !== k))}
                title={`Remove ${k}`}
                className="rounded-lg border border-accent bg-accent/10 px-3 py-1.5 text-xs text-fg transition hover:border-red-400/60 hover:text-red-300"
              >
                {k} <span aria-hidden>×</span>
              </button>
            ))}
          </div>
        )}
      </div>

      <div>
        <label className="text-sm font-medium">Voice guide</label>
        <p className="text-xs text-muted">
          The distilled style the Expressor follows. Edit freely — this is what actually steers the
          writing.
        </p>
        <textarea
          value={guide}
          onChange={(e) => setGuide(e.target.value)}
          rows={10}
          placeholder="Distill from your samples, or write your own style notes here…"
          className="mt-2 w-full resize-y rounded-lg border border-line bg-ink px-3 py-2 font-mono text-xs outline-none focus:border-accent"
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="text-sm font-medium">Tone (optional)</label>
          <input
            value={tone}
            onChange={(e) => setTone(e.target.value)}
            placeholder="energetic, concrete, humble-confident"
            className="mt-1 w-full rounded-lg border border-line bg-ink px-3 py-2 text-sm outline-none focus:border-accent"
          />
        </div>
        <label className="flex cursor-pointer items-center gap-2 self-end pb-2 text-sm">
          <input type="checkbox" checked={emoji} onChange={(e) => setEmoji(e.target.checked)} />
          Allow tasteful emojis
        </label>
      </div>

      <div className="flex items-center gap-3">
        <button
          onClick={save}
          disabled={busy}
          className="rounded-lg bg-accent px-5 py-2.5 text-sm font-medium text-accent-fg hover:brightness-110 disabled:opacity-50"
        >
          {busy ? "Saving…" : "Save"}
        </button>
        {msg && <span className="text-sm text-cool">{msg}</span>}
      </div>
    </div>
  );
}
