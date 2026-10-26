import type { Metadata } from "next";
import { readFile } from "fs/promises";
import path from "path";
import Link from "next/link";
import { HeroImage } from "@/lib/types";
import PageHeader from "@/components/PageHeader";
import NewsImage from "@/components/NewsImage";
import { proxied } from "@/lib/images";
import { Reveal } from "@/components/motion";

export const metadata: Metadata = { title: "Deep dives", description: "Major world events explained from scratch." };

interface LearnEvent {
  slug: string;
  title: string;
  subtitle: string;
  hero_image?: HeroImage;
}

/** Editorial tile artwork: the Wikipedia photo, or a warm gradient with a serif initial when none was found. */
function TileArt({ event, priority, sizes }: { event: LearnEvent; priority?: boolean; sizes: string }) {
  if (!event.hero_image) {
    return (
      <div className="absolute inset-0 bg-gradient-to-br from-stone-900 via-stone-800 to-orange-950">
        <span className="absolute -bottom-7 right-3 font-display text-[9rem] italic leading-none text-white/10">
          {event.title.replace(/^The\s/i, "").charAt(0)}
        </span>
      </div>
    );
  }
  return (
    <>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={proxied(event.hero_image.url, 48)} alt="" aria-hidden referrerPolicy="no-referrer" className="absolute inset-0 h-full w-full object-cover blur-2xl scale-110" />
      <NewsImage
        src={event.hero_image.url}
        priority={priority}
        fade
        sizes={sizes}
        className="card-img absolute inset-0 h-full w-full object-cover"
        fallback={<div className="card-img absolute inset-0 bg-gradient-to-br from-stone-900 via-stone-800 to-orange-950" />}
      />
    </>
  );
}

export default async function LearnPage() {
  const events: LearnEvent[] = JSON.parse(await readFile(path.join(process.cwd(), "public/data/learn-index.json"), "utf8"));
  const [feature, ...rest] = events;

  return (
    <div className="mx-auto max-w-[1400px] px-5 pb-24 md:px-10">
      <PageHeader
        kicker="Deep dives"
        title="The events behind the news"
        standfirst="The big moments that today's headlines keep pointing back to, explained from scratch. No prior knowledge needed."
      />

      {feature && (
        <Reveal>
          <Link
            href={`/learn/${feature.slug}`}
            className="group relative block h-[56svh] min-h-[400px] max-h-[640px] overflow-hidden rounded-[28px] bg-black card-depth"
          >
            <TileArt event={feature} priority sizes="(min-width: 1024px) calc(100vw - 320px), 100vw" />
            <div className="scrim absolute inset-0" />
            <div className="absolute inset-x-0 bottom-0 p-6 md:p-12 max-w-4xl">
              <p className="smallcaps text-[14px] text-white/70">Start here · the featured deep dive</p>
              <h2 className="mt-3 font-display text-[2rem] leading-[1.05] font-medium text-white text-balance md:text-[3.4rem]">
                {feature.title}
              </h2>
              <p className="mt-4 max-w-2xl font-read text-[1.08rem] leading-[1.5] text-white/80 text-pretty md:text-[1.2rem]">
                {feature.subtitle}
              </p>
            </div>
          </Link>
        </Reveal>
      )}

      <ol className="mt-8 grid gap-x-6 gap-y-10 sm:grid-cols-2 xl:grid-cols-3">
        {rest.map((e, i) => {
          const [main, sub] = e.title.split(/:\s(.+)/);
          return (
            <Reveal as="li" key={e.slug} delay={Math.min(i, 8) * 50} className="flex">
              <Link href={`/learn/${e.slug}`} className="group block flex-1">
                <div className="card-depth relative aspect-[4/3] overflow-hidden rounded-[22px] bg-surface-inset">
                  <TileArt event={e} sizes="(min-width: 1280px) 30vw, (min-width: 640px) 45vw, 100vw" />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/25 to-transparent" />
                  <span className="absolute left-4 top-3 font-display text-[1.4rem] italic leading-none text-white/85 drop-shadow">
                    {String(i + 2).padStart(2, "0")}
                  </span>
                  <div className="absolute inset-x-0 bottom-0 p-5">
                    <h3 className="font-display text-[1.45rem] leading-[1.12] text-white text-balance">
                      {main}
                      {sub && <span className="text-white/75">: {sub}</span>}
                    </h3>
                  </div>
                </div>
                <p className="mt-3 px-1 font-read text-[0.98rem] leading-[1.5] text-content-dim line-clamp-2">{e.subtitle}</p>
              </Link>
            </Reveal>
          );
        })}
      </ol>
    </div>
  );
}
