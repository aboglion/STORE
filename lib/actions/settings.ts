"use server";

import { randomUUID } from "crypto";

import { revalidatePath } from "next/cache";
import { getTranslations } from "next-intl/server";

import { z } from "zod";

import { requireAdmin } from "@/lib/auth";
import { PRODUCT_IMAGES_BUCKET } from "@/lib/constants";
import { createAdminClient } from "@/lib/supabase/admin";
import { shekelInputToAgorot } from "@/lib/utils/currency";
import { settingsFormSchema } from "@/lib/validations/settings";

export type SettingsActionResult = { error?: string } | undefined;

export async function updateSettings(
    values: z.infer<ReturnType<typeof settingsFormSchema>>
): Promise<SettingsActionResult> {
    await requireAdmin();

    const t = await getTranslations("validation");
    const te = await getTranslations("admin.errors");

    const parsed = settingsFormSchema(t).safeParse(values);
    if (!parsed.success) return { error: te("invalidData") };

    const deliveryFee = shekelInputToAgorot(parsed.data.delivery_fee_shekels);
    const freeThreshold = shekelInputToAgorot(
        parsed.data.free_delivery_threshold_shekels
    );

    if (deliveryFee === null || freeThreshold === null) {
        return { error: te("invalidMoney") };
    }

    const admin = createAdminClient();
    const rows: Array<{ key: string; value: Record<string, unknown> }> = [
        { key: "store_name", value: { value: parsed.data.store_name } },
        {
            key: "store_name_ar",
            value: { value: parsed.data.store_name_ar || "" },
        },
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
        { key: "logo_url", value: { value: parsed.data.logo_url } },
        { key: "theme", value: { value: parsed.data.theme } },
    ];

    for (const row of rows) {
        const { error } = await admin
            .from("settings")
            .upsert(row, { onConflict: "key" });
        if (error) return { error: te("saveSettingsFailed") };
    }

    revalidatePath("/admin/settings");
    revalidatePath("/", "layout");
    return undefined;
}

// ---------------------------------------------------------------------------
// Store logo
// ---------------------------------------------------------------------------

export type LogoActionResult = { path?: string; error?: string } | undefined;

/** Uploads the store logo to storage and immediately stores its path in settings. */
export async function uploadStoreLogo(
    file: File
): Promise<LogoActionResult> {
    await requireAdmin();

    const te = await getTranslations("admin.errors");

    if (file.size > 10 * 1024 * 1024) {
        return { error: te("fileTooLarge") };
    }

    const admin = createAdminClient();
    const ext = (file.name.split(".").pop() ?? "png").toLowerCase();
    const storagePath = `logos/${randomUUID()}.${ext}`;

    const { error: uploadError } = await admin.storage
        .from(PRODUCT_IMAGES_BUCKET)
        .upload(storagePath, Buffer.from(await file.arrayBuffer()), {
            contentType: file.type || "image/png",
            upsert: false,
        });

    if (uploadError) return { error: te("uploadLogoFailed") };

    const { error: saveError } = await admin
        .from("settings")
        .upsert(
            { key: "logo_url", value: { value: storagePath } },
            { onConflict: "key" }
        );

    if (saveError) {
        await admin.storage.from(PRODUCT_IMAGES_BUCKET).remove([storagePath]);
        return { error: te("saveSettingsFailed") };
    }

    revalidatePath("/", "layout");
    return { path: storagePath };
}

/** Removes the uploaded logo file from storage and clears the setting. */
export async function removeStoreLogo(): Promise<LogoActionResult> {
    await requireAdmin();

    const te = await getTranslations("admin.errors");
    const admin = createAdminClient();
    const { data } = await admin
        .from("settings")
        .select("value")
        .eq("key", "logo_url")
        .maybeSingle();

    const storagePath = (
        (data?.value as { value?: unknown } | null)?.value as
        | string
        | undefined
    )?.trim();

    if (storagePath) {
        await admin.storage.from(PRODUCT_IMAGES_BUCKET).remove([storagePath]);
    }

    const { error } = await admin
        .from("settings")
        .upsert(
            { key: "logo_url", value: { value: "" } },
            { onConflict: "key" }
        );

    if (error) return { error: te("deleteLogoFailed") };

    revalidatePath("/", "layout");
    return undefined;
}
