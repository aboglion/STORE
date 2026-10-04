"use client";

import { createBrowserClient } from "@supabase/ssr";

/**
 * Supabase browser client (anon key). For client components.
 * RLS protects all reads/writes.
 */
export function createClient() {
    return createBrowserClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );
}