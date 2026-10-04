import type { Metadata } from "next";
import Link from "next/link";

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
import { formatILS } from "@/lib/utils/currency";
import { formatDate } from "@/lib/utils/dates";

export const metadata: Metadata = {
    title: "לקוחות",
};

type Props = {
    searchParams: Promise<{ q?: string; sort?: string; page?: string }>;
};

export default async function AdminCustomersPage({ searchParams }: Props) {
    await requireAdmin();

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
                <h1 className="text-2xl font-bold">לקוחות</h1>
                <p className="mt-1 text-sm text-muted-foreground">
                    {result.total} לקוחות — מזוהים לפי טלפון
                </p>
            </div>

            <CustomerFilters initial={{ q, sort }} />

            <div className="rounded-md border">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>לקוח</TableHead>
                            <TableHead>טלפון</TableHead>
                            <TableHead>הזמנות</TableHead>
                            <TableHead>סה"כ רכישות</TableHead>
                            <TableHead>הזמנה אחרונה</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {result.customers.length === 0 && (
                            <TableRow>
                                <TableCell colSpan={5} className="py-8 text-center text-muted-foreground">
                                    אין לקוחות עדיין
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
                                    {formatILS(customer.total_agorot)}
                                </TableCell>
                                <TableCell className="text-muted-foreground">
                                    {customer.last_order_at
                                        ? formatDate(customer.last_order_at)
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