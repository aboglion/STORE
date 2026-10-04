"use server";

import { revalidatePath } from "next/cache";

import { z } from "zod";

import { requireAdmin } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import {
    cancelOrderSchema,
    updateOrderStatusSchema,
    updatePaymentStatusSchema,
} from "@/lib/validations/order";

export type OrderActionResult = { error?: string } | undefined;

export async function updateOrderStatusAction(
    values: z.infer<typeof updateOrderStatusSchema>
): Promise<OrderActionResult> {
    const admin = await requireAdmin();

    const parsed = updateOrderStatusSchema.safeParse(values);
    if (!parsed.success) return { error: "נתונים לא תקינים" };

    const { error } = await createAdminClient().rpc("update_order_status", {
        p_order_id: parsed.data.order_id,
        p_to_status: parsed.data.to_status,
        p_admin_user_id: admin.id,
        p_note: parsed.data.note ?? null,
    });

    if (error) {
        const msg = String(error.message ?? "");
        if (msg.includes("INVALID_TRANSITION")) {
            return { error: "מעבר סטטוס שאינו תקין" };
        }
        return { error: "עדכון הסטטוס נכשל" };
    }

    revalidatePath("/admin/orders");
    revalidatePath(`/admin/orders/${parsed.data.order_id}`);
    return undefined;
}

export async function cancelOrderAction(
    values: z.infer<typeof cancelOrderSchema>
): Promise<OrderActionResult> {
    const admin = await requireAdmin();

    const parsed = cancelOrderSchema.safeParse(values);
    if (!parsed.success) return { error: "נתונים לא תקינים" };

    const { error } = await createAdminClient().rpc("cancel_order", {
        p_order_id: parsed.data.order_id,
        p_admin_user_id: admin.id,
        p_note: parsed.data.note ?? null,
    });

    if (error) {
        const msg = String(error.message ?? "");
        if (msg.includes("CANNOT_CANCEL_DELIVERED")) {
            return { error: "אין אפשרות לבטל הזמנה שנמסרה" };
        }
        return { error: "ביטול ההזמנה נכשל" };
    }

    revalidatePath("/admin/orders");
    revalidatePath(`/admin/orders/${parsed.data.order_id}`);
    return undefined;
}

export async function setPaymentStatusAction(
    values: z.infer<typeof updatePaymentStatusSchema>
): Promise<OrderActionResult> {
    await requireAdmin();

    const parsed = updatePaymentStatusSchema.safeParse(values);
    if (!parsed.success) return { error: "נתונים לא תקינים" };

    const { error } = await createAdminClient()
        .from("orders")
        .update({ payment_status: parsed.data.payment_status })
        .eq("id", parsed.data.order_id);

    if (error) return { error: "עדכון סטטוס התשלום נכשל" };

    revalidatePath("/admin/orders");
    revalidatePath(`/admin/orders/${parsed.data.order_id}`);
    return undefined;
}