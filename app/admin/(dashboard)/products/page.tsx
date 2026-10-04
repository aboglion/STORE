import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";

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
import { formatILS } from "@/lib/utils/currency";
import { productImageUrl } from "@/lib/utils/images";

export const metadata: Metadata = {
    title: "מוצרים",
};

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
        result.categories.map((c) => [c.id, c.name_he])
    );

    return (
        <div className="grid gap-6">
            <div className="flex flex-wrap items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold">מוצרים</h1>
                    <p className="mt-1 text-sm text-muted-foreground">
                        {result.total} מוצרים
                    </p>
                </div>
                <Button asChild>
                    <Link href="/admin/products/new">
                        <Plus />
                        מוצר חדש
                    </Link>
                </Button>
            </div>

            <ProductFilters
                categories={result.categories}
                initial={{ q, category: categoryId, status: params.status }}
            />

            <div className="rounded-md border">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead className="w-12">תמונה</TableHead>
                            <TableHead>שם</TableHead>
                            <TableHead>קטגוריה</TableHead>
                            <TableHead>מחיר</TableHead>
                            <TableHead>מלאי</TableHead>
                            <TableHead>סטטוס</TableHead>
                            <TableHead className="w-14"></TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {result.products.length === 0 && (
                            <TableRow>
                                <TableCell colSpan={7} className="py-8 text-center text-muted-foreground">
                                    אין מוצרים — צור מוצר ראשון
                                </TableCell>
                            </TableRow>
                        )}
                        {result.products.map((product) => {
                            const image = product.images[0];
                            const lowStock = product.stock_quantity <= product.low_stock_threshold;

                            return (
                                <TableRow key={product.id}>
                                    <TableCell>
                                        <div className="relative aspect-square size-10 overflow-hidden rounded-md border bg-muted">
                                            <Image
                                                src={productImageUrl(image?.storage_path, product.slug)}
                                                alt={image?.alt_text ?? product.name_he}
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
                                            {product.name_he}
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
                                    <TableCell>{formatILS(product.price_agorot)}</TableCell>
                                    <TableCell>
                                        <Badge variant={lowStock ? "destructive" : "secondary"}>
                                            {product.stock_quantity} במלאי
                                        </Badge>
                                    </TableCell>
                                    <TableCell>
                                        <Badge variant={product.is_active ? "default" : "outline"}>
                                            {product.is_active ? "פעיל" : "לא פעיל"}
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