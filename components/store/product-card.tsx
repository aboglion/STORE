"use client";

import Link from "next/link";
import { useLocale, useTranslations } from "next-intl";

import type { ProductWithImages } from "@/types/database.types";
import { localizedText, type Locale } from "@/lib/i18n/config";
import { formatILS } from "@/lib/utils/currency";
import { productImageUrl, demoImageUrl } from "@/lib/utils/images";
import { ProgressiveImage } from "@/components/ui/progressive-image";

import { AddToCartButton } from "./add-to-cart-button";

export function ProductCard({
    product,
    priority = false,
    locale: propLocale,
}: {
    product: ProductWithImages;
    priority?: boolean;
    locale?: Locale;
}) {
    const contextLocale = useLocale() as Locale;
    const locale = propLocale ?? contextLocale;
    const t = useTranslations("product");

    const image = product.images?.[0];
    const name = localizedText(locale, product.name_he, product.name_ar);
    const outOfStock = product.stock_quantity <= 0;
    const onSale =
        product.compare_at_price_agorot != null &&
        product.compare_at_price_agorot > product.price_agorot;
    const imageSrc = productImageUrl(image?.storage_path, product.slug);

    return (
        <div className="group flex flex-col overflow-hidden rounded-xl sm:rounded-2xl border border-border/70 bg-card shadow-soft transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lift active:scale-[0.98]">
            <Link
                href={`/products/${product.slug}`}
                className="relative block aspect-square overflow-hidden bg-muted/40"
            >
                <ProgressiveImage
                    src={imageSrc}
                    alt={image?.alt_text ?? name}
                    fill
                    sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
                    priority={priority}
                    fallbackSrc={demoImageUrl(product.slug)}
                    className="object-contain sm:object-cover p-1.5 sm:p-0 transition-transform duration-300 group-hover:scale-105"
                />
                {onSale && (
                    <span className="absolute top-1.5 right-1.5 sm:top-2 sm:right-2 rounded-full bg-gradient-to-br from-[oklch(0.6_0.17_40)] to-[oklch(0.5_0.16_35)] px-2 py-0.5 sm:px-2.5 sm:py-1 text-[10px] sm:text-xs font-bold text-white shadow-soft">
                        {t("sale")}
                    </span>
                )}
                {outOfStock && (
                    <div className="absolute inset-0 flex items-center justify-center bg-black/45 text-xs sm:text-sm font-medium text-white backdrop-blur-[2px]">
                        {t("outOfStock")}
                    </div>
                )}
            </Link>

            <div className="flex flex-1 flex-col gap-1 sm:gap-1.5 p-2 sm:p-3">
                <Link
                    href={`/products/${product.slug}`}
                    className="line-clamp-2 text-xs sm:text-sm font-medium hover:underline leading-snug"
                    title={name}
                >
                    {name}
                </Link>

                <div className="mt-auto flex items-center justify-between gap-1.5 pt-1">
                    <div className="flex flex-col min-w-0">
                        {onSale && (
                            <span className="text-[10px] sm:text-xs text-muted-foreground line-through">
                                {formatILS(product.compare_at_price_agorot!, locale)}
                            </span>
                        )}
                        <span className="font-display text-sm sm:text-base font-bold text-primary truncate">
                            {formatILS(product.price_agorot, locale)}
                        </span>
                    </div>

                    {!outOfStock && (
                        <AddToCartButton
                            productId={product.id}
                            productName={name}
                            size="sm"
                            className="size-8 sm:size-auto sm:h-8 sm:px-3 shrink-0 p-0 sm:p-auto"
                        />
                    )}
                </div>
            </div>
        </div>
    );
}
