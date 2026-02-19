import ChallengesClient from "@/components/ChallengesClient";

const IS_STATIC = process.env.NEXT_PUBLIC_STATIC === "true";

interface Challenge {
  id: string;
  title: string;
  type: string;
  difficulty: string;
  description: string;
  hints: string[];
  solution: string;
  language?: string;
  estimated_minutes: number;
}

async function getChallenges(): Promise<Challenge[]> {
  if (IS_STATIC) {
    const { default: data } = await import("../../../public/data/challenges.json");
    return data as Challenge[];
  }
  return [];
}

export default async function ChallengesPage() {
  const challenges = await getChallenges();

  return <ChallengesClient challenges={challenges} />;
}
