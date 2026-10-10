"use client";

import dynamic from "next/dynamic";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState, useTransition } from "react";
import { useLocale, useTranslations } from "next-intl";

import { zodResolver } from "@hookform/resolvers/zod";
import {
    Banknote,
    Check,
    CreditCard,
    Loader2,
    LocateFixed,
    MapPin,
    NotebookPen,
    ShoppingCart,
    User,
} from "lucide-react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";

import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
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
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { useCart } from "@/contexts/cart-context";
import { createOrder } from "@/lib/actions/orders";
import { getCartProductDetails } from "@/lib/actions/storefront";
import { localizedText, type Locale } from "@/lib/i18n/config";
import { formatILS } from "@/lib/utils/currency";
import { cn } from "@/lib/utils";
import {
    checkoutSchema,
    type CheckoutFormValues,
} from "@/lib/validations/checkout";
import type { CheckoutPayload } from "@/lib/validations/checkout";
import { saveRecentOrder } from "@/lib/utils/recent-orders";

import { MobileStickyBar } from "./mobile-sticky-bar";

// Leaflet is client-only — load the picker without SSR.
const AddressPinPicker = dynamic(
    () => import("./address-pin-picker").then((m) => m.AddressPinPicker),
    { ssr: false }
);

export function CheckoutView() {
    const router = useRouter();
    const { items, clear } = useCart();
    const t = useTranslations("checkout");
    const tv = useTranslations("validation");
    const locale = useLocale() as Locale;
    const [pending, startTransition] = useTransition();
    const [locating, setLocating] = useState(false);
    const [showLocationWarning, setShowLocationWarning] = useState(false);
    const [pendingValues, setPendingValues] = useState<CheckoutFormValues | null>(null);
    const [termsAccepted, setTermsAccepted] = useState(true);
    const [marketingOptIn, setMarketingOptIn] = useState(false);
    const [details, setDetails] = useState<Awaited<
        ReturnType<typeof getCartProductDetails>
    >>([]);

    const schema = useMemo(() => checkoutSchema(tv), [tv]);

    const PAYMENT_OPTIONS = [
        {
            value: "cash",
            label: t("cash"),
            description: t("cashDesc"),
            icon: Banknote,
        },
        {
            value: "card_terminal",
            label: t("card"),
            description: t("cardDesc"),
            icon: CreditCard,
        },
    ] as const;

    const form = useForm<CheckoutFormValues>({
        resolver: zodResolver(schema),
        defaultValues: {
            full_name: "",
            phone: "",
            address: { full_address: "", city: "" },
            payment_method: "cash",
            customer_notes: "",
            lat: null,
            lng: null,
            location_source: "manual",
        },
    });

    const orderItems = items.map((i) => ({ product_id: i.product_id, quantity: i.quantity }));

    useEffect(() => {
        const ids = items.map((i) => i.product_id);
        if (ids.length === 0) {
            setDetails([]);
            return;
        }
        startTransition(async () => {
            const result = await getCartProductDetails(ids);
            setDetails(result);
        });
    }, [items]);

    function handleGeolocation() {
        if (!navigator.geolocation) {
            toast.error(t("geolocationUnsupported"));
            return;
        }
        setLocating(true);
        navigator.geolocation.getCurrentPosition(
            (position) => {
                form.setValue("lat", position.coords.latitude);
                form.setValue("lng", position.coords.longitude);
                form.setValue("location_source", "browser_geolocation");
                toast.success(t("locationCapturedSuccess"));
                setLocating(false);
            },
            () => {
                toast.error(t("locationFailed"));
                setLocating(false);
            },
            { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
        );
    }

    function onSubmit(values: CheckoutFormValues) {
        if (!termsAccepted) {
            toast.error("יש לאשר את תקנון האתר ומדיניות ביטول עסקה כדי לבצע הזמנה");
            return;
        }

        // Soft-required location: without coordinates the courier may not
        // find the customer. Ask once, never hard-block (protects conversion).
        const hasCoords = values.lat != null && values.lng != null;
        if (!hasCoords && !pendingValues) {
            setPendingValues(values);
            setShowLocationWarning(true);
            return;
        }
        setPendingValues(null);

        const payload: CheckoutPayload = {
            customer: values,
            items: orderItems,
        };

        startTransition(async () => {
            const res = await createOrder(payload);
            if (!res.ok) {
                toast.error(res.error ?? t("orderFailed"));
                return;
            }
            if (res.orderNumber) {
                saveRecentOrder({
                    orderNumber: res.orderNumber,
                    phone: values.phone,
                    totalAgorot: res.totalAgorot ?? 0,
                    placedAt: new Date().toISOString(),
                    customerName: values.full_name,
                    itemsCount: orderItems.reduce((acc, i) => acc + i.quantity, 0),
                });
            }
            clear();
            router.push(`/order-success/${res.orderNumber}?total=${res.totalAgorot}`);
        });
    }

    if (items.length === 0) {
        return (
            <div className="flex flex-col items-center gap-4 py-16 text-center">
                <div className="flex size-16 items-center justify-center rounded-full bg-secondary text-secondary-foreground shadow-soft">
                    <ShoppingCart className="size-7" />
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
    const subtotal = orderItems.reduce((sum, item) => {
        const detail = detailMap.get(item.product_id);
        return sum + (detail ? detail.price_agorot * item.quantity : 0);
    }, 0);
    const hasUnavailableItems = orderItems.some((item) => {
        const detail = detailMap.get(item.product_id);
        return !detail || !detail.is_active || detail.stock_quantity <= 0;
    });

    const sectionIcon =
        "flex size-8 items-center justify-center rounded-full bg-primary/10 text-primary";

    return (
        <Form {...form}>
            <form
                onSubmit={form.handleSubmit(onSubmit)}
                className="grid gap-8 lg:grid-cols-[1fr_340px] lg:items-start"
            >
                <div className="grid gap-5">
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2 text-base">
                                <span className={sectionIcon}>
                                    <User className="size-4" />
                                </span>
                                {t("personalDetails")}
                            </CardTitle>
                            <CardDescription>
                                {t("identifyByPhone")}
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="grid gap-4">
                            <FormField
                                control={form.control}
                                name="full_name"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>{t("fullName")}</FormLabel>
                                        <FormControl>
                                            <Input
                                                placeholder={t("fullNamePlaceholder")}
                                                className="h-11 rounded-xl"
                                                {...field}
                                            />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                            <FormField
                                control={form.control}
                                name="phone"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>{t("phone")}</FormLabel>
                                        <FormControl>
                                            <Input
                                                placeholder={t("phonePlaceholder")}
                                                dir="ltr"
                                                inputMode="tel"
                                                className="h-11 rounded-xl"
                                                {...field}
                                            />
                                        </FormControl>
                                        <FormDescription>
                                            {t("contactForDelivery")}
                                        </FormDescription>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center justify-between gap-2">
                                <span className="flex items-center gap-2">
                                    <span className={sectionIcon}>
                                        <MapPin className="size-4" />
                                    </span>
                                    {t("deliveryAddress")}
                                </span>
                                <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    className="rounded-full"
                                    onClick={handleGeolocation}
                                    disabled={locating}
                                >
                                    {locating ? (
                                        <Loader2 className="size-4 animate-spin" />
                                    ) : (
                                        <LocateFixed className="size-4" />
                                    )}
                                    {t("locate")}
                                </Button>
                            </CardTitle>
                            <CardDescription>
                                {t("autoOrManual")}
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="grid gap-4">
                            <FormField
                                control={form.control}
                                name="address.full_address"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>{t("address")}</FormLabel>
                                        <FormControl>
                                            <Input
                                                placeholder={t("addressPlaceholder")}
                                                className="h-11 rounded-xl"
                                                {...field}
                                            />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                            <FormField
                                control={form.control}
                                name="address.city"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>{t("city")}</FormLabel>
                                        <FormControl>
                                            <Input
                                                placeholder={t("cityPlaceholder")}
                                                className="h-11 rounded-xl"
                                                {...field}
                                            />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                            <AddressPinPicker
                                value={{
                                    lat: form.watch("lat") ?? null,
                                    lng: form.watch("lng") ?? null,
                                }}
                                onChange={(v) => {
                                    if (v.lat != null && v.lng != null) {
                                        form.setValue("lat", v.lat);
                                        form.setValue("lng", v.lng);
                                        form.setValue("location_source", "map_pin");
                                    }
                                }}
                                onReverseGeocode={(displayName) => {
                                    if (!displayName) return;
                                    const current =
                                        form.watch("address.full_address") ?? "";
                                    if (!current.trim()) {
                                        form.setValue("address.full_address", displayName);
                                    }
                                }}
                                searchPlaceholder={t("pinSearchPlaceholder")}
                                heightClassName="h-56"
                            />
                            {form.watch("lat") != null && (
                                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                    <MapPin className="size-3.5" />
                                    {t("locationCaptured")}
                                </div>
                            )}
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2 text-base">
                                <span className={sectionIcon}>
                                    <CreditCard className="size-4" />
                                </span>
                                {t("paymentMethod")}
                            </CardTitle>
                            <CardDescription>{t("noOnlinePayment")}</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <FormField
                                control={form.control}
                                name="payment_method"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormControl>
                                            <RadioGroup
                                                value={field.value}
                                                onValueChange={field.onChange}
                                                className="grid gap-3 sm:grid-cols-2"
                                            >
                                                {PAYMENT_OPTIONS.map((option) => {
                                                    const selected =
                                                        field.value === option.value;
                                                    return (
                                                        <div key={option.value}>
                                                            <RadioGroupItem
                                                                value={option.value}
                                                                id={`payment-${option.value}`}
                                                                className="peer sr-only"
                                                            />
                                                            <Label
                                                                htmlFor={`payment-${option.value}`}
                                                                className={cn(
                                                                    "flex cursor-pointer items-center gap-3 rounded-2xl border p-3.5 transition-all duration-150 active:scale-[0.98] peer-focus-visible:ring-2 peer-focus-visible:ring-ring/50",
                                                                    selected
                                                                        ? "border-primary bg-primary/5 shadow-soft"
                                                                        : "border-border/70 bg-card hover:border-primary/40"
                                                                )}
                                                            >
                                                                <span
                                                                    className={cn(
                                                                        "flex size-10 items-center justify-center rounded-full transition-colors",
                                                                        selected
                                                                            ? "bg-primary text-primary-foreground"
                                                                            : "bg-secondary text-secondary-foreground"
                                                                    )}
                                                                >
                                                                    <option.icon className="size-5" />
                                                                </span>
                                                                <span className="flex-1">
                                                                    <span className="block text-sm font-semibold">
                                                                        {option.label}
                                                                    </span>
                                                                    <span className="block text-xs text-muted-foreground">
                                                                        {option.description}
                                                                    </span>
                                                                </span>
                                                                {selected && (
                                                                    <span className="flex size-5 items-center justify-center rounded-full bg-primary text-primary-foreground animate-pop-in">
                                                                        <Check className="size-3" />
                                                                    </span>
                                                                )}
                                                            </Label>
                                                        </div>
                                                    );
                                                })}
                                            </RadioGroup>
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2 text-base">
                                <span className={sectionIcon}>
                                    <NotebookPen className="size-4" />
                                </span>
                                {t("notes")}
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <FormField
                                control={form.control}
                                name="customer_notes"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormControl>
                                            <Textarea
                                                placeholder={t("notesPlaceholder")}
                                                className="rounded-xl"
                                                {...field}
                                            />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                        </CardContent>
                    </Card>

                    {/* Statutory Agreement on Mobile */}
                    <div className="rounded-2xl border border-border/80 bg-card p-4 shadow-soft space-y-3 lg:hidden">
                        <div className="flex items-start gap-2.5">
                            <Checkbox
                                id="mobile-terms"
                                checked={termsAccepted}
                                onCheckedChange={(c) => setTermsAccepted(Boolean(c))}
                                className="mt-0.5"
                            />
                            <Label htmlFor="mobile-terms" className="text-xs leading-relaxed cursor-pointer font-normal">
                                קראתי ואני מאשר/ת את <Link href="/terms" target="_blank" className="font-bold text-primary underline underline-offset-2">תקנון האתר</Link> ואת <Link href="/cancellation" target="_blank" className="font-bold text-primary underline underline-offset-2">מדיניות ביטול עסקה</Link> כחוק.
                            </Label>
                        </div>
                        <div className="flex items-start gap-2.5 pt-2 border-t border-border/60">
                            <Checkbox
                                id="mobile-marketing"
                                checked={marketingOptIn}
                                onCheckedChange={(c) => setMarketingOptIn(Boolean(c))}
                                className="mt-0.5"
                            />
                            <Label htmlFor="mobile-marketing" className="text-[11px] text-muted-foreground leading-relaxed cursor-pointer font-normal">
                                אני מעוניין/ת לקבל עדכונים והטבות בדוא״ל/SMS (ניתן להסיר את ההסכמה בכל עת).
                            </Label>
                        </div>
                        <div className="text-[11px] text-emerald-600 dark:text-emerald-400 font-medium">
                            ✓ כל המחירים באתר כוללים מע״מ כחוק
                        </div>
                    </div>
                </div>

                <div className="hidden lg:block">
                    <div className="sticky top-24 rounded-2xl border border-border/70 bg-card p-5 shadow-soft">
                        <div className="flex items-center justify-between">
                            <h2 className="font-display text-lg font-bold">{t("orderSummary")}</h2>
                            <span className="text-[11px] font-semibold text-emerald-600 dark:text-emerald-400">
                                כולל מע״מ כחוק
                            </span>
                        </div>
                        <Separator className="my-3" />

                        <div className="grid gap-3">
                            {orderItems.map((item) => {
                                const detail = detailMap.get(item.product_id);
                                const name = detail
                                    ? localizedText(locale, detail.name_he, detail.name_ar)
                                    : "...";
                                return (
                                    <div key={item.product_id} className="flex items-center gap-3">
                                        <div className="relative aspect-square size-12 shrink-0 overflow-hidden rounded-lg bg-muted">
                                            {detail?.image_url ? (
                                                <Image
                                                    src={detail.image_url}
                                                    alt={name}
                                                    fill
                                                    sizes="48px"
                                                    className="object-cover"
                                                />
                                            ) : (
                                                <div className="flex size-full items-center justify-center text-xs text-muted-foreground">
                                                    —
                                                </div>
                                            )}
                                        </div>
                                        <div className="flex-1 text-sm">
                                            <div className="line-clamp-1 font-medium">
                                                {name}
                                            </div>
                                            <div className="text-muted-foreground">
                                                {item.quantity} × {detail ? formatILS(detail.price_agorot, locale) : ""}
                                            </div>
                                        </div>
                                        <div className="text-sm font-medium">
                                            {detail ? formatILS(detail.price_agorot * item.quantity, locale) : ""}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>

                        <Separator className="my-3" />
                        <div className="flex justify-between text-sm">
                            <span>{t("itemsTotal")} (כולל מע״מ)</span>
                            <span className="font-semibold">{formatILS(subtotal, locale)}</span>
                        </div>
                        <div className="mt-1 text-xs text-muted-foreground">
                            {t("deliveryByCart")}
                        </div>

                        {/* Statutory Terms agreement & Spam Law checkbox */}
                        <div className="mt-4 rounded-xl border border-border/80 bg-muted/40 p-3 space-y-2.5 text-xs">
                            <div className="flex items-start gap-2">
                                <Checkbox
                                    id="desktop-terms"
                                    checked={termsAccepted}
                                    onCheckedChange={(c) => setTermsAccepted(Boolean(c))}
                                    className="mt-0.5"
                                />
                                <Label htmlFor="desktop-terms" className="text-xs leading-snug cursor-pointer font-normal">
                                    קראתי ואני מסכים/ה ל<Link href="/terms" target="_blank" className="font-bold text-primary underline underline-offset-2">תקנון האתר</Link> ול<Link href="/cancellation" target="_blank" className="font-bold text-primary underline underline-offset-2">מדיניות ביטול עסקה</Link> כחוק.
                                </Label>
                            </div>
                            <div className="flex items-start gap-2 pt-1 border-t border-border/60">
                                <Checkbox
                                    id="desktop-marketing"
                                    checked={marketingOptIn}
                                    onCheckedChange={(c) => setMarketingOptIn(Boolean(c))}
                                    className="mt-0.5"
                                />
                                <Label htmlFor="desktop-marketing" className="text-[11px] text-muted-foreground leading-snug cursor-pointer font-normal">
                                    אני מעוניין/ת לקבל עדכונים ומבצעים בדוא״ל/SMS (ניתן להסיר בכל עת).
                                </Label>
                            </div>
                        </div>

                        {hasUnavailableItems && (
                            <p className="mt-2 text-center text-xs text-destructive">
                                {t("unavailableWarning")}
                            </p>
                        )}
                        <Button
                            type="submit"
                            className="mt-4 w-full"
                            size="lg"
                            disabled={pending || hasUnavailableItems || !termsAccepted}
                        >
                            {pending && <Loader2 className="size-4 animate-spin" />}
                            {t("placeOrder")}
                        </Button>
                        <p className="mt-2 text-center text-[11px] text-muted-foreground">
                            {t("placeOrderHint")} • כל המחירים כוללים מע״מ
                        </p>
                    </div>
                </div>

                <MobileStickyBar>
                    <div className="flex shrink-0 flex-col">
                        <span className="text-[10px] text-muted-foreground">{t("totalToPay")} (כולל מע״מ)</span>
                        <span className="font-display text-lg font-extrabold text-primary">
                            {formatILS(subtotal, locale)}
                        </span>
                    </div>
                    <Button
                        type="submit"
                        size="lg"
                        className="flex-1"
                        disabled={pending || hasUnavailableItems || !termsAccepted}
                    >
                        {pending && <Loader2 className="size-4 animate-spin" />}
                        {t("placeOrder")}
                    </Button>
                </MobileStickyBar>
            </form>

            <AlertDialog
                open={showLocationWarning}
                onOpenChange={(open) => {
                    if (!open) {
                        setShowLocationWarning(false);
                        setPendingValues(null);
                    }
                }}
            >
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>{t("locationWarningTitle")}</AlertDialogTitle>
                        <AlertDialogDescription>
                            {t("locationWarningDesc")}
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel asChild>
                            <Button type="button" variant="outline">
                                {t("locationWarningBack")}
                            </Button>
                        </AlertDialogCancel>
                        <AlertDialogAction asChild>
                            <Button
                                type="button"
                                onClick={() => {
                                    setShowLocationWarning(false);
                                    if (pendingValues) onSubmit(pendingValues);
                                }}
                            >
                                {t("locationWarningContinue")}
                            </Button>
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </Form>
    );
}
