import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { ChevronRight, MapPin, Phone, User } from "lucide-react";

import {
    OrderStatusBadge,
    PaymentStatusBadge,
} from "@/components/admin/order-status-badge";
import { OrderStatusControls } from "@/components/admin/order-status-controls";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { requireAdmin } from "@/lib/auth";
import { getOrderById } from "@/lib/data/orders";
import {
    ORDER_STATUS_LABELS,
    PAYMENT_METHOD_LABELS,
} from "@/lib/constants";
import { formatILS } from "@/lib/utils/currency";
import { formatDateTime } from "@/lib/utils/dates";
import type { AddressSnapshot } from "@/types/database.types";

export const metadata: Metadata = {
    title: "פרטי הזמנה",
};

export default async function OrderDetailPage({
    params,
}: {
    params: Promise<{ id: string }>;
}) {
    await requireAdmin();

    const { id } = await params;
    const detail = await getOrderById(id);
    if (!detail) notFound();

    const { order, items, events, customer } = detail;
    const address = order.address_snapshot as AddressSnapshot;

    const mapQuery = address.lat && address.lng
        ? `${address.lat},${address.lng}`
        : encodeURIComponent(address.full_address);
    const mapUrl = `https://www.google.com/maps/search/?api=1&query=${mapQuery}`;

    return (
        <div className="grid gap-6">
            <div>
                <Link
                    href="/admin/orders"
                    className="mb-2 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
                >
                    <ChevronRight className="size-4" />
                    חזרה להזמנות
                </Link>
                <div className="flex flex-wrap items-center gap-3">
                    <h1 className="font-mono text-2xl font-bold" dir="ltr">
                        {order.order_number}
                    </h1>
                    <OrderStatusBadge status={order.status} />
                    <PaymentStatusBadge status={order.payment_status} />
                </div>
                <p className="mt-1 text-sm text-muted-foreground">
                    הוזמנה ב-{formatDateTime(order.placed_at)}
                </p>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle className="text-base">ניהול הזמנה</CardTitle>
                </CardHeader>
                <CardContent className="pt-0">
                    <OrderStatusControls
                        orderId={order.id}
                        currentStatus={order.status}
                        paymentStatus={order.payment_status}
                    />
                </CardContent>
            </Card>

            <div className="grid gap-6 lg:grid-cols-2">
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2 text-base">
                            <User className="size-4 text-primary" />
                            פרטי לקוח
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="grid gap-2 text-sm">
                        <div className="font-medium">{order.customer_name_snapshot}</div>
                        <div className="flex items-center gap-2 text-muted-foreground">
                            <Phone className="size-3.5" />
                            <span dir="ltr">{order.customer_phone_snapshot}</span>
                        </div>
                        {customer && (
                            <Link
                                href={`/admin/customers/${customer.id}`}
                                className="mt-1 text-sm text-primary hover:underline"
                            >
                                לפרופיל הלקוח
                            </Link>
                        )}
                        {order.customer_notes && (
                            <div className="mt-2 rounded-md bg-muted p-2 text-sm">
                                <span className="font-medium">הערות לקוח: </span>
                                {order.customer_notes}
                            </div>
                        )}
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2 text-base">
                            <MapPin className="size-4 text-primary" />
                            כתובת למשלוח
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="grid gap-2 text-sm">
                        <div>{address.full_address}</div>
                        {address.city && (
                            <div className="text-muted-foreground">{address.city}</div>
                        )}
                        {address.lat != null && address.lng != null && (
                            <div className="text-xs text-muted-foreground" dir="ltr">
                                {address.lat.toFixed(6)}, {address.lng.toFixed(6)}
                            </div>
                        )}
                        <a
                            href={mapUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="mt-1 text-sm text-primary hover:underline"
                        >
                            פתיחה במפה
                        </a>
                    </CardContent>
                </Card>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle className="text-base">פריטי הזמנה</CardTitle>
                </CardHeader>
                <CardContent className="pt-0">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>מוצר</TableHead>
                                <TableHead>מחיר ליחידה</TableHead>
                                <TableHead>כמות</TableHead>
                                <TableHead>סה"כ</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {items.map((item) => (
                                <TableRow key={item.id}>
                                    <TableCell className="font-medium">
                                        {item.product_name_snapshot}
                                    </TableCell>
                                    <TableCell>{formatILS(item.unit_price_agorot)}</TableCell>
                                    <TableCell>{item.quantity}</TableCell>
                                    <TableCell className="font-medium">
                                        {formatILS(item.line_total_agorot)}
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>

                    <Separator className="my-4" />
                    <div className="grid gap-1 text-sm">
                        <div className="flex justify-between">
                            <span className="text-muted-foreground">סה"כ מוצרים</span>
                            <span>{formatILS(order.subtotal_agorot)}</span>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-muted-foreground">משלוח</span>
                            <span>
                                {order.delivery_fee_agorot === 0
                                    ? "חינם"
                                    : formatILS(order.delivery_fee_agorot)}
                            </span>
                        </div>
                        {order.discount_agorot > 0 && (
                            <div className="flex justify-between">
                                <span className="text-muted-foreground">הנחה</span>
                                <span>-{formatILS(order.discount_agorot)}</span>
                            </div>
                        )}
                        <div className="mt-1 flex justify-between border-t pt-2 font-semibold">
                            <span>סה"כ לתשלום</span>
                            <span>{formatILS(order.total_agorot)}</span>
                        </div>
                        <div className="mt-1 flex justify-between text-xs text-muted-foreground">
                            <span>אופן תשלום</span>
                            <span>{PAYMENT_METHOD_LABELS[order.payment_method]}</span>
                        </div>
                    </div>
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle className="text-base">היסטוריית סטטוסים</CardTitle>
                </CardHeader>
                <CardContent className="pt-0">
                    {events.length === 0 ? (
                        <p className="text-sm text-muted-foreground">אין אירועים</p>
                    ) : (
                        <ol className="relative border-s ps-4">
                            {events.map((event) => (
                                <li key={event.id} className="mb-4 last:mb-0">
                                    <div className="absolute -start-1.5 mt-1.5 size-3 rounded-full border-2 border-primary bg-background" />
                                    <div className="text-sm font-medium">
                                        {event.from_status
                                            ? `${ORDER_STATUS_LABELS[event.from_status as keyof typeof ORDER_STATUS_LABELS] ?? event.from_status} → ${ORDER_STATUS_LABELS[event.to_status as keyof typeof ORDER_STATUS_LABELS] ?? event.to_status}`
                                            : ORDER_STATUS_LABELS[event.to_status as keyof typeof ORDER_STATUS_LABELS] ?? event.to_status}
                                    </div>
                                    {event.note && (
                                        <div className="text-sm text-muted-foreground">
                                            {event.note}
                                        </div>
                                    )}
                                    <div className="text-xs text-muted-foreground">
                                        {formatDateTime(event.created_at)}
                                    </div>
                                </li>
                            ))}
                        </ol>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}