import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  const res = NextResponse.redirect(new URL("/signin", req.url));
  res.cookies.set("evalyn_session", "", { maxAge: 0, path: "/" });
  return res;
}
