import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "The Daily Briefing",
  description:
    "15 curated, verified, and simplified news stories daily. Zero jargon.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en-AU">
      <body className="min-h-screen antialiased">{children}</body>
    </html>
  );
}
