import { describe, expect, it } from "vitest";
import { maskSupplyPointCups, formatSupplyPointValue } from "./supply-point";

describe("presentación de puntos de suministro", () => {
  it("enmascara el CUPS y conserva sus extremos", () => {
    expect(maskSupplyPointCups("ES1234567890123456AB")).toBe(
      "ES12••••••••••••56AB",
    );
  });

  it("muestra un guion largo cuando falta un dato", () => {
    expect(formatSupplyPointValue(null)).toBe("—");
    expect(formatSupplyPointValue("  ")).toBe("—");
  });
});
