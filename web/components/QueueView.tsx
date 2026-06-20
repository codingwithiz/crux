"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { CalendarClock, ExternalLink, Send, X as XIcon } from "lucide-react";
import { toast } from "sonner";
import { listCarousels, scheduleCarousel } from "@/lib/carousels";
import { manualPublisher, PLATFORMS, type Platform } from "@/lib/publish";
import { EmptyState } from "@/components/EmptyState";
import { Skeleton } from "@/components/Skeleton";
import type { Carousel } from "@/lib/types";

function captionFor(c: Carousel): string {
  return c.title || c.slides[0]?.headline || "My take";
}

export function QueueView() {
  const [items, setItems] = useState<Carousel[] | null>(null);

  function load() {
    listCarousels()
      .then(setItems)
      .catch(() => setItems([]));
  }
  useEffect(() => {
    load();
  }, []);

  async function setDate(c: Carousel, value: string) {
    await scheduleCarousel(c.id, value ? new Date(value).toISOString() : undefined);
    load();
  }

  function publish(c: Carousel, platform: Platform) {
    const r = manualPublisher.publish({ platform, caption: captionFor(c) });
    if (r.ok) toast.success(r.message);
    else toast.error(r.message);
  }

  const { scheduled, backlog } = useMemo(() => {
    const all = items ?? [];
    return {
      scheduled: all
        .filter((c) => c.scheduledAt)
        .sort((a, b) => (a.scheduledAt! < b.scheduledAt! ? -1 : 1)),
      backlog: all.filter((c) => !c.scheduledAt),
    };
  }, [items]);

  if (!items)
    return (
      <div className="space-y-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-24" />
        ))}
      </div>
    );
  if (!items.length)
    return (
      <EmptyState
        icon={CalendarClock}
        title="Nothing to schedule yet"
        description="Make a carousel, then plan when to post it — your scheduled queue lives here."
        cta={{ href: "/studio", label: "Open the Studio" }}
      />
    );

  return (
    <div className="space-y-6">
      <section>
        <h2 className="font-mono text-xs uppercase tracking-wide text-accent">Scheduled</h2>
        {scheduled.length === 0 ? (
          <p className="mt-2 rounded-xl border border-dashed border-line p-4 text-sm text-muted">
            Nothing scheduled yet. Set a date on a carousel below to queue it.
          </p>
        ) : (
          <div className="mt-3 space-y-2">
            {scheduled.map((c) => (
              <Row key={c.id} c={c} onDate={setDate} onPublish={publish} />
            ))}
          </div>
        )}
      </section>

      {backlog.length > 0 && (
        <section>
          <h2 className="font-mono text-xs uppercase tracking-wide text-muted">Backlog</h2>
          <div className="mt-3 space-y-2">
            {backlog.map((c) => (
              <Row key={c.id} c={c} onDate={setDate} onPublish={publish} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

function Row({
  c,
  onDate,
  onPublish,
}: {
  c: Carousel;
  onDate: (c: Carousel, value: string) => void;
  onPublish: (c: Carousel, platform: Platform) => void;
}) {
  return (
    <div className="rounded-xl border border-line bg-surface/40 p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate text-sm font-medium">{c.title || "Untitled"}</p>
          <p className="mt-0.5 text-xs text-muted">
            {c.slides.length} slides · {new Date(c.createdAt).toLocaleDateString()}
            {c.scheduledAt && (
              <>
                {" · "}
                <span className="text-cool">scheduled {new Date(c.scheduledAt).toLocaleDateString()}</span>
              </>
            )}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <input
            type="date"
            value={c.scheduledAt ? c.scheduledAt.slice(0, 10) : ""}
            onChange={(e) => onDate(c, e.target.value)}
            className="rounded-lg border border-line bg-ink px-2 py-1.5 text-xs text-fg outline-none focus:border-accent"
          />
          {c.scheduledAt && (
            <button
              onClick={() => onDate(c, "")}
              aria-label="Clear schedule"
              className="rounded-md p-1.5 text-muted hover:bg-surface hover:text-fg"
            >
              <XIcon className="h-3.5 w-3.5" />
            </button>
          )}
          <Link
            href={`/studio?c=${c.id}`}
            className="inline-flex items-center gap-1 rounded-lg border border-line px-2.5 py-1.5 text-xs text-fg hover:bg-surface"
          >
            <ExternalLink className="h-3.5 w-3.5" /> Open
          </Link>
        </div>
      </div>
      <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-line pt-3">
        <span className="inline-flex items-center gap-1 text-xs text-muted">
          <Send className="h-3.5 w-3.5" /> Publish to:
        </span>
        {PLATFORMS.map((p) => (
          <button
            key={p.id}
            onClick={() => onPublish(c, p.id)}
            className="rounded-full border border-line px-3 py-1 text-xs text-muted transition hover:bg-surface hover:text-fg"
          >
            {p.label}
          </button>
        ))}
      </div>
    </div>
  );
}
