import type { Metadata, Viewport } from "next";
import { Fraunces, Inter } from "next/font/google";
import "./globals.css";
import { RegisterSW } from "@/components/RegisterSW";
import { CAPTURE_SCRIPT } from "@/lib/install";

const fraunces = Fraunces({ subsets: ["latin"], variable: "--font-fraunces", axes: ["opsz"] });
const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });

export const metadata: Metadata = {
  title: "Forkcast",
  description: "Family dinner planning: rotation, shopping lists and who's cooking.",
  appleWebApp: { capable: true, title: "Forkcast", statusBarStyle: "default" },
  icons: { icon: "/icon.svg", apple: "/apple-touch-icon.png" },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f7f3ec" },
    { media: "(prefers-color-scheme: dark)", color: "#171512" },
  ],
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en-NZ" className={`${fraunces.variable} ${inter.variable}`}>
      <head>
        {/* Catch Chrome's one-shot install prompt before React loads. */}
        <script dangerouslySetInnerHTML={{ __html: CAPTURE_SCRIPT }} />
      </head>
      <body className="min-h-dvh font-sans antialiased">
        {children}
        <RegisterSW />
      </body>
    </html>
  );
}
