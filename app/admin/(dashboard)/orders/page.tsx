import type { Metadata } from "next";
import { getLocale, getTranslations } from "next-intl/server";

import { OrderFilters } from "@/components/admin/order-filters";
import {
    OrdersBrowser,
    type OrderRow,
} from "@/components/admin/orders-browser";
import { Pagination } from "@/components/admin/pagination";
import { requireAdmin } from "@/lib/auth";
import { getOrders } from "@/lib/data/orders";
import { getCouriers } from "@/lib/data/couriers";
import type { Locale } from "@/lib/i18n/config";
import type { AssignableCourier } from "@/components/admin/order-assign-dialog";

export async function generateMetadata(): Promise<Metadata> {
    const t = await getTranslations("admin.orders");
    return {
        title: t("title"),
    };
}

type Props = {
    searchParams: Promise<{
        q?: string;
        status?: string;
        payment?: string;
        courier?: string;
        page?: string;
    }>;
};

export default async function AdminOrdersPage({ searchParams }: Props) {
    await requireAdmin();

    const locale = (await getLocale()) as Locale;
    const t = await getTranslations("admin.orders");

    const params = await searchParams;
    const q = params.q?.trim() || undefined;
    const status = (params.status as string) || "all";
    const payment = (params.payment as string) || "all";
    const courier = (params.courier as string) || "all";
    const page = Math.max(1, Number(params.page) || 1);

    const [result, courierRows] = await Promise.all([
        getOrders({
            q,
            status,
            paymentStatus: payment,
            courier: courier === "all" ? undefined : courier,
            page,
            pageSize: 25,
        }),
        getCouriers(),
    ]);

    const assignableCouriers: AssignableCourier[] = courierRows.map((c) => ({
        id: c.id,
        full_name: c.full_name,
        color: c.color,
        is_active: c.is_active,
        active_orders_count: c.active_orders_count,
    }));

    const rows: OrderRow[] = result.orders.map((order) => ({
        id: order.id,
        order_number: order.order_number,
        customer_name_snapshot: order.customer_name_snapshot,
        customer_phone_snapshot: order.customer_phone_snapshot,
        status: order.status,
        payment_status: order.payment_status,
        total_agorot: order.total_agorot,
        placed_at: order.placed_at,
        courier: order.courier
            ? {
                id: order.courier.id,
                full_name: order.courier.full_name,
                color: order.courier.color,
            }
            : null,
    }));

    const buildHref = (p: number) => {
        const search = new URLSearchParams();
        if (q) search.set("q", q);
        if (status !== "all") search.set("status", status);
        if (payment !== "all") search.set("payment", payment);
        if (courier !== "all") search.set("courier", courier);
        if (p > 1) search.set("page", String(p));
        const qs = search.toString();
        return `/admin/orders${qs ? `?${qs}` : ""}`;
    };

    return (
        <div className="grid gap-6 pb-16">
            <div className="flex flex-wrap items-end justify-between gap-3">
                <div>
                    <h1 className="font-display text-2xl font-extrabold tracking-tight">
                        {t("title")}
                    </h1>
                    <p className="mt-1 text-sm text-muted-foreground">
                        {t("count", { count: result.total })}
                    </p>
                </div>
            </div>

            <OrderFilters
                initial={{ q, status, payment, courier }}
                couriers={assignableCouriers}
            />

            <OrdersBrowser
                orders={rows}
                couriers={assignableCouriers}
                locale={locale}
            />

            <Pagination
                page={result.page}
                totalPages={result.totalPages}
                buildHref={buildHref}
            />
        </div>
    );
}
