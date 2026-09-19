"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getDb } from "@/lib/db";
import { requireSession } from "@/lib/require-session";
import { normalizeElectricityText } from "@/lib/electricity";
import { electricityBillInputSchema } from "@/lib/electricity-validation";
import { validateElectricityReferences } from "@/lib/electricity-actions-validation";

export type ElectricityActionResult = { error?: string; success?: string };

function formString(formData: FormData, key: string): string | undefined {
  const value = formData.get(key);
  return typeof value === "string" ? value : undefined;
}

function formNumber(formData: FormData, key: string): string | undefined {
  return formString(formData, key);
}

function formInput(formData: FormData): Record<string, string | undefined> {
  return {
    id: formString(formData, "id"),
    totalAmount: formNumber(formData, "totalAmount"),
    issueDate: formString(formData, "issueDate"),
    paymentDate: formString(formData, "paymentDate"),
    consumptionKwh: formNumber(formData, "consumptionKwh"),
    readingType: formString(formData, "readingType"),
    status: formString(formData, "status"),
    originalBillId: formString(formData, "originalBillId"),
    homeId: formString(formData, "homeId"),
    providerId: formString(formData, "providerId"),
    supplyPointId: formString(formData, "supplyPointId"),
    invoiceNumber: formString(formData, "invoiceNumber"),
    referenceNumber: formString(formData, "referenceNumber"),
    periodStart: formString(formData, "periodStart"),
    periodEnd: formString(formData, "periodEnd"),
    periodDays: formNumber(formData, "periodDays"),
    tariff: formString(formData, "tariff"),
    contractNumber: formString(formData, "contractNumber"),
    pdfUrl: formString(formData, "pdfUrl"),
  };
}

function parseCostLines(formData: FormData) {
  const categoryIds = formData
    .getAll("categoryId")
    .map((value) => (typeof value === "string" ? value.trim() : ""));
  const categoryNames = formData
    .getAll("categoryNameInput")
    .map((value) => (typeof value === "string" ? value.trim() : ""));
  const amounts = formData
    .getAll("costAmount")
    .map((value) => (typeof value === "string" ? value.trim() : ""));
  if (
    categoryIds.length !== categoryNames.length ||
    categoryIds.length !== amounts.length
  )
    throw new Error("INVALID_LINES");
  const seen = new Set<string>();
  return categoryIds
    .map((categoryId, index) => ({
      categoryId: categoryId || null,
      categoryName: categoryNames[index] || null,
      amount: Number(amounts[index].replace(",", ".")),
    }))
    .filter((line) => line.categoryId || line.categoryName)
    .map((line) => {
      if (!Number.isFinite(line.amount) || line.amount < 0)
        throw new Error("INVALID_LINES");
      const key =
        line.categoryId || normalizeElectricityText(line.categoryName ?? "");
      if (!key || seen.has(key)) throw new Error("DUPLICATE_LINES");
      seen.add(key);
      return line;
    });
}

function actionError(error: unknown): ElectricityActionResult {
  if (
    error instanceof Error &&
    (error.message === "INVALID_LINES" || error.message === "DUPLICATE_LINES")
  )
    return {
      error:
        "Revisa las líneas de coste: no puede haber categorías duplicadas y los importes deben ser válidos.",
    };
  return {
    error:
      "No se pudo guardar la factura. Revisa los datos e inténtalo de nuevo.",
  };
}

async function saveElectricityBill(
  formData: FormData,
  isUpdate: boolean,
): Promise<ElectricityActionResult> {
  await requireSession();
  const parsed = electricityBillInputSchema.safeParse(formInput(formData));
  if (!parsed.success)
    return { error: "Revisa los campos de la factura antes de guardarla." };
  const billInput = parsed.data;
  if (isUpdate && !billInput.id)
    return { error: "No se encontró la factura que quieres editar." };
  if (!isUpdate && billInput.id)
    return { error: "No se pudo crear la factura." };

  let lines: ReturnType<typeof parseCostLines>;
  try {
    lines = parseCostLines(formData);
  } catch (error) {
    return actionError(error);
  }

  const db = getDb();
  let savedId: string;
  try {
    savedId = await db.$transaction(async (tx) => {
      const [home, provider, point, existingBill] = await Promise.all([
        tx.home.findFirst({
          where: { id: billInput.homeId, name: "Meco" },
          select: { id: true, name: true },
        }),
        tx.energyProvider.findFirst({
          where: {
            id: billInput.providerId,
            electricityBills: { some: { homeId: billInput.homeId } },
          },
          select: { id: true },
        }),
        billInput.supplyPointId
          ? tx.electricitySupplyPoint.findFirst({
              where: {
                id: billInput.supplyPointId,
                homeId: billInput.homeId,
              },
              select: { id: true, homeId: true },
            })
          : Promise.resolve(null),
        isUpdate && billInput.id
          ? tx.electricityBill.findFirst({
              where: { id: billInput.id, home: { name: "Meco" } },
              select: { id: true },
            })
          : Promise.resolve(null),
      ]);
      if (isUpdate && !existingBill) throw new Error("INVALID_REFERENCES");
      const referenceError = validateElectricityReferences(billInput, {
        homes: home ? [home] : [],
        providers: provider ? [provider] : [],
        supplyPoints: point ? [point] : [],
        categories: [],
      });
      if (referenceError) throw new Error("INVALID_REFERENCES");
      if (billInput.originalBillId) {
        const original = await tx.electricityBill.findFirst({
          where: {
            id: billInput.originalBillId,
            home: { name: "Meco" },
          },
          select: { id: true },
        });
        if (!original) throw new Error("INVALID_REFERENCES");
      }
      const existingCategories = await tx.electricityCostCategory.findMany({
        select: { id: true, name: true },
      });
      const existingIds = new Set(existingCategories.map((item) => item.id));
      const existingNames = new Set(
        existingCategories.map((item) => normalizeElectricityText(item.name)),
      );
      const categoryIds: string[] = [];
      for (const line of lines) {
        if (line.categoryId) {
          if (!existingIds.has(line.categoryId))
            throw new Error("INVALID_REFERENCES");
          categoryIds.push(line.categoryId);
        } else if (line.categoryName) {
          const normalized = normalizeElectricityText(line.categoryName);
          if (existingNames.has(normalized)) throw new Error("DUPLICATE_LINES");
          const category = await tx.electricityCostCategory.create({
            data: { name: line.categoryName },
            select: { id: true },
          });
          existingNames.add(normalized);
          categoryIds.push(category.id);
        }
      }
      const data = {
        totalAmount: billInput.totalAmount,
        issueDate: billInput.issueDate,
        paymentDate: billInput.paymentDate ?? null,
        consumptionKwh: billInput.consumptionKwh,
        readingType: billInput.readingType ?? null,
        status: billInput.status,
        originalBillId: billInput.originalBillId ?? null,
        pdfUrl: billInput.pdfUrl ?? null,
        homeId: billInput.homeId,
        providerId: billInput.providerId,
        supplyPointId: billInput.supplyPointId ?? null,
        invoiceNumber: billInput.invoiceNumber ?? null,
        referenceNumber: billInput.referenceNumber ?? null,
        periodStart: billInput.periodStart ?? null,
        periodEnd: billInput.periodEnd ?? null,
        periodDays: billInput.periodDays ?? null,
        tariff: billInput.tariff ?? null,
        contractNumber: billInput.contractNumber ?? null,
      };
      let id = billInput.id;
      if (isUpdate && id) {
        await tx.electricityBill.update({ where: { id }, data });
        await tx.electricityBillCostLine.deleteMany({ where: { billId: id } });
      } else {
        const created = await tx.electricityBill.create({
          data,
          select: { id: true },
        });
        id = created.id;
      }
      if (categoryIds.length) {
        await tx.electricityBillCostLine.createMany({
          data: lines.map((line, index) => ({
            billId: id as string,
            categoryId: categoryIds[index],
            amount: line.amount,
          })),
        });
      }
      return id as string;
    });
  } catch (error) {
    if (
      error instanceof Error &&
      (error.message === "INVALID_REFERENCES" ||
        error.message === "DUPLICATE_LINES")
    )
      return actionError(error);
    return actionError(error);
  }

  revalidatePath("/facturas");
  revalidatePath("/");
  revalidatePath(`/facturas/${savedId}`);
  redirect(`/facturas/${savedId}`);
}

export async function createElectricityBill(
  formData: FormData,
): Promise<ElectricityActionResult> {
  return saveElectricityBill(formData, false);
}

export async function updateElectricityBill(
  formData: FormData,
): Promise<ElectricityActionResult> {
  return saveElectricityBill(formData, true);
}
