"use server";

import { revalidatePath } from "next/cache";
import { getTranslations } from "next-intl/server";

import { getCourierPoolOrders } from "@/lib/data/couriers";
import { rateLimit } from "@/lib/server/rate-limit";
import { createAdminClient } from "@/lib/supabase/admin";
import {
    courierCancelSchema,
    courierClaimSchema,
    courierDeclineSchema,
    courierEtaSchema,
    courierLocationSchema,
    courierPinLocationSchema,
    courierUpdateStatusSchema,
} from "@/lib/validations/courier";
import type { CourierPoolOrder, Json } from "@/types/database.types";

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
// Courier pins the actual delivery location (Layer 4)
// ---------------------------------------------------------------------------

export async function courierPinOrderLocationAction(values: {
    token: string;
    order_id: string;
    lat: number;
    lng: number;
}): Promise<CourierPortalResult> {
    const te = await getTranslations("courier.errors");

    const parsed = courierPinLocationSchema.safeParse(values);
    if (!parsed.success) return { error: te("invalidData") };

    const limited = await rateLimit({
        key: "courier-pin",
        limit: 20,
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

    const admin = createAdminClient();

    // 1. Resolve the courier by token.
    const { data: courier, error: courierError } = await admin
        .from("couriers")
        .select("id")
        .eq("access_token", parsed.data.token)
        .eq("is_active", true)
        .maybeSingle();
    if (courierError || !courier) return { error: te("invalidLink") };

    // 2. The order must be assigned to this courier.
    const { data: order, error: orderError } = await admin
        .from("orders")
        .select("address_id, address_snapshot")
        .eq("id", parsed.data.order_id)
        .eq("courier_id", courier.id)
        .maybeSingle();
    if (orderError || !order) return { error: te("notAssigned") };

    const nowIso = new Date().toISOString();

    // 3. Update the address row — future orders to the same normalized
    //    address inherit the corrected pin (create_order enriches by priority).
    if (order.address_id) {
        const { error: addrError } = await admin
            .from("addresses")
            .update({
                lat: parsed.data.lat,
                lng: parsed.data.lng,
                location_source: "courier_pinned",
                location_confidence: "high",
                geocoded_at: nowIso,
                updated_at: nowIso,
            })
            .eq("id", order.address_id);
        if (addrError) return { error: te("updateFailed") };
    }

    // 4. Update the order's snapshot so the courier/admin UIs reflect it.
    const snapshot =
        order.address_snapshot &&
            typeof order.address_snapshot === "object" &&
            !Array.isArray(order.address_snapshot)
            ? order.address_snapshot
            : {};
    const updatedSnapshot: Json = {
        ...snapshot,
        lat: parsed.data.lat,
        lng: parsed.data.lng,
        location_source: "courier_pinned",
        location_confidence: "high",
        geocoded_at: nowIso,
    };

    const { error: snapError } = await admin
        .from("orders")
        .update({
            address_snapshot: updatedSnapshot,
            location_source: "courier_pinned",
        })
        .eq("id", parsed.data.order_id);
    if (snapError) return { error: te("updateFailed") };

    revalidatePath(`/courier/${parsed.data.token}`);
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

export async function courierCancelOrderAction(input: {
    token: string;
    order_id: string;
    note?: string | null;
}): Promise<CourierPortalResult> {
    const te = await getTranslations("courier.errors");

    const parsed = courierCancelSchema.safeParse({
        token: input.token,
        order_id: input.order_id,
        note: input.note ?? null,
    });
    if (!parsed.success) return { error: te("invalidData") };

    const limited = await rateLimit({
        key: "courier-cancel",
        limit: 30,
        windowMs: 60_000,
        identifier: parsed.data.token,
    });
    if (!limited.ok) {
        return { error: te("rateLimited", { seconds: limited.retryAfterSeconds }) };
    }

    const { data, error } = await createAdminClient().rpc("courier_cancel_order", {
        p_token: parsed.data.token,
        p_order_id: parsed.data.order_id,
        p_note: parsed.data.note ?? null,
    });

    if (error) {
        const msg = String(error.message ?? "");
        if (msg.includes("INVALID_TOKEN")) return { error: te("invalidLink") };
        if (msg.includes("COURIER_INACTIVE")) return { error: te("inactive") };
        if (msg.includes("ORDER_NOT_ASSIGNED"))
            return { error: te("notAssigned") };
        if (msg.includes("CANT_CANCEL_STARTED"))
            return { error: te("cantCancelStarted") };
        return { error: te("cancelFailed") };
    }

    revalidatePath(`/courier/${parsed.data.token}`);
    return { status: (data as boolean) ? "canceled" : undefined };
}

export async function courierSetEtaAction(input: {
    token: string;
    order_id: string;
    eta_at: string;
}): Promise<CourierPortalResult> {
    const te = await getTranslations("courier.errors");

    const parsed = courierEtaSchema.safeParse({
        token: input.token,
        order_id: input.order_id,
        eta_at: input.eta_at,
    });
    if (!parsed.success) return { error: te("invalidData") };

    const limited = await rateLimit({
        key: "courier-eta",
        limit: 30,
        windowMs: 60_000,
        identifier: parsed.data.token,
    });
    if (!limited.ok) {
        return { error: te("rateLimited", { seconds: limited.retryAfterSeconds }) };
    }

    const { data, error } = await createAdminClient().rpc("courier_set_eta", {
        p_token: parsed.data.token,
        p_order_id: parsed.data.order_id,
        p_eta_at: parsed.data.eta_at,
    });

    if (error) {
        const msg = String(error.message ?? "");
        if (msg.includes("INVALID_TOKEN")) return { error: te("invalidLink") };
        if (msg.includes("COURIER_INACTIVE")) return { error: te("inactive") };
        if (msg.includes("ORDER_NOT_ASSIGNED"))
            return { error: te("notAssigned") };
        if (msg.includes("ORDER_CLOSED")) return { error: te("orderClosed") };
        return { error: te("etaFailed") };
    }

    revalidatePath(`/courier/${parsed.data.token}`);
    return { status: (data as boolean) ? "eta_set" : undefined };
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