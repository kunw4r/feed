"use client";

import { useState } from "react";
import { Quiz } from "@/lib/types";
import { recordQuiz, markRead } from "@/lib/progress";
import { Reveal } from "@/components/motion";

export default function QuizBlock({ storyId, quiz }: { storyId: string; quiz: Quiz }) {
  const [picked, setPicked] = useState<number | null>(null);
  const answered = picked !== null;
  const right = picked === quiz.answer_index;

  const choose = (i: number) => {
    if (answered) return;
    setPicked(i);
    recordQuiz(storyId, i === quiz.answer_index);
    markRead(storyId);
  };

  return (
    <div>
      <Reveal as="p" className="font-display text-[1.6rem] md:text-[1.9rem] leading-[1.25] text-content text-pretty">
        {quiz.question}
      </Reveal>
      <ol className="mt-8 border-t border-edge">
        {quiz.options.map((opt, i) => {
          const isAnswer = i === quiz.answer_index;
          const tone = !answered
            ? "text-content hover:pl-3"
            : isAnswer
              ? "text-content pl-3"
              : i === picked
                ? "text-content-faint line-through decoration-red-400/70"
                : "text-content-faint";
          return (
            <Reveal as="li" key={i} delay={i * 70} className="border-b border-edge">
              <button
                onClick={() => choose(i)}
                disabled={answered}
                className={`group flex w-full items-baseline gap-5 py-4 text-left transition-all duration-500 ${tone}`}
              >
                <span
                  className={`font-display italic text-[17px] w-5 transition-colors ${
                    answered && isAnswer ? "text-accent" : "text-content-faint group-hover:text-accent"
                  }`}
                >
                  {answered && isAnswer ? "✓" : String.fromCharCode(97 + i)}
                </span>
                <span className="font-read text-[1.12rem] leading-snug">{opt}</span>
              </button>
            </Reveal>
          );
        })}
      </ol>
      <div className="unfold" data-open={answered}>
        <div>
          <p className="pt-6 font-read text-[1.1rem] leading-relaxed text-content-dim">
            <span className="font-display italic text-content">{right ? "Exactly. " : "Not quite. "}</span>
            {quiz.explanation}
          </p>
        </div>
      </div>
    </div>
  );
}
