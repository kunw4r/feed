import type { Metadata } from "next";
import Link from "next/link";
import { fetchArchiveIndex } from "@/lib/api";
import PageHeader from "@/components/PageHeader";
import NewsImage from "@/components/NewsImage";
import { Reveal } from "@/components/motion";

export const metadata: Metadata = { title: "Archive", description: "Past editions of Brainfeed." };

const TZ = "Australia/Brisbane";

const atNoon = (date: string) => new Date(date + "T12:00:00+10:00");

export default async function ArchivePage() {
  const days = await fetchArchiveIndex();

  // Group editions under month headings, newest first
  const months: { label: string; days: typeof days }[] = [];
  for (const d of days) {
    const label = atNoon(d.date).toLocaleDateString("en-AU", { month: "long", year: "numeric", timeZone: TZ });
    const last = months[months.length - 1];
    if (last && last.label === label) last.days.push(d);
    else months.push({ label, days: [d] });
  }

  return (
    <div className="mx-auto max-w-[1400px] px-5 md:px-10 pb-24">
      <PageHeader
        kicker="Back issues"
        title="The archive"
        standfirst="Every edition from the last 30 days, as it stood at the end of the day."
      />
      {days.length === 0 && (
        <p className="font-read text-content-faint">No past editions yet. Check back tomorrow.</p>
      )}

      {months.map((month) => (
        <section key={month.label} className="mb-14">
          <Reveal className="mb-6 flex items-baseline gap-5">
            <h2 className="font-display text-[1.6rem] leading-none text-content">{month.label}</h2>
            <span className="h-px flex-1 bg-edge" />
            <p className="text-[12px] text-content-faint">
              {month.days.length} {month.days.length === 1 ? "edition" : "editions"}
            </p>
          </Reveal>
          <ol className="grid gap-x-6 gap-y-10 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {month.days.map((d, i) => {
              const date = atNoon(d.date);
              const weekday = date.toLocaleDateString("en-AU", { weekday: "long", timeZone: TZ });
              const dayNum = date.toLocaleDateString("en-AU", { day: "numeric", timeZone: TZ });
              return (
                <Reveal as="li" key={d.date} delay={Math.min(i, 8) * 50} className="flex">
                  <Link
                    href={`/archive/${d.date}`}
                    className="group card-depth relative block aspect-[3/4] flex-1 overflow-hidden rounded-[22px] bg-surface-inset"
                  >
                    <NewsImage
                      src={d.lead?.image_url}
                      sizes="(min-width: 1280px) 25vw, (min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
                      className="card-img absolute inset-0 h-full w-full object-cover"
                      fallback={<div className="card-img absolute inset-0 bg-gradient-to-br from-stone-900 via-stone-800 to-orange-950" />}
                    />
                    <div className="absolute inset-0 bg-gradient-to-b from-black/55 via-black/10 to-black/85" />
                    <div className="absolute left-5 top-4">
                      <p className="smallcaps text-[12px] text-white/70">{weekday}</p>
                      <p className="font-display mt-1 text-[2.6rem] italic leading-none text-white drop-shadow">{dayNum}</p>
                    </div>
                    <div className="absolute inset-x-0 bottom-0 p-5">
                      <h3 className="font-display text-[1.2rem] leading-[1.25] text-white text-balance line-clamp-3">
                        {d.lead?.simplified_title ?? "The day's edition"}
                      </h3>
                      <p className="mt-2.5 flex items-center gap-2 text-[12px] text-white/70">
                        {d.total_stories} stories
                        <span className="ml-auto font-medium text-white opacity-0 transition-opacity group-hover:opacity-100 max-lg:opacity-100">
                          Open →
                        </span>
                      </p>
                    </div>
                  </Link>
                </Reveal>
              );
            })}
          </ol>
        </section>
      ))}
    </div>
  );
}
