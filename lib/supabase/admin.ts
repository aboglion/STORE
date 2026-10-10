import "server-only";

import { createClient as createSupabaseClient } from "@supabase/supabase-js";

/**
 * Service-role Supabase client. SERVER ONLY.
 *
 * Bypasses RLS — never import this from a client component and never
 * expose SUPABASE_SERVICE_ROLE_KEY to the browser.
 * Used by server actions for checkout, admin mutations and RPC calls.
 */
export function createAdminClient() {
    const url =
        process.env.SUPABASE_INTERNAL_URL ||
        process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY!;

    if (!url || !key) {
        throw new Error(
            "Missing Supabase env vars. Check NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY."
        );
    }

    return createSupabaseClient(url, key, {
        auth: {
            persistSession: false,
            autoRefreshToken: false,
        },
    });
}