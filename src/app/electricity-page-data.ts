import { getDb } from "@/lib/db";
import {
  getElectricityDashboard,
  type ElectricityDashboardSource,
  type ElectricitySearchParams,
} from "@/lib/electricity-dashboard";
import type { ElectricityDashboardBill } from "@/lib/electricity-dashboard";
import { parseElectricityFilters } from "@/lib/electricity-dashboard";
import { requireSession } from "@/lib/require-session";
import { maskSupplyPointCups } from "@/lib/supply-point";

export type PageOption = { id: string; name: string };
export type SupplyOption = PageOption & { homeId: string; cups: string | null };

export async function loadElectricityDashboard(
  searchParams: ElectricitySearchParams = {},
) {
  await requireSession();
  const db = getDb();
  const meco = await db.home.findFirst({
    where: { name: "Meco" },
    select: { id: true, name: true },
  });
  const homes = meco ? [meco] : [];
  const parsed = parseElectricityFilters(searchParams);
  const scopedParams = {
    ...searchParams,
    home: meco?.id,
    q: parsed.query,
    year: parsed.year === undefined ? undefined : String(parsed.year),
  };
  const source: ElectricityDashboardSource = {
    electricityBill: {
      findMany: (query) =>
        db.electricityBill.findMany(
          query as Parameters<typeof db.electricityBill.findMany>[0],
        ) as unknown as Promise<readonly Record<string, unknown>[]>,
    },
  };
  const data = await getElectricityDashboard(source, scopedParams);
  return {
    bills: data.bills as ElectricityDashboardBill[],
    homes: homes.map((home) => ({ id: home.id, name: home.name })),
    filters: { ...data.filters, homeId: meco?.id },
    meco: meco ? { id: meco.id, name: meco.name } : null,
  };
}

export async function loadBillFormOptions() {
  await requireSession();
  const db = getDb();
  const meco = await db.home.findFirst({
    where: { name: "Meco" },
    select: { id: true, name: true },
  });
  if (!meco)
    return { homes: [], providers: [], supplyPoints: [], categories: [] };

  const [providers, points, categories] = await Promise.all([
    db.energyProvider.findMany({
      where: { electricityBills: { some: { homeId: meco.id } } },
      orderBy: { name: "asc" },
      select: { id: true, name: true },
    }),
    db.electricitySupplyPoint.findMany({
      where: { homeId: meco.id },
      orderBy: { cups: "asc" },
      select: { id: true, homeId: true, cups: true },
    }),
    db.electricityCostCategory.findMany({
      orderBy: { name: "asc" },
      select: { id: true, name: true },
    }),
  ]);
  return {
    homes: [meco],
    providers: providers.map((item) => ({ id: item.id, name: item.name })),
    supplyPoints: points.map((item) => ({
      id: item.id,
      name: maskSupplyPointCups(item.cups),
      homeId: item.homeId,
      cups: maskSupplyPointCups(item.cups),
    })),
    categories: categories.map((item) => ({ id: item.id, name: item.name })),
  };
}

export async function loadElectricityBill(id: string) {
  await requireSession();
  const db = getDb();
  const bill = await db.electricityBill.findUnique({
    where: { id },
    include: {
      home: true,
      provider: true,
      supplyPoint: true,
      costLines: { include: { category: true } },
    },
  });
  return bill?.home.name === "Meco" ? bill : null;
}

export async function loadSupplyData() {
  await requireSession();
  const db = getDb();
  const meco = await db.home.findFirst({
    where: { name: "Meco" },
    select: { id: true, name: true },
  });
  if (!meco) return { homes: [], providers: [], points: [] };

  const [providers, points] = await Promise.all([
    db.energyProvider.findMany({
      where: { electricityBills: { some: { homeId: meco.id } } },
      orderBy: { name: "asc" },
      select: { id: true, name: true, market: true, address: true },
    }),
    db.electricitySupplyPoint.findMany({
      where: { homeId: meco.id },
      orderBy: { cups: "asc" },
      select: {
        id: true,
        homeId: true,
        cups: true,
        distributor: true,
        addressLine: true,
        postalCode: true,
        city: true,
        region: true,
        contractedPowerP1: true,
        contractedPowerP2: true,
      },
    }),
  ]);
  return { homes: [meco], providers, points };
}
