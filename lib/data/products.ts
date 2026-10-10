import "server-only";

import type {
    Category,
    InventoryLog,
    Product,
    ProductImage,
} from "@/types/database.types";
import { createAdminClient } from "@/lib/supabase/admin";

export interface ProductListFilters {
    q?: string;
    categoryId?: string;
    isActive?: boolean;
    page?: number;
    pageSize?: number;
}

export interface ProductListItem extends Product {
    images: ProductImage[];
}

export interface ProductListResult {
    products: ProductListItem[];
    categories: Pick<Category, "id" | "name_he" | "name_ar">[];
    total: number;
    page: number;
    pageSize: number;
    totalPages: number;
}

export async function getProducts(
    filters: ProductListFilters = {}
): Promise<ProductListResult> {
    const page = Math.max(1, filters.page ?? 1);
    const pageSize = Math.min(50, Math.max(1, filters.pageSize ?? 20));
    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;

    const admin = createAdminClient();

    let query = admin
        .from("products")
        .select("*, images:product_images(id, storage_path, alt_text, sort_order)", {
            count: "exact",
        })
        .order("sort_order", { ascending: true })
        .order("created_at", { ascending: false })
        .range(from, to);

    if (filters.q) {
        query = query.or(
            `name_he.ilike.%${filters.q}%,name_ar.ilike.%${filters.q}%,slug.ilike.%${filters.q}%`
        );
    }
    if (filters.categoryId) {
        query = query.eq("category_id", filters.categoryId);
    }
    if (filters.isActive !== undefined) {
        query = query.eq("is_active", filters.isActive);
    }

    const { data, count, error } = await query;
    if (error) throw new Error(`getProducts: ${error.message}`);

    const { data: categories } = await admin
        .from("categories")
        .select("id, name_he, name_ar")
        .order("sort_order", { ascending: true });

    const total = count ?? 0;

    return {
        products: (data ?? []) as ProductListItem[],
        categories: (categories ?? []) as Pick<
            Category,
            "id" | "name_he" | "name_ar"
        >[],
        total,
        page,
        pageSize,
        totalPages: Math.max(1, Math.ceil(total / pageSize)),
    };
}

export async function getProductById(
    id: string
): Promise<ProductListItem | null> {
    const admin = createAdminClient();

    const { data, error } = await admin
        .from("products")
        .select("*, images:product_images(*)")
        .eq("id", id)
        .maybeSingle();

    if (error) throw new Error(`getProductById: ${error.message}`);
    return (data as ProductListItem) ?? null;
}

export async function getCategories(): Promise<Category[]> {
    const admin = createAdminClient();

    const { data, error } = await admin
        .from("categories")
        .select("*")
        .order("sort_order", { ascending: true });

    if (error) throw new Error(`getCategories: ${error.message}`);
    return (data ?? []) as Category[];
}

/**
 * Products whose stock is at or below their low-stock threshold.
 */
export async function getLowStockProducts(): Promise<Product[]> {
    const admin = createAdminClient();

    const { data, error } = await admin
        .from("products")
        .select("*")
        .order("stock_quantity", { ascending: true });

    if (error) throw new Error(`getLowStockProducts: ${error.message}`);
    return ((data ?? []) as Product[]).filter(
        (p) => p.stock_quantity <= p.low_stock_threshold
    );
}

export async function getAllProducts(): Promise<ProductListItem[]> {
    const admin = createAdminClient();

    const { data, error } = await admin
        .from("products")
        .select("*, images:product_images(id, storage_path, alt_text, sort_order)")
        .order("sort_order", { ascending: true });

    if (error) throw new Error(`getAllProducts: ${error.message}`);
    return (data ?? []) as ProductListItem[];
}

export async function getProductByIdWithLogs(
    productId: string
): Promise<{ product: ProductListItem | null; logs: InventoryLog[] }> {
    const [product, logs] = await Promise.all([
        getProductById(productId),
        getInventoryLogs(productId),
    ]);
    return { product, logs };
}

export async function getInventoryLogs(
    productId?: string
): Promise<InventoryLog[]> {
    const admin = createAdminClient();

    let query = admin.from("inventory_logs").select("*");
    if (productId) {
        query = query.eq("product_id", productId);
    }

    const { data, error } = await query
        .order("created_at", { ascending: false })
        .limit(100);

    if (error) throw new Error(`getInventoryLogs: ${error.message}`);
    return (data ?? []) as InventoryLog[];
}