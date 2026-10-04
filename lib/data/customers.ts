import "server-only";

import type {
    Address,
    CustomerStats,
    DuplicateAddressCandidate,
    Order,
} from "@/types/database.types";
import { createAdminClient } from "@/lib/supabase/admin";

export interface CustomerListFilters {
    q?: string;
    sort?: "orders" | "total" | "last" | "newest";
    page?: number;
    pageSize?: number;
}

export interface CustomerListResult {
    customers: CustomerStats[];
    total: number;
    page: number;
    pageSize: number;
    totalPages: number;
}

export async function getCustomers(
    filters: CustomerListFilters = {}
): Promise<CustomerListResult> {
    const page = Math.max(1, filters.page ?? 1);
    const pageSize = Math.min(100, Math.max(1, filters.pageSize ?? 25));
    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;

    const admin = createAdminClient();

    let query = admin
        .from("customer_stats")
        .select("*", { count: "exact" });

    if (filters.q) {
        query = query.or(
            `full_name.ilike.%${filters.q}%,phone_norm.ilike.%${filters.q}%,phone_display.ilike.%${filters.q}%`
        );
    }

    switch (filters.sort) {
        case "orders":
            query = query.order("orders_count", { ascending: false });
            break;
        case "total":
            query = query.order("total_agorot", { ascending: false });
            break;
        case "last":
            query = query.order("last_order_at", { ascending: false });
            break;
        default:
            query = query.order("first_order_at", { ascending: false });
    }

    const { data, count, error } = await query.range(from, to);
    if (error) throw new Error(`getCustomers: ${error.message}`);

    const total = count ?? 0;

    return {
        customers: (data ?? []) as CustomerStats[],
        total,
        page,
        pageSize,
        totalPages: Math.max(1, Math.ceil(total / pageSize)),
    };
}

export interface CustomerProfile {
    stats: CustomerStats;
    orders: Order[];
    addresses: Address[];
    frequentProducts: {
        product_name: string;
        units: number;
        revenue_agorot: number;
    }[];
    duplicateCandidates: DuplicateAddressCandidate[];
}

export async function getCustomerById(
    id: string
): Promise<CustomerProfile | null> {
    const admin = createAdminClient();

    const { data: stats } = await admin
        .from("customer_stats")
        .select("*")
        .eq("id", id)
        .maybeSingle();

    if (!stats) return null;

    const [ordersRes, addressesRes] = await Promise.all([
        admin
            .from("orders")
            .select("*")
            .eq("customer_id", id)
            .order("placed_at", { ascending: false }),
        admin
            .from("addresses")
            .select("*")
            .eq("customer_id", id)
            .order("created_at", { ascending: false }),
    ]);

    const orders = (ordersRes.data ?? []) as Order[];
    const addresses = (addressesRes.data ?? []) as Address[];

    // Frequent products — aggregate order items of this customer.
    const orderIds = orders.map((o) => o.id);
    let frequentProducts: CustomerProfile["frequentProducts"] = [];

    if (orderIds.length > 0) {
        const { data: items } = await admin
            .from("order_items")
            .select("product_name_snapshot, quantity, line_total_agorot")
            .in("order_id", orderIds);

        const agg = new Map<
            string,
            { units: number; revenue_agorot: number }
        >();
        for (const item of items ?? []) {
            const current = agg.get(item.product_name_snapshot) ?? {
                units: 0,
                revenue_agorot: 0,
            };
            current.units += item.quantity;
            current.revenue_agorot += item.line_total_agorot;
            agg.set(item.product_name_snapshot, current);
        }

        frequentProducts = Array.from(agg, ([product_name, v]) => ({
            product_name,
            units: v.units,
            revenue_agorot: v.revenue_agorot,
        })).sort((a, b) => b.units - a.units);
    }

    // Duplicate-address candidates (manual review only).
    const myNormalized = new Set(
        addresses.map((a) => a.normalized_address)
    );
    let duplicateCandidates: DuplicateAddressCandidate[] = [];
    if (myNormalized.size > 0) {
        const { data: dupes } = await admin
            .from("duplicate_address_candidates")
            .select("*");
        duplicateCandidates = (dupes ?? []).filter(
            (d) => myNormalized.has(d.normalized_address) && d.customer_ids.includes(id)
        );
    }

    return {
        stats: stats as CustomerStats,
        orders,
        addresses,
        frequentProducts,
        duplicateCandidates,
    };
}