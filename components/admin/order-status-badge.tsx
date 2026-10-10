import { getTranslations } from "next-intl/server";

import { Badge } from "@/components/ui/badge";
import { ORDER_STATUS_LABELS, PAYMENT_STATUS_LABELS } from "@/lib/constants";
import type { OrderStatus, PaymentStatus } from "@/types/database.types";

const STATUS_VARIANTS: Record<
    OrderStatus,
    "default" | "secondary" | "destructive" | "outline"
> = {
    pending: "outline",
    confirmed: "default",
    preparing: "secondary",
    out_for_delivery: "secondary",
    delivered: "default",
    canceled: "destructive",
};

export async function OrderStatusBadge({ status }: { status: OrderStatus }) {
    const t = await getTranslations();
    return (
        <Badge variant={STATUS_VARIANTS[status]}>
            {t(ORDER_STATUS_LABELS[status])}
        </Badge>
    );
}

const PAYMENT_VARIANTS: Record<
    PaymentStatus,
    "default" | "secondary" | "destructive" | "outline"
> = {
    unpaid: "outline",
    authorized: "secondary",
    paid: "default",
    failed: "destructive",
    refunded: "secondary",
};

export async function PaymentStatusBadge({ status }: { status: PaymentStatus }) {
    const t = await getTranslations();
    return (
        <Badge variant={PAYMENT_VARIANTS[status]}>
            {t(PAYMENT_STATUS_LABELS[status])}
        </Badge>
    );
}
