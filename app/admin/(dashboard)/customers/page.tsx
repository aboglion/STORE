import type { Metadata } from "next";
import Link from "next/link";
import { getLocale, getTranslations } from "next-intl/server";

import { CustomerFilters } from "@/components/admin/customer-filters";
import { Pagination } from "@/components/admin/pagination";
import { Badge } from "@/components/ui/badge";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { requireAdmin } from "@/lib/auth";
import { getCustomers } from "@/lib/data/customers";
import type { Locale } from "@/lib/i18n/config";
import { formatILS } from "@/lib/utils/currency";
import { formatDate } from "@/lib/utils/dates";

export async function generateMetadata(): Promise<Metadata> {
    const t = await getTranslations("admin.customers");
    return {
        title: t("title"),
    };
}

type Props = {
    searchParams: Promise<{ q?: string; sort?: string; page?: string }>;
};

export default async function AdminCustomersPage({ searchParams }: Props) {
    await requireAdmin();

    const locale = (await getLocale()) as Locale;
    const t = await getTranslations("admin.customers");

    const params = await searchParams;
    const q = params.q?.trim() || undefined;
    const sort = (params.sort as "orders" | "total" | "last" | "newest") || "newest";
    const page = Math.max(1, Number(params.page) || 1);

    const result = await getCustomers({ q, sort, page, pageSize: 25 });

    const buildHref = (p: number) => {
        const search = new URLSearchParams();
        if (q) search.set("q", q);
        if (sort !== "newest") search.set("sort", sort);
        if (p > 1) search.set("page", String(p));
        const qs = search.toString();
        return `/admin/customers${qs ? `?${qs}` : ""}`;
    };

    return (
        <div className="grid gap-6">
            <div>
                <h1 className="text-2xl font-bold">{t("title")}</h1>
                <p className="mt-1 text-sm text-muted-foreground">
                    {t("count", { count: result.total })}
                </p>
            </div>

            <CustomerFilters initial={{ q, sort }} />

            <div className="overflow-hidden rounded-2xl border border-border/70 bg-card shadow-soft">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>{t("customer")}</TableHead>
                            <TableHead>{t("phone")}</TableHead>
                            <TableHead>{t("orders")}</TableHead>
                            <TableHead>{t("totalPurchases")}</TableHead>
                            <TableHead>{t("lastOrder")}</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {result.customers.length === 0 && (
                            <TableRow>
                                <TableCell colSpan={5} className="py-8 text-center text-muted-foreground">
                                    {t("empty")}
                                </TableCell>
                            </TableRow>
                        )}
                        {result.customers.map((customer) => (
                            <TableRow key={customer.id}>
                                <TableCell>
                                    <Link
                                        href={`/admin/customers/${customer.id}`}
                                        className="font-medium hover:underline"
                                    >
                                        {customer.full_name}
                                    </Link>
                                </TableCell>
                                <TableCell dir="ltr" className="text-muted-foreground">
                                    {customer.phone_display}
                                </TableCell>
                                <TableCell>
                                    <Badge variant="secondary">{customer.orders_count}</Badge>
                                </TableCell>
                                <TableCell className="font-medium">
                                    {formatILS(customer.total_agorot, locale)}
                                </TableCell>
                                <TableCell className="text-muted-foreground">
                                    {customer.last_order_at
                                        ? formatDate(customer.last_order_at, locale)
                                        : "—"}
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </div>

            <Pagination
                page={result.page}
                totalPages={result.totalPages}
                buildHref={buildHref}
            />
        </div>
    );
}
