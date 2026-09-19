import { notFound } from "next/navigation";
import { requireSession } from "@/lib/require-session";
import { AppShell } from "@/components/app-navigation";
import {
  ElectricityBillForm,
  type FormBill,
} from "@/components/electricity-bill-form";
import { updateElectricityBill } from "@/app/electricity-actions";
import {
  loadBillFormOptions,
  loadElectricityBill,
} from "@/app/electricity-page-data";

export const dynamic = "force-dynamic";

export default async function EditInvoicePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireSession();
  const { id } = await params;
  const [bill, options] = await Promise.all([
    loadElectricityBill(id),
    loadBillFormOptions(),
  ]);
  if (!bill) notFound();
  const formBill: FormBill = {
    id: bill.id,
    totalAmount: Number(bill.totalAmount),
    issueDate: bill.issueDate,
    paymentDate: bill.paymentDate ?? undefined,
    consumptionKwh: Number(bill.consumptionKwh),
    readingType: bill.readingType ?? undefined,
    status: bill.status,
    originalBillId: bill.originalBillId ?? undefined,
    homeId: bill.homeId,
    providerId: bill.providerId,
    supplyPointId: bill.supplyPointId ?? undefined,
    invoiceNumber: bill.invoiceNumber ?? undefined,
    referenceNumber: bill.referenceNumber ?? undefined,
    periodStart: bill.periodStart ?? undefined,
    periodEnd: bill.periodEnd ?? undefined,
    periodDays: bill.periodDays ?? undefined,
    tariff: bill.tariff ?? undefined,
    contractNumber: bill.contractNumber ?? undefined,
    pdfUrl: bill.pdfUrl ?? undefined,
    costLines: bill.costLines.map((line) => ({
      categoryId: line.categoryId,
      categoryName: line.category.name,
      amount: Number(line.amount),
    })),
  };
  return (
    <AppShell>
      <div className="page-heading">
        <div>
          <p className="eyebrow">Editar factura</p>
          <h1>{bill.invoiceNumber || "Factura sin número"}</h1>
          <p className="lede">
            Actualiza los datos y guarda todo el desglose en una sola operación.
          </p>
        </div>
      </div>
      <ElectricityBillForm
        action={updateElectricityBill}
        bill={formBill}
        {...options}
      />
    </AppShell>
  );
}
