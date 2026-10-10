import type {
    OrderStatus,
    PaymentMethod,
    PaymentStatus,
} from "@/types/database.types";

/**
 * Label maps now hold message keys (next-intl) instead of raw strings.
 * Components translate them via `t(key)`.
 */
export const ORDER_STATUS_LABELS: Record<OrderStatus, string> = {
    pending: "status.pending",
    confirmed: "status.confirmed",
    preparing: "status.preparing",
    out_for_delivery: "status.out_for_delivery",
    delivered: "status.delivered",
    canceled: "status.canceled",
};

export const CUSTOMER_STATUS_DESCRIPTIONS: Record<
    OrderStatus,
    { titleKey: string; subtitleKey: string; step: number }
> = {
    pending: {
        titleKey: "status.descPendingTitle",
        subtitleKey: "status.descPendingSubtitle",
        step: 1,
    },
    confirmed: {
        titleKey: "status.descConfirmedTitle",
        subtitleKey: "status.descConfirmedSubtitle",
        step: 2,
    },
    preparing: {
        titleKey: "status.descPreparingTitle",
        subtitleKey: "status.descPreparingSubtitle",
        step: 3,
    },
    out_for_delivery: {
        titleKey: "status.descOutForDeliveryTitle",
        subtitleKey: "status.descOutForDeliverySubtitle",
        step: 4,
    },
    delivered: {
        titleKey: "status.descDeliveredTitle",
        subtitleKey: "status.descDeliveredSubtitle",
        step: 5,
    },
    canceled: {
        titleKey: "status.descCanceledTitle",
        subtitleKey: "status.descCanceledSubtitle",
        step: 0,
    },
};

export const ORDER_STATUS_STEPS: OrderStatus[] = [
    "pending",
    "confirmed",
    "preparing",
    "out_for_delivery",
    "delivered",
];

export const NEXT_LOGICAL_STATUS: Partial<Record<OrderStatus, OrderStatus>> = {
    pending: "confirmed",
    confirmed: "preparing",
    preparing: "out_for_delivery",
    out_for_delivery: "delivered",
};

export const NEXT_STATUS_ACTION_LABELS: Partial<Record<OrderStatus, string>> = {
    pending: "admin.orders.actions.approve",
    confirmed: "admin.orders.actions.startPrep",
    preparing: "admin.orders.actions.dispatch",
    out_for_delivery: "admin.orders.actions.markDelivered",
};

/** Valid forward transitions for the order status FSM. */
export const ORDER_STATUS_TRANSITIONS: Partial<
    Record<OrderStatus, OrderStatus[]>
> = {
    pending: ["confirmed", "canceled"],
    confirmed: ["preparing", "canceled"],
    preparing: ["out_for_delivery", "canceled"],
    out_for_delivery: ["delivered"],
    delivered: [],
    canceled: [],
};

/** Statuses considered "open" (block shipped/paid stats calculations). */
export const CANCELED_STATUS: OrderStatus = "canceled";
export const DELIVERED_STATUS: OrderStatus = "delivered";

export const PAYMENT_METHOD_LABELS: Record<PaymentMethod, string> = {
    cash: "payment.cash",
    card_gateway: "payment.card_gateway",
    card_link: "payment.card_link",
    card_terminal: "payment.card_terminal",
};

export const PAYMENT_STATUS_LABELS: Record<PaymentStatus, string> = {
    unpaid: "payment.unpaid",
    authorized: "payment.authorized",
    paid: "payment.paid",
    failed: "payment.failed",
    refunded: "payment.refunded",
};

/** Order statuses that count toward revenue/statistics. */
export const REVENUE_STATUSES: OrderStatus[] = [
    "pending",
    "confirmed",
    "preparing",
    "out_for_delivery",
    "delivered",
];

/** Storage bucket for product images. Must match 0004_rls.sql. */
export const PRODUCT_IMAGES_BUCKET = "product-images";

/**
 * Allowed image upload types (MIME → extension). SVG is intentionally
 * excluded: it can carry scripts and is not needed for product photos.
 */
export const ALLOWED_IMAGE_TYPES: ReadonlyMap<string, string> = new Map([
    ["image/jpeg", "jpg"],
    ["image/png", "png"],
    ["image/webp", "webp"],
    ["image/avif", "avif"],
]);

export const CART_STORAGE_KEY = "store-cart-v1";
