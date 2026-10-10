"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Bike, CornerUpLeft, Loader2, UserRound } from "lucide-react";
import { toast } from "sonner";

import {
    OrderAssignDialog,
    type AssignableCourier,
} from "@/components/admin/order-assign-dialog";
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
import { returnOrdersToStoreAction } from "@/lib/actions/couriers";

interface OrderCourierCardProps {
    orderId: string;
    assignedCourierId: string | null;
    assignedAt: string | null;
    couriers: AssignableCourier[];
}

export function OrderCourierCard({
    orderId,
    assignedCourierId,
    assignedAt,
    couriers,
}: OrderCourierCardProps) {
    const t = useTranslations("admin.orders");
    const router = useRouter();

    const [assignOpen, setAssignOpen] = useState(false);
    const [returnOpen, setReturnOpen] = useState(false);
    const [busy, setBusy] = useState(false);

    const assigned = couriers.find((c) => c.id === assignedCourierId) ?? null;

    async function handleReturnToStore() {
        setBusy(true);
        const res = await returnOrdersToStoreAction({ orderIds: [orderId] });
        setBusy(false);
        setReturnOpen(false);
        if (res.error) {
            toast.error(res.error);
            return;
        }
        toast.success(t("returnedToast"));
        router.refresh();
    }

    return (
        <div className="rounded-2xl border border-border/70 bg-card p-4 shadow-soft">
            <div className="flex items-center gap-2 text-sm font-bold">
                <Bike className="size-4 text-primary" />
                {t("courierCardTitle")}
            </div>

            {assigned ? (
                <div className="mt-3 flex items-center gap-3">
                    <span
                        className="size-3.5 shrink-0 rounded-full ring-2 ring-white"
                        style={{ backgroundColor: assigned.color }}
                    />
                    <div className="min-w-0 flex-1">
                        <Link
                            href={`/admin/couriers/${assigned.id}`}
                            className="truncate text-sm font-semibold hover:underline"
                        >
                            {assigned.full_name}
                        </Link>
                        {assignedAt && (
                            <div className="text-xs text-muted-foreground">
                                {t("assignedAt")} ·{" "}
                                <span dir="ltr">
                                    {new Date(assignedAt).toLocaleString()}
                                </span>
                            </div>
                        )}
                    </div>
                    <div className="flex shrink-0 gap-2">
                        <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            className="h-9 rounded-xl"
                            onClick={() => setAssignOpen(true)}
                        >
                            {t("changeCourier")}
                        </Button>
                        <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            className="h-9 rounded-xl text-destructive hover:text-destructive"
                            onClick={() => setReturnOpen(true)}
                            disabled={busy}
                        >
                            {busy ? (
                                <Loader2 className="size-4 animate-spin" />
                            ) : (
                                <CornerUpLeft className="size-4" />
                            )}
                            {t("returnToStore")}
                        </Button>
                    </div>
                </div>
            ) : (
                <div className="mt-3 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <UserRound className="size-4" />
                        {t("noCourierAssigned")}
                    </div>
                    <Button
                        type="button"
                        size="sm"
                        className="h-9 rounded-xl"
                        disabled={couriers.length === 0}
                        onClick={() => setAssignOpen(true)}
                    >
                        <Bike className="size-4" />
                        {t("assignCourier")}
                    </Button>
                </div>
            )}

            <OrderAssignDialog
                open={assignOpen}
                onOpenChange={setAssignOpen}
                orderIds={[orderId]}
                couriers={couriers}
            />

            <AlertDialog open={returnOpen} onOpenChange={setReturnOpen}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>{t("returnConfirmTitle")}</AlertDialogTitle>
                        <AlertDialogDescription>
                            {t("returnConfirmBody")}
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>{t("cancelAssign")}</AlertDialogCancel>
                        <AlertDialogAction disabled={busy} onClick={handleReturnToStore}>
                            {t("returnToStore")}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
}