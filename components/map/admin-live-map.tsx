"use client";

import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Radio } from "lucide-react";

import type { MapStop } from "@/components/map/delivery-map";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";
import type { CourierLiveRow, CourierVehicle } from "@/types/database.types";

/** New-row shape of a couriers change received over realtime. */
interface RealtimeCourierRow {
    id: string;
    full_name: string;
    color: string;
    vehicle_type: CourierVehicle;
    is_active: boolean;
    last_lat: number | null;
    last_lng: number | null;
    last_location_at: string | null;
}

const DeliveryMap = dynamic(
    () => import("@/components/map/delivery-map").then((m) => m.DeliveryMap),
    {
        ssr: false,
        loading: () => (
            <div className="flex h-full w-full items-center justify-center bg-muted/40 text-sm text-muted-foreground">
                Loading map…
            </div>
        ),
    }
);

function isFresh(iso: string | null): boolean {
    if (!iso) return false;
    return Date.now() - new Date(iso).getTime() < 120_000;
}

interface AdminLiveMapProps {
    initialRows: CourierLiveRow[];
}

export function AdminLiveMap({ initialRows }: AdminLiveMapProps) {
    const t = useTranslations("admin.couriers");
    const router = useRouter();
    const [rows, setRows] = useState(initialRows);

    useEffect(() => {
        setRows(initialRows);
    }, [initialRows]);

    // Realtime courier positions. Order-stop data refreshes via a slow poll.
    useEffect(() => {
        const supabase = createClient();
        const channel = supabase
            .channel("admin-courier-live")
            .on(
                "postgres_changes",
                {
                    event: "UPDATE",
                    schema: "public",
                    table: "couriers",
                    filter: "is_active=eq.true",
                },
                (payload) => {
                    const row = payload.new as RealtimeCourierRow;
                    setRows((prev) =>
                        prev.map((r) =>
                            r.id === row.id
                                ? {
                                    ...r,
                                    last_lat: row.last_lat,
                                    last_lng: row.last_lng,
                                    last_location_at: row.last_location_at,
                                }
                                : r
                        )
                    );
                }
            )
            .on(
                "postgres_changes",
                {
                    event: "INSERT",
                    schema: "public",
                    table: "couriers",
                    filter: "is_active=eq.true",
                },
                (payload) => {
                    const row = payload.new as RealtimeCourierRow;
                    setRows((prev) => {
                        if (prev.some((r) => r.id === row.id)) return prev;
                        return [
                            ...prev,
                            {
                                id: row.id,
                                full_name: row.full_name,
                                color: row.color,
                                vehicle_type: row.vehicle_type,
                                is_active: true,
                                last_lat: row.last_lat,
                                last_lng: row.last_lng,
                                last_location_at: row.last_location_at,
                                active_orders_count: 0,
                                stops: [],
                            },
                        ];
                    });
                }
            )
            .subscribe();

        const poll = setInterval(() => router.refresh(), 60_000);

        return () => {
            channel.unsubscribe();
            clearInterval(poll);
        };
    }, [router]);

    const positioned = rows.filter(
        (r) => typeof r.last_lat === "number" && typeof r.last_lng === "number"
    );

    const stops: MapStop[] = [
        ...positioned.map((row) => ({
            id: `courier-${row.id}`,
            lat: row.last_lat as number,
            lng: row.last_lng as number,
            label: row.full_name,
            subtitle: t("mapActiveCount", { count: row.active_orders_count }),
            color: row.color,
            number: null,
        })),
        ...rows.flatMap((row) =>
            row.stops
                .filter((s) => typeof s.lat === "number" && typeof s.lng === "number")
                .map((s) => ({
                    id: `stop-${s.id}`,
                    lat: s.lat as number,
                    lng: s.lng as number,
                    label: s.order_number,
                    subtitle: s.address,
                    color: row.color,
                    done: false,
                    number: null,
                }))
        ),
    ];

    return (
        <div className="grid gap-4">
            <div className="flex items-center gap-2 text-sm font-semibold">
                <span className="flex size-7 items-center justify-center rounded-full bg-emerald-500/15 text-emerald-600">
                    <Radio className="size-4 animate-pulse" />
                </span>
                {t("liveMapTitle")}
                <span className="text-xs font-normal text-muted-foreground">
                    {t("liveMapHint")}
                </span>
            </div>

            <div className="h-[420px] overflow-hidden rounded-2xl border border-border/70 shadow-soft">
                <DeliveryMap
                    className="h-full w-full"
                    stops={stops}
                    courierPosition={null}
                    fitOnDataChange
                    showControls
                />
            </div>

            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                {rows.map((row) => (
                    <div
                        key={row.id}
                        className="flex items-center gap-3 rounded-2xl border border-border/70 bg-card px-4 py-3 shadow-soft"
                    >
                        <span
                            className={cn(
                                "size-3.5 shrink-0 rounded-full",
                                isFresh(row.last_location_at) && "animate-pulse"
                            )}
                            style={{
                                backgroundColor: row.color,
                                opacity: isFresh(row.last_location_at) ? 1 : 0.45,
                            }}
                        />
                        <div className="min-w-0 flex-1">
                            <div className="truncate text-sm font-semibold">
                                {row.full_name}
                            </div>
                            <div className="text-xs text-muted-foreground">
                                {t("mapActiveCount", { count: row.active_orders_count })}
                            </div>
                        </div>
                        <span
                            className={cn(
                                "shrink-0 text-[11px] font-semibold",
                                isFresh(row.last_location_at)
                                    ? "text-emerald-600"
                                    : "text-muted-foreground"
                            )}
                        >
                            {isFresh(row.last_location_at)
                                ? t("online")
                                : t("offline")}
                        </span>
                    </div>
                ))}
            </div>
        </div>
    );
}