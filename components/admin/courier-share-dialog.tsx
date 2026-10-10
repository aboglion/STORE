"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Check, Copy, MessageCircle, QrCode, RefreshCw } from "lucide-react";
import QRCode from "qrcode";
import { toast } from "sonner";

import { regenerateCourierTokenAction } from "@/lib/actions/couriers";
import { Button } from "@/components/ui/button";
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
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
interface CourierShareDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    courierId: string;
    courierName: string;
    accessToken: string;
}

export function CourierShareDialog({
    open,
    onOpenChange,
    courierId,
    courierName,
    accessToken,
}: CourierShareDialogProps) {
    const t = useTranslations("admin.couriers");
    const router = useRouter();

    const [token, setToken] = useState(accessToken);
    const [qr, setQr] = useState("");
    const [copied, setCopied] = useState(false);
    const [confirmRegen, setConfirmRegen] = useState(false);

    const portalUrl =
        typeof window !== "undefined"
            ? `${window.location.origin}/courier/${token}`
            : `/courier/${token}`;

    useEffect(() => {
        setToken(accessToken);
    }, [accessToken]);

    useEffect(() => {
        if (!open || typeof window === "undefined") return;
        const url = `${window.location.origin}/courier/${token}`;
        QRCode.toDataURL(url, {
            width: 220,
            margin: 1,
            color: { dark: "#1f2937", light: "#ffffff" },
            errorCorrectionLevel: "M",
        })
            .then(setQr)
            .catch(() => setQr(""));
    }, [open, token]);

    async function copyLink() {
        if (!navigator.clipboard) return;
        await navigator.clipboard.writeText(portalUrl);
        setCopied(true);
        toast.success(t("copiedToast"));
        setTimeout(() => setCopied(false), 2000);
    }

    function shareWhatsApp() {
        const text = encodeURIComponent(`${t("whatsAppMessage", { name: courierName })} ${portalUrl}`);
        window.open(`https://wa.me/?text=${text}`, "_blank", "noopener");
    }

    async function handleRegenerate() {
        const res = await regenerateCourierTokenAction({ id: courierId });
        if (res?.error) {
            toast.error(res.error);
            setConfirmRegen(false);
            return;
        }
        if (res?.token) setToken(res.token);
        toast.success(t("regeneratedToast"));
        setConfirmRegen(false);
        router.refresh();
    }

    return (
        <>
            <Dialog open={open} onOpenChange={onOpenChange}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <QrCode className="size-4 text-primary" />
                            {t("shareTitle")}
                        </DialogTitle>
                        <DialogDescription>
                            {t("shareHint", { name: courierName })}
                        </DialogDescription>
                    </DialogHeader>

                    <div className="flex items-center justify-center">
                        <div className="rounded-2xl border-2 border-primary/30 bg-white p-3">
                            {qr ? (
                                // eslint-disable-next-line @next/next/no-img-element
                                <img src={qr} alt="portal QR" className="size-36" />
                            ) : (
                                <div className="size-36 animate-pulse rounded-lg bg-slate-100" />
                            )}
                        </div>
                    </div>

                    <div className="flex items-center gap-2 rounded-xl border border-border/70 bg-muted/40 px-3 py-2.5" dir="ltr">
                        <span className="min-w-0 flex-1 truncate font-mono text-xs">
                            {portalUrl}
                        </span>
                        <Button type="button" variant="ghost" size="icon" className="size-8 shrink-0" onClick={copyLink}>
                            {copied ? (
                                <Check className="size-4 text-emerald-600" />
                            ) : (
                                <Copy className="size-4" />
                            )}
                        </Button>
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                        <Button type="button" variant="outline" className="rounded-xl" onClick={copyLink}>
                            {copied ? <Check className="size-4 text-emerald-600" /> : <Copy className="size-4" />}
                            {t("copyLink")}
                        </Button>
                        <Button type="button" variant="outline" className="rounded-xl" onClick={shareWhatsApp}>
                            <MessageCircle className="size-4 text-emerald-600" />
                            {t("whatsApp")}
                        </Button>
                    </div>

                    <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="mx-auto mt-1 flex items-center gap-1.5 text-xs text-muted-foreground hover:text-destructive"
                        onClick={() => setConfirmRegen(true)}
                    >
                        <RefreshCw className="size-3.5" />
                        {t("regenerateLink")}
                    </Button>
                </DialogContent>
            </Dialog>

            <AlertDialog open={confirmRegen} onOpenChange={setConfirmRegen}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>{t("regenerateTitle")}</AlertDialogTitle>
                        <AlertDialogDescription>
                            {t("regenerateBody")}
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>{t("cancel")}</AlertDialogCancel>
                        <AlertDialogAction onClick={handleRegenerate}>
                            <RefreshCw className="size-4" />
                            {t("regenerateAction")}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </>
    );
}