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
        className="fixed bottom-6 right-6 z-30 bg-accent-bold text-white rounded-full p-3.5 shadow-lg hover:bg-accent-bold-hover hover:scale-105 transition-all duration-150"
        title="Ask about this story"
      >
        <MessageCircle size={20} />
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
