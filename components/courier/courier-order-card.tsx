"use client";

import { useState } from "react";
import Link from "next/link";
import { useLocale, useTranslations } from "next-intl";
import {
    Banknote,
    CheckCircle2,
    ChevronDown,
    FileText,
    MapPin,
    Navigation,
    Package,
    Phone,
    StickyNote,
} from "lucide-react";
import { toast } from "sonner";

import { courierUpdateOrderStatusAction } from "@/lib/actions/courier-portal";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
    Dialog,
    DialogContent,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { ORDER_STATUS_LABELS } from "@/lib/constants";
import type { Locale } from "@/lib/i18n/config";
import { formatILS } from "@/lib/utils/currency";
import type { CourierOrder } from "@/types/database.types";

const STATUS_STYLES: Record<CourierOrder["status"], string> = {
    pending: "bg-muted text-muted-foreground",
    confirmed: "bg-primary/15 text-primary",
    preparing: "bg-secondary text-secondary-foreground",
    out_for_delivery: "bg-amber-500/15 text-amber-700",
    delivered: "bg-emerald-500/15 text-emerald-700",
    canceled: "bg-destructive/15 text-destructive",
};

interface CourierOrderCardProps {
    order: CourierOrder;
    token: string;
    /** Recommended stop number (1 = start first). */
    stopNumber?: number | null;
    /** Straight-line distance from the courier to this stop. */
    distanceMeters?: number | null;
    /** Whether this is the recommended first stop. */
    isFirstStop?: boolean;
    onChanged: () => void;
    onNavigate: (order: CourierOrder) => void;
}

export function CourierOrderCard({
    order,
    token,
    stopNumber = null,
    distanceMeters = null,
    isFirstStop = false,
    onChanged,
    onNavigate,
}: CourierOrderCardProps) {
    const t = useTranslations("courier");
    const tr = useTranslations();
    const locale = (useLocale() as Locale) ?? "he";

    const [expanded, setExpanded] = useState(false);
    const [busy, setBusy] = useState(false);
    const [deliverOpen, setDeliverOpen] = useState(false);
    const [problemOpen, setProblemOpen] = useState(false);
    const [problemNote, setProblemNote] = useState("");

    const statusKey = ORDER_STATUS_LABELS[order.status];
    const isDone = order.status === "delivered" || order.status === "canceled";
    const distanceText =
        distanceMeters != null
            ? distanceMeters >= 1000
                ? `${(distanceMeters / 1000).toFixed(1)} km`
                : `${Math.round(distanceMeters)} m`
            : null;

    async function runStatus(
        toStatus: "out_for_delivery" | "delivered" | "preparing",
        note?: string
    ) {
        setBusy(true);
        const res = await courierUpdateOrderStatusAction({
            token,
            order_id: order.id,
            to_status: toStatus,
            note: note ?? null,
        });
        setBusy(false);
        if (res?.error) {
            toast.error(res.error);
            return;
        }
        toast.success(
            toStatus === "delivered" ? t("toast.delivered") : toStatus === "preparing" ? t("toast.problem") : t("toast.started")
        );
        onChanged();
    }

    return (
        <Card
            className={`overflow-hidden rounded-2xl border shadow-soft transition-all duration-200 ${isFirstStop
                ? "border-primary/60 ring-2 ring-primary/20"
                : "border-border/70"
                }`}
        >
            {/* Header */}
            <div className="flex items-start gap-3 p-4">
                <div
                    className={`flex size-9 shrink-0 items-center justify-center rounded-xl font-display text-sm font-extrabold ${isFirstStop
                        ? "bg-primary text-primary-foreground shadow-soft"
                        : "bg-secondary text-secondary-foreground"
                        }`}
                >
                    {stopNumber ?? "•"}
                </div>

                <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                        <span className="font-mono text-xs font-bold" dir="ltr">
                            {order.order_number}
                        </span>
                        <span
                            className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-semibold ${STATUS_STYLES[order.status]}`}
                        >
                            {tr(statusKey)}
                        </span>
                        {order.cash_to_collect && (
                            <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/15 px-2 py-0.5 text-[11px] font-semibold text-amber-700">
                                <Banknote className="size-3" />
                                {formatILS(order.total_agorot, locale)}
                            </span>
                        )}
                    </div>

                    <div className="mt-1 flex items-center justify-between gap-2">
                        <div className="min-w-0">
                            <div className="truncate text-sm font-semibold">
                                {order.customer_name}
                            </div>
                            <div
                                className="truncate text-xs text-muted-foreground"
                                dir="ltr"
                            >
                                {order.customer_phone}
                            </div>
                        </div>
                        <div className="shrink-0 text-end">
                            <div className="font-display text-sm font-bold text-primary">
                                {formatILS(order.total_agorot, locale)}
                            </div>
                            {distanceText && (
                                <div className="text-[11px] text-muted-foreground">
                                    {t("distanceAway", { km: distanceText })}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* Address */}
            <div className="flex items-start gap-2 border-t border-border/50 bg-secondary/30 px-4 py-2.5">
                <MapPin className="mt-0.5 size-4 shrink-0 text-primary" />
                <span className="min-w-0 flex-1 text-[13px] leading-snug" dir="auto">
                    {order.address_text}
                </span>
            </div>

            {/* Actions row */}
            <div className="grid grid-cols-4 gap-2 px-4 pb-3 pt-2.5">
                <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="h-9 rounded-xl text-xs"
                    asChild
                >
                    <a href={`tel:${order.customer_phone}`}>
                        <Phone className="size-3.5" />
                        {t("call")}
                    </a>
                </Button>
                <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="h-9 rounded-xl text-xs"
                    onClick={() => onNavigate(order)}
                >
                    <Navigation className="size-3.5" />
                    {t("navigate")}
                </Button>
                <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="h-9 rounded-xl text-xs"
                    disabled={!order.invoice_token}
                    asChild
                >
                    <Link
                        href={`/invoice/${order.invoice_token}`}
                        target="_blank"
                        rel="noopener noreferrer"
                    >
                        <FileText className="size-3.5" />
                        {t("invoice")}
                    </Link>
                </Button>
                <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-9 rounded-xl text-xs text-muted-foreground"
                    onClick={() => setExpanded((v) => !v)}
                >
                    <ChevronDown
                        className={`size-4 transition-transform duration-200 ${expanded ? "rotate-180" : ""}`}
                    />
                    {t("details")}
                </Button>
            </div>

            {/* Expandable details */}
            {expanded && (
                <div className="space-y-3 border-t border-border/50 px-4 py-3 text-sm">
                    {order.items.length > 0 && (
                        <div>
                            <div className="mb-1 flex items-center gap-1.5 text-xs font-semibold text-muted-foreground">
                                <Package className="size-3.5" />
                                {t("orderItems")}
                            </div>
                            <ul className="space-y-1">
                                {order.items.map((item, i) => (
                                    <li
                                        key={i}
                                        className="flex items-center justify-between gap-2"
                                    >
                                        <span className="min-w-0 flex-1 truncate">
                                            {item.name}
                                            <span className="text-muted-foreground">
                                                {" "}
                                                × {item.quantity}
                                            </span>
                                        </span>
                                        <span className="shrink-0 text-xs font-medium" dir="ltr">
                                            {formatILS(item.line_total_agorot, locale)}
                                        </span>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    )}

                    {order.customer_notes && (
                        <div className="flex items-start gap-2 rounded-xl border border-amber-500/25 bg-amber-500/10 px-3 py-2">
                            <StickyNote className="mt-0.5 size-4 shrink-0 text-amber-600" />
                            <span className="text-[13px]" dir="auto">
                                {order.customer_notes}
                            </span>
                        </div>
                    )}

                    {order.events.length > 0 && (
                        <div className="rounded-xl bg-muted/50 px-3 py-2">
                            <div className="mb-1 text-xs font-semibold text-muted-foreground">
                                {t("timeline")}
                            </div>
                            <ul className="space-y-0.5">
                                {order.events.map((e, i) => (
                                    <li
                                        key={i}
                                        className="flex items-center gap-2 text-[11px] text-muted-foreground"
                                    >
                                        <span className="font-mono" dir="ltr">
                                            {new Date(e.created_at).toLocaleTimeString(
                                                locale === "ar" ? "ar-EG" : "he-IL",
                                                { hour: "2-digit", minute: "2-digit" }
                                            )}
                                        </span>
                                        <span>
                                            {e.to_status
                                                ? tr(
                                                    ORDER_STATUS_LABELS[
                                                    e.to_status as CourierOrder["status"]
                                                    ]
                                                )
                                                : "—"}
                                        </span>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    )}
                </div>
            )}

            {/* Status actions */}
            {!isDone && (
                <div className="flex gap-2 border-t border-border/50 px-4 py-3">
                    {order.status === "confirmed" || order.status === "preparing" ? (
                        <Button
                            type="button"
                            className="h-10 flex-1 rounded-xl text-sm font-semibold"
                            disabled={busy}
                            onClick={() => runStatus("out_for_delivery")}
                        >
                            <Navigation className="size-4" />
                            {t("startDelivery")}
                        </Button>
                    ) : order.status === "out_for_delivery" ? (
                        <>
                            <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                className="h-10 flex-1 rounded-xl text-sm"
                                disabled={busy}
                                onClick={() => setProblemOpen(true)}
                            >
                                {t("reportProblem")}
                            </Button>
                            <Button
                                type="button"
                                className="h-10 flex-1 rounded-xl bg-emerald-600 text-sm font-semibold hover:bg-emerald-700"
                                disabled={busy}
                                onClick={() => setDeliverOpen(true)}
                            >
                                <CheckCircle2 className="size-4" />
                                {t("markDelivered")}
                            </Button>
                        </>
                    ) : null}
                </div>
            )}

            {/* Delivered confirm */}
            <AlertDialog open={deliverOpen} onOpenChange={setDeliverOpen}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>{t("confirmDeliveredTitle")}</AlertDialogTitle>
                        <AlertDialogDescription>
                            {t("confirmDeliveredBody", { order: order.order_number })}
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>{tr("common.cancel") ?? t("cancel")}</AlertDialogCancel>
                        <AlertDialogAction
                            disabled={busy}
                            onClick={() => {
                                setDeliverOpen(false);
                                void runStatus("delivered");
                            }}
                        >
                            {t("confirmDeliveredAction")}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>

            {/* Problem note */}
            <Dialog open={problemOpen} onOpenChange={setProblemOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>{t("problemTitle")}</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-3">
                        <p className="text-sm text-muted-foreground">{t("problemHint")}</p>
                        <Textarea
                            value={problemNote}
                            onChange={(e) => setProblemNote(e.target.value)}
                            placeholder={t("problemPlaceholder")}
                            rows={3}
                            dir="auto"
                        />
                    </div>
                    <DialogFooter>
                        <Button
                            type="button"
                            variant="ghost"
                            onClick={() => {
                                setProblemOpen(false);
                                setProblemNote("");
                            }}
                        >
                            {t("cancel")}
                        </Button>
                        <Button
                            type="button"
                            disabled={busy || problemNote.trim().length < 2}
                            onClick={() => {
                                setProblemOpen(false);
                                const note = problemNote.trim();
                                setProblemNote("");
                                void runStatus("preparing", note);
                            }}
                        >
                            {t("submitProblem")}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </Card>
    );
}