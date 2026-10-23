"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";

import { Gift, House, PackageCheck, ShoppingBag } from "lucide-react";

import { useCart } from "@/contexts/cart-context";
import { BanknoteImage, ColorfulCartBag } from "@/components/store/cart-badge-icon";
import { cn } from "@/lib/utils";


export function BottomNav() {
    const pathname = usePathname();
    const { count } = useCart();
    const t = useTranslations("nav");
    const [mounted, setMounted] = useState(false);

    useEffect(() => setMounted(true), []);

    // מוסתר בעמודי מוצר/סל/צ'קאאוט שבהם יש בר פעולה ייעודי
    const shouldHide =
        pathname.startsWith("/products/") ||
        pathname.startsWith("/cart") ||
        pathname.startsWith("/checkout");
    if (shouldHide) return null;

    const items = [
        {
            href: "/",
            label: t("catalog"),
            icon: House,
            active: pathname === "/",
        },
        {
            href: "/promotions",
            label: t("promotions"),
            icon: Gift,
            active: pathname.startsWith("/promotions"),
        },
        {
            href: "/orders",
            label: t("myOrders"),
            icon: PackageCheck,
            active: pathname.startsWith("/orders") || pathname.startsWith("/order-success"),
        },
        {
            href: "/cart",
            label: t("cart"),
            icon: ShoppingBag,
            active: pathname.startsWith("/cart"),
        },
    ];

    return (
        <nav
            aria-label={t("mainNav")}
            className="fixed inset-x-0 bottom-0 z-40 border-t border-border/60 bg-background/90 pb-safe backdrop-blur-xl supports-[backdrop-filter]:bg-background/80 md:hidden"
        >
            <div className="grid grid-cols-4">
                {items.map((item) => (
                    <Link
                        key={item.href}
                        href={item.href}
                        className={cn(
                            "relative flex h-14 flex-col items-center justify-center gap-1 text-[11px] font-medium transition-colors active:scale-95",
                            item.active
                                ? "text-primary"
                                : "text-muted-foreground hover:text-foreground"
                        )}
                    >
                        {item.active && (
                            <span className="absolute top-0 h-0.5 w-8 rounded-full bg-primary" />
                        )}
                        {item.href === "/cart" && mounted && count > 0 ? (
                            <span className="relative flex items-center justify-center">
                                <div className="animate-cart-blink">
                                    <ColorfulCartBag className="size-5" />
                                </div>
                                {/* Banknote laid over the bottom of the icon */}
                                <div className="pointer-events-none absolute -bottom-0.5 left-1/2 -translate-x-1/2 z-10">
                                    <BanknoteImage className="h-2.5 w-auto max-w-[24px] rounded-[1.5px] shadow-xs border border-emerald-500/40 object-contain animate-banknote-glow" />
                                </div>
                                <span className="absolute -top-1 -end-2 flex size-3.5 items-center justify-center rounded-full bg-emerald-600 text-[9px] font-bold text-white shadow-xs animate-pop-in">
                                    {count}
                                </span>
                            </span>
                        ) : (
                            <span className="relative">
                                <item.icon className="size-5" />
                            </span>
                        )}
                        {item.label}

                    </Link>
                ))}
            </div>
        </nav>
    );
}
