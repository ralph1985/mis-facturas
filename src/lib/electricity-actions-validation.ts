import type { ElectricityBillInput } from "@/lib/electricity-validation";

export type ElectricityReference = { id: string };
export type ElectricityHomeReference = ElectricityReference & { name: string };
export type ElectricityReferenceSet = {
  homes: readonly ElectricityHomeReference[];
  providers: readonly ElectricityReference[];
  supplyPoints: readonly (ElectricityReference & { homeId: string })[];
  categories?: readonly ElectricityReference[];
};

export function validateElectricityReferences(
  input: ElectricityBillInput,
  references: ElectricityReferenceSet,
): string | null {
  const home = references.homes.find((item) => item.id === input.homeId);
  if (!home || home.name !== "Meco")
    return "El hogar seleccionado no está disponible.";
  if (!references.providers.some((item) => item.id === input.providerId))
    return "El proveedor seleccionado no está disponible.";
  if (input.supplyPointId) {
    const point = references.supplyPoints.find(
      (item) => item.id === input.supplyPointId,
    );
    if (!point)
      return "El punto de suministro seleccionado no está disponible.";
    if (point.homeId !== input.homeId)
      return "El punto de suministro no pertenece al hogar seleccionado.";
  }
  return null;
}
