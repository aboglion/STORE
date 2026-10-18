import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

const LOCAL_SUPABASE_URL = "http://127.0.0.1:54321";
const LOCAL_SUPABASE_ANON_KEY =
    "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0";

/**
 * Supabase server client (anon key + request cookies).
 * Use in Server Components / Server Actions to read the session
 * of the currently signed-in admin.
 */
export async function createClient() {
    const cookieStore = await cookies();

    const supabaseUrl =
        process.env.SUPABASE_INTERNAL_URL ||
        process.env.NEXT_PUBLIC_SUPABASE_URL ||
        LOCAL_SUPABASE_URL;

    const runtimeEnv = process.env as Record<string, string | undefined>;
    const supabaseKey =
        runtimeEnv.SUPABASE_ANON_KEY ||
        runtimeEnv.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
        LOCAL_SUPABASE_ANON_KEY;

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