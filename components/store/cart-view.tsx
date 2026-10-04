"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState, useTransition } from "react";

import { Loader2, Minus, Plus, ShoppingCart, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { useCart } from "@/contexts/cart-context";
import { getCartProductDetails, type CartProductDetail } from "@/lib/actions/storefront";
import { formatILS } from "@/lib/utils/currency";

export function CartView() {
    const { items, setQuantity, removeItem } = useCart();
    const [details, setDetails] = useState<CartProductDetail[]>([]);
    const [loading, setLoading] = useState(true);
    const [pending, startTransition] = useTransition();

    useEffect(() => {
        const ids = items.map((i) => i.product_id);
        if (ids.length === 0) {
            setDetails([]);
            setLoading(false);
            return;
        }
        setLoading(true);
        startTransition(async () => {
            const result = await getCartProductDetails(ids);
            setDetails(result);
            setLoading(false);
        });
    }, [items]);

    if (items.length === 0) {
        return (
            <div className="flex flex-col items-center gap-4 py-16 text-center">
                <ShoppingCart className="size-12 text-muted-foreground" />
                <div>
                    <h2 className="text-lg font-semibold">הסל ריק</h2>
                    <p className="mt-1 text-sm text-muted-foreground">
                        הוסף מוצרים מהקטלוג כדי להתחיל
                    </p>
                </div>
                <Button asChild>
                    <Link href="/">לקטלוג</Link>
                </Button>
            </div>
        );
    }

    const detailMap = new Map(details.map((d) => [d.id, d]));
    const subtotal = items.reduce((sum, item) => {
        const detail = detailMap.get(item.product_id);
        return sum + (detail ? detail.price_agorot * item.quantity : 0);
    }, 0);

    return (
        <div className="grid gap-8 lg:grid-cols-[1fr_320px]">
            <div className="grid gap-3">
                {loading && (
                    <div className="flex items-center gap-2 py-8 text-muted-foreground">
                        <Loader2 className="size-4 animate-spin" />
                        טוען סל...
                    </div>
                )}

                {!loading &&
                    items.map((item) => {
                        const detail = detailMap.get(item.product_id);
                        const unavailable = !detail || !detail.is_active;

                        return (
                            <div
                                key={item.product_id}
                                className="flex gap-4 rounded-xl border p-3"
                            >
                                <div className="relative aspect-square size-20 shrink-0 overflow-hidden rounded-md bg-muted">
                                    {detail?.image_url ? (
                                        <Image
                                            src={detail.image_url}
                                            alt={detail.name_he}
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
                                        {detail?.name_he ?? "מוצר לא זמין"}
                                    </Link>
                                    {unavailable && (
                                        <span className="text-sm text-destructive">
                                            המוצר לא זמין יותר
                                        </span>
                                    )}
                                    <span className="text-sm text-muted-foreground">
                                        {detail ? formatILS(detail.price_agorot) : "—"} ליחידה
                                    </span>

                                    <div className="mt-auto flex items-center justify-between gap-2">
                                        <div className="flex items-center gap-1">
                                            <Button
                                                variant="outline"
                                                size="icon"
                                                className="size-7"
                                                onClick={() =>
                                                    setQuantity(item.product_id, item.quantity - 1)
                                                }
                                            >
                                                <Minus className="size-3.5" />
                                            </Button>
                                            <span className="w-8 text-center text-sm font-medium">
                                                {item.quantity}
                                            </span>
                                            <Button
                                                variant="outline"
                                                size="icon"
                                                className="size-7"
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
                                            className="size-7 text-muted-foreground hover:text-destructive"
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

            <div className="h-fit rounded-xl border p-4 lg:sticky lg:top-24">
                <h2 className="font-semibold">סיכום</h2>
                <Separator className="my-3" />
                <div className="flex justify-between text-sm">
                    <span>סה"כ מוצרים</span>
                    <span>{formatILS(subtotal)}</span>
                </div>
                <div className="mt-1 text-xs text-muted-foreground">
                    דמי משלוח יחושבו בצ'קאאוט
                </div>
                <Button asChild className="mt-4 w-full" size="lg">
                    <Link href="/checkout">מעבר לצ'קאאוט</Link>
                </Button>
            </div>
        </div>
    );
}