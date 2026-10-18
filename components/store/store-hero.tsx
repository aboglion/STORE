import Image from "next/image";
import { getLocale, getTranslations } from "next-intl/server";
import { ShoppingBag, Store } from "lucide-react";

import { localizedText, type Locale } from "@/lib/i18n/config";
import { storageImageUrl } from "@/lib/utils/images";

export interface StoreHeroProps {
    category?: {
        name_he: string;
        name_ar?: string | null;
        image_path?: string | null;
        slug?: string;
        product_count?: number;
    } | null;
    totalProductsCount?: number;
}

export async function StoreHero({ category, totalProductsCount }: StoreHeroProps = {}) {
    const locale = (await getLocale()) as Locale;
    const t = await getTranslations("home");

    const isCategory = Boolean(category);
    const title = isCategory
        ? localizedText(locale, category!.name_he, category!.name_ar)
        : t("heroTitle");

    const subtitle = isCategory
        ? t("categorySubtitle", { name: title })
        : t("heroSubtitle");

    const imageUrl = category?.image_path ? storageImageUrl(category.image_path) : null;
    const productCount = category?.product_count;

    return (
        <section className="relative overflow-hidden rounded-3xl border border-primary/10 bg-gradient-to-br from-accent via-secondary/70 to-background px-5 py-7 shadow-soft sm:px-8 sm:py-9">
            <div className="pointer-events-none absolute -top-12 -left-12 size-44 rounded-full bg-primary/10 blur-2xl" />
            <div className="pointer-events-none absolute -right-8 -bottom-20 size-56 rounded-full bg-primary-deep/10 blur-2xl" />

            <div className="relative flex items-center justify-between gap-6">
                <div className="flex-1">
                    <div className="mb-2 flex items-center gap-2">
                        {isCategory ? (
                            typeof productCount === "number" && (
                                <span className="inline-flex items-center rounded-full bg-primary/10 px-3 py-1 text-xs font-bold text-primary border border-primary/20">
                                    {productCount.toLocaleString()} מוצרים במחלקה זו
                                </span>
                            )
                        ) : typeof totalProductsCount === "number" ? (
                            <span className="inline-flex items-center rounded-full bg-primary/10 px-3 py-1 text-xs font-bold text-primary border border-primary/20">
                                ✨ למעלה מ-{totalProductsCount.toLocaleString()} מוצרים ב-19 מחלקות
                            </span>
                        ) : null}
                    </div>

                    <h1 className="font-display text-2xl font-extrabold tracking-tight sm:text-4xl text-foreground">
                        {title}
                    </h1>
                    <p className="mt-2 max-w-xl text-sm leading-relaxed text-muted-foreground sm:text-base">
                        {subtitle}
                    </p>
                </div>

                <div className="hidden size-24 shrink-0 overflow-hidden rounded-2xl border border-border/60 bg-gradient-to-br from-primary to-primary-deep shadow-lift sm:flex sm:items-center sm:justify-center relative">
                    {imageUrl ? (
                        <Image
                            src={imageUrl}
                            alt={title}
                            fill
                            sizes="96px"
                            className="object-cover"
                            priority
                        />
                    ) : isCategory ? (
                        <Store className="size-10 text-primary-foreground" />
                    ) : (
                        <ShoppingBag className="size-10 text-primary-foreground" />
                    )}
                </div>
            </div>
        </section>
    );
}
