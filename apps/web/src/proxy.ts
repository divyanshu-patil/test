import { NextResponse, type NextRequest } from "next/server";

const PROTECTED = ["/feed", "/create"];

// Cookie presence is only a routing hint; the (main) layout verifies the session with the API.
export function proxy(request: NextRequest) {
  const { pathname, search } = request.nextUrl;
  const signedIn = request.cookies.has("socially_session");
  if (!signedIn && PROTECTED.some((p) => pathname === p || pathname.startsWith(`${p}/`))) {
    const url = new URL("/login", request.url);
    url.searchParams.set("next", pathname + search);
    return NextResponse.redirect(url);
  }
  if (signedIn && pathname === "/") return NextResponse.redirect(new URL("/feed", request.url));
  return NextResponse.next();
}

export const config = { matcher: ["/", "/feed/:path*", "/create/:path*"] };
