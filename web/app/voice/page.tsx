import { VoiceEditor } from "@/components/VoiceEditor";

export default function VoicePage() {
  return (
    <div className="mx-auto max-w-3xl px-5 py-10">
      <p className="font-mono text-xs text-accent">the moat · voice + taste</p>
      <h1 className="mt-2 text-3xl font-bold tracking-tight">Your voice</h1>
      <p className="mt-2 text-muted">
        The Adversary makes the opinion yours. This makes the carousel <em>sound</em> like you — so
        the output is unmistakably your work, not generic AI.
      </p>
      <div className="mt-8">
        <VoiceEditor />
      </div>
    </div>
  );
}
