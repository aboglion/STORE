import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

/**
 * Supabase server client (anon key + request cookies).
 * Use in Server Components / Server Actions to read the session
 * of the currently signed-in admin.
 */
export async function createClient() {
    const cookieStore = await cookies();

    const supabaseUrl =
        process.env.SUPABASE_INTERNAL_URL ||
        process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

    return createServerClient(
        supabaseUrl,
        supabaseKey,
        {
            cookies: {
                getAll() {
                    return cookieStore.getAll();
                },
                setAll(
                    cookiesToSet: Array<{
                        name: string;
                        value: string;
                        options?: Parameters<typeof cookieStore.set>[2];
                    }>
                ) {
                    try {
                        cookiesToSet.forEach(({ name, value, options }) =>
                            cookieStore.set(name, value, options)
                        );
                    } catch {
                        // Called from a Server Component — safe to ignore when
                        // middleware refreshes sessions instead.
                    }
                },
            },
        }
    );
}