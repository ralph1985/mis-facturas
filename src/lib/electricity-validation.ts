import { z } from "zod";

const MAX_TEXT_LENGTH = 255;
const MAX_URL_LENGTH = 2_048;

const optionalText = (max = MAX_TEXT_LENGTH) =>
  z.preprocess((value) => {
    if (value === undefined || value === null) return undefined;
    if (typeof value !== "string") return value;
    const trimmed = value.trim();
    return trimmed === "" ? undefined : trimmed;
  }, z.string().max(max).optional());

const requiredText = z.preprocess(
  (value) => (typeof value === "string" ? value.trim() : value),
  z.string().min(1).max(MAX_TEXT_LENGTH),
);

const numeric = (label: string): z.ZodType<number> =>
  z.preprocess(
    (value) => {
      if (typeof value === "string") {
        const trimmed = value.trim();
        return trimmed === "" ? undefined : Number(trimmed.replace(",", "."));
      }
      return value;
    },
    z
      .number({ error: `${label} debe ser un número` })
      .refine(Number.isFinite, `${label} no es válido`),
  ) as z.ZodType<number>;

const optionalNumeric = (label: string): z.ZodType<number | undefined> =>
  z.preprocess(
    (value) => {
      if (
        value === undefined ||
        value === null ||
        (typeof value === "string" && value.trim() === "")
      )
        return undefined;
      if (typeof value === "string")
        return Number(value.trim().replace(",", "."));
      return value;
    },
    z
      .number({ error: `${label} debe ser un número` })
      .refine(Number.isFinite, `${label} no es válido`)
      .optional(),
  ) as z.ZodType<number | undefined>;

const dateValue = z.preprocess(
  (value) => {
    if (value === undefined || value === null) return undefined;
    if (value instanceof Date) return value;
    if (typeof value !== "string") return value;
    const trimmed = value.trim();
    if (!trimmed) return undefined;
    if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed))
      return new Date(`${trimmed}T00:00:00.000Z`);
    return new Date(trimmed);
  },
  z.date().refine((date) => !Number.isNaN(date.getTime()), "Fecha no válida"),
);

const optionalDate = dateValue.optional();

const safeHttpUrl = z.preprocess(
  (value) => {
    if (
      value === undefined ||
      value === null ||
      (typeof value === "string" && value.trim() === "")
    )
      return undefined;
    return typeof value === "string" ? value.trim() : value;
  },
  z
    .string()
    .max(MAX_URL_LENGTH)
    .url()
    .refine((value) => {
      const url = new URL(value);
      return (
        (url.protocol === "http:" || url.protocol === "https:") &&
        !url.username &&
        !url.password
      );
    }, "La URL debe usar HTTP o HTTPS sin credenciales")
    .optional(),
);

export const electricityReadingTypeSchema = z.enum(["REAL", "ESTIMATED"]);
export const electricityBillStatusSchema = z.enum([
  "NORMAL",
  "RECTIFICATIVE",
  "CANCELLED",
]);

export const electricityBillInputSchema = z
  .object({
    totalAmount: numeric("El importe").refine(
      (value) => value >= 0,
      "El importe no puede ser negativo",
    ),
    issueDate: dateValue,
    paymentDate: optionalDate,
    consumptionKwh: numeric("El consumo").refine(
      (value) => value >= 0,
      "El consumo no puede ser negativo",
    ),
    readingType: z.preprocess(
      (value) => (value === "" ? undefined : value),
      electricityReadingTypeSchema.optional(),
    ),
    status: z.preprocess(
      (value) => (value === "" || value === undefined ? "NORMAL" : value),
      electricityBillStatusSchema,
    ),
    id: optionalText(),
    originalBillId: optionalText(),
    homeId: requiredText,
    providerId: requiredText,
    supplyPointId: optionalText(),
    invoiceNumber: optionalText(),
    referenceNumber: optionalText(),
    periodStart: optionalDate,
    periodEnd: optionalDate,
    periodDays: optionalNumeric("Los días del periodo").refine(
      (value) => value === undefined || (Number.isInteger(value) && value > 0),
      "Los días del periodo deben ser un entero positivo",
    ),
    tariff: optionalText(),
    contractNumber: optionalText(),
    pdfUrl: safeHttpUrl,
  })
  .superRefine((value, context) => {
    if (
      value.periodStart &&
      value.periodEnd &&
      value.periodStart.getTime() > value.periodEnd.getTime()
    ) {
      context.addIssue({
        code: "custom",
        path: ["periodEnd"],
        message: "El final del periodo debe ser posterior al inicio",
      });
    }
    if (value.status === "RECTIFICATIVE" && !value.originalBillId) {
      context.addIssue({
        code: "custom",
        path: ["originalBillId"],
        message: "Una rectificativa necesita la factura original",
      });
    }
    if (value.id && value.originalBillId && value.originalBillId === value.id) {
      context.addIssue({
        code: "custom",
        path: ["originalBillId"],
        message: "La factura original no puede ser la misma factura",
      });
    }
  });

export type ElectricityBillInput = z.infer<typeof electricityBillInputSchema>;

export const electricityBillFormSchema = electricityBillInputSchema;
