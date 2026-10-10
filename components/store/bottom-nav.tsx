"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";

import { House, PackageCheck, ShoppingBag } from "lucide-react";

import { useCart } from "@/contexts/cart-context";
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
            <div className="grid grid-cols-3">
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
                        <span className="relative">
                            <item.icon className="size-5" />
                            {item.href === "/cart" && mounted && count > 0 && (
                                <span className="absolute -top-1.5 -left-1.5 flex size-4 items-center justify-center rounded-full bg-primary text-[10px] font-bold text-primary-foreground animate-pop-in">
                                    {count}
                                </span>
                            )}
                        </span>
                        {item.label}
                    </Link>
                ))}
            </div>
        </nav>
    );
}
