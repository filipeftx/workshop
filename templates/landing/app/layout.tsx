import "./globals.css";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Futures Scanner — Signal detection for foresight work",
  description:
    "Scan recent developments on any topic and reframe them as signals of change across three futures: preferable, probable, and dystopian.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="scroll-smooth">
      <body className="font-sans antialiased">{children}</body>
    </html>
  );
}
