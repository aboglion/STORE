import type { Metadata } from "next";
import Link from "next/link";
import { getLocale, getTranslations } from "next-intl/server";

import {
    PaymentStatusBadge,
} from "@/components/admin/order-status-badge";
import { OrderQuickStatus } from "@/components/admin/order-quick-status";
import { OrderFilters } from "@/components/admin/order-filters";
import { Pagination } from "@/components/admin/pagination";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { requireAdmin } from "@/lib/auth";
import { getOrders } from "@/lib/data/orders";
import type { Locale } from "@/lib/i18n/config";
import { formatILS } from "@/lib/utils/currency";
import { formatDateTime } from "@/lib/utils/dates";

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
    const page = Math.max(1, Number(params.page) || 1);

    const result = await getOrders({
        q,
        status,
        paymentStatus: payment,
        page,
        pageSize: 25,
    });

    const buildHref = (p: number) => {
        const search = new URLSearchParams();
        if (q) search.set("q", q);
        if (status !== "all") search.set("status", status);
        if (payment !== "all") search.set("payment", payment);
        if (p > 1) search.set("page", String(p));
        const qs = search.toString();
        return `/admin/orders${qs ? `?${qs}` : ""}`;
    };

    return (
        <div className="grid gap-6">
            <div>
                <h1 className="font-display text-2xl font-extrabold tracking-tight">
                    {t("title")}
                </h1>
                <p className="mt-1 text-sm text-muted-foreground">
                    {t("count", { count: result.total })}
                </p>
            </div>

            <OrderFilters initial={{ q, status, payment }} />

            {result.orders.length === 0 ? (
                <div className="rounded-2xl border border-border/70 bg-card p-10 text-center text-sm text-muted-foreground shadow-soft">
                    {t("empty")}
                </div>
            ) : (
                <>
                    {/* מובייל — כרטיסים */}
                    <div className="grid gap-3 md:hidden">
                        {result.orders.map((order) => (
                            <div
                                key={order.id}
                                className="block rounded-2xl border border-border/70 bg-card p-4 shadow-soft transition-all duration-150"
                            >
                                <div className="flex items-start justify-between gap-3">
                                    <div className="min-w-0">
                                        <Link
                                            href={`/admin/orders/${order.id}`}
                                            className="font-mono text-sm font-semibold hover:underline"
                                            dir="ltr"
                                        >
                                            {order.order_number}
                                        </Link>
                                        <div className="mt-1 truncate text-sm font-medium">
                                            {order.customer_name_snapshot}
                                        </div>
                                        <div
                                            className="text-xs text-muted-foreground"
                                            dir="ltr"
                                        >
                                            {order.customer_phone_snapshot}
                                        </div>
                                    </div>
                                    <div className="shrink-0 text-end">
                                        <div className="font-display font-bold text-primary">
                                            {formatILS(order.total_agorot, locale)}
                                        </div>
                                        <div className="text-xs text-muted-foreground">
                                            {formatDateTime(order.placed_at, locale)}
                                        </div>
                                    </div>
                                </div>
                                <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-border/50 pt-2.5">
                                    <OrderQuickStatus
                                        orderId={order.id}
                                        currentStatus={order.status}
                                    />
                                    <PaymentStatusBadge status={order.payment_status} />
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* דסקטופ — טבלה */}
                    <div className="hidden overflow-hidden rounded-2xl border border-border/70 bg-card shadow-soft md:block">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>{t("orderNumber")}</TableHead>
                                    <TableHead>{t("customer")}</TableHead>
                                    <TableHead>{t("total")}</TableHead>
                                    <TableHead>{t("payment")}</TableHead>
                                    <TableHead>{t("statusQuick")}</TableHead>
                                    <TableHead>{t("date")}</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {result.orders.map((order) => (
                                    <TableRow key={order.id}>
                                        <TableCell>
                                            <Link
                                                href={`/admin/orders/${order.id}`}
                                                className="font-mono text-sm font-medium hover:underline"
                                                dir="ltr"
                                            >
                                                {order.order_number}
                                            </Link>
                                        </TableCell>
                                        <TableCell>
                                            <Link
                                                href={`/admin/orders/${order.id}`}
                                                className="hover:underline"
                                            >
                                                <div className="font-medium">
                                                    {order.customer_name_snapshot}
                                                </div>
                                                <div
                                                    className="text-xs text-muted-foreground"
                                                    dir="ltr"
                                                >
                                                    {order.customer_phone_snapshot}
                                                </div>
                                            </Link>
                                        </TableCell>
                                        <TableCell className="font-medium">
                                            {formatILS(order.total_agorot, locale)}
                                        </TableCell>
                                        <TableCell>
                                            <PaymentStatusBadge status={order.payment_status} />
                                        </TableCell>
                                        <TableCell>
                                            <OrderQuickStatus
                                                orderId={order.id}
                                                currentStatus={order.status}
                                            />
                                        </TableCell>
                                        <TableCell className="text-muted-foreground">
                                            {formatDateTime(order.placed_at, locale)}
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </div>
                </>
            )}

            <Pagination
                page={result.page}
                totalPages={result.totalPages}
                buildHref={buildHref}
            />
        </div>
    );
}
