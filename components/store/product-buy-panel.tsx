"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Truck } from "lucide-react";

import { AddToCartButton } from "@/components/store/add-to-cart-button";
import { QuantityStepper } from "@/components/store/quantity-stepper";
import { Badge } from "@/components/ui/badge";
import { formatILS } from "@/lib/utils/currency";
import type { Locale } from "@/lib/i18n/config";

/**
 * Desktop sticky buy panel for the product page: price with sale badge,
 * stock status, quantity stepper and a large full-width Add-to-Cart CTA.
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
    const outOfStock = stockQuantity <= 0;
    const lowStock = !outOfStock && stockQuantity <= lowStockThreshold;
    const onSale =
        compareAtPriceAgorot != null && compareAtPriceAgorot > priceAgorot;
    const discountPercent = onSale
        ? Math.round((1 - priceAgorot / compareAtPriceAgorot!) * 100)
        : null;

    return (
        <div className="flex flex-col gap-4">
            <div className="flex items-end justify-between gap-3">
                <div>
                    <div className="flex items-baseline gap-2">
                        <span className="font-display text-3xl font-extrabold text-primary">
                            {formatILS(priceAgorot, locale)}
                        </span>
                        <span className="text-xs font-semibold text-muted-foreground">
                            ({t("includingVat")})
                        </span>
                        {onSale && (
                            <span className="text-lg text-muted-foreground line-through">
                                {formatILS(compareAtPriceAgorot!, locale)}
                            </span>
                        )}
                    </div>
                    {discountPercent != null && (
                        <span className="mt-1.5 inline-block rounded-full bg-[oklch(0.6_0.17_40)]/15 px-2.5 py-0.5 text-xs font-bold text-[oklch(0.45_0.13_35)]">
                            {t("discountPercent", { percent: discountPercent })}
                        </span>
                    )}
                </div>

                {outOfStock ? (
                    <Badge variant="destructive">{t("outOfStock")}</Badge>
                ) : lowStock ? (
                    <Badge className="border-transparent bg-[oklch(0.6_0.17_40)]/15 text-[oklch(0.45_0.13_35)]">
                        {t("lowStock", { count: stockQuantity })}
                    </Badge>
                ) : (
                    <Badge className="border-transparent bg-[oklch(0.6_0.1_130)]/15 text-[oklch(0.45_0.09_130)]">
                        {t("inStock")}
                    </Badge>
                )}
            </div>

            <div className="flex items-center gap-2">
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

            {deliveryInfo && (
                <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <Truck className="size-3.5 shrink-0 text-primary" />
                    {deliveryInfo}
                </p>
            )}
        </div>
    );
}