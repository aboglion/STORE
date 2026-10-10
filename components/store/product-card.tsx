import Image from "next/image";
import Link from "next/link";
import { getLocale, getTranslations } from "next-intl/server";

import type { ProductWithImages } from "@/types/database.types";
import { localizedText, type Locale } from "@/lib/i18n/config";
import { formatILS } from "@/lib/utils/currency";
import { productImageUrl } from "@/lib/utils/images";

import { AddToCartButton } from "./add-to-cart-button";

export async function ProductCard({
    product,
    priority = false,
}: {
    product: ProductWithImages;
    priority?: boolean;
}) {
    const locale = (await getLocale()) as Locale;
    const t = await getTranslations("product");

    const image = product.images[0];
    const name = localizedText(locale, product.name_he, product.name_ar);
    const outOfStock = product.stock_quantity <= 0;
    const onSale =
        product.compare_at_price_agorot != null &&
        product.compare_at_price_agorot > product.price_agorot;
    const imageSrc = productImageUrl(image?.storage_path, product.slug);

    return (
        <div className="group flex flex-col overflow-hidden rounded-2xl border border-border/70 bg-card shadow-soft transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lift active:scale-[0.98]">
            <Link
                href={`/products/${product.slug}`}
                className="relative block aspect-square overflow-hidden bg-muted"
            >
                <Image
                    src={imageSrc}
                    alt={image?.alt_text ?? name}
                    fill
                    sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
                    priority={priority}
                    className="object-cover transition-transform duration-300 group-hover:scale-105"
                />
                {onSale && (
                    <span className="absolute top-2 right-2 rounded-full bg-gradient-to-br from-[oklch(0.6_0.17_40)] to-[oklch(0.5_0.16_35)] px-2.5 py-1 text-xs font-bold text-white shadow-soft">
                        {t("sale")}
                    </span>
                )}
                {outOfStock && (
                    <div className="absolute inset-0 flex items-center justify-center bg-black/45 text-sm font-medium text-white backdrop-blur-[2px]">
                        {t("outOfStock")}
                    </div>
                )}
            </Link>

            <div className="flex flex-1 flex-col gap-1.5 p-3">
                <Link
                    href={`/products/${product.slug}`}
                    className="line-clamp-2 text-sm font-medium hover:underline"
                >
                    {name}
                </Link>

                <div className="mt-auto flex items-center justify-between gap-2">
                    <div className="flex flex-col">
                        {onSale && (
                            <span className="text-xs text-muted-foreground line-through">
                                {formatILS(product.compare_at_price_agorot!, locale)}
                            </span>
                        )}
                        <span className="font-display text-base font-bold text-primary">
                            {formatILS(product.price_agorot, locale)}
                        </span>
                    </div>

                    {!outOfStock && <AddToCartButton productId={product.id} size="sm" />}
                </div>
            </div>
        </div>
    );
}
