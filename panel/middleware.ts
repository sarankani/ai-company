import { NextRequest, NextResponse } from "next/server";

// Session check at the edge: every route except sign-in/auth requires a
// session cookie. Deep links survive sign-in via ?return= (Design Brief §7).
// Cryptographic verification happens server-side in each page (lib/auth).
export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  if (
    pathname.startsWith("/signin") ||
    pathname.startsWith("/api/auth") ||
    // /api/crm authenticates in-route (session cookie OR agent bearer token
    // — lib/crm/api-auth.ts), so agents without cookies aren't bounced here.
    pathname.startsWith("/api/crm") ||
    pathname.startsWith("/_next") ||
    pathname === "/favicon.ico"
  )
    return NextResponse.next();
  if (!req.cookies.get("evalyn_session")) {
    const url = req.nextUrl.clone();
    url.pathname = "/signin";
    url.searchParams.set("return", pathname);
    return NextResponse.redirect(url);
  }
  return NextResponse.next();
}

export const config = { matcher: ["/((?!_next/static|_next/image).*)"] };
