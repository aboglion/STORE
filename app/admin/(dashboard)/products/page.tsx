import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { getLocale, getTranslations } from "next-intl/server";

import { Pencil, Plus } from "lucide-react";

import { Pagination } from "@/components/admin/pagination";
import { ProductFilters } from "@/components/admin/product-filters";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { requireAdmin } from "@/lib/auth";
import { getProducts } from "@/lib/data/products";
import { localizedText, type Locale } from "@/lib/i18n/config";
import { formatILS } from "@/lib/utils/currency";
import { productImageUrl } from "@/lib/utils/images";

export async function generateMetadata(): Promise<Metadata> {
    const t = await getTranslations("admin.products");
    return {
        title: t("title"),
    };
}

type Props = {
    searchParams: Promise<{
        q?: string;
        category?: string;
        status?: string;
        page?: string;
    }>;
};

export default async function AdminProductsPage({ searchParams }: Props) {
    await requireAdmin();

    const locale = (await getLocale()) as Locale;
    const t = await getTranslations("admin.products");

    const params = await searchParams;
    const q = params.q?.trim() || undefined;
    const categoryId = params.category || undefined;
    const isActive =
        params.status === "inactive"
            ? false
            : params.status === "active"
                ? true
                : undefined;
    const page = Math.max(1, Number(params.page) || 1);

    const result = await getProducts({ q, categoryId, isActive, page, pageSize: 20 });

    const buildHref = (p: number) => {
        const search = new URLSearchParams();
        if (q) search.set("q", q);
        if (categoryId) search.set("category", categoryId);
        if (params.status && params.status !== "all") search.set("status", params.status);
        if (p > 1) search.set("page", String(p));
        const qs = search.toString();
        return `/admin/products${qs ? `?${qs}` : ""}`;
    };

    const categoryNames = new Map(
        result.categories.map((c) => [
            c.id,
            localizedText(locale, c.name_he, c.name_ar),
        ])
    );

    return (
        <div className="grid gap-6">
            <div className="flex flex-wrap items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold">{t("title")}</h1>
                    <p className="mt-1 text-sm text-muted-foreground">
                        {t("count", { count: result.total })}
                    </p>
                </div>
                <Button asChild>
                    <Link href="/admin/products/new">
                        <Plus />
                        {t("newProduct")}
                    </Link>
                </Button>
            </div>

            <ProductFilters
                categories={result.categories}
                initial={{ q, category: categoryId, status: params.status }}
            />

            <div className="overflow-hidden rounded-2xl border border-border/70 bg-card shadow-soft">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead className="w-12">{t("image")}</TableHead>
                            <TableHead>{t("name")}</TableHead>
                            <TableHead>{t("category")}</TableHead>
                            <TableHead>{t("price")}</TableHead>
                            <TableHead>{t("stock")}</TableHead>
                            <TableHead>{t("status")}</TableHead>
                            <TableHead className="w-14"></TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {result.products.length === 0 && (
                            <TableRow>
                                <TableCell colSpan={7} className="py-8 text-center text-muted-foreground">
                                    {t("empty")}
                                </TableCell>
                            </TableRow>
                        )}
                        {result.products.map((product) => {
                            const image = product.images[0];
                            const lowStock = product.stock_quantity <= product.low_stock_threshold;
                            const name = localizedText(locale, product.name_he, product.name_ar);

                            return (
                                <TableRow key={product.id}>
                                    <TableCell>
                                        <div className="relative aspect-square size-10 overflow-hidden rounded-md border bg-muted">
                                            <Image
                                                src={productImageUrl(image?.storage_path, product.slug)}
                                                alt={image?.alt_text ?? name}
                                                fill
                                                sizes="40px"
                                                className="object-cover"
                                            />
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        <Link
                                            href={`/admin/products/${product.id}`}
                                            className="font-medium hover:underline"
                                        >
                                            {name}
                                        </Link>
                                        <div className="text-xs text-muted-foreground" dir="ltr">
                                            {product.slug}
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        {product.category_id
                                            ? categoryNames.get(product.category_id) ?? "—"
                                            : "—"}
                                    </TableCell>
                                    <TableCell>{formatILS(product.price_agorot, locale)}</TableCell>
                                    <TableCell>
                                        <Badge variant={lowStock ? "destructive" : "secondary"}>
                                            {t("inStockCount", { count: product.stock_quantity })}
                                        </Badge>
                                    </TableCell>
                                    <TableCell>
                                        <Badge variant={product.is_active ? "default" : "outline"}>
                                            {product.is_active ? t("active") : t("inactive")}
                                        </Badge>
                                    </TableCell>
                                    <TableCell>
                                        <Button asChild variant="ghost" size="icon">
                                            <Link href={`/admin/products/${product.id}`}>
                                                <Pencil className="size-4" />
                                            </Link>
                                        </Button>
                                    </TableCell>
                                </TableRow>
                            );
                        })}
                    </TableBody>
                </Table>
            </div>

            <Pagination
                page={result.page}
                totalPages={result.totalPages}
                buildHref={buildHref}
            />
        </div>
    );
}
