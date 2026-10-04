import type { Metadata } from "next";
import Link from "next/link";

import { ChevronRight } from "lucide-react";

import { ProductForm } from "@/components/admin/product-form";
import { Card, CardContent } from "@/components/ui/card";
import { requireAdmin } from "@/lib/auth";
import { getCategories } from "@/lib/data/products";

export const metadata: Metadata = {
    title: "מוצר חדש",
};

export default async function NewProductPage() {
    await requireAdmin();
    const categories = await getCategories();

    return (
        <div className="grid max-w-3xl gap-6">
            <div>
                <Link
                    href="/admin/products"
                    className="mb-2 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
                >
                    <ChevronRight className="size-4" />
                    חזרה למוצרים
                </Link>
                <h1 className="text-2xl font-bold">מוצר חדש</h1>
            </div>

            <Card>
                <CardContent className="pt-6">
                    <ProductForm categories={categories} />
                </CardContent>
            </Card>
        </div>
    );
}