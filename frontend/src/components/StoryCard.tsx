"use client";

import { CardStory, CATEGORY_CONFIG, REGION_CONFIG } from "@/lib/types";
import { useProgress } from "@/lib/progress";
import Link from "next/link";
import NewsImage, { proxied } from "./NewsImage";

type Variant = "hero" | "rail" | "row";

interface StoryCardProps {
  story: CardStory;
  variant?: Variant;
  rank?: number;
  isNew?: boolean;
  /** Rail laid out as a grid on wide screens: card fills its column, landscape photo */
  grid?: boolean;
}

// Category-tinted fallback when a story has no usable image
const FALLBACK_TINT: Record<string, string> = {
  POLITICS_POLICY: "from-violet-950 via-violet-800 to-fuchsia-700",
  ECONOMY_MARKETS: "from-emerald-950 via-emerald-800 to-teal-600",
  SCIENCE_TECH: "from-sky-950 via-sky-800 to-cyan-600",
  SOCIETY_CULTURE: "from-amber-950 via-amber-800 to-orange-600",
  ENVIRONMENT_CLIMATE: "from-teal-950 via-teal-800 to-lime-600",
  CRIME_SAFETY: "from-red-950 via-red-800 to-rose-600",
  HEALTH: "from-rose-950 via-rose-800 to-pink-600",
  UNCATEGORISED: "from-stone-900 via-stone-700 to-stone-500",
};

export function CardImage({
  story,
  sizes,
  className = "",
  priority,
}: {
  story: CardStory;
  sizes: string;
  className?: string;
  priority?: boolean;
}) {
  const tint = FALLBACK_TINT[story.category] || FALLBACK_TINT.UNCATEGORISED;
  return (
    <>
      {/* Tinted wash sits under the photo while it loads, so cards never flash black */}
      {story.image_url && <div className={`absolute inset-0 bg-gradient-to-br ${tint} opacity-60`} />}
      {story.image_url && priority && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={proxied(story.image_url, 48)} alt="" aria-hidden referrerPolicy="no-referrer" className="absolute inset-0 h-full w-full object-cover blur-2xl scale-110" />
      )}
      <NewsImage
        src={story.image_url}
        sizes={sizes}
        priority={priority}
        fade
        className={`card-img absolute inset-0 h-full w-full object-cover ${className}`}
        fallback={<div className={`card-img absolute inset-0 bg-gradient-to-br ${tint} ${className}`} />}
      />
    </>
  );
}

function Kicker({ story, light, isNew }: { story: CardStory; light?: boolean; isNew?: boolean }) {
  const cat = CATEGORY_CONFIG[story.category] || CATEGORY_CONFIG.UNCATEGORISED;
  const region = story.region_code ? REGION_CONFIG[story.region_code] : null;
  return (
    <p className={`smallcaps text-[13px] ${light ? "text-white/70" : "text-content-faint"}`}>
      {isNew && (
        <span className="mr-2 inline-flex items-center gap-1.5 text-accent">
          <span className="h-1.5 w-1.5 rounded-full bg-accent animate-pulse" />
          New
        </span>
      )}
      {(story.thread_size ?? 0) > 1 && (
        <span className={`mr-2 ${light ? "text-white" : "text-accent"}`}>Developing · {story.thread_size} parts</span>
      )}
      {region?.label ?? cat.label}
      <span className="mx-1.5 opacity-50">·</span>
      {cat.label}
      {story.reading_minutes ? <span className="opacity-70"> · {story.reading_minutes} min</span> : null}
    </p>
  );
}

export default function StoryCard({ story, variant = "rail", rank, isNew, grid }: StoryCardProps) {
  const progress = useProgress();
  const isRead = Boolean(progress.read[story.id]);

  if (variant === "hero") {
    return (
      <Link prefetch={false} href={`/story/${story.id}`} className="card-depth group relative block overflow-hidden rounded-[28px] bg-black h-[62svh] min-h-[440px] max-h-[640px]">
        <CardImage story={story} className="opacity-90" priority sizes="(min-width: 1024px) calc(100vw - 320px), 100vw" />
        <div className="scrim absolute inset-0" />
        <div className="absolute inset-x-0 bottom-0 p-6 md:p-12 max-w-4xl">
          <Kicker story={story} light isNew={isNew} />
          <h2 className="font-display mt-3 text-[2.2rem] md:text-[3.6rem] leading-[1.02] font-medium text-white text-balance">
            {story.simplified_title}
          </h2>
          <p className="font-read mt-4 max-w-2xl text-[1.1rem] md:text-[1.25rem] leading-[1.5] text-white/80 text-pretty">
            {story.quick_summary}
          </p>
          {isRead && <p className="mt-4 text-[12px] text-white/60">✓ Read</p>}
        </div>
      </Link>
    );
  }

  if (variant === "row") {
    return (
      <Link prefetch={false} href={`/story/${story.id}`} className="group grid grid-cols-[2.2rem_1fr_88px] md:grid-cols-[3rem_1fr_132px] items-start gap-4 md:gap-6 py-6">
        <span className="font-display italic text-[1.8rem] md:text-[2.4rem] leading-none text-accent/80">{rank}</span>
        <div className="min-w-0">
          <Kicker story={story} isNew={isNew} />
          <h3 className={`font-display mt-1.5 text-[1.3rem] md:text-[1.55rem] leading-[1.15] transition-colors group-hover:text-accent text-balance ${isRead ? "text-content-dim" : "text-content"}`}>
            {story.simplified_title}
          </h3>
          <p className="font-read mt-2 text-[1.02rem] leading-[1.5] text-content-dim line-clamp-2">{story.quick_summary}</p>
        </div>
        <div className="relative aspect-square overflow-hidden rounded-2xl card-depth">
          <CardImage story={story} sizes="(min-width: 768px) 132px, 88px" />
        </div>
      </Link>
    );
  }

  return (
    <Link
      prefetch={false}
      href={`/story/${story.id}`}
      className={`group block w-[78vw] max-w-[320px] flex-shrink-0 snap-start ${grid ? "xl:w-auto xl:max-w-none" : ""}`}
    >
      <div className={`card-depth relative aspect-[4/5] overflow-hidden rounded-[22px] bg-surface-inset ${grid ? "xl:aspect-[4/3]" : ""}`}>
        <CardImage story={story} sizes="320px" />
        <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/20 to-transparent" />
        {isRead && (
          <span className="absolute top-3 right-3 rounded-full bg-black/50 backdrop-blur px-2.5 py-1 text-[11px] text-white/90">Read</span>
        )}
        <div className="absolute inset-x-0 bottom-0 p-5">
          <Kicker story={story} light isNew={isNew} />
          <h3 className="font-display mt-2 text-[1.35rem] leading-[1.12] text-white text-balance">{story.simplified_title}</h3>
        </div>
      </div>
      <p className="font-read mt-3 px-1 text-[0.98rem] leading-[1.5] text-content-dim line-clamp-3">{story.quick_summary}</p>
    </Link>
  );
}
