import Link from "next/link";
import {
  averageUnitPrice,
  electricitySummary,
  groupBillsByMonth,
  type ElectricityFilters,
} from "@/lib/electricity";
import {
  formatEUR,
  formatKwh,
  formatUnitPrice,
  formatElectricityDate,
} from "@/lib/electricity-format";
import { electricityHref } from "@/lib/electricity";
import type { ElectricityDashboardBill } from "@/lib/electricity-dashboard";

export type DashboardOption = { id: string; name: string };

type ElectricityDashboardProps = {
  bills: ElectricityDashboardBill[];
  homes: DashboardOption[];
  filters: ElectricityFilters;
  title?: string;
};

function monthLabel(month: string): string {
  const [year, rawMonth] = month.split("-").map(Number);
  return new Intl.DateTimeFormat("es-ES", { month: "short" })
    .format(new Date(Date.UTC(year, rawMonth - 1, 1)))
    .replace(".", "");
}

function statusLabel(status?: string): string {
  if (status === "CANCELLED") return "Anulada";
  if (status === "RECTIFICATIVE") return "Rectificativa";
  return "Normal";
}

export function ElectricityDashboard({
  bills,
  homes,
  filters,
  title = "Resumen de electricidad",
}: ElectricityDashboardProps) {
  const cutoff = new Date();
  cutoff.setMonth(cutoff.getMonth() - 12);
  const windowBills = bills.filter((bill) => bill.issueDate >= cutoff);
  const summary = electricitySummary(windowBills);
  const unitPrice = averageUnitPrice(
    summary.totalAmount,
    summary.totalConsumptionKwh,
  );
  const recentBills = windowBills.slice(0, 5);
  const monthly = groupBillsByMonth(windowBills).slice(-12);
  const maxAmount = Math.max(...monthly.map((item) => item.totalAmount), 1);
  const homeName =
    homes.find((home) => home.id === filters.homeId)?.name ?? "Meco";

  return (
    <>
      <section className="dashboard-hero" aria-labelledby="dashboard-title">
        <div className="card hero-card">
          <p className="eyebrow">{homeName}</p>
          <h1 id="dashboard-title">{title}</h1>
          <p>
            Una lectura tranquila de tus facturas, consumo y evolución. Todo
            queda en un mismo sitio.
          </p>
          <div className="hero-actions">
            <Link className="button button-primary" href="/facturas/nueva">
              Añadir factura
            </Link>
            <Link className="button button-secondary" href="/facturas">
              Ver histórico
            </Link>
          </div>
        </div>
        <div className="card hero-note">
          <div>
            <p className="eyebrow">Últimos 12 meses</p>
            <strong>
              {summary.count
                ? "Tu consumo, a simple vista"
                : "Todavía no hay facturas"}
            </strong>
            <p>
              {summary.count
                ? "Los importes y kWh se calculan solo con facturas efectivas."
                : "Añade la primera factura para empezar a ver tendencias."}
            </p>
          </div>
          <Link className="table-link" href={electricityHref(filters)}>
            Explorar facturas →
          </Link>
        </div>
      </section>

      <section
        className="stat-grid"
        aria-label="Totales de los últimos 12 meses"
      >
        <div className="card stat-card">
          <p className="stat-label">Importe total</p>
          <p className="stat-value">{formatEUR(summary.totalAmount)}</p>
          <p className="stat-subvalue">Facturas efectivas</p>
        </div>
        <div className="card stat-card">
          <p className="stat-label">Consumo</p>
          <p className="stat-value">{formatKwh(summary.totalConsumptionKwh)}</p>
          <p className="stat-subvalue">Energía registrada</p>
        </div>
        <div className="card stat-card">
          <p className="stat-label">Media por factura</p>
          <p className="stat-value">{formatEUR(summary.averageAmount)}</p>
          <p className="stat-subvalue">{summary.count} facturas</p>
        </div>
        <div className="card stat-card">
          <p className="stat-label">Precio medio</p>
          <p className="stat-value">{formatUnitPrice(unitPrice)}</p>
          <p className="stat-subvalue">Importe / kWh</p>
        </div>
      </section>

      <section className="card section-card" aria-labelledby="trend-title">
        <div className="section-header">
          <div>
            <p className="eyebrow">Evolución</p>
            <h2 id="trend-title">Importe mensual</h2>
          </div>
          <span className="muted">Máximo {formatEUR(maxAmount)}</span>
        </div>
        {monthly.length ? (
          <div
            className="chart"
            role="img"
            aria-label="Gráfico de importes mensuales"
          >
            <div className="chart-bars">
              {monthly.map((item) => (
                <div
                  className="chart-bar"
                  key={item.month}
                  style={{
                    height: `${Math.max((item.totalAmount / maxAmount) * 100, 4)}%`,
                  }}
                  title={`${monthLabel(item.month)}: ${formatEUR(item.totalAmount)}`}
                />
              ))}
            </div>
            <div className="chart-labels">
              {monthly.map((item) => (
                <span key={item.month}>{monthLabel(item.month)}</span>
              ))}
            </div>
          </div>
        ) : (
          <div className="empty-state">
            <h2>Sin tendencia todavía</h2>
            <p>
              Cuando tengas facturas, aquí aparecerá la evolución mensual del
              importe.
            </p>
          </div>
        )}
      </section>

      <section className="card section-card" aria-labelledby="recent-title">
        <div className="section-header">
          <div>
            <p className="eyebrow">Actividad reciente</p>
            <h2 id="recent-title">Últimas facturas</h2>
          </div>
          <Link href="/facturas" className="table-link">
            Ver todas →
          </Link>
        </div>
        {recentBills.length ? (
          <BillsTable bills={recentBills} />
        ) : (
          <div className="empty-state">
            <h2>Aún no hay facturas</h2>
            <p>
              Este espacio se llenará cuando guardes tu primera factura de
              electricidad.
            </p>
            <Link className="button button-primary" href="/facturas/nueva">
              Añadir factura
            </Link>
          </div>
        )}
      </section>
    </>
  );
}

export function BillsTable({ bills }: { bills: ElectricityDashboardBill[] }) {
  return (
    <div className="table-wrap">
      <table className="data-table">
        <caption className="sr-only">Facturas eléctricas</caption>
        <thead>
          <tr>
            <th>Emisión</th>
            <th>Factura</th>
            <th>Proveedor</th>
            <th>Estado</th>
            <th>Consumo</th>
            <th>Importe</th>
          </tr>
        </thead>
        <tbody>
          {bills.map((bill) => (
            <tr key={bill.id}>
              <td>{formatElectricityDate(bill.issueDate)}</td>
              <td>
                <Link className="table-link" href={`/facturas/${bill.id}`}>
                  {bill.invoiceNumber || "Sin número"}
                </Link>
              </td>
              <td>{bill.providerName || "—"}</td>
              <td>
                <span
                  className={`badge ${bill.status === "CANCELLED" ? "badge-danger" : bill.status === "RECTIFICATIVE" ? "badge-warning" : "badge-success"}`}
                >
                  {statusLabel(bill.status)}
                </span>
              </td>
              <td>{formatKwh(bill.consumptionKwh)}</td>
              <td className="amount">{formatEUR(bill.totalAmount)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
