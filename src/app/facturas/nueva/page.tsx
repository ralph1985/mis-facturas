import { requireSession } from "@/lib/require-session";
import { AppShell } from "@/components/app-navigation";
import { ElectricityBillForm } from "@/components/electricity-bill-form";
import { createElectricityBill } from "@/app/electricity-actions";
import { loadBillFormOptions } from "@/app/electricity-page-data";

export const dynamic = "force-dynamic";

export default async function NewInvoicePage() {
  await requireSession();
  const options = await loadBillFormOptions();
  return (
    <AppShell>
      <div className="page-heading">
        <div>
          <p className="eyebrow">Nueva factura</p>
          <h1>Añadir factura</h1>
          <p className="lede">
            Guarda los datos esenciales y, si quieres, el desglose de costes. No
            necesitas subir el PDF.
          </p>
        </div>
      </div>
      <ElectricityBillForm action={createElectricityBill} {...options} />
    </AppShell>
  );
}
