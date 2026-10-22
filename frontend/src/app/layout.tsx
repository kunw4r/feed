import { Suspense } from "react";
import type { Metadata, Viewport } from "next";
import "./globals.css";
import AppShell from "@/components/AppShell";
import ThemeProvider from "@/lib/ThemeProvider";

export const metadata: Metadata = {
  title: {
    default: "Brainfeed",
    template: "%s | Brainfeed",
  },
  description:
    "Today's most important news, explained simply, then readable in full. Updated through the day.",
  openGraph: {
    title: "Brainfeed",
    description: "Today's most important news, explained simply, then readable in full.",
    type: "website",
  },
};

export const viewport: Viewport = {
  themeColor: "#0d0c0b",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en-AU" suppressHydrationWarning>
      <head>
        {/* Anti-flash: apply dark class before paint */}
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var t=localStorage.getItem('brainfeed-theme');if(t==='light')return;document.documentElement.classList.add('dark')}catch(e){}})()`,
          }}
        />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link
          rel="preconnect"
          href="https://fonts.gstatic.com"
          crossOrigin="anonymous"
        />
        <link
          href="https://fonts.googleapis.com/css2?family=Fraunces:ital,opsz,wght,SOFT@0,9..144,400..800,0..100;1,9..144,400..800,0..100&family=Newsreader:ital,opsz,wght@0,6..72,300..700;1,6..72,300..700&family=Inter:wght@400;500;600;700;800&family=Space+Grotesk:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500;600&display=swap"
          rel="stylesheet"
        />
        <link
          rel="icon"
          href="data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 64 64'><rect width='64' height='64' rx='14' fill='%230d0c0b'/><text x='13' y='47' font-family='Georgia,serif' font-size='42' font-weight='700' fill='%23f3ede4'>B</text><circle cx='50' cy='44' r='5' fill='%23ff7a4d'/></svg>"
        />
      </head>
      <body className="min-h-screen bg-surface">
        <ThemeProvider>
          <Suspense>
            <AppShell>{children}</AppShell>
          </Suspense>
        </ThemeProvider>
      </body>
    </html>
  );
}
