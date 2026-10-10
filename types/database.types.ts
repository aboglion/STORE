/**
 * TypeScript types mirroring the Supabase schema defined in
 * supabase/migrations/0001_schema.sql.
 *
 * Money is always stored as integer agorot (1 ILS = 100 agorot).
 */

export type Json =
    | string
    | number
    | boolean
    | null
    | { [key: string]: Json | undefined }
    | Json[];

export type PaymentMethod =
    | "cash"
    | "card_gateway"
    | "card_link"
    | "card_terminal";

export type PaymentStatus =
    | "unpaid"
    | "authorized"
    | "paid"
    | "failed"
    | "refunded";

export type OrderStatus =
    | "pending"
    | "confirmed"
    | "preparing"
    | "out_for_delivery"
    | "delivered"
    | "canceled";

// ---------------------------------------------------------------------------
// Tables
// ---------------------------------------------------------------------------

export interface Category {
    id: string;
    name_he: string;
    /** Arabic category name — falls back to name_he when empty. */
    name_ar: string | null;
    slug: string;
    is_active: boolean;
    sort_order: number;
    created_at: string;
    updated_at: string;
}

export interface Product {
    id: string;
    category_id: string | null;
    slug: string;
    name_he: string;
    /** Arabic product name — falls back to name_he when empty. */
    name_ar: string | null;
    description_he: string | null;
    /** Arabic product description — falls back to description_he when empty. */
    description_ar: string | null;
    price_agorot: number;
    compare_at_price_agorot: number | null;
    stock_quantity: number;
    low_stock_threshold: number;
    is_active: boolean;
    sort_order: number;
    created_at: string;
    updated_at: string;
}

export interface ProductImage {
    id: string;
    product_id: string;
    storage_path: string;
    alt_text: string | null;
    sort_order: number;
    created_at: string;
}

export type ProductWithImages = Product & {
    images: ProductImage[];
};

export interface Customer {
    id: string;
    phone_norm: string;
    phone_display: string;
    full_name: string;
    notes: string | null;
    created_at: string;
    updated_at: string;
}

export interface Address {
    id: string;
    customer_id: string;
    label: string | null;
    full_address: string;
    normalized_address: string;
    city: string | null;
    street: string | null;
    house_number: string | null;
    entrance: string | null;
    apartment: string | null;
    notes: string | null;
    lat: number | null;
    lng: number | null;
    is_default: boolean;
    created_at: string;
    updated_at: string;
}

/** Address snapshot saved on order placement (orders.address_snapshot). */
export interface AddressSnapshot {
    full_address: string;
    normalized_address: string;
    city?: string | null;
    street?: string | null;
    house_number?: string | null;
    entrance?: string | null;
    apartment?: string | null;
    notes?: string | null;
    lat?: number | null;
    lng?: number | null;
}

export interface Order {
    id: string;
    order_number: string;
    customer_id: string;
    customer_name_snapshot: string;
    customer_phone_snapshot: string;
    address_id: string | null;
    address_snapshot: Json;
    status: OrderStatus;
    payment_method: PaymentMethod;
    payment_status: PaymentStatus;
    subtotal_agorot: number;
    delivery_fee_agorot: number;
    discount_agorot: number;
    total_agorot: number;
    customer_notes: string | null;
    location_source: string | null;
    /** Courier assigned to deliver this order (null = in the store pool). */
    courier_id: string | null;
    /** When the order was assigned to a courier. */
    assigned_at: string | null;
    /** When the courier marked the order as delivered. */
    delivered_at: string | null;
    /** Unguessable token used in the public invoice URL. */
    invoice_token: string | null;
    placed_at: string;
    updated_at: string;
}

export interface OrderItem {
    id: string;
    order_id: string;
    product_id: string | null;
    product_name_snapshot: string;
    /** Arabic product name snapshot — falls back to product_name_snapshot. */
    product_name_ar_snapshot: string | null;
    unit_price_agorot: number;
    quantity: number;
    line_total_agorot: number;
    created_at: string;
}

export interface InventoryLog {
    id: string;
    product_id: string;
    order_id: string | null;
    admin_user_id: string | null;
    change_quantity: number;
    reason: string | null;
    created_at: string;
}

export interface OrderEvent {
    id: string;
    order_id: string;
    admin_user_id: string | null;
    from_status: string | null;
    to_status: string | null;
    note: string | null;
    created_at: string;
}

/** settings.value is a JSON object and settings.key identifies it. */
export interface Setting {
    key: string;
    value: Json;
    updated_at: string;
}

export interface AdminProfile {
    id: string;
    email: string;
    role: string;
    created_at: string;
    updated_at: string;
}

export type CourierVehicle = "car" | "scooter" | "bike" | "foot";

export interface Courier {
    id: string;
    full_name: string;
    phone_norm: string;
    phone_display: string;
    /** Shareable portal access token — treat as a secret. */
    access_token: string;
    vehicle_type: CourierVehicle;
    /** Identity color used in markers and badges. */
    color: string;
    is_active: boolean;
    last_lat: number | null;
    last_lng: number | null;
    last_location_at: string | null;
    notes: string | null;
    created_at: string;
    updated_at: string;
}

export type CourierEventType =
    | "courier_created"
    | "courier_updated"
    | "courier_deactivated"
    | "courier_activated"
    | "token_regenerated"
    | "assigned"
    | "transferred"
    | "returned_to_store"
    | "claimed"
    | "declined"
    | "status_changed"
    | "problem_reported";

export interface CourierEvent {
    id: string;
    courier_id: string | null;
    order_id: string | null;
    actor: "admin" | "courier" | "system";
    event_type: CourierEventType;
    from_value: string | null;
    to_value: string | null;
    note: string | null;
    created_at: string;
}

// ---------------------------------------------------------------------------
// Views
// ---------------------------------------------------------------------------

export interface CustomerStats {
    id: string;
    phone_norm: string;
    phone_display: string;
    full_name: string;
    notes: string | null;
    first_order_at: string | null;
    orders_count: number;
    total_agorot: number;
    last_order_at: string | null;
}

export interface DuplicateAddressCandidate {
    normalized_address: string;
    city: string | null;
    customers_count: number;
    customer_ids: string[];
}

export interface DailySale {
    day: string;
    orders_count: number;
    revenue_agorot: number;
}

export interface MonthlySale {
    month: string;
    orders_count: number;
    revenue_agorot: number;
}

export interface TopProduct {
    product_id: string | null;
    product_name: string;
    units_sold: number;
    revenue_agorot: number;
    orders_count: number;
}

export interface OrdersByStatus {
    status: OrderStatus;
    orders_count: number;
    revenue_agorot: number;
}

// ---------------------------------------------------------------------------
// RPC payloads / results
// ---------------------------------------------------------------------------

export interface CreateOrderItemInput {
    product_id: string;
    quantity: number;
}

export interface CreateOrderResult {
    order_id: string;
    order_number: string;
    subtotal_agorot: number;
    delivery_fee_agorot: number;
    discount_agorot: number;
    total_agorot: number;
}

// ---------------------------------------------------------------------------
// App-level types (composed rows used by the UI)
// ---------------------------------------------------------------------------

export interface CartItem {
    product_id: string;
    quantity: number;
}

export interface OrderWithRelations extends Order {
    items: OrderItem[];
    events: OrderEvent[];
    customer: Pick<Customer, "id" | "phone_norm" | "phone_display" | "full_name">;
}

/** Courier row enriched with the counts the admin UI needs. */
export interface CourierWithStats extends Courier {
    active_orders_count: number;
    delivered_today_count: number;
    delivered_total_count: number;
}

/** Courier shown in the admin live map: position + active stops. */
export interface CourierLiveRow {
    id: string;
    full_name: string;
    color: string;
    vehicle_type: CourierVehicle;
    is_active: boolean;
    last_lat: number | null;
    last_lng: number | null;
    last_location_at: string | null;
    active_orders_count: number;
    stops: Array<{
        id: string;
        order_number: string;
        lat: number | null;
        lng: number | null;
        address: string;
    }>;
}

/** Order as seen in the courier portal (delivery-focused projection). */
export interface CourierOrder {
    id: string;
    order_number: string;
    invoice_token: string | null;
    status: OrderStatus;
    payment_method: PaymentMethod;
    payment_status: PaymentStatus;
    total_agorot: number;
    /** True when the courier must collect payment on delivery. */
    cash_to_collect: boolean;
    customer_name: string;
    customer_phone: string;
    address_text: string;
    address_lat: number | null;
    address_lng: number | null;
    customer_notes: string | null;
    placed_at: string;
    assigned_at: string | null;
    delivered_at: string | null;
    items: Array<{ name: string; quantity: number; line_total_agorot: number }>;
    events: Array<{
        created_at: string;
        to_status: string | null;
        note: string | null;
    }>;
}

/** Root payload returned to the courier portal page. */
export interface CourierPortalData {
    courier: Pick<
        Courier,
        | "id"
        | "full_name"
        | "phone_display"
        | "vehicle_type"
        | "color"
        | "is_active"
        | "last_lat"
        | "last_lng"
        | "last_location_at"
    >;
    store: { name: string; contact_phone: string; logo_url: string | null };
    active_orders: CourierOrder[];
    delivered_today: CourierOrder[];
    /** Broadcast pool — unassigned deliverable orders offered to everyone. */
    pool_orders: CourierOrder[];
}

/**
 * Lightweight projection of a broadcast-pool order — everything the request
 * popup needs without the full item/event payload (polled frequently).
 */
export interface CourierPoolOrder {
    id: string;
    order_number: string;
    customer_name: string;
    customer_phone: string;
    address_text: string;
    address_lat: number | null;
    address_lng: number | null;
    total_agorot: number;
    cash_to_collect: boolean;
    placed_at: string;
}

// ---------------------------------------------------------------------------
// App settings (stored in the settings table)
// ---------------------------------------------------------------------------

export type StoreThemeKey =
    | "caramel"
    | "forest"
    | "ocean"
    | "berry"
    | "midnight";

export interface AppSettings {
    store_name: string;
    /** Arabic store name — falls back to store_name when empty. */
    store_name_ar: string;
    /** Legal business name (חברה / עוסק מורשה). */
    legal_business_name: string;
    /** Business ID / Tax ID (ח.פ / ע.מ). */
    business_id: string;
    /** Physical business address. */
    business_address: string;
    /** Customer support email. */
    business_email: string;
    /** Customer service operating hours. */
    business_hours: string;
    /** Accessibility officer name. */
    accessibility_officer_name: string;
    /** Accessibility officer phone. */
    accessibility_officer_phone: string;
    /** Accessibility officer email. */
    accessibility_officer_email: string;
    delivery_fee_agorot: number;
    free_delivery_threshold_agorot: number;
    low_stock_threshold_default: number;
    currency: string;
    contact_phone: string;
    /** Storage path of the uploaded store logo in the product-images bucket. */
    logo_url: string;
    theme: StoreThemeKey;
}