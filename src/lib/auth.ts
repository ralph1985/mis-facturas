import {
  createHmac,
  randomBytes,
  scrypt as scryptCallback,
  timingSafeEqual,
} from "node:crypto";
import {
  DEFAULT_SESSION_MAX_AGE_SECONDS,
  MAX_SESSION_MAX_AGE_SECONDS,
  MIN_SESSION_MAX_AGE_SECONDS,
  SESSION_COOKIE,
} from "./auth-constants";

const HASH_ALGORITHM = "scrypt";
const HASH_KEY_LENGTH = 64;
const HASH_SALT_BYTES = 16;
const SCRYPT_OPTIONS = {
  N: 16_384,
  r: 8,
  p: 1,
  maxmem: 32 * 1024 * 1024,
} as const;
const scrypt = (code: string, salt: string): Promise<Buffer> =>
  new Promise((resolve, reject) => {
    scryptCallback(
      code,
      salt,
      HASH_KEY_LENGTH,
      SCRYPT_OPTIONS,
      (error, derived) => {
        if (error) {
          reject(error);
        } else {
          resolve(derived as Buffer);
        }
      },
    );
  });
const SESSION_TOKEN_PREFIX = "mis-facturas";
const SESSION_CLOCK_SKEW_MS = 60_000;
const MAX_ACCESS_CODE_LENGTH = 1_024;
const LOGIN_WINDOW_MS = 15 * 60 * 1_000;
const LOGIN_BLOCK_MS = 15 * 60 * 1_000;
export const MAX_LOGIN_FAILURES = 5;

function requireSessionSecret(
  secret = process.env.MIS_FACTURAS_SESSION_SECRET,
): string {
  if (!secret) {
    throw new Error("MIS_FACTURAS_SESSION_SECRET is not configured.");
  }

  return secret;
}

function isDate(value: Date): boolean {
  return !Number.isNaN(value.getTime());
}

export async function createAccessCodeHash(code: string): Promise<string> {
  if (
    typeof code !== "string" ||
    code.length === 0 ||
    code.length > MAX_ACCESS_CODE_LENGTH
  ) {
    throw new Error("Access code must be between 1 and 1024 characters.");
  }

  const salt = randomBytes(HASH_SALT_BYTES).toString("base64url");
  const derived = await scrypt(code, salt);
  return `${HASH_ALGORITHM}:${salt}:${derived.toString("base64url")}`;
}

function parseAccessCodeHash(
  storedHash: string,
): { salt: string; expected: Buffer } | null {
  const [algorithm, salt, encodedExpected, ...extra] = storedHash.split(":");
  if (
    algorithm !== HASH_ALGORITHM ||
    !salt ||
    !encodedExpected ||
    extra.length > 0
  ) {
    return null;
  }

  const expected = Buffer.from(encodedExpected, "base64url");
  if (expected.length !== HASH_KEY_LENGTH) {
    return null;
  }

  return { salt, expected };
}

type AccessCodeValidator = ((
  code: string,
  storedHash?: string,
) => Promise<boolean>) & {
  createHash: typeof createAccessCodeHash;
};

const isValidAccessCodeImplementation = async (
  code: string,
  storedHash = process.env.MIS_FACTURAS_ACCESS_CODE_HASH,
): Promise<boolean> => {
  if (
    typeof code !== "string" ||
    code.length === 0 ||
    code.length > MAX_ACCESS_CODE_LENGTH ||
    !storedHash
  ) {
    return false;
  }

  const parsed = parseAccessCodeHash(storedHash);
  if (!parsed) {
    return false;
  }

  try {
    const derived = await scrypt(code, parsed.salt);
    return (
      derived.length === parsed.expected.length &&
      timingSafeEqual(derived, parsed.expected)
    );
  } catch {
    return false;
  }
};

export const isValidAccessCode = Object.assign(
  isValidAccessCodeImplementation,
  {
    createHash: createAccessCodeHash,
  },
) as AccessCodeValidator;

export const verifyAccessCode = isValidAccessCode;

export function getSessionMaxAgeSeconds(): number {
  const configured = process.env.MIS_FACTURAS_SESSION_MAX_AGE_SECONDS;
  if (!configured) {
    return DEFAULT_SESSION_MAX_AGE_SECONDS;
  }

  const seconds = Number(configured);
  if (
    !Number.isSafeInteger(seconds) ||
    seconds < MIN_SESSION_MAX_AGE_SECONDS ||
    seconds > MAX_SESSION_MAX_AGE_SECONDS
  ) {
    throw new Error(
      `MIS_FACTURAS_SESSION_MAX_AGE_SECONDS must be an integer between ${MIN_SESSION_MAX_AGE_SECONDS} and ${MAX_SESSION_MAX_AGE_SECONDS}.`,
    );
  }

  return seconds;
}

export interface SessionClaims {
  issuedAt: Date;
  expiresAt: Date;
}

function sessionPayload(issuedAtMs: number, expiresAtMs: number): string {
  return `${SESSION_TOKEN_PREFIX}:${issuedAtMs}:${expiresAtMs}`;
}

function signSessionPayload(payload: string, secret: string): string {
  return createHmac("sha256", secret).update(payload).digest("base64url");
}

export function createSessionToken(
  issuedAt = new Date(),
  secret = requireSessionSecret(),
  maxAgeSeconds = getSessionMaxAgeSeconds(),
): string {
  if (
    !isDate(issuedAt) ||
    !Number.isSafeInteger(maxAgeSeconds) ||
    maxAgeSeconds <= 0
  ) {
    throw new Error("Invalid session token parameters.");
  }

  const issuedAtMs = issuedAt.getTime();
  const expiresAtMs = issuedAtMs + maxAgeSeconds * 1_000;
  if (!Number.isSafeInteger(expiresAtMs)) {
    throw new Error("Session expiry is outside the supported date range.");
  }

  const payload = sessionPayload(issuedAtMs, expiresAtMs);
  return `${payload}:${signSessionPayload(payload, secret)}`;
}

export function readSessionToken(
  token: string | undefined,
  secret = requireSessionSecret(),
  now = new Date(),
): SessionClaims | null {
  if (!token || !isDate(now)) {
    return null;
  }

  const [prefix, issuedAtRaw, expiresAtRaw, signature, ...extra] =
    token.split(":");
  if (
    prefix !== SESSION_TOKEN_PREFIX ||
    !issuedAtRaw ||
    !expiresAtRaw ||
    !signature ||
    extra.length > 0
  ) {
    return null;
  }

  const issuedAtMs = Number(issuedAtRaw);
  const expiresAtMs = Number(expiresAtRaw);
  const nowMs = now.getTime();
  if (
    !Number.isSafeInteger(issuedAtMs) ||
    !Number.isSafeInteger(expiresAtMs) ||
    issuedAtMs > nowMs + SESSION_CLOCK_SKEW_MS ||
    expiresAtMs <= nowMs ||
    expiresAtMs <= issuedAtMs
  ) {
    return null;
  }

  const actualSignature = Buffer.from(signature, "base64url");
  const expectedSignature = Buffer.from(
    signSessionPayload(sessionPayload(issuedAtMs, expiresAtMs), secret),
    "base64url",
  );
  if (
    actualSignature.length !== expectedSignature.length ||
    !timingSafeEqual(actualSignature, expectedSignature)
  ) {
    return null;
  }

  return { issuedAt: new Date(issuedAtMs), expiresAt: new Date(expiresAtMs) };
}

export function verifySessionToken(
  token: string | undefined,
  secret = requireSessionSecret(),
  now = new Date(),
): boolean {
  return readSessionToken(token, secret, now) !== null;
}

export function createSession(
  secret = requireSessionSecret(),
  now = new Date(),
) {
  const issuedAt = new Date(now.getTime());
  const expiresAt = new Date(
    issuedAt.getTime() + getSessionMaxAgeSeconds() * 1_000,
  );
  return { value: createSessionToken(issuedAt, secret), issuedAt, expiresAt };
}

export function sessionCookieOptions(expiresAt: Date) {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    path: "/",
    expires: expiresAt,
    maxAge: Math.max(0, Math.floor((expiresAt.getTime() - Date.now()) / 1_000)),
  };
}

export { SESSION_COOKIE };

export interface SessionRevocationStore {
  getRevokedBefore(): Promise<Date | null>;
  setRevokedBefore(value: Date): Promise<void>;
}

let sessionRevocationStore: SessionRevocationStore | null = null;
let sessionRevocationStoreConfigured = false;

async function resolveSessionRevocationStore(): Promise<SessionRevocationStore | null> {
  if (sessionRevocationStoreConfigured) return sessionRevocationStore;
  try {
    const { getDb } = await import("./db");
    sessionRevocationStore = createPrismaSessionRevocationStore(
      getDb() as unknown as PrismaSessionControlClient,
    );
  } catch {
    // Unit tests and local login setup can use the fail-closed no-store mode.
  }
  return sessionRevocationStore;
}

export function configureSessionRevocationStore(
  store: SessionRevocationStore | null,
): void {
  sessionRevocationStore = store;
  sessionRevocationStoreConfigured = true;
}

export async function isSessionRevoked(
  token: string | undefined,
  store = sessionRevocationStore,
): Promise<boolean> {
  const claims = readSessionToken(token);
  if (!claims) {
    return true;
  }

  const activeStore = store ?? (await resolveSessionRevocationStore());
  const revokedBefore = await activeStore?.getRevokedBefore();
  return revokedBefore
    ? claims.issuedAt.getTime() <= revokedBefore.getTime()
    : false;
}

export async function revokeAllSessions(
  store = sessionRevocationStore,
): Promise<void> {
  const activeStore = store ?? (await resolveSessionRevocationStore());
  if (activeStore) {
    await activeStore.setRevokedBefore(new Date());
  }
}

export type PrismaSessionControlClient = {
  sessionControl: {
    findUnique(args: {
      where: { id: number };
      select: { revokedBefore: true };
    }): Promise<{ revokedBefore: Date | null } | null>;
    upsert(args: {
      where: { id: number };
      create: { id: number; revokedBefore: Date };
      update: { revokedBefore: Date };
    }): Promise<unknown>;
  };
};

export function createPrismaSessionRevocationStore(
  client: PrismaSessionControlClient,
): SessionRevocationStore {
  return {
    async getRevokedBefore() {
      const control = await client.sessionControl.findUnique({
        where: { id: 1 },
        select: { revokedBefore: true },
      });
      return control?.revokedBefore ?? null;
    },
    async setRevokedBefore(value) {
      await client.sessionControl.upsert({
        where: { id: 1 },
        create: { id: 1, revokedBefore: value },
        update: { revokedBefore: value },
      });
    },
  };
}

export interface LoginRateLimitSnapshot {
  failedAttempts: number;
  windowStartedAt: Date;
  blockedUntil: Date | null;
}

export function isLoginBlocked(
  snapshot: LoginRateLimitSnapshot | null,
  now = new Date(),
): boolean {
  return Boolean(
    snapshot?.blockedUntil && snapshot.blockedUntil.getTime() > now.getTime(),
  );
}

export function nextLoginRateLimitSnapshot(
  snapshot: LoginRateLimitSnapshot | null,
  now = new Date(),
): LoginRateLimitSnapshot {
  const windowExpired =
    !snapshot ||
    now.getTime() - snapshot.windowStartedAt.getTime() >= LOGIN_WINDOW_MS;
  const failedAttempts = windowExpired ? 1 : snapshot.failedAttempts + 1;
  return {
    failedAttempts,
    windowStartedAt: windowExpired ? now : snapshot.windowStartedAt,
    blockedUntil:
      failedAttempts >= MAX_LOGIN_FAILURES
        ? new Date(now.getTime() + LOGIN_BLOCK_MS)
        : null,
  };
}

export function getLoginRateLimitKey(
  clientKey: string,
  secret = requireSessionSecret(),
): string {
  return createHmac("sha256", secret)
    .update(`mis-facturas:login:${clientKey}`)
    .digest("hex");
}

export interface LoginRateLimitStore {
  find(keyHash: string): Promise<LoginRateLimitSnapshot | null>;
  upsert(keyHash: string, now: Date): Promise<LoginRateLimitSnapshot>;
  update(keyHash: string, next: LoginRateLimitSnapshot): Promise<void>;
  delete(keyHash: string): Promise<void>;
  recordFailure?(keyHash: string, now: Date): Promise<boolean>;
}

class MemoryLoginRateLimitStore implements LoginRateLimitStore {
  private readonly values = new Map<string, LoginRateLimitSnapshot>();

  async find(keyHash: string): Promise<LoginRateLimitSnapshot | null> {
    return this.values.get(keyHash) ?? null;
  }

  async upsert(keyHash: string, now: Date): Promise<LoginRateLimitSnapshot> {
    const existing = this.values.get(keyHash);
    if (existing) return existing;
    const created = {
      failedAttempts: 0,
      windowStartedAt: now,
      blockedUntil: null,
    };
    this.values.set(keyHash, created);
    return created;
  }

  async update(keyHash: string, next: LoginRateLimitSnapshot): Promise<void> {
    this.values.set(keyHash, next);
  }

  async delete(keyHash: string): Promise<void> {
    this.values.delete(keyHash);
  }
}

let loginRateLimitStore: LoginRateLimitStore = new MemoryLoginRateLimitStore();
let loginRateLimitStoreConfigured = false;

async function resolveLoginRateLimitStore(): Promise<LoginRateLimitStore> {
  if (loginRateLimitStoreConfigured) return loginRateLimitStore;
  try {
    const { getDb } = await import("./db");
    loginRateLimitStore = createPrismaLoginRateLimitStore(
      getDb() as unknown as PrismaLoginRateLimitClient,
    );
  } catch {
    // Keep the in-memory fallback for tests and development without a database.
  }
  return loginRateLimitStore;
}

export function configureLoginRateLimitStore(store: LoginRateLimitStore): void {
  loginRateLimitStore = store;
  loginRateLimitStoreConfigured = true;
}

export async function isLoginRateLimited(
  clientKey: string,
  secret = requireSessionSecret(),
  now = new Date(),
): Promise<boolean> {
  const store = await resolveLoginRateLimitStore();
  return isLoginBlocked(
    await store.find(getLoginRateLimitKey(clientKey, secret)),
    now,
  );
}

export async function recordFailedLogin(
  clientKey: string,
  secret = requireSessionSecret(),
  now = new Date(),
): Promise<boolean> {
  const store = await resolveLoginRateLimitStore();
  const keyHash = getLoginRateLimitKey(clientKey, secret);
  if (store.recordFailure) {
    return store.recordFailure(keyHash, now);
  }
  const current = await store.upsert(keyHash, now);
  const next = nextLoginRateLimitSnapshot(current, now);
  await store.update(keyHash, next);
  return isLoginBlocked(next, now);
}

export async function clearLoginAttempts(
  clientKey: string,
  secret = requireSessionSecret(),
): Promise<void> {
  const store = await resolveLoginRateLimitStore();
  await store.delete(getLoginRateLimitKey(clientKey, secret));
}

export type PrismaLoginRateLimitClient = {
  loginRateLimit: {
    findUnique(args: {
      where: { keyHash: string };
      select: {
        failedAttempts: true;
        windowStartedAt: true;
        blockedUntil: true;
      };
    }): Promise<LoginRateLimitSnapshot | null>;
    upsert(args: {
      where: { keyHash: string };
      create: {
        keyHash: string;
        failedAttempts: number;
        windowStartedAt: Date;
      };
      update: Record<string, never>;
      select: {
        failedAttempts: true;
        windowStartedAt: true;
        blockedUntil: true;
      };
    }): Promise<LoginRateLimitSnapshot>;
    update(args: {
      where: { keyHash: string };
      data: LoginRateLimitSnapshot;
    }): Promise<unknown>;
    deleteMany(args: { where: { keyHash: string } }): Promise<unknown>;
  };
  $transaction?: <T>(
    callback: (transaction: PrismaLoginRateLimitClient) => Promise<T>,
  ) => Promise<T>;
};

export function createPrismaLoginRateLimitStore(
  client: PrismaLoginRateLimitClient,
): LoginRateLimitStore {
  return {
    async find(keyHash) {
      return client.loginRateLimit.findUnique({
        where: { keyHash },
        select: {
          failedAttempts: true,
          windowStartedAt: true,
          blockedUntil: true,
        },
      });
    },
    async upsert(keyHash, now) {
      return client.loginRateLimit.upsert({
        where: { keyHash },
        create: { keyHash, failedAttempts: 0, windowStartedAt: now },
        update: {},
        select: {
          failedAttempts: true,
          windowStartedAt: true,
          blockedUntil: true,
        },
      });
    },
    async update(keyHash, data) {
      await client.loginRateLimit.update({ where: { keyHash }, data });
    },
    async delete(keyHash) {
      await client.loginRateLimit.deleteMany({ where: { keyHash } });
    },
    async recordFailure(keyHash, now) {
      const run = async (transaction: PrismaLoginRateLimitClient) => {
        const current = await transaction.loginRateLimit.upsert({
          where: { keyHash },
          create: { keyHash, failedAttempts: 0, windowStartedAt: now },
          update: {},
          select: {
            failedAttempts: true,
            windowStartedAt: true,
            blockedUntil: true,
          },
        });
        const next = nextLoginRateLimitSnapshot(current, now);
        await transaction.loginRateLimit.update({
          where: { keyHash },
          data: next,
        });
        return isLoginBlocked(next, now);
      };

      return client.$transaction ? client.$transaction(run) : run(client);
    },
  };
}
