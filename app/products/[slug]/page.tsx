import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getLocale, getTranslations } from "next-intl/server";

import { ChevronLeft } from "lucide-react";

import { AddToCartButton } from "@/components/store/add-to-cart-button";
import { MobileStickyBar } from "@/components/store/mobile-sticky-bar";
import { ProductGallery } from "@/components/store/product-gallery";
import { StoreChrome } from "@/components/store/store-chrome";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { getPublicProductBySlug } from "@/lib/data/storefront";
import { localizedText, type Locale } from "@/lib/i18n/config";
import { formatILS } from "@/lib/utils/currency";

export async function generateMetadata({
    params,
}: {
    params: Promise<{ slug: string }>;
}): Promise<Metadata> {
    const { slug } = await params;
    const locale = (await getLocale()) as Locale;
    const product = await getPublicProductBySlug(slug);

    if (!product) return { title: "404" };

    return {
        title: localizedText(locale, product.name_he, product.name_ar),
        description:
            localizedText(locale, product.description_he ?? "", product.description_ar) ||
            undefined,
    };
}

export default async function ProductPage({
    params,
}: {
    params: Promise<{ slug: string }>;
}) {
    const { slug } = await params;
    const locale = (await getLocale()) as Locale;
    const t = await getTranslations("product");
    const product = await getPublicProductBySlug(slug);

    if (!product) notFound();

    const name = localizedText(locale, product.name_he, product.name_ar);
    const description = localizedText(
        locale,
        product.description_he ?? "",
        product.description_ar
    );

    const outOfStock = product.stock_quantity <= 0;
    const lowStock =
        !outOfStock && product.stock_quantity <= product.low_stock_threshold;

    return (
        <StoreChrome>
            <div className="mb-4 flex items-center gap-1 text-xs text-muted-foreground">
                <Link href="/" className="transition-colors hover:text-foreground">
                    {t("catalog")}
                </Link>
                <ChevronLeft className="size-3.5" />
                <span className="truncate font-medium text-foreground">
                    {name}
                </span>
            </div>

            <div className="grid gap-8 md:grid-cols-2">
                <ProductGallery
                    images={product.images}
                    productName={name}
                    productSlug={product.slug}
                />

                <div className="flex flex-col gap-4 md:pb-0">
                    <div>
                        <h1 className="font-display text-2xl font-extrabold tracking-tight sm:text-3xl">
                            {name}
                        </h1>
                        <div className="mt-3 flex items-center gap-3">
                            <span className="font-display text-3xl font-extrabold text-primary sm:text-4xl">
                                {formatILS(product.price_agorot, locale)}
                            </span>
                            {product.compare_at_price_agorot != null &&
                                product.compare_at_price_agorot >
                                product.price_agorot && (
                                    <span className="text-lg text-muted-foreground line-through">
                                        {formatILS(
                                            product.compare_at_price_agorot,
                                            locale
                                        )}
                                    </span>
                                )}
                        </div>
                    </div>

                    <div className="flex items-center gap-2">
                        {outOfStock ? (
                            <Badge variant="destructive">{t("outOfStock")}</Badge>
                        ) : lowStock ? (
                            <Badge className="border-transparent bg-[oklch(0.6_0.17_40)]/15 text-[oklch(0.45_0.13_35)]">
                                {t("lowStock", { count: product.stock_quantity })}
                            </Badge>
                        ) : (
                            <Badge className="border-transparent bg-[oklch(0.6_0.1_130)]/15 text-[oklch(0.45_0.09_130)]">
                                {t("inStock")}
                            </Badge>
                        )}
                    </div>

                    {description && (
                        <>
                            <Separator />
                            <p className="whitespace-pre-line text-sm leading-relaxed text-muted-foreground">
                                {description}
                            </p>
                        </>
                    )}

                    <div className="hidden md:block">
                        <AddToCartButton
                            productId={product.id}
                            size="lg"
                            fullWidth
                            disabled={outOfStock}
                        />
                    </div>
                </div>
            </div>

            <MobileStickyBar>
                <div className="flex shrink-0 flex-col">
                    <span className="text-xs text-muted-foreground">{t("price")}</span>
                    <span className="font-display text-lg font-extrabold text-primary">
                        {formatILS(product.price_agorot, locale)}
                    </span>
                </div>
                <AddToCartButton
                    productId={product.id}
                    size="lg"
                    fullWidth
                    disabled={outOfStock}
                />
            </MobileStickyBar>
        </StoreChrome>
    );
}
