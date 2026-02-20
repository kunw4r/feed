import Link from "next/link";
import { ArrowLeft, BookOpen } from "lucide-react";
import TrackLessonViewer from "@/components/TrackLessonViewer";

const IS_STATIC = process.env.NEXT_PUBLIC_STATIC === "true";

export async function generateStaticParams() {
  if (!IS_STATIC) return [];
  try {
    const { default: index } = await import("../../../../public/data/tracks-index.json");
    return (index as { slug: string }[]).map((t) => ({ slug: t.slug }));
  } catch {
    return [];
  }
}

interface TrackLesson {
  title: string;
  content: string;
  key_takeaways: string[];
  concepts: { term: string; definition: string }[];
}

interface Track {
  title: string;
  description: string;
  slug: string;
  icon: string;
  lessons: TrackLesson[];
}

async function getTrack(slug: string): Promise<Track | null> {
  if (IS_STATIC) {
    try {
      const { default: data } = await import(`../../../../public/data/track-${slug}.json`);
      return data as Track;
    } catch {
      return null;
    }
  }
  return null;
}

interface TrackPageProps {
  params: Promise<{ slug: string }>;
}

export default async function TrackPage({ params }: TrackPageProps) {
  const { slug } = await params;
  const track = await getTrack(slug);

  if (!track) {
    return (
      <div className="max-w-3xl mx-auto px-5 py-12">
        <nav className="mb-8">
          <Link href="/tracks" className="flex items-center gap-1 text-[13px] text-content-faint hover:text-content transition-colors">
            <ArrowLeft size={14} />
            Learning Tracks
          </Link>
        </nav>
        <div className="text-center py-20">
          <h1 className="text-2xl font-bold text-content mb-2">Track Not Found</h1>
          <p className="text-content-dim text-[15px]">This learning track doesn&apos;t exist yet.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto px-5 py-8">
      {/* Breadcrumb */}
      <nav className="mb-6">
        <Link href="/tracks" className="flex items-center gap-1 text-[13px] text-content-faint hover:text-content transition-colors">
          <ArrowLeft size={14} />
          Learning Tracks
        </Link>
      </nav>

      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-content tracking-tight mb-2">
          {track.title}
        </h1>
        <p className="text-[14px] text-content-dim leading-relaxed mb-3">
          {track.description}
        </p>
        <div className="flex items-center gap-2 text-[12px] text-content-faint">
          <BookOpen size={13} />
          <span>{track.lessons.length} lessons</span>
          <span className="text-content-faint">|</span>
          <span>~{track.lessons.length * 7} min total</span>
        </div>
      </div>

      {/* Lessons */}
      <TrackLessonViewer lessons={track.lessons} />
    </div>
  );
}
