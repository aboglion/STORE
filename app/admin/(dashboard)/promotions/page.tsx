import type { Metadata } from "next";
import { getLocale, getTranslations } from "next-intl/server";

import { CalendarDays, Pencil, Plus } from "lucide-react";

import { DeletePromotionButton } from "@/components/admin/delete-promotion-button";
import { PromotionBannerForm } from "@/components/admin/promotion-banner-form";
import { PromotionDialog } from "@/components/admin/promotion-dialog";
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
import { getCategories, getAllProducts } from "@/lib/data/products";
import { getPromotions } from "@/lib/data/promotions";
import { getSettings } from "@/lib/data/storefront";
import { localizedText, type Locale } from "@/lib/i18n/config";
import { formatDateTime } from "@/lib/utils/dates";
import type { PromotionType } from "@/types/database.types";

export async function generateMetadata(): Promise<Metadata> {
    const t = await getTranslations("admin.promotions");
    return {
        title: t("title"),
    };
}

const TYPE_BADGE_VARIANTS: Record<
    PromotionType,
    "default" | "outline" | "secondary"
> = {
    multi_buy: "default",
    price_deal: "secondary",
    free_shipping: "outline",
};

export default async function AdminPromotionsPage() {
    await requireAdmin();

    const locale = (await getLocale()) as Locale;
    const t = await getTranslations("admin.promotions");
    const [promotions, categories, products, settings] = await Promise.all([
        getPromotions(),
        getCategories(),
        getAllProducts(),
        getSettings(),
    ]);

    const productOptions = products.map((p) => ({
        id: p.id,
        name_he: p.name_he,
        name_ar: p.name_ar,
        price_agorot: p.price_agorot,
        compare_at_price_agorot: p.compare_at_price_agorot,
        image_path: p.images?.[0]?.storage_path ?? null,
    }));

    return (
        <div className="grid gap-6">
            <div className="flex flex-wrap items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold">{t("title")}</h1>
                    <p className="mt-1 text-sm text-muted-foreground">
                        {t("count", { count: promotions.length })}
                    </p>
                </div>
                <PromotionDialog
                    categories={categories}
                    products={productOptions}
                    trigger={
                        <Button>
                            <Plus />
                            {t("newPromotion")}
                        </Button>
                    }
                />
            </div>

            {/* Site banner shown at the top of the public promotions page */}
            <PromotionBannerForm
                imagePath={settings.promotions_banner.image_path}
                titleHe={settings.promotions_banner.title_he}
                titleAr={settings.promotions_banner.title_ar}
                enabled={settings.promotions_banner.enabled}
            />

            <div className="overflow-hidden rounded-2xl border border-border/70 bg-card shadow-soft">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>{t("name")}</TableHead>
                            <TableHead>{t("type")}</TableHead>
                            <TableHead>{t("scope")}</TableHead>
                            <TableHead>{t("schedule")}</TableHead>
                            <TableHead>{t("status")}</TableHead>
                            <TableHead className="w-20"></TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {promotions.length === 0 && (
                            <TableRow>
                                <TableCell colSpan={6} className="py-8 text-center text-muted-foreground">
                                    {t("empty")}
                                </TableCell>
                            </TableRow>
                        )}
                        {promotions.map((promotion) => {
                            const scopeText =
                                promotion.scope_type === "category"
                                    ? categories.find(
                                        (c) => c.id === promotion.category_id
                                    )?.name_he ?? t("scopes.category")
                                    : promotion.scope_type === "products"
                                        ? t("scopes.products", {
                                            count: promotion.product_ids.length,
                                        })
                                        : t("scopes.all");
                            return (
                                <TableRow key={promotion.id}>
                                    <TableCell className="font-medium">
                                        {localizedText(
                                            locale,
                                            promotion.name_he,
                                            promotion.name_ar
                                        )}
                                    </TableCell>
                                    <TableCell>
                                        <Badge
                                            variant={TYPE_BADGE_VARIANTS[promotion.type]}
                                        >
                                            {t(`types.${promotion.type}`)}
                                        </Badge>
                                    </TableCell>
                                    <TableCell className="text-muted-foreground">
                                        {scopeText}
                                    </TableCell>
                                    <TableCell className="text-muted-foreground">
                                        {promotion.starts_at || promotion.ends_at ? (
                                            <span className="flex items-center gap-1.5 text-xs">
                                                <CalendarDays className="size-3.5" />
                                                {promotion.starts_at
                                                    ? formatDateTime(
                                                        promotion.starts_at,
                                                        locale
                                                    )
                                                    : "∞"}
                                                {" — "}
                                                {promotion.ends_at
                                                    ? formatDateTime(
                                                        promotion.ends_at,
                                                        locale
                                                    )
                                                    : "∞"}
                                            </span>
                                        ) : (
                                            <span className="text-xs text-muted-foreground">
                                                {t("always")}
                                            </span>
                                        )}
                                    </TableCell>
                                    <TableCell>
                                        <Badge
                                            variant={
                                                promotion.is_active
                                                    ? "default"
                                                    : "outline"
                                            }
                                        >
                                            {promotion.is_active
                                                ? t("activeLabel")
                                                : t("inactiveLabel")}
                                        </Badge>
                                    </TableCell>
                                    <TableCell>
                                        <div className="flex items-center gap-1">
                                            <PromotionDialog
                                                promotion={promotion}
                                                categories={categories}
                                                products={productOptions}
                                                trigger={
                                                    <Button variant="ghost" size="icon">
                                                        <Pencil className="size-4" />
                                                    </Button>
                                                }
                                            />
                                            <DeletePromotionButton
                                                promotionId={promotion.id}
                                            />
                                        </div>
                                    </TableCell>
                                </TableRow>
                            );
                        })}
                    </TableBody>
                </Table>
            </div>
        </div>
    );
}