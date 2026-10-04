import "server-only";

import type {
    Customer,
    Order,
    OrderEvent,
    OrderItem,
    OrderStatus,
    PaymentStatus,
} from "@/types/database.types";
import { createAdminClient } from "@/lib/supabase/admin";

const ORDER_STATUSES: OrderStatus[] = [
    "pending",
    "confirmed",
    "preparing",
    "out_for_delivery",
    "delivered",
    "canceled",
];

const PAYMENT_STATUSES: PaymentStatus[] = [
    "unpaid",
    "authorized",
    "paid",
    "failed",
    "refunded",
];

export interface OrderListFilters {
    status?: string;
    paymentStatus?: string;
    q?: string;
    page?: number;
    pageSize?: number;
}

export interface OrderListResult {
    orders: Order[];
    total: number;
    page: number;
    pageSize: number;
    totalPages: number;
}

export async function getOrders(
    filters: OrderListFilters = {}
): Promise<OrderListResult> {
    const page = Math.max(1, filters.page ?? 1);
    const pageSize = Math.min(100, Math.max(1, filters.pageSize ?? 25));
    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;

    const admin = createAdminClient();

    let query = admin
        .from("orders")
        .select("*", { count: "exact" })
        .order("placed_at", { ascending: false })
        .range(from, to);

    if (
        filters.status &&
        filters.status !== "all" &&
        (ORDER_STATUSES as string[]).includes(filters.status)
    ) {
        query = query.eq("status", filters.status as OrderStatus);
    }
    if (
        filters.paymentStatus &&
        filters.paymentStatus !== "all" &&
        (PAYMENT_STATUSES as string[]).includes(filters.paymentStatus)
    ) {
        query = query.eq("payment_status", filters.paymentStatus as PaymentStatus);
    }
    if (filters.q) {
        query = query.or(
            `order_number.ilike.%${filters.q}%,customer_name_snapshot.ilike.%${filters.q}%,customer_phone_snapshot.ilike.%${filters.q}%`
        );
    }

    const { data, count, error } = await query;
    if (error) throw new Error(`getOrders: ${error.message}`);

    const total = count ?? 0;

    return {
        orders: (data ?? []) as Order[],
        total,
        page,
        pageSize,
        totalPages: Math.max(1, Math.ceil(total / pageSize)),
    };
}

export type OrderDetail = {
    order: Order;
    items: OrderItem[];
    events: OrderEvent[];
    customer: Pick<Customer, "id" | "phone_norm" | "phone_display" | "full_name"> | null;
};

export async function getOrderById(id: string): Promise<OrderDetail | null> {
    const admin = createAdminClient();

    const { data: order } = await admin
        .from("orders")
        .select("*")
        .eq("id", id)
        .maybeSingle();

    if (!order) return null;

    const [itemsRes, eventsRes, customerRes] = await Promise.all([
        admin
            .from("order_items")
            .select("*")
            .eq("order_id", id)
            .order("created_at", { ascending: true }),
        admin
            .from("order_events")
            .select("*")
            .eq("order_id", id)
            .order("created_at", { ascending: true }),
        admin
            .from("customers")
            .select("id, phone_norm, phone_display, full_name")
            .eq("id", order.customer_id)
            .maybeSingle(),
    ]);

    return {
        order: order as Order,
        items: (itemsRes.data ?? []) as OrderItem[],
        events: (eventsRes.data ?? []) as OrderEvent[],
        customer: (customerRes.data ?? null) as OrderDetail["customer"],
    };
}