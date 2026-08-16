"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Plate, PlateLabel } from "@/components/ui/Plate";
import { Mark, Underline } from "@/components/ui/Ink";
import { Skeleton } from "@/components/Skeleton";

/**
 * The design lab. Development only.
 *
 * Phase 0 of the redesign is almost entirely infrastructure — tokens, two new
 * primitives, six motion utilities — and infrastructure is invisible until a
 * surface uses it. This page makes it visible, so the material can be judged
 * (and rejected) before five product surfaces get rebuilt on top of it.
 *
 * Not linked from anywhere and compiled out of production: `process.env.NODE_ENV`
 * is inlined into the client bundle at build time, so this whole tree drops.
 */
export default function Lab() {
  const [replay, setReplay] = useState(0);
  if (process.env.NODE_ENV === "production") return null;

  return (
    <div className="mx-auto max-w-5xl px-5 py-12">
      <p className="font-mono text-micro uppercase tracking-eyebrow text-accent">dev only</p>
      <h1 className="mt-1 font-serif text-display font-semibold">Design lab</h1>
      <p className="mt-3 max-w-2xl text-muted">
        Phase 0. Everything below is new. The question to answer here is the one that decides
        the next five phases: does paper-on-ink read as premium, or as cosy?
      </p>

      <Section title="1 · Two materials">
        <p className="mb-4 text-sm text-muted">
          Left is chrome. Right is the user&rsquo;s own work. Today the whole app is the left one.
        </p>
        <div className="grid gap-5 sm:grid-cols-2">
          <Card feature>
            <p className="font-mono text-micro uppercase tracking-eyebrow text-accent">Card · ink</p>
            <h3 className="mt-2 font-serif text-title font-semibold">
              Agents will eat the dashboard
            </h3>
            <p className="mt-2 text-sm text-muted">
              A panel the product puts around something. Flat, cold, recedes.
            </p>
          </Card>

          <Plate key={`plate-${replay}`} arrive>
            <PlateLabel>Plate · paper</PlateLabel>
            <h3 className="mt-2 font-serif text-title font-semibold">
              Agents will <Mark>eat the dashboard</Mark>, not the database
            </h3>
            <p className="mt-2 text-sm text-paper-muted">
              The thing itself. Warm, grained, raised, casts a real shadow.
            </p>
            <p className="mt-4 text-sm">
              <Underline key={`u-${replay}`} draw>
                I&rsquo;d change my mind if
              </Underline>{" "}
              auditability turns out to be the product.
            </p>
          </Plate>
        </div>
      </Section>

      <Section title="2 · Motion">
        <div className="mb-4 flex items-center gap-3">
          <Button variant="primary" size="sm" onClick={() => setReplay((n) => n + 1)}>
            Replay all
          </Button>
          <span className="text-sm text-muted">
            Also try it with reduced motion on — everything below should go instant.
          </span>
        </div>
        <div key={replay} className="grid gap-3 sm:grid-cols-3">
          {MOTION.map((m, i) => (
            <div key={m.cls} className="rounded-surface border border-line bg-surface/40 p-4">
              <div className={`${m.cls} rounded-control bg-accent/15 p-3 text-center`} style={{ "--i": i } as React.CSSProperties}>
                <code className="font-mono text-micro text-accent">.{m.cls}</code>
              </div>
              <p className="mt-2 text-micro text-muted">{m.note}</p>
            </div>
          ))}
        </div>
      </Section>

      <Section title="3 · Buttons — the disabled fix">
        <p className="mb-4 text-sm text-muted">
          The middle one is the fix. It used to be amber at 50% opacity: a muddy olive that still
          read as a filled button you could press. /think opened with exactly that.
        </p>
        <div className="flex flex-wrap items-center gap-3">
          <Button variant="primary">Primary</Button>
          <Button variant="primary" disabled>
            Unavailable
          </Button>
          <Button variant="primary" loading loadingLabel="Breaking it down…">
            Break it down
          </Button>
          <Button>Secondary</Button>
          <Button variant="ghost">Ghost</Button>
          <Button variant="danger">Danger</Button>
        </div>
      </Section>

      <Section title="4 · Loading">
        <div className="grid gap-5 sm:grid-cols-2">
          <div>
            <p className="mb-2 text-micro uppercase tracking-eyebrow text-muted">Now — pulse</p>
            <div className="space-y-2 rounded-surface border border-line p-4">
              <Skeleton className="h-4 w-2/3" />
              <Skeleton className="h-3 w-full" />
              <Skeleton className="h-3 w-4/5" />
            </div>
          </div>
          <div>
            <p className="mb-2 text-micro uppercase tracking-eyebrow text-accent">Phase 3 — shimmer</p>
            <div className="space-y-2 rounded-surface border border-line p-4">
              {["h-4 w-2/3", "h-3 w-full", "h-3 w-4/5"].map((c) => (
                <div key={c} className={`ce-shimmer rounded-control bg-surface-3/60 ${c}`} />
              ))}
            </div>
          </div>
        </div>
      </Section>

      <Section title="5 · Tokens">
        <div className="grid gap-6 sm:grid-cols-2">
          <div>
            <p className="mb-2 text-micro uppercase tracking-eyebrow text-muted">Radii — seven became three</p>
            {/* Written out rather than interpolated: Tailwind scans source text,
                so a `rounded-${r}` template produces no CSS at all. */}
            <div className="flex items-end gap-3">
              {[
                ["rounded-control", "control · 8px"],
                ["rounded-surface", "surface · 14px"],
                ["rounded-plate", "plate · 20px"],
              ].map(([cls, label]) => (
                <div key={cls} className="text-center">
                  <div className={`h-16 w-16 border border-line bg-surface-2 ${cls}`} />
                  <code className="mt-1 block font-mono text-micro text-muted">{label}</code>
                </div>
              ))}
            </div>
          </div>
          <div>
            <p className="mb-2 text-micro uppercase tracking-eyebrow text-muted">Paper — same values a slide uses</p>
            <div className="flex gap-2">
              {["bg-paper", "bg-paper-2", "bg-paper-fg", "bg-paper-muted"].map((c) => (
                <div key={c} className={`h-16 flex-1 rounded-control border border-line ${c}`} />
              ))}
            </div>
          </div>
        </div>
      </Section>
    </div>
  );
}

const MOTION = [
  { cls: "ce-arrive", note: "Paper landing — the cast shadow blooms in as it settles." },
  { cls: "ce-stream-in", note: "A streamed token arriving. Reads as speech, not a repaint." },
  { cls: "ce-stagger", note: "Sequenced list entry. Used once today; Phase 1 stages synthesis with it." },
  { cls: "ce-fade-up", note: "The existing enter, now on the token curve rather than plain ease." },
  { cls: "ce-route-enter", note: "Page arrival. Smaller on purpose — a page should settle, not perform." },
  { cls: "ce-crossfade", note: "Label swapping in place. ProgressSteps hard-swaps today." },
];

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="ce-rule mt-12 pt-6">
      <h2 className="mb-4 font-serif text-title font-semibold">{title}</h2>
      {children}
    </section>
  );
}
