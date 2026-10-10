"use client";

/**
 * Admin pin-fix dialog: lets an admin correct an order's location on the map.
 * Saving calls updateOrderAddressLocationAction which updates both the order's
 * snapshot and the address row (enriching future orders to the same address).
 */

import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

import { updateOrderAddressLocationAction } from "@/lib/actions/orders-admin";
import { Button } from "@/components/ui/button";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import type { AddressSnapshot } from "@/types/database.types";

const AddressPinPicker = dynamic(
    () =>
        import("@/components/store/address-pin-picker").then(
            (m) => m.AddressPinPicker
        ),
    { ssr: false }
);

export interface OrderLocationFixProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    orderId: string;
    snapshot: AddressSnapshot | null;
}

export function OrderLocationFix({
    open,
    onOpenChange,
    orderId,
    snapshot,
}: OrderLocationFixProps) {
    const router = useRouter();
    const t = useTranslations("admin.orders");
    const [pending, startTransition] = useTransition();
    const [lat, setLat] = useState<number | null>(snapshot?.lat ?? null);
    const [lng, setLng] = useState<number | null>(snapshot?.lng ?? null);

    function save() {
        if (lat == null || lng == null) {
            toast.error(t("locationFixNeedPin"));
            return;
        }
        startTransition(async () => {
            const res = await updateOrderAddressLocationAction({
                order_id: orderId,
                lat,
                lng,
            });
            if (res?.error) {
                toast.error(res.error);
                return;
            }
            toast.success(t("locationFixSaved"));
            onOpenChange(false);
            router.refresh();
        });
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-xl">
                <DialogHeader>
                    <DialogTitle>{t("locationFixTitle")}</DialogTitle>
                    <DialogDescription>
                        {t("locationFixDesc")}
                    </DialogDescription>
                </DialogHeader>

                <AddressPinPicker
                    value={{ lat, lng }}
                    onChange={(v) => {
                        if (v.lat != null && v.lng != null) {
                            setLat(v.lat);
                            setLng(v.lng);
                        }
                    }}
                    searchPlaceholder={t("locationFixSearch")}
                    heightClassName="h-64"
                />

                <DialogFooter>
                    <Button
                        type="button"
                        variant="outline"
                        onClick={() => onOpenChange(false)}
                    >
                        {t("cancel")}
                    </Button>
                    <Button
                        type="button"
                        onClick={save}
                        disabled={pending || lat == null || lng == null}
                    >
                        {pending && <Loader2 className="size-4 animate-spin" />}
                        {t("locationFixSave")}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}