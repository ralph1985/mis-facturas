import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

vi.mock("./login-form", () => ({
  LoginForm: () => null,
}));

import LoginPage from "./page";

describe("LoginPage", () => {
  it("uses the application icon as the login logo", () => {
    const html = renderToStaticMarkup(<LoginPage />);

    expect(html).toContain("login-logo");
    expect(html).toContain("/icon.svg");
  });
});
