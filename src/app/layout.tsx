import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Mis Facturas · Electricidad",
  description: "Consulta sencilla y privada de tus facturas de electricidad.",
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
