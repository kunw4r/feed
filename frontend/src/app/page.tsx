import { fetchTodaysBriefing } from "@/lib/api";
import Header from "@/components/Header";
import TierSection from "@/components/TierSection";

export default async function HomePage() {
  let briefing;
  let error = "";

  try {
    briefing = await fetchTodaysBriefing();
  } catch (e) {
    error =
      e instanceof Error ? e.message : "Failed to load today's briefing.";
  }

  if (error || !briefing) {
    return (
      <main className="max-w-3xl mx-auto px-4 py-10">
        <div className="text-center py-20">
          <h1 className="text-4xl font-bold font-serif mb-4">
            The Daily Briefing
          </h1>
          <p className="text-neutral-500">
            {error || "No briefing available yet. Check back soon."}
          </p>
        </div>
      </main>
    );
  }

  return (
    <main className="max-w-3xl mx-auto px-4 py-10">
      <Header date={briefing.date} storyCount={briefing.total_stories} />

      <TierSection tier="LOCAL" stories={briefing.local_stories} />
      <TierSection tier="NATIONAL" stories={briefing.national_stories} />
      <TierSection tier="GLOBAL" stories={briefing.global_stories} />

      <footer className="text-center text-xs text-neutral-400 py-8 border-t border-neutral-200 mt-8">
        <p>
          Powered by AI. Sourced from trusted outlets. Verified where possible.
        </p>
      </footer>
    </main>
  );
}
