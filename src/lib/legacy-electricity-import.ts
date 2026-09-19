export type LegacyScalar = string | number | bigint | null | undefined;
export type LegacyDateValue = string | Date | null | undefined;

export type LegacyHomeRow = {
  id: number;
  name: string;
};

export type LegacyProviderRow = {
  id: number;
  name: string;
  address: string | null;
  market: string | null;
  taxId: string | null;
};

export type LegacySupplyPointRow = {
  id: number;
  homeId: number;
  cups: string;
  distributor: string | null;
  accessContract: string | null;
  gridToll: string | null;
  addressLine: string | null;
  postalCode: string | null;
  city: string | null;
  region: string | null;
  country: string | null;
  contractedPowerP1: LegacyScalar;
  contractedPowerP2: LegacyScalar;
  meters: string | null;
};

export type LegacyCostCategoryRow = {
  id: number;
  name: string;
};

export type LegacyElectricityBillRow = {
  id: number;
  totalAmount: LegacyScalar;
  issueDate: LegacyDateValue;
  paymentDate: LegacyDateValue;
  consumptionKwh: LegacyScalar;
  pdfUrl: string | null;
  homeId: number;
  providerId: number;
  supplyPointId: number | null;
  invoiceNumber: string | null;
  referenceNumber: string | null;
  periodStart: LegacyDateValue;
  periodEnd: LegacyDateValue;
  periodDays: number | null;
  tariff: string | null;
  contractNumber: string | null;
};

export type LegacyBillCostLineRow = {
  id: number;
  billId: number;
  categoryId: number;
  amount: LegacyScalar;
};

export type LegacyHomeMapping = {
  sourceId: string;
  name: string;
};

export type LegacyProviderMapping = {
  sourceId: string;
  name: string;
  address: string | null;
  market: string | null;
  taxId: string | null;
};

export type LegacySupplyPointMapping = Omit<
  LegacySupplyPointRow,
  "id" | "homeId" | "contractedPowerP1" | "contractedPowerP2"
> & {
  sourceId: string;
  homeSourceId: string;
  contractedPowerP1: string | null;
  contractedPowerP2: string | null;
};

export type LegacyCostCategoryMapping = {
  sourceId: string;
  name: string;
};

export type LegacyElectricityBillMapping = {
  sourceId: string;
  totalAmount: string;
  issueDate: Date;
  paymentDate: Date | null;
  consumptionKwh: string;
  pdfUrl: string | null;
  homeSourceId: string;
  providerSourceId: string;
  supplyPointSourceId: string | null;
  invoiceNumber: string | null;
  referenceNumber: string | null;
  periodStart: Date | null;
  periodEnd: Date | null;
  periodDays: number | null;
  tariff: string | null;
  contractNumber: string | null;
};

export type LegacyElectricityCostLineMapping = {
  sourceId: string;
  billSourceId: string;
  categorySourceId: string;
  amount: string;
};

function sourceId(value: LegacyScalar): string {
  if (value === null || value === undefined)
    throw new Error("Falta un identificador de origen.");
  return String(value);
}

function decimal(
  value: LegacyScalar,
  field: string,
  required = false,
): string | null {
  if (value === null || value === undefined) {
    if (required) throw new Error(`Falta el importe ${field}.`);
    return null;
  }
  const result = String(value);
  if (!/^-?(?:\d+\.?\d*|\.\d+)$/.test(result))
    throw new Error(`Importe inválido en ${field}.`);
  return result;
}

function date(
  value: LegacyDateValue,
  field: string,
  required = false,
): Date | null {
  if (value === null || value === undefined || value === "") {
    if (required) throw new Error(`Falta la fecha ${field}.`);
    return null;
  }
  const result =
    value instanceof Date ? new Date(value.getTime()) : new Date(String(value));
  if (Number.isNaN(result.getTime()))
    throw new Error(`Fecha inválida en ${field}.`);
  return result;
}

export function mapLegacyHome(row: LegacyHomeRow): LegacyHomeMapping {
  return { sourceId: sourceId(row.id), name: row.name };
}

export function mapLegacyProvider(
  row: LegacyProviderRow,
): LegacyProviderMapping {
  return {
    sourceId: sourceId(row.id),
    name: row.name,
    address: row.address,
    market: row.market,
    taxId: row.taxId,
  };
}

export function mapLegacySupplyPoint(
  row: LegacySupplyPointRow,
): LegacySupplyPointMapping {
  return {
    sourceId: sourceId(row.id),
    homeSourceId: sourceId(row.homeId),
    cups: row.cups,
    distributor: row.distributor,
    accessContract: row.accessContract,
    gridToll: row.gridToll,
    addressLine: row.addressLine,
    postalCode: row.postalCode,
    city: row.city,
    region: row.region,
    country: row.country,
    contractedPowerP1: decimal(row.contractedPowerP1, "contractedPowerP1"),
    contractedPowerP2: decimal(row.contractedPowerP2, "contractedPowerP2"),
    meters: row.meters,
  };
}

export function mapLegacyCostCategory(
  row: LegacyCostCategoryRow,
): LegacyCostCategoryMapping {
  return { sourceId: sourceId(row.id), name: row.name };
}

export function mapLegacyElectricityBill(
  row: LegacyElectricityBillRow,
): LegacyElectricityBillMapping {
  return {
    sourceId: sourceId(row.id),
    totalAmount: decimal(row.totalAmount, "totalAmount", true) as string,
    issueDate: date(row.issueDate, "issueDate", true) as Date,
    paymentDate: date(row.paymentDate, "paymentDate"),
    consumptionKwh: decimal(
      row.consumptionKwh,
      "consumptionKwh",
      true,
    ) as string,
    pdfUrl: row.pdfUrl,
    homeSourceId: sourceId(row.homeId),
    providerSourceId: sourceId(row.providerId),
    supplyPointSourceId:
      row.supplyPointId === null ? null : sourceId(row.supplyPointId),
    invoiceNumber: row.invoiceNumber,
    referenceNumber: row.referenceNumber,
    periodStart: date(row.periodStart, "periodStart"),
    periodEnd: date(row.periodEnd, "periodEnd"),
    periodDays: row.periodDays,
    tariff: row.tariff,
    contractNumber: row.contractNumber,
  };
}

export function mapLegacyElectricityCostLine(
  row: LegacyBillCostLineRow,
): LegacyElectricityCostLineMapping {
  return {
    sourceId: sourceId(row.id),
    billSourceId: sourceId(row.billId),
    categorySourceId: sourceId(row.categoryId),
    amount: decimal(row.amount, "amount", true) as string,
  };
}
