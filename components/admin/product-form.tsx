"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";

import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2 } from "lucide-react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";

import { ImageUploader } from "@/components/admin/image-uploader";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
    Form,
    FormControl,
    FormDescription,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import type { ProductListItem } from "@/lib/data/products";
import {
    createProduct,
    updateProduct,
    type ActionResult,
} from "@/lib/actions/products";
import { agorotToShekelInput } from "@/lib/utils/currency";
import {
    productFormSchema,
    type ProductFormValues,
} from "@/lib/validations/product";

const NO_CATEGORY = "none";

export function ProductForm({
    product,
    categories,
}: {
    product?: ProductListItem;
    categories: { id: string; name_he: string }[];
}) {
    const router = useRouter();
    const [pending, startTransition] = useTransition();

    const form = useForm<ProductFormValues>({
        resolver: zodResolver(productFormSchema),
        defaultValues: product
            ? {
                name_he: product.name_he,
                slug: product.slug,
                description_he: product.description_he ?? "",
                price_shekels: agorotToShekelInput(product.price_agorot),
                compare_at_price_shekels:
                    product.compare_at_price_agorot != null
                        ? agorotToShekelInput(product.compare_at_price_agorot)
                        : "",
                stock_quantity: product.stock_quantity,
                low_stock_threshold: product.low_stock_threshold,
                category_id: product.category_id ?? undefined,
                is_active: product.is_active,
                sort_order: product.sort_order,
            }
            : {
                name_he: "",
                slug: "",
                description_he: "",
                price_shekels: "",
                compare_at_price_shekels: "",
                stock_quantity: 0,
                low_stock_threshold: 5,
                category_id: undefined,
                is_active: true,
                sort_order: 0,
            },
    });

    function onSubmit(values: ProductFormValues) {
        startTransition(async () => {
            const result: ActionResult = product
                ? await updateProduct(product.id, values)
                : await createProduct(values);

            if (result?.error) {
                toast.error(result.error);
                return;
            }

            toast.success(product ? "המוצר עודכן" : "המוצר נוצר");
            router.push("/admin/products");
            router.refresh();
        });
    }

    return (
        <Form {...form}>
            <form
                onSubmit={form.handleSubmit(onSubmit)}
                className="grid max-w-2xl gap-6"
            >
                <div className="grid gap-4 sm:grid-cols-2">
                    <FormField
                        control={form.control}
                        name="name_he"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>שם מוצר</FormLabel>
                                <FormControl>
                                    <Input placeholder="למשל: לחם מחמצת" {...field} />
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
                                    <Input placeholder="sourdough" dir="ltr" {...field} />
                                </FormControl>
                                <FormDescription>מזהה ייחודי בכתובת האתר</FormDescription>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                </div>

                <FormField
                    control={form.control}
                    name="description_he"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel>תיאור</FormLabel>
                            <FormControl>
                                <Textarea placeholder="תיאור המוצר..." {...field} />
                            </FormControl>
                            <FormMessage />
                        </FormItem>
                    )}
                />

                <div className="grid gap-4 sm:grid-cols-2">
                    <FormField
                        control={form.control}
                        name="price_shekels"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>מחיר (₪)</FormLabel>
                                <FormControl>
                                    <Input placeholder="12.50" dir="ltr" {...field} />
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                    <FormField
                        control={form.control}
                        name="compare_at_price_shekels"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>מחיר השוואה (₪)</FormLabel>
                                <FormControl>
                                    <Input placeholder="אופציונלי" dir="ltr" {...field} />
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                </div>

                <div className="grid gap-4 sm:grid-cols-3">
                    <FormField
                        control={form.control}
                        name="category_id"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>קטגוריה</FormLabel>
                                <FormControl>
                                    <Select
                                        value={field.value ?? NO_CATEGORY}
                                        onValueChange={(v) =>
                                            field.onChange(v === NO_CATEGORY ? undefined : v)
                                        }
                                    >
                                        <SelectTrigger className="w-full">
                                            <SelectValue placeholder="בחירת קטגוריה" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value={NO_CATEGORY}>ללא קטגוריה</SelectItem>
                                            {categories.map((c) => (
                                                <SelectItem key={c.id} value={c.id}>
                                                    {c.name_he}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                    <FormField
                        control={form.control}
                        name="stock_quantity"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>כמות במלאי</FormLabel>
                                <FormControl>
                                    <Input type="number" min={0} {...field} />
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                    <FormField
                        control={form.control}
                        name="low_stock_threshold"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>סף מלאי נמוך</FormLabel>
                                <FormControl>
                                    <Input type="number" min={0} {...field} />
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                    <FormField
                        control={form.control}
                        name="sort_order"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>סדר תצוגה</FormLabel>
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
                                <FormLabel>מוצר פעיל (מוצג בחנות)</FormLabel>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                </div>

                {product && (
                    <div className="grid gap-2">
                        <FormLabel>תמונות</FormLabel>
                        <ImageUploader
                            productId={product.id}
                            productSlug={product.slug}
                            images={product.images}
                        />
                    </div>
                )}

                <div className="flex gap-3">
                    <Button type="submit" disabled={pending}>
                        {pending && <Loader2 className="size-4 animate-spin" />}
                        {product ? "שמור שינויים" : "יצירת מוצר"}
                    </Button>
                    <Button
                        type="button"
                        variant="outline"
                        onClick={() => router.push("/admin/products")}
                    >
                        ביטול
                    </Button>
                </div>
            </form>
        </Form>
    );
}