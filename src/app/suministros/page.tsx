import { requireSession } from "@/lib/require-session";
import { AppShell } from "@/components/app-navigation";
import {
  formatContractedPower,
  formatSupplyPointValue,
  maskSupplyPointCups,
} from "@/lib/supply-point";
import { loadSupplyData } from "@/app/electricity-page-data";

export const dynamic = "force-dynamic";

export default async function SuppliesPage() {
  await requireSession();
  const { homes, providers, points } = await loadSupplyData();
  return (
    <AppShell>
      <div className="page-heading">
        <div>
          <p className="eyebrow">Suministros</p>
          <h1>Tus puntos de suministro</h1>
          <p className="lede">
            Información útil para reconocer cada instalación, sin mostrar
            identificadores completos.
          </p>
        </div>
      </div>
      <section className="supply-grid" aria-label="Puntos de suministro">
        {points.length ? (
          points.map((point) => {
            const home = homes.find((item) => item.id === point.homeId);
            return (
              <article className="card supply-card" key={point.id}>
                <p className="eyebrow">{home?.name || "Hogar"}</p>
                <h2>{maskSupplyPointCups(point.cups)}</h2>
                <dl className="supply-meta">
                  <div>
                    <dt>Distribuidora</dt>
                    <dd>{formatSupplyPointValue(point.distributor)}</dd>
                  </div>
                  <div>
                    <dt>Dirección</dt>
                    <dd>
                      {formatSupplyPointValue(
                        [point.addressLine, point.postalCode, point.city]
                          .filter(Boolean)
                          .join(", "),
                      )}
                    </dd>
                  </div>
                  <div>
                    <dt>Potencia contratada</dt>
                    <dd>
                      {formatContractedPower(point.contractedPowerP1)} ·{" "}
                      {formatContractedPower(point.contractedPowerP2)}
                    </dd>
                  </div>
                </dl>
              </article>
            );
          })
        ) : (
          <div className="card empty-state">
            <h2>No hay puntos de suministro</h2>
            <p>
              Cuando se importe o registre un suministro, aparecerá aquí con el
              CUPS parcialmente oculto.
            </p>
          </div>
        )}
      </section>
      <section
        className="settings-grid"
        style={{ marginTop: 20 }}
        aria-label="Información relacionada"
      >
        <article className="card settings-card">
          <p className="eyebrow">Hogares</p>
          <h2>
            {homes.length
              ? `${homes.length} hogar${homes.length === 1 ? "" : "es"}`
              : "Sin hogares"}
          </h2>
          <p>{homes.map((home) => home.name).join(" · ") || "—"}</p>
        </article>
        <article className="card settings-card">
          <p className="eyebrow">Proveedores</p>
          <h2>
            {providers.length
              ? `${providers.length} proveedor${providers.length === 1 ? "" : "es"}`
              : "Sin proveedores"}
          </h2>
          <p>{providers.map((provider) => provider.name).join(" · ") || "—"}</p>
        </article>
      </section>
    </AppShell>
  );
}
