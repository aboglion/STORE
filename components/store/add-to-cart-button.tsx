"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";

import { Check, ShoppingCart } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { useCart } from "@/contexts/cart-context";
import { cn } from "@/lib/utils";

export function AddToCartButton({
    productId,
    productName,
    size = "default",
    fullWidth = false,
    disabled = false,
    quantity = 1,
    className,
}: {
    productId: string;
    productName?: string;
    size?: "default" | "lg" | "xl" | "sm";
    fullWidth?: boolean;
    disabled?: boolean;
    quantity?: number;
    className?: string;
}) {
    const { addItem } = useCart();
    const t = useTranslations("product");
    const [added, setAdded] = useState(false);

    return (
        <Button
            type="button"
            size={size}
            className={cn(
                fullWidth && "flex-1 w-full min-w-0 shrink",
                "rounded-full transition-all duration-150",
                size === "xl" && "font-bold shadow-soft",
                className
            )}
            disabled={disabled}
            aria-label={
                productName ? t("addToCartAria", { name: productName }) : undefined
            }
            onClick={() => {
                addItem(productId, quantity);
                toast.success(t("addedToast"), {
                    duration: 1800,
                });
                setAdded(true);
                setTimeout(() => setAdded(false), 1400);
            }}
        >
            {disabled ? (
                t("outOfStock")
            ) : added ? (
                <>
                    <Check className="size-5 shrink-0" />
                    <span className="truncate">{t("addedToCart")}</span>
                </>
            ) : (
                <>
                    <ShoppingCart className="size-5 shrink-0" />
                    <span className="truncate">{t("addToCart")}</span>
                </>
            )}
        </Button>
    );
}
