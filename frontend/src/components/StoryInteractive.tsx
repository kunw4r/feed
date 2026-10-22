"use client";

import { useState } from "react";
import { Story } from "@/lib/types";
import SelectionPopup from "./SelectionPopup";
import AskChat from "./AskChat";
import { MessageCircle } from "lucide-react";

interface StoryInteractiveProps {
  story: Story;
  children: React.ReactNode;
}

export default function StoryInteractive({
  story,
  children,
}: StoryInteractiveProps) {
  const [chatOpen, setChatOpen] = useState(false);
  const [initialQuestion, setInitialQuestion] = useState<string | undefined>();

  const storyContext = [
    `Title: ${story.simplified_title}`,
    `Summary: ${story.quick_summary}`,
    `Full story: ${story.simplified_body}`,
    story.deep_analysis ? `Analysis: ${story.deep_analysis}` : "",
    `Category: ${story.category}`,
    story.region ? `Region: ${story.region}` : "",
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
        className="fixed bottom-5 right-5 z-30 flex items-center gap-2 rounded-full bg-content/90 backdrop-blur px-4 py-2.5 text-[13px] font-medium text-surface shadow-2xl hover:bg-content transition-colors"
        title="Ask about this story"
      >
        <MessageCircle size={15} /> Ask
      </button>

      {chatOpen && (
        <AskChat
          storyContext={storyContext}
          storyTitle={story.simplified_title}
          onClose={() => setChatOpen(false)}
          initialQuestion={initialQuestion}
          concepts={story.concepts || []}
        />
      )}
    </div>
  );
}
