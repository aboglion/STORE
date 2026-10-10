"use server";

import { revalidatePath } from "next/cache";
import { getTranslations } from "next-intl/server";

import { rateLimit } from "@/lib/server/rate-limit";
import { createAdminClient } from "@/lib/supabase/admin";
import {
    courierLocationSchema,
    courierUpdateStatusSchema,
} from "@/lib/validations/courier";

export type CourierPortalResult = { error?: string; status?: string } | undefined;

// ---------------------------------------------------------------------------
// Courier status changes (driven from the courier portal)
// ---------------------------------------------------------------------------

export async function courierUpdateOrderStatusAction(values: {
    token: string;
    order_id: string;
    to_status: "out_for_delivery" | "delivered" | "preparing";
    note?: string | null;
}): Promise<CourierPortalResult> {
    const te = await getTranslations("courier.errors");

    const parsed = courierUpdateStatusSchema.safeParse({
        token: values.token,
        order_id: values.order_id,
        to_status: values.to_status,
        note: values.note ?? null,
    });
    if (!parsed.success) return { error: te("invalidData") };

    const limited = await rateLimit({
        key: "courier-status",
        limit: 30,
        windowMs: 60_000,
        identifier: parsed.data.token,
    });
    if (!limited.ok) {
        return {
            error: te("rateLimited", {
                seconds: limited.retryAfterSeconds,
            }),
        };
    }

    const { data, error } = await createAdminClient().rpc(
        "courier_update_order_status",
        {
            p_token: parsed.data.token,
            p_order_id: parsed.data.order_id,
            p_to_status: parsed.data.to_status,
            p_note: parsed.data.note ?? null,
        }
    );

    if (error) {
        const msg = String(error.message ?? "");
        if (msg.includes("INVALID_TOKEN")) return { error: te("invalidLink") };
        if (msg.includes("COURIER_INACTIVE")) return { error: te("inactive") };
        if (msg.includes("ORDER_NOT_ASSIGNED"))
            return { error: te("notAssigned") };
        if (msg.includes("NOTE_REQUIRED")) return { error: te("noteRequired") };
        if (msg.includes("INVALID_TRANSITION"))
            return { error: te("invalidTransition") };
        return { error: te("updateFailed") };
    }

    revalidatePath(`/courier/${parsed.data.token}`);
    return { status: (data as string) ?? undefined };
}

// ---------------------------------------------------------------------------
// GPS reporting (throttled client-side, limited server-side)
// ---------------------------------------------------------------------------

export async function reportCourierLocationAction(values: {
    token: string;
    lat: number;
    lng: number;
    accuracy?: number | null;
}): Promise<CourierPortalResult> {
    const parsed = courierLocationSchema.safeParse({
        token: values.token,
        lat: values.lat,
        lng: values.lng,
        accuracy: values.accuracy ?? null,
    });
    if (!parsed.success) return { error: "invalid_data" };

    const limited = await rateLimit({
        key: "courier-location",
        limit: 12,
        windowMs: 60_000,
        identifier: parsed.data.token,
    });
    if (!limited.ok) return undefined; // silent — GPS is best-effort

    const { error } = await createAdminClient()
        .from("couriers")
        .update({
            last_lat: parsed.data.lat,
            last_lng: parsed.data.lng,
            last_location_at: new Date().toISOString(),
        })
        .eq("access_token", parsed.data.token)
        .eq("is_active", true);

    if (error) return { error: "invalid_link" };
    return undefined;
}