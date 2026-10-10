"use client";

import dynamic from "next/dynamic";

import type { MapStop } from "@/components/map/delivery-map";

const DeliveryMap = dynamic(
    () => import("@/components/map/delivery-map").then((m) => m.DeliveryMap),
    { ssr: false }
);

interface CourierPositionMapProps {
    name: string;
    color: string;
    lat: number;
    lng: number;
}

export function CourierPositionMap({ name, color, lat, lng }: CourierPositionMapProps) {
    const stops: MapStop[] = [
        {
            id: "courier",
            lat,
            lng,
            label: name,
            color,
            number: null,
        },
    ];

    return (
        <div className="h-52 overflow-hidden rounded-2xl border border-border/70">
            <DeliveryMap
                className="h-full w-full"
                stops={stops}
                routePoints={[]}
                center={{ lat, lng }}
                zoom={15}
                fitOnDataChange={false}
                showControls={false}
            />
        </div>
    );
}