import { fetchAllKnownStories } from "@/lib/api";

// Built once at export time into /search/index.json: everything /search can find.
export const dynamic = "force-static";

export async function GET() {
  const index = (await fetchAllKnownStories())
    .sort((a, b) => b.created_at.localeCompare(a.created_at))
    .map((s) => ({
      id: s.id,
      t: s.simplified_title,
      g: s.quick_summary,
      c: (s.concepts ?? []).map((c) => c.term),
      r: s.region_code,
      k: s.category,
      d: s.created_at,
      i: s.image_url ?? null,
    }));
  return Response.json(index);
}
