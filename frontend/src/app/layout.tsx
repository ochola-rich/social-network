// Root layout. Imports Lexend font and sets up the base HTML structure.

import type { Metadata } from "next";
import { Lexend } from "next/font/google";
import "./globals.css";

const lexend = Lexend({ subsets: ["latin"], variable: "--font-lexend" });

export const metadata: Metadata = {
  title: "Editorial Pulse | Social Network",
  description:
    "A production-grade social network inspired by modern editorial design.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={lexend.variable}>
      <body className="font-sans antialiased">{children}</body>
    </html>
  );
}
