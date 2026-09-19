import { describe, expect, it } from "vitest";
import {
  mapLegacyElectricityBill,
  mapLegacyElectricityCostLine,
} from "./legacy-electricity-import";

describe("importación de electricidad", () => {
  it("transforma una factura sin perder su ID de origen", () => {
    const result = mapLegacyElectricityBill({
      id: 7,
      totalAmount: 41.89,
      issueDate: "2025-12-16T00:00:00.000+00:00",
      paymentDate: null,
      consumptionKwh: 139,
      pdfUrl: null,
      homeId: 1,
      providerId: 1,
      supplyPointId: 1,
      invoiceNumber: "legacy-invoice",
      referenceNumber: null,
      periodStart: "2025-11-13T00:00:00.000+00:00",
      periodEnd: "2025-12-10T00:00:00.000+00:00",
      periodDays: 28,
      tariff: null,
      contractNumber: null,
    });
    expect(result).toMatchObject({
      sourceId: "7",
      totalAmount: "41.89",
      consumptionKwh: "139",
      homeSourceId: "1",
      providerSourceId: "1",
      supplyPointSourceId: "1",
    });
    expect(result.issueDate).toEqual(new Date("2025-12-16T00:00:00.000+00:00"));
  });

  it("transforma una línea y conserva sus referencias", () => {
    expect(
      mapLegacyElectricityCostLine({
        id: 10,
        billId: 7,
        categoryId: 2,
        amount: 9.09,
      }),
    ).toEqual({
      sourceId: "10",
      billSourceId: "7",
      categorySourceId: "2",
      amount: "9.09",
    });
  });
});
