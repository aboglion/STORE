"use client";

import Image from "next/image";
import { useMemo, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";

import { zodResolver } from "@hookform/resolvers/zod";
import imageCompression from "browser-image-compression";
import {
    BadgePercent,
    Gift,
    Globe,
    Loader2,
    Package,
    Search,
    Tags,
    Trash2,
    Truck,
    Upload,
} from "lucide-react";
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
    FormDescription,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import {
    createPromotion,
    removePromotionImage,
    updatePromotion,
    uploadPromotionImage,
    type PromotionActionResult,
} from "@/lib/actions/promotions";
import { localizedText, type Locale } from "@/lib/i18n/config";
import { cn } from "@/lib/utils";
import { agorotToShekelInput } from "@/lib/utils/currency";
import { storageImageUrl } from "@/lib/utils/images";
import {
    promotionFormSchema,
    type PromotionFormValues,
} from "@/lib/validations/promotion";
import type {
    Category,
    Promotion,
    PromotionScopeType,
    PromotionType,
} from "@/types/database.types";

interface PromotionDialogProps {
    promotion?: Promotion;
    categories: Pick<Category, "id" | "name_he" | "name_ar">[];
    products: Array<{ id: string; name_he: string; name_ar: string | null }>;
    trigger: React.ReactNode;
}

const TYPE_ICONS: Record<PromotionType, React.ComponentType<{ className?: string }>> = {
    multi_buy: Gift,
    price_deal: BadgePercent,
    free_shipping: Truck,
};

const SCOPE_ICONS: Record<PromotionScopeType, React.ComponentType<{ className?: string }>> = {
    all: Globe,
    category: Tags,
    products: Package,
};

/** ISO timestamp → local "YYYY-MM-DDTHH:mm" for datetime-local inputs. */
function isoToLocalInput(iso: string | null): string {
    if (!iso) return "";
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return "";
    const pad = (n: number) => String(n).padStart(2, "0");
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function PromotionDialog({
    promotion,
    categories,
    products,
    trigger,
}: PromotionDialogProps) {
    const router = useRouter();
    const t = useTranslations("admin.promotions");
    const tv = useTranslations("validation");
    const locale = useLocale() as Locale;
    const [open, setOpen] = useState(false);
    const [pending, startTransition] = useTransition();
    const [productSearch, setProductSearch] = useState("");
    const [imagePath, setImagePath] = useState(promotion?.image_path ?? "");
    const [pendingImage, setPendingImage] = useState<File | null>(null);
    const [pendingImageUrl, setPendingImageUrl] = useState("");
    const [imageUploading, setImageUploading] = useState(false);
    const [imageFailed, setImageFailed] = useState(false);
    const imageInputRef = useRef<HTMLInputElement>(null);
    const hasPendingImage = Boolean(pendingImage && pendingImageUrl);
    const imageSrc =
        pendingImageUrl ||
        (imagePath && !imageFailed ? storageImageUrl(imagePath) : "");

    async function handleImageFiles(files: FileList | null) {
        const file = files?.[0];
        if (!file) return;

        if (!file.type.startsWith("image/")) {
            toast.error(t("notImageToast"));
            return;
        }

        setImageUploading(true);
        try {
            const compressed = await imageCompression(file, {
                maxSizeMB: 1.5,
                maxWidthOrHeight: 1200,
                useWebWorker: true,
            });

            if (promotion) {
                // Editing an existing promotion → upload straight away.
                startTransition(async () => {
                    const res = await uploadPromotionImage(
                        promotion.id,
                        compressed
                    );
                    if (res?.error) {
                        toast.error(res.error);
                    } else if (res?.path) {
                        setImagePath(res.path);
                        setImageFailed(false);
                        toast.success(t("imageUploadedToast"));
                    }
                });
            } else {
                // Creating a new promotion → keep the image locally and
                // upload it right after the promotion row is created.
                setPendingImageUrl((prev) => {
                    if (prev) URL.revokeObjectURL(prev);
                    return URL.createObjectURL(compressed);
                });
                setPendingImage(compressed);
                setImageFailed(false);
            }
        } catch {
            toast.error(t("compressFailedToast"));
        } finally {
            setImageUploading(false);
            if (imageInputRef.current) imageInputRef.current.value = "";
        }
    }

    function handleRemoveImage() {
        if (!promotion) {
            if (pendingImageUrl) URL.revokeObjectURL(pendingImageUrl);
            setPendingImage(null);
            setPendingImageUrl("");
            return;
        }
        startTransition(async () => {
            const res = await removePromotionImage(promotion.id);
            if (res?.error) {
                toast.error(res.error);
                return;
            }
            setImagePath("");
            toast.success(t("imageRemovedToast"));
        });
    }

    function handleOpenChange(next: boolean) {
        setOpen(next);
        if (!next) {
            // Discard any locally-previewed image on close (create flow).
            if (pendingImageUrl) URL.revokeObjectURL(pendingImageUrl);
            setPendingImage(null);
            setPendingImageUrl("");
        }
    }

    const schema = useMemo(() => promotionFormSchema(tv), [tv]);

    const form = useForm<PromotionFormValues>({
        resolver: zodResolver(schema),
        defaultValues: promotion
            ? {
                name_he: promotion.name_he,
                name_ar: promotion.name_ar ?? "",
                type: promotion.type,
                is_active: promotion.is_active,
                starts_at: isoToLocalInput(promotion.starts_at),
                ends_at: isoToLocalInput(promotion.ends_at),
                scope_type: promotion.scope_type,
                category_id: promotion.category_id,
                product_ids: promotion.product_ids,
                sort_order: promotion.sort_order,
                buy_quantity: promotion.config.buy_quantity ?? 0,
                get_quantity: promotion.config.get_quantity ?? 0,
                discount_percent: promotion.config.discount_percent ?? 100,
                deal_price_shekels: promotion.config.deal_price_agorot != null
                    ? agorotToShekelInput(promotion.config.deal_price_agorot)
                    : "",
                min_quantity: promotion.config.min_quantity ?? 0,
                min_subtotal_shekels: promotion.config.min_subtotal_agorot != null
                    ? agorotToShekelInput(promotion.config.min_subtotal_agorot)
                    : "",
            }
            : {
                name_he: "",
                name_ar: "",
                type: "multi_buy",
                is_active: true,
                starts_at: "",
                ends_at: "",
                scope_type: "all",
                category_id: null,
                product_ids: [],
                sort_order: 0,
                buy_quantity: 0,
                get_quantity: 0,
                discount_percent: 100,
                deal_price_shekels: "",
                min_quantity: 0,
                min_subtotal_shekels: "",
            },
    });

    const selectedType = form.watch("type") ?? "multi_buy";
    const selectedScope = form.watch("scope_type") ?? "all";
    const selectedProductIds = form.watch("product_ids") ?? [];

    const filteredProducts = productSearch.trim()
        ? products.filter((p) =>
            `${p.name_he} ${p.name_ar ?? ""}`.includes(productSearch.trim())
        )
        : products;

    function toggleProduct(productId: string, checked: boolean) {
        const current = new Set(form.watch("product_ids") ?? []);
        if (checked) {
            current.add(productId);
        } else {
            current.delete(productId);
        }
        form.setValue("product_ids", Array.from(current), { shouldDirty: true });
    }

    function onSubmit(values: PromotionFormValues) {
        startTransition(async () => {
            if (promotion) {
                const result: PromotionActionResult = await updatePromotion(
                    promotion.id,
                    values
                );
                if (result?.error) {
                    toast.error(result.error);
                    return;
                }
                if (pendingImage) {
                    const imgRes = await uploadPromotionImage(
                        promotion.id,
                        pendingImage
                    );
                    if (imgRes?.error) {
                        toast.error(imgRes.error);
                        return;
                    }
                }
                toast.success(t("updatedToast"));
                setOpen(false);
                router.refresh();
                return;
            }

            const result: PromotionActionResult = await createPromotion(values);
            if (result?.error) {
                toast.error(result.error);
                return;
            }

            if (pendingImage && result?.id) {
                const imgRes = await uploadPromotionImage(result.id, pendingImage);
                if (imgRes?.error) {
                    toast.error(imgRes.error);
                    setOpen(false);
                    router.refresh();
                    return;
                }
            }

            toast.success(t("createdToast"));
            setOpen(false);
            router.refresh();
        });
    }

    return (
        <Dialog open={open} onOpenChange={handleOpenChange}>
            <DialogTrigger asChild>{trigger}</DialogTrigger>
            <DialogContent className="max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>
                        {promotion ? t("editPromotion") : t("newPromotion")}
                    </DialogTitle>
                    <DialogDescription>{t("desc")}</DialogDescription>
                </DialogHeader>

                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="grid gap-4">
                        {/* Name */}
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
                                        <Input placeholder="مثال: اشتر 3 واحصل على 1 مجانًا" {...field} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        {/* Card image — uploaded right away when editing, or kept
                            locally and uploaded once the promotion is created. */}
                        <div className="rounded-xl border border-border/70 bg-muted/30 p-3">
                            <div className="text-sm font-semibold text-muted-foreground">
                                {t("imageLabel")}
                            </div>
                            <div className="mt-2 flex flex-wrap items-center gap-3">
                                <div className="relative aspect-[4/3] w-28 shrink-0 overflow-hidden rounded-lg border border-border/70 bg-muted/40">
                                    {imageSrc ? (
                                        <Image
                                            src={imageSrc}
                                            alt={t("imagePreviewAlt")}
                                            fill
                                            sizes="112px"
                                            className="object-cover"
                                            onError={() => setImageFailed(true)}
                                        />
                                    ) : (
                                        <span className="flex items-center justify-center text-[10px] text-muted-foreground">
                                            {t("noImage")}
                                        </span>
                                    )}
                                </div>
                                <div className="grid gap-1.5">
                                    <input
                                        ref={imageInputRef}
                                        type="file"
                                        accept="image/*"
                                        className="hidden"
                                        onChange={(e) => handleImageFiles(e.target.files)}
                                    />
                                    <Button
                                        type="button"
                                        variant="outline"
                                        size="sm"
                                        className="rounded-full"
                                        disabled={imageUploading || pending}
                                        onClick={() => imageInputRef.current?.click()}
                                    >
                                        {imageUploading ? (
                                            <Loader2 className="size-4 animate-spin" />
                                        ) : (
                                            <Upload className="size-4" />
                                        )}
                                        {imagePath || hasPendingImage
                                            ? t("replaceImage")
                                            : t("uploadImage")}
                                    </Button>
                                    {(imagePath || hasPendingImage) && (
                                        <Button
                                            type="button"
                                            variant="ghost"
                                            size="sm"
                                            className="rounded-full text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
                                            disabled={pending || imageUploading}
                                            onClick={handleRemoveImage}
                                        >
                                            <Trash2 className="size-4" />
                                            {t("removeImage")}
                                        </Button>
                                    )}
                                </div>
                            </div>
                        </div>

                        <Separator className="my-1" />

                        {/* Type */}
                        <div className="text-sm font-semibold text-muted-foreground">
                            {t("typeLabel")}
                        </div>
                        <FormField
                            control={form.control}
                            name="type"
                            render={({ field }) => (
                                <FormItem>
                                    <FormControl>
                                        <RadioGroup
                                            value={field.value}
                                            onValueChange={(value) =>
                                                field.onChange(value as PromotionType)
                                            }
                                            className="grid gap-3"
                                        >
                                            {(["multi_buy", "price_deal", "free_shipping"] as PromotionType[]).map(
                                                (type) => {
                                                    const selected = field.value === type;
                                                    const Icon = TYPE_ICONS[type];
                                                    return (
                                                        <div key={type}>
                                                            <RadioGroupItem
                                                                value={type}
                                                                id={`promo-type-${type}`}
                                                                className="peer sr-only"
                                                            />
                                                            <Label
                                                                htmlFor={`promo-type-${type}`}
                                                                className={cn(
                                                                    "flex cursor-pointer items-center gap-3 rounded-2xl border p-3 transition-all duration-150 active:scale-[0.98] peer-focus-visible:ring-2 peer-focus-visible:ring-ring/50",
                                                                    selected
                                                                        ? "border-primary bg-primary/5 shadow-soft"
                                                                        : "border-border/70 bg-card hover:border-primary/40"
                                                                )}
                                                            >
                                                                <span
                                                                    className={cn(
                                                                        "flex size-9 items-center justify-center rounded-full",
                                                                        selected
                                                                            ? "bg-primary text-primary-foreground"
                                                                            : "bg-secondary text-secondary-foreground"
                                                                    )}
                                                                >
                                                                    <Icon className="size-4.5" />
                                                                </span>
                                                                <span className="flex-1">
                                                                    <span className="block text-sm font-semibold">
                                                                        {t(`types.${type}`)}
                                                                    </span>
                                                                    <span className="block text-xs text-muted-foreground">
                                                                        {t(`types.${type}Desc`)}
                                                                    </span>
                                                                </span>
                                                            </Label>
                                                        </div>
                                                    );
                                                }
                                            )}
                                        </RadioGroup>
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        {/* Type-specific fields */}
                        {selectedType === "multi_buy" && (
                            <div className="grid gap-4 sm:grid-cols-3">
                                <FormField
                                    control={form.control}
                                    name="buy_quantity"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>{t("buyQuantity")}</FormLabel>
                                            <FormControl>
                                                <Input type="number" min={1} {...field} />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                                <FormField
                                    control={form.control}
                                    name="get_quantity"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>{t("getQuantity")}</FormLabel>
                                            <FormControl>
                                                <Input type="number" min={1} {...field} />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                                <FormField
                                    control={form.control}
                                    name="discount_percent"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>{t("discountPercent")}</FormLabel>
                                            <FormControl>
                                                <Input type="number" min={0} max={100} {...field} />
                                            </FormControl>
                                            <FormDescription>
                                                {t("discountPercentDesc")}
                                            </FormDescription>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                            </div>
                        )}

                        {selectedType === "price_deal" && (
                            <FormField
                                control={form.control}
                                name="deal_price_shekels"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>{t("dealPrice")}</FormLabel>
                                        <FormControl>
                                            <Input placeholder="7.90" dir="ltr" {...field} />
                                        </FormControl>
                                        <FormDescription>
                                            {t("dealPriceDesc")}
                                        </FormDescription>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                        )}

                        {selectedType === "free_shipping" && (
                            <div className="grid gap-4 sm:grid-cols-2">
                                <FormField
                                    control={form.control}
                                    name="min_quantity"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>{t("minQuantity")}</FormLabel>
                                            <FormControl>
                                                <Input type="number" min={0} {...field} />
                                            </FormControl>
                                            <FormDescription>
                                                {t("minQuantityDesc")}
                                            </FormDescription>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                                <FormField
                                    control={form.control}
                                    name="min_subtotal_shekels"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>{t("minSubtotal")}</FormLabel>
                                            <FormControl>
                                                <Input placeholder="150" dir="ltr" {...field} />
                                            </FormControl>
                                            <FormDescription>
                                                {t("minSubtotalDesc")}
                                            </FormDescription>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                            </div>
                        )}

                        <Separator className="my-1" />

                        {/* Scope */}
                        <div className="text-sm font-semibold text-muted-foreground">
                            {t("scopeLabel")}
                        </div>
                        <FormField
                            control={form.control}
                            name="scope_type"
                            render={({ field }) => (
                                <FormItem>
                                    <FormControl>
                                        <RadioGroup
                                            value={field.value}
                                            onValueChange={(value) =>
                                                field.onChange(value as PromotionScopeType)
                                            }
                                            className="grid gap-2 sm:grid-cols-3"
                                        >
                                            {(["all", "category", "products"] as PromotionScopeType[]).map(
                                                (scope) => {
                                                    const selected = field.value === scope;
                                                    const Icon = SCOPE_ICONS[scope];
                                                    return (
                                                        <div key={scope}>
                                                            <RadioGroupItem
                                                                value={scope}
                                                                id={`promo-scope-${scope}`}
                                                                className="peer sr-only"
                                                            />
                                                            <Label
                                                                htmlFor={`promo-scope-${scope}`}
                                                                className={cn(
                                                                    "flex cursor-pointer flex-col items-center gap-1.5 rounded-xl border p-2.5 text-center transition-all duration-150 active:scale-[0.98] peer-focus-visible:ring-2 peer-focus-visible:ring-ring/50",
                                                                    selected
                                                                        ? "border-primary bg-primary/5 shadow-soft"
                                                                        : "border-border/70 bg-card hover:border-primary/40"
                                                                )}
                                                            >
                                                                <Icon className="size-4.5" />
                                                                <span className="text-xs font-semibold">
                                                                    {t(`scopes.${scope}`)}
                                                                </span>
                                                            </Label>
                                                        </div>
                                                    );
                                                }
                                            )}
                                        </RadioGroup>
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        {selectedScope === "category" && (
                            <FormField
                                control={form.control}
                                name="category_id"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>{t("categoryLabel")}</FormLabel>
                                        <FormControl>
                                            <Select
                                                value={field.value ?? ""}
                                                onValueChange={(value) =>
                                                    field.onChange(value || null)
                                                }
                                            >
                                                <SelectTrigger className="w-full">
                                                    <SelectValue placeholder={t("categoryPlaceholder")} />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    {categories.map((category) => (
                                                        <SelectItem
                                                            key={category.id}
                                                            value={category.id}
                                                        >
                                                            {localizedText(
                                                                locale,
                                                                category.name_he,
                                                                category.name_ar
                                                            )}
                                                        </SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                        )}

                        {selectedScope === "products" && (
                            <FormField
                                control={form.control}
                                name="product_ids"
                                render={() => (
                                    <FormItem>
                                        <FormLabel>
                                            {t("productsLabel")} ({selectedProductIds.length})
                                        </FormLabel>
                                        <FormControl>
                                            <div className="relative">
                                                <Search className="pointer-events-none absolute start-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                                                <Input
                                                    value={productSearch}
                                                    onChange={(e) =>
                                                        setProductSearch(e.target.value)
                                                    }
                                                    placeholder={t("productsSearch")}
                                                    className="ps-9"
                                                />
                                            </div>
                                            <div className="mt-2 max-h-56 overflow-y-auto rounded-xl border border-border/70 bg-card">
                                                {filteredProducts.length === 0 && (
                                                    <div className="px-3 py-4 text-center text-xs text-muted-foreground">
                                                        {t("productsEmpty")}
                                                    </div>
                                                )}
                                                {filteredProducts.map((product) => {
                                                    const checked = selectedProductIds.includes(
                                                        product.id
                                                    );
                                                    return (
                                                        <label
                                                            key={product.id}
                                                            className="flex cursor-pointer items-center gap-2.5 border-b border-border/50 px-3 py-2 text-sm last:border-0 hover:bg-accent/50"
                                                        >
                                                            <Checkbox
                                                                checked={checked}
                                                                onCheckedChange={(c) =>
                                                                    toggleProduct(
                                                                        product.id,
                                                                        Boolean(c)
                                                                    )
                                                                }
                                                            />
                                                            <span className="min-w-0 flex-1 truncate">
                                                                {localizedText(
                                                                    locale,
                                                                    product.name_he,
                                                                    product.name_ar
                                                                )}
                                                            </span>
                                                        </label>
                                                    );
                                                })}
                                            </div>
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                        )}

                        <Separator className="my-1" />

                        {/* Schedule + status */}
                        <div className="grid gap-4 sm:grid-cols-2">
                            <FormField
                                control={form.control}
                                name="starts_at"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>{t("startsAt")}</FormLabel>
                                        <FormControl>
                                            <Input type="datetime-local" {...field} />
                                        </FormControl>
                                        <FormDescription>
                                            {t("startsAtDesc")}
                                        </FormDescription>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                            <FormField
                                control={form.control}
                                name="ends_at"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>{t("endsAt")}</FormLabel>
                                        <FormControl>
                                            <Input type="datetime-local" {...field} />
                                        </FormControl>
                                        <FormDescription>
                                            {t("endsAtDesc")}
                                        </FormDescription>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                        </div>

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
                            <Button
                                type="submit"
                                disabled={pending || imageUploading}
                            >
                                {pending && <Loader2 className="size-4 animate-spin" />}
                                {promotion ? t("save") : t("create")}
                            </Button>
                        </DialogFooter>
                    </form>
                </Form>
            </DialogContent>
        </Dialog>
    );
}