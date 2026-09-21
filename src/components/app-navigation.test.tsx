import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

vi.mock("next/navigation", () => ({
  usePathname: () => "/",
}));

import { AppNavigation } from "./app-navigation";

describe("AppNavigation", () => {
  it("uses the application icon in the header brand", () => {
    const html = renderToStaticMarkup(<AppNavigation />);

    expect(html).toContain("brand-logo");
    expect(html).toContain("/icon.svg");
  });
});
