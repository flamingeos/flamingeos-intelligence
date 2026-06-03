import type { Metadata, Viewport } from "next";
import "./globals.css";
import { CRTOverlay } from "@/components/layout/crt-overlay";
import { SessionProvider } from "@/components/providers/session-provider";

export const metadata: Metadata = {
  title: "Flamingeos Intelligence — YouTube Growth OS",
  description: "AI-powered YouTube growth operating system for @flamingeos",
  icons: { icon: "/favicon.ico" },
};

export const viewport: Viewport = {
  themeColor: "#0a0a0a",
  colorScheme: "dark",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="h-full dark">
      <body className="min-h-full font-mono antialiased bg-[#0a0a0a] text-[#33ff00]">
        <SessionProvider>
          <CRTOverlay />
          {children}
        </SessionProvider>
      </body>
    </html>
  );
}
