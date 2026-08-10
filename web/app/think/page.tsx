import { ConvictionFlow } from "@/components/ConvictionFlow";

export default function ThinkPage() {
  return (
    <div className="mx-auto max-w-3xl px-5 py-10">
      <h1 className="font-serif text-3xl font-semibold tracking-tight">Think</h1>
      <p className="mt-2 text-muted">
        Drop a rough opinion — or paste a link and we read the actual page first. Crux breaks down
        what&rsquo;s really going on, a sparring partner pushes back, then you save the take and turn
        it into a carousel. No take yet? Save it for later and come back.
      </p>
      <div className="mt-8">
        <ConvictionFlow mode="thought" />
      </div>
    </div>
  );
}
