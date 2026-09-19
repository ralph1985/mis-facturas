import {
  normalizeElectricityText,
  type ElectricityBillSummaryInput,
  type ElectricityFilters,
} from "./electricity";

export type ElectricitySearchParams =
  | URLSearchParams
  | Record<string, string | string[] | undefined>
  | { [key: string]: unknown };

function firstSearchValue(
  params: ElectricitySearchParams,
  key: string,
): string | undefined {
  if (params instanceof URLSearchParams) {
    const values = params.getAll(key);
    return values.length === 1 ? values[0] : undefined;
  }
  const value = params[key];
  return typeof value === "string" ? value : undefined;
}

/** Parse URL values without allowing repeated or malformed filters through. */
export function parseElectricityFilters(
  params: ElectricitySearchParams,
): ElectricityFilters {
  const home = firstSearchValue(params, "home")?.trim();
  const rawYear = firstSearchValue(params, "year")?.trim();
  const rawQuery = firstSearchValue(params, "q")?.trim();
  const parsedYear =
    rawYear && /^\d{4}$/.test(rawYear) ? Number(rawYear) : undefined;
  const year =
    parsedYear !== undefined && parsedYear >= 1900 && parsedYear <= 2200
      ? parsedYear
      : undefined;
  return {
    homeId: home || undefined,
    year,
    query: rawQuery || undefined,
  };
}

export type ElectricityBillQuery = {
  where: {
    homeId?: string;
    issueDate?: { gte: Date; lt: Date };
    OR?: Array<
      | { invoiceNumber: { contains: string; mode: "insensitive" } }
      | { referenceNumber: { contains: string; mode: "insensitive" } }
      | { provider: { name: { contains: string; mode: "insensitive" } } }
    >;
  };
  include: {
    home: true;
    provider: true;
    supplyPoint: true;
    costLines: { include: { category: true } };
  };
  orderBy: { issueDate: "desc" };
};

export function buildElectricityBillQuery(
  filters: ElectricityFilters,
): ElectricityBillQuery {
  const where: ElectricityBillQuery["where"] = {};
  if (filters.homeId) where.homeId = filters.homeId;
  if (filters.year !== undefined) {
    where.issueDate = {
      gte: new Date(Date.UTC(filters.year, 0, 1)),
      lt: new Date(Date.UTC(filters.year + 1, 0, 1)),
    };
  }
  if (filters.query?.trim()) {
    const query = filters.query.trim();
    where.OR = [
      { invoiceNumber: { contains: query, mode: "insensitive" } },
      { referenceNumber: { contains: query, mode: "insensitive" } },
      { provider: { name: { contains: query, mode: "insensitive" } } },
    ];
  }
  return {
    where,
    include: {
      home: true,
      provider: true,
      supplyPoint: true,
      costLines: { include: { category: true } },
    },
    orderBy: { issueDate: "desc" },
  };
}

export type ElectricityDashboardBill = ElectricityBillSummaryInput & {
  costLines: Array<{ category: string; amount: number }>;
};

export type ElectricityDashboardSource = {
  electricityBill: {
    findMany: (
      query: ElectricityBillQuery,
    ) => Promise<readonly Record<string, unknown>[]>;
  };
  home?: { findMany: () => Promise<readonly unknown[]> };
  provider?: { findMany: () => Promise<readonly unknown[]> };
  supplyPoint?: { findMany: () => Promise<readonly unknown[]> };
  costCategory?: { findMany: () => Promise<readonly unknown[]> };
};

function decimalToNumber(value: unknown): number {
  if (typeof value === "number") return value;
  if (typeof value === "string") return Number(value);
  if (
    value &&
    typeof value === "object" &&
    "toNumber" in value &&
    typeof value.toNumber === "function"
  ) {
    return Number(value.toNumber());
  }
  return Number(value);
}

function mapDashboardBill(
  row: Record<string, unknown>,
): ElectricityDashboardBill {
  const home = (row.home ?? {}) as Record<string, unknown>;
  const provider = (row.provider ?? {}) as Record<string, unknown>;
  const supplyPoint = (row.supplyPoint ?? {}) as Record<string, unknown>;
  const rawLines = Array.isArray(row.costLines) ? row.costLines : [];
  return {
    id: String(row.id),
    issueDate:
      row.issueDate instanceof Date
        ? row.issueDate
        : new Date(String(row.issueDate)),
    totalAmount: decimalToNumber(row.totalAmount),
    consumptionKwh: decimalToNumber(row.consumptionKwh),
    homeId: String(row.homeId),
    homeName: String(home.name ?? ""),
    providerName: String(provider.name ?? ""),
    status: row.status as ElectricityBillSummaryInput["status"],
    originalBillId: row.originalBillId as string | null | undefined,
    invoiceNumber: row.invoiceNumber as string | null | undefined,
    referenceNumber: row.referenceNumber as string | null | undefined,
    supplyPointId: row.supplyPointId as string | null | undefined,
    supplyPointCups:
      typeof supplyPoint.cups === "string" ? supplyPoint.cups : null,
    periodStart:
      row.periodStart instanceof Date
        ? row.periodStart
        : row.periodStart
          ? new Date(String(row.periodStart))
          : null,
    periodEnd:
      row.periodEnd instanceof Date
        ? row.periodEnd
        : row.periodEnd
          ? new Date(String(row.periodEnd))
          : null,
    periodDays: typeof row.periodDays === "number" ? row.periodDays : null,
    costLines: rawLines.map((line) => {
      const value = line as Record<string, unknown>;
      const category = (value.category ?? {}) as Record<string, unknown>;
      return {
        category: String(category.name ?? ""),
        amount: decimalToNumber(value.amount),
      };
    }),
  };
}

export async function getElectricityDashboard(
  source: ElectricityDashboardSource,
  searchParams: ElectricitySearchParams = {},
) {
  const filters = parseElectricityFilters(searchParams);
  const [rows, homes, providers, supplyPoints, categories] = await Promise.all([
    source.electricityBill.findMany(buildElectricityBillQuery(filters)),
    source.home?.findMany() ?? Promise.resolve([]),
    source.provider?.findMany() ?? Promise.resolve([]),
    source.supplyPoint?.findMany() ?? Promise.resolve([]),
    source.costCategory?.findMany() ?? Promise.resolve([]),
  ]);
  return {
    filters,
    bills: rows.map(mapDashboardBill),
    homes,
    providers,
    supplyPoints,
    categories,
  };
}

export { decimalToNumber };
export const normalizeDashboardQuery = normalizeElectricityText;
