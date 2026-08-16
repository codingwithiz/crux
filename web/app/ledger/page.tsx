import { LedgerView } from "@/components/LedgerView";
import { PageHeader } from "@/components/ui/PageHeader";

export default function LedgerPage() {
  return (
    <div className="mx-auto max-w-5xl px-5 py-10">
      <PageHeader
        title="Ledger"
        lead="The one thing here that gets more valuable the longer you use it."
      />
      <LedgerView />
    </div>
  );
}
