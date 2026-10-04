"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";

import { Loader2, XCircle } from "lucide-react";
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
    ORDER_STATUS_LABELS,
    ORDER_STATUS_TRANSITIONS,
    PAYMENT_STATUS_LABELS,
} from "@/lib/constants";
import type { OrderStatus, PaymentStatus } from "@/types/database.types";

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
    const [pending, startTransition] = useTransition();

    const nextStatuses = (ORDER_STATUS_TRANSITIONS[currentStatus] ?? []).filter(
        (s) => s !== "canceled"
    );
    const canCancel =
        currentStatus !== "delivered" && currentStatus !== "canceled";

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
            toast.success("הסטטוס עודכן");
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
            toast.success("סטטוס התשלום עודכן");
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
            toast.success("ההזמנה בוטלה והמלאי הוחזר");
            router.refresh();
        });
    }

    return (
        <div className="flex flex-wrap items-center gap-2">
            {nextStatuses.map((status) => (
                <Button
                    key={status}
                    size="sm"
                    variant="outline"
                    disabled={pending}
                    onClick={() => handleStatusChange(status)}
                >
                    {ORDER_STATUS_LABELS[status]}
                </Button>
            ))}

            <Select value={paymentStatus} onValueChange={handlePaymentChange}>
                <SelectTrigger className="w-40" size="sm">
                    <SelectValue />
                </SelectTrigger>
                <SelectContent>
                    {(Object.keys(PAYMENT_STATUS_LABELS) as PaymentStatus[]).map((s) => (
                        <SelectItem key={s} value={s}>
                            {PAYMENT_STATUS_LABELS[s]}
                        </SelectItem>
                    ))}
                </SelectContent>
            </Select>

            {canCancel && (
                <AlertDialog>
                    <AlertDialogTrigger asChild>
                        <Button size="sm" variant="destructive" disabled={pending}>
                            <XCircle className="size-4" />
                            ביטול הזמנה
                        </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                        <AlertDialogHeader>
                            <AlertDialogTitle>לבטל את ההזמנה?</AlertDialogTitle>
                            <AlertDialogDescription>
                                ביטול יחזיר את המוצרים למלאי ויתועד ביומן ההזמנה.
                            </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                            <AlertDialogCancel>ביטול</AlertDialogCancel>
                            <AlertDialogAction onClick={handleCancel} disabled={pending}>
                                {pending ? (
                                    <Loader2 className="size-4 animate-spin" />
                                ) : (
                                    "בטל הזמנה"
                                )}
                            </AlertDialogAction>
                        </AlertDialogFooter>
                    </AlertDialogContent>
                </AlertDialog>
            )}
        </div>
    );
}