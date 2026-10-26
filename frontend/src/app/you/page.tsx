import type { Metadata } from "next";
import YouClient from "@/components/YouClient";

export const metadata: Metadata = { title: "Your progress", description: "Your streak, and moving your progress between devices." };

export default function YouPage() {
  return <YouClient />;
}
