import type { Viewport } from "next";

export const pwa = {
  name: "Mis Facturas",
  shortName: "Mis Facturas",
  description: "Consulta sencilla y privada de tus facturas de electricidad.",
  startUrl: "/",
  scope: "/",
  themeColor: "#2f7d68",
  backgroundColor: "#f6f8f5",
} as const;

export const pwaViewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: pwa.themeColor,
};

export const pwaAppleWebApp = {
  capable: true,
  statusBarStyle: "default",
  title: pwa.shortName,
} as const;
