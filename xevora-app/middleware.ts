import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
        },
      },
    },
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const path = request.nextUrl.pathname;

  if (path === "/login") {
    return NextResponse.redirect(new URL("/auth/login", request.url));
  }

  const isAuthPage = path.startsWith("/auth/login") || path.startsWith("/auth/signup");

  if (user && isAuthPage) {
    const { data: worker } = await supabase
      .from("workers")
      .select("role")
      .eq("user_id", user.id)
      .maybeSingle();
    const dest = worker?.role === "driver" ? "/driver" : "/dashboard";
    return NextResponse.redirect(new URL(dest, request.url));
  }

  const needsStaff = path.startsWith("/dashboard");
  const needsDriver = path.startsWith("/driver");

  if (!user && (needsStaff || needsDriver)) {
    return NextResponse.redirect(new URL("/auth/login", request.url));
  }

  if (user && (needsStaff || needsDriver)) {
    const { data: worker } = await supabase
      .from("workers")
      .select("role")
      .eq("user_id", user.id)
      .maybeSingle();

    const isDriver = worker?.role === "driver";

    if (needsStaff) {
      if (isDriver) {
        return NextResponse.redirect(new URL("/driver", request.url));
      }
      return response;
    }

    if (needsDriver) {
      if (isDriver) {
        return response;
      }
      return NextResponse.redirect(new URL("/dashboard", request.url));
    }
  }

  return response;
}

export const config = {
  matcher: ["/dashboard/:path*", "/driver", "/driver/:path*", "/auth/login", "/auth/signup", "/login"],
};
