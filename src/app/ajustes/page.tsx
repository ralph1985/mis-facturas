import Link from "next/link";
import { requireSession } from "@/lib/require-session";
import { AppShell } from "@/components/app-navigation";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  await requireSession();
  return (
    <AppShell>
      <div className="page-heading">
        <div>
          <p className="eyebrow">Preferencias</p>
          <h1>Ajustes</h1>
          <p className="lede">
            Gestiona la sesión de esta aplicación privada. Los datos de
            suministro se mantienen protegidos.
          </p>
        </div>
      </div>
      <section className="settings-grid" aria-label="Ajustes de la aplicación">
        <article className="card settings-card">
          <p className="eyebrow">Sesión</p>
          <h2>Acceso privado</h2>
          <p>
            Tu sesión usa una cookie HttpOnly y se puede cerrar desde cualquier
            dispositivo.
          </p>
          <p>
            <a
              className="button button-primary"
              href="/logout"
              style={{ marginTop: 19 }}
            >
              Cerrar sesión
            </a>
          </p>
        </article>
        <article className="card settings-card">
          <p className="eyebrow">Aplicación</p>
          <h2>Mis Facturas</h2>
          <p>Versión 0.1.0 · Electricidad</p>
          <p style={{ marginTop: 14 }}>
            No hay credenciales ni CUPS editables desde esta pantalla.
          </p>
        </article>
      </section>
      <p style={{ marginTop: 20 }}>
        <Link className="table-link" href="/">
          ← Volver al resumen
        </Link>
      </p>
    </AppShell>
  );
}
