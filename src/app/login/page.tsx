import { LoginForm } from "./login-form";

export const dynamic = "force-dynamic";

export default function LoginPage() {
  return (
    <main className="login-page">
      <section className="card login-card" aria-labelledby="login-title">
        <span className="brand-mark" aria-hidden="true">
          ↗
        </span>
        <p className="eyebrow" style={{ marginTop: 20 }}>
          Espacio privado
        </p>
        <h1 id="login-title">Mis Facturas</h1>
        <p className="lede">
          Consulta tus facturas de electricidad con calma y sin exponer tus
          datos.
        </p>
        <LoginForm />
      </section>
    </main>
  );
}
