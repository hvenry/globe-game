import type { Metadata, Viewport } from "next";
import { Space_Grotesk } from "next/font/google";
import { GeistMono } from "geist/font/mono";
import "./globals.css";
import { Analytics } from "@vercel/analytics/next";
import ThemeSync from "@/components/ThemeSync";

const spaceGrotesk = Space_Grotesk({
  variable: "--font-space-grotesk",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  metadataBase: new URL("https://globe.expert"),
  title: "globe.expert",
  description:
    "How well do you know the world? Find every country on an interactive 3D globe — timed runs, expert mode, and per-continent challenges.",
  keywords: ["geography", "quiz", "game", "globe", "countries", "map"],
  openGraph: {
    title: "globe.expert",
    description:
      "How well do you know the world? Find every country on an interactive 3D globe.",
    url: "https://globe.expert",
    siteName: "globe.expert",
    images: [{ url: "/og.png", width: 1200, height: 630, alt: "globe.expert" }],
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "globe.expert",
    description:
      "How well do you know the world? Find every country on an interactive 3D globe.",
    images: ["/og.png"],
  },
};

export const viewport: Viewport = {
  themeColor: "#000000",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  // Draw under notches/home indicators; HUD anchors pad via safe-area insets
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        {/* Paint the persisted theme before first paint. Dark is the :root
            default, so this only ever opts into light and a failure here
            (private mode, cleared storage) renders the default rather than
            the wrong theme. ThemeSync keeps it in sync from then on. */}
        <script
          dangerouslySetInnerHTML={{
            __html: `try{var s=localStorage.getItem("globe-game-settings");if(s&&JSON.parse(s).state.theme==="light"){document.documentElement.dataset.theme="light"}}catch(e){}`,
          }}
        />
      </head>
      <body
        className={`${spaceGrotesk.variable} ${GeistMono.variable} font-sans antialiased bg-ground text-hi`}
      >
        <ThemeSync />
        {children}
        <Analytics />
      </body>
    </html>
  );
}
