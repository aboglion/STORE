"use client";

import { useState, useMemo, useEffect, useRef } from "react";
import {
    Search,
    X,
    ArrowUpDown,
    Tag,
    Wheat,
    ChevronRight,
    ChevronLeft,
} from "lucide-react";

import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ProductCard } from "@/components/store/product-card";
import {
    getSubcategoriesForCategory,
    matchesSubcategory,
} from "@/lib/data/subcategories";
import type { Category, ProductWithImages } from "@/types/database.types";
import { localizedText, type Locale } from "@/lib/i18n/config";

const PRODUCTS_PER_PAGE = 40;

interface CategoryProductBrowserProps {
    products: ProductWithImages[];
    activeCategory: Category;
    locale: Locale;
}

function getPageNumbers(current: number, total: number): (number | "...")[] {
    if (total <= 7) {
        return Array.from({ length: total }, (_, i) => i + 1);
    }
    const pages: (number | "...")[] = [];
    pages.push(1);

    if (current > 3) {
        pages.push("...");
    }

    const start = Math.max(2, current - 1);
    const end = Math.min(total - 1, current + 1);

    for (let i = start; i <= end; i++) {
        pages.push(i);
    }

    if (current < total - 2) {
        pages.push("...");
    }

    pages.push(total);
    return pages;
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
    const [currentPage, setCurrentPage] = useState(1);

    const browserTopRef = useRef<HTMLDivElement>(null);

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

    // Reset pagination to page 1 when any filter changes
    useEffect(() => {
        setCurrentPage(1);
    }, [searchQuery, selectedSubcategory, onlyOnSale, priceRange, sortBy]);

    // Total pages calculation
    const totalPages = Math.max(1, Math.ceil(filteredProducts.length / PRODUCTS_PER_PAGE));

    // Ensure currentPage is within bounds
    useEffect(() => {
        if (currentPage > totalPages) {
            setCurrentPage(1);
        }
    }, [currentPage, totalPages]);

    // Slice products for current page: strictly up to 40 items
    const startIndex = (currentPage - 1) * PRODUCTS_PER_PAGE;
    const endIndex = Math.min(startIndex + PRODUCTS_PER_PAGE, filteredProducts.length);
    const displayedProducts = filteredProducts.slice(startIndex, endIndex);

    const handlePageChange = (newPage: number) => {
        const clamped = Math.max(1, Math.min(newPage, totalPages));
        setCurrentPage(clamped);
        if (browserTopRef.current) {
            browserTopRef.current.scrollIntoView({ behavior: "smooth", block: "start" });
        }
    };

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
        setCurrentPage(1);
    };

    const categoryTitle = localizedText(
        locale,
        activeCategory.name_he,
        activeCategory.name_ar
    );

    return (
        <div ref={browserTopRef} className="space-y-5 scroll-mt-20">
            {/* Control Bar: In-Category Search + Sort */}
            <div className="flex flex-col gap-2.5 sm:gap-3 rounded-xl sm:rounded-2xl border border-border/70 bg-card/60 p-2.5 sm:p-3.5 shadow-soft backdrop-blur-md sm:flex-row sm:items-center sm:justify-between">
                {/* Search in category */}
                <div className="relative flex-1">
                    <Search className="absolute start-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground pointer-events-none" />
                    <Input
                        type="search"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder={
                            locale === "ar"
                                ? `بحث داخل ${categoryTitle} (${products.length.toLocaleString()} منتج)...`
                                : `חיפוש בתוך ${categoryTitle} (${products.length.toLocaleString()} מוצרים)...`
                        }
                        className="h-9 sm:h-10 w-full rounded-xl border-border/80 bg-background/80 pe-9 ps-9 text-base sm:text-sm focus-visible:ring-primary/20"
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
                <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
                    <button
                        type="button"
                        onClick={() => setOnlyOnSale(!onlyOnSale)}
                        className={`inline-flex items-center gap-1.5 rounded-xl border px-2.5 py-1.5 sm:px-3 sm:py-2 text-xs font-semibold transition-colors ${
                            onlyOnSale
                                ? "border-primary bg-primary text-primary-foreground shadow-sm"
                                : "border-border/80 bg-background text-muted-foreground hover:bg-muted"
                        }`}
                    >
                        <Tag className="size-3.5" />
                        <span>{locale === "ar" ? "عروض فقط" : "מבצעים בלבד"}</span>
                    </button>

                    <div className="flex items-center gap-1.5 rounded-xl border border-border/80 bg-background px-2.5 py-1 sm:py-1.5">
                        <ArrowUpDown className="size-3.5 text-muted-foreground" />
                        <select
                            value={sortBy}
                            onChange={(e) => setSortBy(e.target.value as typeof sortBy)}
                            className="bg-transparent text-sm sm:text-xs font-semibold focus:outline-none"
                            aria-label={locale === "ar" ? "ترتيب المنتجات" : "מיון מוצרים"}
                        >
                            <option value="recommended">{locale === "ar" ? "מوصى به" : "מומלץ"}</option>
                            <option value="price_asc">{locale === "ar" ? "السعر: من الأقل للأعلى" : "מחיר: נמוך לגבוה"}</option>
                            <option value="price_desc">{locale === "ar" ? "السعر: من الأعلى للأقل" : "מחיר: גבוה לנמוך"}</option>
                            <option value="name_asc">{locale === "ar" ? "الاسم: أ إلى ي" : "שם: א׳ עד ת׳"}</option>
                        </select>
                    </div>
                </div>
            </div>

            {/* Subcategory Chips Row */}
            {subcategoriesWithCounts.length > 0 && (
                <div className="space-y-1.5">
                    <div className="-mx-4 flex gap-1.5 sm:gap-2 overflow-x-auto px-4 no-scrollbar">
                        <button
                            type="button"
                            onClick={() => setSelectedSubcategory("all")}
                            className={`shrink-0 rounded-full border px-3 py-1 sm:px-3.5 sm:py-1.5 text-xs font-semibold transition-all ${
                                selectedSubcategory === "all"
                                    ? "border-transparent bg-primary text-primary-foreground shadow-soft"
                                    : "border-border/70 bg-card text-muted-foreground hover:bg-muted hover:text-foreground"
                            }`}
                        >
                            {locale === "ar"
                                ? `الكل (${products.length.toLocaleString()})`
                                : `הכל (${products.length.toLocaleString()})`}
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
                <span className="text-muted-foreground font-medium">
                    {locale === "ar" ? "نطاق السعر:" : "טווח מחיר:"}
                </span>
                <button
                    type="button"
                    onClick={() => setPriceRange("all")}
                    className={`rounded-lg px-2.5 py-1 font-semibold transition-colors ${
                        priceRange === "all"
                            ? "bg-secondary text-secondary-foreground"
                            : "bg-muted/50 text-muted-foreground hover:bg-muted"
                    }`}
                >
                    {locale === "ar" ? "الكل" : "הכל"}
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
                    {locale === "ar" ? "حتى 15 ₪" : "עד 15 ₪"}
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
                        {locale === "ar" ? "إعادة تعيين الفلاتر" : "איפוס סינונים"}
                    </button>
                )}
            </div>

            {/* Count summary & Page info */}
            <div className="flex items-center justify-between text-xs text-muted-foreground pt-1">
                <span>
                    {locale === "ar" ? "عرض " : "מציג "}
                    <strong className="text-foreground">
                        {filteredProducts.length === 0
                            ? 0
                            : `${startIndex + 1}–${endIndex}`}
                    </strong>{" "}
                    {locale === "ar" ? "من " : "מתוך "}
                    <strong className="text-foreground">
                        {filteredProducts.length.toLocaleString()}
                    </strong>{" "}
                    {locale === "ar" ? "منتج" : "מוצרים"}
                    {filteredProducts.length !== products.length && (
                        <span>
                            {" "}
                            {locale === "ar"
                                ? `(من إجمالي ${products.length.toLocaleString()} في هذا القسم)`
                                : `(מתוך ${products.length.toLocaleString()} במחלקה)`}
                        </span>
                    )}
                </span>
                {totalPages > 1 && (
                    <span className="font-semibold text-foreground/80">
                        {locale === "ar"
                            ? `صفحة ${currentPage} من ${totalPages} (حتى ${PRODUCTS_PER_PAGE} في الصفحة)`
                            : `עמוד ${currentPage} מתוך ${totalPages} (עד ${PRODUCTS_PER_PAGE} בעמוד)`}
                    </span>
                )}
            </div>

            {/* Product Grid */}
            {filteredProducts.length === 0 ? (
                <div className="flex flex-col items-center gap-4 py-16 text-center">
                    <div className="flex size-14 items-center justify-center rounded-full bg-secondary text-secondary-foreground">
                        <Wheat className="size-6" />
                    </div>
                    <p className="text-sm text-muted-foreground font-semibold">
                        {locale === "ar"
                            ? "لم يتم العثور على منتجات مطابقة للفلاتر المحددة"
                            : "לא נמצאו מוצרים התואמים את הסינונים שנבחרו"}
                    </p>
                    <Button variant="outline" size="sm" onClick={handleResetFilters}>
                        {locale === "ar" ? "مسح الفلاتر" : "נקה סינונים"}
                    </Button>
                </div>
            ) : (
                <>
                    <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 sm:gap-4 lg:grid-cols-4">
                        {displayedProducts.map((product, index) => (
                            <ProductCard
                                key={product.id}
                                product={product}
                                priority={index < 4}
                                locale={locale}
                            />
                        ))}
                    </div>

                    {/* Pagination Controls */}
                    {totalPages > 1 && (
                        <nav
                            aria-label={locale === "ar" ? "التنقل بين صفحات المنتجات" : "ניווט בין עמודי מוצרים"}
                            className="flex flex-col sm:flex-row items-center justify-between gap-3 sm:gap-4 pt-5 pb-3 border-t border-border/70"
                        >
                            <div className="text-[11px] sm:text-xs text-muted-foreground font-medium text-center sm:text-start">
                                {locale === "ar" ? (
                                    <>
                                        صفحة <strong className="text-foreground">{currentPage}</strong> من{" "}
                                        <strong className="text-foreground">{totalPages}</strong>{" "}
                                        ({filteredProducts.length.toLocaleString()} منتج إجمالاً)
                                    </>
                                ) : (
                                    <>
                                        עמוד <strong className="text-foreground">{currentPage}</strong> מתוך{" "}
                                        <strong className="text-foreground">{totalPages}</strong>{" "}
                                        ({filteredProducts.length.toLocaleString()} מוצרים בסה״כ)
                                    </>
                                )}
                            </div>

                            <div className="flex items-center gap-1 sm:gap-1.5 flex-wrap justify-center">
                                {/* Previous Page Button */}
                                <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    onClick={() => handlePageChange(currentPage - 1)}
                                    disabled={currentPage <= 1}
                                    className="h-8 sm:h-9 rounded-lg sm:rounded-xl px-2.5 sm:px-3 text-xs font-bold gap-1"
                                    aria-label={locale === "ar" ? "الانتقال للصفحة السابقة" : "עבור לעמוד הקודם"}
                                >
                                    <ChevronRight className="size-3.5 sm:size-4 rtl:rotate-0 rotate-180" />
                                    <span>{locale === "ar" ? "السابق" : "הקודם"}</span>
                                </Button>

                                {/* Page Number Buttons */}
                                {getPageNumbers(currentPage, totalPages).map((p, idx) => {
                                    if (p === "...") {
                                        return (
                                            <span
                                                key={`ellipsis-${idx}`}
                                                className="px-1.5 text-xs text-muted-foreground font-bold"
                                            >
                                                …
                                            </span>
                                        );
                                    }
                                    const pageNum = Number(p);
                                    const isActive = pageNum === currentPage;
                                    return (
                                        <button
                                            key={pageNum}
                                            type="button"
                                            onClick={() => handlePageChange(pageNum)}
                                            aria-current={isActive ? "page" : undefined}
                                            className={`size-8 sm:size-9 rounded-lg sm:rounded-xl text-xs font-bold transition-all ${
                                                isActive
                                                    ? "bg-primary text-primary-foreground shadow-soft scale-105"
                                                    : "border border-border/70 bg-card text-muted-foreground hover:bg-muted hover:text-foreground"
                                            }`}
                                        >
                                            {pageNum}
                                        </button>
                                    );
                                })}

                                {/* Next Page Button */}
                                <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    onClick={() => handlePageChange(currentPage + 1)}
                                    disabled={currentPage >= totalPages}
                                    className="h-8 sm:h-9 rounded-lg sm:rounded-xl px-2.5 sm:px-3 text-xs font-bold gap-1"
                                    aria-label={locale === "ar" ? "الانتقال للصفحة التالية" : "עבור לעמוד הבא"}
                                >
                                    <span>{locale === "ar" ? "التالي" : "הבא"}</span>
                                    <ChevronLeft className="size-3.5 sm:size-4 rtl:rotate-0 rotate-180" />
                                </Button>
                            </div>
                        </nav>
                    )}
                </>
            )}
        </div>
    );
}
