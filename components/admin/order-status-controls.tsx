"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import {
    Check,
    ChefHat,
    CheckCircle2,
    Clock,
    CreditCard,
    Loader2,
    Truck,
    XCircle,
    ArrowLeft,
} from "lucide-react";
import { toast } from "sonner";

import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
    AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import {
    cancelOrderAction,
    setPaymentStatusAction,
    updateOrderStatusAction,
} from "@/lib/actions/orders-admin";
import {
    NEXT_LOGICAL_STATUS,
    NEXT_STATUS_ACTION_LABELS,
    ORDER_STATUS_LABELS,
    ORDER_STATUS_STEPS,
    PAYMENT_STATUS_LABELS,
} from "@/lib/constants";
import { cn } from "@/lib/utils";
import type { OrderStatus, PaymentStatus } from "@/types/database.types";

const STATUS_ICONS: Record<string, React.ElementType> = {
    pending: Clock,
    confirmed: CheckCircle2,
    preparing: ChefHat,
    out_for_delivery: Truck,
    delivered: Check,
};

export function OrderStatusControls({
    orderId,
    currentStatus,
    paymentStatus,
}: {
    orderId: string;
    currentStatus: OrderStatus;
    paymentStatus: PaymentStatus;
}) {
    const router = useRouter();
    const t = useTranslations("admin.orders");
    const tRoot = useTranslations();
    const [pending, startTransition] = useTransition();

    const nextStatus = NEXT_LOGICAL_STATUS[currentStatus];
    const nextActionLabel = NEXT_STATUS_ACTION_LABELS[currentStatus];
    const isCanceled = currentStatus === "canceled";
    const currentStepIndex = ORDER_STATUS_STEPS.indexOf(currentStatus);

    const canCancel = currentStatus !== "delivered" && currentStatus !== "canceled";

    function handleStatusChange(toStatus: OrderStatus) {
        startTransition(async () => {
            const res = await updateOrderStatusAction({
                order_id: orderId,
                to_status: toStatus,
            });
            if (res?.error) {
                toast.error(res.error);
                return;
            }
            toast.success(
                t("statusUpdatedToast", {
                    status: tRoot(ORDER_STATUS_LABELS[toStatus]),
                })
            );
            router.refresh();
        });
    }

    function handlePaymentChange(value: string) {
        startTransition(async () => {
            const res = await setPaymentStatusAction({
                order_id: orderId,
                payment_status: value as PaymentStatus,
            });
            if (res?.error) {
                toast.error(res.error);
                return;
            }
            toast.success(t("paymentUpdatedToast"));
            router.refresh();
        });
    }

    function handleCancel() {
        startTransition(async () => {
            const res = await cancelOrderAction({ order_id: orderId });
            if (res?.error) {
                toast.error(res.error);
                return;
            }
            toast.success(t("canceledToast"));
            router.refresh();
        });
    }

    return (
        <div className="space-y-6">
            {/* Visual Stepper */}
            {!isCanceled && (
                <div className="relative rounded-xl border border-border/60 bg-muted/20 p-4">
                    <div className="mb-2 text-xs font-semibold text-muted-foreground">
                        {t("progressSteps")}
                    </div>
                    <div className="flex items-center justify-between gap-1 overflow-x-auto pb-1">
                        {ORDER_STATUS_STEPS.map((stepKey, idx) => {
                            const isCurrent = idx === currentStepIndex;
                            const isPassed = idx < currentStepIndex;
                            const Icon = STATUS_ICONS[stepKey] || Clock;

                            return (
                                <div
                                    key={stepKey}
                                    className="flex flex-1 flex-col items-center gap-1 min-w-[70px]"
                                >
                                    <div
                                        className={cn(
                                            "flex size-8 items-center justify-center rounded-full text-xs font-bold transition-all",
                                            isCurrent &&
                                            "bg-primary text-primary-foreground shadow-lift scale-105",
                                            isPassed &&
                                            "bg-primary/20 text-primary font-semibold",
                                            !isCurrent &&
                                            !isPassed &&
                                            "bg-muted text-muted-foreground/60"
                                        )}
                                    >
                                        <Icon className="size-4" />
                                    </div>
                                    <span
                                        className={cn(
                                            "text-[11px] text-center whitespace-nowrap",
                                            isCurrent && "font-bold text-primary",
                                            isPassed && "text-foreground font-medium",
                                            !isCurrent && !isPassed && "text-muted-foreground/70"
                                        )}
                                    >
                                        {tRoot(ORDER_STATUS_LABELS[stepKey])}
                                    </span>
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}

            {/* Quick Actions Row */}
            <div className="flex flex-wrap items-center justify-between gap-4">
                <div className="flex flex-wrap items-center gap-3">
                    {/* Primary Next Action Button */}
                    {nextStatus && nextActionLabel && !isCanceled && (
                        <Button
                            size="default"
                            disabled={pending}
                            onClick={() => handleStatusChange(nextStatus)}
                            className="gap-2 rounded-xl font-bold shadow-soft"
                        >
                            {pending ? (
                                <Loader2 className="size-4 animate-spin" />
                            ) : (
                                <>
                                    <span>{tRoot(nextActionLabel)}</span>
                                    <ArrowLeft className="size-4" />
                                </>
                            )}
                        </Button>
                    )}

                    {/* Change to any status dropdown */}
                    <div className="flex items-center gap-2">
                        <span className="text-xs text-muted-foreground">{t("changeStatus")}</span>
                        <Select
                            value={currentStatus}
                            onValueChange={(val) => handleStatusChange(val as OrderStatus)}
                            disabled={pending}
                        >
                            <SelectTrigger className="w-36 rounded-xl" size="sm">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                {ORDER_STATUS_STEPS.map((s) => (
                                    <SelectItem key={s} value={s}>
                                        {tRoot(ORDER_STATUS_LABELS[s])}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    {/* Payment Status Dropdown */}
                    <div className="flex items-center gap-2">
                        <span className="flex items-center gap-1 text-xs text-muted-foreground">
                            <CreditCard className="size-3.5" />
                            {t("paymentColon")}
                        </span>
                        <Select
                            value={paymentStatus}
                            onValueChange={handlePaymentChange}
                            disabled={pending}
                        >
                            <SelectTrigger className="w-36 rounded-xl" size="sm">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                {(Object.keys(PAYMENT_STATUS_LABELS) as PaymentStatus[]).map(
                                    (s) => (
                                        <SelectItem key={s} value={s}>
                                            {tRoot(PAYMENT_STATUS_LABELS[s])}
                                        </SelectItem>
                                    )
                                )}
                            </SelectContent>
                        </Select>
                    </div>
                </div>

                {/* Cancel Button */}
                {canCancel && (
                    <AlertDialog>
                        <AlertDialogTrigger asChild>
                            <Button
                                size="sm"
                                variant="outline"
                                disabled={pending}
                                className="rounded-xl border-destructive/30 text-destructive hover:bg-destructive/10"
                            >
                                <XCircle className="size-4" />
                                {t("cancelOrder")}
                            </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                            <AlertDialogHeader>
                                <AlertDialogTitle>{t("cancelTitle")}</AlertDialogTitle>
                                <AlertDialogDescription>
                                    {t("cancelDesc")}
                                </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                                <AlertDialogCancel>{t("cancel")}</AlertDialogCancel>
                                <AlertDialogAction
                                    onClick={handleCancel}
                                    disabled={pending}
                                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                >
                                    {pending ? (
                                        <Loader2 className="size-4 animate-spin" />
                                    ) : (
                                        t("confirmCancel")
                                    )}
                                </AlertDialogAction>
                            </AlertDialogFooter>
                        </AlertDialogContent>
                    </AlertDialog>
                )}
            </div>
        </div>
    );
}
