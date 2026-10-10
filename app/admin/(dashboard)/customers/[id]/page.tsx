import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getLocale, getTranslations } from "next-intl/server";

import { AlertTriangle, ChevronRight, Phone, User } from "lucide-react";

import { CustomerNotesEditor } from "@/components/admin/customer-notes-editor";
import { OrderStatusBadge } from "@/components/admin/order-status-badge";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { requireAdmin } from "@/lib/auth";
import { getCustomerById } from "@/lib/data/customers";
import type { Locale } from "@/lib/i18n/config";
import { formatILS } from "@/lib/utils/currency";
import { formatDate, formatDateTime } from "@/lib/utils/dates";

export async function generateMetadata(): Promise<Metadata> {
    const t = await getTranslations("admin.customers");
    return {
        title: t("profile"),
    };
}

export default async function CustomerProfilePage({
    params,
}: {
    params: Promise<{ id: string }>;
}) {
    await requireAdmin();

    const locale = (await getLocale()) as Locale;
    const t = await getTranslations("admin.customers");

    const { id } = await params;
    const profile = await getCustomerById(id);
    if (!profile) notFound();

    const { stats, orders, addresses, frequentProducts, duplicateCandidates } =
        profile;

    const averageOrder =
        stats.orders_count > 0
            ? Math.round(stats.total_agorot / stats.orders_count)
            : 0;

    return (
        <div className="grid gap-6">
            <div>
                <Link
                    href="/admin/customers"
                    className="mb-2 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
                >
                    <ChevronRight className="size-4" />
                    {t("backToCustomers")}
                </Link>
                <div className="flex items-center gap-3">
                    <h1 className="text-2xl font-bold">{stats.full_name}</h1>
                    <Badge variant="secondary">{t("ordersCount", { count: stats.orders_count })}</Badge>
                </div>
                <p className="mt-1 flex items-center gap-2 text-sm text-muted-foreground">
                    <Phone className="size-3.5" />
                    <span dir="ltr">{stats.phone_display}</span>
                </p>
            </div>

            {duplicateCandidates.length > 0 && (
                <Card className="border-amber-500/40">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2 text-base text-amber-600">
                            <AlertTriangle className="size-5" />
                            {t("duplicateAddresses")}
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="grid gap-2 text-sm">
                        {duplicateCandidates.map((candidate) => (
                            <div key={candidate.normalized_address}>
                                <span className="font-medium">{candidate.normalized_address}</span>
                                <span className="text-muted-foreground">
                                    {" "}
                                    — {t("customersCount", { count: candidate.customers_count })}
                                </span>
                            </div>
                        ))}
                    </CardContent>
                </Card>
            )}

            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <Card>
                    <CardHeader>
                        <CardTitle className="text-sm text-muted-foreground">
                            {t("totalPurchasesCard")}
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="pt-0 text-2xl font-bold">
                        {formatILS(stats.total_agorot, locale)}
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader>
                        <CardTitle className="text-sm text-muted-foreground">
                            {t("avgOrder")}
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="pt-0 text-2xl font-bold">
                        {formatILS(averageOrder, locale)}
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader>
                        <CardTitle className="text-sm text-muted-foreground">
                            {t("lastOrderCard")}
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="pt-0 text-2xl font-bold">
                        {stats.last_order_at ? formatDate(stats.last_order_at, locale) : "—"}
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader>
                        <CardTitle className="text-sm text-muted-foreground">
                            {t("customerSince")}
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="pt-0 text-2xl font-bold">
                        {stats.first_order_at ? formatDate(stats.first_order_at, locale) : "—"}
                    </CardContent>
                </Card>
            </div>

            <div className="grid gap-6 lg:grid-cols-2">
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2 text-base">
                            <User className="size-4 text-primary" />
                            {t("notes")}
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="pt-0">
                        <CustomerNotesEditor
                            customerId={stats.id}
                            initialNotes={stats.notes}
                        />
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle className="text-base">{t("frequentProducts")}</CardTitle>
                    </CardHeader>
                    <CardContent className="pt-0">
                        {frequentProducts.length === 0 ? (
                            <p className="text-sm text-muted-foreground">{t("noData")}</p>
                        ) : (
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>{t("product")}</TableHead>
                                        <TableHead>{t("quantity")}</TableHead>
                                        <TableHead>{t("revenue")}</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {frequentProducts.slice(0, 8).map((p) => (
                                        <TableRow key={p.product_name}>
                                            <TableCell className="font-medium">
                                                {p.product_name}
                                            </TableCell>
                                            <TableCell>{p.units}</TableCell>
                                            <TableCell>{formatILS(p.revenue_agorot, locale)}</TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        )}
                    </CardContent>
                </Card>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle className="text-base">{t("orderHistory")}</CardTitle>
                </CardHeader>
                <CardContent className="pt-0">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>{t("number")}</TableHead>
                                <TableHead>{t("date")}</TableHead>
                                <TableHead>{t("total")}</TableHead>
                                <TableHead>{t("status")}</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {orders.length === 0 && (
                                <TableRow>
                                    <TableCell colSpan={4} className="py-6 text-center text-muted-foreground">
                                        {t("noOrders")}
                                    </TableCell>
                                </TableRow>
                            )}
                            {orders.map((order) => (
                                <TableRow key={order.id}>
                                    <TableCell>
                                        <Link
                                            href={`/admin/orders/${order.id}`}
                                            className="font-mono text-sm hover:underline"
                                            dir="ltr"
                                        >
                                            {order.order_number}
                                        </Link>
                                    </TableCell>
                                    <TableCell className="text-muted-foreground">
                                        {formatDateTime(order.placed_at, locale)}
                                    </TableCell>
                                    <TableCell className="font-medium">
                                        {formatILS(order.total_agorot, locale)}
                                    </TableCell>
                                    <TableCell>
                                        <OrderStatusBadge status={order.status} />
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle className="text-base">{t("addresses")}</CardTitle>
                </CardHeader>
                <CardContent className="pt-0">
                    {addresses.length === 0 ? (
                        <p className="text-sm text-muted-foreground">{t("noAddresses")}</p>
                    ) : (
                        <div className="grid gap-2">
                            {addresses.map((address) => (
                                <div
                                    key={address.id}
                                    className="flex items-center justify-between rounded-md border p-3 text-sm"
                                >
                                    <div>
                                        <div className="font-medium">{address.full_address}</div>
                                        {address.lat != null && address.lng != null && (
                                            <div className="text-xs text-muted-foreground" dir="ltr">
                                                {address.lat.toFixed(6)}, {address.lng.toFixed(6)}
                                            </div>
                                        )}
                                    </div>
                                    {address.is_default && (
                                        <Badge variant="secondary">{t("primaryAddress")}</Badge>
                                    )}
                                </div>
                            ))}
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
