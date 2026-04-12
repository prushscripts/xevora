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

  const isJoinDriver = path.startsWith("/auth/join-driver");
  const isAuthPage = path.startsWith("/auth/login") || path.startsWith("/auth/signup");
  const needsAuth =
    path.startsWith("/dashboard") ||
    path.startsWith("/driver") ||
    path.startsWith("/settings") ||
    path.startsWith("/onboarding");

  if (!user && needsAuth) {
    return NextResponse.redirect(new URL("/auth/login", request.url));
  }

  if (user && isJoinDriver) {
    const { data: worker } = await supabase
      .from("workers")
      .select("role")
      .eq("user_id", user.id)
      .maybeSingle();
    if (worker?.role === "driver") {
      return NextResponse.redirect(new URL("/driver", request.url));
    }
    if (worker) {
      return NextResponse.redirect(new URL("/dashboard", request.url));
    }
    const { data: owned } = await supabase
      .from("companies")
      .select("id")
      .eq("owner_id", user.id)
      .maybeSingle();
    if (owned) {
      return NextResponse.redirect(new URL("/dashboard", request.url));
    }
    return response;
  }

  if (user && isAuthPage) {
    const { data: worker } = await supabase
      .from("workers")
      .select("role")
      .eq("user_id", user.id)
      .maybeSingle();
    const dest = worker?.role === "driver" ? "/driver" : "/dashboard";
    return NextResponse.redirect(new URL(dest, request.url));
  }

  if (!user) {
    return response;
  }

  const [{ data: worker }, { data: ownedCompany }] = await Promise.all([
    supabase
      .from("workers")
      .select("role")
      .eq("user_id", user.id)
      .maybeSingle(),
    supabase
      .from("companies")
      .select("id")
      .eq("owner_id", user.id)
      .maybeSingle(),
  ]);

  const isOwner = !!ownedCompany;
  const isDriver = worker?.role === "driver";
  const isManager = worker?.role === "manager";
  const isAdminRole = worker?.role === "admin";
  const pendingDriver =
    !worker &&
    user.user_metadata &&
    typeof user.user_metadata === "object" &&
    user.user_metadata !== null &&
    (user.user_metadata as Record<string, unknown>).registration_intent === "driver";

  const canAccessSettings =
    isOwner || (isAdminRole && !isManager);

  if (path.startsWith("/settings")) {
    if (!canAccessSettings) {
      return NextResponse.redirect(new URL("/dashboard", request.url));
    }
    return response;
  }

  if (path.startsWith("/dashboard")) {
    if (isDriver) {
      return NextResponse.redirect(new URL("/driver", request.url));
    }
    if (pendingDriver) {
      return NextResponse.redirect(new URL("/auth/join-driver", request.url));
    }
    if (!worker && !isOwner && !path.startsWith("/dashboard/onboarding")) {
      return NextResponse.redirect(new URL("/onboarding", request.url));
    }
    return response;
  }

  if (path.startsWith("/driver")) {
    if (isDriver) {
      return response;
    }
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  return response;
}

export const config = {
  matcher: [
    "/dashboard/:path*",
    "/driver",
    "/driver/:path*",
    "/settings",
    "/settings/:path*",
    "/onboarding/:path*",
    "/auth/login",
    "/auth/signup",
    "/auth/join-driver",
    "/login",
  ],
};
