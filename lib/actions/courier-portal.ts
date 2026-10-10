"use server";

import { revalidatePath } from "next/cache";
import { getTranslations } from "next-intl/server";

import { getCourierPoolOrders } from "@/lib/data/couriers";
import { rateLimit } from "@/lib/server/rate-limit";
import { createAdminClient } from "@/lib/supabase/admin";
import {
    courierClaimSchema,
    courierDeclineSchema,
    courierLocationSchema,
    courierUpdateStatusSchema,
} from "@/lib/validations/courier";
import type { CourierPoolOrder } from "@/types/database.types";

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

// ---------------------------------------------------------------------------
// Broadcast dispatch (Uber/Bolt-style)
// ---------------------------------------------------------------------------

export async function courierAcceptOrderAction(input: {
    token: string;
    order_id: string;
}): Promise<CourierPortalResult> {
    const te = await getTranslations("courier.errors");

    const parsed = courierClaimSchema.safeParse(input);
    if (!parsed.success) return { error: te("invalidData") };

    const limited = await rateLimit({
        key: "courier-claim",
        limit: 40,
        windowMs: 60_000,
        identifier: parsed.data.token,
    });
    if (!limited.ok) {
        return { error: te("rateLimited", { seconds: limited.retryAfterSeconds }) };
    }

    const { data, error } = await createAdminClient().rpc("claim_order", {
        p_token: parsed.data.token,
        p_order_id: parsed.data.order_id,
    });

    if (error) {
        const msg = String(error.message ?? "");
        if (msg.includes("INVALID_TOKEN")) return { error: te("invalidLink") };
        if (msg.includes("COURIER_INACTIVE")) return { error: te("inactive") };
        if (msg.includes("ALREADY_CLAIMED")) return { error: te("alreadyTaken") };
        if (msg.includes("NOT_CLAIMABLE"))
            return { error: te("notClaimable") };
        return { error: te("claimFailed") };
    }

    revalidatePath(`/courier/${parsed.data.token}`);
    return { status: (data as boolean) ? "claimed" : undefined };
}

export async function courierDeclineOrderAction(input: {
    token: string;
    order_id: string;
    note?: string | null;
}): Promise<CourierPortalResult> {
    const te = await getTranslations("courier.errors");

    const parsed = courierDeclineSchema.safeParse({
        token: input.token,
        order_id: input.order_id,
        note: input.note ?? null,
    });
    if (!parsed.success) return { error: te("invalidData") };

    const limited = await rateLimit({
        key: "courier-decline",
        limit: 60,
        windowMs: 60_000,
        identifier: parsed.data.token,
    });
    if (!limited.ok) return undefined; // decline is best-effort

    const { data, error } = await createAdminClient().rpc("decline_order", {
        p_token: parsed.data.token,
        p_order_id: parsed.data.order_id,
        p_note: parsed.data.note ?? null,
    });

    if (error) {
        const msg = String(error.message ?? "");
        if (msg.includes("INVALID_TOKEN")) return { error: te("invalidLink") };
        if (msg.includes("CANT_DECLINE_STARTED"))
            return { error: te("cantDeclineStarted") };
        return { error: te("declineFailed") };
    }

    revalidatePath(`/courier/${parsed.data.token}`);
    return { status: (data as boolean) ? "declined" : undefined };
}

export async function refreshCourierPoolAction(input: {
    token: string;
}): Promise<{ pool: CourierPoolOrder[]; error?: string }> {
    const limited = await rateLimit({
        key: "courier-pool",
        limit: 40,
        windowMs: 60_000,
        identifier: input.token,
    });
    if (!limited.ok) return { pool: [] };

    // Token presence is validated inside the data reader.
    const pool = await getCourierPoolOrders(input.token.trim().slice(0, 128));
    if (!pool) return { pool: [], error: "invalid_link" };
    return { pool };
}