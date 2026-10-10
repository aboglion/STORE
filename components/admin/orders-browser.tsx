"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import {
    Check,
    ChevronDown,
    Loader2,
    MapPin,
    Send,
    X,
} from "lucide-react";
import { toast } from "sonner";

import { OrderAssignDialog, type AssignableCourier } from "@/components/admin/order-assign-dialog";
import { OrderLocationFix } from "@/components/admin/order-location-fix";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import {
    cancelOrderAction,
    updateOrderStatusAction,
} from "@/lib/actions/orders-admin";
import {
    ORDER_STATUS_LABELS,
    ORDER_STATUS_TRANSITIONS,
    PAYMENT_STATUS_LABELS,
} from "@/lib/constants";
import type { Locale } from "@/lib/i18n/config";
import { formatILS } from "@/lib/utils/currency";
import { formatDateTime } from "@/lib/utils/dates";
import { orderLocationStatus } from "@/lib/utils/location";
import { cn } from "@/lib/utils";
import type {
    AddressSnapshot,
    OrderStatus,
    PaymentStatus,
} from "@/types/database.types";

export interface OrderRow {
    id: string;
    order_number: string;
    customer_name_snapshot: string;
    customer_phone_snapshot: string;
    status: OrderStatus;
    payment_status: PaymentStatus;
    total_agorot: number;
    placed_at: string;
    courier: { id: string; full_name: string; color: string } | null;
    address_snapshot: AddressSnapshot | null;
}

const STATUS_VARIANTS: Record<OrderStatus, "default" | "secondary" | "destructive" | "outline"> = {
    pending: "outline",
    confirmed: "default",
    preparing: "secondary",
    out_for_delivery: "secondary",
    delivered: "default",
    canceled: "destructive",
};

const PAYMENT_VARIANTS: Record<PaymentStatus, "default" | "secondary" | "destructive" | "outline"> = {
    unpaid: "outline",
    authorized: "secondary",
    paid: "default",
    failed: "destructive",
    refunded: "secondary",
};

interface OrdersBrowserProps {
    orders: OrderRow[];
    couriers: AssignableCourier[];
    locale: Locale;
}

export function OrdersBrowser({ orders, couriers, locale }: OrdersBrowserProps) {
    const t = useTranslations("admin.orders");
    const tr = useTranslations();
    const router = useRouter();

    const [selected, setSelected] = useState<Set<string>>(new Set());
    const [assignOpen, setAssignOpen] = useState(false);
    const [pendingId, setPendingId] = useState<string | null>(null);
    const [fixOrder, setFixOrder] = useState<OrderRow | null>(null);

    const allSelected = orders.length > 0 && orders.every((o) => selected.has(o.id));
    const someSelected = selected.size > 0 && !allSelected;

    const selectableOrderIds = useMemo(
        () =>
            orders
                .filter((o) => o.status !== "delivered" && o.status !== "canceled")
                .map((o) => o.id),
        [orders]
    );

    function toggle(id: string) {
        setSelected((prev) => {
            const next = new Set(prev);
            if (next.has(id)) next.delete(id);
            else next.add(id);
            return next;
        });
    }

    function toggleAll() {
        if (allSelected) {
            setSelected(new Set());
        } else {
            setSelected(new Set(orders.map((o) => o.id)));
        }
    }

    async function quickStatus(order: OrderRow, toStatus: OrderStatus) {
        setPendingId(order.id);
        const res =
            toStatus === "canceled"
                ? await cancelOrderAction({ order_id: order.id })
                : await updateOrderStatusAction({
                    order_id: order.id,
                    to_status: toStatus,
                });
        setPendingId(null);
        if (res?.error) {
            toast.error(res.error);
            return;
        }
        toast.success(tr(ORDER_STATUS_LABELS[toStatus]));
        router.refresh();
    }

    function filterByCourier(id: string | "unassigned") {
        const params = new URLSearchParams();
        if (id === "unassigned") params.set("courier", "unassigned");
        else params.set("courier", id);
        router.push(`/admin/orders?${params.toString()}`);
    }

    const locationBadge = (row: OrderRow) => {
        const status = orderLocationStatus(row.address_snapshot);
        if (status === "ok") return null;
        return (
            <button
                type="button"
                onClick={() => setFixOrder(row)}
                className="inline-flex items-center gap-1 rounded-full border border-border/60 px-2 py-0.5 text-xs font-semibold transition-colors hover:bg-accent"
                title={t("locationFixTitle")}
            >
                <MapPin className="size-3" />
                {status === "missing"
                    ? t("locationMissing")
                    : t("locationImprecise")}
            </button>
        );
    };

    const courierBadge = (row: OrderRow) =>
        row.courier ? (
            <button
                type="button"
                onClick={() => filterByCourier(row.courier!.id)}
                className="inline-flex max-w-full items-center gap-1.5 rounded-full border border-border/60 bg-muted/40 px-2 py-0.5 text-xs font-semibold transition-colors hover:bg-accent"
            >
                <span
                    className="size-2 shrink-0 rounded-full"
                    style={{ backgroundColor: row.courier.color }}
                />
                <span className="truncate">{row.courier.full_name}</span>
            </button>
        ) : (
            <button
                type="button"
                onClick={() => filterByCourier("unassigned")}
                className="text-xs text-muted-foreground/70 transition-colors hover:text-foreground hover:underline"
            >
                {t("unassigned")}
            </button>
        );

    return (
        <>
            {orders.length === 0 ? (
                <div className="rounded-2xl border border-border/70 bg-card p-10 text-center text-sm text-muted-foreground shadow-soft">
                    {t("empty")}
                </div>
            ) : (
                <>
                    {/* Mobile — cards with selection */}
                    <div className="grid gap-3 md:hidden">
                        {orders.map((order) => (
                            <div
                                key={order.id}
                                className={cn(
                                    "relative rounded-2xl border bg-card p-4 shadow-soft transition-all",
                                    selected.has(order.id)
                                        ? "border-primary/60 ring-2 ring-primary/15"
                                        : "border-border/70"
                                )}
                            >
                                <label className="absolute start-3 top-3 z-10 flex size-5 cursor-pointer items-center justify-center">
                                    <Checkbox
                                        checked={selected.has(order.id)}
                                        onCheckedChange={() => toggle(order.id)}
                                        aria-label={t("selectOrder")}
                                    />
                                </label>
                                <div className="flex items-start justify-between gap-3 ps-6">
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
                                <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-border/50 pt-2.5">
                                    <OrderStatusMenu
                                        order={order}
                                        pending={pendingId === order.id}
                                        onSelect={(s) => quickStatus(order, s)}
                                    />
                                    <Badge variant={PAYMENT_VARIANTS[order.payment_status]}>
                                        {tr(PAYMENT_STATUS_LABELS[order.payment_status])}
                                    </Badge>
                                    {locationBadge(order)}
                                    <span className="ms-auto">{courierBadge(order)}</span>
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* Desktop — table with selection */}
                    <div className="hidden overflow-hidden rounded-2xl border border-border/70 bg-card shadow-soft md:block">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead className="w-10">
                                        <Checkbox
                                            checked={someSelected ? "indeterminate" : allSelected}
                                            onCheckedChange={toggleAll}
                                            aria-label={t("selectAll")}
                                            disabled={selectableOrderIds.length === 0}
                                        />
                                    </TableHead>
                                    <TableHead>{t("orderNumber")}</TableHead>
                                    <TableHead>{t("customer")}</TableHead>
                                    <TableHead>{t("courier")}</TableHead>
                                    <TableHead>{t("location")}</TableHead>
                                    <TableHead>{t("payment")}</TableHead>
                                    <TableHead>{t("statusQuick")}</TableHead>
                                    <TableHead>{t("total")}</TableHead>
                                    <TableHead>{t("date")}</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {orders.map((order) => (
                                    <TableRow
                                        key={order.id}
                                        className={cn(
                                            selected.has(order.id) && "bg-primary/5"
                                        )}
                                    >
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
                                        <TableCell>{courierBadge(order)}</TableCell>
                                        <TableCell>
                                            {locationBadge(order) ?? (
                                                <span className="text-xs text-muted-foreground/60">
                                                    —
                                                </span>
                                            )}
                                        </TableCell>
                                        <TableCell>
                                            <Badge variant={PAYMENT_VARIANTS[order.payment_status]}>
                                                {tr(PAYMENT_STATUS_LABELS[order.payment_status])}
                                            </Badge>
                                        </TableCell>
                                        <TableCell>
                                            <OrderStatusMenu
                                                order={order}
                                                pending={pendingId === order.id}
                                                onSelect={(s) => quickStatus(order, s)}
                                            />
                                        </TableCell>
                                        <TableCell className="font-medium">
                                            {formatILS(order.total_agorot, locale)}
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

            {/* Sticky bulk-assign bar */}
            {selected.size > 0 && (
                <div className="fixed inset-x-0 bottom-0 z-40 pb-[calc(env(safe-area-inset-bottom))]">
                    <div className="mx-auto flex max-w-5xl items-center gap-3 rounded-t-2xl border border-border/70 bg-background/95 px-5 py-3 shadow-2xl backdrop-blur-xl md:mx-4 md:mb-4 md:rounded-2xl lg:mx-auto">
                        <span className="rounded-full bg-primary/10 px-3 py-1 text-sm font-bold text-primary">
                            {t("selectedCount", { count: selected.size })}
                        </span>
                        <div className="flex-1" />
                        <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="rounded-xl"
                            onClick={() => setSelected(new Set())}
                        >
                            <X className="size-4" />
                            <span className="hidden sm:inline">{t("clearSelection")}</span>
                        </Button>
                        <Button
                            type="button"
                            size="sm"
                            className="rounded-xl font-semibold"
                            onClick={() => setAssignOpen(true)}
                            disabled={couriers.length === 0}
                        >
                            <Send className="size-4" />
                            {t("assignToCourier")}
                        </Button>
                    </div>
                </div>
            )}

            <OrderAssignDialog
                open={assignOpen}
                onOpenChange={setAssignOpen}
                orderIds={[...selected]}
                couriers={couriers}
            />

            {fixOrder && (
                <OrderLocationFix
                    open
                    onOpenChange={(open) => {
                        if (!open) setFixOrder(null);
                    }}
                    orderId={fixOrder.id}
                    snapshot={fixOrder.address_snapshot}
                />
            )}
        </>
    );
}

function OrderStatusMenu({
    order,
    pending,
    onSelect,
}: {
    order: OrderRow;
    pending: boolean;
    onSelect: (status: OrderStatus) => void;
}) {
    const t = useTranslations("admin.orders");
    const tr = useTranslations();
    const transitions = ORDER_STATUS_TRANSITIONS[order.status] ?? [];
    const baseVariant = STATUS_VARIANTS[order.status];

    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    className="h-7 gap-1 rounded-full px-2.5 text-xs font-semibold"
                    disabled={pending}
                >
                    {pending && <Loader2 className="size-3 animate-spin" />}
                    {tr(ORDER_STATUS_LABELS[order.status])}
                    {transitions.length > 0 && <ChevronDown className="size-3" />}
                </Button>
            </DropdownMenuTrigger>
            {transitions.length > 0 && (
                <DropdownMenuContent align="start">
                    <DropdownMenuLabel>{t("changeTo")}</DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    {transitions.map((s) => (
                        <DropdownMenuItem key={s} onSelect={() => onSelect(s)}>
                            <span
                                className={cn(
                                    "me-2 inline-flex size-2 rounded-full",
                                    baseVariant === "outline"
                                        ? "bg-border"
                                        : "bg-primary/40"
                                )}
                            />
                            {tr(ORDER_STATUS_LABELS[s])}
                            {s === "canceled" && <Check className="ms-auto size-3.5" />}
                        </DropdownMenuItem>
                    ))}
                </DropdownMenuContent>
            )}
        </DropdownMenu>
    );
}