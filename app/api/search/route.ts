import { NextResponse } from "next/server";
import { createPublicClient } from "@/lib/supabase/public";

export const runtime = "nodejs";

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const query = searchParams.get("q")?.trim() || "";
    const categorySlug = searchParams.get("category")?.trim() || "";
    const limit = Math.min(Math.max(parseInt(searchParams.get("limit") || "40", 10), 1), 100);
    const offset = Math.max(parseInt(searchParams.get("offset") || "0", 10), 0);

    const supabase = createPublicClient();

    try {
        // If query is empty and no category specified, return empty
        if (!query && !categorySlug) {
            return NextResponse.json({
                products: [],
                categories: [],
                total: 0,
            });
        }

        // 1. If query is provided, check for matching categories
        let matchingCategories: Array<{
            id: string;
            name_he: string;
            name_ar: string | null;
            slug: string;
            image_path: string | null;
            product_count?: number;
        }> = [];

        if (query) {
            const { data: catData } = await supabase
                .from("categories")
                .select("id, name_he, name_ar, slug, image_path")
                .eq("is_active", true)
                .or(`name_he.ilike.%${query}%,name_ar.ilike.%${query}%`)
                .limit(5);

            if (catData && catData.length > 0) {
                const { data: countData } = await supabase
                    .from("category_product_counts")
                    .select("category_id, product_count")
                    .in(
                        "category_id",
                        catData.map((c) => c.id)
                    );
                const countMap = new Map(
                    (countData || []).map((c) => [c.category_id, c.product_count])
                );
                matchingCategories = catData.map((c) => ({
                    ...c,
                    product_count: countMap.get(c.id) || 0,
                }));
            }
        }

        // 2. Resolve category if categorySlug is provided
        let categoryId: string | null = null;
        if (categorySlug) {
            const { data: category } = await supabase
                .from("categories")
                .select("id")
                .eq("slug", categorySlug)
                .maybeSingle();
            if (category) {
                categoryId = category.id;
            }
        }

        // 3. Search products
        let productQuery = supabase
            .from("products")
            .select(
                "id, name_he, name_ar, slug, price_agorot, compare_at_price_agorot, stock_quantity, is_weighted, barcode, category_id, images:product_images(id, storage_path, alt_text, sort_order)",
                { count: "exact" }
            )
            .eq("is_active", true);

        if (categoryId) {
            productQuery = productQuery.eq("category_id", categoryId);
        }

        if (query) {
            // Check for barcode match or name match
            const isNumeric = /^\d+$/.test(query);
            if (isNumeric) {
                productQuery = productQuery.or(
                    `barcode.ilike.%${query}%,item_code.ilike.%${query}%,name_he.ilike.%${query}%`
                );
            } else {
                productQuery = productQuery.or(
                    `name_he.ilike.%${query}%,name_ar.ilike.%${query}%`
                );
            }
        }

        const { data: products, count, error } = await productQuery
            .order("sort_order", { ascending: true })
            .range(offset, offset + limit - 1);

        if (error) {
            console.error("Search API error:", error);
            return NextResponse.json({ error: error.message }, { status: 500 });
        }

        return NextResponse.json({
            query,
            category: categorySlug || null,
            products: products || [],
            categories: matchingCategories,
            total: count || 0,
            hasMore: (count || 0) > offset + (products?.length || 0),
        });
    } catch (err: unknown) {
        console.error("Search API unexpected exception:", err);
        return NextResponse.json(
            { error: "Internal search error" },
            { status: 500 }
        );
    }
}
