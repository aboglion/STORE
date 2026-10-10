"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useLocale, useTranslations } from "next-intl";
import {
    CheckCircle2,
    Clock,
    MapPin,
    PackageCheck,
    ShoppingBag,
    User,
} from "lucide-react";
import QRCode from "qrcode";

import { QrCodeCard } from "@/components/store/qr-code-card";
import { Button } from "@/components/ui/button";
import { getPublicOrder, type PublicOrder } from "@/lib/actions/orders-public";
import { PAYMENT_METHOD_LABELS } from "@/lib/constants";
import { localizedText, type Locale } from "@/lib/i18n/config";
import { formatILS } from "@/lib/utils/currency";
import { formatDateTime } from "@/lib/utils/dates";
import { getStoredRecentOrders } from "@/lib/utils/recent-orders";

/**
 * Order success screen. The order is fetched client-side using the phone
 * number saved on this device at checkout — order numbers alone can no
 * longer be used to look up orders (privacy/security).
 */
export function OrderSuccessView({
    orderNumber,
    total,
}: {
    orderNumber: string;
    total?: string;
}) {
    const locale = useLocale() as Locale;
    const t = useTranslations("orderSuccess");
    const tp = useTranslations("payment");

    const [order, setOrder] = useState<PublicOrder | null>(null);
    const [qrDataUrl, setQrDataUrl] = useState("");

    const totalAgorot = order?.total_agorot ?? (total ? Number(total) : null);

    useEffect(() => {
        const stored = getStoredRecentOrders();
        const entry = stored.find((s) => s.orderNumber === orderNumber);
        if (!entry?.phone) return;
        getPublicOrder(orderNumber, entry.phone).then((res) => {
            if (res) setOrder(res);
        });
    }, [orderNumber]);

    useEffect(() => {
        const siteUrl = window.location.origin;
        const trackingUrl = `${siteUrl}/orders?order=${encodeURIComponent(orderNumber)}`;
        QRCode.toDataURL(trackingUrl, {
            width: 320,
            margin: 2,
            color: { dark: "#2b1c11", light: "#ffffff" },
            errorCorrectionLevel: "M",
        })
            .then(setQrDataUrl)
            .catch(() => {
                // QR generation is best-effort.
            });
    }, [orderNumber]);

    const trackingUrl =
        typeof window !== "undefined"
            ? `${window.location.origin}/orders?order=${encodeURIComponent(orderNumber)}`
            : "";

    return (
        <div className="mx-auto flex max-w-lg flex-col items-center gap-6 py-6 text-center sm:py-10">
            {/* Animated check badge */}
            <div className="relative">
                <div className="absolute inset-0 rounded-full bg-[oklch(0.6_0.15_130)]/20 animate-ring-pulse" />
                <div className="relative flex size-20 items-center justify-center rounded-full bg-gradient-to-br from-[oklch(0.65_0.13_130)] to-[oklch(0.55_0.12_70)] text-white shadow-lift animate-pop-in">
                    <CheckCircle2 className="size-10" />
                </div>
            </div>

            <div>
                <h1 className="font-display text-3xl font-extrabold tracking-tight sm:text-4xl">
                    {t("title")}!
                </h1>
                <p className="mt-2 text-sm text-muted-foreground sm:text-base">
                    {t("subtitle")}
                </p>
            </div>

            {/* Order Summary Card */}
            <div className="w-full rounded-2xl border border-border/70 bg-card p-5 text-start shadow-soft">
                <div className="flex items-center justify-between border-b border-border/60 pb-3">
                    <span className="text-sm text-muted-foreground">{t("orderNumber")}</span>
                    <span className="font-mono text-base font-bold text-primary" dir="ltr">
                        {orderNumber}
                    </span>
                </div>

                {order && (
                    <div className="mt-3 space-y-2.5 text-xs sm:text-sm text-muted-foreground">
                        {order.customer_name_snapshot && (
                            <div className="flex items-center justify-between">
                                <span className="flex items-center gap-1.5">
                                    <User className="size-3.5 text-primary" />
                                    {t("customerName")}
                                </span>
                                <span className="font-medium text-foreground">
                                    {order.customer_name_snapshot}
                                </span>
                            </div>
                        )}

                        {order.address_snapshot?.full_address && (
                            <div className="flex items-center justify-between">
                                <span className="flex items-center gap-1.5">
                                    <MapPin className="size-3.5 text-primary" />
                                    {t("deliveryAddress")}
                                </span>
                                <span className="font-medium text-foreground">
                                    {order.address_snapshot.full_address}
                                </span>
                            </div>
                        )}

                        {order.payment_method && (
                            <div className="flex items-center justify-between">
                                <span>{t("paymentMethod")}</span>
                                <span className="font-medium text-foreground">
                                    {tp(PAYMENT_METHOD_LABELS[order.payment_method]) ??
                                        order.payment_method}
                                </span>
                            </div>
                        )}

                        {order.placed_at && (
                            <div className="flex items-center justify-between">
                                <span className="flex items-center gap-1.5">
                                    <Clock className="size-3.5 text-muted-foreground" />
                                    {t("orderTime")}
                                </span>
                                <span className="font-medium text-foreground">
                                    {formatDateTime(order.placed_at, locale)}
                                </span>
                            </div>
                        )}

                        {/* Items list preview */}
                        {order.order_items && order.order_items.length > 0 && (
                            <div className="mt-3 rounded-xl border border-border/60 bg-secondary/30 p-3">
                                <div className="mb-2 font-semibold text-foreground">{t("orderedItems")}</div>
                                <div className="space-y-1.5">
                                    {order.order_items.map((item) => (
                                        <div
                                            key={item.id}
                                            className="flex items-center justify-between text-xs"
                                        >
                                            <span>
                                                {item.quantity} ×{" "}
                                                {localizedText(
                                                    locale,
                                                    item.product_name_snapshot,
                                                    item.product_name_ar_snapshot
                                                )}
                                            </span>
                                            <span className="font-medium text-foreground">
                                                {formatILS(item.line_total_agorot, locale)}
                                            </span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                )}

                {totalAgorot != null && (
                    <div className="mt-3 flex items-center justify-between border-t border-border/70 pt-3">
                        <span className="text-sm font-medium text-foreground">{t("totalToPay")}</span>
                        <span className="font-display text-xl font-bold text-primary">
                            {formatILS(totalAgorot, locale)}
                        </span>
                    </div>
                )}
            </div>

            {/* QR Code Barcode Card */}
            {qrDataUrl && (
                <QrCodeCard
                    orderNumber={orderNumber}
                    totalAgorot={totalAgorot}
                    customerName={order?.customer_name_snapshot}
                    phone={order?.customer_phone_snapshot}
                    qrDataUrl={qrDataUrl}
                    trackingUrl={trackingUrl}
                />
            )}

            <div className="flex w-full flex-col gap-2.5 sm:flex-row">
                <Button asChild size="lg" className="flex-1 rounded-full shadow-soft">
                    <Link href={`/orders?order=${encodeURIComponent(orderNumber)}`}>
                        <PackageCheck className="size-4" />
                        {t("trackOrder")}
                    </Link>
                </Button>
                <Button asChild variant="outline" size="lg" className="flex-1 rounded-full">
                    <Link href="/">
                        <ShoppingBag className="size-4" />
                        {t("backToCatalog")}
                    </Link>
                </Button>
            </div>
        </div>
    );
}