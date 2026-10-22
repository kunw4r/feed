"use client";

import { useEffect, useRef, useState } from "react";
import { Article } from "@/lib/types";

const BASE = process.env.NEXT_PUBLIC_STATIC === "true" ? "/feed" : "";
const PREVIEW = 4;

// The publisher's full article, continuing inline. Loads as the reader approaches it.
export default function OriginalReporting({ storyId, minutes }: { storyId: string; minutes?: number }) {
  const ref = useRef<HTMLDivElement>(null);
  const [article, setArticle] = useState<Article | null>(null);
  const [failed, setFailed] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(
      ([e]) => {
        if (!e.isIntersecting) return;
        io.disconnect();
        fetch(`${BASE}/data/articles/${storyId}.json`)
          .then((r) => (r.ok ? r.json() : Promise.reject()))
          .then(setArticle)
          .catch(() => setFailed(true));
      },
      { rootMargin: "800px 0px" },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [storyId]);

  const rest = article ? article.paragraphs.length - PREVIEW : 0;

  return (
    <div ref={ref} className="min-h-[200px]">
      {failed && <p className="text-[14px] text-content-faint">The original text isn&apos;t available for this story.</p>}
      {article && (
        <div className="animate-in">
          <p className="text-[14px] text-content-faint">
            <span className="text-content">{article.source}</span>
            {article.byline && <> · {article.byline}</>}
          </p>
          <h3 className="font-display mt-3 mb-10 text-[1.7rem] md:text-[2rem] leading-[1.15] text-content text-balance">{article.title}</h3>

          <div className={`reader ${(!open && rest > 0) || article.truncated ? "fade-mask" : ""}`}>
            {article.paragraphs.slice(0, PREVIEW).map((p, i) => (
              <p key={i}>{p}</p>
            ))}
          </div>

          {rest > 0 && (
            <div className="unfold" data-open={open}>
              <div className="reader">
                {article.paragraphs.slice(PREVIEW).map((p, i) => (
                  <p key={i}>{p}</p>
                ))}
              </div>
            </div>
          )}

          {article.truncated && (
            <a
              href={article.url}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-2 flex w-full items-center justify-between border-y border-edge py-4 text-[14px] text-content-dim hover:text-content transition-colors"
            >
              <span>
                Continue at {article.source}
                <span className="text-content-faint"> · free to read{minutes ? ` · ${minutes} min` : ""}</span>
              </span>
              <span aria-hidden>→</span>
            </a>
          )}

          {rest > 0 && !open && (
            <button
              onClick={() => setOpen(true)}
              className="mt-2 w-full border-y border-edge py-4 text-[14px] text-content-dim hover:text-content transition-colors"
            >
              Keep reading <span className="text-content-faint">· {rest} more paragraphs{minutes ? ` · ${minutes} min` : ""}</span>
            </button>
          )}

          <p className="mt-10 text-[12px] text-content-faint">
            {article.truncated ? "Excerpt from" : "Extracted from"}{" "}
            <a href={article.url} target="_blank" rel="noopener noreferrer" className="underline underline-offset-4 decoration-edge hover:decoration-accent">
              {article.source}
            </a>{" "}
            for personal reading. All rights belong to the publisher.
          </p>
        </div>
      )}
    </div>
  );
}
