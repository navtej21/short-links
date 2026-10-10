import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

export async function proxy(request: NextRequest) {
  // The response we return. Refreshed auth cookies get attached to it.
  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          // 1) Update the incoming request so server code in this same
          //    request sees the refreshed token.
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          // 2) Rebuild the response and attach cookies so the browser
          //    stores the refreshed token.
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  // Do not put any code between createServerClient and this call.
  // getUser() validates with Supabase and triggers the token refresh.
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { pathname } = request.nextUrl;
  const isDashboard = pathname.startsWith("/dashboard");
  const isLogin = pathname === "/login";


  const token = request.cookies.get("supabase-token")?.value;

  if (!user && isDashboard) {
    return redirectWithCookies(request, response, "/login");
  }
  if (user && isLogin) {
    return redirectWithCookies(request, response, "/dashboard");
  }

  return response;
}

// A redirect is a brand-new response, so it would lose the refreshed
// cookies unless we copy them over.
function redirectWithCookies(
  request: NextRequest,
  from: NextResponse,
  path: string
) {
  const url = request.nextUrl.clone();
  url.pathname = path;
  url.search = "";
  const redirect = NextResponse.redirect(url);
  from.cookies.getAll().forEach((cookie) => redirect.cookies.set(cookie));
  return redirect;
}

// Run only where we need auth. The public /[code] redirect route in
// Phase 3 must NOT pay for a Supabase round trip.
export const config = {
  matcher: ["/dashboard/:path*", "/login"],
};