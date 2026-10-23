import type { Metadata } from "next";
import Link from "next/link";
import { getLocale, getTranslations } from "next-intl/server";

import { Gift, ShoppingBag } from "lucide-react";

import { Button } from "@/components/ui/button";
import { ProgressiveImage } from "@/components/ui/progressive-image";
import { PromotionCard } from "@/components/store/promotion-card";
import { StoreChrome } from "@/components/store/store-chrome";
import { getActivePromotions } from "@/lib/data/promotions";
import { getSettings } from "@/lib/data/storefront";
import { isPromotionActive } from "@/lib/promotions/engine";
import { localizedText, type Locale } from "@/lib/i18n/config";
import { storageImageUrl } from "@/lib/utils/images";

export async function generateMetadata(): Promise<Metadata> {
    const t = await getTranslations("promotions");
    return {
        title: t("title"),
        description: t("description"),
    };
}

export default async function PromotionsPage() {
    const locale = (await getLocale()) as Locale;
    const t = await getTranslations("promotions");
    const [promotions, settings] = await Promise.all([
        getActivePromotions(),
        getSettings(),
    ]);

    // Only show promotions that are currently within their date range.
    const active = promotions
        .filter((p) => isPromotionActive(p))
        .sort((a, b) => a.sort_order - b.sort_order);

    const banner = settings.promotions_banner;
    const bannerSrc = banner.enabled && banner.image_path
        ? storageImageUrl(banner.image_path)
        : "";
    const bannerTitle = localizedText(locale, banner.title_he, banner.title_ar);

    return (
        <StoreChrome>
            <div className="flex flex-col gap-6 w-full min-w-0">
                {/* Page header */}
                <div className="flex flex-col gap-1">
                    <h1 className="font-display text-2xl font-extrabold tracking-tight sm:text-3xl">
                        {t("title")}
                    </h1>
                    <p className="text-sm text-muted-foreground">
                        {t("subtitle", { count: active.length })}
                    </p>
                </div>

                {/* Site banner (responsive — adapts automatically) */}
                {bannerSrc && (
                    <div className="relative w-full overflow-hidden rounded-3xl border border-border/70 bg-card shadow-soft">
                        <div className="aspect-[16/7] sm:aspect-[21/9]">
                            <ProgressiveImage
                                src={bannerSrc}
                                alt={bannerTitle || t("bannerAlt")}
                                fill
                                sizes="(max-width: 640px) 100vw, 1024px"
                                className="object-cover"
                            />
                        </div>
                        {bannerTitle && (
                            <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-background/90 via-background/40 to-transparent px-4 pb-3 pt-8 sm:px-6">
                                <h2 className="font-display text-lg font-extrabold tracking-tight sm:text-xl">
                                    {bannerTitle}
                                </h2>
                            </div>
                        )}
                    </div>
                )}

                {/* Promotions grid */}
                {active.length === 0 ? (
                    <div className="flex flex-col items-center gap-4 rounded-2xl border border-dashed border-border/70 bg-muted/30 py-16 text-center">
                        <div className="flex size-16 items-center justify-center rounded-full bg-secondary text-secondary-foreground shadow-soft">
                            <Gift className="size-7" />
                        </div>
                        <h2 className="font-display text-lg font-bold">{t("empty")}</h2>
                        <p className="mt-1 text-sm text-muted-foreground">
                            {t("emptyHint")}
                        </p>
                        <Button asChild size="lg">
                            <Link href="/">{t("toCatalog")}</Link>
                        </Button>
                    </div>
                ) : (
                    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                        {active.map((promotion) => (
                            <PromotionCard
                                key={promotion.id}
                                promotion={promotion}
                                locale={locale}
                                typeLabel={t(`types.${promotion.type}`)}
                            />
                        ))}
                    </div>
                )}

                {/* CTA */}
                {active.length > 0 && (
                    <div className="flex flex-col items-center gap-2 rounded-2xl border border-primary/20 bg-primary/5 p-5 text-center">
                        <p className="text-sm font-semibold text-foreground">
                            {t("cta")}
                        </p>
                        <Button asChild size="lg">
                            <Link href="/">
                                <ShoppingBag className="size-4" />
                                {t("ctaAction")}
                            </Link>
                        </Button>
                    </div>
                )}
            </div>
        </StoreChrome>
    );
}