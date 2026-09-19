import { describe, expect, it } from "vitest";
import {
  averageUnitPrice,
  compareElectricityBills,
  costBreakdown,
  dailyCost,
  electricityHref,
  electricitySummary,
  filterElectricityBills,
  groupBillsByMonth,
  selectEffectiveElectricityBills,
  type ElectricityBillSummaryInput,
} from "./electricity";

const bills: ElectricityBillSummaryInput[] = [
  {
    id: "new",
    issueDate: new Date("2026-03-16T00:00:00.000Z"),
    totalAmount: 60,
    consumptionKwh: 180,
    homeId: "home-1",
    homeName: "Casa",
    providerName: "Proveedor",
    periodDays: 30,
  },
  {
    id: "old",
    issueDate: new Date("2025-03-16T00:00:00.000Z"),
    totalAmount: 40,
    consumptionKwh: 120,
    homeId: "home-2",
    homeName: "Otra casa",
    providerName: "Proveedor",
    periodDays: 30,
  },
];

describe("reglas de facturas eléctricas", () => {
  it("suma importes y consumos y calcula medias sobre facturas efectivas", () => {
    expect(electricitySummary(bills)).toEqual({
      count: 2,
      totalAmount: 100,
      totalConsumptionKwh: 300,
      averageAmount: 50,
      averageConsumptionKwh: 150,
    });
  });

  it("excluye anuladas y sustituye originales por rectificativas", () => {
    const original = { ...bills[0], id: "original" };
    const rectificative = {
      ...original,
      id: "rectified",
      totalAmount: 75,
      status: "RECTIFICATIVE" as const,
      originalBillId: "original",
    };
    const cancelled = {
      ...bills[1],
      id: "cancelled",
      status: "CANCELLED" as const,
    };

    expect(
      selectEffectiveElectricityBills([original, rectificative, cancelled]),
    ).toEqual([rectificative]);
  });

  it("calcula el precio unitario y evita división por cero", () => {
    expect(averageUnitPrice(100, 300)).toBeCloseTo(1 / 3, 6);
    expect(averageUnitPrice(100, 0)).toBeNull();
  });

  it("calcula el coste diario y solo compara facturas compatibles", () => {
    const previous = {
      ...bills[1],
      homeId: "home-1",
      totalAmount: 40,
      consumptionKwh: 120,
      periodDays: 30,
    };
    const current = {
      ...bills[0],
      totalAmount: 60,
      consumptionKwh: 180,
      periodDays: 30,
    };
    expect(dailyCost(60, 30)).toBe(2);
    expect(averageUnitPrice(100, 0)).toBeNull();
    expect(compareElectricityBills(current, previous)).toMatchObject({
      amountDifference: 20,
      consumptionDifference: 60,
    });
    expect(
      compareElectricityBills(current, { ...previous, homeId: "other-home" }),
    ).toBeNull();
  });

  it("filtra por hogar, año y texto con normalización Unicode sin mutar la entrada", () => {
    const accented = { ...bills[0], providerName: "Compañía Eléctrica" };
    expect(
      filterElectricityBills([accented, bills[1]], { homeId: "home-2" }).map(
        (bill) => bill.id,
      ),
    ).toEqual(["old"]);
    expect(
      filterElectricityBills([accented, bills[1]], {
        query: "companIA ELECTRICA",
      }).map((bill) => bill.id),
    ).toEqual(["new"]);
    expect(
      filterElectricityBills(bills, { year: 2026 }).map((bill) => bill.id),
    ).toEqual(["new"]);
    expect(bills.map((bill) => bill.id)).toEqual(["new", "old"]);
  });

  it("ordena el desglose y calcula porcentajes, también con total cero", () => {
    expect(
      costBreakdown([
        { category: "IVA", amount: 10 },
        { category: "Consumo", amount: 90 },
      ]),
    ).toEqual([
      { category: "Consumo", amount: 90, percentage: 90 },
      { category: "IVA", amount: 10, percentage: 10 },
    ]);
    expect(costBreakdown([{ category: "Bonificación", amount: 0 }])).toEqual([
      { category: "Bonificación", amount: 0, percentage: 0 },
    ]);
  });

  it("agrupa las facturas efectivas por mes", () => {
    expect(
      groupBillsByMonth([
        { ...bills[0], id: "march-1", totalAmount: 20, consumptionKwh: 50 },
        { ...bills[0], id: "march-2", totalAmount: 30, consumptionKwh: 70 },
        {
          ...bills[1],
          id: "february",
          issueDate: new Date("2026-02-01T00:00:00.000Z"),
          totalAmount: 10,
          consumptionKwh: 20,
        },
      ]),
    ).toEqual([
      { month: "2026-02", count: 1, totalAmount: 10, totalConsumptionKwh: 20 },
      { month: "2026-03", count: 2, totalAmount: 50, totalConsumptionKwh: 120 },
    ]);
  });

  it("genera enlaces con URLSearchParams y omite filtros vacíos", () => {
    expect(
      electricityHref({ homeId: "home 1", year: 2025, query: "  Naturgy  " }),
    ).toBe("/facturas?home=home+1&year=2025&q=Naturgy");
    expect(electricityHref({ homeId: "", query: " " })).toBe("/facturas");
  });
});
