"use client";

import Link from "next/link";
import { useTranslations } from "next-intl";

import { ShoppingBag } from "lucide-react";

import { Button } from "@/components/ui/button";
import { useCart } from "@/contexts/cart-context";

export function CartButton() {
    const { count } = useCart();
    const t = useTranslations("nav");

    return (
        <Button asChild variant="ghost" size="icon" className="relative">
            <Link href="/cart" aria-label={t("cartAria")}>
                <ShoppingBag className="size-5" />
                {count > 0 && (
                    <span className="absolute -top-1 -right-1 flex size-4 items-center justify-center rounded-full bg-primary text-[10px] font-bold text-primary-foreground animate-pop-in">
                        {count}
                    </span>
                )}
            </Link>
        </Button>
    );
}
