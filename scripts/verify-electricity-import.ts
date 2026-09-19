import dotenv from "dotenv";

dotenv.config({ path: ".env.local", quiet: true });
dotenv.config({ quiet: true });

const SOURCE_TABLES = [
  "Home",
  "Provider",
  "SupplyPoint",
  "CostCategory",
  "ElectricityBill",
  "BillCostLine",
] as const;

async function main(): Promise<void> {
  if (!process.env.DATABASE_URL)
    throw new Error("Falta DATABASE_URL para verificar la importación.");

  const [{ PrismaPg }, { Pool }, { PrismaClient }] = await Promise.all([
    import("@prisma/adapter-pg"),
    import("pg"),
    import("../src/generated/prisma/client"),
  ]);
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  const db = new PrismaClient({ adapter: new PrismaPg(pool) });

  try {
    const [
      homes,
      providers,
      supplyPoints,
      categories,
      bills,
      costLines,
      importRecords,
      totals,
    ] = await Promise.all([
      db.home.count(),
      db.energyProvider.count(),
      db.electricitySupplyPoint.count(),
      db.electricityCostCategory.count(),
      db.electricityBill.count(),
      db.electricityBillCostLine.count(),
      db.importRecord.groupBy({
        by: ["sourceTable"],
        where: { sourceTable: { in: [...SOURCE_TABLES] } },
        _count: { _all: true },
      }),
      db.electricityBill.aggregate({
        _sum: { totalAmount: true, consumptionKwh: true },
      }),
    ]);

    const importRecordCounts = Object.fromEntries(
      SOURCE_TABLES.map((sourceTable) => [
        sourceTable,
        importRecords.find((record) => record.sourceTable === sourceTable)
          ?._count._all ?? 0,
      ]),
    );
    console.log(
      JSON.stringify(
        {
          counts: {
            homes,
            providers,
            supplyPoints,
            categories,
            bills,
            costLines,
          },
          importRecords: importRecordCounts,
          totals: {
            totalAmount: totals._sum.totalAmount?.toString() ?? "0",
            consumptionKwh: totals._sum.consumptionKwh?.toString() ?? "0",
          },
        },
        null,
        2,
      ),
    );
  } finally {
    await db.$disconnect();
    await pool.end();
  }
}

void main().catch((error: unknown) => {
  const message =
    error instanceof Error
      ? error.message
      : "Error desconocido durante la verificación.";
  console.error(message);
  process.exitCode = 1;
});
