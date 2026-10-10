"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { CornerUpLeft, Loader2, Send } from "lucide-react";
import { toast } from "sonner";

import { OrderAssignDialog, type AssignableCourier } from "@/components/admin/order-assign-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { returnOrdersToStoreAction } from "@/lib/actions/couriers";
import { ORDER_STATUS_LABELS } from "@/lib/constants";
import type { Locale } from "@/lib/i18n/config";
import { formatILS } from "@/lib/utils/currency";
import type { AddressSnapshot, Order } from "@/types/database.types";

interface CourierOrdersTableProps {
    orders: Order[];
    couriers: AssignableCourier[];
    currentCourierId: string;
    locale: Locale;
}

export function CourierOrdersTable({
    orders,
    couriers,
    currentCourierId,
    locale,
}: CourierOrdersTableProps) {
    const t = useTranslations("admin.couriers");
    const tr = useTranslations();
    const router = useRouter();

    const [selected, setSelected] = useState<Set<string>>(new Set());
    const [assignOpen, setAssignOpen] = useState(false);
    const [busy, setBusy] = useState(false);

    const transferableCouriers = useMemo(
        () => couriers.filter((c) => c.id !== currentCourierId),
        [couriers, currentCourierId]
    );

    const allSelected =
        orders.length > 0 && orders.every((o) => selected.has(o.id));

    function toggle(id: string) {
        setSelected((prev) => {
            const next = new Set(prev);
            if (next.has(id)) next.delete(id);
            else next.add(id);
            return next;
        });
    }

    async function returnSelected() {
        const ids = [...selected];
        if (ids.length === 0) return;
        setBusy(true);
        const res = await returnOrdersToStoreAction({ orderIds: ids });
        setBusy(false);
        if (res.error) {
            toast.error(res.error);
            return;
        }
        toast.success(t("returnedToast", { count: res.updated ?? ids.length }));
        setSelected(new Set());
        router.refresh();
    }

    if (orders.length === 0) {
        return (
            <div className="rounded-2xl border border-dashed border-border/70 px-6 py-10 text-center text-sm text-muted-foreground">
                {t("noActiveOrders")}
            </div>
        );
    }

    return (
        <div className="space-y-3">
            {selected.size > 0 && (
                <div className="flex items-center gap-2 rounded-2xl border border-border/70 bg-primary/5 px-4 py-2.5">
                    <span className="rounded-full bg-primary/10 px-3 py-0.5 text-xs font-bold text-primary">
                        {t("selectedCount", { count: selected.size })}
                    </span>
                    <div className="flex-1" />
                    <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="rounded-xl text-destructive hover:text-destructive"
                        onClick={returnSelected}
                        disabled={busy}
                    >
                        {busy ? (
                            <Loader2 className="size-4 animate-spin" />
                        ) : (
                            <CornerUpLeft className="size-4" />
                        )}
                        {t("returnToStore")}
                    </Button>
                    <Button
                        type="button"
                        size="sm"
                        className="rounded-xl"
                        onClick={() => setAssignOpen(true)}
                        disabled={transferableCouriers.length === 0}
                    >
                        <Send className="size-4" />
                        {t("transferTo")}
                    </Button>
                </div>
            )}

            <div className="overflow-hidden rounded-2xl border border-border/70 bg-card shadow-soft">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead className="w-10">
                                <Checkbox
                                    checked={allSelected}
                                    onCheckedChange={() =>
                                        setSelected(
                                            allSelected
                                                ? new Set()
                                                : new Set(orders.map((o) => o.id))
                                        )
                                    }
                                    aria-label={t("selectAllOrders")}
                                />
                            </TableHead>
                            <TableHead>{t("orderNumber")}</TableHead>
                            <TableHead>{t("customer")}</TableHead>
                            <TableHead>{t("address")}</TableHead>
                            <TableHead>{t("statusShort")}</TableHead>
                            <TableHead>{t("total")}</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {orders.map((order) => {
                            const address = (order.address_snapshot as unknown as AddressSnapshot) ?? {};
                            return (
                                <TableRow key={order.id}>
                                    <TableCell>
                                        <Checkbox
                                            checked={selected.has(order.id)}
                                            onCheckedChange={() => toggle(order.id)}
                                            aria-label={t("selectOrder")}
                                        />
                                    </TableCell>
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
                                    <TableCell className="max-w-52">
                                        <span
                                            className="line-clamp-2 text-xs text-muted-foreground"
                                            dir="auto"
                                        >
                                            {address.full_address}
                                        </span>
                                    </TableCell>
                                    <TableCell>
                                        <Badge variant="secondary">
                                            {tr(ORDER_STATUS_LABELS[order.status])}
                                        </Badge>
                                    </TableCell>
                                    <TableCell className="font-medium" dir="ltr">
                                        {formatILS(order.total_agorot, locale)}
                                    </TableCell>
                                </TableRow>
                            );
                        })}
                    </TableBody>
                </Table>
            </div>

            <OrderAssignDialog
                open={assignOpen}
                onOpenChange={setAssignOpen}
                orderIds={[...selected]}
                couriers={transferableCouriers}
            />
        </div>
    );
}