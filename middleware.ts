import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

import { detectLocale, isLocale, LOCALE_COOKIE } from "@/lib/i18n/config";

const LOCALE_COOKIE_OPTIONS = {
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
    sameSite: "lax" as const,
    // Only sent over HTTPS in production.
    secure: process.env.NODE_ENV === "production",
};

/**
 * Sets the locale cookie on a response when the visitor has no cookie yet.
 * First visit: detect from the browser's Accept-Language header
 * (Arabic → ar, otherwise → he).
 */
function ensureLocaleCookie(request: NextRequest, response: NextResponse) {
    if (isLocale(request.cookies.get(LOCALE_COOKIE)?.value)) return;
    const locale = detectLocale(request.headers.get("accept-language"));
    response.cookies.set(LOCALE_COOKIE, locale, LOCALE_COOKIE_OPTIONS);
}

/**
 * 1. Locale detection for first-time visitors (cookie-based, no URL change).
 * 2. Protects admin routes: redirects signed-out visitors to /admin/login.
 *    (The admin_profiles role check itself happens in the admin layout.)
 */
export async function middleware(request: NextRequest) {
    const { pathname } = request.nextUrl;

    const isLoginPage = pathname === "/admin/login";
    const isAdminArea =
        pathname.startsWith("/admin") && !isLoginPage;

    let response = NextResponse.next({ request });

    if (!isAdminArea) {
        ensureLocaleCookie(request, response);
        return response;
    }

    // Fast path: If the visitor has no Supabase auth token cookie,
    // they cannot be authenticated. Redirect immediately without making
    // a remote roundtrip to the Supabase auth API.
    const hasAuthCookie = request.cookies
        .getAll()
        .some((c) => c.name.startsWith("sb-") && c.name.includes("-auth-token"));

    if (!hasAuthCookie) {
        const url = request.nextUrl.clone();
        url.pathname = "/admin/login";
        url.searchParams.set("next", pathname);
        const redirect = NextResponse.redirect(url);
        ensureLocaleCookie(request, redirect);
        return redirect;
    }

    const supabase = createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
            cookies: {
                getAll() {
                    return request.cookies.getAll();
                },
                setAll(
                    cookiesToSet: Array<{
                        name: string;
                        value: string;
                        options?: Parameters<typeof response.cookies.set>[2];
                    }>
                ) {
                    cookiesToSet.forEach(({ name, value }) =>
                        request.cookies.set(name, value)
                    );
                    response = NextResponse.next({ request });
                    cookiesToSet.forEach(({ name, value, options }) =>
                        response.cookies.set(name, value, options)
                    );
                },
            },
        }
    );

    const {
        data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
        const url = request.nextUrl.clone();
        url.pathname = "/admin/login";
        url.searchParams.set("next", pathname);
        const redirect = NextResponse.redirect(url);
        ensureLocaleCookie(request, redirect);
        return redirect;
    }

    ensureLocaleCookie(request, response);
    return response;
}

export const config = {
    matcher: [
        "/((?!api|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|txt|webmanifest)$).*)",
    ],
};
