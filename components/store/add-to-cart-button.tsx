"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";

import { Check, Plus } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { useCart } from "@/contexts/cart-context";
import { cn } from "@/lib/utils";

export function AddToCartButton({
    productId,
    size = "default",
    fullWidth = false,
    disabled = false,
}: {
    productId: string;
    size?: "default" | "lg" | "sm";
    fullWidth?: boolean;
    disabled?: boolean;
}) {
    const { addItem } = useCart();
    const t = useTranslations("product");
    const [added, setAdded] = useState(false);

    return (
        <Button
            type="button"
            size={size}
            className={cn(
                fullWidth ? "w-full" : undefined,
                "rounded-full transition-all duration-150"
            )}
            disabled={disabled}
            onClick={() => {
                addItem(productId);
                toast.success(t("addedToast"));
                setAdded(true);
                setTimeout(() => setAdded(false), 1400);
            }}
        >
            {disabled ? (
                t("outOfStock")
            ) : added ? (
                <>
                    <Check />
                    {t("addedToCart")}
                </>
            ) : (
                <>
                    <Plus />
                    {t("addToCart")}
                </>
            )}
        </Button>
    );
}
