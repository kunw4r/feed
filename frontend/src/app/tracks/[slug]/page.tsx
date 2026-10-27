import type { Metadata } from "next";
import { readFile } from "fs/promises";
import path from "path";
import { notFound } from "next/navigation";
import TrackLessonViewer from "@/components/TrackLessonViewer";
import TrackHero from "@/components/TrackHero";

export const dynamicParams = false;

const DATA = path.join(process.cwd(), "public/data");
const WPM = 220;

export async function generateStaticParams() {
  const index: { slug: string }[] = JSON.parse(await readFile(path.join(DATA, "tracks-index.json"), "utf8"));
  return index.map((t) => ({ slug: t.slug }));
}

interface Lesson {
  title: string;
  content: string;
  key_takeaways: string[];
  concepts: { term: string; definition: string }[];
}

interface Track {
  title: string;
  description: string;
  slug: string;
  lessons: Lesson[];
  cover_image?: { url: string; width: number; height: number; credit: string; source_url: string };
}

async function getTrack(slug: string): Promise<Track | null> {
  try {
    return JSON.parse(await readFile(path.join(DATA, `track-${slug}.json`), "utf8"));
  } catch {
    return null;
  }
}

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const track = await getTrack((await params).slug);
  return { title: track?.title, description: track?.description };
}

export default async function TrackPage({ params }: Props) {
  const { slug } = await params;
  const track = await getTrack(slug);
  if (!track) notFound();

  const minutes = track.lessons.map((l) => Math.max(1, Math.round(l.content.split(/\s+/).length / WPM)));
  const total = minutes.reduce((a, b) => a + b, 0);

  return (
    <div>
      <TrackHero
        title={track.title}
        description={track.description}
        image={track.cover_image ?? null}
        accentSlug={slug}
        meta={`Learning track · ${track.lessons.length} lessons · ~${total} min`}
      />
      <div className="mx-auto max-w-[1240px] px-5 md:px-10 pb-24 pt-10 md:pt-14">
        <TrackLessonViewer slug={slug} lessons={track.lessons} minutes={minutes} />
      </div>
    </div>
  );
}
