import type { Metadata } from "next";
import { Geist, Geist_Mono, Newsreader } from "next/font/google";
import "./globals.css";
import { Nav } from "@/components/Nav";
import { CommandPalette } from "@/components/CommandPalette";
import { Toaster } from "sonner";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });
// Editorial serif for carousel headlines (the @itsnextwork look).
const newsreader = Newsreader({ variable: "--font-newsreader", subsets: ["latin"], style: ["normal", "italic"] });

export const metadata: Metadata = {
  metadataBase: new URL("https://crux-content-engine.vercel.app"),
  title: "Crux — form your own opinions on AI",
  description:
    "Turn AI news or your own raw thought into a defended point of view, then a carousel.",
  openGraph: {
    title: "Crux",
    description:
      "It doesn’t write your posts. It makes you someone worth reading — turn the day’s noise into your own defensible opinion, then a carousel.",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} ${newsreader.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <Nav />
        <main className="flex-1">{children}</main>
        <CommandPalette />
        <Toaster
          theme="dark"
          position="bottom-right"
          toastOptions={{
            style: {
              background: "var(--color-surface)",
              border: "1px solid var(--color-line)",
              color: "var(--color-fg)",
            },
          }}
        />
      </body>
    </html>
  );
}
