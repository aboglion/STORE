import "server-only";

import { cache } from "react";
import { redirect } from "next/navigation";

import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

export type AdminSession = {
    id: string;
    email: string;
    role: string;
} | null;

/**
 * Returns the signed-in admin's profile (or null) by checking the
 * session and its entry in admin_profiles.
 */
export const getAdmin = cache(async (): Promise<AdminSession> => {
    const supabase = await createClient();
    const {
        data: { user },
    } = await supabase.auth.getUser();

    if (!user) return null;

    const { data } = await createAdminClient()
        .from("admin_profiles")
        .select("id, email, role")
        .eq("id", user.id)
        .maybeSingle();

    if (!data) return null;

    return { id: data.id, email: data.email, role: data.role };
});

/** Redirects to login when the visitor is not an admin. */
export const requireAdmin = cache(async () => {
    const admin = await getAdmin();
    if (!admin) {
        redirect("/admin/login");
    }
    return admin;
});