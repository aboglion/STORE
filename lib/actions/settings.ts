"use server";

import { revalidatePath } from "next/cache";

import { z } from "zod";

import { requireAdmin } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { shekelInputToAgorot } from "@/lib/utils/currency";
import { settingsFormSchema } from "@/lib/validations/settings";

export type SettingsActionResult = { error?: string } | undefined;

export async function updateSettings(
    values: z.infer<typeof settingsFormSchema>
): Promise<SettingsActionResult> {
    await requireAdmin();

    const parsed = settingsFormSchema.safeParse(values);
    if (!parsed.success) return { error: "הנתונים שנשלחו לא תקינים" };

    const deliveryFee = shekelInputToAgorot(parsed.data.delivery_fee_shekels);
    const freeThreshold = shekelInputToAgorot(
        parsed.data.free_delivery_threshold_shekels
    );

    if (deliveryFee === null || freeThreshold === null) {
        return { error: "ערך כספי לא תקין" };
    }

    const admin = createAdminClient();
    const rows = [
        { key: "store_name", value: { value: parsed.data.store_name } },
        { key: "delivery_fee_agorot", value: { value: deliveryFee } },
        {
            key: "free_delivery_threshold_agorot",
            value: { value: freeThreshold },
        },
        {
            key: "low_stock_threshold_default",
            value: { value: parsed.data.low_stock_threshold_default },
        },
        { key: "contact_phone", value: { value: parsed.data.contact_phone } },
    ];

    for (const row of rows) {
        const { error } = await admin
            .from("settings")
            .upsert(row, { onConflict: "key" });
        if (error) return { error: "שמירת ההגדרות נכשלה" };
    }

    revalidatePath("/admin/settings");
    revalidatePath("/");
    return undefined;
}