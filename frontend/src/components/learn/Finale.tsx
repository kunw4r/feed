"use client";

import { useEffect, useRef } from "react";
import { openClaude } from "@/components/AskClaude";
import { Reveal } from "@/components/motion";

/**
 * The "Think it over" finale. The section itself is always deep ink with paper
 * type; while it is in view it also flips the page background to the same ink
 * (toolkit 08's scroll narrative), so the ending feels like a different room.
 * Reduced motion makes the flip instant rather than removing it.
 */
export default function Finale({
  id,
  n,
  questions,
  context,
}: {
  id: string;
  n: number;
  questions: string[];
  context: string;
}) {
  const ref = useRef<HTMLElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(
      ([e]) => {
        if (e.isIntersecting) document.body.dataset.finale = "on";
        else delete document.body.dataset.finale;
      },
      { rootMargin: "-35% 0px -25% 0px" },
    );
    io.observe(el);
    return () => {
      io.disconnect();
      delete document.body.dataset.finale;
    };
  }, []);

  return (
    <section
      ref={ref}
      id={id}
      className="scroll-mt-24 bg-[#17110b] text-[#f3ede4]"
    >
      <div className="mx-auto max-w-[1100px] px-5 py-24 md:px-10 md:py-32">
        <Reveal className="mb-12 flex items-baseline gap-4">
          <span className="font-display italic text-[22px] leading-none text-[#ff7a4d]">{String(n).padStart(2, "0")}</span>
          <h2 className="font-display text-[1.6rem] leading-tight font-medium text-[#f3ede4] md:text-[2rem]">Think it over</h2>
          <span className="h-px flex-1 translate-y-[-4px] bg-white/15" />
        </Reveal>

        <Reveal as="p" className="mb-14 max-w-2xl font-read text-[1.15rem] leading-[1.6] text-white/70 md:text-[1.3rem]">
          There is no answer key here. Turn each question over — and if you want a thinking partner, Claude is one tap away.
        </Reveal>

        <ol className="space-y-14">
          {questions.map((q, i) => (
            <Reveal as="li" key={i} className="grid grid-cols-[2.2rem_1fr] gap-3 md:grid-cols-[3.5rem_1fr] md:gap-6">
              <span className="font-display text-[1.4rem] italic leading-none text-[#ff7a4d]">{i + 1}</span>
              <div>
                <p className="font-display text-[1.45rem] leading-[1.25] text-balance md:text-[2.15rem]">{q}</p>
                <button
                  type="button"
                  onClick={() => openClaude(context, q)}
                  className="mt-4 rounded-full border border-white/25 px-4 py-1.5 text-[12.5px] text-white/75 transition-colors hover:border-[#ff7a4d] hover:text-white"
                >
                  Ask Claude about this →
                </button>
              </div>
            </Reveal>
          ))}
        </ol>
      </div>
    </section>
  );
}
