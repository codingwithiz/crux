import { LedgerView } from "@/components/LedgerView";

export default function LedgerPage() {
  return (
    <div className="mx-auto max-w-3xl px-5 py-10">
      <p className="font-mono text-xs text-accent">THE MOAT</p>
      <h1 className="mt-2 text-3xl font-bold tracking-tight">Thesis Ledger</h1>
      <p className="mt-2 text-muted">
        Your committed opinions over time — evidence-linked and calibrated. This is the asset that
        compounds with every conviction you form.
      </p>
      <div className="mt-8">
        <LedgerView />
      </div>
    </div>
  );
}
