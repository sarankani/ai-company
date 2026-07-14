import { NextRequest, NextResponse } from "next/server";
import { verifyLoginToken, makeSession, SESSION_TTL_S } from "@/lib/auth";

export async function GET(req: NextRequest) {
  const token = req.nextUrl.searchParams.get("token") ?? "";
  const login = verifyLoginToken(token);
  if (!login) return NextResponse.redirect(new URL("/signin?err=1", req.url));
  const res = NextResponse.redirect(new URL(login.returnTo, req.url));
  res.cookies.set("evalyn_session", makeSession(login.humanId), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: SESSION_TTL_S,
    path: "/",
  });
  return res;
}
