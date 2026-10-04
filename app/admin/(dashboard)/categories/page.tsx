import type { Metadata } from "next";

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

export const metadata: Metadata = {
    title: "קטגוריות",
};

export default async function AdminCategoriesPage() {
    await requireAdmin();
    const categories = await getCategories();

    return (
        <div className="grid gap-6">
            <div className="flex flex-wrap items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold">קטגוריות</h1>
                    <p className="mt-1 text-sm text-muted-foreground">
                        {categories.length} קטגוריות
                    </p>
                </div>
                <CategoryDialog
                    trigger={
                        <Button>
                            <Plus />
                            קטגוריה חדשה
                        </Button>
                    }
                />
            </div>

            <div className="rounded-md border">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>שם</TableHead>
                            <TableHead>Slug</TableHead>
                            <TableHead>סדר</TableHead>
                            <TableHead>סטטוס</TableHead>
                            <TableHead className="w-20"></TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {categories.length === 0 && (
                            <TableRow>
                                <TableCell colSpan={5} className="py-8 text-center text-muted-foreground">
                                    אין קטגוריות עדיין
                                </TableCell>
                            </TableRow>
                        )}
                        {categories.map((category) => (
                            <TableRow key={category.id}>
                                <TableCell className="font-medium">{category.name_he}</TableCell>
                                <TableCell dir="ltr" className="text-muted-foreground">
                                    {category.slug}
                                </TableCell>
                                <TableCell>{category.sort_order}</TableCell>
                                <TableCell>
                                    <Badge variant={category.is_active ? "default" : "outline"}>
                                        {category.is_active ? "פעילה" : "לא פעילה"}
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