import "server-only";

import type {
    Courier,
    CourierEvent,
    CourierLiveRow,
    CourierOrder,
    CourierPoolOrder,
    CourierPortalData,
    CourierWithStats,
    Order,
    OrderItem,
} from "@/types/database.types";
import { createAdminClient } from "@/lib/supabase/admin";
import { getSettings } from "@/lib/data/storefront";
import { composeAddressLine } from "@/lib/utils/address";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Orders whose status is still "active" (not terminal). */
const ACTIVE_STATUS_FILTER = '("delivered","canceled")';

/**
 * Start of the current day in the store's timezone (Asia/Jerusalem),
 * expressed as a UTC instant — used for "delivered today" boundaries no
 * matter which timezone the server process runs in.
 */
function israelTodayStartUtc(): string {
    const parts = new Intl.DateTimeFormat("en-CA", {
        timeZone: "Asia/Jerusalem",
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
    }).formatToParts(new Date());

    const map = new Map(parts.map((p) => [p.type, p.value]));
    const y = map.get("year");
    const mo = map.get("month");
    const d = map.get("day");
    return new Date(`${y}-${mo}-${d}T00:00:00Z`).toISOString();
}

function toCourierOrder(order: Order & { order_items: OrderItem[] }): CourierOrder {
    const address =
        (order.address_snapshot as {
            full_address?: string;
            street?: string | null;
            house_number?: string | null;
            entrance?: string | null;
            apartment?: string | null;
            city?: string | null;
            lat?: number | null;
            lng?: number | null;
            location_confidence?: "high" | "medium" | "low" | null;
        } | null) ?? null;

    const addressText = address
        ? composeAddressLine({
            full_address: address.full_address ?? "",
            street: address.street,
            house_number: address.house_number,
            entrance: address.entrance,
            apartment: address.apartment,
            city: address.city,
        })
        : "";

    return {
        id: order.id,
        order_number: order.order_number,
        invoice_token: order.invoice_token,
        status: order.status,
        payment_method: order.payment_method,
        payment_status: order.payment_status,
        total_agorot: order.total_agorot,
        cash_to_collect:
            order.payment_method === "cash" && order.payment_status !== "paid",
        customer_name: order.customer_name_snapshot,
        customer_phone: order.customer_phone_snapshot,
        address_text: addressText,
        address_lat: address?.lat ?? null,
        address_lng: address?.lng ?? null,
        location_confidence: address?.location_confidence ?? null,
        customer_notes: order.customer_notes,
        placed_at: order.placed_at,
        assigned_at: order.assigned_at,
        delivered_at: order.delivered_at,
        eta_at: order.eta_at,
        items: (order.order_items ?? []).map((i) => ({
            name: i.product_name_snapshot,
            quantity: i.quantity,
            line_total_agorot: i.line_total_agorot,
        })),
        events: [],
    };
}

export interface CourierStats {
    active_orders_count: number;
    delivered_today_count: number;
    delivered_total_count: number;
    cash_to_collect_today_agorot: number;
    /** Minutes between assignment and delivery, or null when unknown. */
    avg_delivery_minutes: number | null;
}

const EMPTY_STATS: CourierStats = {
    active_orders_count: 0,
    delivered_today_count: 0,
    delivered_total_count: 0,
    cash_to_collect_today_agorot: 0,
    avg_delivery_minutes: null,
};

/** Aggregated per-courier stats in a few parallel queries. */
async function courierStatsByIds(ids: string[]): Promise<Map<string, CourierStats>> {
    const stats = new Map<string, CourierStats>();
    if (ids.length === 0) return stats;

    const admin = createAdminClient();
    const today = israelTodayStartUtc();

    const [activeRes, todayRes, totalRes, timingsRes] = await Promise.all([
        admin
            .from("orders")
            .select("courier_id")
            .in("courier_id", ids)
            .not("status", "in", ACTIVE_STATUS_FILTER),
        admin
            .from("orders")
            .select("courier_id, total_agorot, payment_method, payment_status")
            .in("courier_id", ids)
            .eq("status", "delivered")
            .gte("delivered_at", today),
        admin
            .from("orders")
            .select("courier_id")
            .in("courier_id", ids)
            .eq("status", "delivered"),
        admin
            .from("orders")
            .select("courier_id, assigned_at, delivered_at")
            .in("courier_id", ids)
            .eq("status", "delivered")
            .not("assigned_at", "is", null)
            .not("delivered_at", "is", null)
            .gte("placed_at", new Date(Date.now() - 90 * 24 * 3600 * 1000).toISOString()),
    ]);

    for (const id of ids) stats.set(id, { ...EMPTY_STATS });

    for (const row of activeRes.data ?? []) {
        const s = stats.get(row.courier_id as string);
        if (s) s.active_orders_count += 1;
    }
    for (const row of todayRes.data ?? []) {
        const s = stats.get(row.courier_id as string);
        if (!s) continue;
        s.delivered_today_count += 1;
        if (row.payment_method === "cash" && row.payment_status !== "paid") {
            s.cash_to_collect_today_agorot += (row.total_agorot as number) ?? 0;
        }
    }
    for (const row of totalRes.data ?? []) {
        const s = stats.get(row.courier_id as string);
        if (s) s.delivered_total_count += 1;
    }

    const minutesByCourier = new Map<string, number[]>();
    for (const row of timingsRes.data ?? []) {
        const { courier_id, assigned_at, delivered_at } = row as unknown as {
            courier_id: string;
            assigned_at: string;
            delivered_at: string;
        };
        const diff =
            (new Date(delivered_at).getTime() - new Date(assigned_at).getTime()) /
            60_000;
        if (diff < 0 || diff > 24 * 60) continue; // ignore nonsense values
        const list = minutesByCourier.get(courier_id) ?? [];
        list.push(diff);
        minutesByCourier.set(courier_id, list);
    }
    for (const [courierId, list] of minutesByCourier) {
        const s = stats.get(courierId);
        if (s) {
            s.avg_delivery_minutes =
                list.reduce((a, b) => a + b, 0) / list.length;
        }
    }

    return stats;
}

// ---------------------------------------------------------------------------
// Queries
// ---------------------------------------------------------------------------

export async function getCouriers(): Promise<CourierWithStats[]> {
    const admin = createAdminClient();
    const { data: couriers, error } = await admin
        .from("couriers")
        .select("*")
        .order("created_at", { ascending: true });

    if (error) throw new Error(`getCouriers: ${error.message}`);

    const ids = (couriers ?? []).map((c) => c.id as string);
    const stats = await courierStatsByIds(ids);

    return (couriers ?? []).map((row) => ({
        ...(row as unknown as Courier),
        ...(stats.get(row.id as string) ?? EMPTY_STATS),
    }));
}

export interface CourierDetail {
    courier: Courier;
    active_orders: (Order & { courier: null })[];
    delivered_today: (Order & { courier: null })[];
    events: CourierEvent[];
    stats: CourierStats;
}

export async function getCourierById(id: string): Promise<CourierDetail | null> {
    const admin = createAdminClient();
    const today = israelTodayStartUtc();

    const [courierRes, activeRes, todayRes, eventsRes] = await Promise.all([
        admin.from("couriers").select("*").eq("id", id).maybeSingle(),
        admin
            .from("orders")
            .select("*")
            .eq("courier_id", id)
            .not("status", "in", ACTIVE_STATUS_FILTER)
            .order("placed_at", { ascending: true }),
        admin
            .from("orders")
            .select("*")
            .eq("courier_id", id)
            .eq("status", "delivered")
            .gte("delivered_at", today)
            .order("delivered_at", { ascending: false })
            .limit(50),
        admin
            .from("courier_events")
            .select("*")
            .eq("courier_id", id)
            .order("created_at", { ascending: false })
            .limit(100),
    ]);

    if (!courierRes.data) return null;

    const stats = (await courierStatsByIds([id])).get(id) ?? EMPTY_STATS;

    return {
        courier: courierRes.data as unknown as Courier,
        active_orders: (activeRes.data ?? []) as unknown as (Order & {
            courier: null;
        })[],
        delivered_today: (todayRes.data ?? []) as unknown as (Order & {
            courier: null;
        })[],
        events: (eventsRes.data ?? []) as CourierEvent[],
        stats,
    };
}

/** Portal root payload — only a valid, active token resolves to data. */
export async function getCourierByToken(
    token: string
): Promise<CourierPortalData | null> {
    const admin = createAdminClient();
    const { data: courier } = await admin
        .from("couriers")
        .select("*")
        .eq("access_token", token)
        .eq("is_active", true)
        .maybeSingle();

    if (!courier) return null;
    const c = courier as unknown as Courier;
    const today = israelTodayStartUtc();

    const [activeRes, doneRes, poolRes, settings] = await Promise.all([
        admin
            .from("orders")
            .select("*, order_items(*)")
            .eq("courier_id", c.id)
            .not("status", "in", ACTIVE_STATUS_FILTER)
            .order("placed_at", { ascending: true }),
        admin
            .from("orders")
            .select("*, order_items(*)")
            .eq("courier_id", c.id)
            .eq("status", "delivered")
            .gte("delivered_at", today)
            .order("delivered_at", { ascending: false })
            .limit(50),
        admin
            .from("orders")
            .select("*, order_items(*)")
            .is("courier_id", null)
            .in("status", ["confirmed", "preparing"])
            .order("placed_at", { ascending: true })
            .limit(15),
        getSettings(),
    ]);

    const activeIds = (activeRes.data ?? []).map((o) => o.id as string);
    const { data: eventRows } =
        activeIds.length > 0
            ? await admin
                .from("order_events")
                .select("order_id, created_at, to_status, note")
                .in("order_id", activeIds)
                .order("created_at", { ascending: true })
            : { data: [] };

    const eventsByOrder = new Map<string, CourierOrder["events"]>();
    for (const row of eventRows ?? []) {
        const e = row as unknown as {
            order_id: string;
            created_at: string;
            to_status: string | null;
            note: string | null;
        };
        const list = eventsByOrder.get(e.order_id) ?? [];
        list.push({ created_at: e.created_at, to_status: e.to_status, note: e.note });
        eventsByOrder.set(e.order_id, list);
    }

    const mapOrder = (
        raw: Order & { order_items: OrderItem[] }
    ): CourierOrder => {
        const order = toCourierOrder(raw);
        order.events = eventsByOrder.get(raw.id) ?? [];
        return order;
    };

    return {
        courier: {
            id: c.id,
            full_name: c.full_name,
            phone_display: c.phone_display,
            vehicle_type: c.vehicle_type,
            color: c.color,
            is_active: c.is_active,
            last_lat: c.last_lat,
            last_lng: c.last_lng,
            last_location_at: c.last_location_at,
        },
        store: {
            name: settings.store_name,
            contact_phone: settings.contact_phone,
            logo_url: settings.logo_url || null,
        },
        active_orders: (activeRes.data ?? []).map(mapOrder),
        delivered_today: (doneRes.data ?? []).map(mapOrder),
        pool_orders: (poolRes.data ?? []).map(mapOrder),
    };
}

/**
 * Lightweight broadcast-pool feed for the courier popups (polled often).
 * Projected without items/events to keep the payload small.
 * Returns null when the token is not a valid active courier.
 */
export async function getCourierPoolOrders(
    token: string
): Promise<CourierPoolOrder[] | null> {
    const admin = createAdminClient();
    const { data: courier } = await admin
        .from("couriers")
        .select("id")
        .eq("access_token", token)
        .eq("is_active", true)
        .maybeSingle();

    if (!courier) return null;

    const { data, error } = await admin
        .from("orders")
        .select(
            "id, order_number, customer_name_snapshot, customer_phone_snapshot, address_snapshot, total_agorot, payment_method, payment_status, placed_at, eta_at"
        )
        .is("courier_id", null)
        .in("status", ["confirmed", "preparing"])
        .order("placed_at", { ascending: true })
        .limit(15);

    if (error) return null;

    return (data ?? []).map((row) => {
        const address = row.address_snapshot as {
            full_address?: string;
            lat?: number | null;
            lng?: number | null;
        } | null;
        return {
            id: row.id as string,
            order_number: row.order_number as string,
            customer_name: row.customer_name_snapshot as string,
            customer_phone: row.customer_phone_snapshot as string,
            address_text: address?.full_address ?? "",
            address_lat: address?.lat ?? null,
            address_lng: address?.lng ?? null,
            total_agorot: row.total_agorot as number,
            cash_to_collect:
                row.payment_method === "cash" && row.payment_status !== "paid",
            placed_at: row.placed_at as string,
        };
    });
}

/** Admin live-map feed: active couriers + their active order stops. */
export async function getCouriersLiveRows(): Promise<CourierLiveRow[]> {
    const admin = createAdminClient();
    const { data: couriers } = await admin
        .from("couriers")
        .select(
            "id, full_name, color, vehicle_type, is_active, last_lat, last_lng, last_location_at"
        )
        .eq("is_active", true);

    if (!couriers || couriers.length === 0) return [];

    const ids = couriers.map((c) => c.id as string);
    const { data: orders } = await admin
        .from("orders")
        .select("id, courier_id, order_number, address_snapshot")
        .in("courier_id", ids)
        .not("status", "in", ACTIVE_STATUS_FILTER);

    const stopsByCourier = new Map<string, CourierLiveRow["stops"]>();
    for (const order of orders ?? []) {
        const courierId = order.courier_id as string;
        const list = stopsByCourier.get(courierId) ?? [];
        const address = order.address_snapshot as {
            full_address?: string;
            lat?: number | null;
            lng?: number | null;
        } | null;
        list.push({
            id: order.id as string,
            order_number: order.order_number as string,
            lat: address?.lat ?? null,
            lng: address?.lng ?? null,
            address: address?.full_address ?? "",
        });
        stopsByCourier.set(courierId, list);
    }
    const stats = await courierStatsByIds(ids);

    return couriers.map((row) => ({
        id: row.id as string,
        full_name: row.full_name as string,
        color: row.color as string,
        vehicle_type: row.vehicle_type as Courier["vehicle_type"],
        is_active: row.is_active as boolean,
        last_lat: row.last_lat as number | null,
        last_lng: row.last_lng as number | null,
        last_location_at: row.last_location_at as string | null,
        active_orders_count:
            stats.get(row.id as string)?.active_orders_count ?? 0,
        stops: stopsByCourier.get(row.id as string) ?? [],
    }));
}

export async function getCourierStats(id: string): Promise<CourierStats> {
    return (await courierStatsByIds([id])).get(id) ?? EMPTY_STATS;
}