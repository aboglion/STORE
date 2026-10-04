import type { Metadata } from "next";
import Link from "next/link";

import { ProductCard } from "@/components/store/product-card";
import { StoreChrome } from "@/components/store/store-chrome";
import { cn } from "@/lib/utils";
import {
    getStorefrontCategories,
    getStorefrontProducts,
} from "@/lib/data/storefront";

export const metadata: Metadata = {
    title: "קטלוג",
    description: "הקטלוג של החנות",
};

export default async function HomePage({
    searchParams,
}: {
    searchParams: Promise<{ category?: string }>;
}) {
    const params = await searchParams;
    const categorySlug = params.category;

    const [categories, { products }] = await Promise.all([
        getStorefrontCategories(),
        getStorefrontProducts(categorySlug),
    ]);

    return (
        <StoreChrome>
            <div className="grid gap-8">
                <div className="flex flex-wrap gap-2">
                    <Link
                        href="/"
                        className={cn(
                            "rounded-full border px-4 py-1.5 text-sm transition-colors",
                            !categorySlug
                                ? "border-primary bg-primary text-primary-foreground"
                                : "border-border text-muted-foreground hover:text-foreground"
                        )}
                    >
                        הכל
                    </Link>
                    {categories.map((category) => (
                        <Link
                            key={category.id}
                            href={`/?category=${category.slug}`}
                            className={cn(
                                "rounded-full border px-4 py-1.5 text-sm transition-colors",
                                categorySlug === category.slug
                                    ? "border-primary bg-primary text-primary-foreground"
                                    : "border-border text-muted-foreground hover:text-foreground"
                            )}
                        >
                            {category.name_he}
                        </Link>
                    ))}
                </div>

                {products.length === 0 ? (
                    <div className="py-16 text-center text-muted-foreground">
                        אין מוצרים בקטגוריה זו כרגע
                    </div>
                ) : (
                    <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
                        {products.map((product, index) => (
                            <ProductCard key={product.id} product={product} priority={index < 4} />
                        ))}
                    </div>
                )}
            </div>
        </StoreChrome>
    );
}
