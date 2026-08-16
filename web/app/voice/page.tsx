import { VoiceEditor } from "@/components/VoiceEditor";
import { BrandKitEditor } from "@/components/BrandKitEditor";
import { PageHeader } from "@/components/ui/PageHeader";

export const metadata = { title: "Voice — Crux" };

export default function VoicePage() {
  return (
    <div className="mx-auto max-w-3xl px-5 py-10">
      <PageHeader
        title="Voice"
        lead="Your interests steer the feed; your voice makes the output sound like your work."
      />
      <BrandKitEditor />
      <div className="mt-6">
        <VoiceEditor />
      </div>
    </div>
  );
}
