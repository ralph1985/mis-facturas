const madridDateFormatter = new Intl.DateTimeFormat("es-ES", {
  timeZone: "Europe/Madrid",
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
});

const euroFormatter = new Intl.NumberFormat("es-ES", {
  style: "currency",
  currency: "EUR",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

const numberFormatter = new Intl.NumberFormat("es-ES", {
  useGrouping: false,
  minimumFractionDigits: 0,
  maximumFractionDigits: 3,
});

function toDate(value: Date | string): Date {
  return value instanceof Date ? value : new Date(value);
}

export function formatElectricityDate(
  value: Date | string | null | undefined,
): string {
  if (value === null || value === undefined) return "—";
  return madridDateFormatter.format(toDate(value));
}

export const formatDate = formatElectricityDate;

export function formatEUR(value: number | null | undefined): string {
  return value === null || value === undefined || !Number.isFinite(value)
    ? "—"
    : euroFormatter.format(value);
}

export const formatEuro = formatEUR;

export function formatKwh(value: number | null | undefined): string {
  return value === null || value === undefined || !Number.isFinite(value)
    ? "—"
    : `${numberFormatter.format(value)} kWh`;
}

export function formatUnitPrice(value: number | null | undefined): string {
  return value === null || value === undefined || !Number.isFinite(value)
    ? "—"
    : `${numberFormatter.format(value)} €/kWh`;
}

export function formatDailyCost(value: number | null | undefined): string {
  return value === null || value === undefined || !Number.isFinite(value)
    ? "—"
    : `${euroFormatter.format(value)} / día`;
}

/** Show the first and last four CUPS characters, masking the middle. */
export function maskCups(cups: string | null | undefined): string {
  if (!cups) return "—";
  const value = cups.trim();
  if (value.length <= 8) return "•".repeat(Math.max(4, value.length));
  return `${value.slice(0, 4)}${"•".repeat(value.length - 8)}${value.slice(-4)}`;
}

export const formatCups = maskCups;
export const maskCUPS = maskCups;
