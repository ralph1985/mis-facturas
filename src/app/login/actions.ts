"use server";

import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import {
  clearLoginAttempts,
  createSession,
  isLoginRateLimited,
  isValidAccessCode,
  recordFailedLogin,
  sessionCookieOptions,
  SESSION_COOKIE,
} from "@/lib/auth";

export type LoginFormState = {
  error?: string;
};

const INVALID_LOGIN_MESSAGE =
  "El código no es válido o el acceso está temporalmente bloqueado.";
const CONFIGURATION_ERROR_MESSAGE =
  "No se pudo iniciar sesión. Inténtalo de nuevo más tarde.";

function getClientKey(requestHeaders: Headers): string {
  // Only trust the platform header. A client-controlled forwarding header must not
  // be used for rate-limit identity when the app is reached directly.
  return (
    requestHeaders.get("x-vercel-forwarded-for")?.trim().slice(0, 128) ||
    "unknown"
  );
}

export async function login(
  _previousState: LoginFormState,
  formData: FormData,
): Promise<LoginFormState> {
  const accessCode = formData.get("accessCode");
  if (typeof accessCode !== "string" || accessCode.length === 0) {
    return { error: INVALID_LOGIN_MESSAGE };
  }

  const clientKey = getClientKey(await headers());
  let blocked: boolean;
  try {
    blocked = await isLoginRateLimited(clientKey);
  } catch {
    return { error: CONFIGURATION_ERROR_MESSAGE };
  }

  if (blocked) {
    return { error: INVALID_LOGIN_MESSAGE };
  }

  const valid = await isValidAccessCode(accessCode);
  if (!valid) {
    try {
      await recordFailedLogin(clientKey);
    } catch {
      return { error: CONFIGURATION_ERROR_MESSAGE };
    }
    return { error: INVALID_LOGIN_MESSAGE };
  }

  let session;
  try {
    session = createSession();
    await clearLoginAttempts(clientKey);
  } catch {
    return { error: CONFIGURATION_ERROR_MESSAGE };
  }

  const cookieStore = await cookies();
  cookieStore.set(
    SESSION_COOKIE,
    session.value,
    sessionCookieOptions(session.expiresAt),
  );
  redirect("/");
}

export const loginAction = login;
