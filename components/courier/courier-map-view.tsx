"use client";

import dynamic from "next/dynamic";

import type { MapStop } from "@/components/map/delivery-map";
import type { GeoPosition } from "@/components/courier/use-courier-location";
import type { RoutePlan } from "@/lib/utils/route";
import type { CourierOrder } from "@/types/database.types";

const DeliveryMap = dynamic(
    () =>
        import("@/components/map/delivery-map").then((m) => m.DeliveryMap),
    { ssr: false, loading: () => <MapSkeleton /> }
);

function MapSkeleton() {
    return (
        <div className="flex h-full w-full items-center justify-center bg-muted/40 text-sm text-muted-foreground">
            Loading map…
        </div>
    );
}

interface CourierMapViewProps {
    orders: CourierOrder[];
    plan: RoutePlan;
    position: GeoPosition | null;
    courierColor: string;
    onSelectOrder: (orderId: string) => void;
}

export function CourierMapView({
    orders,
    plan,
    position,
    courierColor,
    onSelectOrder,
}: CourierMapViewProps) {
    const ordersById = new Map(orders.map((o) => [o.id, o]));

    const stops: MapStop[] = plan.ordered.map((stop, index) => {
        const order = ordersById.get(stop.id);
        return {
            id: stop.id,
            lat: stop.lat as number,
            lng: stop.lng as number,
            label: order?.order_number ?? stop.id,
            subtitle: order?.customer_name ?? "",
            number: index + 1,
            color: courierColor,
            highlight: index === 0,
        };
    });

    const routePoints = plan.ordered.map((s) => ({
        lat: s.lat as number,
        lng: s.lng as number,
    }));

    return (
        <div className="h-full w-full">
            <DeliveryMap
                className="h-full w-full"
                stops={stops}
                routePoints={routePoints}
                courierPosition={
                    position
                        ? {
                            lat: position.lat,
                            lng: position.lng,
                            accuracy: position.accuracy,
                        }
                        : null
                }
                fitOnDataChange
                showControls
                onSelectStop={onSelectOrder}
            />
        </div>
    );
}