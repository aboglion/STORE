"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import {
    List,
    Loader2,
    Map as MapIcon,
    Navigation,
    X,
} from "lucide-react";

import { CourierMapView } from "@/components/courier/courier-map-view";
import { CourierOrderCard } from "@/components/courier/courier-order-card";
import { NavigateSheet } from "@/components/courier/navigate-sheet";
import { RecommendationsPanel } from "@/components/courier/recommendations-panel";
import { useCourierLocation } from "@/components/courier/use-courier-location";
import { StoreLogo } from "@/components/store/store-logo";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { optimizeRoute, type RoutePlan } from "@/lib/utils/route";
import type { CourierOrder, CourierPortalData } from "@/types/database.types";

type Tab = "list" | "map";

const POLL_INTERVAL_MS = 30_000;

interface CourierAppProps {
    token: string;
    initialData: CourierPortalData;
}

export function CourierApp({ token, initialData }: CourierAppProps) {
    const t = useTranslations("courier");
    const router = useRouter();

    const [data, setData] = useState(initialData);
    const [tab, setTab] = useState<Tab>("list");
    const [navOrder, setNavOrder] = useState<CourierOrder | null>(null);
    const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);
    const [deliveredOpen, setDeliveredOpen] = useState(false);

    const { position, status: locationStatus } = useCourierLocation({
        token,
        enabled: data.active_orders.length > 0,
    });

    // Keep local state in sync when the server re-renders (router.refresh).
    useEffect(() => {
        setData(initialData);
    }, [initialData]);

    // Poll for new assignments / transfers while the tab is visible.
    useEffect(() => {
        const id = setInterval(() => {
            if (!document.hidden) router.refresh();
        }, POLL_INTERVAL_MS);
        const onVisibility = () => {
            if (!document.hidden) router.refresh();
        };
        document.addEventListener("visibilitychange", onVisibility);
        return () => {
            clearInterval(id);
            document.removeEventListener("visibilitychange", onVisibility);
        };
    }, [router]);

    const ordersById = useMemo(
        () => new Map(data.active_orders.map((o) => [o.id, o])),
        [data.active_orders]
    );

    const plan: RoutePlan = useMemo(
        () =>
            optimizeRoute(
                position ? { lat: position.lat, lng: position.lng } : null,
                data.active_orders.map((o) => ({
                    id: o.id,
                    lat: o.address_lat,
                    lng: o.address_lng,
                }))
            ),
        [data.active_orders, position]
    );

    /** located orders in recommended order with their distance from origin */
    const orderedCards = useMemo(() => {
        return plan.ordered.map((stop, index) => ({
            order: ordersById.get(stop.id),
            stop,
            index,
            distanceMeters: plan.legsMeters[index] ?? null,
            isFirstStop: index === 0,
        }));
    }, [plan, ordersById]);

    const unlocatedOrders = useMemo(() => {
        const ids = new Set(plan.ordered.map((s) => s.id));
        return data.active_orders.filter((o) => !ids.has(o.id));
    }, [data.active_orders, plan.ordered]);

    function handleChanged() {
        setSelectedOrderId(null);
        router.refresh();
    }

    const selectedOrder = selectedOrderId
        ? ordersById.get(selectedOrderId) ?? null
        : null;

    return (
        <div className="flex min-h-dvh flex-col bg-background">
            {/* Header */}
            <header className="sticky top-0 z-40 border-b border-border/60 bg-background/85 backdrop-blur-xl">
                <div className="mx-auto flex h-16 w-full max-w-3xl items-center gap-3 px-4">
                    <StoreLogo
                        logoUrl={data.store.logo_url ?? ""}
                        name={data.store.name}
                        className="size-9"
                    />
                    <div className="min-w-0 flex-1">
                        <div className="truncate text-sm font-bold">
                            {t("greeting", { name: data.courier.full_name })}
                        </div>
                        <div className="text-xs text-muted-foreground">
                            {t("activeCount", {
                                count: data.active_orders.length,
                            })}
                        </div>
                    </div>
                    {locationStatus === "active" && (
                        <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/15 px-2.5 py-1 text-[11px] font-semibold text-emerald-700">
                            <span className="size-1.5 animate-pulse rounded-full bg-emerald-500" />
                            {t("live")}
                        </span>
                    )}
                </div>
            </header>

            {/* Location hint */}
            {(locationStatus === "denied" || locationStatus === "unsupported") &&
                data.active_orders.length > 0 && (
                    <div className="mx-auto mt-3 w-full max-w-3xl px-4">
                        <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs text-amber-700">
                            {t("locationHint")}
                        </div>
                    </div>
                )}

            <main className="mx-auto w-full max-w-3xl flex-1 px-4 pb-28 pt-3">
                {data.active_orders.length === 0 ? (
                    <EmptyState
                        title={t("noOrders")}
                        hint={`${t("noOrdersHint")} ${data.store.contact_phone ? `· ${data.store.contact_phone}` : ""}`}
                    />
                ) : (
                    <>
                        {tab === "list" ? (
                            <div className="space-y-3">
                                <RecommendationsPanel
                                    plan={plan}
                                    ordersById={ordersById}
                                    locationStatus={locationStatus}
                                />

                                {orderedCards.map(({ order, index, distanceMeters, isFirstStop }) =>
                                    order ? (
                                        <CourierOrderCard
                                            key={order.id}
                                            order={order}
                                            token={token}
                                            stopNumber={index + 1}
                                            distanceMeters={distanceMeters}
                                            isFirstStop={isFirstStop}
                                            onChanged={handleChanged}
                                            onNavigate={setNavOrder}
                                        />
                                    ) : null
                                )}

                                {unlocatedOrders.map((order) => (
                                    <CourierOrderCard
                                        key={order.id}
                                        order={order}
                                        token={token}
                                        stopNumber={null}
                                        onChanged={handleChanged}
                                        onNavigate={setNavOrder}
                                    />
                                ))}

                                {data.delivered_today.length > 0 && (
                                    <div className="pt-3">
                                        <button
                                            type="button"
                                            onClick={() =>
                                                setDeliveredOpen((v) => !v)
                                            }
                                            className="flex w-full items-center justify-between rounded-xl bg-secondary/50 px-4 py-3 text-sm font-semibold transition-colors hover:bg-secondary"
                                        >
                                            <span>
                                                {t("deliveredToday", {
                                                    count: data.delivered_today.length,
                                                })}
                                            </span>
                                            <Loader2
                                                className={cn(
                                                    "size-4 rotate-90 transition-transform",
                                                    deliveredOpen && "rotate-0"
                                                )}
                                            />
                                        </button>
                                        {deliveredOpen && (
                                            <div className="mt-3 space-y-3">
                                                {data.delivered_today.map((order) => (
                                                    <CourierOrderCard
                                                        key={order.id}
                                                        order={order}
                                                        token={token}
                                                        onChanged={handleChanged}
                                                        onNavigate={setNavOrder}
                                                    />
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        ) : (
                            <div className="relative -mx-4 h-[calc(100dvh-9.5rem)] overflow-hidden">
                                <CourierMapView
                                    orders={data.active_orders}
                                    plan={plan}
                                    position={position}
                                    courierColor={data.courier.color}
                                    onSelectOrder={setSelectedOrderId}
                                />

                                {selectedOrder && (
                                    <div className="absolute inset-x-3 bottom-3 z-[1001]">
                                        <div className="relative rounded-2xl border border-border/70 bg-card shadow-2xl">
                                            <Button
                                                type="button"
                                                variant="ghost"
                                                size="icon"
                                                className="absolute end-2 top-2 z-10 size-7 rounded-full"
                                                onClick={() => setSelectedOrderId(null)}
                                                aria-label="close"
                                            >
                                                <X className="size-4" />
                                            </Button>
                                            <CourierOrderCard
                                                order={selectedOrder}
                                                token={token}
                                                stopNumber={null}
                                                onChanged={handleChanged}
                                                onNavigate={setNavOrder}
                                            />
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}
                    </>
                )}
            </main>

            {/* Bottom tab bar */}
            <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-border/60 bg-background/90 backdrop-blur-xl">
                <div className="mx-auto grid max-w-3xl grid-cols-2 gap-2 p-3">
                    <Button
                        type="button"
                        variant={tab === "list" ? "default" : "ghost"}
                        className={cn(
                            "h-11 rounded-2xl text-sm font-semibold transition-all active:scale-[0.98]",
                            tab === "list" && "shadow-soft"
                        )}
                        onClick={() => setTab("list")}
                    >
                        <List className="size-4" />
                        {t("listTab")}
                    </Button>
                    <Button
                        type="button"
                        variant={tab === "map" ? "default" : "ghost"}
                        className={cn(
                            "h-11 rounded-2xl text-sm font-semibold transition-all active:scale-[0.98]",
                            tab === "map" && "shadow-soft"
                        )}
                        onClick={() => setTab("map")}
                    >
                        <MapIcon className="size-4" />
                        {t("mapTab")}
                    </Button>
                </div>
            </nav>

            <NavigateSheet
                order={navOrder}
                open={navOrder !== null}
                onOpenChange={(open) => {
                    if (!open) setNavOrder(null);
                }}
            />
        </div>
    );
}

function EmptyState({ title, hint }: { title: string; hint: string }) {
    return (
        <div className="flex flex-col items-center gap-3 rounded-3xl border border-border/60 bg-card px-6 py-16 text-center shadow-soft">
            <span className="flex size-14 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                <Navigation className="size-7" />
            </span>
            <div className="text-lg font-bold">{title}</div>
            <p className="max-w-xs text-sm text-muted-foreground">{hint}</p>
        </div>
    );
}