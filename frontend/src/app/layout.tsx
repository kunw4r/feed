import type { Metadata, Viewport } from "next";
import { Fraunces, Inter, Newsreader } from "next/font/google";
import "./globals.css";
import AppShell from "@/components/AppShell";
import ThemeProvider from "@/lib/ThemeProvider";

// Self-hosted by next/font: no render-blocking request to Google, no layout shift
const fraunces = Fraunces({
  subsets: ["latin"],
  style: ["normal", "italic"],
  axes: ["opsz"],
  variable: "--font-fraunces",
  display: "swap",
});
const newsreader = Newsreader({
  subsets: ["latin"],
  style: ["normal", "italic"],
  variable: "--font-newsreader",
  display: "swap",
});
const inter = Inter({ subsets: ["latin"], variable: "--font-inter", display: "swap" });

const SITE = "https://kunw4r.github.io/feed";

export const metadata: Metadata = {
  metadataBase: new URL(SITE),
  title: { default: "Brainfeed", template: "%s · Brainfeed" },
  description: "Today's most important news, explained simply, then readable in full. Updated through the day.",
  openGraph: {
    siteName: "Brainfeed",
    title: "Brainfeed",
    description: "Today's most important news, explained simply, then readable in full.",
    type: "website",
    locale: "en_AU",
  },
  icons: {
    icon: "data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 64 64'><rect width='64' height='64' rx='14' fill='%230d0c0b'/><text x='13' y='47' font-family='Georgia,serif' font-size='42' font-weight='700' fill='%23f3ede4'>B</text><circle cx='50' cy='44' r='5' fill='%23ff7a4d'/></svg>",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: [
    { media: "(prefers-color-scheme: dark)", color: "#0d0c0b" },
    { media: "(prefers-color-scheme: light)", color: "#f4f1ea" },
  ],
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en-AU" suppressHydrationWarning className={`${fraunces.variable} ${newsreader.variable} ${inter.variable}`}>
      <head>
        {/* Apply the saved theme before first paint (dark by default) */}
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{if(localStorage.getItem('brainfeed-theme')==='light')return;}catch(e){}document.documentElement.classList.add('dark')})()`,
          }}
        />
      </head>
      <body className="min-h-screen bg-surface">
        <ThemeProvider>
          <AppShell>{children}</AppShell>
        </ThemeProvider>
      </body>
    </html>
  );
}
