import dotenv from "dotenv";
import { existsSync } from "node:fs";
import {
  mapLegacyCostCategory,
  mapLegacyElectricityBill,
  mapLegacyElectricityCostLine,
  mapLegacyHome,
  mapLegacyProvider,
  mapLegacySupplyPoint,
  type LegacyBillCostLineRow,
  type LegacyCostCategoryRow,
  type LegacyElectricityBillRow,
  type LegacyHomeRow,
  type LegacyProviderRow,
  type LegacySupplyPointRow,
} from "../src/lib/legacy-electricity-import";

type SQLiteDatabase = {
  prepare(sql: string): { all(): unknown[] };
  close(): void;
};

// Node 22 exposes node:sqlite before its installed type definitions.
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { DatabaseSync } = require("node:sqlite") as {
  DatabaseSync: new (
    filename: string,
    options: { readOnly: boolean },
  ) => SQLiteDatabase;
};

dotenv.config({ path: ".env.local", quiet: true });
dotenv.config({ quiet: true });

const LEGACY_SQLITE_DEFAULT = "/home/rafa/tailscale/dev-20260618-085601.db";
const source = process.env.LEGACY_SQLITE_PATH ?? LEGACY_SQLITE_DEFAULT;
const write = process.argv.includes("--write");

type SourceData = {
  homes: LegacyHomeRow[];
  providers: LegacyProviderRow[];
  supplyPoints: LegacySupplyPointRow[];
  costCategories: LegacyCostCategoryRow[];
  electricityBills: LegacyElectricityBillRow[];
  electricityBillCostLines: LegacyBillCostLineRow[];
};

type ImportCounts = {
  homes: number;
  providers: number;
  supplyPoints: number;
  costCategories: number;
  electricityBills: number;
  electricityBillCostLines: number;
};

type ImportRecordRow = { targetId: string };
type ImportRecordClient = {
  findUnique(args: {
    where: { sourceTable_sourceId: { sourceTable: string; sourceId: string } };
  }): Promise<ImportRecordRow | null>;
  create(args: {
    data: {
      sourceTable: string;
      sourceId: string;
      targetId: string;
      payload: Record<string, unknown>;
    };
  }): Promise<unknown>;
};

type ImportTransaction = {
  home: {
    create(args: { data: { name: string } }): Promise<{ id: string }>;
  };
  energyProvider: {
    create(args: {
      data: {
        name: string;
        address: string | null;
        market: string | null;
        taxId: string | null;
      };
    }): Promise<{ id: string }>;
  };
  electricitySupplyPoint: {
    create(args: { data: Record<string, unknown> }): Promise<{ id: string }>;
  };
  electricityCostCategory: {
    create(args: { data: { name: string } }): Promise<{ id: string }>;
  };
  electricityBill: {
    create(args: { data: Record<string, unknown> }): Promise<{ id: string }>;
  };
  electricityBillCostLine: {
    create(args: {
      data: { billId: string; categoryId: string; amount: string };
    }): Promise<{ id: string }>;
  };
  importRecord: ImportRecordClient;
};

type ImportClient = ImportTransaction & {
  $transaction<T>(
    callback: (transaction: ImportTransaction) => Promise<T>,
  ): Promise<T>;
  $disconnect(): Promise<void>;
};

function readLegacyData(): SourceData {
  if (!existsSync(source))
    throw new Error("No existe la copia SQLite configurada.");
  const sqlite = new DatabaseSync(source, { readOnly: true });
  const read = <T>(table: string): T[] =>
    sqlite.prepare(`SELECT * FROM "${table}"`).all() as T[];
  try {
    return {
      homes: read<LegacyHomeRow>("Home"),
      providers: read<LegacyProviderRow>("Provider"),
      supplyPoints: read<LegacySupplyPointRow>("SupplyPoint"),
      costCategories: read<LegacyCostCategoryRow>("CostCategory"),
      electricityBills: read<LegacyElectricityBillRow>("ElectricityBill"),
      electricityBillCostLines: read<LegacyBillCostLineRow>("BillCostLine"),
    };
  } finally {
    sqlite.close();
  }
}

function selectMecoData(sourceData: SourceData): {
  home: LegacyHomeRow;
  data: SourceData;
} {
  const home = sourceData.homes.find((candidate) => candidate.name === "Meco");
  if (!home) throw new Error("No se encontró el hogar Meco.");

  const electricityBills = sourceData.electricityBills.filter(
    (bill) => bill.homeId === home.id,
  );
  const billIds = new Set(electricityBills.map((bill) => bill.id));
  const electricityBillCostLines = sourceData.electricityBillCostLines.filter(
    (line) => billIds.has(line.billId),
  );
  const providerIds = new Set(electricityBills.map((bill) => bill.providerId));
  const supplyPointIds = new Set(
    electricityBills.flatMap((bill) =>
      bill.supplyPointId === null ? [] : [bill.supplyPointId],
    ),
  );
  const categoryIds = new Set(
    electricityBillCostLines.map((line) => line.categoryId),
  );

  return {
    home,
    data: {
      homes: [home],
      providers: sourceData.providers.filter((provider) =>
        providerIds.has(provider.id),
      ),
      supplyPoints: sourceData.supplyPoints.filter(
        (supplyPoint) =>
          supplyPoint.homeId === home.id && supplyPointIds.has(supplyPoint.id),
      ),
      costCategories: sourceData.costCategories.filter((category) =>
        categoryIds.has(category.id),
      ),
      electricityBills,
      electricityBillCostLines,
    },
  };
}

function counts(data: SourceData): ImportCounts {
  return {
    homes: data.homes.length,
    providers: data.providers.length,
    supplyPoints: data.supplyPoints.length,
    costCategories: data.costCategories.length,
    electricityBills: data.electricityBills.length,
    electricityBillCostLines: data.electricityBillCostLines.length,
  };
}

function jsonPayload(row: object): Record<string, unknown> {
  return JSON.parse(JSON.stringify(row)) as Record<string, unknown>;
}

async function imported(
  client: ImportRecordClient,
  sourceTable: string,
  sourceId: string,
): Promise<ImportRecordRow | null> {
  return client.findUnique({
    where: { sourceTable_sourceId: { sourceTable, sourceId } },
  });
}

async function mark(
  client: ImportRecordClient,
  sourceTable: string,
  sourceId: string,
  targetId: string,
  payload: object,
): Promise<void> {
  await client.create({
    data: { sourceTable, sourceId, targetId, payload: jsonPayload(payload) },
  });
}

async function requireBackupPreConfirmation(): Promise<void> {
  if (!process.env.DATABASE_URL)
    throw new Error("Falta DATABASE_URL para escribir la importación.");
  if (process.env.MIS_FACTURAS_BACKUP_PRE_CONFIRMED !== "1") {
    throw new Error(
      "Falta la confirmación del backup PRE para escribir la importación.",
    );
  }
}

async function writeImport(data: SourceData): Promise<void> {
  await requireBackupPreConfirmation();
  const [{ PrismaPg }, { Pool }, { PrismaClient }] = await Promise.all([
    import("@prisma/adapter-pg"),
    import("pg"),
    import("../src/generated/prisma/client"),
  ]);
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  const db = new PrismaClient({
    adapter: new PrismaPg(pool),
  }) as unknown as ImportClient;
  let importLockHeld = false;
  try {
    await pool.query("SELECT pg_advisory_lock(hashtextextended($1, 0))", [
      "mis-facturas:legacy-import",
    ]);
    importLockHeld = true;
    const homeIds = new Map<number, string>();
    const providerIds = new Map<number, string>();
    const supplyPointIds = new Map<number, string>();
    const categoryIds = new Map<number, string>();
    const billIds = new Map<number, string>();

    for (const row of data.homes) {
      const mapped = mapLegacyHome(row);
      const existing = await imported(db.importRecord, "Home", mapped.sourceId);
      if (existing) {
        homeIds.set(row.id, existing.targetId);
        continue;
      }
      const home = await db.home.create({ data: { name: mapped.name } });
      await mark(db.importRecord, "Home", mapped.sourceId, home.id, row);
      homeIds.set(row.id, home.id);
    }

    for (const row of data.providers) {
      const mapped = mapLegacyProvider(row);
      const existing = await imported(
        db.importRecord,
        "Provider",
        mapped.sourceId,
      );
      if (existing) {
        providerIds.set(row.id, existing.targetId);
        continue;
      }
      const provider = await db.energyProvider.create({
        data: {
          name: mapped.name,
          address: mapped.address,
          market: mapped.market,
          taxId: mapped.taxId,
        },
      });
      await mark(
        db.importRecord,
        "Provider",
        mapped.sourceId,
        provider.id,
        row,
      );
      providerIds.set(row.id, provider.id);
    }

    for (const row of data.supplyPoints) {
      const mapped = mapLegacySupplyPoint(row);
      const homeId = homeIds.get(row.homeId);
      if (!homeId)
        throw new Error(
          "El punto de suministro seleccionado no tiene hogar importado.",
        );
      const existing = await imported(
        db.importRecord,
        "SupplyPoint",
        mapped.sourceId,
      );
      if (existing) {
        supplyPointIds.set(row.id, existing.targetId);
        continue;
      }
      const supplyPoint = await db.electricitySupplyPoint.create({
        data: {
          homeId,
          cups: mapped.cups,
          distributor: mapped.distributor,
          accessContract: mapped.accessContract,
          gridToll: mapped.gridToll,
          addressLine: mapped.addressLine,
          postalCode: mapped.postalCode,
          city: mapped.city,
          region: mapped.region,
          country: mapped.country,
          contractedPowerP1: mapped.contractedPowerP1,
          contractedPowerP2: mapped.contractedPowerP2,
          meters: mapped.meters,
        },
      });
      await mark(
        db.importRecord,
        "SupplyPoint",
        mapped.sourceId,
        supplyPoint.id,
        row,
      );
      supplyPointIds.set(row.id, supplyPoint.id);
    }

    for (const row of data.costCategories) {
      const mapped = mapLegacyCostCategory(row);
      const existing = await imported(
        db.importRecord,
        "CostCategory",
        mapped.sourceId,
      );
      if (existing) {
        categoryIds.set(row.id, existing.targetId);
        continue;
      }
      const category = await db.electricityCostCategory.create({
        data: { name: mapped.name },
      });
      await mark(
        db.importRecord,
        "CostCategory",
        mapped.sourceId,
        category.id,
        row,
      );
      categoryIds.set(row.id, category.id);
    }

    const linesByBill = new Map<number, LegacyBillCostLineRow[]>();
    for (const line of data.electricityBillCostLines) {
      const lines = linesByBill.get(line.billId) ?? [];
      lines.push(line);
      linesByBill.set(line.billId, lines);
    }

    for (const row of data.electricityBills) {
      const mapped = mapLegacyElectricityBill(row);
      const homeId = homeIds.get(row.homeId);
      const providerId = providerIds.get(row.providerId);
      const supplyPointId =
        mapped.supplyPointSourceId === null
          ? null
          : supplyPointIds.get(row.supplyPointId as number);
      if (
        !homeId ||
        !providerId ||
        (mapped.supplyPointSourceId !== null && !supplyPointId)
      ) {
        throw new Error(
          "Una factura seleccionada tiene referencias fuera del alcance Meco.",
        );
      }

      await db.$transaction(async (transaction) => {
        const existing = await imported(
          transaction.importRecord,
          "ElectricityBill",
          mapped.sourceId,
        );
        if (existing) {
          billIds.set(row.id, existing.targetId);
          return;
        }
        const bill = await transaction.electricityBill.create({
          data: {
            totalAmount: mapped.totalAmount,
            issueDate: mapped.issueDate,
            paymentDate: mapped.paymentDate,
            consumptionKwh: mapped.consumptionKwh,
            readingType: null,
            status: "NORMAL",
            originalBillId: null,
            pdfUrl: mapped.pdfUrl,
            homeId,
            providerId,
            supplyPointId: supplyPointId ?? null,
            invoiceNumber: mapped.invoiceNumber,
            referenceNumber: mapped.referenceNumber,
            periodStart: mapped.periodStart,
            periodEnd: mapped.periodEnd,
            periodDays: mapped.periodDays,
            tariff: mapped.tariff,
            contractNumber: mapped.contractNumber,
          },
        });
        for (const line of linesByBill.get(row.id) ?? []) {
          const mappedLine = mapLegacyElectricityCostLine(line);
          const categoryId = categoryIds.get(line.categoryId);
          if (!categoryId)
            throw new Error(
              "Una línea seleccionada tiene una categoría fuera de alcance.",
            );
          const existingLine = await imported(
            transaction.importRecord,
            "BillCostLine",
            mappedLine.sourceId,
          );
          if (existingLine) continue;
          const costLine = await transaction.electricityBillCostLine.create({
            data: { billId: bill.id, categoryId, amount: mappedLine.amount },
          });
          await mark(
            transaction.importRecord,
            "BillCostLine",
            mappedLine.sourceId,
            costLine.id,
            line,
          );
        }
        await mark(
          transaction.importRecord,
          "ElectricityBill",
          mapped.sourceId,
          bill.id,
          row,
        );
        billIds.set(row.id, bill.id);
      });
    }
  } finally {
    if (importLockHeld) {
      await pool
        .query("SELECT pg_advisory_unlock(hashtextextended($1, 0))", [
          "mis-facturas:legacy-import",
        ])
        .catch(() => undefined);
    }
    await db.$disconnect();
    await pool.end();
  }
}

async function main(): Promise<void> {
  const selected = selectMecoData(readLegacyData());
  console.log(
    JSON.stringify(
      { mode: write ? "write" : "dry-run", counts: counts(selected.data) },
      null,
      2,
    ),
  );
  if (write) {
    await writeImport(selected.data);
    console.log("Importación completada sin duplicados.");
  }
}

void main().catch((error: unknown) => {
  const message =
    error instanceof Error
      ? error.message
      : "Error desconocido durante la importación.";
  console.error(message);
  process.exitCode = 1;
});
