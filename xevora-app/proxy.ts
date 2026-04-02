import { type NextRequest, NextResponse } from "next/server";

export function proxy(request: NextRequest) {
  // Keep middleware as a safe pass-through on Vercel Edge.
  // Auth gating is enforced in server layouts/pages.
  return NextResponse.next({ request });
}

export const config = {
  matcher: ["/dashboard/:path*", "/auth/:path*"],
};
