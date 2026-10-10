"use client";

import dynamic from "next/dynamic";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { useLocale, useTranslations } from "next-intl";

import { zodResolver } from "@hookform/resolvers/zod";
import {
    AlertTriangle,
    Banknote,
    Check,
    CheckCircle2,
    CreditCard,
    Loader2,
    LocateFixed,
    MapPin,
    NotebookPen,
    ShoppingCart,
    User,
} from "lucide-react";
import { useForm, useWatch } from "react-hook-form";
import { toast } from "sonner";

import {
    AlertDialog,
    AlertDialogAction,
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
import { findIsraelCity, type IsraelCity } from "@/lib/data/israel-cities";
import {
    extractCitySegment,
    formatGeocodedAddress,
} from "@/lib/utils/address";
import {
    geocodeForward,
    geocodeReverse,
    geocodeSearch,
    type GeocodeClientResult,
} from "@/lib/utils/geocode-client";

import { MobileStickyBar } from "./mobile-sticky-bar";

// Leaflet is client-only — load the picker without SSR.
const AddressPinPicker = dynamic(
    () => import("./address-pin-picker").then((m) => m.AddressPinPicker),
    { ssr: false }
);

// The city dataset is large — code-split it out of the main checkout chunk.
const CityCombobox = dynamic(
    () => import("./city-combobox").then((m) => m.CityCombobox),
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
    const [showLocationRequired, setShowLocationRequired] = useState(false);
    const [termsAccepted, setTermsAccepted] = useState(true);
    const [marketingOptIn, setMarketingOptIn] = useState(false);
    const [details, setDetails] = useState<Awaited<
        ReturnType<typeof getCartProductDetails>
    >>([]);

    // Address precision state
    const isAr = locale === "ar";
    const [mapCenter, setMapCenter] = useState<{
        lat: number;
        lng: number;
        zoom?: number;
    } | null>(null);
    const [mapPrompt, setMapPrompt] = useState<string | null>(null);
    const [mapStatus, setMapStatus] = useState<{
        message: string;
        type: "success" | "info" | "warning";
    } | null>(null);
    const [addressCheck, setAddressCheck] = useState<{
        status: "idle" | "checking" | "found" | "not_found";
        confidence?: string;
    }>({ status: "idle" });

    // Street-address autocomplete state.
    const [addressResults, setAddressResults] = useState<GeocodeClientResult[]>([]);
    const [addressSearching, setAddressSearching] = useState(false);
    const [showAddressResults, setShowAddressResults] = useState(false);

    // Guards reverse-geocode autofill from re-triggering verification loops.
    const programmaticRef = useRef(false);
    const verifyDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const verifySeq = useRef(0);
    const addressSearchDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const addressSearchSeq = useRef(0);
    const mapCardRef = useRef<HTMLDivElement | null>(null);

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
            address: { full_address: "", city: "", house_number: "" },
            payment_method: "cash",
            customer_notes: "",
            lat: null,
            lng: null,
            location_source: "manual",
        },
    });

    // Subscribe to the city value so the address fields appear as soon as a
    // city/village is selected. Must be called before any early return.
    const watchedCity = useWatch({ control: form.control, name: "address.city" });

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

    function scrollToMap() {
        mapCardRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
    }

    /**
     * Debounced forward geocode of the typed address. When found (street or
     * building level) the pin and coordinates are set automatically; when not
     * found the customer is prompted to drop a pin manually on the map.
     */
    function verifyAddress() {
        const fullAddress = form.watch("address.full_address")?.trim() ?? "";
        if (fullAddress.length < 3) return;
        if (verifyDebounceRef.current) clearTimeout(verifyDebounceRef.current);
        const seq = ++verifySeq.current;
        setAddressCheck({ status: "checking" });
        verifyDebounceRef.current = setTimeout(async () => {
            const city = form.watch("address.city")?.trim() ?? "";
            const houseNumber = form.watch("address.house_number")?.trim() ?? "";
            const result = await geocodeForward({
                full_address: fullAddress,
                city: city || null,
                house_number: houseNumber || null,
            });
            if (seq !== verifySeq.current) return;
            if (
                result &&
                result.lat != null &&
                result.lng != null &&
                (result.confidence === "high" || result.confidence === "medium")
            ) {
                programmaticRef.current = true;
                form.setValue("lat", result.lat);
                form.setValue("lng", result.lng);
                form.setValue("location_source", "geocoded");
                form.setValue("location_confidence", result.confidence);
                programmaticRef.current = false;
                setAddressCheck({ status: "found", confidence: result.confidence });
                setMapPrompt(null);
                setMapStatus({ message: t("addressVerified"), type: "success" });
            } else {
                form.setValue("lat", null);
                form.setValue("lng", null);
                form.setValue("location_source", "manual");
                form.setValue("location_confidence", null);
                setAddressCheck({ status: "not_found" });
                setMapPrompt(t("addressNotFound"));
                setMapStatus(null);
                scrollToMap();
            }
        }, 600);
    }

    function handleCityChange(cityName: string, city: IsraelCity | null) {
        form.setValue("address.city", cityName, { shouldValidate: true });
        if (city) {
            setMapCenter({ lat: city.lat, lng: city.lng, zoom: 13 });
        }
        // Re-verify the address if one is already typed.
        if (form.watch("address.full_address")?.trim()) {
            verifyAddress();
        }
    }

    /**
     * Debounced street-address autocomplete, scoped to the selected city.
     * Shows matching addresses from the map as the customer types.
     */
    function handleAddressInputChange(next: string) {
        if (addressSearchDebounceRef.current) clearTimeout(addressSearchDebounceRef.current);
        const city = form.watch("address.city")?.trim() ?? "";
        if (next.trim().length < 3 || !city) {
            setAddressResults([]);
            setShowAddressResults(false);
            setAddressSearching(false);
            return;
        }
        const seq = ++addressSearchSeq.current;
        setAddressSearching(true);
        addressSearchDebounceRef.current = setTimeout(async () => {
            const found = await geocodeSearch(`${next.trim()}, ${city}`, 5);
            if (seq !== addressSearchSeq.current) return;
            setAddressSearching(false);
            setAddressResults(found);
            setShowAddressResults(true);
        }, 500);
    }

    function selectAddressResult(result: GeocodeClientResult) {
        setShowAddressResults(false);
        setAddressResults([]);
        if (!result.display_name) return;
        programmaticRef.current = true;
        form.setValue(
            "address.full_address",
            formatGeocodedAddress(result.display_name)
        );
        programmaticRef.current = false;
        if (
            result.lat != null &&
            result.lng != null &&
            (result.confidence === "high" || result.confidence === "medium")
        ) {
            form.setValue("lat", result.lat);
            form.setValue("lng", result.lng);
            form.setValue("location_source", "geocoded");
            form.setValue("location_confidence", result.confidence);
            setAddressCheck({ status: "found", confidence: result.confidence });
            setMapPrompt(null);
            setMapStatus({ message: t("addressVerified"), type: "success" });
        } else {
            verifyAddress();
        }
    }

    function handleGeolocation() {
        if (!navigator.geolocation) {
            setMapPrompt(t("locateFailedPrompt"));
            scrollToMap();
            return;
        }
        setLocating(true);
        navigator.geolocation.getCurrentPosition(
            async (position) => {
                const { latitude, longitude, accuracy } = position.coords;
                form.setValue("lat", latitude);
                form.setValue("lng", longitude);
                form.setValue("location_source", "browser_geolocation");
                form.setValue("location_accuracy_m", accuracy ?? null);
                setMapPrompt(null);
                setAddressCheck({ status: "found", confidence: "high" });
                setMapStatus({ message: t("locationCapturedSuccess"), type: "success" });
                // Reverse geocode the GPS fix to fill address + city.
                const rev = await geocodeReverse(latitude, longitude);
                if (rev?.display_name) {
                    programmaticRef.current = true;
                    form.setValue(
                        "address.full_address",
                        formatGeocodedAddress(rev.display_name)
                    );
                    const citySeg = extractCitySegment(rev.display_name);
                    if (citySeg) {
                        const matched = findIsraelCity(citySeg);
                        if (matched) {
                            form.setValue(
                                "address.city",
                                isAr ? matched.nameAr : matched.nameHe
                            );
                        } else {
                            form.setValue("address.city", citySeg);
                        }
                    }
                    programmaticRef.current = false;
                }
                setLocating(false);
            },
            () => {
                setLocating(false);
                setMapPrompt(t("locateFailedPrompt"));
                scrollToMap();
            },
            { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
        );
    }

    function onSubmit(values: CheckoutFormValues) {
        if (!termsAccepted) {
            toast.error("יש לאשר את תקנון האתר ומדיניות ביטول עסקה כדי לבצע הזמנה");
            return;
        }

        // Hard requirement: without verified coordinates the courier may not
        // find the customer. The only way forward is a map pin (manual, GPS
        // or geocoded) — there is no "continue anyway".
        const hasCoords = values.lat != null && values.lng != null;
        if (!hasCoords) {
            setShowLocationRequired(true);
            return;
        }

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

    const citySelected = Boolean(watchedCity?.trim());

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

                    <Card ref={mapCardRef}>
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
                                name="address.city"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>{t("city")}</FormLabel>
                                        <FormControl>
                                            <CityCombobox
                                                value={field.value ?? ""}
                                                onChange={handleCityChange}
                                                placeholder={t("cityPlaceholder")}
                                            />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                            {citySelected && (
                                <>
                                    <FormField
                                        control={form.control}
                                        name="address.full_address"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>{t("address")}</FormLabel>
                                                <FormControl>
                                                    <div className="relative">
                                                        <Input
                                                            placeholder={t("addressPlaceholder")}
                                                            className="h-11 rounded-xl"
                                                            {...field}
                                                            onChange={(e) => {
                                                                field.onChange(e);
                                                                handleAddressInputChange(
                                                                    e.target.value
                                                                );
                                                            }}
                                                            onBlur={() => {
                                                                field.onBlur();
                                                                setTimeout(
                                                                    () =>
                                                                        setShowAddressResults(
                                                                            false
                                                                        ),
                                                                    150
                                                                );
                                                                verifyAddress();
                                                            }}
                                                        />
                                                        {addressSearching && (
                                                            <Loader2 className="pointer-events-none absolute end-3 top-3 size-4 animate-spin text-muted-foreground" />
                                                        )}
                                                        {showAddressResults &&
                                                            addressResults.length > 0 && (
                                                                <div className="absolute z-[1050] mt-1 w-full overflow-hidden rounded-xl border border-border/70 bg-popover/95 p-1.5 shadow-xl backdrop-blur-md">
                                                                    {addressResults.map(
                                                                        (result, i) => (
                                                                            <button
                                                                                key={`${result.lat}-${result.lng}-${i}`}
                                                                                type="button"
                                                                                onMouseDown={(e) =>
                                                                                    e.preventDefault()
                                                                                }
                                                                                onClick={() =>
                                                                                    selectAddressResult(
                                                                                        result
                                                                                    )
                                                                                }
                                                                                className="block w-full truncate rounded-lg px-3 py-2 text-start text-sm hover:bg-accent/60"
                                                                            >
                                                                                {result.display_name
                                                                                    ? formatGeocodedAddress(
                                                                                        result.display_name
                                                                                    )
                                                                                    : "—"}
                                                                            </button>
                                                                        )
                                                                    )}
                                                                </div>
                                                            )}
                                                    </div>
                                                </FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                    <FormField
                                        control={form.control}
                                        name="address.house_number"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>{t("houseNumber")}</FormLabel>
                                                <FormControl>
                                                    <Input
                                                        placeholder={t("houseNumberPlaceholder")}
                                                        className="h-11 rounded-xl"
                                                        inputMode="numeric"
                                                        {...field}
                                                        onBlur={() => {
                                                            field.onBlur();
                                                            verifyAddress();
                                                        }}
                                                    />
                                                </FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                </>
                            )}
                            {!citySelected && (
                                <div className="rounded-xl border border-dashed border-border/70 bg-muted/30 px-3 py-2.5 text-xs text-muted-foreground">
                                    {t("selectCityFirst")}
                                </div>
                            )}
                            {addressCheck.status === "checking" && (
                                <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                                    <Loader2 className="size-3.5 animate-spin" />
                                    {t("addressChecking")}
                                </div>
                            )}
                            {addressCheck.status === "found" && (
                                <div className="flex items-center gap-1.5 text-xs text-emerald-600 dark:text-emerald-400">
                                    <CheckCircle2 className="size-3.5" />
                                    {t("addressVerified")}
                                </div>
                            )}
                            {addressCheck.status === "not_found" && (
                                <div className="flex items-center gap-1.5 text-xs text-destructive">
                                    <AlertTriangle className="size-3.5" />
                                    {t("addressNotFound")}
                                </div>
                            )}
                            <AddressPinPicker
                                value={{
                                    lat: form.watch("lat") ?? null,
                                    lng: form.watch("lng") ?? null,
                                }}
                                center={mapCenter}
                                onChange={(v) => {
                                    if (v.lat != null && v.lng != null) {
                                        form.setValue("lat", v.lat);
                                        form.setValue("lng", v.lng);
                                        form.setValue("location_source", "map_pin");
                                    }
                                }}
                                onReverseGeocode={(displayName) => {
                                    if (!displayName || programmaticRef.current) return;
                                    // A manual pin is the source of truth — update
                                    // the address textbox with the resolved place.
                                    programmaticRef.current = true;
                                    form.setValue(
                                        "address.full_address",
                                        formatGeocodedAddress(displayName)
                                    );
                                    const citySeg = extractCitySegment(displayName);
                                    if (citySeg) {
                                        const matched = findIsraelCity(citySeg);
                                        if (matched) {
                                            form.setValue(
                                                "address.city",
                                                isAr ? matched.nameAr : matched.nameHe
                                            );
                                        } else if (!form.watch("address.city")?.trim()) {
                                            form.setValue("address.city", citySeg);
                                        }
                                    }
                                    programmaticRef.current = false;
                                    setAddressCheck({ status: "found", confidence: "high" });
                                    setMapPrompt(null);
                                    setMapStatus({
                                        message: t("pinUpdatedAddress"),
                                        type: "success",
                                    });
                                }}
                                searchPlaceholder={t("pinSearchPlaceholder")}
                                promptMessage={mapPrompt}
                                statusMessage={mapStatus?.message ?? null}
                                statusType={mapStatus?.type ?? "info"}
                                heightClassName="h-56"
                            />
                            {form.watch("lat") != null && (
                                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                    <MapPin className="size-3.5" />
                                    {t("locationPinned")}
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
                            ✓ {t("vatNotice")}
                        </div>
                    </div>
                </div>

                <div className="hidden lg:block">
                    <div className="sticky top-24 rounded-2xl border border-border/70 bg-card p-5 shadow-soft">
                        <div className="flex items-center justify-between">
                            <h2 className="font-display text-lg font-bold">{t("orderSummary")}</h2>
                            <span className="text-[11px] font-semibold text-emerald-600 dark:text-emerald-400">
                                {t("includingVat")}
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
                            <span>{t("itemsTotal")} ({t("includingVat")})</span>
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
                            {t("placeOrderHint")} • {t("vatNotice")}
                        </p>
                    </div>
                </div>

                <MobileStickyBar>
                    <div className="flex shrink-0 flex-col">
                        <span className="text-[10px] text-muted-foreground">{t("totalToPay")} ({t("includingVat")})</span>
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
                open={showLocationRequired}
                onOpenChange={(open) => {
                    if (!open) setShowLocationRequired(false);
                }}
            >
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>{t("locationRequiredTitle")}</AlertDialogTitle>
                        <AlertDialogDescription>
                            {t("locationRequiredDesc")}
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogAction asChild>
                            <Button
                                type="button"
                                onClick={() => {
                                    setShowLocationRequired(false);
                                    setMapPrompt(t("addressNotFound"));
                                    scrollToMap();
                                }}
                            >
                                {t("locationRequiredAction")}
                            </Button>
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </Form>
    );
}
