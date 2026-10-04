"use client";

import { Plus } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { useCart } from "@/contexts/cart-context";

export function AddToCartButton({
    productId,
    size = "default",
    fullWidth = false,
}: {
    productId: string;
    size?: "default" | "lg" | "sm";
    fullWidth?: boolean;
}) {
    const { addItem } = useCart();

    return (
        <Button
            type="button"
            size={size}
            className={fullWidth ? "w-full" : undefined}
            onClick={() => {
                addItem(productId);
                toast.success("המוצר נוסף לסל");
            }}
        >
            <Plus />
            הוסף לסל
        </Button>
    );
}