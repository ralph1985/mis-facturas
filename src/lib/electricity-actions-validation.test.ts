import { describe, expect, it } from "vitest";
import { electricityBillInputSchema } from "./electricity-validation";
import { validateElectricityReferences } from "./electricity-actions-validation";

const input = electricityBillInputSchema.parse({
  totalAmount: "10",
  issueDate: "2026-01-01",
  consumptionKwh: "30",
  homeId: "home-missing",
  providerId: "provider-1",
});

describe("referencias de acciones de facturas", () => {
  it("rechaza un hogar inexistente", () => {
    expect(
      validateElectricityReferences(input, {
        homes: [{ id: "home-1", name: "Meco" }],
        providers: [{ id: "provider-1" }],
        supplyPoints: [],
      }),
    ).toContain("hogar");
  });

  it("rechaza un punto de suministro de otro hogar", () => {
    expect(
      validateElectricityReferences(
        { ...input, homeId: "home-1", supplyPointId: "point-2" },
        {
          homes: [{ id: "home-1", name: "Meco" }],
          providers: [{ id: "provider-1" }],
          supplyPoints: [{ id: "point-2", homeId: "home-2" }],
        },
      ),
    ).toContain("hogar");
  });

  it("rechaza cualquier hogar distinto de Meco", () => {
    expect(
      validateElectricityReferences(
        { ...input, homeId: "home-2" },
        {
          homes: [{ id: "home-2", name: "Otra casa" }],
          providers: [{ id: "provider-1" }],
          supplyPoints: [],
        },
      ),
    ).toContain("hogar");
  });
});
