"use client";

import { useEffect, useState } from "react";
import { Check, Copy } from "lucide-react";

/**
 * Shows the paste-ready iframe embed code with the live origin, plus a copy
 * button — the literal artifact a brand would drop into their storefront.
 */
export function EmbedSnippet() {
  const [origin, setOrigin] = useState("https://your-domain.com");
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    setOrigin(window.location.origin);
  }, []);

  const code = `<iframe
  src="${origin}/embed"
  title="SkinLens skin analysis"
  allow="camera; fullscreen"
  width="100%"
  height="900"
  style="border:0;border-radius:16px"
></iframe>`;

  const copy = () => {
    navigator.clipboard?.writeText(code).then(
      () => {
        setCopied(true);
        setTimeout(() => setCopied(false), 1800);
      },
      () => {},
    );
  };

  return (
    <div className="relative overflow-hidden rounded-xl border border-line bg-ink text-paper-raised">
      <button
        type="button"
        onClick={copy}
        className="absolute right-3 top-3 inline-flex items-center gap-1.5 rounded-md bg-white/10 px-2.5 py-1 text-xs font-medium text-white/90 transition-colors hover:bg-white/20"
      >
        {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
        {copied ? "Copied" : "Copy"}
      </button>
      <pre className="overflow-x-auto p-4 text-xs leading-relaxed text-paper-raised/90">
        <code>{code}</code>
      </pre>
    </div>
  );
}
