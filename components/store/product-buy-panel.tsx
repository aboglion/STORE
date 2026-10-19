"use client";

import { useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { Truck } from "lucide-react";

import { AddToCartButton } from "@/components/store/add-to-cart-button";
import { QuantityStepper } from "@/components/store/quantity-stepper";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { formatILS } from "@/lib/utils/currency";
import type { Locale } from "@/lib/i18n/config";

/**
 * Buy panel for the product page:
 * - Dynamically updates total price as quantity changes (both inline and sticky bar)
 * - Renders inline on desktop/mobile
 * - Reveals a sleek mobile sticky purchase bar ONLY when the inline panel scrolls out of view,
 *   avoiding duplicate CTA clutter.
 */
export function ProductBuyPanel({
    productId,
    productName,
    priceAgorot,
    compareAtPriceAgorot,
    stockQuantity,
    lowStockThreshold,
    locale,
    deliveryInfo,
}: {
    productId: string;
    productName: string;
    priceAgorot: number;
    compareAtPriceAgorot?: number | null;
    stockQuantity: number;
    lowStockThreshold: number;
    locale: Locale;
    deliveryInfo?: string;
}) {
    const t = useTranslations("product");
    const [quantity, setQuantity] = useState(1);
    const inlineRef = useRef<HTMLDivElement>(null);
    const [isInlineInView, setIsInlineInView] = useState(true);

    const outOfStock = stockQuantity <= 0;
    const lowStock = !outOfStock && stockQuantity <= lowStockThreshold;
    const onSale =
        compareAtPriceAgorot != null && compareAtPriceAgorot > priceAgorot;
    const discountPercent = onSale
        ? Math.round((1 - priceAgorot / compareAtPriceAgorot!) * 100)
        : null;

    const totalPriceAgorot = priceAgorot * quantity;
    const totalCompareAtPriceAgorot =
        compareAtPriceAgorot != null ? compareAtPriceAgorot * quantity : null;

    useEffect(() => {
        const el = inlineRef.current;
        if (!el || typeof IntersectionObserver === "undefined") return;

        const observer = new IntersectionObserver(
            ([entry]) => {
                setIsInlineInView(entry.isIntersecting);
            },
            {
                threshold: 0.1,
                rootMargin: "-64px 0px 0px 0px",
            }
        );

        observer.observe(el);
        return () => observer.disconnect();
    }, []);

    return (
        <>
            <div ref={inlineRef} className="flex flex-col gap-3 sm:gap-4">
                <div className="flex items-end justify-between gap-3">
                    <div>
                        <div className="flex items-baseline gap-2">
                            <span className="font-display text-2xl sm:text-3xl font-extrabold text-primary">
                                {formatILS(totalPriceAgorot, locale)}
                            </span>
                            <span className="text-[11px] sm:text-xs font-semibold text-muted-foreground">
                                ({t("includingVat")})
                            </span>
                            {onSale && totalCompareAtPriceAgorot != null && (
                                <span className="text-sm sm:text-lg text-muted-foreground line-through">
                                    {formatILS(totalCompareAtPriceAgorot, locale)}
                                </span>
                            )}
                        </div>
                        {quantity > 1 && (
                            <p className="mt-0.5 text-[11px] sm:text-xs font-medium text-muted-foreground">
                                {formatILS(priceAgorot, locale)} {t("perUnit")}
                            </p>
                        )}
                        {discountPercent != null && (
                            <span className="mt-1 sm:mt-1.5 inline-block rounded-full bg-[oklch(0.6_0.17_40)]/15 px-2 sm:px-2.5 py-0.5 text-[10px] sm:text-xs font-bold text-[oklch(0.45_0.13_35)]">
                                {t("discountPercent", { percent: discountPercent })}
                            </span>
                        )}
                    </div>

                    {outOfStock ? (
                        <Badge variant="destructive" className="text-xs">{t("outOfStock")}</Badge>
                    ) : lowStock ? (
                        <Badge className="border-transparent bg-[oklch(0.6_0.17_40)]/15 text-[oklch(0.45_0.13_35)] text-xs">
                            {t("lowStock", { count: stockQuantity })}
                        </Badge>
                    ) : (
                        <Badge className="border-transparent bg-[oklch(0.6_0.1_130)]/15 text-[oklch(0.45_0.09_130)] text-xs">
                            {t("inStock")}
                        </Badge>
                    )}
                </div>

                <div className="flex items-center gap-2 sm:gap-2.5">
                    {!outOfStock && (
                        <QuantityStepper
                            value={quantity}
                            onChange={setQuantity}
                            max={stockQuantity}
                            size="md"
                        />
                    )}
                    <AddToCartButton
                        productId={productId}
                        productName={productName}
                        size="lg"
                        fullWidth
                        disabled={outOfStock}
                        quantity={quantity}
                    />
                </div>

                {deliveryInfo && (
                    <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
                        <Truck className="size-3.5 shrink-0 text-primary" />
                        {deliveryInfo}
                    </p>
                )}
            </div>

            {/* Mobile sticky purchase bar: smoothly slides up only when the inline panel is scrolled out of view */}
            <div
                className={cn(
                    "fixed inset-x-0 bottom-0 z-40 border-t border-border/80 bg-background/95 shadow-[0_-8px_30px_rgba(0,0,0,0.12)] backdrop-blur-xl supports-[backdrop-filter]:bg-background/90 md:hidden transition-all duration-300 ease-in-out",
                    isInlineInView
                        ? "translate-y-full opacity-0 pointer-events-none"
                        : "translate-y-0 opacity-100 pointer-events-auto"
                )}
                style={{ paddingBottom: "max(0.75rem, env(safe-area-inset-bottom, 0.75rem))" }}
                aria-hidden={isInlineInView}
            >
                <div className="mx-auto flex w-full max-w-5xl items-center justify-between gap-3 px-4 pt-2 pb-1">
                    <div className="flex min-w-0 flex-col">
                        <div className="flex items-baseline gap-1.5">
                            <span className="font-display text-base sm:text-lg font-extrabold text-primary">
                                {formatILS(totalPriceAgorot, locale)}
                            </span>
                            {onSale && totalCompareAtPriceAgorot != null && (
                                <span className="text-[11px] sm:text-xs text-muted-foreground line-through">
                                    {formatILS(totalCompareAtPriceAgorot, locale)}
                                </span>
                            )}
                        </div>
                        <span className="truncate text-[10px] sm:text-[11px] font-medium text-muted-foreground">
                            {quantity > 1
                                ? `${formatILS(priceAgorot, locale)} ${t("perUnit")}`
                                : `(${t("includingVat")})`}
                        </span>
                    </div>

                    <div className="flex shrink-0 items-center gap-2">
                        {!outOfStock && (
                            <QuantityStepper
                                value={quantity}
                                onChange={setQuantity}
                                max={stockQuantity}
                                size="md"
                            />
                        )}
                        <AddToCartButton
                            productId={productId}
                            productName={productName}
                            size="default"
                            disabled={outOfStock}
                            quantity={quantity}
                            className="px-4 shadow-sm"
                        />
                    </div>
                </div>
            </div>
        </>
    );
}