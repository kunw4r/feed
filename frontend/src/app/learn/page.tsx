import type { Metadata } from "next";
import { readFile } from "fs/promises";
import path from "path";
import Link from "next/link";
import PageHeader from "@/components/PageHeader";
import { Reveal } from "@/components/motion";

export const metadata: Metadata = { title: "Deep dives", description: "Major world events explained from scratch." };

interface LearnEvent {
  slug: string;
  title: string;
  subtitle: string;
}

export default async function LearnPage() {
  const events: LearnEvent[] = JSON.parse(await readFile(path.join(process.cwd(), "public/data/learn-index.json"), "utf8"));

  return (
    <div className="max-w-4xl px-4 md:px-10 pb-24">
      <PageHeader
        kicker="Deep dives"
        title="The events behind the news"
        standfirst="The big moments that today's headlines keep pointing back to, explained from scratch. No prior knowledge needed."
      />
      <ol className="border-t border-edge">
        {events.map((e, i) => {
          const [main, sub] = e.title.split(/:\s(.+)/);
          return (
            <Reveal as="li" key={e.slug} delay={Math.min(i, 8) * 50} className="border-b border-edge">
              <Link href={`/learn/${e.slug}`} className="group grid grid-cols-[2.4rem_1fr] gap-3 py-7">
                <span className="font-display italic text-[1.5rem] leading-none text-accent/80">{String(i + 1).padStart(2, "0")}</span>
                <span>
                  <span className="block font-display text-[1.6rem] md:text-[1.9rem] leading-[1.1] text-content group-hover:text-accent transition-colors text-balance">
                    {main}
                    {sub && <span className="italic text-content-dim">: {sub}</span>}
                  </span>
                  <span className="mt-2 block font-read text-[1.08rem] leading-snug text-content-dim">{e.subtitle}</span>
                </span>
              </Link>
            </Reveal>
          );
        })}
      </ol>
    </div>
  );
}
