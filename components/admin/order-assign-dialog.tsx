"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Bike, Loader2, PackageOpen } from "lucide-react";
import { toast } from "sonner";

import { assignOrdersAction } from "@/lib/actions/couriers";
import { Button } from "@/components/ui/button";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { cn } from "@/lib/utils";

export interface AssignableCourier {
    id: string;
    full_name: string;
    color: string;
    is_active: boolean;
    active_orders_count: number;
}

interface OrderAssignDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    orderIds: string[];
    couriers: AssignableCourier[];
}

export function OrderAssignDialog({
    open,
    onOpenChange,
    orderIds,
    couriers,
}: OrderAssignDialogProps) {
    const t = useTranslations("admin.orders");
    const router = useRouter();

    const [selectedId, setSelectedId] = useState<string | null>(null);
    const [pending, setPending] = useState(false);

    const active = couriers.filter((c) => c.is_active);

    async function handleAssign() {
        if (!selectedId || orderIds.length === 0) return;
        setPending(true);
        const res = await assignOrdersAction({
            order_ids: orderIds,
            courier_id: selectedId,
        });
        setPending(false);

        if (res.error) {
            toast.error(res.error);
            return;
        }

        toast.success(
            t("assignedToast", {
                count: res.updated ?? orderIds.length,
                courier: active.find((c) => c.id === selectedId)?.full_name ?? "",
            })
        );
        setSelectedId(null);
        onOpenChange(false);
        router.refresh();
    }

    const selectable = active.filter((c) => c.id !== null);
    void selectable;

    return (
        <Dialog
            open={open}
            onOpenChange={(next) => {
                if (!next && !pending) {
                    setSelectedId(null);
                    onOpenChange(false);
                }
            }}
        >
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <Bike className="size-4 text-primary" />
                        {t("assignTitle", { count: orderIds.length })}
                    </DialogTitle>
                    <DialogDescription>{t("assignHint")}</DialogDescription>
                </DialogHeader>

                {active.length === 0 ? (
                    <div className="flex flex-col items-center gap-2 rounded-2xl border border-dashed border-border/70 px-6 py-8 text-center">
                        <PackageOpen className="size-6 text-muted-foreground" />
                        <p className="text-sm text-muted-foreground">
                            {t("noCouriers")}
                        </p>
                    </div>
                ) : (
                    <RadioGroup
                        value={selectedId ?? ""}
                        onValueChange={setSelectedId}
                        className="max-h-72 space-y-2 overflow-y-auto pe-1"
                    >
                        {active.map((courier) => (
                            <label
                                key={courier.id}
                                className={cn(
                                    "flex cursor-pointer items-center gap-3 rounded-2xl border px-4 py-3 transition-all",
                                    selectedId === courier.id
                                        ? "border-primary/60 bg-primary/5 ring-2 ring-primary/15"
                                        : "border-border/70 hover:bg-accent/50"
                                )}
                            >
                                <RadioGroupItem
                                    value={courier.id}
                                    className="peer sr-only"
                                />
                                <span
                                    className="size-3.5 shrink-0 rounded-full ring-2 ring-white"
                                    style={{ backgroundColor: courier.color }}
                                />
                                <span className="min-w-0 flex-1 text-sm font-semibold">
                                    {courier.full_name}
                                </span>
                                <span className="shrink-0 text-xs text-muted-foreground">
                                    {t("activeOrders", {
                                        count: courier.active_orders_count,
                                    })}
                                </span>
                            </label>
                        ))}
                    </RadioGroup>
                )}

                <DialogFooter>
                    <Button
                        type="button"
                        variant="ghost"
                        onClick={() => {
                            setSelectedId(null);
                            onOpenChange(false);
                        }}
                        disabled={pending}
                    >
                        {t("cancelAssign")}
                    </Button>
                    <Button
                        type="button"
                        disabled={!selectedId || pending}
                        onClick={handleAssign}
                    >
                        {pending && <Loader2 className="size-4 animate-spin" />}
                        {t("assignAction", { count: orderIds.length })}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}