import { describe, expect, it } from "vitest";
import { electricityBillInputSchema } from "./electricity-validation";

describe("validación de facturas", () => {
  it("acepta una factura válida y transforma números", () => {
    const result = electricityBillInputSchema.parse({
      totalAmount: "41.89",
      issueDate: "2025-12-16",
      paymentDate: "2025-12-23",
      consumptionKwh: "139",
      homeId: "home-1",
      providerId: "provider-1",
      supplyPointId: "point-1",
      invoiceNumber: "invoice-1",
      periodStart: "2025-11-13",
      periodEnd: "2025-12-10",
      periodDays: "28",
      tariff: "2.0TD",
      contractNumber: "contract-1",
      pdfUrl: "https://example.test/factura.pdf",
      readingType: "REAL",
      status: "NORMAL",
    });
    expect(result.totalAmount).toBe(41.89);
    expect(result.consumptionKwh).toBe(139);
    expect(result.periodDays).toBe(28);
    expect(result.issueDate).toBeInstanceOf(Date);
  });

  it("acepta todos los estados y tipos de lectura válidos", () => {
    for (const status of ["NORMAL", "RECTIFICATIVE", "CANCELLED"] as const) {
      const result = electricityBillInputSchema.safeParse({
        totalAmount: "0",
        issueDate: "2025-12-16",
        consumptionKwh: "0",
        homeId: "home-1",
        providerId: "provider-1",
        status,
        ...(status === "RECTIFICATIVE" ? { originalBillId: "bill-1" } : {}),
        readingType: "ESTIMATED",
      });
      expect(result.success).toBe(true);
    }
  });

  it("rechaza importes negativos y un periodo invertido", () => {
    expect(() =>
      electricityBillInputSchema.parse({
        totalAmount: "-1",
        issueDate: "2025-12-16",
        consumptionKwh: "0",
        homeId: "home-1",
        providerId: "provider-1",
        periodStart: "2025-12-10",
        periodEnd: "2025-11-10",
      }),
    ).toThrow();
  });

  it("requiere original distinto para una rectificativa", () => {
    expect(() =>
      electricityBillInputSchema.parse({
        totalAmount: "1",
        issueDate: "2025-12-16",
        consumptionKwh: "1",
        homeId: "home-1",
        providerId: "provider-1",
        status: "RECTIFICATIVE",
      }),
    ).toThrow();
    expect(() =>
      electricityBillInputSchema.parse({
        totalAmount: "1",
        issueDate: "2025-12-16",
        consumptionKwh: "1",
        id: "bill-1",
        homeId: "home-1",
        providerId: "provider-1",
        status: "RECTIFICATIVE",
        originalBillId: "bill-1",
      }),
    ).toThrow();
  });

  it("permite solo URLs HTTP seguras", () => {
    const base = {
      totalAmount: "1",
      issueDate: "2025-12-16",
      consumptionKwh: "1",
      homeId: "home-1",
      providerId: "provider-1",
    };
    expect(
      electricityBillInputSchema.safeParse({
        ...base,
        pdfUrl: "https://example.test/a.pdf",
      }).success,
    ).toBe(true);
    expect(
      electricityBillInputSchema.safeParse({
        ...base,
        pdfUrl: "http://example.test/a.pdf",
      }).success,
    ).toBe(true);
    expect(
      electricityBillInputSchema.safeParse({
        ...base,
        pdfUrl: "javascript:alert(1)",
      }).success,
    ).toBe(false);
    expect(
      electricityBillInputSchema.safeParse({
        ...base,
        pdfUrl: "ftp://example.test/a.pdf",
      }).success,
    ).toBe(false);
  });
});
