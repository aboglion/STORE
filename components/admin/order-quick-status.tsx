"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import {
    Check,
    ChefHat,
    ChevronDown,
    Loader2,
    Truck,
    XCircle,
    CheckCircle2,
} from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { OrderStatusBadge } from "@/components/admin/order-status-badge";
import {
    cancelOrderAction,
    updateOrderStatusAction,
} from "@/lib/actions/orders-admin";
import {
    NEXT_LOGICAL_STATUS,
    NEXT_STATUS_ACTION_LABELS,
    ORDER_STATUS_LABELS,
} from "@/lib/constants";
import type { OrderStatus } from "@/types/database.types";

interface OrderQuickStatusProps {
    orderId: string;
    currentStatus: OrderStatus;
    compact?: boolean;
}

export function OrderQuickStatus({
    orderId,
    currentStatus,
    compact = false,
}: OrderQuickStatusProps) {
    const router = useRouter();
    const t = useTranslations("admin.orders");
    const tRoot = useTranslations();
    const [pending, startTransition] = useTransition();

    const nextStatus = NEXT_LOGICAL_STATUS[currentStatus];
    const nextActionLabel = NEXT_STATUS_ACTION_LABELS[currentStatus];

    function handleUpdateStatus(toStatus: OrderStatus) {
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

    function handleCancel() {
        if (!confirm(t("confirmCancelMsg"))) {
            return;
        }
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

    const allStatuses: OrderStatus[] = [
        "pending",
        "confirmed",
        "preparing",
        "out_for_delivery",
        "delivered",
    ];

    return (
        <div
            className="flex items-center gap-1.5"
            onClick={(e) => e.stopPropagation()}
        >
            <OrderStatusBadge status={currentStatus} />

            {/* Quick advance button for the logical next status */}
            {nextStatus && nextActionLabel && currentStatus !== "canceled" && (
                <Button
                    type="button"
                    size="sm"
                    variant={currentStatus === "pending" ? "default" : "secondary"}
                    disabled={pending}
                    onClick={() => handleUpdateStatus(nextStatus)}
                    className="h-7 rounded-lg px-2 text-[11px] font-medium gap-1 shadow-xs transition-transform active:scale-95"
                    title={t("advanceTo", {
                        status: tRoot(ORDER_STATUS_LABELS[nextStatus]),
                    })}
                >
                    {pending ? (
                        <Loader2 className="size-3 animate-spin" />
                    ) : currentStatus === "pending" ? (
                        <Check className="size-3" />
                    ) : currentStatus === "confirmed" ? (
                        <ChefHat className="size-3" />
                    ) : currentStatus === "preparing" ? (
                        <Truck className="size-3" />
                    ) : (
                        <CheckCircle2 className="size-3" />
                    )}
                    {!compact && <span>{tRoot(nextActionLabel)}</span>}
                </Button>
            )}

            {/* Dropdown for other status options */}
            <DropdownMenu>
                <DropdownMenuTrigger asChild>
                    <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        disabled={pending}
                        className="h-7 w-7 p-0 rounded-lg text-muted-foreground hover:text-foreground hover:bg-accent"
                        title={t("moreOptions")}
                    >
                        <ChevronDown className="size-3.5" />
                    </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-40 text-xs">
                    <div className="px-2 py-1.5 text-[10px] font-semibold text-muted-foreground">
                        {t("changeTo")}
                    </div>
                    {allStatuses.map((s) => (
                        <DropdownMenuItem
                            key={s}
                            disabled={s === currentStatus || pending}
                            onClick={() => handleUpdateStatus(s)}
                            className="cursor-pointer gap-2"
                        >
                            <span
                                className={`size-2 rounded-full ${s === currentStatus
                                        ? "bg-primary"
                                        : "bg-muted-foreground/30"
                                    }`}
                            />
                            {tRoot(ORDER_STATUS_LABELS[s])}
                        </DropdownMenuItem>
                    ))}
                    {currentStatus !== "delivered" && currentStatus !== "canceled" && (
                        <>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                                onClick={handleCancel}
                                disabled={pending}
                                className="cursor-pointer text-destructive focus:text-destructive gap-2"
                            >
                                <XCircle className="size-3.5" />
                                {t("cancelOrder")}
                            </DropdownMenuItem>
                        </>
                    )}
                </DropdownMenuContent>
            </DropdownMenu>
        </div>
    );
}
