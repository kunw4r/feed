import type { Metadata } from "next";
import Link from "next/link";
import { fetchArchiveIndex } from "@/lib/api";
import PageHeader from "@/components/PageHeader";
import { Reveal } from "@/components/motion";

export const metadata: Metadata = { title: "Archive", description: "Past editions of Brainfeed." };

export default async function ArchivePage() {
  const days = await fetchArchiveIndex();

  return (
    <div className="max-w-4xl px-4 md:px-10 pb-24">
      <PageHeader kicker="Back issues" title="The archive" standfirst="Every edition from the last 30 days, as it stood at the end of the day." />
      {days.length === 0 && <p className="font-read text-content-faint">No past editions yet. Check back tomorrow.</p>}
      <ol className="divide-y divide-edge border-y border-edge">
        {days.map((d, i) => {
          const label = new Date(d.date + "T12:00:00+10:00").toLocaleDateString("en-AU", {
            weekday: "long",
            day: "numeric",
            month: "long",
            timeZone: "Australia/Brisbane",
          });
          return (
            <Reveal as="li" key={d.date} delay={Math.min(i, 8) * 50}>
              <Link href={`/archive/${d.date}`} className="group grid grid-cols-[1fr_96px] md:grid-cols-[220px_1fr_120px] items-center gap-4 md:gap-8 py-6">
                <div>
                  <p className="font-display text-[1.35rem] leading-tight text-content group-hover:text-accent transition-colors">{label}</p>
                  <p className="mt-1 text-[13px] text-content-faint">{d.total_stories} stories</p>
                </div>
                <p className="hidden md:block font-read text-[1.05rem] leading-snug text-content-dim line-clamp-2">
                  {d.lead?.simplified_title}
                </p>
                <div className="relative aspect-[4/3] overflow-hidden rounded-xl bg-surface-inset">
                  {d.lead?.image_url && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={d.lead.image_url} alt="" loading="lazy" referrerPolicy="no-referrer" className="absolute inset-0 h-full w-full object-cover" />
                  )}
                </div>
              </Link>
            </Reveal>
          );
        })}
      </ol>
    </div>
  );
}
