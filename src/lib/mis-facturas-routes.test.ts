import { describe, expect, it } from "vitest";
import { isMisFacturasRoute } from "./mis-facturas-routes";

describe("rutas públicas de Mis Facturas", () => {
  it("reconoce las rutas de electricidad y rechaza dominios ajenos", () => {
    expect(isMisFacturasRoute("/facturas")).toBe(true);
    expect(isMisFacturasRoute("/facturas/nueva")).toBe(true);
    expect(isMisFacturasRoute("/suministros")).toBe(true);
    expect(isMisFacturasRoute("/ajustes")).toBe(true);
    expect(isMisFacturasRoute("/coches")).toBe(false);
  });
});
