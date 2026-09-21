import { describe, expect, it } from "vitest";
import { pwa, pwaAppleWebApp, pwaViewport } from "./pwa-config";

describe("PWA configuration", () => {
  it("uses the product branding and safe private-app defaults", () => {
    expect(pwa).toEqual({
      name: "Mis Facturas",
      shortName: "Mis Facturas",
      description:
        "Consulta sencilla y privada de tus facturas de electricidad.",
      startUrl: "/",
      scope: "/",
      themeColor: "#2f7d68",
      backgroundColor: "#f6f8f5",
    });
  });

  it("defines mobile viewport and iOS standalone metadata", () => {
    expect(pwaViewport).toEqual({
      width: "device-width",
      initialScale: 1,
      themeColor: "#2f7d68",
    });
    expect(pwaAppleWebApp).toEqual({
      capable: true,
      statusBarStyle: "default",
      title: "Mis Facturas",
    });
  });
});
