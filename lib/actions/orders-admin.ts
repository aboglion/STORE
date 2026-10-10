"use server";

import { revalidatePath, revalidateTag } from "next/cache";
import { getTranslations } from "next-intl/server";

import { z } from "zod";

import { requireAdmin } from "@/lib/auth";
import { STORE_CACHE_TAGS } from "@/lib/data/storefront";
import { createAdminClient } from "@/lib/supabase/admin";
import {
    cancelOrderSchema,
    updateOrderAddressLocationSchema,
    updateOrderStatusSchema,
    updatePaymentStatusSchema,
} from "@/lib/validations/order";
import type { Json } from "@/types/database.types";

export type OrderActionResult = { error?: string } | undefined;

export async function updateOrderStatusAction(
    values: z.infer<typeof updateOrderStatusSchema>
): Promise<OrderActionResult> {
    const admin = await requireAdmin();

    const te = await getTranslations("admin.errors");

    const parsed = updateOrderStatusSchema.safeParse(values);
    if (!parsed.success) return { error: te("invalidDataShort") };

    const { error } = await createAdminClient().rpc("update_order_status", {
        p_order_id: parsed.data.order_id,
        p_to_status: parsed.data.to_status,
        p_admin_user_id: admin.id,
        p_note: parsed.data.note ?? null,
    });

    if (error) {
        const msg = String(error.message ?? "");
        if (msg.includes("INVALID_TRANSITION")) {
            return { error: te("invalidTransition") };
        }
        return { error: te("updateStatusFailed") };
    }

    revalidatePath("/admin/orders");
    revalidatePath(`/admin/orders/${parsed.data.order_id}`);
    return undefined;
}

export async function cancelOrderAction(
    values: z.infer<typeof cancelOrderSchema>
): Promise<OrderActionResult> {
    const admin = await requireAdmin();

    const te = await getTranslations("admin.errors");

    const parsed = cancelOrderSchema.safeParse(values);
    if (!parsed.success) return { error: te("invalidDataShort") };

    const { error } = await createAdminClient().rpc("cancel_order", {
        p_order_id: parsed.data.order_id,
        p_admin_user_id: admin.id,
        p_note: parsed.data.note ?? null,
    });

    if (error) {
        const msg = String(error.message ?? "");
        if (msg.includes("CANNOT_CANCEL_DELIVERED")) {
            return { error: te("cannotCancelDelivered") };
        }
        return { error: te("cancelOrderFailed") };
    }

    revalidatePath("/admin/orders");
    revalidatePath(`/admin/orders/${parsed.data.order_id}`);
    // Cancellation restores product stock — invalidate the storefront cache.
    revalidateTag(STORE_CACHE_TAGS.products);
    return undefined;
}

export async function setPaymentStatusAction(
    values: z.infer<typeof updatePaymentStatusSchema>
): Promise<OrderActionResult> {
    await requireAdmin();

    const te = await getTranslations("admin.errors");

    const parsed = updatePaymentStatusSchema.safeParse(values);
    if (!parsed.success) return { error: te("invalidDataShort") };

    const { error } = await createAdminClient()
        .from("orders")
        .update({ payment_status: parsed.data.payment_status })
        .eq("id", parsed.data.order_id);

    if (error) return { error: te("updatePaymentFailed") };

    revalidatePath("/admin/orders");
    revalidatePath(`/admin/orders/${parsed.data.order_id}`);
    return undefined;
}

/**
 * Admin pin-fix: sets the order's location from the map pin picker.
 * Updates both the address row (enriching future orders to the same
 * normalized address) and the order's address_snapshot.
 */
export async function updateOrderAddressLocationAction(
    values: z.infer<typeof updateOrderAddressLocationSchema>
): Promise<OrderActionResult> {
    await requireAdmin();

    const te = await getTranslations("admin.errors");

    const parsed = updateOrderAddressLocationSchema.safeParse(values);
    if (!parsed.success) return { error: te("invalidDataShort") };

    const admin = createAdminClient();

    const { data: order, error: orderError } = await admin
        .from("orders")
        .select("address_id, address_snapshot")
        .eq("id", parsed.data.order_id)
        .maybeSingle();
    if (orderError || !order) return { error: te("updateLocationFailed") };

    const nowIso = new Date().toISOString();

    // 1. Update the address row so future orders to the same address
    //    inherit the corrected pin (create_order enriches by priority).
    if (order.address_id) {
        const { error: addrError } = await admin
            .from("addresses")
            .update({
                lat: parsed.data.lat,
                lng: parsed.data.lng,
                location_source: "admin_pinned",
                location_confidence: "high",
                geocoded_at: nowIso,
                updated_at: nowIso,
            })
            .eq("id", order.address_id);
        if (addrError) return { error: te("updateLocationFailed") };
    }

    // 2. Update the order's snapshot so the admin UI reflects the fix.
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
        location_source: "admin_pinned",
        location_confidence: "high",
        geocoded_at: nowIso,
    };

    const { error: snapError } = await admin
        .from("orders")
        .update({
            address_snapshot: updatedSnapshot,
            location_source: "admin_pinned",
        })
        .eq("id", parsed.data.order_id);
    if (snapError) return { error: te("updateLocationFailed") };

    revalidatePath("/admin/orders");
    revalidatePath(`/admin/orders/${parsed.data.order_id}`);
    return undefined;
}
