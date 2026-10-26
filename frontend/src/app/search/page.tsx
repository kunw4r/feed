import type { Metadata } from "next";
import SearchClient from "@/components/SearchClient";

export const metadata: Metadata = { title: "Search", description: "Search the last month of Brainfeed stories." };

export default function SearchPage() {
  return <SearchClient />;
}
