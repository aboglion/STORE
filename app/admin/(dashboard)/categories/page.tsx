import type { Metadata } from "next";
import { getLocale, getTranslations } from "next-intl/server";

import { Pencil, Plus } from "lucide-react";

import { CategoryDialog } from "@/components/admin/category-dialog";
import { DeleteCategoryButton } from "@/components/admin/delete-category-button";
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
import { getCategories } from "@/lib/data/products";
import { localizedText, type Locale } from "@/lib/i18n/config";

export async function generateMetadata(): Promise<Metadata> {
    const t = await getTranslations("admin.categories");
    return {
        title: t("title"),
    };
}

export default async function AdminCategoriesPage() {
    await requireAdmin();

    const locale = (await getLocale()) as Locale;
    const t = await getTranslations("admin.categories");
    const categories = await getCategories();

    return (
        <div className="grid gap-6">
            <div className="flex flex-wrap items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold">{t("title")}</h1>
                    <p className="mt-1 text-sm text-muted-foreground">
                        {t("count", { count: categories.length })}
                    </p>
                </div>
                <CategoryDialog
                    trigger={
                        <Button>
                            <Plus />
                            {t("newCategory")}
                        </Button>
                    }
                />
            </div>

            <div className="overflow-hidden rounded-2xl border border-border/70 bg-card shadow-soft">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>{t("name")}</TableHead>
                            <TableHead>{t("slug")}</TableHead>
                            <TableHead>{t("sort")}</TableHead>
                            <TableHead>{t("status")}</TableHead>
                            <TableHead className="w-20"></TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {categories.length === 0 && (
                            <TableRow>
                                <TableCell colSpan={5} className="py-8 text-center text-muted-foreground">
                                    {t("empty")}
                                </TableCell>
                            </TableRow>
                        )}
                        {categories.map((category) => (
                            <TableRow key={category.id}>
                                <TableCell className="font-medium">
                                    {localizedText(locale, category.name_he, category.name_ar)}
                                </TableCell>
                                <TableCell dir="ltr" className="text-muted-foreground">
                                    {category.slug}
                                </TableCell>
                                <TableCell>{category.sort_order}</TableCell>
                                <TableCell>
                                    <Badge variant={category.is_active ? "default" : "outline"}>
                                        {category.is_active ? t("activeLabel") : t("inactiveLabel")}
                                    </Badge>
                                </TableCell>
                                <TableCell>
                                    <div className="flex items-center gap-1">
                                        <CategoryDialog
                                            category={category}
                                            trigger={
                                                <Button variant="ghost" size="icon">
                                                    <Pencil className="size-4" />
                                                </Button>
                                            }
                                        />
                                        <DeleteCategoryButton categoryId={category.id} />
                                    </div>
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </div>
        </div>
    );
}
