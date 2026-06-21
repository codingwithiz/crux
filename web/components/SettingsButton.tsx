"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import {
  getSettings,
  saveSettings,
  DEFAULT_MODELS,
  PROVIDER_SHORT,
  PROVIDER_LABELS,
  MODEL_CATALOG,
  TIER_LABEL,
  type ModelOption,
} from "@/lib/settings";
import { ProviderIcon } from "@/lib/provider-icons";
import type { Provider, Settings } from "@/lib/types";

const PROVIDERS: Provider[] = ["google", "openai", "anthropic", "ollama"];

type CloudKey = "google" | "openai" | "anthropic";
type ServerKeys = Record<CloudKey, boolean>;

interface ServerStatus {
  configured?: boolean;
  signedIn?: boolean;
  google?: boolean;
  openai?: boolean;
  anthropic?: boolean;
  /** Which providers have a shared key on the server (so the key field is optional). */
  serverKeys?: ServerKeys;
}

const isCloudKey = (p?: Provider): p is CloudKey =>
  p === "google" || p === "openai" || p === "anthropic";

/** Can this provider actually run? Ollama always; otherwise a user key OR a server key. */
function providerReady(s: Settings, srv: ServerStatus | null): boolean {
  if (s.provider === "ollama") return true;
  if (s.apiKey && s.apiKey.trim()) return true;
  if (isCloudKey(s.provider)) return Boolean(srv?.serverKeys?.[s.provider]);
  return false;
}

const tierColor: Record<ModelOption["tier"], string> = {
  fast: "text-emerald-300 border-emerald-500/40 bg-emerald-500/10",
  balanced: "text-cool border-cool/40 bg-cool/10",
  smart: "text-accent border-accent/40 bg-accent/10",
};

export function SettingsButton() {
  const [open, setOpen] = useState(false);
  const [s, setS] = useState<Settings>({ provider: "openai", model: DEFAULT_MODELS.openai });
  const [server, setServer] = useState<ServerStatus | null>(null);
  const [advOpen, setAdvOpen] = useState(false);

  // Status dot — derived, not stored. Green once the provider can actually run.
  const ready = providerReady(s, server);

  // Load saved settings on mount (localStorage is client-only).
  useEffect(() => {
    const cur = getSettings();
    setS(cur);
    setAdvOpen(Boolean(cur.adversaryProvider));
  }, []);

  // Fetch server status on mount and whenever the dialog opens (refresh after a
  // key save). Tells us which providers have a shared server key.
  useEffect(() => {
    fetch("/api/secrets")
      .then((r) => r.json())
      .then((j: ServerStatus) => setServer(j))
      .catch(() => setServer(null));
  }, [open]);

  function update(patch: Partial<Settings>) {
    setS((prev) => {
      const next = { ...prev, ...patch };
      // Switching the default provider: default its model and clear the key
      // field (the previous provider's key won't authenticate the new one).
      if (patch.provider && patch.provider !== prev.provider) {
        if (patch.model === undefined) next.model = DEFAULT_MODELS[patch.provider];
        if (patch.apiKey === undefined) next.apiKey = undefined;
      }
      // Same for the Adversary override.
      if (patch.adversaryProvider !== undefined && patch.adversaryProvider !== prev.adversaryProvider) {
        if (patch.adversaryModel === undefined) {
          next.adversaryModel = patch.adversaryProvider
            ? DEFAULT_MODELS[patch.adversaryProvider]
            : undefined;
        }
        if (patch.adversaryApiKey === undefined) next.adversaryApiKey = undefined;
      }
      return next;
    });
  }

  function save() {
    const next = advOpen ? s : { ...s, adversaryProvider: undefined, adversaryModel: undefined, adversaryApiKey: undefined };
    saveSettings(next);
    setOpen(false);
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="ml-1 rounded-md border border-line px-3 py-1.5 text-sm text-fg transition hover:bg-surface"
      >
        <span className={`mr-1.5 inline-block h-1.5 w-1.5 rounded-full ${ready ? "bg-emerald-400" : "bg-accent"}`} />
        Model
      </button>

      {open && createPortal(
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center overflow-y-auto bg-black/60 p-4"
          onClick={() => setOpen(false)}
        >
          <div
            className="ce-fade-up my-auto flex max-h-[88dvh] w-full max-w-md flex-col rounded-xl border border-line bg-surface shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="border-b border-line p-5">
              <h2 className="text-lg font-semibold">Model</h2>
              <p className="mt-1 text-sm text-muted">
                Pick the model used for Synthesize · Coach/Spar · Carousel. Runs on the shared server key — no setup needed.
              </p>
            </div>

            <div className="flex-1 overflow-y-auto p-5">
              <ModelChooser
                provider={s.provider}
                model={s.model}
                ollamaBaseURL={s.ollamaBaseURL}
                serverKeys={server?.serverKeys}
                onProvider={(p) => update({ provider: p })}
                onModel={(m) => update({ model: m })}
                onOllama={(u) => update({ ollamaBaseURL: u })}
              />

              {/* Adversary upgrade */}
              <div className="mt-5 border-t border-line pt-4">
                <label className="flex items-center gap-2 text-sm font-medium">
                  <input type="checkbox" checked={advOpen} onChange={(e) => setAdvOpen(e.target.checked)} />
                  Use a stronger model for the Adversary
                </label>
                <p className="mt-1 text-xs text-muted">
                  The reasoning-critical step. Synthesis and the carousel stay on your default.
                </p>
                {advOpen && (
                  <div className="mt-3 rounded-lg border border-line bg-ink/40 p-3">
                    <ModelChooser
                      compact
                      provider={s.adversaryProvider ?? "anthropic"}
                      model={s.adversaryModel}
                      ollamaBaseURL={s.ollamaBaseURL}
                      serverKeys={server?.serverKeys}
                      onProvider={(p) => update({ adversaryProvider: p })}
                      onModel={(m) => update({ adversaryModel: m })}
                      onOllama={(u) => update({ ollamaBaseURL: u })}
                    />
                  </div>
                )}
              </div>

              <p className="mt-4 rounded-lg border border-line bg-ink/40 p-3 text-xs text-muted">
                This run → Default:{" "}
                <span className="text-fg">{PROVIDER_SHORT[s.provider]} · {s.model || DEFAULT_MODELS[s.provider]}</span>
                {" · "}Adversary:{" "}
                <span className="text-fg">
                  {advOpen && s.adversaryProvider
                    ? `${PROVIDER_SHORT[s.adversaryProvider]} · ${s.adversaryModel || DEFAULT_MODELS[s.adversaryProvider]}`
                    : "same as default"}
                </span>
              </p>
            </div>

            <div className="flex justify-end gap-2 border-t border-line p-4">
              <button onClick={() => setOpen(false)} className="rounded-lg px-4 py-2 text-sm text-muted hover:text-fg">
                Cancel
              </button>
              <button
                onClick={save}
                className="rounded-lg bg-accent px-4 py-2 text-sm font-medium text-accent-fg hover:brightness-110"
              >
                Save
              </button>
            </div>
          </div>
        </div>,
        document.body,
      )}
    </>
  );
}

function ModelChooser({
  provider,
  model,
  ollamaBaseURL,
  serverKeys,
  onProvider,
  onModel,
  onOllama,
  compact,
}: {
  provider: Provider;
  model?: string;
  ollamaBaseURL?: string;
  serverKeys?: ServerKeys;
  onProvider: (p: Provider) => void;
  onModel: (m: string) => void;
  onOllama: (u: string) => void;
  compact?: boolean;
}) {
  const options = MODEL_CATALOG[provider] ?? [];
  const known = options.some((o) => o.id === model);
  const hasServerKey = isCloudKey(provider) && Boolean(serverKeys?.[provider]);

  return (
    <div>
      {!compact && <label className="block text-xs font-medium uppercase tracking-wide text-muted">Provider</label>}
      <div className="mt-1.5 flex flex-wrap gap-2">
        {PROVIDERS.map((p) => (
          <button
            key={p}
            onClick={() => onProvider(p)}
            className={`flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-sm ${
              provider === p ? "border-accent bg-accent/10 text-fg" : "border-line text-muted hover:bg-surface"
            }`}
          >
            <ProviderIcon provider={p} size={16} />
            {PROVIDER_SHORT[p]}
          </button>
        ))}
      </div>
      <p className="mt-1.5 text-xs text-muted">{PROVIDER_LABELS[provider]}</p>

      <label className="mt-3 block text-xs font-medium uppercase tracking-wide text-muted">Model</label>
      <div className="mt-1.5 space-y-2">
        {options.map((o) => (
          <button
            key={o.id}
            onClick={() => onModel(o.id)}
            className={`flex w-full items-center justify-between gap-2 rounded-lg border px-3 py-2 text-left text-sm ${
              model === o.id ? "border-accent bg-accent/5" : "border-line hover:bg-surface"
            }`}
          >
            <span>
              <span className="font-medium text-fg">{o.label}</span>
              <span className="ml-2 text-xs text-muted">{o.note}</span>
            </span>
            <span className={`shrink-0 rounded-full border px-2 py-0.5 text-[10px] font-medium ${tierColor[o.tier]}`}>
              {TIER_LABEL[o.tier]}
            </span>
          </button>
        ))}
      </div>
      <details className="mt-2">
        <summary className="cursor-pointer text-xs text-muted hover:text-fg">Custom model id</summary>
        <input
          value={known ? "" : model ?? ""}
          onChange={(e) => onModel(e.target.value)}
          placeholder="exact model id"
          className="mt-1.5 w-full rounded-lg border border-line bg-ink px-3 py-2 font-mono text-xs"
        />
      </details>

      {provider === "ollama" ? (
        <>
          <label className="mt-3 block text-xs font-medium uppercase tracking-wide text-muted">Ollama base URL</label>
          <input
            value={ollamaBaseURL ?? "http://localhost:11434/v1"}
            onChange={(e) => onOllama(e.target.value)}
            className="mt-1 w-full rounded-lg border border-line bg-ink px-3 py-2 font-mono text-sm"
          />
        </>
      ) : (
        <p className="mt-3 text-xs text-muted">
          {hasServerKey
            ? "Runs on the shared server key — nothing to set up."
            : `No server key configured for ${PROVIDER_SHORT[provider]} — the admin needs to add one.`}
        </p>
      )}
    </div>
  );
}
