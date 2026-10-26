import type { Metadata } from "next";
import { readFile } from "fs/promises";
import path from "path";
import { HeroImage } from "@/lib/types";
import HistoryTimeline, { HistoryEvent } from "@/components/HistoryTimeline";

export const metadata: Metadata = { title: "100 events that shaped the world" };

export default async function HistoryPage() {
  const events: HistoryEvent[] = JSON.parse(
    await readFile(path.join(process.cwd(), "public/data/history-index.json"), "utf8"),
  );

  // Deep-dive events pull their tile image from the deep-dive JSON
  const thumbs: Record<string, HeroImage> = {};
  for (const e of events) {
    if (!e.has_content) continue;
    try {
      const d = JSON.parse(await readFile(path.join(process.cwd(), "public/data", `learn-${e.slug}.json`), "utf8"));
      if (d.hero_image) thumbs[e.slug] = d.hero_image;
    } catch {
      // no deep-dive JSON for this slug: the event renders without a thumbnail
    }
  }

  return <HistoryTimeline events={events} thumbs={thumbs} />;
}
