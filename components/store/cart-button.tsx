"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { ShoppingCart } from "lucide-react";

import { Button } from "@/components/ui/button";
import { useCart } from "@/contexts/cart-context";

export function CartButton() {
    const { count } = useCart();
    const [mounted, setMounted] = useState(false);

    useEffect(() => setMounted(true), []);

    return (
        <Button asChild variant="ghost" size="sm" className="relative">
            <Link href="/cart">
                <ShoppingCart className="size-5" />
                {mounted && count > 0 && (
                    <span className="absolute -top-1 -right-1 flex size-5 items-center justify-center rounded-full bg-primary text-[10px] font-bold text-primary-foreground">
                        {count}
                    </span>
                )}
                <span className="hidden sm:inline">סל</span>
            </Link>
        </Button>
    );
}