import { fetchAllKnownStories } from "@/lib/api";

// Built once at export time into /recall/bank.json: every quiz /recall can ask.
export const dynamic = "force-static";

export async function GET() {
  const bank = (await fetchAllKnownStories())
    .filter((s) => s.quiz)
    .map((s) => ({ id: s.id, title: s.simplified_title, created_at: s.created_at, quiz: s.quiz }));
  return Response.json(bank);
}
