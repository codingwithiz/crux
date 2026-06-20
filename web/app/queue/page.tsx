import { QueueView } from "@/components/QueueView";

export default function QueuePage() {
  return (
    <div className="mx-auto max-w-3xl px-5 py-10">
      <p className="font-mono text-xs text-accent">plan · publish</p>
      <h1 className="mt-2 text-3xl font-bold tracking-tight">Queue</h1>
      <p className="mt-2 text-muted">
        Plan when to post. Set a date on any carousel, then hand it off to X, LinkedIn, or Instagram —
        live auto-publishing turns on once platform access is connected.
      </p>
      <div className="mt-8">
        <QueueView />
      </div>
    </div>
  );
}
