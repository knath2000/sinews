import type { Metadata } from "next";
import { Geist_Mono } from "next/font/google";
import { Newsreader, IBM_Plex_Sans } from "next/font/google";
import * as Sentry from "@sentry/nextjs";
import "./globals.css";

const newsreader = Newsreader({
  variable: "--font-newsreader",
  subsets: ["latin"],
});

const ibmPlexSans = IBM_Plex_Sans({
  variable: "--font-plex-sans",
  weight: ["300", "400", "500", "600", "700"],
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

if (typeof window !== "undefined" && process.env.NEXT_PUBLIC_SENTRY_DSN) {
  Sentry.init({
    dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
    tracesSampleRate: 1.0,
    environment: "development",
  });
}

export const metadata: Metadata = {
  title: "AI News Brief — Your daily personalized AI news digest",
  description:
    "A personalized daily briefing of the top 5 AI and tech news stories, tailored to your interests.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="en"
      className={`${newsreader.variable} ${ibmPlexSans.variable} ${geistMono.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <body className="min-h-full flex flex-col text-[--ds-text] font-body">{children}</body>
    </html>
  );
}
