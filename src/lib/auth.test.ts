import { afterEach, describe, expect, it, vi } from "vitest";
import {
  createAccessCodeHash,
  createSessionToken,
  getLoginRateLimitKey,
  isLoginBlocked,
  isValidAccessCode,
  verifySessionToken,
} from "./auth";

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("autenticación de Mis Facturas", () => {
  it("acepta el código cuyo hash coincide y rechaza otro", async () => {
    const hash = await createAccessCodeHash("1234");

    await expect(isValidAccessCode("1234", hash)).resolves.toBe(true);
    await expect(isValidAccessCode("9999", hash)).resolves.toBe(false);
    expect(hash).toMatch(/^scrypt:[A-Za-z0-9_-]+:[A-Za-z0-9_-]+$/);
  });

  it("expone el generador de hash como ayuda del verificador", async () => {
    const hash = await isValidAccessCode.createHash("1234");

    await expect(isValidAccessCode("1234", hash)).resolves.toBe(true);
  });

  it("firma y verifica una sesión y rechaza una firma alterada", () => {
    const issuedAt = new Date("2026-09-19T20:50:00.000Z");
    const token = createSessionToken(issuedAt, "secret-for-tests");

    expect(verifySessionToken(token, "secret-for-tests", issuedAt)).toBe(true);
    expect(verifySessionToken(`${token}x`, "secret-for-tests", issuedAt)).toBe(
      false,
    );
  });

  it("rechaza una sesión expirada", () => {
    const issuedAt = new Date("2026-09-19T10:00:00.000Z");
    const token = createSessionToken(issuedAt, "secret-for-tests", 60);

    expect(
      verifySessionToken(
        token,
        "secret-for-tests",
        new Date("2026-09-19T10:02:00.000Z"),
      ),
    ).toBe(false);
  });

  it("deriva una clave de rate limit que no contiene la IP", () => {
    const key = getLoginRateLimitKey("203.0.113.10", "secret-for-tests");

    expect(key).toMatch(/^[a-f0-9]{64}$/);
    expect(key).not.toContain("203.0.113.10");
  });

  it("bloquea únicamente un snapshot aún vigente", () => {
    const now = new Date("2026-09-19T20:50:00.000Z");

    expect(
      isLoginBlocked(
        {
          failedAttempts: 5,
          windowStartedAt: now,
          blockedUntil: new Date("2026-09-19T21:05:00.000Z"),
        },
        now,
      ),
    ).toBe(true);
    expect(
      isLoginBlocked(
        {
          failedAttempts: 5,
          windowStartedAt: now,
          blockedUntil: new Date("2026-09-19T20:49:59.000Z"),
        },
        now,
      ),
    ).toBe(false);
  });
});
