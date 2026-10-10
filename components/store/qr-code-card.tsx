"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { Check, Copy, Download, ExternalLink, QrCode } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { saveRecentOrder } from "@/lib/utils/recent-orders";

interface QrCodeCardProps {
    orderNumber: string;
    totalAgorot?: number | null;
    customerName?: string | null;
    phone?: string | null;
    qrDataUrl: string;
    trackingUrl: string;
}

export function QrCodeCard({
    orderNumber,
    totalAgorot,
    customerName,
    phone,
    qrDataUrl,
    trackingUrl,
}: QrCodeCardProps) {
    const t = useTranslations("qr");
    const [copied, setCopied] = useState(false);

    // Ensure order is saved in recent orders on this device
    useEffect(() => {
        if (orderNumber) {
            saveRecentOrder({
                orderNumber,
                phone: phone ?? "",
                totalAgorot: totalAgorot ?? 0,
                placedAt: new Date().toISOString(),
                customerName: customerName || undefined,
            });
        }
    }, [orderNumber, totalAgorot, customerName, phone]);

    function handleCopy() {
        if (navigator.clipboard) {
            navigator.clipboard.writeText(trackingUrl);
            setCopied(true);
            toast.success(t("copiedToast"));
            setTimeout(() => setCopied(false), 2500);
        }
    }

    function handleDownload() {
        const link = document.createElement("a");
        link.href = qrDataUrl;
        link.download = `order-${orderNumber}-qrcode.png`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        toast.success(t("downloadedToast"));
    }

    return (
        <div className="w-full rounded-2xl border border-primary/20 bg-gradient-to-b from-card to-secondary/30 p-5 shadow-soft">
            <div className="flex items-center justify-center gap-2 font-display text-base font-bold text-foreground">
                <span className="flex size-7 items-center justify-center rounded-full bg-primary/10 text-primary">
                    <QrCode className="size-4" />
                </span>
                {t("title")}
            </div>

            <p className="mt-1 text-center text-xs text-muted-foreground">
                {t("hint")}
            </p>

            {/* QR Code Container */}
            <div className="mx-auto my-4 flex size-48 items-center justify-center rounded-2xl border-2 border-primary/30 bg-white p-3 shadow-inner">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                    src={qrDataUrl}
                    alt={t("alt", { orderNumber })}
                    className="size-full object-contain"
                />
            </div>

            {/* Action buttons */}
            <div className="flex flex-col gap-2 sm:flex-row sm:justify-center">
                <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleDownload}
                    className="flex-1 rounded-xl text-xs"
                >
                    <Download className="size-3.5" />
                    {t("download")}
                </Button>

                <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleCopy}
                    className="flex-1 rounded-xl text-xs"
                >
                    {copied ? (
                        <>
                            <Check className="size-3.5 text-emerald-600" />
                            {t("copied")}
                        </>
                    ) : (
                        <>
                            <Copy className="size-3.5" />
                            {t("copyLink")}
                        </>
                    )}
                </Button>
            </div>

            <div className="mt-3 text-center">
                <Button asChild size="sm" className="w-full rounded-xl text-xs font-semibold">
                    <Link href={`/orders?order=${encodeURIComponent(orderNumber)}`}>
                        <ExternalLink className="size-3.5" />
                        {t("viewTrack")}
                    </Link>
                </Button>
            </div>
        </div>
    );
}
