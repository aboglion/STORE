"use client";

import { useEffect, useRef, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import {
    Banknote,
    Check,
    MapPin,
    Navigation,
    Phone,
    X,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import type { Locale } from "@/lib/i18n/config";
import { formatILS } from "@/lib/utils/currency";
import type { CourierPoolOrder } from "@/types/database.types";

interface OrderRequestPopupProps {
    order: CourierPoolOrder;
    distanceMeters: number | null;
    busy: boolean;
    durationSec?: number;
    onAccept: () => void;
    onDecline: () => void;
    onExpire: () => void;
    /** Stack level — later cards get slightly smaller / lower. */
    depth?: number;
}

export function OrderRequestPopup({
    order,
    distanceMeters,
    busy,
    durationSec = 30,
    onAccept,
    onDecline,
    onExpire,
    depth = 0,
}: OrderRequestPopupProps) {
    const t = useTranslations("courier");
    const locale = (useLocale() as Locale) ?? "he";
    const [secondsLeft, setSecondsLeft] = useState(durationSec);
    const onExpireRef = useRef(onExpire);
    const expiredRef = useRef(false);

    useEffect(() => {
        onExpireRef.current = onExpire;
    }, [onExpire]);

    useEffect(() => {
        const id = setInterval(() => {
            setSecondsLeft((s) => {
                if (s <= 1) {
                    clearInterval(id);
                    return 0;
                }
                return s - 1;
            });
        }, 1000);
        return () => clearInterval(id);
    }, []);

    useEffect(() => {
        if (secondsLeft <= 0 && !expiredRef.current) {
            expiredRef.current = true;
            onExpireRef.current();
        }
    }, [secondsLeft]);

    const progress = (secondsLeft / durationSec) * 100;
    const distanceText =
        distanceMeters != null
            ? distanceMeters >= 1000
                ? `${(distanceMeters / 1000).toFixed(1)} km`
                : `${Math.round(distanceMeters)} m`
            : null;

    return (
        <div
            className="pointer-events-auto animate-in slide-in-from-bottom-4 fade-in duration-200"
            style={{
                transform: `scale(${Math.max(0.94, 1 - depth * 0.03)})`,
                opacity: Math.max(0.6, 1 - depth * 0.25),
            }}
        >
            <div className="relative overflow-hidden rounded-3xl border border-primary/25 bg-card shadow-2xl">
                {/* Countdown progress bar */}
                <div className="h-1 w-full bg-muted">
                    <div
                        className="h-full bg-primary transition-all duration-1000 ease-linear"
                        style={{ width: `${progress}%` }}
                    />
                </div>

                <div className="p-4">
                    <div className="flex items-center justify-between gap-2">
                        <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/15 px-2.5 py-1 text-[11px] font-bold text-emerald-700">
                            <span className="size-1.5 animate-pulse rounded-full bg-emerald-500" />
                            {t("newRequest")}
                        </span>
                        <div className="flex items-center gap-2">
                            {distanceText && (
                                <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2.5 py-1 text-xs font-semibold text-muted-foreground">
                                    <Navigation className="size-3" />
                                    {distanceText}
                                </span>
                            )}
                            <span className="inline-flex size-7 items-center justify-center rounded-full bg-primary/10 font-display text-sm font-extrabold text-primary">
                                {secondsLeft}
                            </span>
                        </div>
                    </div>

                    <div className="mt-2.5 flex items-center justify-between gap-2">
                        <div className="min-w-0">
                            <div className="flex items-center gap-2">
                                <span className="font-mono text-sm font-bold" dir="ltr">
                                    {order.order_number}
                                </span>
                                {order.cash_to_collect && (
                                    <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/15 px-2 py-0.5 text-[11px] font-semibold text-amber-700">
                                        <Banknote className="size-3" />
                                        {formatILS(order.total_agorot, locale)}
                                    </span>
                                )}
                            </div>
                            <div className="mt-0.5 truncate text-sm font-semibold">
                                {order.customer_name}
                            </div>
                        </div>
                        <div className="shrink-0 text-end">
                            <div className="font-display text-base font-extrabold text-primary">
                                {formatILS(order.total_agorot, locale)}
                            </div>
                        </div>
                    </div>

                    <div className="mt-2 flex items-start gap-1.5 text-[13px] text-muted-foreground">
                        <MapPin className="mt-0.5 size-3.5 shrink-0 text-primary" />
                        <span className="line-clamp-1" dir="auto">
                            {order.address_text}
                        </span>
                    </div>

                    <div className="mt-3 grid grid-cols-[1fr_2fr] gap-2">
                        <Button
                            type="button"
                            variant="outline"
                            size="lg"
                            className="h-12 rounded-2xl text-sm font-semibold"
                            onClick={onDecline}
                            disabled={busy}
                        >
                            <X className="size-4" />
                            {t("decline")}
                        </Button>
                        <Button
                            type="button"
                            size="lg"
                            className="h-12 rounded-2xl bg-emerald-600 text-sm font-bold hover:bg-emerald-700"
                            onClick={onAccept}
                            disabled={busy}
                        >
                            <Check className="size-5" />
                            {t("accept")}
                        </Button>
                    </div>
                </div>
            </div>
        </div>
    );
}

/** Small row used inside the list tab for the pending-request summary. */
export function RequestSummaryRow({
    order,
    distanceMeters,
    onAccept,
    onDecline,
    busy,
}: Omit<OrderRequestPopupProps, "onExpire" | "depth" | "durationSec">) {
    const t = useTranslations("courier");
    const locale = (useLocale() as Locale) ?? "he";

    return (
        <div className="rounded-2xl border border-primary/25 bg-gradient-to-br from-primary/10 to-card p-3.5 shadow-soft">
            <div className="flex items-center justify-between gap-2">
                <div className="min-w-0">
                    <div className="flex items-center gap-2">
                        <span className="font-mono text-xs font-bold" dir="ltr">
                            {order.order_number}
                        </span>
                        {distanceMeters != null && (
                            <span className="text-xs text-muted-foreground">
                                {distanceMeters >= 1000
                                    ? `${(distanceMeters / 1000).toFixed(1)} km`
                                    : `${Math.round(distanceMeters)} m`}
                            </span>
                        )}
                    </div>
                    <div className="mt-0.5 truncate text-sm font-semibold">
                        {order.customer_name}
                    </div>
                    <div className="flex items-center gap-1 text-xs text-muted-foreground">
                        <MapPin className="size-3" />
                        <span className="line-clamp-1" dir="auto">
                            {order.address_text}
                        </span>
                    </div>
                </div>
                <div className="shrink-0 text-end">
                    <div className="font-display text-sm font-bold text-primary">
                        {formatILS(order.total_agorot, locale)}
                    </div>
                    <div className="mt-1 flex items-center justify-end gap-1 text-[11px] text-muted-foreground" dir="ltr">
                        <Phone className="size-3" />
                        {order.customer_phone}
                    </div>
                </div>
            </div>
            <div className="mt-2.5 grid grid-cols-[1fr_2fr] gap-2">
                <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="h-10 rounded-xl text-xs font-semibold"
                    onClick={onDecline}
                    disabled={busy}
                >
                    <X className="size-3.5" />
                    {t("decline")}
                </Button>
                <Button
                    type="button"
                    size="sm"
                    className="h-10 rounded-xl bg-emerald-600 text-xs font-bold hover:bg-emerald-700"
                    onClick={onAccept}
                    disabled={busy}
                >
                    <Check className="size-4" />
                    {t("accept")}
                </Button>
            </div>
        </div>
    );
}