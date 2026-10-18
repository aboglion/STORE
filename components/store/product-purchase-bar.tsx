"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";

import { AddToCartButton } from "@/components/store/add-to-cart-button";
import { QuantityStepper } from "@/components/store/quantity-stepper";
import { formatILS } from "@/lib/utils/currency";
import type { Locale } from "@/lib/i18n/config";

/**
 * Mobile sticky purchase bar for the product page: prominent price with
 * sale strike-through, stock hint, quantity stepper and a large full-width
 * Add-to-Cart CTA. Hidden on md+ where the desktop buy panel is used.
 */
export function ProductPurchaseBar({
    productId,
    productName,
    priceAgorot,
    compareAtPriceAgorot,
    stockQuantity,
    locale,
}: {
    productId: string;
    productName: string;
    priceAgorot: number;
    compareAtPriceAgorot?: number | null;
    stockQuantity: number;
    locale: Locale;
}) {
    const t = useTranslations("product");
    const [quantity, setQuantity] = useState(1);
    const outOfStock = stockQuantity <= 0;
    const onSale =
        compareAtPriceAgorot != null && compareAtPriceAgorot > priceAgorot;
    const totalPriceAgorot = priceAgorot * quantity;
    const totalCompareAtPriceAgorot =
        compareAtPriceAgorot != null ? compareAtPriceAgorot * quantity : null;

    return (
        <div
            className="fixed inset-x-0 bottom-0 z-40 border-t border-border/80 bg-background/95 shadow-[0_-8px_30px_rgba(0,0,0,0.12)] backdrop-blur-xl supports-[backdrop-filter]:bg-background/90 md:hidden"
            style={{ paddingBottom: "max(0.75rem, env(safe-area-inset-bottom, 0.75rem))" }}
        >
            <div className="mx-auto w-full max-w-5xl px-4 pt-2.5 pb-1">
                <div className="flex items-center justify-between gap-2">
                    <div className="flex items-baseline gap-1.5">
                        <span className="font-display text-xl font-extrabold text-primary">
                            {formatILS(totalPriceAgorot, locale)}
                        </span>
                        <span className="text-[10px] font-medium text-muted-foreground">
                            ({t("includingVat")})
                        </span>
                        {quantity > 1 && (
                            <span className="text-[10px] font-medium text-muted-foreground">
                                • {formatILS(priceAgorot, locale)} {t("perUnit")}
                            </span>
                        )}
                        {onSale && totalCompareAtPriceAgorot != null && (
                            <span className="text-xs text-muted-foreground line-through">
                                {formatILS(totalCompareAtPriceAgorot, locale)}
                            </span>
                        )}
                    </div>
                    <span className="text-xs font-semibold">
                        {outOfStock ? (
                            <span className="text-destructive">{t("outOfStock")}</span>
                        ) : (
                            <span className="text-[oklch(0.55_0.12_130)]">{t("inStock")}</span>
                        )}
                    </span>
                </div>
                <div className="mt-2 flex items-center gap-2.5">
                    {!outOfStock && (
                        <QuantityStepper
                            value={quantity}
                            onChange={setQuantity}
                            max={stockQuantity}
                            size="lg"
                        />
                    )}
                    <AddToCartButton
                        productId={productId}
                        productName={productName}
                        size="xl"
                        fullWidth
                        disabled={outOfStock}
                        quantity={quantity}
                    />
                </div>
            </div>
        </div>
    );
}