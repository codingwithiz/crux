import { ConvictionFlow } from "@/components/ConvictionFlow";
import { PageHeader } from "@/components/ui/PageHeader";

export default function ThinkPage() {
  return (
    <div className="mx-auto max-w-3xl px-5 py-10">
      <PageHeader
        title="Think"
        lead="Drop a rough opinion, or paste a link and we read the actual page first."
      />
      <ConvictionFlow mode="thought" />
    </div>
  );
}
