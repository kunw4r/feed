"use client";

import { useEffect, useRef } from "react";
import Link from "next/link";
import { HeroImage } from "@/lib/types";
import NewsImage from "@/components/NewsImage";
import { proxied } from "@/lib/images";
import { coverGradient } from "@/lib/tracks";

/**
 * Full-bleed track header, same treatment as the deep-dive hero: the cover sits
 * softly out of focus behind a dark scrim while the serif title stays sharp,
 * and scrolling recedes both via --p.
 */
export default function TrackHero({
  title,
  description,
  image,
  accentSlug,
  meta,
}: {
  title: string;
  description: string;
  image: HeroImage | null;
  accentSlug: string;
  meta: string;
}) {
  const heroRef = useRef<HTMLElement>(null);

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
      className="relative h-[52svh] min-h-[380px] max-h-[620px] overflow-hidden"
      style={{ background: coverGradient(accentSlug) }}
    >
      {image && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={proxied(image.url, 48)} alt="" aria-hidden referrerPolicy="no-referrer" className="absolute inset-0 h-full w-full object-cover blur-2xl scale-110" />
      )}
      {image ? (
        <NewsImage
          src={image.url}
          priority
          fade
          sizes="100vw"
          className="hero-media absolute inset-0 h-full w-full object-cover will-change-transform"
          fallback={<div className="hero-media absolute inset-0" style={{ background: coverGradient(accentSlug) }} />}
        />
      ) : (
        <div className="hero-media absolute inset-0" style={{ background: coverGradient(accentSlug) }} />
      )}
      <div className="absolute inset-0 bg-gradient-to-b from-black/45 via-black/20 to-black/90" />

      <Link
        href="/tracks"
        className="absolute left-5 top-[4.25rem] z-10 text-[13px] text-white/75 hover:text-white transition-colors md:left-10 lg:top-8"
      >
        ← Learning tracks
      </Link>

      <div className="hero-copy absolute inset-x-0 bottom-0 px-5 pb-12 md:px-10 md:pb-14">
        <p className="rise smallcaps text-[14px] text-white/70">{meta}</p>
        <h1 className="rise mt-3 max-w-4xl font-display text-[2.5rem] leading-[1.02] font-medium text-white text-balance md:text-[4rem]" style={{ animationDelay: "80ms" }}>
          {title}
        </h1>
        <p className="rise mt-4 max-w-2xl font-read text-[1.1rem] leading-[1.5] text-white/80 text-pretty md:text-[1.2rem]" style={{ animationDelay: "160ms" }}>
          {description}
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
    </header>
  );
}
