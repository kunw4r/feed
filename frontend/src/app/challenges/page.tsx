import type { Metadata } from "next";
import { readFile } from "fs/promises";
import path from "path";
import ChallengesClient from "@/components/ChallengesClient";

export const metadata: Metadata = { title: "Daily challenges" };

export default async function ChallengesPage() {
  const challenges = JSON.parse(await readFile(path.join(process.cwd(), "public/data/challenges.json"), "utf8"));
  return <ChallengesClient challenges={challenges} />;
}
