import Link from "next/link";
import { requireSession } from "@/lib/require-session";
import { electricityHref } from "@/lib/electricity";
import {
  parseElectricityFilters,
  type ElectricitySearchParams,
} from "@/lib/electricity-dashboard";
import { AppShell } from "@/components/app-navigation";
import { BillsTable } from "@/components/electricity-dashboard";
import { shouldShowHomeSelector } from "@/lib/home-selection";
import { loadElectricityDashboard } from "../electricity-page-data";

export const dynamic = "force-dynamic";

type SearchParams = Promise<{ [key: string]: string | string[] | undefined }>;

function yearsFromBills(bills: Array<{ issueDate: Date }>): number[] {
  return [
    ...new Set(bills.map((bill) => new Date(bill.issueDate).getFullYear())),
  ].sort((a, b) => b - a);
}

export default async function InvoicesPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  await requireSession();
  const rawParams = await searchParams;
  const data = await loadElectricityDashboard(
    rawParams as ElectricitySearchParams,
  );
  const filters = parseElectricityFilters(rawParams as ElectricitySearchParams);
  const years = yearsFromBills(data.bills);
  const currentPath = electricityHref(filters);

  return (
    <AppShell>
      <div className="page-heading">
        <div>
          <p className="eyebrow">Histórico</p>
          <h1>Facturas</h1>
          <p className="lede">
            Revisa todas tus facturas de electricidad, con filtros sencillos
            para encontrar lo que buscas.
          </p>
        </div>
        <Link href="/facturas/nueva" className="button button-primary">
          + Nueva factura
        </Link>
      </div>
      <section
        className="card section-card"
        aria-labelledby="invoice-list-title"
      >
        <h2 id="invoice-list-title" className="sr-only">
          Listado de facturas
        </h2>
        <form className="filters" method="get">
          {shouldShowHomeSelector(data.homes.length) ? (
            <div className="field">
              <label htmlFor="home">Hogar</label>
              <select id="home" name="home" defaultValue={filters.homeId ?? ""}>
                <option value="">Todos los hogares</option>
                {data.homes.map((home) => (
                  <option key={home.id} value={home.id}>
                    {home.name}
                  </option>
                ))}
              </select>
            </div>
          ) : null}
          <div className="field">
            <label htmlFor="year">Año</label>
            <select
              id="year"
              name="year"
              defaultValue={filters.year ? String(filters.year) : ""}
            >
              <option value="">Todos los años</option>
              {years.map((year) => (
                <option key={year} value={year}>
                  {year}
                </option>
              ))}
            </select>
          </div>
          <div className="field">
            <label htmlFor="q">Buscar</label>
            <input
              id="q"
              name="q"
              type="search"
              placeholder="Proveedor, número o referencia"
              defaultValue={filters.query ?? ""}
            />
          </div>
          <button className="button button-primary filter-submit" type="submit">
            Aplicar filtros
          </button>
          {currentPath !== "/facturas" ? (
            <Link className="filter-reset" href="/facturas">
              Limpiar filtros
            </Link>
          ) : null}
        </form>
        {data.bills.length ? (
          <>
            <div className="section-header">
              <p className="muted">
                {data.bills.length}{" "}
                {data.bills.length === 1
                  ? "factura encontrada"
                  : "facturas encontradas"}
              </p>
              <p className="muted">
                Ordenadas por emisión, más recientes primero
              </p>
            </div>
            <BillsTable bills={data.bills} />
          </>
        ) : (
          <div className="empty-state">
            <h2>No hay facturas que coincidan</h2>
            <p>
              {filters.query || filters.year
                ? "Prueba a cambiar o limpiar los filtros para ver más resultados."
                : "Todavía no hay facturas guardadas para este hogar."}
            </p>
            <Link className="button button-primary" href="/facturas/nueva">
              Añadir primera factura
            </Link>
          </div>
        )}
      </section>
    </AppShell>
  );
}
