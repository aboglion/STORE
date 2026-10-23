import "server-only";

import { unstable_cache } from "next/cache";
import { cache } from "react";

import type { Promotion } from "@/types/database.types";
import { createAdminClient } from "@/lib/supabase/admin";
import { createPublicClient } from "@/lib/supabase/public";
import { cleanupExpiredPromotions } from "@/lib/actions/promotions";
import { STORE_CACHE_TAGS } from "@/lib/data/storefront";

/** Safety-net revalidation window for storefront data (seconds). */
const STORE_CACHE_REVALIDATE = 300;

/** All promotions (admin panel — includes inactive rows). */
export async function getPromotions(): Promise<Promotion[]> {
    // Run cleanup on any expired promotions to restore product prices automatically
    await cleanupExpiredPromotions();

    const admin = createAdminClient();

    const { data, error } = await admin
        .from("promotions")
        .select("*")
        .order("sort_order", { ascending: true })
        .order("created_at", { ascending: false });

    if (error) throw new Error(`getPromotions: ${error.message}`);
    return (data ?? []) as Promotion[];
}

const getActivePromotionsCached = unstable_cache(
    async (): Promise<Promotion[]> => {
        const supabase = createPublicClient();
        const { data, error } = await supabase
            .from("promotions")
            .select("*")
            .eq("is_active", true)
            .order("sort_order", { ascending: true });

        if (error) return [];
        return (data ?? []) as Promotion[];
    },
    ["active-promotions"],
    { revalidate: STORE_CACHE_REVALIDATE, tags: [STORE_CACHE_TAGS.promotions] }
);

/**
 * Active promotions for the storefront (cached, cookies-free).
 * Date-range filtering happens in the shared engine at pricing time.
 */
export const getActivePromotions = cache(async (): Promise<Promotion[]> => {
    return getActivePromotionsCached();
});