import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getLocale, getTranslations } from "next-intl/server";

import { ChevronRight } from "lucide-react";

import { DeleteProductButton } from "@/components/admin/delete-product-button";
import { ProductForm } from "@/components/admin/product-form";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { requireAdmin } from "@/lib/auth";
import { getCategories, getProductById } from "@/lib/data/products";
import type { Locale } from "@/lib/i18n/config";
import { formatDateTime } from "@/lib/utils/dates";

export async function generateMetadata(): Promise<Metadata> {
    const t = await getTranslations("admin.products");
    return {
        title: t("editProduct"),
    };
}

export default async function EditProductPage({
    params,
}: {
    params: Promise<{ id: string }>;
}) {
    await requireAdmin();

    const locale = (await getLocale()) as Locale;
    const t = await getTranslations("admin.products");

    const { id } = await params;
    const [product, categories] = await Promise.all([
        getProductById(id),
        getCategories(),
    ]);

    if (!product) notFound();

    return (
        <div className="grid max-w-3xl gap-6">
            <div className="flex flex-wrap items-center justify-between gap-4">
                <div>
                    <Link
                        href="/admin/products"
                        className="mb-2 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
                    >
                        <ChevronRight className="size-4" />
                        {t("backToProducts")}
                    </Link>
                    <h1 className="text-2xl font-bold">{t("editProduct")}</h1>
                </div>
                <DeleteProductButton productId={product.id} />
            </div>

            <Card>
                <CardContent className="pt-6">
                    <ProductForm product={product} categories={categories} />
                </CardContent>
            </Card>

            <Card>
                <CardContent className="pt-6 text-sm text-muted-foreground">
                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            {t("created", {
                                date: formatDateTime(product.created_at, locale),
                            })}
                        </div>
                        <div>
                            {t("updated", {
                                date: formatDateTime(product.updated_at, locale),
                            })}
                        </div>
                    </div>
                    <Separator className="my-4" />
                    <p>{t("deletedNote")}</p>
                </CardContent>
            </Card>
        </div>
    );
}
