"use server";

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
    placed_at: string;
    updated_at: string;
    order_items: PublicOrderItem[];
}

/**
 * Retrieves a single order by its unique order number for public customer tracking.
 */
export async function getPublicOrder(
    orderNumber: string
): Promise<PublicOrder | null> {
    const trimmed = orderNumber.trim();
    if (!trimmed) return null;

    const admin = createAdminClient();
    const { data: order, error } = await admin
        .from("orders")
        .select(`
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
        `)
        .ilike("order_number", trimmed)
        .maybeSingle();

    if (error || !order) return null;

    return order as unknown as PublicOrder;
}

/**
 * Retrieves multiple orders by an array of order numbers (for localStorage history).
 */
export async function getPublicOrdersByNumbers(
    orderNumbers: string[]
): Promise<PublicOrder[]> {
    const valid = orderNumbers
        .map((n) => n.trim())
        .filter((n) => n.length > 0)
        .slice(0, 30);

    if (valid.length === 0) return [];

    const admin = createAdminClient();
    const { data, error } = await admin
        .from("orders")
        .select(`
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
        `)
        .in("order_number", valid)
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
 * Allows a customer to lookup their orders by phone number, customer name, and/or order number.
 */
export async function searchCustomerOrders(
    params: SearchCustomerOrdersParams
): Promise<PublicOrder[]> {
    const admin = createAdminClient();
    const phoneTrimmed = params.phone?.trim() ?? "";
    const nameTrimmed = params.name?.trim() ?? "";
    const orderNumTrimmed = params.orderNumber?.trim() ?? "";

    if (!phoneTrimmed && !nameTrimmed && !orderNumTrimmed) {
        return [];
    }

    // 1. Direct order number lookup
    if (orderNumTrimmed) {
        const single = await getPublicOrder(orderNumTrimmed);
        if (single) return [single];
    }

    // 2. Phone number lookup (checking both customer_phone_snapshot and customers table)
    let customerIds: string[] = [];
    if (phoneTrimmed) {
        const norm = normalizeIsraeliPhone(phoneTrimmed);
        if (norm) {
            const { data: custRows } = await admin
                .from("customers")
                .select("id")
                .eq("phone_norm", norm);
            if (custRows) {
                customerIds = custRows.map((c) => c.id);
            }
        }
    }

    // 3. Build query on orders table
    let query = admin
        .from("orders")
        .select(`
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
        `)
        .order("placed_at", { ascending: false })
        .limit(20);

    // Filter conditions
    if (phoneTrimmed && customerIds.length > 0) {
        // Match either the customer_id or phone snapshot
        const cleanDigits = phoneTrimmed.replace(/\D+/g, "");
        query = query.or(
            `customer_id.in.(${customerIds.join(",")}),customer_phone_snapshot.ilike.%${cleanDigits}%`
        );
    } else if (phoneTrimmed) {
        const cleanDigits = phoneTrimmed.replace(/\D+/g, "");
        query = query.ilike("customer_phone_snapshot", `%${cleanDigits}%`);
    }

    if (nameTrimmed) {
        query = query.ilike("customer_name_snapshot", `%${nameTrimmed}%`);
    }

    const { data, error } = await query;
    if (error || !data) return [];

    return data as unknown as PublicOrder[];
}
