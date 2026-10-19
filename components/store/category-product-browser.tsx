"use client";

import { useState, useMemo, useEffect, useRef } from "react";
import { Search, X, ArrowUpDown, Tag, Wheat } from "lucide-react";

import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ProductCard } from "@/components/store/product-card";
import {
    getSubcategoriesForCategory,
    matchesSubcategory,
} from "@/lib/data/subcategories";
import type { Category, ProductWithImages } from "@/types/database.types";
import { localizedText, type Locale } from "@/lib/i18n/config";

const BATCH_SIZE = 48;

interface CategoryProductBrowserProps {
    products: ProductWithImages[];
    activeCategory: Category;
    locale: Locale;
}

export function CategoryProductBrowser({
    products,
    activeCategory,
    locale,
}: CategoryProductBrowserProps) {
    const [searchQuery, setSearchQuery] = useState("");
    const [selectedSubcategory, setSelectedSubcategory] = useState<string>("all");
    const [sortBy, setSortBy] = useState<"recommended" | "price_asc" | "price_desc" | "name_asc">("recommended");
    const [onlyOnSale, setOnlyOnSale] = useState(false);
    const [priceRange, setPriceRange] = useState<"all" | "under_15" | "15_30" | "over_30">("all");
    const [visibleCount, setVisibleCount] = useState(BATCH_SIZE);

    const loadMoreRef = useRef<HTMLDivElement>(null);

    // Available subcategories for this category
    const subcategoryDefs = useMemo(() => {
        return getSubcategoriesForCategory(activeCategory.slug);
    }, [activeCategory.slug]);

    // Calculate count per subcategory
    const subcategoriesWithCounts = useMemo(() => {
        return subcategoryDefs
            .map((sub) => {
                const count = products.filter((p) =>
                    matchesSubcategory(p.name_he, sub)
                ).length;
                return { ...sub, count };
            })
            .filter((sub) => sub.count > 0);
    }, [subcategoryDefs, products]);

    // Filter products
    const filteredProducts = useMemo(() => {
        const query = searchQuery.trim().toLowerCase();
        let result = products;

        // 1. Text Search
        if (query) {
            result = result.filter((p) => {
                const nameHe = p.name_he?.toLowerCase() || "";
                const nameAr = p.name_ar?.toLowerCase() || "";
                const barcode = p.barcode?.toLowerCase() || "";
                return (
                    nameHe.includes(query) ||
                    nameAr.includes(query) ||
                    barcode.includes(query)
                );
            });
        }

        // 2. Subcategory
        if (selectedSubcategory !== "all") {
            const def = subcategoryDefs.find((s) => s.id === selectedSubcategory);
            if (def) {
                result = result.filter((p) => matchesSubcategory(p.name_he, def));
            }
        }

        // 3. Sale Filter
        if (onlyOnSale) {
            result = result.filter(
                (p) =>
                    typeof p.compare_at_price_agorot === "number" &&
                    p.compare_at_price_agorot > p.price_agorot
            );
        }

        // 4. Price Range
        if (priceRange === "under_15") {
            result = result.filter((p) => p.price_agorot <= 1500);
        } else if (priceRange === "15_30") {
            result = result.filter(
                (p) => p.price_agorot > 1500 && p.price_agorot <= 3000
            );
        } else if (priceRange === "over_30") {
            result = result.filter((p) => p.price_agorot > 3000);
        }

        // 5. Sorting
        const sorted = [...result];
        if (sortBy === "price_asc") {
            sorted.sort((a, b) => a.price_agorot - b.price_agorot);
        } else if (sortBy === "price_desc") {
            sorted.sort((a, b) => b.price_agorot - a.price_agorot);
        } else if (sortBy === "name_asc") {
            sorted.sort((a, b) => a.name_he.localeCompare(b.name_he, "he"));
        } else {
            sorted.sort((a, b) => a.sort_order - b.sort_order);
        }

        return sorted;
    }, [
        products,
        searchQuery,
        selectedSubcategory,
        onlyOnSale,
        priceRange,
        sortBy,
        subcategoryDefs,
    ]);

    // Reset pagination when filters change
    useEffect(() => {
        setVisibleCount(BATCH_SIZE);
    }, [searchQuery, selectedSubcategory, onlyOnSale, priceRange, sortBy]);

    const displayedProducts = filteredProducts.slice(0, visibleCount);
    const hasMore = visibleCount < filteredProducts.length;

    // IntersectionObserver to auto-load more on scroll
    useEffect(() => {
        if (!hasMore || !loadMoreRef.current) return;
        const observer = new IntersectionObserver(
            (entries) => {
                if (entries[0]?.isIntersecting) {
                    setVisibleCount((prev) => Math.min(prev + BATCH_SIZE, filteredProducts.length));
                }
            },
            { rootMargin: "300px" }
        );
        observer.observe(loadMoreRef.current);
        return () => observer.disconnect();
    }, [hasMore, filteredProducts.length]);

    const hasActiveFilters =
        searchQuery.trim() !== "" ||
        selectedSubcategory !== "all" ||
        onlyOnSale ||
        priceRange !== "all" ||
        sortBy !== "recommended";

    const handleResetFilters = () => {
        setSearchQuery("");
        setSelectedSubcategory("all");
        setOnlyOnSale(false);
        setPriceRange("all");
        setSortBy("recommended");
    };

    const categoryTitle = localizedText(
        locale,
        activeCategory.name_he,
        activeCategory.name_ar
    );

    return (
        <div className="space-y-5">
            {/* Control Bar: In-Category Search + Sort */}
            <div className="flex flex-col gap-3 rounded-2xl border border-border/70 bg-card/60 p-3.5 shadow-soft backdrop-blur-md sm:flex-row sm:items-center sm:justify-between">
                {/* Search in category */}
                <div className="relative flex-1">
                    <Search className="absolute start-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground pointer-events-none" />
                    <Input
                        type="search"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder={`חיפוש בתוך ${categoryTitle} (${products.length.toLocaleString()} מוצרים)...`}
                        className="h-10 w-full rounded-xl border-border/80 bg-background/80 pe-9 ps-9 text-sm focus-visible:ring-primary/20"
                    />
                    {searchQuery && (
                        <button
                            type="button"
                            onClick={() => setSearchQuery("")}
                            className="absolute end-2.5 top-1/2 -translate-y-1/2 rounded-full p-1 text-muted-foreground hover:bg-muted"
                        >
                            <X className="size-3.5" />
                        </button>
                    )}
                </div>

                {/* Quick Controls: Sale toggle + Sort */}
                <div className="flex items-center gap-2 flex-wrap">
                    <button
                        type="button"
                        onClick={() => setOnlyOnSale(!onlyOnSale)}
                        className={`inline-flex items-center gap-1.5 rounded-xl border px-3 py-2 text-xs font-semibold transition-colors ${
                            onlyOnSale
                                ? "border-primary bg-primary text-primary-foreground shadow-sm"
                                : "border-border/80 bg-background text-muted-foreground hover:bg-muted"
                        }`}
                    >
                        <Tag className="size-3.5" />
                        <span>מבצעים בלבד</span>
                    </button>

                    <div className="flex items-center gap-1.5 rounded-xl border border-border/80 bg-background px-2.5 py-1.5">
                        <ArrowUpDown className="size-3.5 text-muted-foreground" />
                        <select
                            value={sortBy}
                            onChange={(e) => setSortBy(e.target.value as typeof sortBy)}
                            className="bg-transparent text-xs font-semibold focus:outline-none"
                            aria-label="מיון מוצרים"
                        >
                            <option value="recommended">מומלץ</option>
                            <option value="price_asc">מחיר: נמוך לגבוה</option>
                            <option value="price_desc">מחיר: גבוה לנמוך</option>
                            <option value="name_asc">שם: א׳ עד ת׳</option>
                        </select>
                    </div>
                </div>
            </div>

            {/* Subcategory Chips Row */}
            {subcategoriesWithCounts.length > 0 && (
                <div className="space-y-1.5">
                    <div className="-mx-4 flex gap-2 overflow-x-auto px-4 no-scrollbar">
                        <button
                            type="button"
                            onClick={() => setSelectedSubcategory("all")}
                            className={`shrink-0 rounded-full border px-3.5 py-1.5 text-xs font-semibold transition-all ${
                                selectedSubcategory === "all"
                                    ? "border-transparent bg-primary text-primary-foreground shadow-soft"
                                    : "border-border/70 bg-card text-muted-foreground hover:bg-muted hover:text-foreground"
                            }`}
                        >
                            הכל ({products.length.toLocaleString()})
                        </button>

                        {subcategoriesWithCounts.map((sub) => {
                            const isSelected = selectedSubcategory === sub.id;
                            const label = locale === "ar" && sub.label_ar ? sub.label_ar : sub.label_he;
                            return (
                                <button
                                    key={sub.id}
                                    type="button"
                                    onClick={() => setSelectedSubcategory(sub.id)}
                                    className={`shrink-0 rounded-full border px-3.5 py-1.5 text-xs font-semibold whitespace-nowrap transition-all ${
                                        isSelected
                                            ? "border-transparent bg-primary text-primary-foreground shadow-soft"
                                            : "border-border/70 bg-card text-muted-foreground hover:bg-muted hover:text-foreground"
                                    }`}
                                >
                                    {label} ({sub.count})
                                </button>
                            );
                        })}
                    </div>
                </div>
            )}

            {/* Price Filter Chips */}
            <div className="flex items-center gap-2 flex-wrap text-xs">
                <span className="text-muted-foreground font-medium">טווח מחיר:</span>
                <button
                    type="button"
                    onClick={() => setPriceRange("all")}
                    className={`rounded-lg px-2.5 py-1 font-semibold transition-colors ${
                        priceRange === "all"
                            ? "bg-secondary text-secondary-foreground"
                            : "bg-muted/50 text-muted-foreground hover:bg-muted"
                    }`}
                >
                    הכל
                </button>
                <button
                    type="button"
                    onClick={() => setPriceRange("under_15")}
                    className={`rounded-lg px-2.5 py-1 font-semibold transition-colors ${
                        priceRange === "under_15"
                            ? "bg-secondary text-secondary-foreground"
                            : "bg-muted/50 text-muted-foreground hover:bg-muted"
                    }`}
                >
                    עד 15 ₪
                </button>
                <button
                    type="button"
                    onClick={() => setPriceRange("15_30")}
                    className={`rounded-lg px-2.5 py-1 font-semibold transition-colors ${
                        priceRange === "15_30"
                            ? "bg-secondary text-secondary-foreground"
                            : "bg-muted/50 text-muted-foreground hover:bg-muted"
                    }`}
                >
                    15 ₪ - 30 ₪
                </button>
                <button
                    type="button"
                    onClick={() => setPriceRange("over_30")}
                    className={`rounded-lg px-2.5 py-1 font-semibold transition-colors ${
                        priceRange === "over_30"
                            ? "bg-secondary text-secondary-foreground"
                            : "bg-muted/50 text-muted-foreground hover:bg-muted"
                    }`}
                >
                    30 ₪ +
                </button>

                {hasActiveFilters && (
                    <button
                        type="button"
                        onClick={handleResetFilters}
                        className="ms-auto text-xs font-semibold text-primary hover:underline"
                    >
                        איפוס סינונים
                    </button>
                )}
            </div>

            {/* Count summary */}
            <div className="flex items-center justify-between text-xs text-muted-foreground pt-1">
                <span>
                    מציג{" "}
                    <strong className="text-foreground">
                        {displayedProducts.length.toLocaleString()}
                    </strong>{" "}
                    מתוך{" "}
                    <strong className="text-foreground">
                        {filteredProducts.length.toLocaleString()}
                    </strong>{" "}
                    מוצרים
                    {filteredProducts.length !== products.length && (
                        <span> (מתוך {products.length.toLocaleString()} במחלקה)</span>
                    )}
                </span>
            </div>

            {/* Product Grid */}
            {filteredProducts.length === 0 ? (
                <div className="flex flex-col items-center gap-4 py-16 text-center">
                    <div className="flex size-14 items-center justify-center rounded-full bg-secondary text-secondary-foreground">
                        <Wheat className="size-6" />
                    </div>
                    <p className="text-sm text-muted-foreground font-semibold">
                        לא נמצאו מוצרים התואמים את הסינונים שנבחרו
                    </p>
                    <Button variant="outline" size="sm" onClick={handleResetFilters}>
                        נקה סינונים
                    </Button>
                </div>
            ) : (
                <>
                    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 lg:grid-cols-4">
                        {displayedProducts.map((product, index) => (
                            <ProductCard
                                key={product.id}
                                product={product}
                                priority={index < 4}
                                locale={locale}
                            />
                        ))}
                    </div>

                    {/* Infinite load trigger & Load more button */}
                    <div ref={loadMoreRef} className="py-6 flex justify-center">
                        {hasMore ? (
                            <Button
                                variant="outline"
                                onClick={() =>
                                    setVisibleCount((prev) =>
                                        Math.min(prev + BATCH_SIZE, filteredProducts.length)
                                    )
                                }
                                className="rounded-xl px-6 font-bold"
                            >
                                טען עוד מוצרים ({Math.min(BATCH_SIZE, filteredProducts.length - visibleCount).toLocaleString()} מתוך {(filteredProducts.length - visibleCount).toLocaleString()} שנותרו)
                            </Button>
                        ) : (
                            <p className="text-xs text-muted-foreground">
                                ✓ הצגת את כל {filteredProducts.length.toLocaleString()} המוצרים
                            </p>
                        )}
                    </div>
                </>
            )}
        </div>
    );
}
