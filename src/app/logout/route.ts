import { NextResponse } from "next/server";
import { SESSION_COOKIE } from "@/lib/auth";

function redirectToLogin(request: Request): NextResponse {
  const response = NextResponse.redirect(new URL("/login", request.url), 303);
  response.cookies.set(SESSION_COOKIE, "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    expires: new Date(0),
    maxAge: 0,
  });
  return response;
}

export function GET(request: Request): NextResponse {
  return redirectToLogin(request);
}

export function POST(request: Request): NextResponse {
  return redirectToLogin(request);
}
