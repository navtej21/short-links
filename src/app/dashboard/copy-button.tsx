"use client";

import { useState } from "react";

type Status = "idle" | "copied" | "failed";

export function CopyButton({ text }: { text: string }) {
  const [status, setStatus] = useState<Status>("idle");

  async function copy() {
    try {
      await navigator.clipboard.writeText(text);
      setStatus("copied");
    } catch {
      // Clipboard can be blocked (permissions, non-secure context).
      setStatus("failed");
    }
    setTimeout(() => setStatus("idle"), 1500);
  }

  return (
    <button
      type="button"
      onClick={copy}
      className="rounded border px-3 py-1 text-sm"
    >
      {status === "copied" ? "Copied" : status === "failed" ? "Failed" : "Copy"}
    </button>
  );
}