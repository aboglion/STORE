import { createClient as createSupabaseClient } from "@supabase/supabase-js";

const LOCAL_SUPABASE_URL = "http://127.0.0.1:54321";
const LOCAL_SUPABASE_ANON_KEY =
    "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0";

/**
 * Cookies-free Supabase client (anon key).
 *
 * Safe to use in static / prerendered contexts (e.g. the root layout),
 * where `next/headers` cookies() would force the route to be dynamic.
 * RLS allows public reads for settings, products and categories.
 */
export function createPublicClient() {
    const url =
        process.env.SUPABASE_INTERNAL_URL ||
        process.env.NEXT_PUBLIC_SUPABASE_URL ||
        LOCAL_SUPABASE_URL;

    const runtimeEnv = process.env as Record<string, string | undefined>;
    const key =
        runtimeEnv.SUPABASE_ANON_KEY ||
        runtimeEnv.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
        LOCAL_SUPABASE_ANON_KEY;

    return createSupabaseClient(
        url,
        key,
        {
            auth: {
                persistSession: false,
                autoRefreshToken: false,
                detectSessionInUrl: false,
            },
        }
    );
}
