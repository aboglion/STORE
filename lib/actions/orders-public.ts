"use server";

import { z } from "zod";

import { rateLimit } from "@/lib/server/rate-limit";
import { createAdminClient } from "@/lib/supabase/admin";
import { normalizeIsraeliPhone } from "@/lib/utils/phone";
import type { OrderStatus, PaymentMethod, PaymentStatus } from "@/types/database.types";

export interface PublicOrderItem {
    id: string;
    product_name_snapshot: string;
    product_name_ar_snapshot: string | null;
    quantity: number;
    unit_price_agorot: number;
    line_total_agorot: number;
}

export interface PublicOrder {
    id: string;
    order_number: string;
    status: OrderStatus;
    payment_method: PaymentMethod;
    payment_status: PaymentStatus;
    subtotal_agorot: number;
    delivery_fee_agorot: number;
    discount_agorot: number;
    total_agorot: number;
    customer_name_snapshot: string;
    customer_phone_snapshot: string;
    address_snapshot: {
        full_address?: string;
        city?: string | null;
        street?: string | null;
        house_number?: string | null;
        entrance?: string | null;
        apartment?: string | null;
        lat?: number | null;
        lng?: number | null;
    } | null;
    customer_notes: string | null;
    /** Estimated arrival time set by the courier (shown in tracking). */
    eta_at: string | null;
    placed_at: string;
    updated_at: string;
    order_items: PublicOrderItem[];
}

// ---------------------------------------------------------------------------
// Input validation
// ---------------------------------------------------------------------------

const orderNumberSchema = z.string().trim().min(1).max(40);
const phoneSchema = z.string().trim().min(7).max(20);

const ORDER_SELECT = `
    id,
    order_number,
    status,
    payment_method,
    payment_status,
    subtotal_agorot,
    delivery_fee_agorot,
    discount_agorot,
    total_agorot,
    customer_name_snapshot,
    customer_phone_snapshot,
    address_snapshot,
    customer_notes,
    eta_at,
    placed_at,
    updated_at,
    order_items (
        id,
        product_name_snapshot,
        product_name_ar_snapshot,
        quantity,
        unit_price_agorot,
        line_total_agorot
    )
`;

/**
 * Resolves a phone number to its normalized E.164 form, or null when invalid.
 * Every public order lookup requires a valid full phone number that must
 * match the order's customer exactly (via the customers.phone_norm column).
 */
function resolvePhone(phone: string): string | null {
    const parsed = phoneSchema.safeParse(phone);
    if (!parsed.success) return null;
    return normalizeIsraeliPhone(parsed.data);
}

/**
 * Retrieves a single order by its unique order number for public customer
 * tracking. The phone number is required and must belong to the order —
 * order numbers alone can no longer be used to enumerate orders.
 */
export async function getPublicOrder(
    orderNumber: string,
    phone: string
): Promise<PublicOrder | null> {
    const limited = await rateLimit({ key: "order-lookup", limit: 10, windowMs: 60_000 });
    if (!limited.ok) return null;

    const parsedNumber = orderNumberSchema.safeParse(orderNumber);
    const norm = resolvePhone(phone);
    if (!parsedNumber.success || !norm) return null;

    const admin = createAdminClient();
    const { data: order, error } = await admin
        .from("orders")
        .select(`${ORDER_SELECT}, customers!inner(phone_norm)`)
        .eq("order_number", parsedNumber.data)
        .eq("customers.phone_norm", norm)
        .maybeSingle();

    if (error || !order) return null;

    return order as unknown as PublicOrder;
}

/**
 * Retrieves multiple orders by an array of order numbers (for localStorage
 * history). Every returned order must belong to the supplied phone number.
 */
export async function getPublicOrdersByNumbers(
    orderNumbers: string[],
    phone: string
): Promise<PublicOrder[]> {
    const limited = await rateLimit({ key: "order-lookup", limit: 10, windowMs: 60_000 });
    if (!limited.ok) return [];

    const norm = resolvePhone(phone);
    if (!norm) return [];

    const valid = orderNumbers
        .map((n) => n.trim())
        .filter((n) => n.length > 0)
        .slice(0, 30);

    if (valid.length === 0) return [];

    const admin = createAdminClient();
    const { data, error } = await admin
        .from("orders")
        .select(`${ORDER_SELECT}, customers!inner(phone_norm)`)
        .in("order_number", valid)
        .eq("customers.phone_norm", norm)
        .order("placed_at", { ascending: false });

    if (error || !data) return [];

    return data as unknown as PublicOrder[];
}

export interface SearchCustomerOrdersParams {
    phone?: string;
    name?: string;
    orderNumber?: string;
}

/**
 * Allows a customer to look up their orders.
 *
 * Security invariants:
 *   - A valid full phone number is REQUIRED (exact normalized match).
 *   - The name is an optional additional filter, never a search key on its own.
 *   - Order numbers are only honored together with the matching phone.
 *   - Requests are rate limited per IP.
 */
export async function searchCustomerOrders(
    params: SearchCustomerOrdersParams
): Promise<PublicOrder[]> {
    const limited = await rateLimit({ key: "order-search", limit: 10, windowMs: 60_000 });
    if (!limited.ok) return [];

    const phoneTrimmed = params.phone?.trim() ?? "";
    const nameTrimmed = params.name?.trim() ?? "";
    const orderNumTrimmed = params.orderNumber?.trim() ?? "";

    const norm = normalizeIsraeliPhone(phoneTrimmed);
    if (!norm) return [];

    const admin = createAdminClient();

    // 1. Direct order number lookup — must also match the phone.
    if (orderNumTrimmed) {
        const single = await getPublicOrder(orderNumTrimmed, phoneTrimmed);
        if (single) return [single];
    }

    // 2. Exact phone number lookup via the customers table.
    let query = admin
        .from("orders")
        .select(`${ORDER_SELECT}, customers!inner(phone_norm)`)
        .eq("customers.phone_norm", norm)
        .order("placed_at", { ascending: false })
        .limit(20);

    if (nameTrimmed) {
        query = query.ilike("customer_name_snapshot", `%${nameTrimmed}%`);
    }

    const { data, error } = await query;
    if (error || !data) return [];

    return data as unknown as PublicOrder[];
}
