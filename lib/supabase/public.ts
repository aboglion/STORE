import { createClient as createSupabaseClient } from "@supabase/supabase-js";

/**
 * Cookies-free Supabase client (anon key).
 *
 * Safe to use in static / prerendered contexts (e.g. the root layout),
 * where `next/headers` cookies() would force the route to be dynamic.
 * RLS allows public reads for settings, products and categories.
 */
export function createPublicClient() {
    const url =
        (process.env.SUPABASE_INTERNAL_URL ||
            process.env.NEXT_PUBLIC_SUPABASE_URL) ?? "";
    const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";

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
