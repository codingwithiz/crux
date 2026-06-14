import { BriefView } from "@/components/BriefView";

export default function BriefPage() {
  return (
    <div className="mx-auto max-w-3xl px-5 py-10">
      <p className="font-mono text-xs text-accent">CURATOR · DAILY BRIEF</p>
      <h1 className="mt-2 text-3xl font-bold tracking-tight">Today&rsquo;s brief</h1>
      <p className="mt-2 text-muted">
        The Curator scans papers, Hacker News, and GitHub and ranks the few items most worth forming
        an opinion on — weighted toward your existing theses. Pick one to go straight into the
        conviction flow.
      </p>
      <div className="mt-8">
        <BriefView />
      </div>
    </div>
  );
}
