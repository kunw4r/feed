"use client";

import { useEffect, useRef, useState } from "react";

// The site is static, so questions go to Claude itself: we open claude.ai with the
// story context and the reader's question already filled in.
const SUGGESTIONS = [
  "Explain this like I'm new to the topic",
  "What's the backstory here?",
  "Who gains and who loses?",
  "What should I watch for next?",
];

function openClaude(context: string, question: string) {
  const prompt = `I'm reading this news story and want to understand it better.\n\n${context}\n\nMy question: ${question}`;
  window.open(`https://claude.ai/new?q=${encodeURIComponent(prompt)}`, "_blank", "noopener,noreferrer");
}

export { openClaude };

export default function AskClaude({ subject, context }: { subject: string; context: string }) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const [sel, setSel] = useState<{ text: string; x: number; y: number } | null>(null);
  const input = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) input.current?.focus();
  }, [open]);

  // Offer "Ask Claude" on any text selection inside the page
  useEffect(() => {
    const onUp = () =>
      setTimeout(() => {
        const s = window.getSelection();
        const text = s?.toString().trim() ?? "";
        if (text.length > 2 && text.length < 400 && s?.rangeCount) {
          const r = s.getRangeAt(0).getBoundingClientRect();
          setSel({ text, x: r.left + r.width / 2, y: r.top });
        } else setSel(null);
      }, 10);
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && (setOpen(false), setSel(null));
    document.addEventListener("mouseup", onUp);
    document.addEventListener("keyup", onUp);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mouseup", onUp);
      document.removeEventListener("keyup", onUp);
      document.removeEventListener("keydown", onKey);
    };
  }, []);

  const ask = (question: string) => {
    if (!question.trim()) return;
    openClaude(context, question.trim());
    setOpen(false);
    setQ("");
  };

  return (
    <>
      {sel && (
        <button
          onMouseDown={(e) => {
            e.preventDefault();
            ask(`What does "${sel.text}" mean in this context?`);
            setSel(null);
          }}
          style={{ left: sel.x, top: sel.y }}
          className="animate-in fixed z-40 -translate-x-1/2 -translate-y-[calc(100%+8px)] whitespace-nowrap rounded-full bg-content px-3.5 py-1.5 text-[12px] font-medium text-surface shadow-xl"
        >
          Ask Claude about this
        </button>
      )}

      {open && (
        <div
          role="dialog"
          aria-label={`Ask Claude about ${subject}`}
          className="animate-in fixed bottom-20 right-5 z-40 w-[min(380px,calc(100vw-2.5rem))] rounded-2xl border border-edge bg-surface-raised p-4 shadow-2xl"
        >
          <form
            onSubmit={(e) => {
              e.preventDefault();
              ask(q);
            }}
          >
            <label htmlFor="ask-claude" className="smallcaps text-[13px] text-content-faint">
              Ask Claude about this story
            </label>
            <div className="mt-2 flex gap-2">
              <input
                id="ask-claude"
                ref={input}
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Type a question…"
                className="min-w-0 flex-1 rounded-full border border-edge bg-surface px-4 py-2 text-[14px] text-content placeholder:text-content-faint focus:border-edge-focus focus:outline-none"
              />
              <button type="submit" className="rounded-full bg-accent-bold px-4 text-[13px] font-medium text-white disabled:opacity-40" disabled={!q.trim()}>
                Ask
              </button>
            </div>
          </form>
          <div className="mt-3 flex flex-wrap gap-1.5">
            {SUGGESTIONS.map((s) => (
              <button
                key={s}
                onClick={() => ask(s)}
                className="rounded-full border border-edge px-3 py-1 text-[12px] text-content-dim hover:border-edge-accent hover:text-content transition-colors"
              >
                {s}
              </button>
            ))}
          </div>
          <p className="mt-3 text-[11px] text-content-faint">Opens Claude in a new tab with this story attached.</p>
        </div>
      )}

      <button
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className="fixed bottom-5 right-5 z-30 flex items-center gap-2 rounded-full bg-content/90 backdrop-blur px-4 py-2.5 text-[13px] font-medium text-surface shadow-2xl hover:bg-content transition-colors"
      >
        {open ? "Close" : "Ask Claude"}
      </button>
    </>
  );
}
