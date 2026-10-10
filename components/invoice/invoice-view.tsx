"use client";

import { useEffect, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Printer, Receipt } from "lucide-react";
import QRCode from "qrcode";

import { InvoiceBarcode } from "@/components/invoice/invoice-barcode";
import { StoreLogo } from "@/components/store/store-logo";
import { Button } from "@/components/ui/button";
import { composeAddressLine } from "@/lib/utils/address";
import { formatILS } from "@/lib/utils/currency";
import { formatDateTime } from "@/lib/utils/dates";
import type { Locale } from "@/lib/i18n/config";
import type { OrderDetail } from "@/lib/data/orders";
import type { AppSettings } from "@/types/database.types";

interface InvoiceViewProps {
    detail: OrderDetail;
    settings: AppSettings;
}

const PAYMENT_METHOD_KEYS = {
    cash: "payment.cash",
    card_gateway: "payment.card_gateway",
    card_link: "payment.card_link",
    card_terminal: "payment.card_terminal",
} as const;

const PAYMENT_STATUS_KEYS = {
    unpaid: "payment.unpaid",
    authorized: "payment.authorized",
    paid: "payment.paid",
    failed: "payment.failed",
    refunded: "payment.refunded",
} as const;

export function InvoiceView({ detail, settings }: InvoiceViewProps) {
    const { order, items } = detail;
    const t = useTranslations("invoice");
    const tr = useTranslations();
    const locale = (useLocale() as Locale) ?? "he";

    const [trackingQr, setTrackingQr] = useState("");

    const address = (order.address_snapshot as {
        full_address: string;
        street?: string | null;
        house_number?: string | null;
        entrance?: string | null;
        apartment?: string | null;
        city?: string | null;
    } | null) ?? null;

    const addressText = address
        ? composeAddressLine({
            full_address: address.full_address,
            street: address.street,
            house_number: address.house_number,
            entrance: address.entrance,
            apartment: address.apartment,
            city: address.city,
        })
        : "";

    useEffect(() => {
        const siteUrl = window.location.origin;
        const trackingUrl = `${siteUrl}/orders?order=${encodeURIComponent(order.order_number)}`;
        QRCode.toDataURL(trackingUrl, {
            width: 180,
            margin: 1,
            color: { dark: "#111827", light: "#ffffff" },
            errorCorrectionLevel: "M",
        })
            .then(setTrackingQr)
            .catch(() => undefined);
    }, [order.order_number]);

    const paymentMethodLabel = tr(PAYMENT_METHOD_KEYS[order.payment_method]);
    const paymentStatusLabel = tr(PAYMENT_STATUS_KEYS[order.payment_status]);
    const isPaid = order.payment_status === "paid";
    const isCash = order.payment_method === "cash";

    return (
        <div className="mx-auto flex w-full max-w-2xl flex-col items-center gap-4 px-4 py-6">
            {/* Print / actions (hidden in print) */}
            <div className="flex w-full items-center justify-between print:hidden">
                <div className="text-sm font-semibold">{t("title")}</div>
                <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="rounded-xl"
                    onClick={() => window.print()}
                >
                    <Printer className="size-4" />
                    {t("print")}
                </Button>
            </div>

            {/* Printable invoice */}
            <div className="w-full overflow-hidden rounded-3xl border border-border/70 bg-white text-slate-900 shadow-soft print:rounded-none print:border-0 print:shadow-none">
                {/* Header */}
                <div className="flex items-center justify-between gap-3 border-b border-slate-200 px-6 py-5">
                    <div className="flex items-center gap-3">
                        <StoreLogo
                            logoUrl={settings.logo_url}
                            name={settings.store_name}
                            iconClassName="size-9 rounded-xl"
                            className="size-9 rounded-xl"
                        />
                        <div>
                            <div className="font-display text-lg font-extrabold">
                                {settings.legal_business_name || settings.store_name}
                            </div>
                            <div className="text-xs text-slate-500">
                                ח.פ / ע.מ: <span className="font-mono">{settings.business_id || "516000000"}</span>
                            </div>
                            <div className="text-xs text-slate-500">
                                {settings.business_address || "רחוב הרצל 1, תל אביב-יפו"}
                            </div>
                            {settings.contact_phone && (
                                <div className="text-xs text-slate-500" dir="ltr">
                                    {settings.contact_phone}
                                </div>
                            )}
                        </div>
                    </div>
                    <div className="text-end">
                        <div className="flex items-center justify-end gap-1.5 text-sm font-semibold text-slate-500">
                            <Receipt className="size-4" />
                            {t("receipt")}
                        </div>
                        <div className="mt-0.5 font-mono text-sm font-bold" dir="ltr">
                            {order.order_number}
                        </div>
                        <div className="text-[10px] text-emerald-600 font-semibold mt-0.5">
                            כולל מע״מ כחוק
                        </div>
                    </div>
                </div>

                {/* Meta */}
                <div className="grid grid-cols-2 gap-x-4 gap-y-3 border-b border-slate-200 px-6 py-4 text-sm">
                    <div>
                        <div className="text-xs font-semibold text-slate-400">
                            {t("customer")}
                        </div>
                        <div className="mt-0.5 font-semibold">{order.customer_name_snapshot}</div>
                        <div className="text-xs text-slate-500" dir="ltr">
                            {order.customer_phone_snapshot}
                        </div>
                    </div>
                    <div className="text-end">
                        <div className="text-xs font-semibold text-slate-400">
                            {t("placedAt")}
                        </div>
                        <div className="mt-0.5 font-semibold" dir="ltr">
                            {formatDateTime(order.placed_at, locale)}
                        </div>
                    </div>
                    {addressText && (
                        <div className="col-span-2">
                            <div className="text-xs font-semibold text-slate-400">
                                {t("address")}
                            </div>
                            <div className="mt-0.5" dir="auto">
                                {addressText}
                            </div>
                        </div>
                    )}
                </div>

                {/* Items */}
                <table className="w-full text-sm">
                    <thead>
                        <tr className="border-b border-slate-200 text-xs text-slate-400">
                            <th className="px-6 py-2 text-start font-semibold">{t("item")}</th>
                            <th className="px-3 py-2 text-center font-semibold">{t("qty")}</th>
                            <th className="px-3 py-2 text-end font-semibold">{t("price")}</th>
                            <th className="px-6 py-2 text-end font-semibold">{t("total")}</th>
                        </tr>
                    </thead>
                    <tbody>
                        {items.map((item) => (
                            <tr
                                key={item.id}
                                className="border-b border-slate-100 last:border-0"
                            >
                                <td className="max-w-0 px-6 py-2.5">
                                    <span className="line-clamp-2">{item.product_name_snapshot}</span>
                                </td>
                                <td className="px-3 py-2.5 text-center text-slate-500">
                                    {item.quantity}
                                </td>
                                <td className="px-3 py-2.5 text-end" dir="ltr">
                                    {formatILS(item.unit_price_agorot, locale)}
                                </td>
                                <td className="px-6 py-2.5 text-end font-medium" dir="ltr">
                                    {formatILS(item.line_total_agorot, locale)}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>

                {/* Totals */}
                <div className="flex flex-col items-end gap-1 border-t border-slate-200 px-6 py-4 text-sm">
                    <div className="flex w-56 items-center justify-between text-slate-500">
                        <span>{t("subtotal")}</span>
                        <span dir="ltr">{formatILS(order.subtotal_agorot, locale)}</span>
                    </div>
                    {order.delivery_fee_agorot > 0 && (
                        <div className="flex w-56 items-center justify-between text-slate-500">
                            <span>{t("delivery")}</span>
                            <span dir="ltr">{formatILS(order.delivery_fee_agorot, locale)}</span>
                        </div>
                    )}
                    {order.discount_agorot > 0 && (
                        <div className="flex w-56 items-center justify-between text-slate-500">
                            <span>{t("discount")}</span>
                            <span dir="ltr">-{formatILS(order.discount_agorot, locale)}</span>
                        </div>
                    )}
                    <div className="mt-1 flex w-56 items-center justify-between border-t border-slate-200 pt-2 text-base font-extrabold">
                        <span>{t("grandTotal")}</span>
                        <span dir="ltr">{formatILS(order.total_agorot, locale)}</span>
                    </div>
                </div>

                {/* Payment status */}
                <div className="flex items-center gap-3 border-t border-slate-200 bg-slate-50 px-6 py-4">
                    <span
                        className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-bold ${isPaid
                                ? "bg-emerald-100 text-emerald-700"
                                : isCash
                                    ? "bg-amber-100 text-amber-700"
                                    : "bg-slate-200 text-slate-600"
                            }`}
                    >
                        {paymentStatusLabel}
                        {isCash && !isPaid ? ` · ${t("payOnDelivery")}` : ""}
                    </span>
                    <span className="text-xs text-slate-500">
                        {t("paymentMethod")}: {paymentMethodLabel}
                    </span>
                </div>

                {/* Statutory Consumer Protection Note */}
                <div className="border-t border-slate-200 bg-slate-50/70 px-6 py-2.5 text-[11px] text-slate-500 leading-relaxed">
                    מסמך פרטי עסקה וגילוי נאות בהתאם לחוק הגנת הצרכן, התשמ״א-1981. זכות ביטול עסקת מכר מרחוק תוך 14 יום מקבלת המוצר או מסמך הגילוי (4 חודשים לאוכלוסיות מוגנות כקבוע בחוק), למעט טובין פסידים כהגדרתם בסעיף 14ג(ד) לחוק. הודעת ביטול ניתן למסור באתר בלשונית ביטול עסקה או בטלפון {settings.contact_phone || "03-0000000"}.
                </div>

                {/* Barcode + QR */}
                <div className="flex flex-col items-center gap-4 border-t border-slate-200 px-6 py-5 sm:flex-row sm:justify-between">
                    <div className="flex flex-col items-center gap-1">
                        <div className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">
                            {t("scanToHandoff")}
                        </div>
                        <InvoiceBarcode value={order.order_number} />
                    </div>
                    <div className="flex flex-col items-center gap-1">
                        <div className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">
                            {t("scanToTrack")}
                        </div>
                        {trackingQr ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                                src={trackingQr}
                                alt="tracking QR"
                                className="size-28 rounded-lg bg-white"
                            />
                        ) : (
                            <div className="size-28 animate-pulse rounded-lg bg-slate-100" />
                        )}
                    </div>
                </div>
            </div>

            <p className="text-xs text-muted-foreground print:hidden">
                {t("footerHint")}
            </p>
        </div>
    );
}