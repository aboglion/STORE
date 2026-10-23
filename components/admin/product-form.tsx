"use client";

import Image from "next/image";
import { useMemo, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";

import { zodResolver } from "@hookform/resolvers/zod";
import imageCompression from "browser-image-compression";
import { Loader2, Trash2, Upload } from "lucide-react";
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
    uploadProductImage,
    type ActionResult,
} from "@/lib/actions/products";
import { localizedText, type Locale } from "@/lib/i18n/config";
import { agorotToShekelInput } from "@/lib/utils/currency";
import {
    productFormSchema,
    type ProductFormValues,
} from "@/lib/validations/product";

const NO_CATEGORY = "none";

type PendingImage = { file: File; preview: string };

export function ProductForm({
    product,
    categories,
}: {
    product?: ProductListItem;
    categories: { id: string; name_he: string; name_ar: string | null }[];
}) {
    const router = useRouter();
    const t = useTranslations("admin.products");
    const tv = useTranslations("validation");
    const locale = useLocale() as Locale;
    const tImage = useTranslations("admin.images");
    const ts = useTranslations("admin.settings");
    const [pending, startTransition] = useTransition();
    const [imageFiles, setImageFiles] = useState<PendingImage[]>([]);
    const imageInputRef = useRef<HTMLInputElement>(null);

    const schema = useMemo(() => productFormSchema(tv), [tv]);

    const form = useForm<ProductFormValues>({
        resolver: zodResolver(schema),
        defaultValues: product
            ? {
                name_he: product.name_he,
                name_ar: product.name_ar ?? "",
                barcode: product.barcode ?? "",
                slug: product.slug,
                description_he: product.description_he ?? "",
                description_ar: product.description_ar ?? "",
                price_shekels: agorotToShekelInput(product.price_agorot),
                compare_at_price_shekels:
                    product.compare_at_price_agorot != null
                        ? agorotToShekelInput(product.compare_at_price_agorot)
                        : "",
                cost_shekels:
                    product.cost_agorot != null
                        ? agorotToShekelInput(product.cost_agorot)
                        : "",
                stock_quantity: product.stock_quantity,
                low_stock_threshold: product.low_stock_threshold,
                category_id: product.category_id ?? undefined,
                is_active: product.is_active,
                sort_order: product.sort_order,
            }
            : {
                name_he: "",
                name_ar: "",
                barcode: "",
                slug: "",
                description_he: "",
                description_ar: "",
                price_shekels: "",
                compare_at_price_shekels: "",
                cost_shekels: "",
                stock_quantity: 0,
                low_stock_threshold: 5,
                category_id: undefined,
                is_active: true,
                sort_order: 0,
            },
    });

    function onSubmit(values: ProductFormValues) {
        startTransition(async () => {
            if (product) {
                const result: ActionResult = await updateProduct(product.id, values);
                if (result?.error) {
                    toast.error(result.error);
                    return;
                }
                toast.success(t("updatedToast"));
                router.push("/admin/products");
                router.refresh();
                return;
            }

            const result: ActionResult = await createProduct(values);
            if (result?.error) {
                toast.error(result.error);
                return;
            }

            // Images are only attachable once the product row exists —
            // upload each pending file right after creation.
            if (result?.id && imageFiles.length > 0) {
                for (const img of imageFiles) {
                    const res = await uploadProductImage(
                        result.id,
                        img.file.name,
                        img.file
                    );
                    if (res?.error) {
                        toast.error(res.error);
                        break;
                    }
                }
            }

            toast.success(t("createdToast"));
            router.push("/admin/products");
            router.refresh();
        });
    }

    async function handleImageSelection(files: FileList | null) {
        const incoming = Array.from(files ?? []);
        if (incoming.length === 0) return;

        const next: PendingImage[] = [];
        for (const file of incoming) {
            if (!file.type.startsWith("image/")) {
                toast.error(ts("notImageToast"));
                continue;
            }
            const preview = URL.createObjectURL(file);
            try {
                const compressed = await imageCompression(file, {
                    maxSizeMB: 1,
                    maxWidthOrHeight: 1600,
                    useWebWorker: true,
                });
                next.push({ file: compressed, preview });
            } catch {
                toast.error(ts("compressFailedToast"));
                URL.revokeObjectURL(preview);
            }
        }

        if (next.length > 0) setImageFiles((prev) => [...prev, ...next]);
        if (imageInputRef.current) imageInputRef.current.value = "";
    }

    function removePendingImage(index: number) {
        setImageFiles((prev) => {
            const preview = prev[index]?.preview;
            if (preview) URL.revokeObjectURL(preview);
            return prev.filter((_, i) => i !== index);
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
                                    <Input placeholder="مثال: خبز العجين المخمر" {...field} />
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                    <FormField
                        control={form.control}
                        name="barcode"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>{t("barcodeLabel")}</FormLabel>
                                <FormControl>
                                    <Input placeholder="7290000040080" dir="ltr" {...field} />
                                </FormControl>
                                <FormDescription>{t("barcodeDesc")}</FormDescription>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                    <FormField
                        control={form.control}
                        name="slug"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>{t("slugLabel")}</FormLabel>
                                <FormControl>
                                    <Input placeholder="sourdough" dir="ltr" {...field} />
                                </FormControl>
                                <FormDescription>{t("slugDesc")}</FormDescription>
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
                            <FormLabel>{t("descriptionLabel")}</FormLabel>
                            <FormControl>
                                <Textarea placeholder={t("descriptionPlaceholder")} {...field} />
                            </FormControl>
                            <FormMessage />
                        </FormItem>
                    )}
                />

                <FormField
                    control={form.control}
                    name="description_ar"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel>{t("descriptionArLabel")}</FormLabel>
                            <FormControl>
                                <Textarea placeholder="وصف المنتج..." {...field} />
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
                                <FormLabel>{t("priceLabel")}</FormLabel>
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
                                <FormLabel>{t("comparePriceLabel")}</FormLabel>
                                <FormControl>
                                    <Input placeholder={t("optional")} dir="ltr" {...field} />
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                </div>

                <FormField
                    control={form.control}
                    name="cost_shekels"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel>{t("costLabel")}</FormLabel>
                            <FormControl>
                                <Input placeholder={t("optional")} dir="ltr" {...field} />
                            </FormControl>
                            <FormDescription>{t("costDesc")}</FormDescription>
                            <FormMessage />
                        </FormItem>
                    )}
                />

                <div className="grid gap-4 sm:grid-cols-3">
                    <FormField
                        control={form.control}
                        name="category_id"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>{t("categoryLabel")}</FormLabel>
                                <FormControl>
                                    <Select
                                        value={field.value ?? NO_CATEGORY}
                                        onValueChange={(v) =>
                                            field.onChange(v === NO_CATEGORY ? undefined : v)
                                        }
                                    >
                                        <SelectTrigger className="w-full">
                                            <SelectValue placeholder={t("selectCategory")} />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value={NO_CATEGORY}>{t("noCategory")}</SelectItem>
                                            {categories.map((c) => (
                                                <SelectItem key={c.id} value={c.id}>
                                                    {localizedText(locale, c.name_he, c.name_ar)}
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
                                <FormLabel>{t("stockLabel")}</FormLabel>
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
                                <FormLabel>{t("lowStockLabel")}</FormLabel>
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

                {product ? (
                    <div className="grid gap-2">
                        <FormLabel>{t("imagesLabel")}</FormLabel>
                        <ImageUploader
                            productId={product.id}
                            productSlug={product.slug}
                            images={product.images}
                        />
                    </div>
                ) : (
                    <div className="grid gap-2">
                        <FormLabel>{t("imagesLabel")}</FormLabel>
                        {imageFiles.length > 0 && (
                            <FormDescription>
                                {t("imagesPendingHint")}
                            </FormDescription>
                        )}
                        <div className="grid grid-cols-3 gap-3 sm:grid-cols-4">
                            {imageFiles.map((img, index) => (
                                <div
                                    key={img.preview}
                                    className="group relative aspect-square overflow-hidden rounded-md border bg-muted"
                                >
                                    <Image
                                        src={img.preview}
                                        alt={tImage("imageAlt", { index: index + 1 })}
                                        fill
                                        sizes="120px"
                                        className="object-cover"
                                    />
                                    <Button
                                        type="button"
                                        variant="destructive"
                                        size="icon"
                                        className="absolute top-1 right-1 size-7 opacity-0 transition-opacity group-hover:opacity-100"
                                        disabled={pending}
                                        aria-label={tImage("removeImage")}
                                        onClick={() => removePendingImage(index)}
                                    >
                                        <Trash2 className="size-3.5" />
                                    </Button>
                                </div>
                            ))}
                            <button
                                type="button"
                                onClick={() => imageInputRef.current?.click()}
                                disabled={pending}
                                className="flex aspect-square flex-col items-center justify-center gap-1 rounded-md border border-dashed text-sm text-muted-foreground transition-colors hover:border-primary hover:text-primary disabled:opacity-50"
                            >
                                <Upload className="size-5" />
                                <span>{tImage("addImage")}</span>
                            </button>
                        </div>
                        <input
                            ref={imageInputRef}
                            type="file"
                            accept="image/*"
                            multiple
                            className="hidden"
                            onChange={(e) => handleImageSelection(e.target.files)}
                        />
                    </div>
                )}

                <div className="flex gap-3">
                    <Button type="submit" disabled={pending}>
                        {pending && <Loader2 className="size-4 animate-spin" />}
                        {product ? t("saveChanges") : t("createProduct")}
                    </Button>
                    <Button
                        type="button"
                        variant="outline"
                        onClick={() => router.push("/admin/products")}
                    >
                        {t("cancel")}
                    </Button>
                </div>
            </form>
        </Form>
    );
}
