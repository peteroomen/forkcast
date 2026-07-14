import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Forkcast — family meal planner",
  description: "Fortnightly dinner planning for the household. Plan in minutes.",
  applicationName: "Forkcast",
};

export const viewport: Viewport = {
  themeColor: "#5b7c3a",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" data-theme="garden">
      <body className="min-h-screen antialiased">{children}</body>
    </html>
  );
}
