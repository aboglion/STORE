"use client";

import { useTranslations } from "next-intl";
import { Minus, Plus } from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/**
 * Accessible quantity stepper with a minimum 44px touch target.
 * Used on the product page (desktop panel + mobile sticky bar).
 */
export function QuantityStepper({
    value,
    onChange,
    max,
    min = 1,
    size = "md",
    className,
}: {
    value: number;
    onChange: (next: number) => void;
    max: number;
    min?: number;
    size?: "md" | "lg";
    className?: string;
}) {
    const t = useTranslations("product");
    const buttonClass = size === "lg" ? "size-10" : "size-9";

    return (
        <div
            className={cn(
                "flex shrink-0 items-center gap-1 rounded-full bg-muted p-1",
                className
            )}
            aria-label={t("quantity")}
        >
            <Button
                type="button"
                variant="ghost"
                size="icon"
                className={cn(buttonClass, "rounded-full")}
                aria-label={t("decreaseQuantity")}
                disabled={value <= min}
                onClick={() => onChange(Math.max(min, value - 1))}
            >
                <Minus className="size-4" />
            </Button>
            <span className="w-7 text-center text-sm font-bold" aria-live="polite">
                {value}
            </span>
            <Button
                type="button"
                variant="ghost"
                size="icon"
                className={cn(buttonClass, "rounded-full")}
                aria-label={t("increaseQuantity")}
                disabled={value >= max}
                onClick={() => onChange(Math.min(max, value + 1))}
            >
                <Plus className="size-4" />
            </Button>
        </div>
    );
}