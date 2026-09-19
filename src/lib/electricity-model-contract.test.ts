import { describe, expect, it } from "vitest";
import { electricityModelNames } from "./electricity-model-contract";

describe("modelo de Mis Facturas", () => {
  it("declara únicamente las entidades funcionales necesarias", () => {
    expect(electricityModelNames).toEqual([
      "Home",
      "EnergyProvider",
      "ElectricitySupplyPoint",
      "ElectricityCostCategory",
      "ElectricityBill",
      "ElectricityBillCostLine",
      "ImportRecord",
    ]);
  });
});
