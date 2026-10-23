import Link from "next/link";
import { ArrowLeft, BadgePercent, Gift, Truck } from "lucide-react";

import { Button } from "@/components/ui/button";
import { ProgressiveImage } from "@/components/ui/progressive-image";
import { describePromotion } from "@/lib/promotions/engine";
import { localizedText, type Locale } from "@/lib/i18n/config";
import { formatDateTime } from "@/lib/utils/dates";
import { storageImageUrl } from "@/lib/utils/images";
import { cn } from "@/lib/utils";
import type { Promotion, PromotionType } from "@/types/database.types";
import type { PromotionProductInfo } from "@/lib/data/promotions";
import { AddToCartButton } from "./add-to-cart-button";

const TYPE_ICONS: Record<PromotionType, React.ComponentType<{ className?: string }>> = {
    multi_buy: Gift,
    price_deal: BadgePercent,
    free_shipping: Truck,
};

const TYPE_GRADIENTS: Record<PromotionType, string> = {
    multi_buy: "from-amber-500/20 via-orange-500/10 to-transparent",
    price_deal: "from-violet-500/20 via-fuchsia-500/10 to-transparent",
    free_shipping: "from-emerald-500/20 via-teal-500/10 to-transparent",
};

export function PromotionCard({
    promotion,
    locale,
    typeLabel,
    categorySlug,
    primaryProduct,
}: {
    promotion: Promotion;
    locale: Locale;
    typeLabel: string;
    categorySlug?: string;
    primaryProduct?: PromotionProductInfo;
}) {
    const name = localizedText(locale, promotion.name_he, promotion.name_ar);
    const { description_he, description_ar } = describePromotion(promotion);
    const description = localizedText(locale, description_he, description_ar);
    const Icon = TYPE_ICONS[promotion.type];
    const imageSrc = promotion.image_path ? storageImageUrl(promotion.image_path) : "";

    let targetHref = "/";
    if (promotion.scope_type === "category" && categorySlug) {
        targetHref = `/?category=${categorySlug}`;
    } else if (promotion.scope_type === "products" && primaryProduct?.slug) {
        targetHref = `/products/${primaryProduct.slug}`;
    }

    return (
        <article className="group relative flex h-full flex-col overflow-hidden rounded-2xl border border-border/70 bg-card shadow-soft transition-all duration-200 hover:-translate-y-1 hover:shadow-lift">
            {/* Image / gradient header — links to product or category */}
            <Link
                href={targetHref}
                className="relative aspect-[4/3] overflow-hidden bg-muted/40 block focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
                {imageSrc ? (
                    <ProgressiveImage
                        src={imageSrc}
                        alt={name}
                        fill
                        sizes="(max-width: 640px) 100vw, 33vw"
                        className="object-cover transition-transform duration-300 group-hover:scale-105"
                    />
                ) : (
                    <div
                        className={cn(
                            "absolute inset-0 bg-gradient-to-br",
                            TYPE_GRADIENTS[promotion.type]
                        )}
                    >
                        <div className="absolute inset-0 flex items-center justify-center">
                            <span className="flex size-16 items-center justify-center rounded-2xl bg-background/70 text-foreground shadow-soft backdrop-blur-sm">
                                <Icon className="size-8" />
                            </span>
                        </div>
                    </div>
                )}

                {/* Type badge */}
                <span className="absolute start-2.5 top-2.5 inline-flex items-center gap-1 rounded-full border border-border/60 bg-background/85 px-2.5 py-1 text-[11px] font-semibold text-foreground shadow-xs backdrop-blur-sm">
                    <Icon className="size-3.5" />
                    {typeLabel}
                </span>

                {/* Active date range */}
                {(promotion.starts_at || promotion.ends_at) && (
                    <span className="absolute end-2.5 top-2.5 rounded-full bg-background/85 px-2 py-0.5 text-[10px] text-muted-foreground shadow-xs backdrop-blur-sm">
                        {promotion.starts_at
                            ? formatDateTime(promotion.starts_at, locale)
                            : "∞"}
                        {" – "}
                        {promotion.ends_at
                            ? formatDateTime(promotion.ends_at, locale)
                            : "∞"}
                    </span>
                )}
            </Link>

            {/* Body */}
            <div className="flex flex-1 flex-col gap-1.5 p-4">
                <Link
                    href={targetHref}
                    className="line-clamp-1 font-display text-base font-bold tracking-tight hover:underline text-foreground"
                >
                    {name}
                </Link>
                <p className="line-clamp-2 text-sm leading-snug text-muted-foreground">
                    {description}
                </p>

                {/* Price-deal highlight */}
                {promotion.type === "price_deal" &&
                    promotion.config.deal_price_agorot != null && (
                        <div className="mt-1 flex items-center gap-1.5 text-sm">
                            <span className="font-display text-lg font-extrabold text-primary">
                                {formatMoney(promotion.config.deal_price_agorot)}
                            </span>
                            <span className="text-xs text-muted-foreground line-through">
                                {promotion.config.original_price_agorot != null
                                    ? (locale === "ar"
                                        ? `بدלًا من ${formatMoney(promotion.config.original_price_agorot)}`
                                        : `במקום ${formatMoney(promotion.config.original_price_agorot)}`)
                                    : (locale === "ar"
                                        ? "بدלًا من السعر العادي"
                                        : "במקום המחיר הרגיל")}
                            </span>
                        </div>
                    )}

                {/* Bottom action bar */}
                <div className="mt-auto flex items-center justify-between gap-2 pt-3 border-t border-border/50">
                    <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2.5 py-1 text-[11px] text-muted-foreground font-medium">
                        {scopeLabel(promotion, locale)}
                    </span>

                    {promotion.scope_type === "products" && primaryProduct ? (
                        <AddToCartButton
                            productId={primaryProduct.id}
                            productName={name}
                            disabled={primaryProduct.stock_quantity <= 0}
                            size="sm"
                            className="h-8 px-2.5 sm:px-3 text-xs shrink-0"
                        />
                    ) : promotion.scope_type === "category" && categorySlug ? (
                        <Button
                            asChild
                            size="sm"
                            variant="secondary"
                            className="h-8 gap-1 rounded-full text-xs font-semibold px-3 shrink-0"
                        >
                            <Link href={targetHref}>
                                <span>{locale === "ar" ? "عرض الفئة" : "לצפייה"}</span>
                                <ArrowLeft className="size-3.5 rtl:rotate-180" />
                            </Link>
                        </Button>
                    ) : (
                        <Button
                            asChild
                            size="sm"
                            variant="secondary"
                            className="h-8 gap-1 rounded-full text-xs font-semibold px-3 shrink-0"
                        >
                            <Link href={targetHref}>
                                <span>{locale === "ar" ? "تسوق الآن" : "למוצרים"}</span>
                                <ArrowLeft className="size-3.5 rtl:rotate-180" />
                            </Link>
                        </Button>
                    )}
                </div>
            </div>
        </article>
    );
}

function formatMoney(agorot: number): string {
    return `${(agorot / 100).toFixed(2).replace(/\.00$/, "")} ₪`;
}

function scopeLabel(promotion: Promotion, locale: Locale): string {
    switch (promotion.scope_type) {
        case "category":
            return locale === "ar" ? "لفئة محددة" : "לקטגוריה נבחרה";
        case "products":
            return locale === "ar"
                ? `${promotion.product_ids.length} منتجات مختارة`
                : `${promotion.product_ids.length} מוצרים נבחרים`;
        case "all":
        default:
            return locale === "ar" ? "על כל المنتجات" : "על כל המוצרים";
    }
}
