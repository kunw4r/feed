import { fetchTodaysBriefing } from "@/lib/api";
import Dashboard from "@/components/Dashboard";

export default async function HomePage() {
  return <Dashboard briefing={await fetchTodaysBriefing()} />;
}
