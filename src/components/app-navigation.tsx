"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";

const links = [
  { href: "/facturas", label: "Facturas" },
  { href: "/suministros", label: "Suministros" },
] as const;

export function AppNavigation() {
  const pathname = usePathname();

  return (
    <header className="app-nav">
      <div className="app-nav-inner">
        <Link href="/" className="brand" aria-label="Mis Facturas, inicio">
          <Image
            src="/icon.svg"
            alt=""
            aria-hidden="true"
            className="brand-logo"
            width={34}
            height={34}
          />
          <span>Mis Facturas</span>
        </Link>
        <nav className="nav-links" aria-label="Navegación principal">
          {links.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={`nav-link${pathname.startsWith(link.href) ? " active" : ""}`}
              aria-current={pathname.startsWith(link.href) ? "page" : undefined}
            >
              {link.label}
            </Link>
          ))}
        </nav>
        <div className="nav-actions">
          <Link href="/ajustes" className="nav-settings">
            Ajustes
          </Link>
          <a href="/logout" className="button button-secondary">
            Salir
          </a>
        </div>
      </div>
    </header>
  );
}

export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="app-shell">
      <AppNavigation />
      <main className="app-content">{children}</main>
    </div>
  );
}
