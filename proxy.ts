import { NextResponse, type NextRequest } from "next/server";

export function proxy(request: NextRequest) {
  const headers = new Headers(request.headers);
  // Overwrite incoming values so return paths always come from the actual URL.
  headers.set("x-noteworthy-path", request.nextUrl.pathname + request.nextUrl.search);
  return NextResponse.next({ request: { headers } });
}

export const config = {
  matcher: ["/notes/:path*", "/canvas/:path*", "/kanban/:path*", "/admin/:path*"],
};
