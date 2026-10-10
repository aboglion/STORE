"use client";

import { useTranslations } from "next-intl";
import { Check, Clock, AlertTriangle, Truck, ChefHat, CheckCircle2 } from "lucide-react";
import { cn } from "@/lib/utils";
import {
    CUSTOMER_STATUS_DESCRIPTIONS,
    ORDER_STATUS_STEPS,
} from "@/lib/constants";
import type { OrderStatus } from "@/types/database.types";

const STEP_ICONS: Record<string, React.ElementType> = {
    pending: Clock,
    confirmed: CheckCircle2,
    preparing: ChefHat,
    out_for_delivery: Truck,
    delivered: Check,
};

const STEP_NAME_KEYS: Record<string, string> = {
    pending: "status.stepPending",
    confirmed: "status.stepConfirmed",
    preparing: "status.stepPreparing",
    out_for_delivery: "status.stepOutForDelivery",
    delivered: "status.stepDelivered",
};

export function OrderTimeline({ status }: { status: OrderStatus }) {
    const t = useTranslations();
    const isCanceled = status === "canceled";
    const desc = CUSTOMER_STATUS_DESCRIPTIONS[status];
    const currentStepIndex = ORDER_STATUS_STEPS.indexOf(status);

    if (isCanceled) {
        return (
            <div className="rounded-2xl border border-destructive/30 bg-destructive/10 p-5 text-center">
                <div className="mx-auto flex size-12 items-center justify-center rounded-full bg-destructive/20 text-destructive">
                    <AlertTriangle className="size-6" />
                </div>
                <h3 className="mt-3 font-display text-lg font-bold text-destructive">
                    {t(desc.titleKey)}
                </h3>
                <p className="mt-1 text-sm text-destructive/90">
                    {t(desc.subtitleKey)}
                </p>
            </div>
        );
    }

    return (
        <div className="rounded-2xl border border-border/70 bg-card p-5 shadow-soft">
            {/* Header info */}
            <div className="mb-6 text-center">
                <span className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
                    <span className="size-2 rounded-full bg-primary animate-pulse" />
                    {t("status.currentStatus", {
                        status: t(STEP_NAME_KEYS[status] ?? status),
                    })}
                </span>
                <h3 className="mt-2 font-display text-xl font-extrabold text-foreground">
                    {t(desc.titleKey)}
                </h3>
                <p className="mt-1 text-xs sm:text-sm text-muted-foreground">
                    {t(desc.subtitleKey)}
                </p>
            </div>

            {/* Step Stepper */}
            <div className="relative flex items-center justify-between">
                {/* Connecting Line */}
                <div className="absolute top-5 inset-x-4 h-0.5 bg-border/80" />
                <div
                    className="absolute top-5 right-4 h-0.5 bg-primary transition-all duration-500"
                    style={{
                        width: `${Math.max(
                            0,
                            Math.min(100, (currentStepIndex / (ORDER_STATUS_STEPS.length - 1)) * 100)
                        )}%`,
                    }}
                />

                {/* Steps */}
                {ORDER_STATUS_STEPS.map((stepKey, idx) => {
                    const isPassed = idx < currentStepIndex;
                    const isCurrent = idx === currentStepIndex;
                    const Icon = STEP_ICONS[stepKey] || Clock;

                    return (
                        <div
                            key={stepKey}
                            className="relative z-10 flex flex-col items-center gap-1.5"
                        >
                            <div
                                className={cn(
                                    "flex size-10 items-center justify-center rounded-full border-2 text-xs font-bold transition-all duration-300",
                                    isCurrent &&
                                    "border-primary bg-primary text-primary-foreground shadow-lift scale-110 animate-pulse",
                                    isPassed &&
                                    "border-primary bg-primary text-primary-foreground",
                                    !isCurrent &&
                                    !isPassed &&
                                    "border-border bg-card text-muted-foreground"
                                )}
                            >
                                <Icon className="size-4" />
                            </div>
                            <span
                                className={cn(
                                    "text-[10px] sm:text-xs font-medium text-center whitespace-nowrap",
                                    isCurrent && "font-bold text-primary",
                                    isPassed && "text-foreground",
                                    !isCurrent && !isPassed && "text-muted-foreground"
                                )}
                            >
                                {t(STEP_NAME_KEYS[stepKey])}
                            </span>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
