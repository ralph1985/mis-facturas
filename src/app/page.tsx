import { requireSession } from "@/lib/require-session";
import { loadElectricityDashboard } from "./electricity-page-data";
import { AppShell } from "@/components/app-navigation";
import { ElectricityDashboard } from "@/components/electricity-dashboard";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  await requireSession();
  const data = await loadElectricityDashboard();
  return (
    <AppShell>
      <ElectricityDashboard
        bills={data.bills}
        homes={data.homes}
        filters={data.filters}
        title="Tu energía, más clara"
      />
    </AppShell>
  );
}
