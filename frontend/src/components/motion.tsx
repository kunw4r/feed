"use client";

import { useEffect, useRef, useState } from "react";

// Scroll-driven motion primitives. All of them collapse to static content under
// prefers-reduced-motion (handled in globals.css).

/** Fades + lifts + unblurs its children the first time they enter the viewport. */
export function Reveal({
  children,
  as: Tag = "div",
  delay = 0,
  className = "",
}: {
  children: React.ReactNode;
  as?: "div" | "p" | "section" | "li" | "h2" | "h3";
  delay?: number;
  className?: string;
}) {
  const ref = useRef<HTMLElement>(null);
  const [shown, setShown] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(
      ([e]) => {
        if (e.isIntersecting) {
          setShown(true);
          io.disconnect();
        }
      },
      { rootMargin: "0px 0px -12% 0px" },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  return (
    <Tag
      ref={ref as React.Ref<never>}
      data-shown={shown}
      style={{ transitionDelay: `${delay}ms` }}
      className={`reveal ${className}`}
    >
      {children}
    </Tag>
  );
}

/**
 * 0→1 progress of an element travelling through the viewport, written to a CSS
 * variable (--p) on the element so styles can react without React re-renders.
 * start/end are viewport fractions where progress is 0 and 1 respectively.
 */
export function useScrollVar<T extends HTMLElement>(start = 0.9, end = 0.35) {
  const ref = useRef<T>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    let raf = 0;
    const update = () => {
      raf = 0;
      const r = el.getBoundingClientRect();
      const vh = window.innerHeight;
      const p = (vh * start - r.top) / (vh * (start - end) + r.height * 0.5);
      el.style.setProperty("--p", Math.max(0, Math.min(1, p)).toFixed(4));
    };
    const onScroll = () => {
      if (!raf) raf = requestAnimationFrame(update);
    };
    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      cancelAnimationFrame(raf);
    };
  }, [start, end]);
  return ref;
}

/** Text whose words ink in, one after another, as it scrolls through the viewport. */
export function InkText({ text, className = "" }: { text: string; className?: string }) {
  const ref = useScrollVar<HTMLParagraphElement>(0.85, 0.3);
  const words = text.split(/\s+/);
  return (
    <p ref={ref} className={`ink ${className}`} style={{ ["--n" as string]: words.length }}>
      {words.map((w, i) => (
        <span key={i} style={{ ["--i" as string]: i }}>
          {w}{" "}
        </span>
      ))}
    </p>
  );
}
