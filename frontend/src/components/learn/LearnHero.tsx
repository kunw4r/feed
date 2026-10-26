"use client";

import { useEffect, useRef } from "react";
import Link from "next/link";
import { HeroImage } from "@/lib/types";
import NewsImage from "@/components/NewsImage";
import { proxied } from "@/lib/images";

export interface LearnHeroMeta {
  minutes: number;
  chapters: number;
  span: string | null;
}

/** Title split into per-word masks that rise with a stagger (toolkit 04 pattern, pure CSS). */
function SplitTitle({ text, className = "" }: { text: string; className?: string }) {
  return (
    <h1 className={`split ${className}`}>
      {text.split(/\s+/).map((w, i) => (
        <span key={i}>
          <span className="w">
            <span style={{ ["--i" as string]: i }}>{w}</span>
          </span>{" "}
        </span>
      ))}
    </h1>
  );
}

/**
 * Full-bleed deep-dive hero: the photo sits softly out of focus behind a dark
 * scrim while the serif title stays razor sharp (toolkit 12's DOF contrast).
 * Scrolling recedes the image and copy via --p, like the story hero.
 */
export default function LearnHero({
  title,
  subtitle,
  image,
  meta,
}: {
  title: string;
  subtitle: string;
  image: HeroImage | null;
  meta: LearnHeroMeta;
}) {
  const heroRef = useRef<HTMLElement>(null);

  // Hero recedes as you scroll past it (same treatment as story pages)
  useEffect(() => {
    const el = heroRef.current;
    if (!el) return;
    let raf = 0;
    const update = () => {
      raf = 0;
      el.style.setProperty("--p", Math.min(1, window.scrollY / el.offsetHeight).toFixed(4));
    };
    const onScroll = () => {
      if (!raf) raf = requestAnimationFrame(update);
    };
    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header
      ref={heroRef}
      className="relative h-[78svh] min-h-[520px] max-h-[880px] overflow-hidden bg-gradient-to-br from-stone-900 via-stone-800 to-orange-950"
    >
      {image && (
        // Tiny blurred preview so the hero never flashes black while the photo loads
        // eslint-disable-next-line @next/next/no-img-element
        <img src={proxied(image.url, 48)} alt="" aria-hidden referrerPolicy="no-referrer" className="absolute inset-0 h-full w-full object-cover blur-2xl scale-110" />
      )}
      {image ? (
        <NewsImage
          src={image.url}
          priority
          fade
          sizes="(min-width: 1024px) calc(100vw - 240px), 100vw"
          className="hero-media absolute inset-0 h-full w-full object-cover will-change-transform"
          fallback={<div className="hero-media absolute inset-0 bg-gradient-to-br from-stone-900 via-stone-800 to-orange-950" />}
        />
      ) : (
        <div className="hero-media absolute inset-0 bg-gradient-to-br from-stone-900 via-stone-800 to-orange-950" />
      )}
      <div className="absolute inset-0 bg-gradient-to-b from-black/55 via-black/20 to-black/90" />

      <Link
        href="/learn"
        className="absolute left-5 top-[4.25rem] z-10 text-[13px] text-white/75 hover:text-white transition-colors md:left-10 lg:top-8"
      >
        ← Deep dives
      </Link>

      <div className="hero-copy absolute inset-x-0 bottom-0 px-5 pb-14 md:px-10 md:pb-16">
        <p className="rise smallcaps text-[14px] text-white/70">
          Deep dive
          <span className="mx-2 opacity-50">·</span>~{Math.max(1, Math.round(meta.minutes))} min
          <span className="mx-2 opacity-50">·</span>
          {meta.chapters} chapters
          {meta.span && (
            <>
              <span className="mx-2 opacity-50">·</span>
              {meta.span}
            </>
          )}
        </p>
        <SplitTitle
          text={title}
          className="rise mt-4 max-w-5xl font-display text-[2.7rem] leading-[1.0] font-medium text-white text-balance md:text-[4.6rem]"
        />
        <p className="rise mt-5 max-w-2xl font-read text-[1.12rem] leading-[1.5] text-white/80 text-pretty md:text-[1.3rem]" style={{ animationDelay: "240ms" }}>
          {subtitle}
        </p>
      </div>

      {image && (
        <a
          href={image.source_url || "https://commons.wikimedia.org"}
          target="_blank"
          rel="noopener noreferrer"
          className="hero-copy absolute bottom-4 right-5 z-10 text-[11px] text-white/45 hover:text-white/80 transition-colors md:right-10"
        >
          {image.credit}
        </a>
      )}

      <div className="hero-copy absolute bottom-6 right-5 hidden items-center gap-2 text-white/60 md:right-10 lg:flex">
        <span className="smallcaps text-[12px] [writing-mode:vertical-rl]">scroll to read</span>
        <span className="h-10 w-px overflow-hidden bg-white/20">
          <span className="block h-1/2 w-px bg-white animate-[cue_2s_ease-in-out_infinite]" />
        </span>
      </div>
    </header>
  );
}
