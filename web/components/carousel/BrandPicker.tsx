"use client";

import { useState } from "react";
import { Search, X } from "lucide-react";
import { BrandMark } from "@/lib/carousel/logos";
import { searchBrands } from "@/lib/carousel/brand-index";

type Brand = { name: string; slug?: string } | undefined;

/**
 * Pick the brand stamped on a slide: type a name, see matching official logos,
 * click one. No raw simple-icons slugs to memorize. "Use name only" sets the
 * brand with no logo; previews hide gracefully if a logo 404s.
 */
export function BrandPicker({ value, onChange }: { value: Brand; onChange: (v: Brand) => void }) {
  const [query, setQuery] = useState("");
  const results = searchBrands(query);

  if (value?.name) {
    return (
      <div className="flex items-center gap-2 rounded-lg border border-line bg-ink px-3 py-2">
        {value.slug && (
          <span className="inline-flex h-5 items-center">
            <BrandMark slug={value.slug} size={20} />
          </span>
        )}
        <span className="flex-1 truncate text-sm text-fg">
          {value.name}
          {value.slug ? "" : <span className="text-muted"> · no logo</span>}
        </span>
        <button
          onClick={() => {
            onChange(undefined);
            setQuery("");
          }}
          aria-label="Remove brand"
          className="rounded p-1 text-muted hover:bg-surface hover:text-fg"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center gap-2 rounded-lg border border-line bg-ink px-3">
        <Search className="h-4 w-4 shrink-0 text-muted" />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search a brand — Anthropic, OpenAI, NVIDIA…"
          className="h-9 w-full bg-transparent text-sm text-fg outline-none placeholder:text-muted"
        />
      </div>
      {query.trim() && (
        <div className="mt-1.5 max-h-44 overflow-y-auto rounded-lg border border-line bg-surface p-1">
          {results.map((b) => (
            <button
              key={b.slug}
              onClick={() => {
                onChange({ name: b.name, slug: b.slug });
                setQuery("");
              }}
              className="flex w-full items-center gap-2.5 rounded-md px-2.5 py-1.5 text-left text-sm text-fg hover:bg-ink"
            >
              <span className="inline-flex h-5 w-5 items-center justify-center">
                <BrandMark slug={b.slug} size={20} />
              </span>
              {b.name}
            </button>
          ))}
          <button
            onClick={() => {
              onChange({ name: query.trim(), slug: undefined });
              setQuery("");
            }}
            className="block w-full rounded-md px-2.5 py-1.5 text-left text-sm text-muted hover:bg-ink"
          >
            Use “{query.trim()}” as the name only (no logo)
          </button>
        </div>
      )}
    </div>
  );
}
