import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getLocale, getTranslations } from "next-intl/server";

import { ChevronLeft } from "lucide-react";

import { ProductBuyPanel } from "@/components/store/product-buy-panel";
import { ProductGallery } from "@/components/store/product-gallery";
import { ProductPurchaseBar } from "@/components/store/product-purchase-bar";
import { StoreChrome } from "@/components/store/store-chrome";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
    getPublicProductBySlug,
    getSettings,
    getStorefrontCategories,
} from "@/lib/data/storefront";
import { localizedText, type Locale } from "@/lib/i18n/config";
import { formatILS } from "@/lib/utils/currency";
import { demoImageUrl, productImageUrl } from "@/lib/utils/images";

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

    // All three reads are cached (unstable_cache) and deduped per request.
    const [product, settings, categories] = await Promise.all([
        getPublicProductBySlug(slug),
        getSettings(),
        getStorefrontCategories(locale),
    ]);

    if (!product) notFound();

    const name = localizedText(locale, product.name_he, product.name_ar);
    const description = localizedText(
        locale,
        product.description_he ?? "",
        product.description_ar
    );
    const category = categories.find((c) => c.id === product.category_id);

    const outOfStock = product.stock_quantity <= 0;
    const lowStock =
        !outOfStock && product.stock_quantity <= product.low_stock_threshold;
    const onSale =
        product.compare_at_price_agorot != null &&
        product.compare_at_price_agorot > product.price_agorot;
    const discountPercent = onSale
        ? Math.round(
            (1 - product.price_agorot / product.compare_at_price_agorot!) * 100
        )
        : null;

    const deliveryInfo =
        product.price_agorot >= settings.free_delivery_threshold_agorot
            ? t("freeDelivery", {
                threshold: formatILS(settings.free_delivery_threshold_agorot, locale),
            })
            : t("deliveryInfo", {
                fee: formatILS(settings.delivery_fee_agorot, locale),
                threshold: formatILS(settings.free_delivery_threshold_agorot, locale),
            });

    const imageUrl = product.images[0]
        ? productImageUrl(product.images[0].storage_path, product.slug)
        : demoImageUrl(product.slug);

    // Structured data for rich results (Google Product schema).
    const jsonLd = {
        "@context": "https://schema.org",
        "@type": "Product",
        name,
        image: imageUrl,
        description: description || undefined,
        offers: {
            "@type": "Offer",
            priceCurrency: "ILS",
            price: (product.price_agorot / 100).toFixed(2),
            availability: outOfStock
                ? "https://schema.org/OutOfStock"
                : "https://schema.org/InStock",
        },
    };

    return (
        <StoreChrome>
            <script
                type="application/ld+json"
                dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
            />

            <div className="mb-4 flex items-center gap-1 text-xs text-muted-foreground">
                <Link href="/" className="transition-colors hover:text-foreground">
                    {t("catalog")}
                </Link>
                <ChevronLeft className="size-3.5" />
                <span className="truncate font-medium text-foreground">{name}</span>
            </div>

            <div className="grid gap-8 md:grid-cols-2">
                <ProductGallery
                    images={product.images}
                    productName={name}
                    productSlug={product.slug}
                />

                <div className="flex flex-col gap-4 md:pb-0">
                    {/* Title + category chip */}
                    <div>
                        {category && (
                            <Link
                                href={`/?category=${category.slug}`}
                                className="mb-2 inline-flex items-center rounded-full bg-secondary px-3 py-1 text-xs font-medium text-secondary-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
                            >
                                {localizedText(locale, category.name_he, category.name_ar)}
                            </Link>
                        )}
                        <h1 className="font-display text-2xl font-extrabold tracking-tight sm:text-3xl">
                            {name}
                        </h1>
                    </div>

                    {/* Price + stock — mobile only (desktop shows them in the buy panel) */}
                    <div className="flex items-center gap-3 md:hidden">
                        <span className="font-display text-3xl font-extrabold text-primary sm:text-4xl">
                            {formatILS(product.price_agorot, locale)}
                        </span>
                        {onSale && (
                            <span className="text-lg text-muted-foreground line-through">
                                {formatILS(product.compare_at_price_agorot!, locale)}
                            </span>
                        )}
                        {discountPercent != null && (
                            <span className="rounded-full bg-[oklch(0.6_0.17_40)]/15 px-2.5 py-1 text-xs font-bold text-[oklch(0.45_0.13_35)]">
                                {t("discountPercent", { percent: discountPercent })}
                            </span>
                        )}
                    </div>

                    <div className="flex items-center gap-2 md:hidden">
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

                    {/* Desktop sticky buy panel */}
                    <div className="hidden md:block">
                        <div className="sticky top-24 rounded-2xl border border-border/70 bg-card p-5 shadow-soft">
                            <ProductBuyPanel
                                productId={product.id}
                                productName={name}
                                priceAgorot={product.price_agorot}
                                compareAtPriceAgorot={product.compare_at_price_agorot}
                                stockQuantity={product.stock_quantity}
                                lowStockThreshold={product.low_stock_threshold}
                                locale={locale}
                                deliveryInfo={deliveryInfo}
                            />
                        </div>
                    </div>
                </div>
            </div>

            {/* Mobile sticky purchase bar */}
            <ProductPurchaseBar
                productId={product.id}
                productName={name}
                priceAgorot={product.price_agorot}
                compareAtPriceAgorot={product.compare_at_price_agorot}
                stockQuantity={product.stock_quantity}
                locale={locale}
            />
        </StoreChrome>
    );
}
