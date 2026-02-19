import { Suspense } from "react";
import { fetchTodaysBriefing } from "@/lib/api";
import Dashboard from "@/components/Dashboard";

export default async function HomePage() {
  let briefing;
  let error = "";

  try {
    briefing = await fetchTodaysBriefing();
  } catch (e) {
    error = e instanceof Error ? e.message : "Failed to load briefing.";
  }

  if (error || !briefing) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <h1 className="text-xl font-bold text-zinc-100 mb-2">
            Unable to load briefing
          </h1>
          <p className="text-zinc-400 text-[14px]">
            {error || "Check back soon."}
          </p>
        </div>
      </div>
    );
  }

  return (
    <Suspense>
      <Dashboard briefing={briefing} />
    </Suspense>
  );
}
