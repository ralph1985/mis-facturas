export function maskSupplyPointCups(cups: string | null | undefined): string {
  if (!cups?.trim()) return "—";
  const value = cups.trim();
  if (value.length <= 8) return "•".repeat(Math.max(4, value.length));
  return `${value.slice(0, 4)}${"•".repeat(value.length - 8)}${value.slice(-4)}`;
}

export function formatSupplyPointValue(
  value: string | null | undefined,
): string {
  return value?.trim() || "—";
}

export function formatContractedPower(value: unknown): string {
  if (value === null || value === undefined) return "—";
  const parsed = typeof value === "number" ? value : Number(String(value));
  return Number.isFinite(parsed)
    ? `${parsed.toLocaleString("es-ES", { maximumFractionDigits: 3 })} kW`
    : "—";
}
