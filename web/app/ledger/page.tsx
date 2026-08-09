import { LedgerView } from "@/components/LedgerView";

export default function LedgerPage() {
  return (
    <div className="mx-auto max-w-3xl px-5 py-10">
      <h1 className="text-3xl font-bold tracking-tight">Ledger</h1>
      <p className="mt-2 text-muted">
        Every opinion you’ve committed to, with the source it came from and how it turned out.
        The one thing here that gets more valuable the longer you use it.
      </p>
      <div className="mt-8">
        <LedgerView />
      </div>
    </div>
  );
}
