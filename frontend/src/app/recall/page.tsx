import type { Metadata } from "next";
import RecallSession from "@/components/RecallSession";

export const metadata: Metadata = {
  title: "Review",
  description: "Quick questions on stories you've read, spaced out so they stick.",
};

export default function RecallPage() {
  return <RecallSession />;
}
