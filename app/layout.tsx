import type { Metadata } from "next";
import { Space_Grotesk } from "next/font/google";
import "./globals.css";
import { Analytics } from "@vercel/analytics/next";

const spaceGrotesk = Space_Grotesk({
  variable: "--font-space-grotesk",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "globe",
  description: "Test your geography knowledge on an interactive 3D globe",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body
        className={`${spaceGrotesk.variable} font-sans antialiased bg-black text-white`}
      >
        {children}
        <Analytics />
      </body>
    </html>
  );
}
