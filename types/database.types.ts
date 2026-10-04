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
    description_he: string | null;
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
    placed_at: string;
    updated_at: string;
}

export interface OrderItem {
    id: string;
    order_id: string;
    product_id: string | null;
    product_name_snapshot: string;
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

// ---------------------------------------------------------------------------
// App settings (stored in the settings table)
// ---------------------------------------------------------------------------

export interface AppSettings {
    store_name: string;
    delivery_fee_agorot: number;
    free_delivery_threshold_agorot: number;
    low_stock_threshold_default: number;
    currency: string;
    contact_phone: string;
}