"use client";

import dynamic from "next/dynamic";
import { useState } from "react";
import Link from "next/link";
import { useLocale, useTranslations } from "next-intl";
import {
    Ban,
    Banknote,
    CheckCircle2,
    ChevronDown,
    Clock,
    CornerUpLeft,
    FileText,
    Loader2,
    MapPin,
    Navigation,
    Package,
    Phone,
    StickyNote,
} from "lucide-react";
import { toast } from "sonner";

import {
    courierCancelOrderAction,
    courierDeclineOrderAction,
    courierPinOrderLocationAction,
    courierSetEtaAction,
    courierUpdateOrderStatusAction,
} from "@/lib/actions/courier-portal";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
    Sheet,
    SheetContent,
    SheetHeader,
    SheetTitle,
} from "@/components/ui/sheet";
import { Textarea } from "@/components/ui/textarea";
import { ORDER_STATUS_LABELS } from "@/lib/constants";
import type { Locale } from "@/lib/i18n/config";
import { formatILS } from "@/lib/utils/currency";
import type { CourierOrder } from "@/types/database.types";

// Leaflet is client-only — load the picker without SSR.
const AddressPinPicker = dynamic(
    () =>
        import("@/components/store/address-pin-picker").then(
            (m) => m.AddressPinPicker
        ),
    { ssr: false }
);

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
    stopNumber?: number | null;
    distanceMeters?: number | null;
    isFirstStop?: boolean;
    onChanged: () => void;
    onNavigate: (order: CourierOrder) => void;
}

/** Converts a Date to a datetime-local input value (local time). */
function toDatetimeLocal(date: Date): string {
    const pad = (n: number) => String(n).padStart(2, "0");
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
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
    const [sheet, setSheet] = useState<"delivered" | "problem" | "decline" | "cancel" | "eta" | "pin" | null>(null);
    const [note, setNote] = useState("");
    const [etaValue, setEtaValue] = useState(() => toDatetimeLocal(new Date(Date.now() + 60 * 60 * 1000)));
    const [pinLat, setPinLat] = useState<number | null>(null);
    const [pinLng, setPinLng] = useState<number | null>(null);

    const statusKey = ORDER_STATUS_LABELS[order.status];
    const isDone = order.status === "delivered" || order.status === "canceled";
    const canDecline = order.status === "confirmed" || order.status === "preparing";
    const needsPin =
        order.address_lat == null ||
        order.address_lng == null ||
        order.location_confidence === "low";
    const distanceText =
        distanceMeters != null
            ? distanceMeters >= 1000
                ? `${(distanceMeters / 1000).toFixed(1)} km`
                : `${Math.round(distanceMeters)} m`
            : null;

    async function runStatus(
        toStatus: "out_for_delivery" | "delivered" | "preparing",
        noteText?: string
    ) {
        setBusy(true);
        const res = await courierUpdateOrderStatusAction({
            token,
            order_id: order.id,
            to_status: toStatus,
            note: noteText ?? null,
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

    async function runPin() {
        if (pinLat == null || pinLng == null) return;
        setBusy(true);
        const res = await courierPinOrderLocationAction({
            token,
            order_id: order.id,
            lat: pinLat,
            lng: pinLng,
        });
        setBusy(false);
        if (res?.error) {
            toast.error(res.error);
            return;
        }
        toast.success(t("toast.pinned"));
        setSheet(null);
        setPinLat(null);
        setPinLng(null);
        onChanged();
    }

    async function runDecline() {
        setBusy(true);
        const res = await courierDeclineOrderAction({
            token,
            order_id: order.id,
            note: note.trim() || null,
        });
        setBusy(false);
        setSheet(null);
        setNote("");
        if (res?.error) {
            toast.error(res.error);
            return;
        }
        toast.success(t("toast.declined"));
        onChanged();
    }

    async function runCancel() {
        setBusy(true);
        const res = await courierCancelOrderAction({
            token,
            order_id: order.id,
            note: note.trim() || null,
        });
        setBusy(false);
        setSheet(null);
        setNote("");
        if (res?.error) {
            toast.error(res.error);
            return;
        }
        toast.success(t("toast.canceled"));
        onChanged();
    }

    async function runEta() {
        const parsed = new Date(etaValue);
        if (Number.isNaN(parsed.getTime())) {
            toast.error(t("errors.invalidData"));
            return;
        }
        setBusy(true);
        const res = await courierSetEtaAction({
            token,
            order_id: order.id,
            eta_at: parsed.toISOString(),
        });
        setBusy(false);
        setSheet(null);
        if (res?.error) {
            toast.error(res.error);
            return;
        }
        toast.success(t("toast.etaSet"));
        onChanged();
    }

    function applyEtaPreset(minutes: number) {
        setEtaValue(toDatetimeLocal(new Date(Date.now() + minutes * 60 * 1000)));
    }

    const etaText = order.eta_at
        ? new Date(order.eta_at).toLocaleTimeString(locale === "ar" ? "ar-EG" : "he-IL", {
            hour: "2-digit",
            minute: "2-digit",
        })
        : null;

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
                        {etaText && (
                            <span className="inline-flex items-center gap-1 rounded-full bg-sky-500/15 px-2 py-0.5 text-[11px] font-semibold text-sky-700">
                                <Clock className="size-3" />
                                {t("etaAt", { time: etaText })}
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

            {/* Unverified address warning + pin action */}
            {needsPin && (
                <div className="mt-2 flex items-center gap-2 rounded-xl border border-amber-500/30 bg-amber-500/10 px-3 py-2">
                    <MapPin className="size-4 shrink-0 text-amber-700" />
                    <span className="min-w-0 flex-1 text-xs text-amber-700">
                        {t("unverifiedAddress")}
                    </span>
                    <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="h-8 rounded-lg text-[11px]"
                        onClick={() => setSheet("pin")}
                    >
                        {t("pinActualLocation")}
                    </Button>
                </div>
            )}

            {/* Actions row */}
            <div className="grid grid-cols-4 gap-2 px-4 pb-3 pt-2.5">
                <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="h-10 rounded-xl text-xs"
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
                    className="h-10 rounded-xl text-xs"
                    onClick={() => onNavigate(order)}
                >
                    <Navigation className="size-3.5" />
                    {t("navigate")}
                </Button>
                <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="h-10 rounded-xl text-xs"
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
                    className="h-10 rounded-xl text-xs text-muted-foreground"
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
                <div className="space-y-2 border-t border-border/50 px-4 py-3">
                    {canDecline ? (
                        <>
                            <div className="grid grid-cols-2 gap-2">
                                <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    className="h-11 rounded-2xl text-sm"
                                    disabled={busy}
                                    onClick={() => setSheet("decline")}
                                >
                                    <CornerUpLeft className="size-4" />
                                    {t("decline")}
                                </Button>
                                <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    className="h-11 rounded-2xl text-sm text-destructive hover:text-destructive"
                                    disabled={busy}
                                    onClick={() => setSheet("cancel")}
                                >
                                    <Ban className="size-4" />
                                    {t("cancelOrder")}
                                </Button>
                            </div>
                            <div className="grid grid-cols-2 gap-2">
                                <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    className="h-11 rounded-2xl text-sm"
                                    disabled={busy}
                                    onClick={() => setSheet("eta")}
                                >
                                    <Clock className="size-4" />
                                    {t("setEta")}
                                </Button>
                                <Button
                                    type="button"
                                    size="sm"
                                    className="h-11 rounded-2xl text-sm font-semibold"
                                    disabled={busy}
                                    onClick={() => runStatus("out_for_delivery")}
                                >
                                    <Navigation className="size-4" />
                                    {t("startDelivery")}
                                </Button>
                            </div>
                        </>
                    ) : order.status === "out_for_delivery" ? (
                        <>
                            <div className="grid grid-cols-2 gap-2">
                                <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    className="h-11 rounded-2xl text-sm"
                                    disabled={busy}
                                    onClick={() => setSheet("problem")}
                                >
                                    {t("reportProblem")}
                                </Button>
                                <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    className="h-11 rounded-2xl text-sm"
                                    disabled={busy}
                                    onClick={() => setSheet("eta")}
                                >
                                    <Clock className="size-4" />
                                    {t("setEta")}
                                </Button>
                            </div>
                            <Button
                                type="button"
                                size="sm"
                                className="h-11 w-full rounded-2xl bg-emerald-600 text-sm font-semibold hover:bg-emerald-700"
                                disabled={busy}
                                onClick={() => setSheet("delivered")}
                            >
                                <CheckCircle2 className="size-4" />
                                {t("markDelivered")}
                            </Button>
                        </>
                    ) : null}
                </div>
            )}

            {/* ---- Mobile-optimized bottom sheets ---- */}

            {/* Delivered confirm */}
            <Sheet
                open={sheet === "delivered"}
                onOpenChange={(open) => !open && setSheet(null)}
            >
                <SheetContent side="bottom" className="rounded-t-3xl pb-[max(env(safe-area-inset-bottom),16px)]">
                    <SheetHeader>
                        <SheetTitle className="text-base">
                            {t("confirmDeliveredTitle")}
                        </SheetTitle>
                    </SheetHeader>
                    <p className="mt-2 text-sm text-muted-foreground">
                        {t("confirmDeliveredBody", { order: order.order_number })}
                    </p>
                    <div className="mt-5 grid gap-2.5">
                        <Button
                            type="button"
                            size="lg"
                            className="h-12 rounded-2xl bg-emerald-600 text-sm font-bold hover:bg-emerald-700"
                            disabled={busy}
                            onClick={() => {
                                setSheet(null);
                                void runStatus("delivered");
                            }}
                        >
                            <CheckCircle2 className="size-5" />
                            {t("confirmDeliveredAction")}
                        </Button>
                        <Button
                            type="button"
                            variant="ghost"
                            className="h-12 rounded-2xl text-sm"
                            disabled={busy}
                            onClick={() => setSheet(null)}
                        >
                            {t("cancel")}
                        </Button>
                    </div>
                </SheetContent>
            </Sheet>

            {/* Problem report */}
            <Sheet
                open={sheet === "problem"}
                onOpenChange={(open) => !open && setSheet(null)}
            >
                <SheetContent side="bottom" className="rounded-t-3xl pb-[max(env(safe-area-inset-bottom),16px)]">
                    <SheetHeader>
                        <SheetTitle className="text-base">{t("problemTitle")}</SheetTitle>
                    </SheetHeader>
                    <p className="mt-2 text-sm text-muted-foreground">
                        {t("problemHint")}
                    </p>
                    <Textarea
                        value={note}
                        onChange={(e) => setNote(e.target.value)}
                        placeholder={t("problemPlaceholder")}
                        rows={3}
                        className="mt-4"
                        dir="auto"
                    />
                    <div className="mt-4 grid gap-2.5">
                        <Button
                            type="button"
                            size="lg"
                            className="h-12 rounded-2xl text-sm font-semibold"
                            disabled={busy || note.trim().length < 2}
                            onClick={() => {
                                setSheet(null);
                                const text = note.trim();
                                setNote("");
                                void runStatus("preparing", text);
                            }}
                        >
                            {t("submitProblem")}
                        </Button>
                        <Button
                            type="button"
                            variant="ghost"
                            className="h-12 rounded-2xl text-sm"
                            onClick={() => {
                                setSheet(null);
                                setNote("");
                            }}
                        >
                            {t("cancel")}
                        </Button>
                    </div>
                </SheetContent>
            </Sheet>

            {/* Decline (return order to the pool) */}
            <Sheet
                open={sheet === "decline"}
                onOpenChange={(open) => !open && setSheet(null)}
            >
                <SheetContent side="bottom" className="rounded-t-3xl pb-[max(env(safe-area-inset-bottom),16px)]">
                    <SheetHeader>
                        <SheetTitle className="text-base">{t("declineTitle")}</SheetTitle>
                    </SheetHeader>
                    <p className="mt-2 text-sm text-muted-foreground">
                        {t("declineBody")}
                    </p>
                    <Textarea
                        value={note}
                        onChange={(e) => setNote(e.target.value)}
                        placeholder={t("declineNotePlaceholder")}
                        rows={2}
                        className="mt-4"
                        dir="auto"
                    />
                    <div className="mt-4 grid gap-2.5">
                        <Button
                            type="button"
                            size="lg"
                            variant="outline"
                            className="h-12 rounded-2xl text-sm font-semibold text-destructive hover:text-destructive"
                            disabled={busy}
                            onClick={runDecline}
                        >
                            <CornerUpLeft className="size-4" />
                            {t("confirmDecline")}
                        </Button>
                        <Button
                            type="button"
                            variant="ghost"
                            className="h-12 rounded-2xl text-sm"
                            onClick={() => {
                                setSheet(null);
                                setNote("");
                            }}
                        >
                            {t("cancel")}
                        </Button>
                    </div>
                </SheetContent>
            </Sheet>

            {/* Cancel order (no stock) */}
            <Sheet
                open={sheet === "cancel"}
                onOpenChange={(open) => !open && setSheet(null)}
            >
                <SheetContent side="bottom" className="rounded-t-3xl pb-[max(env(safe-area-inset-bottom),16px)]">
                    <SheetHeader>
                        <SheetTitle className="text-base">{t("cancelOrderTitle")}</SheetTitle>
                    </SheetHeader>
                    <p className="mt-2 text-sm text-muted-foreground">
                        {t("cancelOrderBody", { order: order.order_number })}
                    </p>
                    <Textarea
                        value={note}
                        onChange={(e) => setNote(e.target.value)}
                        placeholder={t("cancelOrderNotePlaceholder")}
                        rows={2}
                        className="mt-4"
                        dir="auto"
                    />
                    <div className="mt-4 grid gap-2.5">
                        <Button
                            type="button"
                            size="lg"
                            className="h-12 rounded-2xl bg-destructive text-sm font-bold hover:bg-destructive/90"
                            disabled={busy}
                            onClick={runCancel}
                        >
                            <Ban className="size-4" />
                            {t("confirmCancelOrder")}
                        </Button>
                        <Button
                            type="button"
                            variant="ghost"
                            className="h-12 rounded-2xl text-sm"
                            onClick={() => {
                                setSheet(null);
                                setNote("");
                            }}
                        >
                            {t("cancel")}
                        </Button>
                    </div>
                </SheetContent>
            </Sheet>

            {/* Set ETA */}
            <Sheet
                open={sheet === "eta"}
                onOpenChange={(open) => !open && setSheet(null)}
            >
                <SheetContent side="bottom" className="rounded-t-3xl pb-[max(env(safe-area-inset-bottom),16px)]">
                    <SheetHeader>
                        <SheetTitle className="text-base">{t("etaTitle")}</SheetTitle>
                    </SheetHeader>
                    <p className="mt-2 text-sm text-muted-foreground">
                        {t("etaHint")}
                    </p>

                    <div className="mt-4 grid grid-cols-4 gap-2">
                        {[
                            { label: "30′", minutes: 30 },
                            { label: "1h", minutes: 60 },
                            { label: "2h", minutes: 120 },
                            { label: "3h", minutes: 180 },
                        ].map((preset) => (
                            <Button
                                key={preset.minutes}
                                type="button"
                                variant="outline"
                                size="sm"
                                className="h-10 rounded-xl text-xs font-semibold"
                                onClick={() => applyEtaPreset(preset.minutes)}
                            >
                                {preset.label}
                            </Button>
                        ))}
                    </div>

                    <Input
                        type="datetime-local"
                        value={etaValue}
                        onChange={(e) => setEtaValue(e.target.value)}
                        className="mt-3 h-12 rounded-xl text-sm"
                        dir="ltr"
                    />

                    <div className="mt-4 grid gap-2.5">
                        <Button
                            type="button"
                            size="lg"
                            className="h-12 rounded-2xl text-sm font-bold"
                            disabled={busy}
                            onClick={runEta}
                        >
                            <Clock className="size-4" />
                            {t("confirmEta")}
                        </Button>
                        <Button
                            type="button"
                            variant="ghost"
                            className="h-12 rounded-2xl text-sm"
                            onClick={() => setSheet(null)}
                        >
                            {t("cancel")}
                        </Button>
                    </div>
                </SheetContent>
            </Sheet>

            {/* Pin actual location */}
            <Sheet
                open={sheet === "pin"}
                onOpenChange={(open) => !open && setSheet(null)}
            >
                <SheetContent side="bottom" className="rounded-t-3xl pb-[max(env(safe-area-inset-bottom),16px)]">
                    <SheetHeader>
                        <SheetTitle className="text-base">{t("pinTitle")}</SheetTitle>
                    </SheetHeader>
                    <p className="mt-2 text-sm text-muted-foreground">
                        {t("pinBody")}
                    </p>
                    <div className="mt-4">
                        <AddressPinPicker
                            value={{ lat: order.address_lat, lng: order.address_lng }}
                            onChange={(v) => {
                                if (v.lat != null && v.lng != null) {
                                    setPinLat(v.lat);
                                    setPinLng(v.lng);
                                }
                            }}
                            searchPlaceholder={t("pinSearchPlaceholder")}
                            heightClassName="h-56"
                        />
                    </div>
                    <div className="mt-4 grid gap-2.5">
                        <Button
                            type="button"
                            size="lg"
                            className="h-12 rounded-2xl text-sm font-bold"
                            disabled={busy || pinLat == null || pinLng == null}
                            onClick={runPin}
                        >
                            {busy && <Loader2 className="size-4 animate-spin" />}
                            {t("confirmPin")}
                        </Button>
                        <Button
                            type="button"
                            variant="ghost"
                            className="h-12 rounded-2xl text-sm"
                            onClick={() => {
                                setSheet(null);
                                setPinLat(null);
                                setPinLng(null);
                            }}
                        >
                            {t("cancel")}
                        </Button>
                    </div>
                </SheetContent>
            </Sheet>
        </Card>
    );
}