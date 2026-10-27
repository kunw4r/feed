import type { Metadata } from "next";
import { readFile } from "fs/promises";
import path from "path";
import TracksSearch from "@/components/TracksSearch";
import PageHeader from "@/components/PageHeader";

export const metadata: Metadata = { title: "Learning tracks", description: "Bite-sized lessons that assume zero prior knowledge." };

const WPM = 220;

interface TrackMeta {
  slug: string;
  title: string;
  description: string;
  icon: string;
  lesson_count: number;
  cover_image?: { url: string; credit: string; source_url: string };
}

export default async function TracksPage() {
  const tracks: TrackMeta[] = JSON.parse(await readFile(path.join(process.cwd(), "public/data/tracks-index.json"), "utf8"));

  // Real read times from the lesson text (the index only carries lesson counts)
  const withMinutes = await Promise.all(
    tracks.map(async (t) => {
      try {
        const track = JSON.parse(await readFile(path.join(process.cwd(), `public/data/track-${t.slug}.json`), "utf8"));
        const words = track.lessons.reduce((n: number, l: { content: string }) => n + l.content.split(/\s+/).length, 0);
        return { ...t, minutes: Math.max(1, Math.round(words / WPM)) };
      } catch {
        return { ...t, minutes: t.lesson_count * 7 };
      }
    }),
  );

  return (
    <div className="mx-auto max-w-[1400px] px-5 md:px-10 pb-24">
      <PageHeader
        kicker="Train your brain"
        title="Learning tracks"
        standfirst="Bite-sized lessons on things worth knowing. Each takes five to ten minutes and assumes nothing — pick up where you left off any time."
      />
      <TracksSearch tracks={withMinutes} />
    </div>
  );
}
