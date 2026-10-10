"use server";

import { randomBytes } from "crypto";

import { revalidatePath } from "next/cache";
import { getTranslations } from "next-intl/server";

import { z } from "zod";

import { requireAdmin } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import {
    assignOrdersSchema,
    courierSchema,
} from "@/lib/validations/courier";
import {
    formatIsraeliPhone,
    normalizeIsraeliPhone,
} from "@/lib/utils/phone";
import type { CourierEventType } from "@/types/database.types";

export type CourierActionResult =
    | { error?: string; token?: string }
    | undefined;

/** Generates a fresh 192-bit hex token for courier portal links. */
function newAccessToken(): string {
    return randomBytes(24).toString("hex");
}

function revalidateCourierPaths(courierId?: string | null, orderId?: string) {
    revalidatePath("/admin/couriers");
    revalidatePath("/admin/orders");
    if (courierId) revalidatePath(`/admin/couriers/${courierId}`);
    if (orderId) revalidatePath(`/admin/orders/${orderId}`);
}

/** Logs an admin-courier event (audit trail). */
async function logCourierEvent(input: {
    courierId: string;
    orderId?: string | null;
    eventType: CourierEventType;
    fromValue?: string | null;
    toValue?: string | null;
    note?: string | null;
}): Promise<void> {
    await createAdminClient().from("courier_events").insert({
        courier_id: input.courierId,
        order_id: input.orderId ?? null,
        actor: "admin",
        event_type: input.eventType,
        from_value: input.fromValue ?? null,
        to_value: input.toValue ?? null,
        note: input.note ?? null,
    });
}

// ---------------------------------------------------------------------------
// Courier CRUD
// ---------------------------------------------------------------------------

export async function createCourierAction(
    values: z.infer<typeof courierSchema>
): Promise<CourierActionResult & { courierId?: string }> {
    const admin = await requireAdmin();
    void admin;

    const te = await getTranslations("admin.couriers.errors");

    const parsed = courierSchema.safeParse(values);
    if (!parsed.success) return { error: te("invalidData") };

    const norm = normalizeIsraeliPhone(parsed.data.phone);
    if (!norm) return { error: te("invalidPhone") };

    const supabase = createAdminClient();
    const { data, error } = await supabase
        .from("couriers")
        .insert({
            full_name: parsed.data.full_name,
            phone_norm: norm,
            phone_display: formatIsraeliPhone(norm),
            vehicle_type: parsed.data.vehicle_type,
            color: parsed.data.color,
            is_active: parsed.data.is_active,
            notes: parsed.data.notes ?? null,
        })
        .select("id")
        .single();

    if (error) return { error: te("createFailed") };

    await logCourierEvent({
        courierId: data.id,
        eventType: "courier_created",
        note: parsed.data.full_name,
    });

    revalidateCourierPaths();
    return { courierId: data.id };
}

export async function updateCourierAction(input: {
    id: string;
    values: z.infer<typeof courierSchema>;
}): Promise<CourierActionResult> {
    await requireAdmin();

    const te = await getTranslations("admin.couriers.errors");

    const parsed = courierSchema.safeParse(input.values);
    if (!parsed.success) return { error: te("invalidData") };

    const norm = normalizeIsraeliPhone(parsed.data.phone);
    if (!norm) return { error: te("invalidPhone") };

    const supabase = createAdminClient();
    const { error } = await supabase
        .from("couriers")
        .update({
            full_name: parsed.data.full_name,
            phone_norm: norm,
            phone_display: formatIsraeliPhone(norm),
            vehicle_type: parsed.data.vehicle_type,
            color: parsed.data.color,
            is_active: parsed.data.is_active,
            notes: parsed.data.notes ?? null,
        })
        .eq("id", input.id);

    if (error) return { error: te("updateFailed") };

    await logCourierEvent({
        courierId: input.id,
        eventType: parsed.data.is_active
            ? "courier_updated"
            : "courier_deactivated",
    });

    revalidateCourierPaths(input.id);
    return undefined;
}

export async function setCourierActiveAction(input: {
    id: string;
    isActive: boolean;
}): Promise<CourierActionResult> {
    await requireAdmin();

    const te = await getTranslations("admin.couriers.errors");

    const supabase = createAdminClient();
    const { error } = await supabase
        .from("couriers")
        .update({ is_active: input.isActive })
        .eq("id", input.id);

    if (error) return { error: te("updateFailed") };

    await logCourierEvent({
        courierId: input.id,
        eventType: input.isActive
            ? "courier_activated"
            : "courier_deactivated",
    });

    revalidateCourierPaths(input.id);
    return undefined;
}

export async function regenerateCourierTokenAction(input: {
    id: string;
}): Promise<CourierActionResult> {
    await requireAdmin();

    const te = await getTranslations("admin.couriers.errors");

    const token = newAccessToken();
    const supabase = createAdminClient();
    const { error } = await supabase
        .from("couriers")
        .update({ access_token: token })
        .eq("id", input.id);

    if (error) return { error: te("regenerateFailed") };

    await logCourierEvent({
        courierId: input.id,
        eventType: "token_regenerated",
    });

    revalidateCourierPaths(input.id);
    return { token };
}

// ---------------------------------------------------------------------------
// Assignment / transfer / return-to-store
// ---------------------------------------------------------------------------

export async function assignOrdersAction(
    values: z.infer<typeof assignOrdersSchema>
): Promise<{ error?: string; updated?: number }> {
    await requireAdmin();

    const te = await getTranslations("admin.couriers.errors");

    const parsed = assignOrdersSchema.safeParse(values);
    if (!parsed.success) return { error: te("invalidAssignment") };

    const { data, error } = await createAdminClient().rpc(
        "set_orders_courier",
        {
            p_order_ids: parsed.data.order_ids,
            p_courier_id: parsed.data.courier_id,
            p_admin_user_id: null,
            p_note: parsed.data.note ?? null,
        }
    );

    if (error) {
        const msg = String(error.message ?? "");
        if (msg.includes("COURIER_NOT_FOUND")) {
            return { error: te("courierNotFound") };
        }
        return { error: te("assignFailed") };
    }

    revalidateCourierPaths(parsed.data.courier_id ?? undefined);
    parsed.data.order_ids.forEach((id) => revalidatePath(`/admin/orders/${id}`));
    return { updated: (data as number) ?? 0 };
}

export async function returnOrdersToStoreAction(input: {
    orderIds: string[];
}): Promise<{ error?: string; updated?: number }> {
    await requireAdmin();

    const te = await getTranslations("admin.couriers.errors");

    const parsed = assignOrdersSchema.safeParse({
        order_ids: input.orderIds,
        courier_id: null,
    });
    if (!parsed.success) return { error: te("invalidAssignment") };

    const { data, error } = await createAdminClient().rpc(
        "set_orders_courier",
        {
            p_order_ids: parsed.data.order_ids,
            p_courier_id: null,
            p_admin_user_id: null,
            p_note: null,
        }
    );

    if (error) return { error: te("returnFailed") };

    revalidateCourierPaths();
    parsed.data.order_ids.forEach((id) => revalidatePath(`/admin/orders/${id}`));
    return { updated: (data as number) ?? 0 };
}

/** Transfer orders from their current courier to another (or back to store). */
export async function transferOrdersAction(input: {
    orderIds: string[];
    toCourierId: string | null;
}): Promise<{ error?: string; updated?: number }> {
    return assignOrdersAction({
        order_ids: input.orderIds,
        courier_id: input.toCourierId,
    });
}