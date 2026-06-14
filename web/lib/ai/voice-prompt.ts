import type { VoiceProfile } from "../types";

/** Compose a voice guide + a couple of short samples into a prompt block that
 *  steers the Expressor / re-voicer toward the user's writing style. */
export function voiceBlock(voice?: VoiceProfile): string {
  if (!voice) return "";
  const parts: string[] = [];
  if (voice.guide) parts.push(`VOICE GUIDE:\n${voice.guide}`);
  if (voice.tone) parts.push(`Tone: ${voice.tone}`);
  parts.push(`Emoji: ${voice.emoji ? "use tasteful emojis like the samples do" : "do NOT use emojis"}`);
  const samples = (voice.samples ?? []).filter((s) => s.trim()).slice(0, 2);
  if (samples.length) {
    parts.push(
      `Reference samples of how I write (match the STYLE, not the content):\n` +
        samples.map((s, i) => `[${i + 1}] ${s.slice(0, 600)}`).join("\n"),
    );
  }
  return parts.join("\n\n");
}
