"use client";

import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

/** Renders assistant/markdown text with light, readable formatting (.ce-prose). */
export function Markdown({ children }: { children: string }) {
  return (
    <div className="ce-prose">
      <ReactMarkdown remarkPlugins={[remarkGfm]}>{children}</ReactMarkdown>
    </div>
  );
}
