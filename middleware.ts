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

    const supabaseUrl =
        process.env.SUPABASE_INTERNAL_URL ||
        process.env.NEXT_PUBLIC_SUPABASE_URL ||
        "http://127.0.0.1:54321";
    const supabaseKey =
        process.env.SUPABASE_ANON_KEY ||
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
        "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0";

    const supabase = createServerClient(
        supabaseUrl,
        supabaseKey,
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

    // Best-effort session verification. Inside Docker the Edge runtime cannot
    // reach the local Supabase stack — NEXT_PUBLIC_SUPABASE_URL points at the
    // host's 127.0.0.1, which from inside the container is the container
    // itself, so getUser() errors instead of returning a user. Redirecting to
    // login in that case traps a successfully signed-in admin in a redirect
    // loop. Instead, when verification errors out, let the request through:
    // the admin dashboard layout re-checks the session server-side (using the
    // internal URL) and redirects unauthenticated visitors to /admin/login.
    let user: { id: string } | null = null;
    let verificationError: unknown = null;
    try {
        const {
            data: { user: verifiedUser },
            error,
        } = await supabase.auth.getUser();
        user = verifiedUser;
        verificationError = error;
    } catch (e) {
        verificationError = e;
    }

    // Only hard-redirect when we are certain there is no session (clean
    // "no user, no error" result). On a verification error the server-side
    // check in the admin layout is the source of truth.
    if (!user && verificationError === null) {
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
        "/((?!api|storage|_next/static|_next/image|favicon.ico|sw\\.js|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|txt|webmanifest)$).*)",
    ],
};

