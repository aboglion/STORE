"use server";

import { createAdminClient } from "@/lib/supabase/admin";
import { getSettings } from "@/lib/data/storefront";
import { formatIsraeliPhone, normalizeIsraeliPhone } from "@/lib/utils/phone";
import { normalizeAddress } from "@/lib/utils/address";
import {
    checkoutPayloadSchema,
    type CheckoutPayload,
} from "@/lib/validations/checkout";
import type {
    AddressSnapshot,
    CreateOrderResult,
} from "@/types/database.types";

export interface CreateOrderResponse {
    ok: boolean;
    error?: string;
    orderNumber?: string;
    totalAgorot?: number;
}

/**
 * Creates an order from the public checkout.
 *
 * Security invariants:
 *   - Prices are never trusted from the client: the subtotal is computed
 *     from the DB, and create_order() RPC locks product rows and
 *     recomputes everything inside a single transaction.
 *   - The phone number is normalized/validated server-side.
 *   - The address is normalized for customer identification.
 */
export async function createOrder(
    input: CheckoutPayload
): Promise<CreateOrderResponse> {
    const parsed = checkoutPayloadSchema.safeParse(input);
    if (!parsed.success) {
        return { ok: false, error: "הנתונים שנשלחו לא תקינים" };
    }

    const { customer, items } = parsed.data;

    // 1. Normalize + validate the phone number.
    const phone = normalizeIsraeliPhone(customer.phone);
    if (!phone) {
        return { ok: false, error: "נא להזין מספר טלפון ישראלי תקין" };
    }

    // 2. Merge duplicate cart lines.
    const merged = new Map<string, number>();
    for (const item of items) {
        merged.set(
            item.product_id,
            (merged.get(item.product_id) ?? 0) + item.quantity
        );
    }
    const cartLines = Array.from(merged, ([product_id, quantity]) => ({
        product_id,
        quantity,
    }));

    const productIds = Array.from(merged.keys());
    const admin = createAdminClient();

    // 3. Compute subtotal from the database (never from the client).
    const { data: products } = await admin
        .from("products")
        .select("id, name_he, price_agorot, is_active, stock_quantity")
        .in("id", productIds);

    interface CheckoutProduct {
        id: string;
        name_he: string;
        price_agorot: number;
        is_active: boolean;
        stock_quantity: number;
    }

    const productMap = new Map(
        ((products ?? []) as unknown as CheckoutProduct[]).map((p) => [p.id, p])
    );

    let subtotalAgorot = 0;
    for (const line of cartLines) {
        const product = productMap.get(line.product_id);
        if (!product || !product.is_active) {
            return { ok: false, error: "אחד המוצרים אינו זמין יותר" };
        }
        if (product.stock_quantity < line.quantity) {
            return {
                ok: false,
                error: `אין מספיק מלאי לאחד מהמוצרים (${product.name_he ?? ""})`.trim(),
            };
        }
        // Cap quantities to a sane bound.
        if (line.quantity > 999) {
            return { ok: false, error: "כמות לא תקינה בסל" };
        }
        subtotalAgorot += product.price_agorot * line.quantity;
    }

    // 4. Delivery fee: free above the configured threshold.
    const settings = await getSettings();
    const deliveryFee =
        subtotalAgorot >= settings.free_delivery_threshold_agorot
            ? 0
            : settings.delivery_fee_agorot;

    // 5. Normalize the address (for customer/address identification).
    const fullAddress = [
        customer.address.full_address,
        customer.address.city,
    ]
        .filter(Boolean)
        .join(", ");

    const addressSnapshot: AddressSnapshot = {
        full_address: fullAddress,
        normalized_address: normalizeAddress(fullAddress),
        city: customer.address.city || null,
        street: customer.address.street || null,
        house_number: customer.address.house_number || null,
        entrance: customer.address.entrance || null,
        apartment: customer.address.apartment || null,
        lat: customer.lat ?? null,
        lng: customer.lng ?? null,
    };

    // 6. Create the order via the transactional RPC.
    const { data, error } = await admin.rpc("create_order", {
        p_phone_norm: phone,
        p_phone_display: formatIsraeliPhone(phone),
        p_customer_name: customer.full_name,
        p_address: addressSnapshot,
        p_payment_method: customer.payment_method,
        p_delivery_fee_agorot: deliveryFee,
        p_discount_agorot: 0,
        p_customer_notes: customer.customer_notes || null,
        p_location_source: customer.location_source ?? "manual",
        p_items: cartLines,
    });

    if (error) {
        const message = String(error.message ?? "");
        if (message.includes("INSUFFICIENT_STOCK")) {
            return { ok: false, error: "כרגע אין מספיק מלאי לאחד המוצרים" };
        }
        if (message.includes("PRODUCT_NOT_FOUND")) {
            return { ok: false, error: "אחד המוצרים אינו זמין" };
        }
        if (message.includes("EMPTY_CART")) {
            return { ok: false, error: "הסל ריק" };
        }
        return { ok: false, error: "יצירת ההזמנה נכשלה, נסה שוב" };
    }

    const result = data as CreateOrderResult;

    return {
        ok: true,
        orderNumber: result.order_number,
        totalAgorot: result.total_agorot,
    };
}