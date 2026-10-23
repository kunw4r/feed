import type { Metadata } from "next";
import { readFile } from "fs/promises";
import path from "path";
import { notFound } from "next/navigation";
import PageHeader from "@/components/PageHeader";
import AskClaude from "@/components/AskClaude";
import { InkText, Reveal } from "@/components/motion";

export const dynamicParams = false;

const DATA = path.join(process.cwd(), "public/data");

interface LearnEvent {
  slug: string;
  title: string;
  subtitle: string;
  sections: { heading: string; content: string }[];
  key_concepts: { term: string; definition: string; context: string }[];
  timeline: { date: string; event: string }[];
  why_it_still_matters: string;
  discussion_questions: string[];
}

export async function generateStaticParams() {
  const index: { slug: string }[] = JSON.parse(await readFile(path.join(DATA, "learn-index.json"), "utf8"));
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
  return { title: e?.title, description: e?.subtitle };
}

function Head({ n, label }: { n: number; label: string }) {
  return (
    <Reveal className="mb-8 flex items-baseline gap-4">
      <span className="font-display italic text-accent text-[22px] leading-none">{String(n).padStart(2, "0")}</span>
      <h2 className="font-display text-[1.6rem] md:text-[2rem] leading-tight font-medium text-content">{label}</h2>
    </Reveal>
  );
}

export default async function LearnEventPage({ params }: Props) {
  const event = await getEvent((await params).slug);
  if (!event) notFound();
  let n = 0;

  return (
    <div className="max-w-3xl px-4 md:px-10 pb-24">
      <PageHeader back={{ href: "/learn", label: "Deep dives" }} title={event.title} standfirst={event.subtitle} />

      {event.why_it_still_matters && (
        <section className="mb-20">
          <p className="smallcaps text-[13px] text-content-faint mb-4">Why it still matters</p>
          <InkText text={event.why_it_still_matters} className="font-display italic text-[1.5rem] md:text-[1.9rem] leading-[1.3] text-content text-pretty" />
        </section>
      )}

      {event.timeline?.length > 0 && (
        <section className="mb-20">
          <Head n={++n} label="Timeline" />
          <ol className="border-t border-edge">
            {event.timeline.map((t, i) => (
              <Reveal as="li" key={i} delay={Math.min(i, 6) * 40} className="grid grid-cols-[5.5rem_1fr] md:grid-cols-[7rem_1fr] gap-4 border-b border-edge py-3.5">
                <span className="font-display text-[1.05rem] text-accent tabular-nums">{t.date}</span>
                <span className="font-read text-[1.05rem] leading-snug text-content-dim">{t.event}</span>
              </Reveal>
            ))}
          </ol>
        </section>
      )}

      {event.sections.map((s) => (
        <section key={s.heading} className="mb-20">
          <Head n={++n} label={s.heading} />
          <div className="space-y-6">
            {s.content.split("\n\n").map((p, i) => (
              <Reveal as="p" key={i} className="prose-read">{p}</Reveal>
            ))}
          </div>
        </section>
      ))}

      {event.key_concepts?.length > 0 && (
        <section className="mb-20">
          <Head n={++n} label="Words to know" />
          <dl className="divide-y divide-edge border-y border-edge">
            {event.key_concepts.map((c) => (
              <Reveal key={c.term} className="grid gap-1 py-5 md:grid-cols-[180px_1fr] md:gap-8">
                <dt className="font-read italic text-[1.1rem] text-content">{c.term}</dt>
                <dd>
                  <p className="text-[15px] leading-relaxed text-content-dim">{c.definition}</p>
                  {c.context && <p className="mt-1.5 text-[13px] text-content-faint">{c.context}</p>}
                </dd>
              </Reveal>
            ))}
          </dl>
        </section>
      )}

      {event.discussion_questions?.length > 0 && (
        <section>
          <Head n={++n} label="Think it over" />
          <ol className="space-y-5">
            {event.discussion_questions.map((q, i) => (
              <Reveal as="li" key={i} className="grid grid-cols-[1.8rem_1fr] gap-2 font-read italic text-[1.15rem] leading-snug text-content">
                <span className="not-italic font-display text-accent">{i + 1}</span>
                {q}
              </Reveal>
            ))}
          </ol>
        </section>
      )}

      <AskClaude
        subject={event.title}
        context={`Topic: ${event.title}\nSummary: ${event.subtitle}\nWhy it matters: ${event.why_it_still_matters}`}
      />
    </div>
  );
}
