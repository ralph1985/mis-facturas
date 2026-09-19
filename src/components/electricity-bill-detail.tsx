import Link from "next/link";
import {
  averageUnitPrice,
  costBreakdown,
  dailyCost,
  type ElectricityBillSummaryInput,
} from "@/lib/electricity";
import {
  formatDailyCost,
  formatElectricityDate,
  formatEUR,
  formatKwh,
  formatUnitPrice,
  maskCups,
} from "@/lib/electricity-format";

type BillDetail = ElectricityBillSummaryInput & {
  paymentDate?: Date | null;
  pdfUrl?: string | null;
  tariff?: string | null;
  contractNumber?: string | null;
  costLines: Array<{ category: string; amount: number }>;
};

function safePdfUrl(value: string | null | undefined): string | null {
  if (!value) return null;
  try {
    const url = new URL(value);
    return (url.protocol === "http:" || url.protocol === "https:") &&
      !url.username &&
      !url.password
      ? url.toString()
      : null;
  } catch {
    return null;
  }
}

function statusLabel(status?: string): string {
  if (status === "CANCELLED") return "Anulada";
  if (status === "RECTIFICATIVE") return "Rectificativa";
  return "Normal";
}

export function ElectricityBillDetail({ bill }: { bill: BillDetail }) {
  const unitPrice = averageUnitPrice(bill.totalAmount, bill.consumptionKwh);
  const daily = dailyCost(bill.totalAmount, bill.periodDays);
  const breakdown = costBreakdown(bill.costLines);
  const pdfUrl = safePdfUrl(bill.pdfUrl);
  const cups = maskCups(bill.supplyPointCups);

  return (
    <>
      <div className="page-heading">
        <div>
          <p className="eyebrow">Factura de electricidad</p>
          <h1>Detalle</h1>
          <p className="lede">
            Consulta los datos de la factura sin perder de vista el contexto del
            consumo.
          </p>
        </div>
        <div className="hero-actions">
          <Link className="button button-secondary" href="/facturas">
            ← Volver
          </Link>
          <Link
            className="button button-primary"
            href={`/facturas/${bill.id}/editar`}
          >
            Editar factura
          </Link>
        </div>
      </div>
      <section className="detail-grid">
        <article className="card detail-card">
          <div className="detail-title">
            <div>
              <span
                className={`badge ${bill.status === "CANCELLED" ? "badge-danger" : bill.status === "RECTIFICATIVE" ? "badge-warning" : "badge-success"}`}
              >
                {statusLabel(bill.status)}
              </span>
              <h1>{bill.invoiceNumber || "Factura sin número"}</h1>
              <p className="muted">
                {bill.providerName || "Proveedor no indicado"}
              </p>
            </div>
            <p className="detail-total">{formatEUR(bill.totalAmount)}</p>
          </div>
          <dl className="detail-list">
            <div className="detail-item">
              <dt>Fecha de emisión</dt>
              <dd>{formatElectricityDate(bill.issueDate)}</dd>
            </div>
            <div className="detail-item">
              <dt>Fecha de pago</dt>
              <dd>{formatElectricityDate(bill.paymentDate)}</dd>
            </div>
            <div className="detail-item">
              <dt>Periodo</dt>
              <dd>
                {formatElectricityDate(bill.periodStart)} –{" "}
                {formatElectricityDate(bill.periodEnd)}
              </dd>
            </div>
            <div className="detail-item">
              <dt>Días del periodo</dt>
              <dd>{bill.periodDays ? `${bill.periodDays} días` : "—"}</dd>
            </div>
            <div className="detail-item">
              <dt>Consumo</dt>
              <dd>{formatKwh(bill.consumptionKwh)}</dd>
            </div>
            <div className="detail-item">
              <dt>Precio medio</dt>
              <dd>{formatUnitPrice(unitPrice)}</dd>
            </div>
            <div className="detail-item">
              <dt>Coste diario</dt>
              <dd>{formatDailyCost(daily)}</dd>
            </div>
            <div className="detail-item">
              <dt>Tipo de lectura</dt>
              <dd>
                {bill.readingType === "REAL"
                  ? "Real"
                  : bill.readingType === "ESTIMATED"
                    ? "Estimada"
                    : "—"}
              </dd>
            </div>
            <div className="detail-item">
              <dt>Hogar</dt>
              <dd>{bill.homeName || "—"}</dd>
            </div>
            <div className="detail-item">
              <dt>CUPS parcial</dt>
              <dd>{cups}</dd>
            </div>
            <div className="detail-item">
              <dt>Tarifa</dt>
              <dd>{bill.tariff || "—"}</dd>
            </div>
            <div className="detail-item">
              <dt>Contrato</dt>
              <dd>{bill.contractNumber || "—"}</dd>
            </div>
            <div className="detail-item">
              <dt>Referencia</dt>
              <dd>{bill.referenceNumber || "—"}</dd>
            </div>
          </dl>
          {pdfUrl ? (
            <div className="hero-actions">
              <a
                className="button button-secondary"
                href={pdfUrl}
                target="_blank"
                rel="noopener noreferrer"
              >
                Abrir PDF ↗
              </a>
            </div>
          ) : (
            <p className="muted" style={{ marginTop: 24 }}>
              No hay un PDF seguro asociado a esta factura.
            </p>
          )}
        </article>
        <aside className="card detail-card" aria-labelledby="breakdown-title">
          <div className="section-header">
            <div>
              <p className="eyebrow">Desglose</p>
              <h2 id="breakdown-title">Costes de la factura</h2>
            </div>
          </div>
          {breakdown.length ? (
            <dl className="supply-meta">
              {breakdown.map((line) => (
                <div key={line.category}>
                  <dt>{line.category}</dt>
                  <dd
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      gap: 12,
                    }}
                  >
                    <span>{formatEUR(line.amount)}</span>
                    <span className="muted">
                      {line.percentage.toLocaleString("es-ES", {
                        maximumFractionDigits: 1,
                      })}
                      %
                    </span>
                  </dd>
                  <div className="progress-line" aria-hidden="true">
                    <span
                      style={{ width: `${Math.min(line.percentage, 100)}%` }}
                    />
                  </div>
                </div>
              ))}
            </dl>
          ) : (
            <div className="empty-state">
              <h2>Sin líneas de coste</h2>
              <p>Esta factura no tiene un desglose registrado.</p>
            </div>
          )}
        </aside>
      </section>
    </>
  );
}
