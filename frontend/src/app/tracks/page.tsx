import type { Metadata } from "next";
import { readFile } from "fs/promises";
import path from "path";
import TracksSearch from "@/components/TracksSearch";
import PageHeader from "@/components/PageHeader";

export const metadata: Metadata = { title: "Learning tracks", description: "Bite-sized lessons that assume zero prior knowledge." };

export default async function TracksPage() {
  const tracks = JSON.parse(await readFile(path.join(process.cwd(), "public/data/tracks-index.json"), "utf8"));
  return (
    <div className="max-w-5xl px-4 md:px-10 pb-24">
      <PageHeader
        kicker="Train your brain"
        title="Learning tracks"
        standfirst="Bite-sized lessons on things worth knowing. Each takes five to ten minutes and assumes nothing."
      />
      <TracksSearch tracks={tracks} />
    </div>
  );
}
