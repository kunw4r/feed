import type { Metadata } from "next";
import { readFile } from "fs/promises";
import path from "path";
import Link from "next/link";
import { notFound } from "next/navigation";
import { HeroImage, Story } from "@/lib/types";
import { fetchAllKnownStories } from "@/lib/api";
import AskClaude from "@/components/AskClaude";
import NewsImage from "@/components/NewsImage";
import { Reveal } from "@/components/motion";
import LearnHero from "@/components/learn/LearnHero";
import LearnReader, { Chapter, LearnSection } from "@/components/learn/LearnReader";
import Finale from "@/components/learn/Finale";

export const dynamicParams = false;

const DATA = path.join(process.cwd(), "public/data");
const WPM = 230;

interface LearnEvent {
  slug: string;
  title: string;
  subtitle: string;
  sections: { heading: string; content: string }[];
  key_concepts: { term: string; definition: string; context: string }[];
  timeline: { date: string; event: string }[];
  why_it_still_matters: string;
  discussion_questions: string[];
  hero_image?: HeroImage;
}

interface IndexEntry {
  slug: string;
  title: string;
  subtitle: string;
  hero_image?: HeroImage;
}

export async function generateStaticParams() {
  const index: IndexEntry[] = JSON.parse(await readFile(path.join(DATA, "learn-index.json"), "utf8"));
  return index.map((e) => ({ slug: e.slug }));
}

async function getEvent(slug: string): Promise<LearnEvent | null> {
  try {
    return { slug, ...JSON.parse(await readFile(path.join(DATA, `learn-${slug}.json`), "utf8")) };
  } catch {
    return null;
  }
}

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const e = await getEvent((await params).slug);
  return {
    title: e?.title,
    description: e?.subtitle,
    openGraph: { title: e?.title, description: e?.subtitle, images: e?.hero_image ? [e.hero_image.url] : undefined },
  };
}

const words = (s: string) => s.split(/\s+/).filter(Boolean).length;

const STOP = new Set(
  `this that with from have been were their about which would could should there these those into more also
   than then when what your will they them after under over while where being every because between during
   through before other others another world first new some many most much very often around still today`
    .split(/\s+/)
    .filter(Boolean),
);

/** Build-time "related in the news": stories whose text overlaps the deep dive's keywords. */
function findRelated(event: LearnEvent, stories: Story[]) {
  const raw = [
    event.title,
    event.subtitle,
    event.why_it_still_matters,
    ...(event.key_concepts ?? []).map((c) => c.term),
    ...(event.sections ?? []).map((s) => s.heading),
  ]
    .join(" ")
    .toLowerCase();
  const keywords = [...new Set((raw.match(/[a-z][a-z'’-]{3,}/g) ?? []).filter((w) => !STOP.has(w)))];
  if (!keywords.length) return [];
  return stories
    .map((s) => {
      const text = `${s.simplified_title} ${s.quick_summary} ${s.why_it_matters ?? ""} ${(s.concepts ?? [])
        .map((c) => c.term)
        .join(" ")} ${s.category}`.toLowerCase();
      let score = 0;
      for (const k of keywords) if (text.includes(k)) score++;
      return { s, score };
    })
    .filter((x) => x.score >= 3)
    .sort((a, b) => b.score - a.score || b.s.impact_score - a.s.impact_score)
    .slice(0, 3)
    .map((x) => x.s);
}

export default async function LearnEventPage({ params }: Props) {
  const event = await getEvent((await params).slug);
  if (!event) notFound();

  const index: IndexEntry[] = JSON.parse(await readFile(path.join(DATA, "learn-index.json"), "utf8"));
  const idx = index.findIndex((e) => e.slug === event.slug);
  const prev = idx > 0 ? index[idx - 1] : null;
  const next = idx >= 0 && idx < index.length - 1 ? index[idx + 1] : null;

  const timeline = event.timeline ?? [];
  const concepts = event.key_concepts ?? [];
  const sections: LearnSection[] = event.sections.map((s, i) => ({
    id: `s${i}`,
    heading: s.heading,
    paragraphs: s.content.split("\n\n").filter(Boolean),
  }));

  // Chapters (nav + numbering) with cumulative reading time
  let total = 0;
  const add = (id: string, label: string, text: string, inlineOnly?: boolean): Chapter => {
    total += words(text) / WPM;
    return { id, label, minutes: total, inlineOnly };
  };
  const chapters: Chapter[] = [];
  if (timeline.length) chapters.push(add("timeline", "Timeline", timeline.map((t) => t.event).join(" ")));
  sections.forEach((s, i) => chapters.push(add(`s${i}`, s.heading, s.paragraphs.join(" "))));
  if (concepts.length) chapters.push(add("words", "Words to know", concepts.map((c) => c.definition).join(" "), true));
  chapters.push(add("think", "Think it over", (event.discussion_questions ?? []).join(" ")));

  const years = timeline.map((t) => t.date.match(/\d{4}/)?.[0]).filter(Boolean).map(Number);
  const span = years.length ? `${Math.min(...years)}–${Math.max(...years)}` : null;

  const context = `Topic: ${event.title}\nSummary: ${event.subtitle}\nWhy it matters: ${event.why_it_still_matters}`;

  // "Why it still matters" leads with its strongest sentence as a standfirst
  const why = event.why_it_still_matters?.trim() ?? "";
  const lead = why.match(/^[\s\S]*?[.!?](?:\s|$)/)?.[0]?.trim() ?? why;
  const rest = why === lead ? "" : why.slice(lead.length).trim();

  const related = findRelated(event, await fetchAllKnownStories());

  return (
    <div>
      <LearnHero
        title={event.title}
        subtitle={event.subtitle}
        image={event.hero_image ?? null}
        meta={{ minutes: total, chapters: chapters.length, span }}
      />

      {why && (
        <section className="mx-auto max-w-[760px] px-5 pb-16 pt-14 md:px-10 md:pt-20">
          <Reveal className="border-l-2 border-accent pl-6 md:pl-10">
            <p className="smallcaps text-[13px] text-content-faint">Why it still matters</p>
            <p className="mt-4 font-display text-[1.4rem] font-medium leading-[1.32] text-content text-pretty md:text-[1.85rem]">
              {lead}
            </p>
            {rest && (
              <p className="mt-5 font-read text-[1.08rem] leading-[1.65] text-content-dim md:text-[1.2rem]">{rest}</p>
            )}
          </Reveal>
        </section>
      )}

      <LearnReader
        chapters={chapters}
        timeline={timeline}
        sections={sections}
        concepts={concepts}
        glance={{ span, chapters: chapters.length, minutes: total }}
      />

      {(event.discussion_questions ?? []).length > 0 && (
        <Finale id="think" n={chapters.length} questions={event.discussion_questions} context={context} />
      )}

      {/* ── Related in the news ── */}
      {related.length > 0 && (
        <section className="mx-auto max-w-[1360px] px-5 pb-20 pt-16 md:px-10">
          <Reveal className="mb-9 flex items-baseline gap-5">
            <p className="smallcaps whitespace-nowrap text-[14px] text-content-faint">In today&apos;s news</p>
            <span className="h-px flex-1 bg-edge" />
            <p className="hidden text-[12px] text-content-faint sm:block">stories from the feed that connect to this deep dive</p>
          </Reveal>
          <div className="grid gap-10 md:grid-cols-3">
            {related.map((s) => (
              <Link key={s.id} href={`/story/${s.id}`} className="group block">
                <div className="card-depth relative aspect-[16/10] overflow-hidden rounded-[18px] bg-surface-inset">
                  <NewsImage
                    src={s.image_url}
                    sizes="(min-width: 768px) 33vw, 100vw"
                    className="card-img absolute inset-0 h-full w-full object-cover"
                    fallback={<div className="card-img absolute inset-0 bg-gradient-to-br from-stone-900 via-stone-800 to-orange-950" />}
                  />
                </div>
                <h3 className="mt-4 font-display text-[1.3rem] leading-tight text-content transition-colors group-hover:text-accent">
                  {s.simplified_title}
                </h3>
                <p className="mt-2 font-read text-[1.02rem] leading-[1.5] text-content-dim line-clamp-2">{s.quick_summary}</p>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* ── Previous / next deep dive ── */}
      <nav className="mx-auto max-w-[1360px] px-5 pb-24 md:px-10" aria-label="More deep dives">
        <div className="grid gap-6 border-t border-edge pt-8 sm:grid-cols-2 sm:gap-0">
          {prev ? (
            <Link href={`/learn/${prev.slug}`} className="group block sm:pr-10">
              <p className="smallcaps text-[13px] text-content-faint">← Previous deep dive</p>
              <p className="mt-2 font-display text-[1.4rem] leading-tight text-content-dim transition-colors group-hover:text-accent">
                {prev.title}
              </p>
            </Link>
          ) : (
            <Link href="/learn" className="group block sm:pr-10">
              <p className="smallcaps text-[13px] text-content-faint">← All deep dives</p>
              <p className="mt-2 font-display text-[1.4rem] leading-tight text-content-dim transition-colors group-hover:text-accent">
                Back to the index
              </p>
            </Link>
          )}
          {next && (
            <Link href={`/learn/${next.slug}`} className="group block sm:border-l sm:border-edge sm:pl-10 sm:text-right">
              <p className="smallcaps text-[13px] text-content-faint">Next deep dive →</p>
              <p className="mt-2 font-display text-[1.4rem] leading-tight text-content-dim transition-colors group-hover:text-accent">
                {next.title}
              </p>
            </Link>
          )}
        </div>
      </nav>

      <AskClaude subject={event.title} context={context} />
    </div>
  );
}
