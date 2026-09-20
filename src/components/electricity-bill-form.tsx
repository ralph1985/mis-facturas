"use client";

import Link from "next/link";
import { useState, useActionState } from "react";
import type { ElectricityBillInput } from "@/lib/electricity-validation";
import { shouldShowHomeSelector } from "@/lib/home-selection";

export type FormOption = { id: string; name: string };
export type FormCostLine = {
  categoryId?: string;
  categoryName: string;
  amount: number;
};
export type FormBill = Partial<ElectricityBillInput> & {
  id: string;
  costLines: FormCostLine[];
};
export type ActionResult = { error?: string; success?: string };
export type BillAction = (formData: FormData) => Promise<ActionResult>;

type ElectricityBillFormProps = {
  action: BillAction;
  homes: FormOption[];
  providers: FormOption[];
  supplyPoints: Array<FormOption & { homeId: string; cups?: string | null }>;
  categories: FormOption[];
  bill?: FormBill;
};

function dateInput(value: Date | string | null | undefined): string {
  if (!value) return "";
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? "" : date.toISOString().slice(0, 10);
}

export function ElectricityBillForm({
  action,
  homes,
  providers,
  supplyPoints,
  categories,
  bill,
}: ElectricityBillFormProps) {
  const [lines, setLines] = useState<FormCostLine[]>(
    bill?.costLines?.length
      ? bill.costLines
      : [{ categoryName: "", amount: 0 }],
  );
  const [state, formAction, pending] = useActionState(
    async (_previous: ActionResult, formData: FormData) => action(formData),
    {},
  );

  function addLine() {
    setLines((current) => [...current, { categoryName: "", amount: 0 }]);
  }
  function removeLine(index: number) {
    setLines((current) =>
      current.length === 1
        ? current
        : current.filter((_, itemIndex) => itemIndex !== index),
    );
  }

  return (
    <form className="card form-card" action={formAction}>
      {bill?.id ? <input type="hidden" name="id" value={bill.id} /> : null}
      <fieldset className="form-section">
        <legend>Datos principales</legend>
        <div className="form-grid">
          <div className="field">
            <label htmlFor="totalAmount">Importe total (€)</label>
            <input
              id="totalAmount"
              name="totalAmount"
              type="number"
              step="0.01"
              min="0"
              required
              defaultValue={bill?.totalAmount ?? ""}
            />
          </div>
          <div className="field">
            <label htmlFor="consumptionKwh">Consumo (kWh)</label>
            <input
              id="consumptionKwh"
              name="consumptionKwh"
              type="number"
              step="0.001"
              min="0"
              required
              defaultValue={bill?.consumptionKwh ?? ""}
            />
          </div>
          <div className="field">
            <label htmlFor="issueDate">Fecha de emisión</label>
            <input
              id="issueDate"
              name="issueDate"
              type="date"
              required
              defaultValue={dateInput(bill?.issueDate)}
            />
          </div>
          <div className="field">
            <label htmlFor="paymentDate">Fecha de pago</label>
            <input
              id="paymentDate"
              name="paymentDate"
              type="date"
              defaultValue={dateInput(bill?.paymentDate)}
            />
          </div>
          <div className="field">
            <label htmlFor="readingType">Tipo de lectura</label>
            <select
              id="readingType"
              name="readingType"
              defaultValue={bill?.readingType ?? ""}
            >
              <option value="">No indicado</option>
              <option value="REAL">Real</option>
              <option value="ESTIMATED">Estimada</option>
            </select>
          </div>
          <div className="field">
            <label htmlFor="status">Estado</label>
            <select
              id="status"
              name="status"
              defaultValue={bill?.status ?? "NORMAL"}
            >
              <option value="NORMAL">Normal</option>
              <option value="RECTIFICATIVE">Rectificativa</option>
              <option value="CANCELLED">Anulada</option>
            </select>
          </div>
          {shouldShowHomeSelector(homes.length) ? (
            <div className="field">
              <label htmlFor="homeId">Hogar</label>
              <select
                id="homeId"
                name="homeId"
                required
                defaultValue={bill?.homeId ?? ""}
              >
                <option value="">Selecciona un hogar</option>
                {homes.map((option) => (
                  <option key={option.id} value={option.id}>
                    {option.name}
                  </option>
                ))}
              </select>
            </div>
          ) : homes[0] ? (
            <input type="hidden" name="homeId" value={homes[0].id} />
          ) : null}
          <div className="field">
            <label htmlFor="providerId">Proveedor</label>
            <select
              id="providerId"
              name="providerId"
              required
              defaultValue={bill?.providerId ?? ""}
            >
              <option value="">Selecciona un proveedor</option>
              {providers.map((option) => (
                <option key={option.id} value={option.id}>
                  {option.name}
                </option>
              ))}
            </select>
          </div>
          <div className="field">
            <label htmlFor="supplyPointId">Punto de suministro</label>
            <select
              id="supplyPointId"
              name="supplyPointId"
              defaultValue={bill?.supplyPointId ?? ""}
            >
              <option value="">No indicado</option>
              {supplyPoints.map((option) => (
                <option key={option.id} value={option.id}>
                  {option.name}
                </option>
              ))}
            </select>
          </div>
        </div>
      </fieldset>
      <fieldset className="form-section">
        <legend>Referencias y periodo</legend>
        <div className="form-grid">
          <div className="field">
            <label htmlFor="invoiceNumber">Número de factura</label>
            <input
              id="invoiceNumber"
              name="invoiceNumber"
              maxLength={255}
              defaultValue={bill?.invoiceNumber ?? ""}
            />
          </div>
          <div className="field">
            <label htmlFor="referenceNumber">Referencia</label>
            <input
              id="referenceNumber"
              name="referenceNumber"
              maxLength={255}
              defaultValue={bill?.referenceNumber ?? ""}
            />
          </div>
          <div className="field">
            <label htmlFor="originalBillId">
              Factura original (rectificativa)
            </label>
            <input
              id="originalBillId"
              name="originalBillId"
              maxLength={255}
              defaultValue={bill?.originalBillId ?? ""}
            />
          </div>
          <div className="field">
            <label htmlFor="periodStart">Inicio del periodo</label>
            <input
              id="periodStart"
              name="periodStart"
              type="date"
              defaultValue={dateInput(bill?.periodStart)}
            />
          </div>
          <div className="field">
            <label htmlFor="periodEnd">Fin del periodo</label>
            <input
              id="periodEnd"
              name="periodEnd"
              type="date"
              defaultValue={dateInput(bill?.periodEnd)}
            />
          </div>
          <div className="field">
            <label htmlFor="periodDays">Días del periodo</label>
            <input
              id="periodDays"
              name="periodDays"
              type="number"
              min="1"
              step="1"
              defaultValue={bill?.periodDays ?? ""}
            />
          </div>
          <div className="field">
            <label htmlFor="tariff">Tarifa</label>
            <input
              id="tariff"
              name="tariff"
              maxLength={255}
              defaultValue={bill?.tariff ?? ""}
            />
          </div>
          <div className="field">
            <label htmlFor="contractNumber">Número de contrato</label>
            <input
              id="contractNumber"
              name="contractNumber"
              maxLength={255}
              defaultValue={bill?.contractNumber ?? ""}
            />
          </div>
          <div className="field span-full">
            <label htmlFor="pdfUrl">Enlace al PDF (opcional)</label>
            <input
              id="pdfUrl"
              name="pdfUrl"
              type="url"
              maxLength={2048}
              placeholder="https://…"
              defaultValue={bill?.pdfUrl ?? ""}
            />
            <small className="muted">
              Solo se guardan enlaces HTTP o HTTPS. No se suben archivos.
            </small>
          </div>
        </div>
      </fieldset>
      <fieldset className="form-section">
        <legend>Desglose de costes</legend>
        {lines.map((line, index) => (
          <div
            className="cost-line"
            key={`${line.categoryId ?? "new"}-${index}`}
          >
            <div className="field">
              <label htmlFor={`category-${index}`}>Categoría {index + 1}</label>
              <select
                id={`category-${index}`}
                name="categoryId"
                defaultValue={line.categoryId ?? ""}
              >
                <option value="">Nueva categoría</option>
                {categories.map((category) => (
                  <option key={category.id} value={category.id}>
                    {category.name}
                  </option>
                ))}
              </select>
              <input
                type="hidden"
                name="categoryName"
                value={line.categoryId ? "" : line.categoryName}
              />
            </div>
            <div className="field">
              <label htmlFor={`category-name-${index}`}>
                Nombre si es nueva
              </label>
              <input
                id={`category-name-${index}`}
                name="categoryNameInput"
                maxLength={255}
                defaultValue={line.categoryId ? "" : line.categoryName}
                placeholder="p. ej. Ajuste"
              />
            </div>
            <div className="field">
              <label htmlFor={`amount-${index}`}>Importe (€)</label>
              <input
                id={`amount-${index}`}
                name="costAmount"
                type="number"
                min="0"
                step="0.01"
                defaultValue={line.amount}
              />
            </div>
            <button
              className="button button-quiet"
              type="button"
              onClick={() => removeLine(index)}
              aria-label={`Eliminar línea ${index + 1}`}
            >
              Quitar
            </button>
          </div>
        ))}
        <button
          className="button button-secondary"
          type="button"
          onClick={addLine}
        >
          + Añadir línea
        </button>
      </fieldset>
      {state.error ? (
        <p className="action-error" role="alert">
          {state.error}
        </p>
      ) : null}
      <div className="form-footer">
        <p className="muted">Los cambios se validan antes de guardarse.</p>
        <div className="form-actions">
          <Link
            className="button button-secondary"
            href={bill?.id ? `/facturas/${bill.id}` : "/facturas"}
          >
            Cancelar
          </Link>
          <button
            className="button button-primary"
            type="submit"
            disabled={pending}
          >
            {pending
              ? "Guardando…"
              : bill?.id
                ? "Guardar cambios"
                : "Guardar factura"}
          </button>
        </div>
      </div>
    </form>
  );
}
