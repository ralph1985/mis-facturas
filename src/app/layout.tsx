import type { Metadata } from "next";
import { pwa, pwaAppleWebApp, pwaViewport } from "@/lib/pwa-config";
import "./globals.css";

export const viewport = pwaViewport;

export const metadata: Metadata = {
  title: `${pwa.name} · Electricidad`,
  description: pwa.description,
  appleWebApp: pwaAppleWebApp,
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="es">
      <body>{children}</body>
    </html>
  );
}
