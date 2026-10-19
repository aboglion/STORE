"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";

import { ShoppingBag } from "lucide-react";

import { Button } from "@/components/ui/button";
import { useCart } from "@/contexts/cart-context";
import { BanknoteImage, ColorfulCartBag } from "@/components/store/cart-badge-icon";


export function CartButton() {
    const { count } = useCart();
    const t = useTranslations("nav");
    const [mounted, setMounted] = useState(false);

    useEffect(() => setMounted(true), []);

    const hasItems = mounted && count > 0;

    if (!hasItems) {
        return (
            <Button asChild variant="ghost" size="icon" className="relative">
                <Link href="/cart" aria-label={t("cartAria")}>
                    <ShoppingBag className="size-5" />
                </Link>
            </Button>
        );
    }

    return (
        <Button
            asChild
            variant="ghost"
            size="icon"
            className="relative transition-all active:scale-95 hover:bg-emerald-500/10"
        >
            <Link href="/cart" aria-label={t("cartAria")} className="relative flex items-center justify-center">
                {/* Full-size original bag icon with gentle slow green blink */}
                <div className="animate-cart-blink">
                    <ColorfulCartBag className="size-5 sm:size-5.5" />
                </div>

                {/* Banknote laid over the bottom of the icon */}
                <div className="pointer-events-none absolute -bottom-1 left-1/2 -translate-x-1/2 z-10">
                    <BanknoteImage className="h-2.5 sm:h-3 w-auto max-w-[28px] rounded-[1.5px] shadow-sm border border-emerald-500/40 object-contain animate-banknote-glow" />
                </div>

                {/* Count Badge in clean emerald green */}
                <span className="absolute -top-1.5 -end-2 flex size-4 items-center justify-center rounded-full bg-emerald-600 text-[10px] font-bold text-white shadow-xs ring-1 ring-background animate-pop-in">
                    {count}
                </span>
            </Link>
        </Button>
    );
}

