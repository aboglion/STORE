import type { Metadata } from "next";
import Link from "next/link";
import { getLocale, getTranslations } from "next-intl/server";

import { Wheat } from "lucide-react";

import { Button } from "@/components/ui/button";
import { CategoryCard } from "@/components/store/category-card";
import { StoreChrome } from "@/components/store/store-chrome";
import { StoreHero } from "@/components/store/store-hero";
import { GlobalCatalogSearch } from "@/components/store/global-catalog-search";
import { CategoryProductBrowser } from "@/components/store/category-product-browser";
import { localizedText, type Locale } from "@/lib/i18n/config";
import { cn } from "@/lib/utils";
import {
    getStorefrontCategories,
    getStorefrontProducts,
    getTotalProductCount,
} from "@/lib/data/storefront";

export async function generateMetadata(): Promise<Metadata> {
    const t = await getTranslations("home");
    return {
        title: t("title"),
        description: t("description"),
    };
}

const chipBase =
    "snap-start shrink-0 rounded-full border px-3 py-1.5 text-xs sm:px-4 sm:py-2 sm:text-sm font-medium transition-all duration-150 active:scale-95";
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

    const [categories, totalProductsCount] = await Promise.all([
        getStorefrontCategories(locale),
        getTotalProductCount(),
    ]);

    // A category is selected → show that category's products with advanced filtering and search.
    if (categorySlug) {
        const { products } = await getStorefrontProducts(categorySlug, locale);
        const activeCategory = categories.find((c) => c.slug === categorySlug);

        return (
            <StoreChrome>
                <div className="flex flex-col gap-6 w-full min-w-0">
                    <StoreHero
                        category={activeCategory}
                        totalProductsCount={totalProductsCount}
                    />

                    {/* Category Navigation Bar */}
                    <nav
                        aria-label={t("categoriesAria")}
                        className="-mx-4 snap-x overflow-x-auto px-4 no-scrollbar w-[calc(100%+2rem)] max-w-[calc(100vw)] sm:w-full sm:mx-0 sm:px-0 overscroll-x-contain"
                    >
                        <div className="flex w-max gap-1.5 sm:gap-2 py-0.5">
                            <Link
                                href="/"
                                className={cn(chipBase, chipIdle)}
                            >
                                {t("all")} ({totalProductsCount.toLocaleString()})
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
                                    <span>
                                        {localizedText(
                                            locale,
                                            category.name_he,
                                            category.name_ar
                                        )}
                                    </span>
                                    {typeof category.product_count === "number" && (
                                        <span className="ms-1.5 opacity-80 text-xs">
                                            ({category.product_count})
                                        </span>
                                    )}
                                </Link>
                            ))}
                        </div>
                    </nav>

                    {/* Products with in-category filtering & search */}
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
                        <CategoryProductBrowser
                            products={products}
                            activeCategory={activeCategory!}
                            locale={locale}
                        />
                    )}
                </div>
            </StoreChrome>
        );
    }

    // Default view — global search and catalog organized by categories.
    return (
        <StoreChrome>
            <div className="flex flex-col gap-6 w-full min-w-0">
                <StoreHero totalProductsCount={totalProductsCount} />

                {/* Professional Global Search across 9,907+ products & 19 categories */}
                <GlobalCatalogSearch
                    categories={categories}
                    locale={locale}
                    totalProductsCount={totalProductsCount}
                />

                {/* Category Tiles Grid with Product Counts */}
                <div className="space-y-3">
                    <div className="flex items-center justify-between">
                        <h2 className="text-lg font-extrabold text-foreground tracking-tight sm:text-xl">
                            {locale === "ar"
                                ? `أقسام السوبرماركت (${categories.length})`
                                : `מחלקות הסופרמרקט (${categories.length})`}
                        </h2>
                        <span className="text-xs text-muted-foreground font-medium">
                            {locale === "ar"
                                ? `${totalProductsCount.toLocaleString()} منتج متوفر`
                                : `${totalProductsCount.toLocaleString()} מוצרים במלאי`}
                        </span>
                    </div>

                    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 lg:grid-cols-4">
                        {categories.map((category) => (
                            <CategoryCard
                                key={category.id}
                                slug={category.slug}
                                name={localizedText(
                                    locale,
                                    category.name_he,
                                    category.name_ar
                                )}
                                imagePath={category.image_path}
                                productCount={category.product_count}
                            />
                        ))}
                    </div>
                </div>
            </div>
        </StoreChrome>
    );
}
