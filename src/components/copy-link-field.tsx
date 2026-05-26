"use client";

import { Check, Copy } from "lucide-react";
import { useRef, useState } from "react";
import { inputClassName } from "@/components/ui";
import { cn } from "@/lib/utils";

export function CopyLinkField({ path }: { path: string }) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [copied, setCopied] = useState(false);

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(path);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1600);
    } catch {
      inputRef.current?.focus();
      inputRef.current?.select();
    }
  }

  return (
    <div className="grid gap-2">
      <input
        ref={inputRef}
        readOnly
        value={path}
        onFocus={(event) => event.currentTarget.select()}
        className={inputClassName}
        aria-label="Client status link"
      />
      <button
        type="button"
        onClick={copyLink}
        title="Copy client status link"
        className={cn(
          "inline-flex h-9 items-center justify-center gap-2 rounded-md px-3 text-sm font-medium transition",
          "border border-slate-300 bg-white text-slate-700 hover:bg-slate-50",
        )}
      >
        {copied ? <Check className="h-4 w-4" aria-hidden="true" /> : <Copy className="h-4 w-4" aria-hidden="true" />}
        {copied ? "Copied" : "Copy link"}
      </button>
    </div>
  );
}