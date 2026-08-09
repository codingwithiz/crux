import { VoiceEditor } from "@/components/VoiceEditor";
import { BrandKitEditor } from "@/components/BrandKitEditor";

export const metadata = { title: "You — Crux" };

export default function VoicePage() {
  return (
    <div className="mx-auto max-w-3xl px-5 py-10">
      <h1 className="font-serif text-3xl font-semibold tracking-tight">You</h1>
      <p className="mt-2 text-muted">
        What you care about, how you write, and how your carousels look. Interests steer what the
        feed shows you; your voice makes the output sound like your work rather than generic AI.
      </p>
      <div className="mt-8">
        <BrandKitEditor />
      </div>
      <div className="mt-6">
        <VoiceEditor />
      </div>
    </div>
  );
}
