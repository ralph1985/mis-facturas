import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import {
  isSessionRevoked,
  readSessionToken,
  type SessionClaims,
  SESSION_COOKIE,
} from "./auth";

/**
 * Enforce authentication at the data/action boundary, before private reads or writes.
 * Route guards are only an optimization; callers must use this helper themselves.
 */
export async function requireSession(): Promise<SessionClaims> {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;

  try {
    const claims = readSessionToken(token);
    if (!claims || (await isSessionRevoked(token))) {
      redirect("/login");
    }
    return claims;
  } catch {
    // Missing or malformed configuration must fail closed without exposing details.
    redirect("/login");
  }
}
