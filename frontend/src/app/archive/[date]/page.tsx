import { Suspense } from "react";
import { fetchTodaysBriefing } from "@/lib/api";
import Dashboard from "@/components/Dashboard";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

const IS_STATIC = process.env.NEXT_PUBLIC_STATIC === "true";

export async function generateStaticParams() {
  if (!IS_STATIC) return [];
  try {
    const briefing = await fetchTodaysBriefing();
    return [{ date: briefing.date }];
  } catch {
    return [];
  }
}

interface ArchiveDatePageProps {
  params: Promise<{ date: string }>;
}

export default async function ArchiveDatePage({ params }: ArchiveDatePageProps) {
  const { date } = await params;
  let briefing;
  let error = "";

  try {
    briefing = await fetchTodaysBriefing();
    if (briefing.date !== date) {
      error = `No briefing available for ${date}.`;
      briefing = null;
    }
  } catch (e) {
    error = e instanceof Error ? e.message : "Failed to load briefing.";
  }

  if (error || !briefing) {
    return (
      <div className="max-w-3xl mx-auto px-5 py-12">
        <nav className="mb-8">
          <Link href="/archive" className="flex items-center gap-1 text-[13px] text-content-faint hover:text-content transition-colors">
            <ArrowLeft size={14} />
            Archive
          </Link>
        </nav>
        <div className="text-center py-20">
          <h1 className="text-2xl font-bold text-content mb-2">No Briefing Found</h1>
          <p className="text-content-dim text-[15px]">{error}</p>
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
