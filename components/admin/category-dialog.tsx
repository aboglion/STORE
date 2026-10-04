"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2 } from "lucide-react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import {
    Form,
    FormControl,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import {
    createCategory,
    updateCategory,
    type ActionResult,
} from "@/lib/actions/products";
import {
    categoryFormSchema,
    type CategoryFormValues,
} from "@/lib/validations/product";
import type { Category } from "@/types/database.types";

export function CategoryDialog({
    category,
    trigger,
}: {
    category?: Category;
    trigger: React.ReactNode;
}) {
    const router = useRouter();
    const [open, setOpen] = useState(false);
    const [pending, startTransition] = useTransition();

    const form = useForm<CategoryFormValues>({
        resolver: zodResolver(categoryFormSchema),
        defaultValues: category
            ? {
                name_he: category.name_he,
                slug: category.slug,
                is_active: category.is_active,
                sort_order: category.sort_order,
            }
            : {
                name_he: "",
                slug: "",
                is_active: true,
                sort_order: 0,
            },
    });

    function onSubmit(values: CategoryFormValues) {
        startTransition(async () => {
            const result: ActionResult = category
                ? await updateCategory(category.id, values)
                : await createCategory(values);

            if (result?.error) {
                toast.error(result.error);
                return;
            }

            toast.success(category ? "הקטגוריה עודכנה" : "הקטגוריה נוצרה");
            setOpen(false);
            router.refresh();
        });
    }

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>{trigger}</DialogTrigger>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>
                        {category ? "עריכת קטגוריה" : "קטגוריה חדשה"}
                    </DialogTitle>
                    <DialogDescription>
                        קטגוריה מאפשרת למיין מוצרים בחנות.
                    </DialogDescription>
                </DialogHeader>

                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="grid gap-4">
                        <FormField
                            control={form.control}
                            name="name_he"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>שם קטגוריה</FormLabel>
                                    <FormControl>
                                        <Input placeholder="למשל: מאפים" {...field} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        <FormField
                            control={form.control}
                            name="slug"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Slug</FormLabel>
                                    <FormControl>
                                        <Input placeholder="baked-goods" dir="ltr" {...field} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        <div className="grid grid-cols-2 gap-4">
                            <FormField
                                control={form.control}
                                name="sort_order"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>סדר</FormLabel>
                                        <FormControl>
                                            <Input type="number" min={0} {...field} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                            <FormField
                                control={form.control}
                                name="is_active"
                                render={({ field }) => (
                                    <FormItem className="flex items-end gap-2">
                                        <FormControl>
                                            <Checkbox
                                                checked={field.value}
                                                onCheckedChange={field.onChange}
                                            />
                                        </FormControl>
                                        <FormLabel>פעילה</FormLabel>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                        </div>
                        <DialogFooter>
                            <Button type="submit" disabled={pending}>
                                {pending && <Loader2 className="size-4 animate-spin" />}
                                {category ? "שמור" : "צור"}
                            </Button>
                        </DialogFooter>
                    </form>
                </Form>
            </DialogContent>
        </Dialog>
    );
}