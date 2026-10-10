"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";

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
    const t = useTranslations("admin.categories");
    const tv = useTranslations("validation");
    const [open, setOpen] = useState(false);
    const [pending, startTransition] = useTransition();

    const schema = useMemo(() => categoryFormSchema(tv), [tv]);

    const form = useForm<CategoryFormValues>({
        resolver: zodResolver(schema),
        defaultValues: category
            ? {
                name_he: category.name_he,
                name_ar: category.name_ar ?? "",
                slug: category.slug,
                is_active: category.is_active,
                sort_order: category.sort_order,
            }
            : {
                name_he: "",
                name_ar: "",
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

            toast.success(category ? t("updatedToast") : t("createdToast"));
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
                        {category ? t("editCategory") : t("newCategory")}
                    </DialogTitle>
                    <DialogDescription>
                        {t("desc")}
                    </DialogDescription>
                </DialogHeader>

                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="grid gap-4">
                        <FormField
                            control={form.control}
                            name="name_he"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>{t("nameLabel")}</FormLabel>
                                    <FormControl>
                                        <Input placeholder={t("namePlaceholder")} {...field} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        <FormField
                            control={form.control}
                            name="name_ar"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>{t("nameArLabel")}</FormLabel>
                                    <FormControl>
                                        <Input placeholder="مثال: المخبوزات" {...field} />
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
                                    <FormLabel>{t("slug")}</FormLabel>
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
                                        <FormLabel>{t("sortLabel")}</FormLabel>
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
                                        <FormLabel>{t("activeLabel")}</FormLabel>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                        </div>
                        <DialogFooter>
                            <Button type="submit" disabled={pending}>
                                {pending && <Loader2 className="size-4 animate-spin" />}
                                {category ? t("save") : t("create")}
                            </Button>
                        </DialogFooter>
                    </form>
                </Form>
            </DialogContent>
        </Dialog>
    );
}
