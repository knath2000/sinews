import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import * as Sentry from "@sentry/nextjs";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
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
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <body className="min-h-full flex flex-col text-[--foreground]">{children}</body>
    </html>
  );
}
