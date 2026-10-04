import type { Metadata } from "next";
import Link from "next/link";

import {
    OrderStatusBadge,
    PaymentStatusBadge,
} from "@/components/admin/order-status-badge";
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
import { formatILS } from "@/lib/utils/currency";
import { formatDateTime } from "@/lib/utils/dates";

export const metadata: Metadata = {
    title: "הזמנות",
};

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
                <h1 className="text-2xl font-bold">הזמנות</h1>
                <p className="mt-1 text-sm text-muted-foreground">
                    {result.total} הזמנות
                </p>
            </div>

            <OrderFilters initial={{ q, status, payment }} />

            <div className="rounded-md border">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>מספר הזמנה</TableHead>
                            <TableHead>לקוח</TableHead>
                            <TableHead>סה"כ</TableHead>
                            <TableHead>תשלום</TableHead>
                            <TableHead>סטטוס</TableHead>
                            <TableHead>תאריך</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {result.orders.length === 0 && (
                            <TableRow>
                                <TableCell colSpan={6} className="py-8 text-center text-muted-foreground">
                                    אין הזמנות
                                </TableCell>
                            </TableRow>
                        )}
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
                                        <div className="text-xs text-muted-foreground" dir="ltr">
                                            {order.customer_phone_snapshot}
                                        </div>
                                    </Link>
                                </TableCell>
                                <TableCell className="font-medium">
                                    {formatILS(order.total_agorot)}
                                </TableCell>
                                <TableCell>
                                    <PaymentStatusBadge status={order.payment_status} />
                                </TableCell>
                                <TableCell>
                                    <OrderStatusBadge status={order.status} />
                                </TableCell>
                                <TableCell className="text-muted-foreground">
                                    {formatDateTime(order.placed_at)}
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