import type {
    OrderStatus,
    PaymentMethod,
    PaymentStatus,
} from "@/types/database.types";

export const ORDER_STATUS_LABELS: Record<OrderStatus, string> = {
    pending: "ממתינה",
    confirmed: "אושרה",
    preparing: "בהכנה",
    out_for_delivery: "יצאה למשלוח",
    delivered: "נמסרה",
    canceled: "בוטלה",
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
    cash: "מזומן",
    card_gateway: "אשראי — סליקה",
    card_link: "קישור תשלום",
    card_terminal: "טרמינל",
};

export const PAYMENT_STATUS_LABELS: Record<PaymentStatus, string> = {
    unpaid: "לא שולם",
    authorized: "אושר",
    paid: "שולם",
    failed: "נכשל",
    refunded: "הוחזר",
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

export const CART_STORAGE_KEY = "store-cart-v1";