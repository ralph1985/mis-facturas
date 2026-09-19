export type ElectricityReadingType = "REAL" | "ESTIMATED";
export type ElectricityBillStatus = "NORMAL" | "RECTIFICATIVE" | "CANCELLED";

export type ElectricityBillSummaryInput = {
  id: string;
  issueDate: Date;
  totalAmount: number;
  consumptionKwh: number;
  homeId: string;
  homeName: string;
  providerName: string;
  status?: ElectricityBillStatus;
  originalBillId?: string | null;
  invoiceNumber?: string | null;
  referenceNumber?: string | null;
  supplyPointId?: string | null;
  supplyPointCups?: string | null;
  periodStart?: Date | null;
  periodEnd?: Date | null;
  periodDays?: number | null;
  readingType?: ElectricityReadingType | null;
};

export type ElectricityFilters = {
  homeId?: string;
  year?: number;
  query?: string;
};

export type ElectricitySummary = {
  count: number;
  totalAmount: number;
  totalConsumptionKwh: number;
  averageAmount: number;
  averageConsumptionKwh: number;
};

export type CostBreakdownInput = { category: string; amount: number };
export type CostBreakdownItem = CostBreakdownInput & { percentage: number };

export type MonthlyElectricityGroup = {
  month: string;
  count: number;
  totalAmount: number;
  totalConsumptionKwh: number;
};

export type ElectricityBillComparison = {
  amountDifference: number;
  amountPercentage: number | null;
  consumptionDifference: number;
  consumptionPercentage: number | null;
  unitPriceDifference: number | null;
  dailyCostDifference: number | null;
};

/** Remove accents and case differences before comparing user-entered text. */
export function normalizeElectricityText(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase("es-ES")
    .trim();
}

function billStatus(bill: ElectricityBillSummaryInput): ElectricityBillStatus {
  return bill.status ?? "NORMAL";
}

/**
 * Return the bills that represent the current effective history.
 * Cancelled bills are never effective. An active rectificative replaces the
 * original bill it points to; if there are several, the latest one wins.
 */
export function selectEffectiveElectricityBills(
  bills: readonly ElectricityBillSummaryInput[],
): ElectricityBillSummaryInput[] {
  const active = bills.filter((bill) => billStatus(bill) !== "CANCELLED");
  const replacementByOriginal = new Map<string, ElectricityBillSummaryInput>();

  for (const bill of active) {
    if (billStatus(bill) !== "RECTIFICATIVE" || !bill.originalBillId) continue;
    const previous = replacementByOriginal.get(bill.originalBillId);
    if (
      !previous ||
      bill.issueDate.getTime() > previous.issueDate.getTime() ||
      (bill.issueDate.getTime() === previous.issueDate.getTime() &&
        bill.id > previous.id)
    ) {
      replacementByOriginal.set(bill.originalBillId, bill);
    }
  }

  return active.filter((bill) => {
    if (billStatus(bill) === "RECTIFICATIVE") {
      return (
        !bill.originalBillId ||
        replacementByOriginal.get(bill.originalBillId)?.id === bill.id
      );
    }
    return !replacementByOriginal.has(bill.id);
  });
}

export const effectiveElectricityBills = selectEffectiveElectricityBills;

export function electricitySummary(
  bills: readonly ElectricityBillSummaryInput[],
): ElectricitySummary {
  const effective = selectEffectiveElectricityBills(bills);
  const totalAmount = effective.reduce(
    (sum, bill) => sum + bill.totalAmount,
    0,
  );
  const totalConsumptionKwh = effective.reduce(
    (sum, bill) => sum + bill.consumptionKwh,
    0,
  );
  const count = effective.length;
  return {
    count,
    totalAmount,
    totalConsumptionKwh,
    averageAmount: count === 0 ? 0 : totalAmount / count,
    averageConsumptionKwh: count === 0 ? 0 : totalConsumptionKwh / count,
  };
}

export function averageUnitPrice(
  totalAmount: number,
  consumptionKwh: number,
): number | null {
  return consumptionKwh > 0 ? totalAmount / consumptionKwh : null;
}

export function dailyCost(
  totalAmount: number,
  periodDays: number | null | undefined,
): number | null {
  return periodDays && periodDays > 0 ? totalAmount / periodDays : null;
}

export const averageDailyCost = dailyCost;
export const costPerDay = dailyCost;

function dateOnlyYear(date: Date): number {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Europe/Madrid",
    year: "numeric",
  }).formatToParts(date);
  return Number(parts.find((part) => part.type === "year")?.value);
}

export function filterElectricityBills(
  bills: readonly ElectricityBillSummaryInput[],
  filters: ElectricityFilters,
): ElectricityBillSummaryInput[] {
  const query = filters.query
    ? normalizeElectricityText(filters.query)
    : undefined;
  return bills.filter((bill) => {
    if (filters.homeId && bill.homeId !== filters.homeId) return false;
    if (
      filters.year !== undefined &&
      dateOnlyYear(bill.issueDate) !== filters.year
    )
      return false;
    if (query) {
      const searchable = [
        bill.homeName,
        bill.providerName,
        bill.invoiceNumber ?? "",
        bill.referenceNumber ?? "",
      ].map(normalizeElectricityText);
      if (!searchable.some((value) => value.includes(query))) return false;
    }
    return true;
  });
}

export function costBreakdown(
  lines: readonly CostBreakdownInput[],
): CostBreakdownItem[] {
  const total = lines.reduce((sum, line) => sum + line.amount, 0);
  return lines
    .map((line) => ({
      ...line,
      percentage: total === 0 ? 0 : (line.amount / total) * 100,
    }))
    .sort((a, b) => b.amount - a.amount);
}

function monthKey(date: Date): string {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Europe/Madrid",
    year: "numeric",
    month: "2-digit",
  }).formatToParts(date);
  const year = parts.find((part) => part.type === "year")?.value ?? "";
  const month = parts.find((part) => part.type === "month")?.value ?? "";
  return `${year}-${month}`;
}

export function groupBillsByMonth(
  bills: readonly ElectricityBillSummaryInput[],
): MonthlyElectricityGroup[] {
  const grouped = new Map<string, MonthlyElectricityGroup>();
  for (const bill of selectEffectiveElectricityBills(bills)) {
    const month = monthKey(bill.issueDate);
    const group = grouped.get(month) ?? {
      month,
      count: 0,
      totalAmount: 0,
      totalConsumptionKwh: 0,
    };
    group.count += 1;
    group.totalAmount += bill.totalAmount;
    group.totalConsumptionKwh += bill.consumptionKwh;
    grouped.set(month, group);
  }
  return [...grouped.values()].sort((a, b) => a.month.localeCompare(b.month));
}

function comparablePeriodDays(
  bill: ElectricityBillSummaryInput,
): number | null {
  if (bill.periodDays !== null && bill.periodDays !== undefined)
    return bill.periodDays > 0 ? bill.periodDays : null;
  if (!bill.periodStart || !bill.periodEnd) return null;
  const days =
    (bill.periodEnd.getTime() - bill.periodStart.getTime()) / 86_400_000 + 1;
  return Number.isFinite(days) && days > 0 ? days : null;
}

export function areElectricityBillsComparable(
  current: ElectricityBillSummaryInput,
  previous: ElectricityBillSummaryInput,
): boolean {
  if (
    !Number.isFinite(current.totalAmount) ||
    !Number.isFinite(previous.totalAmount)
  )
    return false;
  if (
    !Number.isFinite(current.consumptionKwh) ||
    !Number.isFinite(previous.consumptionKwh)
  )
    return false;
  if (current.issueDate.getTime() < previous.issueDate.getTime()) return false;
  if (current.homeId !== previous.homeId) return false;
  if (
    current.supplyPointId &&
    previous.supplyPointId &&
    current.supplyPointId !== previous.supplyPointId
  )
    return false;

  const currentHasPeriod = Boolean(current.periodStart && current.periodEnd);
  const previousHasPeriod = Boolean(previous.periodStart && previous.periodEnd);
  if (currentHasPeriod !== previousHasPeriod) return false;
  const currentDays = comparablePeriodDays(current);
  const previousDays = comparablePeriodDays(previous);
  if (
    currentDays !== null &&
    previousDays !== null &&
    Math.abs(currentDays - previousDays) > 1
  )
    return false;
  if (
    (current.periodStart && !current.periodEnd) ||
    (!current.periodStart && current.periodEnd)
  )
    return false;
  if (
    (previous.periodStart && !previous.periodEnd) ||
    (!previous.periodStart && previous.periodEnd)
  )
    return false;
  return true;
}

export function compareElectricityBills(
  current: ElectricityBillSummaryInput,
  previous: ElectricityBillSummaryInput,
): ElectricityBillComparison | null {
  if (!areElectricityBillsComparable(current, previous)) return null;
  const amountDifference = current.totalAmount - previous.totalAmount;
  const consumptionDifference =
    current.consumptionKwh - previous.consumptionKwh;
  const previousUnitPrice = averageUnitPrice(
    previous.totalAmount,
    previous.consumptionKwh,
  );
  const currentUnitPrice = averageUnitPrice(
    current.totalAmount,
    current.consumptionKwh,
  );
  const currentDaily = dailyCost(
    current.totalAmount,
    comparablePeriodDays(current),
  );
  const previousDaily = dailyCost(
    previous.totalAmount,
    comparablePeriodDays(previous),
  );
  return {
    amountDifference,
    amountPercentage:
      previous.totalAmount === 0
        ? null
        : (amountDifference / Math.abs(previous.totalAmount)) * 100,
    consumptionDifference,
    consumptionPercentage:
      previous.consumptionKwh === 0
        ? null
        : (consumptionDifference / Math.abs(previous.consumptionKwh)) * 100,
    unitPriceDifference:
      currentUnitPrice === null || previousUnitPrice === null
        ? null
        : currentUnitPrice - previousUnitPrice,
    dailyCostDifference:
      currentDaily === null || previousDaily === null
        ? null
        : currentDaily - previousDaily,
  };
}

export const compareBills = compareElectricityBills;

export function electricityHref(
  filters: ElectricityFilters,
  basePath = "/facturas",
): string {
  const params = new URLSearchParams();
  if (filters.homeId?.trim()) params.set("home", filters.homeId.trim());
  if (filters.year !== undefined) params.set("year", String(filters.year));
  if (filters.query?.trim()) params.set("q", filters.query.trim());
  const query = params.toString();
  return query ? `${basePath}?${query}` : basePath;
}

export const buildElectricityHref = electricityHref;
