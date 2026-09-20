import { describe, expect, it } from "vitest";
import { shouldShowHomeSelector } from "./home-selection";

describe("selector de hogares", () => {
  it("permanece oculto con cero o un hogar", () => {
    expect(shouldShowHomeSelector(0)).toBe(false);
    expect(shouldShowHomeSelector(1)).toBe(false);
  });

  it("se muestra cuando hay más de un hogar", () => {
    expect(shouldShowHomeSelector(2)).toBe(true);
  });
});
