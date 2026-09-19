import { notFound } from "next/navigation";
import { requireSession } from "@/lib/require-session";
import { AppShell } from "@/components/app-navigation";
import { ElectricityBillDetail } from "@/components/electricity-bill-detail";
import { loadElectricityBill } from "../../electricity-page-data";

export const dynamic = "force-dynamic";

export default async function InvoiceDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireSession();
  const { id } = await params;
  const bill = await loadElectricityBill(id);
  if (!bill) notFound();
  const detail = {
    id: bill.id,
    issueDate: bill.issueDate,
    totalAmount: Number(bill.totalAmount),
    consumptionKwh: Number(bill.consumptionKwh),
    homeId: bill.homeId,
    homeName: bill.home.name,
    providerName: bill.provider.name,
    paymentDate: bill.paymentDate,
    readingType: bill.readingType,
    status: bill.status,
    originalBillId: bill.originalBillId,
    invoiceNumber: bill.invoiceNumber,
    referenceNumber: bill.referenceNumber,
    supplyPointId: bill.supplyPointId,
    supplyPointCups: bill.supplyPoint?.cups ?? null,
    periodStart: bill.periodStart,
    periodEnd: bill.periodEnd,
    periodDays: bill.periodDays,
    tariff: bill.tariff,
    contractNumber: bill.contractNumber,
    pdfUrl: bill.pdfUrl,
    costLines: bill.costLines.map((line) => ({
      category: line.category.name,
      amount: Number(line.amount),
    })),
  };
  return (
    <AppShell>
      <ElectricityBillDetail bill={detail} />
    </AppShell>
  );
}
