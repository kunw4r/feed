"use client";

import { useState, useRef, useEffect } from "react";
import { Concept } from "@/lib/types";

interface Message {
  role: "user" | "assistant";
  content: string;
}

interface AskChatProps {
  storyContext: string;
  storyTitle: string;
  onClose: () => void;
  initialQuestion?: string;
  concepts?: Concept[];
}

const API_URL =
  typeof window !== "undefined" && window.location.hostname === "localhost"
    ? "http://localhost:8000"
    : "";

function findRelevantConcepts(text: string, concepts: Concept[]): Concept[] {
  const lower = text.toLowerCase();
  return concepts.filter(
    (c) =>
      lower.includes(c.term.toLowerCase()) ||
      c.term.toLowerCase().split(" ").some((word) => lower.includes(word))
  );
}

function generateOfflineAnswer(
  question: string,
  concepts: Concept[],
  storyContext: string
): string {
  const q = question.toLowerCase();

  // Check if question matches a concept
  const relevant = findRelevantConcepts(question, concepts);
  if (relevant.length > 0) {
    const parts = relevant.map(
      (c) => `**${c.term}**: ${c.definition}\n\nIn this story: ${c.context}`
    );
    return parts.join("\n\n---\n\n") + "\n\n*Tap other highlighted terms in the story to learn more.*";
  }

  // Generic helpful responses
  if (q.includes("why") && (q.includes("care") || q.includes("matter"))) {
    return "Check the 'Why should you care?' section above the story — it explains how this directly affects you. The key concepts glossary below also breaks down the important terms.";
  }

  if (q.includes("explain") || q.includes("what does") || q.includes("what is") || q.includes("mean")) {
    return "The highlighted terms in the story have explanations — tap any dotted-underlined word to see its definition. You can also scroll down to the Key Concepts glossary for all terms explained.\n\nFor deeper context, check the Deep Analysis section which covers historical background and multiple perspectives.";
  }

  if (q.includes("history") || q.includes("background") || q.includes("context")) {
    return "Scroll down to the Deep Analysis section — it includes Historical Context that explains the background of this story, Multiple Perspectives showing different viewpoints, and What to Watch for upcoming developments.";
  }

  return "This story has several learning features built in:\n\n• **Highlighted terms** — tap any dotted-underlined word for its definition\n• **Key Concepts** glossary — all important terms explained below the story\n• **Why should you care?** — how this affects your life\n• **Deep Analysis** — historical context, multiple perspectives, and future implications\n\nTo enable live AI chat, run the backend locally:\n`cd backend && uvicorn main:app --port 8000`";
}

export default function AskChat({
  storyContext,
  storyTitle,
  onClose,
  initialQuestion,
  concepts = [],
}: AskChatProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [apiAvailable, setApiAvailable] = useState<boolean | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Check if API is available
  useEffect(() => {
    if (!API_URL) {
      setApiAvailable(false);
      return;
    }
    fetch(`${API_URL}/api/health`, { signal: AbortSignal.timeout(3000) })
      .then((r) => setApiAvailable(r.ok))
      .catch(() => setApiAvailable(false));
  }, []);

  // Send initial question if provided
  useEffect(() => {
    if (initialQuestion && apiAvailable !== null) {
      sendMessage(initialQuestion);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialQuestion, apiAvailable]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const sendMessage = async (text: string) => {
    if (!text.trim() || loading) return;

    const userMsg: Message = { role: "user", content: text.trim() };
    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setLoading(true);

    // Try live API first
    if (apiAvailable) {
      try {
        const res = await fetch(`${API_URL}/api/chat`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            question: text.trim(),
            story_context: storyContext,
            story_title: storyTitle,
            history: messages.slice(-6),
          }),
        });

        if (res.ok) {
          const data = await res.json();
          setMessages((prev) => [
            ...prev,
            { role: "assistant", content: data.answer },
          ]);
          setLoading(false);
          return;
        }
      } catch {
        // Fall through to offline mode
      }
    }

    // Offline mode: use concept data
    const answer = generateOfflineAnswer(text.trim(), concepts, storyContext);
    setMessages((prev) => [...prev, { role: "assistant", content: answer }]);
    setLoading(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Panel */}
      <div className="relative w-full max-w-md bg-[#0a0a0a] shadow-xl flex flex-col animate-in border-l border-white/[0.06]">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/[0.06]">
          <div>
            <h3 className="text-[14px] font-semibold text-zinc-100">
              Ask about this story
            </h3>
            <p className="text-[12px] text-zinc-600 mt-0.5 line-clamp-1">
              {storyTitle}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-white/[0.06] transition-colors"
          >
            <svg
              className="w-4 h-4 text-zinc-600"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={2}
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
          {messages.length === 0 && (
            <div className="text-center py-8">
              <div className="text-2xl mb-3">💬</div>
              <p className="text-[14px] text-zinc-300 mb-1">
                Ask me anything about this story
              </p>
              <p className="text-[12px] text-zinc-600 mb-4">
                I&apos;ll explain terms, context, and why it matters
              </p>
              <div className="flex flex-wrap gap-2 justify-center">
                {[
                  "Explain the key terms",
                  "Why should I care?",
                  "What's the history behind this?",
                  "How does this affect me?",
                ].map((q) => (
                  <button
                    key={q}
                    onClick={() => sendMessage(q)}
                    className="text-[12px] px-3 py-1.5 bg-white/[0.06] text-zinc-400 rounded-full hover:bg-white/[0.1] transition-colors"
                  >
                    {q}
                  </button>
                ))}
              </div>
            </div>
          )}

          {messages.map((msg, i) => (
            <div
              key={i}
              className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
            >
              <div
                className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-[14px] leading-relaxed ${
                  msg.role === "user"
                    ? "bg-violet-600 text-white"
                    : "bg-white/[0.06] text-zinc-300"
                }`}
              >
                {msg.content.split("\n\n").map((para, j) => (
                  <p key={j} className={j > 0 ? "mt-2" : ""}>
                    {para.split("**").map((seg, k) =>
                      k % 2 === 1 ? (
                        <strong key={k}>{seg}</strong>
                      ) : (
                        <span key={k}>{seg}</span>
                      )
                    )}
                  </p>
                ))}
              </div>
            </div>
          ))}

          {loading && (
            <div className="flex justify-start">
              <div className="bg-white/[0.06] rounded-2xl px-4 py-3">
                <div className="flex gap-1.5">
                  <span className="w-2 h-2 bg-violet-400 rounded-full animate-bounce" />
                  <span
                    className="w-2 h-2 bg-violet-400 rounded-full animate-bounce"
                    style={{ animationDelay: "0.15s" }}
                  />
                  <span
                    className="w-2 h-2 bg-violet-400 rounded-full animate-bounce"
                    style={{ animationDelay: "0.3s" }}
                  />
                </div>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Input */}
        <div className="px-5 py-4 border-t border-white/[0.06]">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              sendMessage(input);
            }}
            className="flex gap-2"
          >
            <input
              ref={inputRef}
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask a question..."
              disabled={loading}
              className="flex-1 bg-[#111111] rounded-xl px-4 py-2.5 text-[14px] text-zinc-100 placeholder-zinc-600 outline-none focus:ring-2 focus:ring-violet-500/30 border border-white/[0.06] transition-all disabled:opacity-50"
            />
            <button
              type="submit"
              disabled={!input.trim() || loading}
              className="bg-violet-600 text-white rounded-xl px-4 py-2.5 text-[13px] font-medium hover:bg-violet-500 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
            >
              Ask
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
