"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Check, Copy, MessageCircle, QrCode, Share2 } from "lucide-react";
import { toast } from "sonner";

import { CourierShareDialog } from "@/components/admin/courier-share-dialog";
import { Button } from "@/components/ui/button";

interface CourierShareCardProps {
    courierId: string;
    courierName: string;
    accessToken: string;
}

export function CourierShareCard({
    courierId,
    courierName,
    accessToken,
}: CourierShareCardProps) {
    const t = useTranslations("admin.couriers");
    const [dialogOpen, setDialogOpen] = useState(false);
    const [copied, setCopied] = useState(false);

    const portalUrl =
        typeof window !== "undefined"
            ? `${window.location.origin}/courier/${accessToken}`
            : `/courier/${accessToken}`;

    async function copyLink() {
        if (!navigator.clipboard) return;
        await navigator.clipboard.writeText(portalUrl);
        setCopied(true);
        toast.success(t("copiedToast"));
        setTimeout(() => setCopied(false), 2000);
    }

    function shareWhatsApp() {
        const text = encodeURIComponent(
            `${t("whatsAppMessage", { name: courierName })} ${portalUrl}`
        );
        window.open(`https://wa.me/?text=${text}`, "_blank", "noopener");
    }

    return (
        <div className="rounded-2xl border border-border/70 bg-card p-4 shadow-soft">
            <div className="flex items-center gap-2 text-sm font-bold">
                <Share2 className="size-4 text-primary" />
                {t("courierLink")}
            </div>

            <div className="mt-3 flex items-center gap-2 rounded-xl border border-border/70 bg-muted/40 px-3 py-2.5">
                <span
                    className="min-w-0 flex-1 truncate font-mono text-xs"
                    dir="ltr"
                >
                    {portalUrl}
                </span>
                <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="size-8 shrink-0"
                    onClick={copyLink}
                    aria-label={t("copyLink")}
                >
                    {copied ? (
                        <Check className="size-4 text-emerald-600" />
                    ) : (
                        <Copy className="size-4" />
                    )}
                </Button>
            </div>

            <div className="mt-2 grid grid-cols-3 gap-2">
                <Button type="button" variant="outline" size="sm" className="rounded-xl" onClick={copyLink}>
                    <Copy className="size-3.5" />
                    {t("copyLink")}
                </Button>
                <Button type="button" variant="outline" size="sm" className="rounded-xl" onClick={shareWhatsApp}>
                    <MessageCircle className="size-3.5 text-emerald-600" />
                    {t("whatsApp")}
                </Button>
                <Button type="button" variant="outline" size="sm" className="rounded-xl" onClick={() => setDialogOpen(true)}>
                    <QrCode className="size-3.5 text-primary" />
                    {t("qrCode")}
                </Button>
            </div>

            <CourierShareDialog
                open={dialogOpen}
                onOpenChange={setDialogOpen}
                courierId={courierId}
                courierName={courierName}
                accessToken={accessToken}
            />
        </div>
    );
}