"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState, useTransition } from "react";
import { useLocale, useTranslations } from "next-intl";

import { Loader2, Minus, Plus, ShoppingBag, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { useCart } from "@/contexts/cart-context";
import { getCartProductDetails, type CartProductDetail } from "@/lib/actions/storefront";
import { localizedText, type Locale } from "@/lib/i18n/config";
import { formatILS } from "@/lib/utils/currency";

import { MobileStickyBar } from "./mobile-sticky-bar";

/**
 * Short-lived client cache for cart product details so quantity edits
 * (which change `items` but not the set of product ids) never re-hit the
 * server. Prices are re-validated server-side at checkout regardless.
 */
const detailsCache = new Map<string, { data: CartProductDetail[]; at: number }>();
const DETAILS_CACHE_TTL_MS = 30_000;

export function CartView() {
    const { items, setQuantity, removeItem } = useCart();
    const t = useTranslations("cart");
    const locale = useLocale() as Locale;
    const [details, setDetails] = useState<CartProductDetail[]>([]);
    const [loading, setLoading] = useState(true);
    const [, startTransition] = useTransition();

    // Stable key of the product set — quantity changes don't refetch.
    const idsKey = items.map((i) => i.product_id).sort().join(",");

    useEffect(() => {
        const ids = idsKey ? idsKey.split(",") : [];
        if (ids.length === 0) {
            setDetails([]);
            setLoading(false);
            return;
        }
        const cached = detailsCache.get(idsKey);
        if (cached && Date.now() - cached.at < DETAILS_CACHE_TTL_MS) {
            setDetails(cached.data);
            setLoading(false);
            return;
        }
        setLoading(true);
        startTransition(async () => {
            const result = await getCartProductDetails(ids);
            detailsCache.set(idsKey, { data: result, at: Date.now() });
            setDetails(result);
            setLoading(false);
        });
    }, [idsKey, startTransition]);

    if (items.length === 0) {
        return (
            <div className="flex flex-col items-center gap-4 py-16 text-center">
                <div className="flex size-16 items-center justify-center rounded-full bg-secondary text-secondary-foreground shadow-soft">
                    <ShoppingBag className="size-7" />
                </div>
                <div>
                    <h2 className="font-display text-xl font-bold">{t("empty")}</h2>
                    <p className="mt-1 text-sm text-muted-foreground">
                        {t("emptyHint")}
                    </p>
                </div>
                <Button asChild size="lg">
                    <Link href="/">{t("toCatalog")}</Link>
                </Button>
            </div>
        );
    }

    const detailMap = new Map(details.map((d) => [d.id, d]));
    const subtotal = items.reduce((sum, item) => {
        const detail = detailMap.get(item.product_id);
        return sum + (detail ? detail.price_agorot * item.quantity : 0);
    }, 0);
    const hasUnavailableItems = items.some((item) => {
        const detail = detailMap.get(item.product_id);
        return !detail || !detail.is_active || detail.stock_quantity <= 0;
    });

    return (
        <>
            <div className="grid gap-4 lg:grid-cols-[1fr_320px] lg:items-start">
                <div className="grid gap-3">
                    {loading && (
                        <div className="flex items-center gap-2 py-8 text-muted-foreground">
                            <Loader2 className="size-4 animate-spin" />
                            {t("loading")}
                        </div>
                    )}

                    {!loading &&
                        items.map((item) => {
                            const detail = detailMap.get(item.product_id);
                            const unavailable = !detail || !detail.is_active;
                            const outOfStock = detail && detail.stock_quantity <= 0;
                            const name = detail
                                ? localizedText(locale, detail.name_he, detail.name_ar)
                                : t("unavailable");

                            return (
                                <div
                                    key={item.product_id}
                                    className="flex gap-3 rounded-2xl border border-border/70 bg-card p-3 shadow-soft"
                                >
                                    <div className="relative aspect-square size-20 shrink-0 overflow-hidden rounded-xl bg-muted">
                                        {detail?.image_url ? (
                                            <Image
                                                src={detail.image_url}
                                                alt={name}
                                                fill
                                                sizes="80px"
                                                className="object-cover"
                                            />
                                        ) : (
                                            <div className="flex size-full items-center justify-center text-xs text-muted-foreground">
                                                —
                                            </div>
                                        )}
                                    </div>

                                    <div className="flex min-w-0 flex-1 flex-col gap-1">
                                        <Link
                                            href={`/products/${detail?.slug ?? ""}`}
                                            className="truncate font-medium hover:underline"
                                        >
                                            {name}
                                        </Link>
                                        {unavailable && (
                                            <span className="text-sm text-destructive">
                                                {t("unavailable")}
                                            </span>
                                        )}
                                        {outOfStock && (
                                            <span className="text-sm text-destructive">
                                                {t("outOfStock")}
                                            </span>
                                        )}
                                        <span className="text-sm text-muted-foreground">
                                            {detail ? formatILS(detail.price_agorot, locale) : "—"} {t("perUnit")}
                                        </span>

                                        <div className="mt-auto flex items-center justify-between gap-2 pt-1">
                                            <div className="flex items-center gap-1 rounded-full bg-muted p-1">
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    className="size-8 rounded-full"
                                                    onClick={() =>
                                                        setQuantity(item.product_id, item.quantity - 1)
                                                    }
                                                >
                                                    <Minus className="size-3.5" />
                                                </Button>
                                                <span className="w-8 text-center text-sm font-semibold">
                                                    {item.quantity}
                                                </span>
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    className="size-8 rounded-full"
                                                    disabled={
                                                        detail
                                                            ? item.quantity >= detail.stock_quantity
                                                            : false
                                                    }
                                                    onClick={() =>
                                                        setQuantity(item.product_id, item.quantity + 1)
                                                    }
                                                >
                                                    <Plus className="size-3.5" />
                                                </Button>
                                            </div>

                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                className="size-8 text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
                                                onClick={() => removeItem(item.product_id)}
                                            >
                                                <Trash2 className="size-4" />
                                            </Button>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                </div>

                <div className="hidden lg:block">
                    <div className="sticky top-24 rounded-2xl border border-border/70 bg-card p-5 shadow-soft">
                        <h2 className="font-display text-lg font-bold">{t("summary")}</h2>
                        <Separator className="my-3" />
                        <div className="flex justify-between text-sm">
                            <span>{t("itemsTotal")} ({t("includingVat")})</span>
                            <span className="font-semibold">{formatILS(subtotal, locale)}</span>
                        </div>
                        <div className="mt-1 text-xs text-muted-foreground">
                            {t("deliveryAtCheckout")}
                        </div>
                        <div className="mt-1 text-[11px] text-emerald-600 dark:text-emerald-400 font-medium">
                            ✓ {t("vatNotice")}
                        </div>
                        {hasUnavailableItems ? (
                            <Button className="mt-4 w-full" size="lg" disabled>
                                {t("toCheckout")}
                            </Button>
                        ) : (
                            <Button asChild className="mt-4 w-full" size="lg">
                                <Link href="/checkout">{t("toCheckout")}</Link>
                            </Button>
                        )}
                        {hasUnavailableItems && (
                            <p className="mt-2 text-center text-xs text-destructive">
                                {t("unavailableWarning")}
                            </p>
                        )}
                    </div>
                </div>
            </div>

            {!loading && (
                <MobileStickyBar>
                    <div className="flex shrink-0 flex-col">
                        <span className="text-[10px] text-muted-foreground">{t("total")} ({t("includingVat")})</span>
                        <span className="font-display text-lg font-extrabold text-primary">
                            {formatILS(subtotal, locale)}
                        </span>
                    </div>
                    {hasUnavailableItems ? (
                        <Button size="lg" className="flex-1" disabled>
                            {t("toCheckout")}
                        </Button>
                    ) : (
                        <Button asChild size="lg" className="flex-1">
                            <Link href="/checkout">{t("toCheckout")}</Link>
                        </Button>
                    )}
                </MobileStickyBar>
            )}
        </>
    );
}
