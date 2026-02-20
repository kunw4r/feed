"use client";

import { useState } from "react";
import SelectionPopup from "./SelectionPopup";
import AskChat from "./AskChat";
import { MessageCircle } from "lucide-react";

interface LearnEvent {
  title: string;
  subtitle?: string;
  sections: { heading: string; content: string }[];
  key_concepts: { term: string; definition: string; context: string }[];
  why_it_still_matters?: string;
}

interface LearnInteractiveProps {
  event: LearnEvent;
  children: React.ReactNode;
}

export default function LearnInteractive({
  event,
  children,
}: LearnInteractiveProps) {
  const [chatOpen, setChatOpen] = useState(false);
  const [initialQuestion, setInitialQuestion] = useState<string | undefined>();

  const context = [
    `Topic: ${event.title}`,
    event.subtitle ? `Summary: ${event.subtitle}` : "",
    ...event.sections.map((s) => `${s.heading}: ${s.content}`),
    event.why_it_still_matters
      ? `Why it matters: ${event.why_it_still_matters}`
      : "",
  ]
    .filter(Boolean)
    .join("\n");

  const handleAsk = (selectedText: string) => {
    setInitialQuestion(`What does "${selectedText}" mean in this context?`);
    setChatOpen(true);
  };

  return (
    <div>
      <SelectionPopup onAsk={handleAsk} />
      {children}

      <button
        onClick={() => {
          setInitialQuestion(undefined);
          setChatOpen(true);
        }}
        className="fixed bottom-6 right-6 z-30 bg-accent-bold text-white rounded-full p-3.5 shadow-lg hover:bg-accent-bold-hover hover:scale-105 transition-all duration-150"
        title="Ask about this topic"
      >
        <MessageCircle size={20} />
      </button>

      {chatOpen && (
        <AskChat
          storyContext={context}
          storyTitle={event.title}
          onClose={() => setChatOpen(false)}
          initialQuestion={initialQuestion}
          concepts={event.key_concepts || []}
        />
      )}
    </div>
  );
}
