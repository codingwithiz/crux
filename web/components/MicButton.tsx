"use client";

import { useEffect, useRef, useState } from "react";
import { Mic } from "lucide-react";

// Minimal Web Speech API typings (not in the standard lib).
interface SRResult {
  0: { transcript: string };
}
interface SREvent {
  results: ArrayLike<SRResult>;
}
interface SR {
  lang: string;
  interimResults: boolean;
  continuous: boolean;
  onresult: ((e: SREvent) => void) | null;
  onend: (() => void) | null;
  onerror: (() => void) | null;
  start: () => void;
  stop: () => void;
}
type SRCtor = new () => SR;

/**
 * Dictate into a text field via the browser's free Web Speech API. Renders
 * nothing where the API is unavailable (Firefox / some mobile), so it never
 * shows a broken control.
 */
export function MicButton({ onText }: { onText: (t: string) => void }) {
  const [supported, setSupported] = useState(false);
  const [listening, setListening] = useState(false);
  const recRef = useRef<SR | null>(null);
  const onTextRef = useRef(onText);

  useEffect(() => {
    onTextRef.current = onText;
  }, [onText]);

  useEffect(() => {
    const w = window as unknown as { SpeechRecognition?: SRCtor; webkitSpeechRecognition?: SRCtor };
    const Ctor = w.SpeechRecognition || w.webkitSpeechRecognition;
    if (!Ctor) return;
    setSupported(true);
    const rec = new Ctor();
    rec.lang = "en-US";
    rec.interimResults = false;
    rec.continuous = false;
    rec.onresult = (e) => {
      const text = Array.from(e.results)
        .map((r) => r[0].transcript)
        .join(" ");
      onTextRef.current(text);
    };
    rec.onend = () => setListening(false);
    rec.onerror = () => setListening(false);
    recRef.current = rec;
    return () => {
      try {
        rec.stop();
      } catch {
        /* already stopped */
      }
    };
  }, []);

  if (!supported) return null;

  function toggle() {
    const rec = recRef.current;
    if (!rec) return;
    if (listening) {
      rec.stop();
      setListening(false);
    } else {
      try {
        rec.start();
        setListening(true);
      } catch {
        /* start() throws if already running */
      }
    }
  }

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={listening ? "Stop dictation" : "Dictate"}
      title="Dictate (speech to text)"
      className={`inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs transition ${
        listening ? "border-accent bg-accent/10 text-accent" : "border-line text-muted hover:bg-surface hover:text-fg"
      }`}
    >
      <Mic className="h-3.5 w-3.5" /> {listening ? "Listening…" : "Speak"}
    </button>
  );
}
