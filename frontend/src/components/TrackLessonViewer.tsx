"use client";

import { useState } from "react";
import { ChevronDown, CheckCircle, Circle, BookOpen } from "lucide-react";

interface Concept {
  term: string;
  definition: string;
}

interface Lesson {
  title: string;
  content: string;
  key_takeaways: string[];
  concepts: Concept[];
}

interface TrackLessonViewerProps {
  lessons: Lesson[];
}

export default function TrackLessonViewer({ lessons }: TrackLessonViewerProps) {
  const [activeLesson, setActiveLesson] = useState(0);
  const [completedLessons, setCompletedLessons] = useState<Set<number>>(new Set());

  const toggleComplete = (index: number) => {
    const next = new Set(completedLessons);
    if (next.has(index)) {
      next.delete(index);
    } else {
      next.add(index);
    }
    setCompletedLessons(next);
  };

  const lesson = lessons[activeLesson];
  const progress = Math.round((completedLessons.size / lessons.length) * 100);

  return (
    <div>
      {/* Progress bar */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-1.5">
          <span className="text-[12px] font-medium text-zinc-400">Progress</span>
          <span className="text-[12px] text-zinc-600">{completedLessons.size}/{lessons.length} completed</span>
        </div>
        <div className="w-full h-1.5 bg-white/[0.06] rounded-full overflow-hidden">
          <div
            className="h-full bg-violet-500 rounded-full transition-all duration-300"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      {/* Lesson list */}
      <div className="flex gap-6">
        {/* Left: lesson nav */}
        <div className="hidden md:block w-56 flex-shrink-0 space-y-1">
          {lessons.map((l, i) => (
            <button
              key={i}
              onClick={() => setActiveLesson(i)}
              className={`w-full text-left flex items-center gap-2.5 px-3 py-2 rounded-lg text-[13px] transition-colors ${
                activeLesson === i
                  ? "bg-violet-500/15 text-violet-400"
                  : "text-zinc-400 hover:bg-white/[0.06]"
              }`}
            >
              {completedLessons.has(i) ? (
                <CheckCircle size={14} className={activeLesson === i ? "text-violet-400" : "text-green-400"} />
              ) : (
                <Circle size={14} className={activeLesson === i ? "text-violet-400" : "text-zinc-700"} />
              )}
              <span className="truncate">{l.title}</span>
            </button>
          ))}
        </div>

        {/* Mobile lesson selector */}
        <div className="md:hidden w-full mb-4">
          <select
            value={activeLesson}
            onChange={(e) => setActiveLesson(Number(e.target.value))}
            className="w-full px-3 py-2 rounded-lg border border-white/[0.06] text-[13px] text-zinc-200 bg-[#111111]"
          >
            {lessons.map((l, i) => (
              <option key={i} value={i}>
                {completedLessons.has(i) ? "- " : ""} Lesson {i + 1}: {l.title}
              </option>
            ))}
          </select>
        </div>

        {/* Right: lesson content */}
        <div className="flex-1 min-w-0">
          <div className="bg-[#111111] rounded-2xl border border-white/[0.06] px-6 py-6">
            <div className="flex items-center gap-2 mb-1 text-[11px] text-zinc-600">
              <BookOpen size={12} />
              Lesson {activeLesson + 1} of {lessons.length}
            </div>
            <h2 className="text-xl font-bold text-zinc-100 mb-4">
              {lesson.title}
            </h2>

            {/* Content */}
            <div className="text-[14px] leading-relaxed text-zinc-300 space-y-4">
              {lesson.content.split("\n\n").map((paragraph, i) => (
                <p key={i}>{paragraph}</p>
              ))}
            </div>

            {/* Key takeaways */}
            {lesson.key_takeaways && lesson.key_takeaways.length > 0 && (
              <div className="mt-6 bg-white/[0.04] rounded-lg px-5 py-4">
                <h3 className="text-[13px] font-semibold text-zinc-100 mb-2">Key takeaways</h3>
                <ul className="space-y-1.5">
                  {lesson.key_takeaways.map((t, i) => (
                    <li key={i} className="flex items-start gap-2 text-[13px] text-zinc-400">
                      <CheckCircle size={13} className="text-green-400 mt-0.5 flex-shrink-0" />
                      <span>{t}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Concepts */}
            {lesson.concepts && lesson.concepts.length > 0 && (
              <div className="mt-6">
                <h3 className="text-[13px] font-semibold text-zinc-100 mb-2">Concepts</h3>
                <div className="space-y-2">
                  {lesson.concepts.map((c, i) => (
                    <div key={i} className="bg-black/50 border border-white/[0.06] rounded-lg px-4 py-3">
                      <span className="text-[13px] font-medium text-zinc-100">{c.term}</span>
                      <p className="text-[12px] text-zinc-400 mt-0.5">{c.definition}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Navigation */}
            <div className="flex items-center justify-between mt-8 pt-4 border-t border-white/[0.06]">
              <button
                onClick={() => toggleComplete(activeLesson)}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-[13px] font-medium transition-colors ${
                  completedLessons.has(activeLesson)
                    ? "bg-green-500/10 text-green-400 hover:bg-green-500/20"
                    : "bg-white/[0.06] text-zinc-400 hover:bg-white/[0.1]"
                }`}
              >
                {completedLessons.has(activeLesson) ? (
                  <><CheckCircle size={14} /> Completed</>
                ) : (
                  <><Circle size={14} /> Mark complete</>
                )}
              </button>
              <div className="flex gap-2">
                {activeLesson > 0 && (
                  <button
                    onClick={() => setActiveLesson(activeLesson - 1)}
                    className="px-3 py-2 rounded-lg text-[13px] text-zinc-400 hover:text-zinc-100 hover:bg-white/[0.06] transition-colors"
                  >
                    Previous
                  </button>
                )}
                {activeLesson < lessons.length - 1 && (
                  <button
                    onClick={() => setActiveLesson(activeLesson + 1)}
                    className="px-3 py-2 rounded-lg text-[13px] font-medium bg-violet-600 text-white hover:bg-violet-500 transition-colors"
                  >
                    Next lesson
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
