import HistoryTimeline from "@/components/HistoryTimeline";

const IS_STATIC = process.env.NEXT_PUBLIC_STATIC === "true";

interface HistoryEvent {
  year: string;
  title: string;
  slug: string;
  summary: string;
  era: string;
  significance: string;
  has_content: boolean;
}

async function getHistoryIndex(): Promise<HistoryEvent[]> {
  if (IS_STATIC) {
    try {
      const { default: data } = await import("../../../public/data/history-index.json");
      return data as HistoryEvent[];
    } catch {
      return [];
    }
  }
  return [];
}

export default async function HistoryPage() {
  const events = await getHistoryIndex();

  return <HistoryTimeline events={events} />;
}
