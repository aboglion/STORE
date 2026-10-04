"use server";

import { randomUUID } from "crypto";

import { revalidatePath } from "next/cache";

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
    values: z.infer<typeof productFormSchema>
): Promise<ActionResult> {
    await requireAdmin();

    const parsed = productFormSchema.safeParse(values);
    if (!parsed.success) return { error: "הנתונים שנשלחו לא תקינים" };

    const priceAgorot = shekelInputToAgorot(parsed.data.price_shekels);
    if (priceAgorot === null) return { error: "מחיר לא תקין" };

    const compareAt =
        parsed.data.compare_at_price_shekels &&
            parsed.data.compare_at_price_shekels.trim() !== ""
            ? shekelInputToAgorot(parsed.data.compare_at_price_shekels)
            : null;
    if (compareAt === null && parsed.data.compare_at_price_shekels?.trim()) {
        return { error: "מחיר השוואה לא תקין" };
    }

    const { error } = await createAdminClient()
        .from("products")
        .insert({
            category_id: parsed.data.category_id || null,
            slug: parsed.data.slug,
            name_he: parsed.data.name_he,
            description_he: parsed.data.description_he || null,
            price_agorot: priceAgorot,
            compare_at_price_agorot: compareAt,
            stock_quantity: parsed.data.stock_quantity,
            low_stock_threshold: parsed.data.low_stock_threshold,
            is_active: parsed.data.is_active,
            sort_order: parsed.data.sort_order,
        });

    if (error) {
        if (isUniqueViolation(error)) return { error: "slug כבר קיים במערכת" };
        return { error: "שמירת המוצר נכשלה" };
    }

    revalidatePath("/admin/products");
    revalidatePath("/");
}

export async function updateProduct(
    id: string,
    values: z.infer<typeof productFormSchema>
): Promise<ActionResult> {
    await requireAdmin();

    const parsed = productFormSchema.safeParse(values);
    if (!parsed.success) return { error: "הנתונים שנשלחו לא תקינים" };

    const priceAgorot = shekelInputToAgorot(parsed.data.price_shekels);
    if (priceAgorot === null) return { error: "מחיר לא תקין" };

    const compareAt =
        parsed.data.compare_at_price_shekels &&
            parsed.data.compare_at_price_shekels.trim() !== ""
            ? shekelInputToAgorot(parsed.data.compare_at_price_shekels)
            : null;
    if (compareAt === null && parsed.data.compare_at_price_shekels?.trim()) {
        return { error: "מחיר השוואה לא תקין" };
    }

    const { error } = await createAdminClient()
        .from("products")
        .update({
            category_id: parsed.data.category_id || null,
            slug: parsed.data.slug,
            name_he: parsed.data.name_he,
            description_he: parsed.data.description_he || null,
            price_agorot: priceAgorot,
            compare_at_price_agorot: compareAt,
            stock_quantity: parsed.data.stock_quantity,
            low_stock_threshold: parsed.data.low_stock_threshold,
            is_active: parsed.data.is_active,
            sort_order: parsed.data.sort_order,
        })
        .eq("id", id);

    if (error) {
        if (isUniqueViolation(error)) return { error: "slug כבר קיים במערכת" };
        return { error: "עדכון המוצר נכשל" };
    }

    revalidatePath("/admin/products");
    revalidatePath(`/admin/products/${id}`);
    revalidatePath("/");
    revalidatePath(`/products/${parsed.data.slug}`);
}

export async function deleteProduct(id: string): Promise<ActionResult> {
    await requireAdmin();

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

    if (error) return { error: "מחיקת המוצר נכשלה" };

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

    if (file.size > 10 * 1024 * 1024) {
        return { error: "הקובץ גדול מדי (מקסימום 10MB)" };
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

    if (uploadError) return { error: "העלאת התמונה נכשלה" };

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
        return { error: "שמירת התמונה נכשלה" };
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

    const { error } = await createAdminClient()
        .from("product_images")
        .update({ alt_text: altText.trim() || null, sort_order: sortOrder })
        .eq("id", imageId);

    if (error) return { error: "עדכון התמונה נכשל" };
    revalidatePath("/admin/products");
    revalidatePath("/");
}

export async function deleteProductImage(
    imageId: string,
    productId: string
): Promise<ActionResult> {
    await requireAdmin();

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

    if (error) return { error: "מחיקת התמונה נכשלה" };

    revalidatePath(`/admin/products/${productId}`);
    revalidatePath("/");
}

// ---------------------------------------------------------------------------
// Categories
// ---------------------------------------------------------------------------

export async function createCategory(
    values: z.infer<typeof categoryFormSchema>
): Promise<ActionResult> {
    await requireAdmin();

    const parsed = categoryFormSchema.safeParse(values);
    if (!parsed.success) return { error: "הנתונים שנשלחו לא תקינים" };

    const { error } = await createAdminClient().from("categories").insert({
        name_he: parsed.data.name_he,
        slug: parsed.data.slug,
        is_active: parsed.data.is_active,
        sort_order: parsed.data.sort_order,
    });

    if (error) {
        if (isUniqueViolation(error)) return { error: "slug כבר קיים במערכת" };
        return { error: "שמירת הקטגוריה נכשלה" };
    }

    revalidatePath("/admin/categories");
    revalidatePath("/");
}

export async function updateCategory(
    id: string,
    values: z.infer<typeof categoryFormSchema>
): Promise<ActionResult> {
    await requireAdmin();

    const parsed = categoryFormSchema.safeParse(values);
    if (!parsed.success) return { error: "הנתונים שנשלחו לא תקינים" };

    const { error } = await createAdminClient()
        .from("categories")
        .update({
            name_he: parsed.data.name_he,
            slug: parsed.data.slug,
            is_active: parsed.data.is_active,
            sort_order: parsed.data.sort_order,
        })
        .eq("id", id);

    if (error) {
        if (isUniqueViolation(error)) return { error: "slug כבר קיים במערכת" };
        return { error: "עדכון הקטגוריה נכשל" };
    }

    revalidatePath("/admin/categories");
    revalidatePath("/");
}

export async function deleteCategory(id: string): Promise<ActionResult> {
    await requireAdmin();

    const { error } = await createAdminClient()
        .from("categories")
        .delete()
        .eq("id", id);

    if (error) {
        return { error: "מחיקת הקטגוריה נכשלה" };
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
    const admin = createAdminClient();

    const { data: product } = await admin
        .from("products")
        .select("id, name_he, stock_quantity")
        .eq("id", productId)
        .maybeSingle();

    if (!product) return { error: "המוצר לא נמצא" };

    const delta = newQuantity - product.stock_quantity;
    if (delta === 0) return undefined;

    const { error: updateError } = await admin
        .from("products")
        .update({ stock_quantity: newQuantity })
        .eq("id", productId);

    if (updateError) return { error: "עדכון המלאי נכשל" };

    const { error: logError } = await admin.from("inventory_logs").insert({
        product_id: productId,
        change_quantity: delta,
        reason: reason.trim() || "עדכון ידני",
    });

    if (logError) return { error: "המלאי עודכן אך רישום היומן נכשל" };

    revalidatePath("/admin/inventory");
    revalidatePath(`/admin/products/${productId}`);
    revalidatePath("/");
}