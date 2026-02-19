import { Suspense } from "react";
import type { Metadata, Viewport } from "next";
import "./globals.css";
import AppShell from "@/components/AppShell";

export const metadata: Metadata = {
  title: {
    default: "Brainfeed",
    template: "%s | Brainfeed",
  },
  description:
    "Feed your curiosity. News, learning tracks, and daily challenges — all explained simply.",
};

export const viewport: Viewport = {
  themeColor: "#000000",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en-AU" className="bg-black">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link
          rel="preconnect"
          href="https://fonts.gstatic.com"
          crossOrigin="anonymous"
        />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&family=Space+Grotesk:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500;600&display=swap"
          rel="stylesheet"
        />
        <link
          rel="icon"
          href="data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><rect width='100' height='100' rx='22' fill='%237c3aed'/><circle cx='35' cy='65' r='6' fill='white'/><path d='M35 50 a15 15 0 0 1 15 15' stroke='white' stroke-width='5' fill='none' stroke-linecap='round'/><path d='M35 36 a29 29 0 0 1 29 29' stroke='white' stroke-width='5' fill='none' stroke-linecap='round'/></svg>"
        />
      </head>
      <body className="min-h-screen bg-black">
        <Suspense>
          <AppShell>{children}</AppShell>
        </Suspense>
      </body>
    </html>
  );
}
