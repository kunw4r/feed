import TracksSearch from "@/components/TracksSearch";

const IS_STATIC = process.env.NEXT_PUBLIC_STATIC === "true";

interface TrackMeta {
  slug: string;
  title: string;
  description: string;
  icon: string;
  lesson_count: number;
}

async function getTracksIndex(): Promise<TrackMeta[]> {
  if (IS_STATIC) {
    const { default: data } = await import("../../../public/data/tracks-index.json");
    return data as TrackMeta[];
  }
  return [];
}

export default async function TracksPage() {
  const tracks = await getTracksIndex();

  return (
    <div className="max-w-4xl mx-auto px-5 py-8">
      <div className="mb-8">
        <p className="text-[11px] font-medium text-content-faint uppercase tracking-widest mb-1">
          Train Your Brain
        </p>
        <h1 className="text-2xl font-bold text-content tracking-tight mb-2">
          Learning Tracks
        </h1>
        <p className="text-[14px] text-content-dim leading-relaxed">
          Bite-sized lessons on topics that matter. Each lesson takes 5-10 minutes
          and assumes zero prior knowledge.
        </p>
      </div>

      <TracksSearch tracks={tracks} />
    </div>
  );
}
