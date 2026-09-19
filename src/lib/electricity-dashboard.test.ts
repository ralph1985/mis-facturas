import { describe, expect, it } from "vitest";
import {
  buildElectricityBillQuery,
  parseElectricityFilters,
} from "./electricity-dashboard";

describe("filtros del dashboard", () => {
  it("acepta hogar, año y búsqueda normalizados", () => {
    expect(
      parseElectricityFilters({
        home: "home-1",
        year: "2025",
        q: "  naturgy  ",
      }),
    ).toEqual({ homeId: "home-1", year: 2025, query: "naturgy" });
  });

  it("descarta valores inválidos", () => {
    expect(
      parseElectricityFilters({
        home: ["home-1", "home-2"],
        year: "abc",
        q: " ",
      }),
    ).toEqual({ homeId: undefined, year: undefined, query: undefined });
  });

  it("acepta URLSearchParams y crea un rango de año y una búsqueda segura", () => {
    const filters = parseElectricityFilters(
      new URLSearchParams("home=home-1&year=2025&q=Naturg%C3%BD"),
    );
    const query = buildElectricityBillQuery(filters);
    expect(query.where).toMatchObject({
      homeId: "home-1",
      issueDate: {
        gte: new Date("2025-01-01T00:00:00.000Z"),
        lt: new Date("2026-01-01T00:00:00.000Z"),
      },
    });
    expect(query.where.OR).toHaveLength(3);
    expect(query.orderBy).toEqual({ issueDate: "desc" });
  });
});
