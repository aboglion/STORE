import type { Metadata } from "next";
import Link from "next/link";
import { getLocale, getTranslations } from "next-intl/server";

import { FileText, Receipt } from "lucide-react";

import { OrderFilters } from "@/components/admin/order-filters";
import { OrdersRealtime } from "@/components/admin/orders-realtime";
import { Pagination } from "@/components/admin/pagination";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
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
import { getCouriers } from "@/lib/data/couriers";
import { PAYMENT_STATUS_LABELS } from "@/lib/constants";
import type { Locale } from "@/lib/i18n/config";
import { formatILS } from "@/lib/utils/currency";
import { formatDateTime } from "@/lib/utils/dates";
import type { AssignableCourier } from "@/components/admin/order-assign-dialog";

export async function generateMetadata(): Promise<Metadata> {
    const t = await getTranslations("admin.receipts");
    return {
        title: t("title"),
    };
}

type Props = {
    searchParams: Promise<{
        q?: string;
        payment?: string;
        courier?: string;
        page?: string;
    }>;
};

export default async function AdminReceiptsPage({ searchParams }: Props) {
    await requireAdmin();

    const locale = (await getLocale()) as Locale;
    const t = await getTranslations("admin.receipts");
    const tRoot = await getTranslations();

    const params = await searchParams;
    const q = params.q?.trim() || undefined;
    const payment = (params.payment as string) || "all";
    const courier = (params.courier as string) || "all";
    const page = Math.max(1, Number(params.page) || 1);

    const [result, courierRows] = await Promise.all([
        getOrders({
            q,
            status: "delivered",
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

    const totalRevenue = result.orders.reduce(
        (sum, o) => sum + o.total_agorot,
        0
    );

    const buildHref = (p: number) => {
        const search = new URLSearchParams();
        if (q) search.set("q", q);
        if (payment !== "all") search.set("payment", payment);
        if (courier !== "all") search.set("courier", courier);
        if (p > 1) search.set("page", String(p));
        const qs = search.toString();
        return `/admin/receipts${qs ? `?${qs}` : ""}`;
    };

    return (
        <div className="grid gap-6 pb-16">
            <OrdersRealtime />

            <div className="flex flex-wrap items-end justify-between gap-3">
                <div>
                    <h1 className="font-display text-2xl font-extrabold tracking-tight">
                        {t("title")}
                    </h1>
                    <p className="mt-1 text-sm text-muted-foreground">
                        {t("count", { count: result.total })}
                    </p>
                </div>
                <Card className="border-primary/30 bg-primary/5">
                    <CardContent className="flex items-center gap-3 px-5 py-3">
                        <Receipt className="size-5 text-primary" />
                        <div>
                            <div className="text-xs text-muted-foreground">
                                {t("totalRevenue")}
                            </div>
                            <div className="font-display text-lg font-extrabold text-primary">
                                {formatILS(totalRevenue, locale)}
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>

            <OrderFilters
                initial={{ q, status: "delivered", payment, courier }}
                couriers={assignableCouriers}
                basePath="/admin/receipts"
            />

            {result.orders.length === 0 ? (
                <div className="rounded-2xl border border-border/70 bg-card p-10 text-center text-sm text-muted-foreground shadow-soft">
                    {t("empty")}
                </div>
            ) : (
                <div className="overflow-hidden rounded-2xl border border-border/70 bg-card shadow-soft">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>{t("orderNumber")}</TableHead>
                                <TableHead>{t("customer")}</TableHead>
                                <TableHead>{t("courier")}</TableHead>
                                <TableHead>{t("payment")}</TableHead>
                                <TableHead>{t("total")}</TableHead>
                                <TableHead>{t("date")}</TableHead>
                                <TableHead className="w-32">{t("receipt")}</TableHead>
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
                                        <div className="font-medium">
                                            {order.customer_name_snapshot}
                                        </div>
                                        <div
                                            className="text-xs text-muted-foreground"
                                            dir="ltr"
                                        >
                                            {order.customer_phone_snapshot}
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        {order.courier ? (
                                            <span className="inline-flex items-center gap-1.5 rounded-full border border-border/60 bg-muted/40 px-2 py-0.5 text-xs font-semibold">
                                                <span
                                                    className="size-2 shrink-0 rounded-full"
                                                    style={{
                                                        backgroundColor:
                                                            order.courier.color,
                                                    }}
                                                />
                                                {order.courier.full_name}
                                            </span>
                                        ) : (
                                            <span className="text-xs text-muted-foreground/70">
                                                —
                                            </span>
                                        )}
                                    </TableCell>
                                    <TableCell>
                                        <Badge variant="secondary">
                                            {tRoot(
                                                PAYMENT_STATUS_LABELS[
                                                order.payment_status
                                                ]
                                            )}
                                        </Badge>
                                    </TableCell>
                                    <TableCell className="font-medium">
                                        {formatILS(order.total_agorot, locale)}
                                    </TableCell>
                                    <TableCell className="text-muted-foreground">
                                        {formatDateTime(order.placed_at, locale)}
                                    </TableCell>
                                    <TableCell>
                                        {order.invoice_token ? (
                                            <Link
                                                href={`/invoice/${order.invoice_token}`}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary transition-colors hover:bg-primary/20"
                                            >
                                                <FileText className="size-3.5" />
                                                {t("viewReceipt")}
                                            </Link>
                                        ) : (
                                            <span className="text-xs text-muted-foreground/60">
                                                —
                                            </span>
                                        )}
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </div>
            )}

            <Pagination
                page={result.page}
                totalPages={result.totalPages}
                buildHref={buildHref}
            />
        </div>
    );
}