"use server";

import { randomUUID } from "crypto";

import { revalidatePath } from "next/cache";
import { getTranslations } from "next-intl/server";

import { z } from "zod";

import { PRODUCT_IMAGES_BUCKET } from "@/lib/constants";
import { requireAdmin } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { shekelInputToAgorot } from "@/lib/utils/currency";
import {
    categoryFormSchema,
    productFormSchema,
} from "@/lib/validations/product";

export type ActionResult = { error?: string } | undefined;

function isUniqueViolation(error: { code?: string } | null): boolean {
    return error?.code === "23505";
}

// ---------------------------------------------------------------------------
// Products
// ---------------------------------------------------------------------------

export async function createProduct(
    values: z.infer<ReturnType<typeof productFormSchema>>
): Promise<ActionResult> {
    await requireAdmin();

    const t = await getTranslations("validation");
    const te = await getTranslations("admin.errors");

    const parsed = productFormSchema(t).safeParse(values);
    if (!parsed.success) return { error: te("invalidData") };

    const priceAgorot = shekelInputToAgorot(parsed.data.price_shekels);
    if (priceAgorot === null) return { error: te("invalidPrice") };

    const compareAt =
        parsed.data.compare_at_price_shekels &&
            parsed.data.compare_at_price_shekels.trim() !== ""
            ? shekelInputToAgorot(parsed.data.compare_at_price_shekels)
            : null;
    if (compareAt === null && parsed.data.compare_at_price_shekels?.trim()) {
        return { error: te("invalidComparePrice") };
    }

    const { error } = await createAdminClient()
        .from("products")
        .insert({
            category_id: parsed.data.category_id || null,
            slug: parsed.data.slug,
            name_he: parsed.data.name_he,
            name_ar: parsed.data.name_ar || null,
            description_he: parsed.data.description_he || null,
            description_ar: parsed.data.description_ar || null,
            price_agorot: priceAgorot,
            compare_at_price_agorot: compareAt,
            stock_quantity: parsed.data.stock_quantity,
            low_stock_threshold: parsed.data.low_stock_threshold,
            is_active: parsed.data.is_active,
            sort_order: parsed.data.sort_order,
        });

    if (error) {
        if (isUniqueViolation(error)) return { error: te("slugExists") };
        return { error: te("saveProductFailed") };
    }

    revalidatePath("/admin/products");
    revalidatePath("/");
}

export async function updateProduct(
    id: string,
    values: z.infer<ReturnType<typeof productFormSchema>>
): Promise<ActionResult> {
    await requireAdmin();

    const t = await getTranslations("validation");
    const te = await getTranslations("admin.errors");

    const parsed = productFormSchema(t).safeParse(values);
    if (!parsed.success) return { error: te("invalidData") };

    const priceAgorot = shekelInputToAgorot(parsed.data.price_shekels);
    if (priceAgorot === null) return { error: te("invalidPrice") };

    const compareAt =
        parsed.data.compare_at_price_shekels &&
            parsed.data.compare_at_price_shekels.trim() !== ""
            ? shekelInputToAgorot(parsed.data.compare_at_price_shekels)
            : null;
    if (compareAt === null && parsed.data.compare_at_price_shekels?.trim()) {
        return { error: te("invalidComparePrice") };
    }

    const { error } = await createAdminClient()
        .from("products")
        .update({
            category_id: parsed.data.category_id || null,
            slug: parsed.data.slug,
            name_he: parsed.data.name_he,
            name_ar: parsed.data.name_ar || null,
            description_he: parsed.data.description_he || null,
            description_ar: parsed.data.description_ar || null,
            price_agorot: priceAgorot,
            compare_at_price_agorot: compareAt,
            stock_quantity: parsed.data.stock_quantity,
            low_stock_threshold: parsed.data.low_stock_threshold,
            is_active: parsed.data.is_active,
            sort_order: parsed.data.sort_order,
        })
        .eq("id", id);

    if (error) {
        if (isUniqueViolation(error)) return { error: te("slugExists") };
        return { error: te("updateProductFailed") };
    }

    revalidatePath("/admin/products");
    revalidatePath(`/admin/products/${id}`);
    revalidatePath("/");
    revalidatePath(`/products/${parsed.data.slug}`);
}

export async function deleteProduct(id: string): Promise<ActionResult> {
    await requireAdmin();

    const te = await getTranslations("admin.errors");
    const admin = createAdminClient();

    // Delete image storage files first (best effort), then the row cascades.
    const { data: images } = await admin
        .from("product_images")
        .select("storage_path")
        .eq("product_id", id);

    for (const image of images ?? []) {
        await admin.storage
            .from(PRODUCT_IMAGES_BUCKET)
            .remove([image.storage_path]);
    }

    const { error } = await admin.from("products").delete().eq("id", id);

    if (error) return { error: te("deleteProductFailed") };

    revalidatePath("/admin/products");
    revalidatePath("/");
}

// ---------------------------------------------------------------------------
// Product images
// ---------------------------------------------------------------------------

export async function uploadProductImage(
    productId: string,
    altText: string,
    file: File
): Promise<ActionResult> {
    await requireAdmin();

    const te = await getTranslations("admin.errors");

    if (file.size > 10 * 1024 * 1024) {
        return { error: te("fileTooLarge") };
    }

    const admin = createAdminClient();
    const ext = (file.name.split(".").pop() ?? "jpg").toLowerCase();
    const storagePath = `products/${productId}/${randomUUID()}.${ext}`;

    const { error: uploadError } = await admin.storage
        .from(PRODUCT_IMAGES_BUCKET)
        .upload(storagePath, Buffer.from(await file.arrayBuffer()), {
            contentType: file.type || "image/jpeg",
            upsert: false,
        });

    if (uploadError) return { error: te("uploadImageFailed") };

    const { data: last } = await admin
        .from("product_images")
        .select("sort_order")
        .eq("product_id", productId)
        .order("sort_order", { ascending: false })
        .limit(1);

    const nextSort = (last?.[0]?.sort_order ?? -1) + 1;

    const { error: insertError } = await admin.from("product_images").insert({
        product_id: productId,
        storage_path: storagePath,
        alt_text: altText.trim() || null,
        sort_order: nextSort,
    });

    if (insertError) {
        await admin.storage.from(PRODUCT_IMAGES_BUCKET).remove([storagePath]);
        return { error: te("saveImageFailed") };
    }

    revalidatePath(`/admin/products/${productId}`);
    revalidatePath("/");
}

export async function updateProductImage(
    imageId: string,
    altText: string,
    sortOrder: number
): Promise<ActionResult> {
    await requireAdmin();

    const te = await getTranslations("admin.errors");

    const { error } = await createAdminClient()
        .from("product_images")
        .update({ alt_text: altText.trim() || null, sort_order: sortOrder })
        .eq("id", imageId);

    if (error) return { error: te("updateImageFailed") };
    revalidatePath("/admin/products");
    revalidatePath("/");
}

export async function deleteProductImage(
    imageId: string,
    productId: string
): Promise<ActionResult> {
    await requireAdmin();

    const te = await getTranslations("admin.errors");
    const admin = createAdminClient();

    const { data: image } = await admin
        .from("product_images")
        .select("storage_path")
        .eq("id", imageId)
        .maybeSingle();

    if (image?.storage_path) {
        await admin.storage
            .from(PRODUCT_IMAGES_BUCKET)
            .remove([image.storage_path]);
    }

    const { error } = await admin
        .from("product_images")
        .delete()
        .eq("id", imageId);

    if (error) return { error: te("deleteImageFailed") };

    revalidatePath(`/admin/products/${productId}`);
    revalidatePath("/");
}

// ---------------------------------------------------------------------------
// Categories
// ---------------------------------------------------------------------------

export async function createCategory(
    values: z.infer<ReturnType<typeof categoryFormSchema>>
): Promise<ActionResult> {
    await requireAdmin();

    const t = await getTranslations("validation");
    const te = await getTranslations("admin.errors");

    const parsed = categoryFormSchema(t).safeParse(values);
    if (!parsed.success) return { error: te("invalidData") };

    const { error } = await createAdminClient().from("categories").insert({
        name_he: parsed.data.name_he,
        name_ar: parsed.data.name_ar || null,
        slug: parsed.data.slug,
        is_active: parsed.data.is_active,
        sort_order: parsed.data.sort_order,
    });

    if (error) {
        if (isUniqueViolation(error)) return { error: te("slugExists") };
        return { error: te("saveCategoryFailed") };
    }

    revalidatePath("/admin/categories");
    revalidatePath("/");
}

export async function updateCategory(
    id: string,
    values: z.infer<ReturnType<typeof categoryFormSchema>>
): Promise<ActionResult> {
    await requireAdmin();

    const t = await getTranslations("validation");
    const te = await getTranslations("admin.errors");

    const parsed = categoryFormSchema(t).safeParse(values);
    if (!parsed.success) return { error: te("invalidData") };

    const { error } = await createAdminClient()
        .from("categories")
        .update({
            name_he: parsed.data.name_he,
            name_ar: parsed.data.name_ar || null,
            slug: parsed.data.slug,
            is_active: parsed.data.is_active,
            sort_order: parsed.data.sort_order,
        })
        .eq("id", id);

    if (error) {
        if (isUniqueViolation(error)) return { error: te("slugExists") };
        return { error: te("updateCategoryFailed") };
    }

    revalidatePath("/admin/categories");
    revalidatePath("/");
}

export async function deleteCategory(id: string): Promise<ActionResult> {
    await requireAdmin();

    const te = await getTranslations("admin.errors");

    const { error } = await createAdminClient()
        .from("categories")
        .delete()
        .eq("id", id);

    if (error) {
        return { error: te("deleteCategoryFailed") };
    }

    revalidatePath("/admin/categories");
    revalidatePath("/");
}

// ---------------------------------------------------------------------------
// Inventory
// ---------------------------------------------------------------------------

export async function adjustStock(
    productId: string,
    newQuantity: number,
    reason: string
): Promise<ActionResult> {
    await requireAdmin();

    const te = await getTranslations("admin.errors");
    const admin = createAdminClient();

    const { data: product } = await admin
        .from("products")
        .select("id, name_he, stock_quantity")
        .eq("id", productId)
        .maybeSingle();

    if (!product) return { error: te("productNotFound") };

    const delta = newQuantity - product.stock_quantity;
    if (delta === 0) return undefined;

    const { error: updateError } = await admin
        .from("products")
        .update({ stock_quantity: newQuantity })
        .eq("id", productId);

    if (updateError) return { error: te("updateStockFailed") };

    const { error: logError } = await admin.from("inventory_logs").insert({
        product_id: productId,
        change_quantity: delta,
        reason: reason.trim() || te("manualUpdate"),
    });

    if (logError) return { error: te("stockUpdatedLogFailed") };

    revalidatePath("/admin/inventory");
    revalidatePath(`/admin/products/${productId}`);
    revalidatePath("/");
}
