import { ConvictionFlow } from "@/components/ConvictionFlow";

export default function ThinkPage() {
  return (
    <div className="mx-auto max-w-3xl px-5 py-10">
      <p className="font-mono text-xs text-accent">IDEA 2 · THOUGHT → CONVICTION</p>
      <h1 className="mt-2 text-3xl font-bold tracking-tight">From your thought</h1>
      <p className="mt-2 text-muted">
        Drop a rough opinion. We map the landscape, the Adversary pressure-tests you, then you commit
        a calibrated thesis and turn it into a carousel.
      </p>
      <div className="mt-8">
        <ConvictionFlow mode="thought" />
      </div>
    </div>
  );
}
