import { existsSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import manifest from "./manifest";

describe("web app manifest", () => {
  it("exposes an installable standalone manifest", () => {
    const value = manifest();

    expect(value).toMatchObject({
      id: "/",
      name: "Mis Facturas",
      short_name: "Mis Facturas",
      start_url: "/",
      scope: "/",
      display: "standalone",
      background_color: "#f6f8f5",
      theme_color: "#2f7d68",
    });
    expect(value.icons).toEqual([
      {
        src: "/icon.svg",
        sizes: "any",
        type: "image/svg+xml",
        purpose: "any",
      },
    ]);
  });

  it("references a tracked icon asset", () => {
    expect(existsSync(resolve(process.cwd(), "public/icon.svg"))).toBe(true);
  });
});
