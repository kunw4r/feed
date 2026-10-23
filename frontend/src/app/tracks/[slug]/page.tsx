import type { Metadata } from "next";
import { readFile } from "fs/promises";
import path from "path";
import { notFound } from "next/navigation";
import TrackLessonViewer from "@/components/TrackLessonViewer";
import PageHeader from "@/components/PageHeader";

export const dynamicParams = false;

const DATA = path.join(process.cwd(), "public/data");

export async function generateStaticParams() {
  const index: { slug: string }[] = JSON.parse(await readFile(path.join(DATA, "tracks-index.json"), "utf8"));
  return index.map((t) => ({ slug: t.slug }));
}

interface Track {
  title: string;
  description: string;
  slug: string;
  lessons: { title: string; content: string; key_takeaways: string[]; concepts: { term: string; definition: string }[] }[];
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

  return (
    <div className="max-w-6xl px-4 md:px-10 pb-24">
      <PageHeader back={{ href: "/tracks", label: "Learning tracks" }} title={track.title} standfirst={track.description} />
      <TrackLessonViewer slug={slug} lessons={track.lessons} />
    </div>
  );
}
