"use client";

import { useEffect, useState, useTransition } from "react";
import Link from "next/link";
import { useSearchParams, useRouter } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import {
    ArrowRight,
    Check,
    Clock,
    Copy,
    Download,
    Eye,
    Loader2,
    MapPin,
    PackageCheck,
    Phone,
    QrCode,
    RefreshCw,
    Search,
    ShoppingBag,
    User,
    X,
} from "lucide-react";
import QRCode from "qrcode";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { OrderTimeline } from "@/components/store/order-timeline";
import { createClient } from "@/lib/supabase/client";
import {
    getPublicOrder,
    getPublicOrdersByNumbers,
    searchCustomerOrders,
    type PublicOrder,
} from "@/lib/actions/orders-public";
import {
    getStoredRecentOrders,
    saveRecentOrder,
} from "@/lib/utils/recent-orders";
import { localizedText, type Locale } from "@/lib/i18n/config";
import { formatILS } from "@/lib/utils/currency";
import { formatDateTime } from "@/lib/utils/dates";
import { ORDER_STATUS_LABELS, PAYMENT_METHOD_LABELS, PAYMENT_STATUS_LABELS } from "@/lib/constants";
import { cn } from "@/lib/utils";

export function CustomerOrdersView({
    initialOrder,
}: {
    initialOrder?: PublicOrder | null;
}) {
    const searchParams = useSearchParams();
    const router = useRouter();
    const t = useTranslations("orders");
    const tRoot = useTranslations();
    const locale = useLocale() as Locale;

    const [activeTab, setActiveTab] = useState<"my_orders" | "search">("my_orders");
    const [recentOrders, setRecentOrders] = useState<PublicOrder[]>([]);
    const [loadingRecent, setLoadingRecent] = useState(true);

    // Selected order to view in full detail
    const [selectedOrder, setSelectedOrder] = useState<PublicOrder | null>(
        initialOrder ?? null
    );

    // Search state
    const [searchPhone, setSearchPhone] = useState("");
    const [searchName, setSearchName] = useState("");
    const [searchOrderNumber, setSearchOrderNumber] = useState("");
    const [searchResults, setSearchResults] = useState<PublicOrder[] | null>(null);
    const [isSearching, startSearchTransition] = useTransition();
    const [isRefreshing, startRefreshTransition] = useTransition();

    // QR modal state
    const [qrModalUrl, setQrModalUrl] = useState<string | null>(null);
    const [qrCopied, setQrCopied] = useState(false);

    // Check query params for ?order=
    const queryOrderNumber = searchParams.get("order");

    useEffect(() => {
        if (queryOrderNumber && (!selectedOrder || selectedOrder.order_number !== queryOrderNumber)) {
            const stored = getStoredRecentOrders();
            const entry = stored.find((s) => s.orderNumber === queryOrderNumber);
            if (!entry?.phone) return;
            getPublicOrder(queryOrderNumber, entry.phone).then((res) => {
                if (res) {
                    setSelectedOrder(res);
                    // Also ensure it is in local recent orders
                    saveRecentOrder({
                        orderNumber: res.order_number,
                        phone: entry.phone,
                        totalAgorot: res.total_agorot,
                        placedAt: res.placed_at,
                        customerName: res.customer_name_snapshot,
                        itemsCount: res.order_items?.reduce((acc, i) => acc + i.quantity, 0),
                    });
                }
            });
        }
    }, [queryOrderNumber, selectedOrder]);

    // Load recent orders from localStorage (phone required for lookups)
    useEffect(() => {
        const stored = getStoredRecentOrders();
        if (stored.length === 0) {
            setLoadingRecent(false);
            return;
        }

        const phone = stored[0]?.phone;
        if (!phone) {
            setLoadingRecent(false);
            return;
        }

        const numbers = stored.map((s) => s.orderNumber);
        getPublicOrdersByNumbers(numbers, phone)
            .then((orders) => {
                setRecentOrders(orders);
            })
            .catch(() => { })
            .finally(() => {
                setLoadingRecent(false);
            });
    }, []);

    // Realtime status feed — the tracking page updates instantly at every
    // stage (courier claim, status change, ETA update, cancellation).
    useEffect(() => {
        if (!selectedOrder) return;
        const supabase = createClient();
        const channel = supabase
            .channel(`order-status-${selectedOrder.id}`)
            .on(
                "postgres_changes",
                {
                    event: "*",
                    schema: "public",
                    table: "order_status_updates",
                    filter: `order_id=eq.${selectedOrder.id}`,
                },
                () => {
                    const stored = getStoredRecentOrders();
                    const entry = stored.find(
                        (s) => s.orderNumber === selectedOrder.order_number
                    );
                    const phone = entry?.phone ?? searchPhone.trim();
                    if (!phone) return;
                    getPublicOrder(selectedOrder.order_number, phone).then(
                        (updated) => {
                            if (updated) setSelectedOrder(updated);
                        }
                    );
                }
            )
            .subscribe();

        return () => {
            void supabase.removeChannel(channel);
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [selectedOrder?.id]);

    function handleSearch(e: React.FormEvent) {
        e.preventDefault();
        const p = searchPhone.trim();
        const n = searchName.trim();
        const num = searchOrderNumber.trim();

        // A valid phone number is required — it authorizes the lookup.
        if (!p) {
            toast.error(t("phoneRequired"));
            return;
        }

        startSearchTransition(async () => {
            const results = await searchCustomerOrders({
                phone: p,
                name: n || undefined,
                orderNumber: num || undefined,
            });
            setSearchResults(results);
            if (results.length === 0) {
                toast.info(t("noResults"));
            } else if (results.length === 1) {
                setSelectedOrder(results[0]);
                toast.success(t("foundOne"));
            } else {
                toast.success(t("foundMany", { count: results.length }));
            }
        });
    }

    function handleSelectOrder(order: PublicOrder) {
        setSelectedOrder(order);
        const stored = getStoredRecentOrders();
        const existing = stored.find((s) => s.orderNumber === order.order_number);
        saveRecentOrder({
            orderNumber: order.order_number,
            phone: existing?.phone ?? searchPhone.trim(),
            totalAgorot: order.total_agorot,
            placedAt: order.placed_at,
            customerName: order.customer_name_snapshot,
            itemsCount: order.order_items?.reduce((acc, i) => acc + i.quantity, 0),
        });
        router.replace(`/orders?order=${encodeURIComponent(order.order_number)}`, {
            scroll: false,
        });
    }

    function handleBackToList() {
        setSelectedOrder(null);
        router.replace("/orders", { scroll: false });
    }

    function handleRefreshOrder() {
        if (!selectedOrder) return;
        const stored = getStoredRecentOrders();
        const entry = stored.find((s) => s.orderNumber === selectedOrder.order_number);
        const phone = entry?.phone ?? searchPhone.trim();
        if (!phone) {
            toast.error(t("phoneRequired"));
            return;
        }
        startRefreshTransition(async () => {
            const updated = await getPublicOrder(selectedOrder.order_number, phone);
            if (updated) {
                setSelectedOrder(updated);
                toast.success(t("updated"));
            }
        });
    }

    async function handleShowQR(order: PublicOrder) {
        const siteUrl = window.location.origin;
        const trackingUrl = `${siteUrl}/orders?order=${encodeURIComponent(order.order_number)}`;
        try {
            const dataUrl = await QRCode.toDataURL(trackingUrl, {
                width: 320,
                margin: 2,
                color: { dark: "#2b1c11", light: "#ffffff" },
                errorCorrectionLevel: "M",
            });
            setQrModalUrl(dataUrl);
        } catch {
            toast.error(t("qrError"));
        }
    }

    function handleCopyLink() {
        if (!selectedOrder) return;
        const siteUrl = window.location.origin;
        const trackingUrl = `${siteUrl}/orders?order=${encodeURIComponent(selectedOrder.order_number)}`;
        navigator.clipboard.writeText(trackingUrl);
        setQrCopied(true);
        toast.success(t("copiedLink"));
        setTimeout(() => setQrCopied(false), 2000);
    }

    return (
        <div className="mx-auto w-full max-w-3xl space-y-6">
            {/* Page Header */}
            <div>
                <h1 className="font-display text-2xl font-extrabold tracking-tight sm:text-3xl">
                    {t("title")}
                </h1>
                <p className="mt-1 text-sm text-muted-foreground">
                    {t("description")}
                </p>
            </div>

            {/* DETAIL VIEW IF AN ORDER IS SELECTED */}
            {selectedOrder ? (
                <div className="space-y-6 animate-pop-in">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={handleBackToList}
                            className="gap-1.5 text-muted-foreground hover:text-foreground"
                        >
                            <ArrowRight className="size-4" />
                            {t("backToList")}
                        </Button>

                        <div className="flex items-center gap-2">
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={handleRefreshOrder}
                                disabled={isRefreshing}
                                className="gap-1.5 rounded-full text-xs"
                            >
                                <RefreshCw
                                    className={cn("size-3.5", isRefreshing && "animate-spin")}
                                />
                                {isRefreshing ? t("refreshing") : t("refresh")}
                            </Button>

                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleShowQR(selectedOrder)}
                                className="gap-1.5 rounded-full text-xs"
                            >
                                <QrCode className="size-3.5 text-primary" />
                                {t("showQr")}
                            </Button>
                        </div>
                    </div>

                    {/* Timeline stepper */}
                    <OrderTimeline status={selectedOrder.status} />

                    {/* ETA banner — courier-provided arrival time */}
                    {selectedOrder.eta_at &&
                        selectedOrder.status !== "delivered" &&
                        selectedOrder.status !== "canceled" && (
                            <div className="flex items-center gap-3 rounded-2xl border border-sky-500/30 bg-sky-500/10 p-4 shadow-soft">
                                <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-sky-500/15 text-sky-600">
                                    <Clock className="size-5" />
                                </span>
                                <div className="min-w-0">
                                    <div className="text-sm font-bold text-foreground">
                                        {t("etaTitle")}
                                    </div>
                                    <div className="text-sm text-muted-foreground">
                                        {t("etaBody", {
                                            time: new Date(selectedOrder.eta_at).toLocaleTimeString(
                                                locale === "ar" ? "ar-EG" : "he-IL",
                                                { hour: "2-digit", minute: "2-digit" }
                                            ),
                                        })}
                                    </div>
                                </div>
                            </div>
                        )}

                    {/* Order Details Card */}
                    <div className="rounded-2xl border border-border/70 bg-card p-5 shadow-soft">
                        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border/60 pb-4">
                            <div>
                                <span className="text-xs text-muted-foreground">{t("orderNumber")}</span>
                                <div className="font-mono text-lg font-bold text-foreground" dir="ltr">
                                    {selectedOrder.order_number}
                                </div>
                            </div>
                            <div className="text-end text-xs text-muted-foreground">
                                <div>{t("receivedAt")}</div>
                                <div className="font-medium text-foreground">
                                    {formatDateTime(selectedOrder.placed_at, locale)}
                                </div>
                            </div>
                        </div>

                        {/* Customer & Delivery details */}
                        <div className="grid gap-3 py-4 text-xs sm:text-sm sm:grid-cols-2">
                            <div className="space-y-1.5 rounded-xl bg-secondary/30 p-3">
                                <div className="flex items-center gap-1.5 font-semibold text-foreground">
                                    <User className="size-4 text-primary" />
                                    {t("customerDetails")}
                                </div>
                                <div className="text-foreground">{selectedOrder.customer_name_snapshot}</div>
                                <div className="font-mono text-muted-foreground" dir="ltr">
                                    {selectedOrder.customer_phone_snapshot}
                                </div>
                            </div>

                            <div className="space-y-1.5 rounded-xl bg-secondary/30 p-3">
                                <div className="flex items-center gap-1.5 font-semibold text-foreground">
                                    <MapPin className="size-4 text-primary" />
                                    {t("deliveryAddress")}
                                </div>
                                <div className="text-foreground">
                                    {selectedOrder.address_snapshot?.full_address || t("pickupOrNotSpecified")}
                                </div>
                                {selectedOrder.customer_notes && (
                                    <div className="text-[11px] text-muted-foreground">
                                        {t("note")} {selectedOrder.customer_notes}
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Items Breakdown */}
                        <div className="border-t border-border/60 pt-4">
                            <h4 className="mb-3 font-semibold text-foreground text-sm">
                                {t("orderedItems")}
                            </h4>
                            <div className="divide-y divide-border/40">
                                {selectedOrder.order_items.map((item) => (
                                    <div
                                        key={item.id}
                                        className="flex items-center justify-between py-2.5 text-xs sm:text-sm"
                                    >
                                        <div className="flex items-center gap-2">
                                            <span className="flex size-6 items-center justify-center rounded-md bg-secondary text-xs font-bold text-foreground">
                                                {item.quantity}
                                            </span>
                                            <span className="font-medium text-foreground">
                                                {localizedText(
                                                    locale,
                                                    item.product_name_snapshot,
                                                    item.product_name_ar_snapshot
                                                )}
                                            </span>
                                        </div>
                                        <div className="font-mono font-medium text-foreground">
                                            {formatILS(item.line_total_agorot, locale)}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Totals Summary */}
                        <div className="mt-4 space-y-2 border-t border-border/60 pt-4 text-xs sm:text-sm">
                            <div className="flex justify-between text-muted-foreground">
                                <span>{t("itemsTotal")}</span>
                                <span>{formatILS(selectedOrder.subtotal_agorot, locale)}</span>
                            </div>
                            <div className="flex justify-between text-muted-foreground">
                                <span>{t("deliveryFee")}</span>
                                <span>
                                    {selectedOrder.delivery_fee_agorot === 0
                                        ? t("free")
                                        : formatILS(selectedOrder.delivery_fee_agorot, locale)}
                                </span>
                            </div>
                            {selectedOrder.discount_agorot > 0 && (
                                <div className="flex justify-between text-emerald-600">
                                    <span>{t("discount")}</span>
                                    <span>-{formatILS(selectedOrder.discount_agorot, locale)}</span>
                                </div>
                            )}
                            <div className="flex justify-between border-t border-border/60 pt-2 text-base font-bold text-foreground">
                                <span>{t("totalToPay")}</span>
                                <span className="font-display text-lg text-primary">
                                    {formatILS(selectedOrder.total_agorot, locale)}
                                </span>
                            </div>
                        </div>

                        {/* Payment method info */}
                        <div className="mt-4 flex flex-wrap items-center justify-between gap-2 rounded-xl border border-border/60 bg-muted/20 px-3 py-2 text-xs text-muted-foreground">
                            <div>
                                {t("paymentMethod")}{" "}
                                <span className="font-medium text-foreground">
                                    {tRoot(PAYMENT_METHOD_LABELS[selectedOrder.payment_method]) ??
                                        selectedOrder.payment_method}
                                </span>
                            </div>
                            <div>
                                {t("paymentStatus")}{" "}
                                <span className="font-medium text-foreground">
                                    {tRoot(PAYMENT_STATUS_LABELS[selectedOrder.payment_status]) ??
                                        selectedOrder.payment_status}
                                </span>
                            </div>
                        </div>
                    </div>
                </div>
            ) : (
                /* LIST / SEARCH VIEW */
                <div className="space-y-6">
                    {/* Tabs switcher */}
                    <div className="flex rounded-2xl bg-secondary/50 p-1">
                        <button
                            type="button"
                            onClick={() => setActiveTab("my_orders")}
                            className={cn(
                                "flex flex-1 items-center justify-center gap-2 rounded-xl py-2.5 text-xs sm:text-sm font-semibold transition-all",
                                activeTab === "my_orders"
                                    ? "bg-card text-foreground shadow-soft"
                                    : "text-muted-foreground hover:text-foreground"
                            )}
                        >
                            <PackageCheck className="size-4 text-primary" />
                            {t("myOrders", { count: recentOrders.length })}
                        </button>
                        <button
                            type="button"
                            onClick={() => setActiveTab("search")}
                            className={cn(
                                "flex flex-1 items-center justify-center gap-2 rounded-xl py-2.5 text-xs sm:text-sm font-semibold transition-all",
                                activeTab === "search"
                                    ? "bg-card text-foreground shadow-soft"
                                    : "text-muted-foreground hover:text-foreground"
                            )}
                        >
                            <Search className="size-4 text-primary" />
                            {t("searchByPhone")}
                        </button>
                    </div>

                    {/* TAB 1: MY ORDERS (Saved on this device) */}
                    {activeTab === "my_orders" && (
                        <div className="space-y-4">
                            {loadingRecent ? (
                                <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                                    <Loader2 className="size-8 animate-spin text-primary" />
                                    <p className="mt-3 text-sm">{t("loadingRecent")}</p>
                                </div>
                            ) : recentOrders.length === 0 ? (
                                <div className="rounded-2xl border border-border/70 bg-card p-10 text-center shadow-soft">
                                    <div className="mx-auto flex size-14 items-center justify-center rounded-full bg-secondary text-muted-foreground">
                                        <PackageCheck className="size-7" />
                                    </div>
                                    <h3 className="mt-4 font-display text-lg font-bold">
                                        {t("noRecentOrders")}
                                    </h3>
                                    <p className="mt-1 text-sm text-muted-foreground">
                                        {t("noRecentHint")}
                                    </p>
                                    <div className="mt-6 flex flex-col sm:flex-row items-center justify-center gap-3">
                                        <Button
                                            type="button"
                                            onClick={() => setActiveTab("search")}
                                            className="rounded-full"
                                        >
                                            <Search className="size-4" />
                                            {t("searchByPhoneBtn")}
                                        </Button>
                                        <Button asChild variant="outline" className="rounded-full">
                                            <Link href="/">
                                                <ShoppingBag className="size-4" />
                                                {t("goToCatalog")}
                                            </Link>
                                        </Button>
                                    </div>
                                </div>
                            ) : (
                                <div className="grid gap-3">
                                    <div className="flex items-center justify-between text-xs text-muted-foreground px-1">
                                        <span>{t("ordersOnDevice")}</span>
                                        <span>{t("tapToView")}</span>
                                    </div>

                                    {recentOrders.map((order) => (
                                        <div
                                            key={order.id}
                                            onClick={() => handleSelectOrder(order)}
                                            className="group cursor-pointer rounded-2xl border border-border/70 bg-card p-4 shadow-soft transition-all hover:border-primary/50 hover:shadow-lift active:scale-[0.99]"
                                        >
                                            <div className="flex items-start justify-between gap-3">
                                                <div>
                                                    <div className="flex items-center gap-2">
                                                        <span
                                                            className="font-mono text-sm font-bold text-foreground"
                                                            dir="ltr"
                                                        >
                                                            {order.order_number}
                                                        </span>
                                                        <span
                                                            className={cn(
                                                                "rounded-full px-2 py-0.5 text-[11px] font-semibold",
                                                                order.status === "delivered" &&
                                                                "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400",
                                                                order.status === "out_for_delivery" &&
                                                                "bg-indigo-500/15 text-indigo-600 dark:text-indigo-400",
                                                                order.status === "preparing" &&
                                                                "bg-amber-500/15 text-amber-600 dark:text-amber-400",
                                                                order.status === "confirmed" &&
                                                                "bg-blue-500/15 text-blue-600 dark:text-blue-400",
                                                                order.status === "pending" &&
                                                                "bg-primary/10 text-primary",
                                                                order.status === "canceled" &&
                                                                "bg-destructive/15 text-destructive"
                                                            )}
                                                        >
                                                            {tRoot(ORDER_STATUS_LABELS[order.status]) ?? order.status}
                                                        </span>
                                                    </div>

                                                    <div className="mt-1 text-xs text-muted-foreground">
                                                        {t("orderedBy", {
                                                            name: order.customer_name_snapshot,
                                                            date: formatDateTime(order.placed_at, locale),
                                                        })}
                                                    </div>

                                                    <div className="mt-2 text-xs text-muted-foreground line-clamp-1">
                                                        {order.order_items
                                                            ?.map(
                                                                (i) =>
                                                                    `${i.quantity}x ${localizedText(
                                                                        locale,
                                                                        i.product_name_snapshot,
                                                                        i.product_name_ar_snapshot
                                                                    )}`
                                                            )
                                                            .join(", ")}
                                                    </div>
                                                </div>

                                                <div className="text-end shrink-0">
                                                    <div className="font-display font-bold text-primary sm:text-lg">
                                                        {formatILS(order.total_agorot, locale)}
                                                    </div>
                                                    <div className="mt-2 flex items-center justify-end gap-1 text-xs text-primary font-medium group-hover:underline">
                                                        <Eye className="size-3.5" />
                                                        {t("trackAndDetails")}
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}

                    {/* TAB 2: SEARCH BY PHONE / NAME / ORDER NUMBER */}
                    {activeTab === "search" && (
                        <div className="space-y-6">
                            <form
                                onSubmit={handleSearch}
                                className="rounded-2xl border border-border/70 bg-card p-5 shadow-soft space-y-4"
                            >
                                <div className="space-y-1">
                                    <h3 className="font-display text-base font-bold text-foreground">
                                        {t("findOrder")}
                                    </h3>
                                    <p className="text-xs text-muted-foreground">
                                        {t("findOrderHint")}
                                    </p>
                                </div>

                                <div className="grid gap-3 sm:grid-cols-2">
                                    <div className="space-y-1.5">
                                        <Label htmlFor="search-phone" className="text-xs">
                                            {t("phone")}
                                        </Label>
                                        <div className="relative">
                                            <Phone className="absolute right-3 top-2.5 size-4 text-muted-foreground" />
                                            <Input
                                                id="search-phone"
                                                type="tel"
                                                placeholder={t("phonePlaceholder")}
                                                value={searchPhone}
                                                onChange={(e) => setSearchPhone(e.target.value)}
                                                className="pr-9"
                                                dir="ltr"
                                            />
                                        </div>
                                    </div>

                                    <div className="space-y-1.5">
                                        <Label htmlFor="search-name" className="text-xs">
                                            {t("customerName")}
                                        </Label>
                                        <div className="relative">
                                            <User className="absolute right-3 top-2.5 size-4 text-muted-foreground" />
                                            <Input
                                                id="search-name"
                                                type="text"
                                                placeholder={t("namePlaceholder")}
                                                value={searchName}
                                                onChange={(e) => setSearchName(e.target.value)}
                                                className="pr-9"
                                            />
                                        </div>
                                    </div>
                                </div>

                                <div className="space-y-1.5">
                                    <Label htmlFor="search-order-number" className="text-xs">
                                        {t("orOrderNumber")}
                                    </Label>
                                    <Input
                                        id="search-order-number"
                                        type="text"
                                        placeholder={t("orderNumberPlaceholder")}
                                        value={searchOrderNumber}
                                        onChange={(e) => setSearchOrderNumber(e.target.value)}
                                        dir="ltr"
                                    />
                                </div>

                                <Button
                                    type="submit"
                                    disabled={isSearching}
                                    className="w-full rounded-xl gap-2 font-semibold"
                                >
                                    {isSearching ? (
                                        <>
                                            <Loader2 className="size-4 animate-spin" />
                                            {t("searching")}
                                        </>
                                    ) : (
                                        <>
                                            <Search className="size-4" />
                                            {t("searchOrder")}
                                        </>
                                    )}
                                </Button>
                            </form>

                            {/* Search Results Display */}
                            {searchResults !== null && (
                                <div className="space-y-3">
                                    <h4 className="font-semibold text-sm text-foreground">
                                        {t("searchResults", { count: searchResults.length })}
                                    </h4>

                                    {searchResults.length === 0 ? (
                                        <div className="rounded-xl border border-border/70 bg-card p-6 text-center text-xs text-muted-foreground">
                                            {t("noResults")}
                                        </div>
                                    ) : (
                                        searchResults.map((order) => (
                                            <div
                                                key={order.id}
                                                onClick={() => handleSelectOrder(order)}
                                                className="group cursor-pointer rounded-2xl border border-border/70 bg-card p-4 shadow-soft transition-all hover:border-primary/50 hover:shadow-lift active:scale-[0.99]"
                                            >
                                                <div className="flex items-start justify-between gap-3">
                                                    <div>
                                                        <div className="flex items-center gap-2">
                                                            <span
                                                                className="font-mono text-sm font-bold text-foreground"
                                                                dir="ltr"
                                                            >
                                                                {order.order_number}
                                                            </span>
                                                            <span
                                                                className={cn(
                                                                    "rounded-full px-2 py-0.5 text-[11px] font-semibold",
                                                                    order.status === "delivered" &&
                                                                    "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400",
                                                                    order.status === "out_for_delivery" &&
                                                                    "bg-indigo-500/15 text-indigo-600 dark:text-indigo-400",
                                                                    order.status === "preparing" &&
                                                                    "bg-amber-500/15 text-amber-600 dark:text-amber-400",
                                                                    order.status === "confirmed" &&
                                                                    "bg-blue-500/15 text-blue-600 dark:text-blue-400",
                                                                    order.status === "pending" &&
                                                                    "bg-primary/10 text-primary",
                                                                    order.status === "canceled" &&
                                                                    "bg-destructive/15 text-destructive"
                                                                )}
                                                            >
                                                                {tRoot(ORDER_STATUS_LABELS[order.status]) ?? order.status}
                                                            </span>
                                                        </div>

                                                        <div className="mt-1 text-xs text-muted-foreground">
                                                            {order.customer_name_snapshot} ({order.customer_phone_snapshot}) •{" "}
                                                            {formatDateTime(order.placed_at, locale)}
                                                        </div>

                                                        <div className="mt-2 text-xs text-muted-foreground line-clamp-1">
                                                            {order.order_items
                                                                ?.map(
                                                                    (i) =>
                                                                        `${i.quantity}x ${localizedText(
                                                                            locale,
                                                                            i.product_name_snapshot,
                                                                            i.product_name_ar_snapshot
                                                                        )}`
                                                                )
                                                                .join(", ")}
                                                        </div>
                                                    </div>

                                                    <div className="text-end shrink-0">
                                                        <div className="font-display font-bold text-primary sm:text-lg">
                                                            {formatILS(order.total_agorot, locale)}
                                                        </div>
                                                        <div className="mt-2 flex items-center justify-end gap-1 text-xs text-primary font-medium group-hover:underline">
                                                            <Eye className="size-3.5" />
                                                            {t("track")}
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        ))
                                    )}
                                </div>
                            )}
                        </div>
                    )}
                </div>
            )}

            {/* QR CODE MODAL */}
            {qrModalUrl && selectedOrder && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm animate-pop-in">
                    <div className="relative w-full max-w-sm rounded-3xl border border-border/70 bg-card p-6 shadow-lift text-center">
                        <button
                            type="button"
                            onClick={() => setQrModalUrl(null)}
                            className="absolute left-4 top-4 rounded-full p-1 text-muted-foreground hover:bg-secondary hover:text-foreground"
                        >
                            <X className="size-5" />
                        </button>

                        <div className="mx-auto flex size-12 items-center justify-center rounded-full bg-primary/10 text-primary">
                            <QrCode className="size-6" />
                        </div>

                        <h3 className="mt-3 font-display text-lg font-bold">
                            {t("qrTitle")}
                        </h3>
                        <p className="mt-1 text-xs text-muted-foreground">
                            {t("qrSubtitle", { orderNumber: selectedOrder.order_number })}
                        </p>

                        <div className="mx-auto my-4 flex size-52 items-center justify-center rounded-2xl border-2 border-primary/30 bg-white p-3 shadow-inner">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img
                                src={qrModalUrl}
                                alt="QR code"
                                className="size-full object-contain"
                            />
                        </div>

                        <p className="text-xs text-muted-foreground mb-4">
                            {t("qrHint")}
                        </p>

                        <div className="flex flex-col gap-2">
                            <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={() => {
                                    const link = document.createElement("a");
                                    link.href = qrModalUrl;
                                    link.download = `order-${selectedOrder.order_number}-qrcode.png`;
                                    link.click();
                                    toast.success(t("qrDownloaded"));
                                }}
                                className="rounded-xl"
                            >
                                <Download className="size-3.5" />
                                {t("downloadQr")}
                            </Button>

                            <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={handleCopyLink}
                                className="rounded-xl"
                            >
                                {qrCopied ? (
                                    <>
                                        <Check className="size-3.5 text-emerald-600" />
                                        {t("copied")}
                                    </>
                                ) : (
                                    <>
                                        <Copy className="size-3.5" />
                                        {t("copyLink")}
                                    </>
                                )}
                            </Button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
