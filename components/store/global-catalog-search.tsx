"use client";

import { useState, useEffect, useRef, useTransition } from "react";
import Image from "next/image";
import Link from "next/link";
import { Search, X, Loader2, Sparkles, ArrowRight, ArrowLeft } from "lucide-react";

import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ProductCard } from "@/components/store/product-card";
import { storageImageUrl } from "@/lib/utils/images";
import type { Category, ProductWithImages } from "@/types/database.types";
import { formatILS } from "@/lib/utils/currency";
import type { Locale } from "@/lib/i18n/config";

interface SearchCategoryResult {
    id: string;
    name_he: string;
    name_ar: string | null;
    slug: string;
    image_path: string | null;
    product_count?: number;
}

interface GlobalCatalogSearchProps {
    categories: Category[];
    locale: Locale;
    totalProductsCount: number;
}

export function GlobalCatalogSearch({
    categories,
    locale,
    totalProductsCount,
}: GlobalCatalogSearchProps) {
    const [query, setQuery] = useState("");
    const [isDropdownOpen, setIsDropdownOpen] = useState(false);
    const [isFullSearchMode, setIsFullSearchMode] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [searchResults, setSearchResults] = useState<{
        products: ProductWithImages[];
        categories: SearchCategoryResult[];
        total: number;
    }>({
        products: [],
        categories: [],
        total: 0,
    });

    const [selectedCategoryFilter, setSelectedCategoryFilter] = useState<string>("all");
    const [sortBy, setSortBy] = useState<"recommended" | "price_asc" | "price_desc" | "name_asc">("recommended");
    const [, startTransition] = useTransition();

    const containerRef = useRef<HTMLDivElement>(null);
    const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);

    // Close dropdown on outside click
    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (
                containerRef.current &&
                !containerRef.current.contains(event.target as Node)
            ) {
                setIsDropdownOpen(false);
            }
        }
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    const performSearch = async (searchTerm: string) => {
        const trimmed = searchTerm.trim();
        if (!trimmed) {
            setSearchResults({ products: [], categories: [], total: 0 });
            setIsLoading(false);
            return;
        }

        setIsLoading(true);
        try {
            const res = await fetch(`/api/search?q=${encodeURIComponent(trimmed)}&limit=60`);
            if (res.ok) {
                const data = await res.json();
                startTransition(() => {
                    setSearchResults({
                        products: data.products || [],
                        categories: data.categories || [],
                        total: data.total || 0,
                    });
                });
            }
        } catch (err) {
            console.error("Failed to fetch search results:", err);
        } finally {
            setIsLoading(false);
        }
    };

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const val = e.target.value;
        setQuery(val);

        if (debounceTimerRef.current) {
            clearTimeout(debounceTimerRef.current);
        }

        if (!val.trim()) {
            setIsDropdownOpen(false);
            if (isFullSearchMode) {
                setIsFullSearchMode(false);
            }
            return;
        }

        setIsDropdownOpen(true);
        debounceTimerRef.current = setTimeout(() => {
            performSearch(val);
        }, 220);
    };

    const handleClear = () => {
        setQuery("");
        setIsDropdownOpen(false);
        setIsFullSearchMode(false);
        setSearchResults({ products: [], categories: [], total: 0 });
    };

    const handleFormSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (query.trim()) {
            setIsDropdownOpen(false);
            setIsFullSearchMode(true);
            performSearch(query);
        }
    };

    const handleShowAllResults = () => {
        setIsDropdownOpen(false);
        setIsFullSearchMode(true);
    };

    // Filter and sort for full search view
    const filteredProducts = searchResults.products
        .filter((prod) => {
            if (selectedCategoryFilter === "all") return true;
            return prod.category_id === selectedCategoryFilter;
        })
        .sort((a, b) => {
            if (sortBy === "price_asc") return a.price_agorot - b.price_agorot;
            if (sortBy === "price_desc") return b.price_agorot - a.price_agorot;
            if (sortBy === "name_asc") return a.name_he.localeCompare(b.name_he, "he");
            return a.sort_order - b.sort_order;
        });

    return (
        <div ref={containerRef} className="relative w-full space-y-4">
            {/* Search Input Bar */}
            <form onSubmit={handleFormSubmit} className="relative flex items-center w-full">
                <div className="relative w-full">
                    <Search className="absolute start-4 top-1/2 -translate-y-1/2 size-5 text-muted-foreground pointer-events-none" />
                    <Input
                        type="search"
                        value={query}
                        onChange={handleInputChange}
                        onFocus={() => {
                            if (query.trim()) setIsDropdownOpen(true);
                        }}
                        placeholder={`חיפוש מקיף ב-${totalProductsCount.toLocaleString()} מוצרים ו-19 מחלקות...`}
                        className="h-13 w-full rounded-2xl border-primary/20 bg-card/90 pe-12 ps-12 text-base shadow-soft transition-all focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-primary/20 sm:text-base"
                    />
                    {isLoading ? (
                        <Loader2 className="absolute end-4 top-1/2 -translate-y-1/2 size-5 animate-spin text-primary" />
                    ) : query ? (
                        <button
                            type="button"
                            onClick={handleClear}
                            className="absolute end-3.5 top-1/2 -translate-y-1/2 rounded-full p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
                            aria-label="נקה חיפוש"
                        >
                            <X className="size-4" />
                        </button>
                    ) : null}
                </div>
            </form>

            {/* Live Search Quick Dropdown */}
            {isDropdownOpen && query.trim() && (
                <div className="absolute start-0 end-0 top-14 z-50 overflow-hidden rounded-2xl border border-border/70 bg-card/95 shadow-lift backdrop-blur-xl">
                    <div className="max-h-[70vh] overflow-y-auto p-4 space-y-4">
                        {/* Matching Categories */}
                        {searchResults.categories.length > 0 && (
                            <div className="space-y-2">
                                <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                                    מחלקות תואמות
                                </span>
                                <div className="flex flex-wrap gap-2">
                                    {searchResults.categories.map((cat) => (
                                        <Link
                                            key={cat.id}
                                            href={`/?category=${cat.slug}`}
                                            onClick={() => setIsDropdownOpen(false)}
                                            className="flex items-center gap-2 rounded-xl border border-primary/20 bg-primary/5 px-3 py-1.5 text-sm font-semibold text-primary transition-colors hover:bg-primary hover:text-primary-foreground"
                                        >
                                            <span>{locale === "ar" && cat.name_ar ? cat.name_ar : cat.name_he}</span>
                                            {typeof cat.product_count === "number" && (
                                                <span className="rounded-full bg-primary/20 px-1.5 py-0.2 text-[11px] text-foreground">
                                                    {cat.product_count}
                                                </span>
                                            )}
                                        </Link>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Top Matching Products */}
                        {searchResults.products.length > 0 ? (
                            <div className="space-y-2">
                                <div className="flex items-center justify-between">
                                    <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                                        מוצרים ({searchResults.total.toLocaleString()} תוצאות)
                                    </span>
                                    <button
                                        type="button"
                                        onClick={handleShowAllResults}
                                        className="text-xs font-bold text-primary hover:underline"
                                    >
                                        הצג את כל התוצאות ←
                                    </button>
                                </div>

                                <div className="divide-y divide-border/40">
                                    {searchResults.products.slice(0, 6).map((product) => {
                                        const imgPath = product.images?.[0]?.storage_path;
                                        const imgSrc = imgPath ? storageImageUrl(imgPath) : "";
                                        const hasDiscount =
                                            typeof product.compare_at_price_agorot === "number" &&
                                            product.compare_at_price_agorot > product.price_agorot;

                                        return (
                                            <Link
                                                key={product.id}
                                                href={`/products/${product.slug}`}
                                                onClick={() => setIsDropdownOpen(false)}
                                                className="flex items-center justify-between gap-3 py-2.5 px-2 rounded-xl hover:bg-muted/60 transition-colors"
                                            >
                                                <div className="flex items-center gap-3 min-w-0">
                                                    <div className="relative size-12 shrink-0 overflow-hidden rounded-lg border border-border/60 bg-muted">
                                                        {imgSrc ? (
                                                            <Image
                                                                src={imgSrc}
                                                                alt={product.name_he}
                                                                fill
                                                                sizes="48px"
                                                                className="object-contain p-1"
                                                            />
                                                        ) : (
                                                            <div className="flex size-full items-center justify-center text-xs text-muted-foreground">
                                                                📦
                                                            </div>
                                                        )}
                                                    </div>
                                                    <div className="min-w-0 flex-1">
                                                        <h4 className="text-sm font-semibold text-foreground truncate">
                                                            {product.name_he}
                                                        </h4>
                                                        {product.name_ar && (
                                                            <p className="text-xs text-muted-foreground truncate">
                                                                {product.name_ar}
                                                            </p>
                                                        )}
                                                    </div>
                                                </div>

                                                <div className="shrink-0 text-end">
                                                    <span className="text-sm font-bold text-foreground">
                                                        {formatILS(product.price_agorot, locale)}
                                                    </span>
                                                    {hasDiscount && (
                                                        <span className="block text-[11px] text-muted-foreground line-through">
                                                            {formatILS(product.compare_at_price_agorot!, locale)}
                                                        </span>
                                                    )}
                                                </div>
                                            </Link>
                                        );
                                    })}
                                </div>

                                <Button
                                    type="button"
                                    onClick={handleShowAllResults}
                                    className="w-full rounded-xl font-bold"
                                    variant="outline"
                                >
                                    צפה בכל {searchResults.total.toLocaleString()} התוצאות עבור "{query}"
                                </Button>
                            </div>
                        ) : !isLoading && searchResults.categories.length === 0 ? (
                            <div className="py-6 text-center text-muted-foreground">
                                <p className="text-sm">לא נמצאו מוצרים התואמים את החיפוש "{query}"</p>
                                <p className="text-xs mt-1">נסה מילת חיפוש אחרת או חפש לפי קטגוריה</p>
                            </div>
                        ) : null}
                    </div>
                </div>
            )}

            {/* Full Search Results Mode */}
            {isFullSearchMode && (
                <div className="space-y-6 pt-2">
                    {/* Header with back button */}
                    <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-primary/20 bg-accent/40 p-4">
                        <div className="flex items-center gap-3">
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={handleClear}
                                className="rounded-full gap-1.5"
                            >
                                <ArrowRight className="size-4 rtl:rotate-180" />
                                <span>חזרה לקטגוריות</span>
                            </Button>
                            <div>
                                <h2 className="text-lg font-extrabold text-foreground">
                                    תוצאות חיפוש עבור "{query}"
                                </h2>
                                <p className="text-xs text-muted-foreground">
                                    נמצאו {searchResults.total.toLocaleString()} מוצרים מתאימים
                                </p>
                            </div>
                        </div>

                        {/* Sort selector */}
                        <div className="flex items-center gap-2">
                            <label className="text-xs font-medium text-muted-foreground">
                                מיון:
                            </label>
                            <select
                                value={sortBy}
                                onChange={(e) => setSortBy(e.target.value as typeof sortBy)}
                                className="h-9 rounded-xl border border-border/80 bg-background px-3 text-xs font-semibold shadow-sm focus:border-primary focus:outline-none"
                            >
                                <option value="recommended">מומלץ</option>
                                <option value="price_asc">מחיר: מהנמוך לגבוה</option>
                                <option value="price_desc">מחיר: מהגבוה לנמוך</option>
                                <option value="name_asc">שם: א׳ עד ת׳</option>
                            </select>
                        </div>
                    </div>

                    {/* Category Filter Chips for results */}
                    {searchResults.products.length > 0 && (
                        <div className="-mx-4 flex gap-2 overflow-x-auto px-4 no-scrollbar">
                            <button
                                type="button"
                                onClick={() => setSelectedCategoryFilter("all")}
                                className={`rounded-full px-4 py-1.5 text-xs font-semibold transition-all ${
                                    selectedCategoryFilter === "all"
                                        ? "bg-primary text-primary-foreground shadow-sm"
                                        : "border border-border/70 bg-card text-muted-foreground hover:bg-muted"
                                }`}
                            >
                                הכל ({searchResults.products.length})
                            </button>
                            {categories
                                .filter((cat) =>
                                    searchResults.products.some(
                                        (p) => p.category_id === cat.id
                                    )
                                )
                                .map((cat) => {
                                    const count = searchResults.products.filter(
                                        (p) => p.category_id === cat.id
                                    ).length;
                                    return (
                                        <button
                                            key={cat.id}
                                            type="button"
                                            onClick={() => setSelectedCategoryFilter(cat.id)}
                                            className={`rounded-full px-4 py-1.5 text-xs font-semibold whitespace-nowrap transition-all ${
                                                selectedCategoryFilter === cat.id
                                                    ? "bg-primary text-primary-foreground shadow-sm"
                                                    : "border border-border/70 bg-card text-muted-foreground hover:bg-muted"
                                            }`}
                                        >
                                            {locale === "ar" && cat.name_ar ? cat.name_ar : cat.name_he} ({count})
                                        </button>
                                    );
                                })}
                        </div>
                    )}

                    {/* Products Grid */}
                    {filteredProducts.length === 0 ? (
                        <div className="py-12 text-center text-muted-foreground">
                            <p className="text-sm font-semibold">לא נמצאו מוצרים בסינון שנבחר</p>
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setSelectedCategoryFilter("all")}
                                className="mt-3 rounded-xl"
                            >
                                הצג את כל {searchResults.products.length} התוצאות
                            </Button>
                        </div>
                    ) : (
                        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 lg:grid-cols-4">
                            {filteredProducts.map((product, index) => (
                                <ProductCard
                                    key={product.id}
                                    product={product}
                                    priority={index < 4}
                                />
                            ))}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
