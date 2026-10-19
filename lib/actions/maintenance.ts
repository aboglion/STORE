"use server";

import { revalidatePath, revalidateTag } from "next/cache";

import { requireAdmin } from "@/lib/auth";
import { STORE_CACHE_TAGS } from "@/lib/data/storefront";
import {
    getMaintenanceStatus,
    setMaintenanceMode,
    type MaintenanceStatus,
} from "@/lib/server/backups";
import { createAdminClient } from "@/lib/supabase/admin";

export interface SetMaintenanceInput {
    active: boolean;
    reason?: string;
    message?: string;
    expectedDuration?: string;
}

export interface SetMaintenanceResult {
    ok: boolean;
    error?: string;
    status?: MaintenanceStatus;
}

/**
 * Toggles or updates store maintenance mode.
 * Accessible only by authenticated store administrators.
 */
export async function setStoreMaintenance(
    input: SetMaintenanceInput
): Promise<SetMaintenanceResult> {
    const admin = await requireAdmin();

    const ok = setMaintenanceMode(input.active, input.reason || "manual", {
        message: input.message?.trim() || undefined,
        expectedDuration: input.expectedDuration?.trim() || undefined,
    });

    if (!ok) {
        return { ok: false, error: "שמירת מצב התחזוקה נכשלה" };
    }

    // Best-effort persistence in Supabase settings
    try {
        const supabase = createAdminClient();
        await supabase.from("settings").upsert(
            {
                key: "maintenance_mode",
                value: {
                    active: input.active,
                    reason: input.reason || "manual",
                    message: input.message?.trim() || "",
                    expected_duration: input.expectedDuration?.trim() || "",
                    updated_at: new Date().toISOString(),
                    updated_by: admin.email,
                },
            },
            { onConflict: "key" }
        );
    } catch {
        /* non-fatal */
    }

    // Invalidate caches so storefront and admin update immediately
    revalidateTag(STORE_CACHE_TAGS.settings);
    revalidatePath("/", "layout");
    revalidatePath("/admin/dashboard");
    revalidatePath("/admin/settings");
    revalidatePath("/admin", "layout");

    return {
        ok: true,
        status: getMaintenanceStatus(),
    };
}

/** Reads current maintenance status on demand from server action. */
export async function fetchMaintenanceStatus(): Promise<MaintenanceStatus> {
    return getMaintenanceStatus();
}
