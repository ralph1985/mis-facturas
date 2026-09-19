const PRIVATE_ROUTE_PATTERNS = [
  /^\/$/,
  /^\/facturas(?:\/[^/]+)?(?:\/editar)?$/,
  /^\/facturas\/nueva$/,
  /^\/suministros$/,
  /^\/ajustes$/,
] as const;

export function isMisFacturasRoute(pathname: string): boolean {
  const path = pathname.split("?", 1)[0].replace(/\/$/, "") || "/";
  return PRIVATE_ROUTE_PATTERNS.some((pattern) => pattern.test(path));
}
