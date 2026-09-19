import { describe, expect, it } from "vitest";
import {
  formatElectricityDate,
  formatEUR,
  formatKwh,
  maskCups,
} from "./electricity-format";

describe("formatos de electricidad", () => {
  it("formatea fechas en Madrid y español", () => {
    expect(formatElectricityDate("2025-12-16T23:30:00.000Z")).toBe(
      "17/12/2025",
    );
  });

  it("formatea euros y kWh con convención española", () => {
    expect(formatEUR(41.89)).toContain("41,89");
    expect(formatEUR(41.89)).toContain("€");
    expect(formatKwh(1234.5)).toBe("1234,5 kWh");
  });

  it("enmascara CUPS conservando solo extremos", () => {
    const masked = maskCups("ES123456789012345678");
    expect(masked.startsWith("ES12")).toBe(true);
    expect(masked.endsWith("5678")).toBe(true);
    expect(masked).not.toContain("3456789012");
  });
});
