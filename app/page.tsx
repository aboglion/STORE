import type { Metadata } from "next";
import Link from "next/link";
import { getLocale, getTranslations } from "next-intl/server";

import { Wheat } from "lucide-react";

import { Button } from "@/components/ui/button";
import { ProductCard } from "@/components/store/product-card";
import { StoreChrome } from "@/components/store/store-chrome";
import { StoreHero } from "@/components/store/store-hero";
import { localizedText, type Locale } from "@/lib/i18n/config";
import { cn } from "@/lib/utils";
import {
    getStorefrontCategories,
    getStorefrontProducts,
} from "@/lib/data/storefront";

export async function generateMetadata(): Promise<Metadata> {
    const t = await getTranslations("home");
    return {
        title: t("title"),
        description: t("description"),
    };
}

const chipBase =
    "snap-start shrink-0 rounded-full border px-4 py-2 text-sm font-medium transition-all duration-150 active:scale-95";
const chipIdle =
    "border-border/70 bg-card text-muted-foreground shadow-soft hover:text-foreground";
const chipActive =
    "border-transparent bg-primary text-primary-foreground shadow-soft";

export default async function HomePage({
    searchParams,
}: {
    searchParams: Promise<{ category?: string }>;
}) {
    const params = await searchParams;
    const categorySlug = params.category;

    const locale = (await getLocale()) as Locale;
    const t = await getTranslations("home");

    const [categories, { products }] = await Promise.all([
        getStorefrontCategories(locale),
        getStorefrontProducts(categorySlug, locale),
    ]);

    return (
        <StoreChrome>
            <div className="grid gap-6">
                <StoreHero />

                <nav
                    aria-label={t("categoriesAria")}
                    className="-mx-4 snap-x overflow-x-auto px-4 no-scrollbar"
                >
                    <div className="flex w-max gap-2">
                        <Link
                            href="/"
                            className={cn(
                                chipBase,
                                !categorySlug ? chipActive : chipIdle
                            )}
                        >
                            {t("all")}
                        </Link>
                        {categories.map((category) => (
                            <Link
                                key={category.id}
                                href={`/?category=${category.slug}`}
                                className={cn(
                                    chipBase,
                                    categorySlug === category.slug
                                        ? chipActive
                                        : chipIdle
                                )}
                            >
                                {localizedText(
                                    locale,
                                    category.name_he,
                                    category.name_ar
                                )}
                            </Link>
                        ))}
                    </div>
                </nav>

                {products.length === 0 ? (
                    <div className="flex flex-col items-center gap-4 py-16 text-center">
                        <div className="flex size-14 items-center justify-center rounded-full bg-secondary text-secondary-foreground">
                            <Wheat className="size-6" />
                        </div>
                        <p className="text-sm text-muted-foreground">
                            {t("emptyCategory")}
                        </p>
                        <Button asChild variant="outline">
                            <Link href="/">{t("allProducts")}</Link>
                        </Button>
                    </div>
                ) : (
                    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 lg:grid-cols-4">
                        {products.map((product, index) => (
                            <ProductCard
                                key={product.id}
                                product={product}
                                priority={index < 4}
                            />
                        ))}
                    </div>
                )}
            </div>
        </StoreChrome>
    );
}
