"use client";

/**
 * Shared Leaflet map used by the courier portal and the admin live map.
 *
 * Notes:
 *   * Client-side only — pages must load this via
 *     next/dynamic(() => import(...), { ssr: false })
 *   * Custom divIcon markers are used exclusively (avoids the broken
 *     Leaflet default icon asset issue entirely).
 *   * Marker pin styles + the pulsing "start here" highlight and the
 *     animated dashed route are defined once here in an embedded <style>
 *     block so no global CSS changes are required.
 */

import { useEffect, useRef, useState } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Crosshair, Locate, MapPin } from "lucide-react";

export interface MapStop {
    id: string;
    lat: number;
    lng: number;
    label: string;
    subtitle?: string;
    /** Stop number in the recommended route order (1 = start). */
    number?: number | null;
    /** Marker identity color. */
    color?: string;
    /** Delivered / finished stops render muted. */
    done?: boolean;
    /** Pulses — used for the recommended first stop. */
    highlight?: boolean;
}

export interface DeliveryMapProps {
    className?: string;
    /** Default center when there is no data to fit (Israel). */
    center?: { lat: number; lng: number };
    zoom?: number;
    stops?: MapStop[];
    /** Ordered polyline of the suggested route. */
    routePoints?: Array<{ lat: number; lng: number }>;
    /** The courier's live position (marker + accuracy circle). */
    courierPosition?: { lat: number; lng: number; accuracy?: number } | null;
    /** Re-fit bounds automatically whenever stops/route/position change. */
    fitOnDataChange?: boolean;
    /** Show the locate-me + fit-all controls overlay. */
    showControls?: boolean;
    /** Marker tap callback (parents drive their own action panel). */
    onSelectStop?: (id: string) => void;
}

const DEFAULT_CENTER = { lat: 31.91, lng: 34.85 };
const DEFAULT_ZOOM = 10;
const PIN_SIZE = 36;

function escaped(input: string): string {
    return input
        .replace(/&/g, "&")
        .replace(/</g, "<")
        .replace(/>/g, ">")
        .replace(/"/g, '"');
}

function pinIcon(stop: MapStop): L.DivIcon {
    const color = stop.done ? "#16a34a" : stop.color ?? "#e11d48";
    const number = stop.number ?? null;
    const pulseHtml = stop.highlight ? '<span class="dm-pulse"></span>' : "";

    const html = `
      <div class="dm-pin ${stop.done ? "dm-pin--done" : ""}" style="--dm-c:${color}">
        ${pulseHtml}
        ${number !== null
            ? `<span class="dm-pin__num">${number}</span>`
            : '<span class="dm-pin__dot"></span>'
        }
      </div>`;

    return L.divIcon({
        className: "dm-icon",
        html,
        iconSize: [PIN_SIZE, PIN_SIZE],
        iconAnchor: [PIN_SIZE / 2, PIN_SIZE - 4],
        popupAnchor: [0, -PIN_SIZE + 8],
    });
}

function courierIcon(color: string): L.DivIcon {
    return L.divIcon({
        className: "dm-icon",
        html: `<div class="dm-courier" style="--dm-c:${color}">
                 <span class="dm-courier__ring"></span>
                 <span class="dm-courier__core"></span>
               </div>`,
        iconSize: [26, 26],
        iconAnchor: [13, 13],
    });
}

export function DeliveryMap({
    className,
    center = DEFAULT_CENTER,
    zoom = DEFAULT_ZOOM,
    stops = [],
    routePoints = [],
    courierPosition = null,
    fitOnDataChange = true,
    showControls = true,
    onSelectStop,
}: DeliveryMapProps) {
    const containerRef = useRef<HTMLDivElement | null>(null);
    const mapRef = useRef<L.Map | null>(null);
    const markersLayer = useRef<L.LayerGroup | null>(null);
    const routeLayer = useRef<L.LayerGroup | null>(null);
    const courierLayer = useRef<L.LayerGroup | null>(null);
    const [locating, setLocating] = useState(false);

    function handleLocateMe() {
        const map = mapRef.current;
        if (!map || typeof navigator === "undefined") return;
        setLocating(true);
        navigator.geolocation.getCurrentPosition(
            (pos) => {
                const { latitude, longitude } = pos.coords;
                map.setView([latitude, longitude], Math.max(map.getZoom(), 15));
                setLocating(false);
            },
            () => setLocating(false),
            { enableHighAccuracy: true, timeout: 8000 }
        );
    }

    function handleFitAll() {
        const map = mapRef.current;
        if (!map) return;
        const points: Array<[number, number]> = [
            ...stops.map((s) => [s.lat, s.lng] as [number, number]),
            ...routePoints.map((p) => [p.lat, p.lng] as [number, number]),
        ];
        if (courierPosition) points.push([courierPosition.lat, courierPosition.lng]);
        if (points.length === 1) {
            map.setView(points[0], 15);
        } else if (points.length > 1) {
            map.fitBounds(L.latLngBounds(points), { padding: [48, 48], maxZoom: 16 });
        }
    }

    // Initialise the map once.
    useEffect(() => {
        if (!containerRef.current || mapRef.current) return;

        const map = L.map(containerRef.current, {
            center: [center.lat, center.lng],
            zoom,
            zoomControl: true,
            attributionControl: true,
        });
        mapRef.current = map;

        L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
            maxZoom: 19,
            attribution: "&copy; OpenStreetMap contributors",
        }).addTo(map);

        markersLayer.current = L.layerGroup().addTo(map);
        routeLayer.current = L.layerGroup().addTo(map);
        courierLayer.current = L.layerGroup().addTo(map);

        return () => {
            map.remove();
            mapRef.current = null;
            markersLayer.current = null;
            routeLayer.current = null;
            courierLayer.current = null;
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // Stops → numbered markers + popups.
    useEffect(() => {
        const layer = markersLayer.current;
        if (!layer || !mapRef.current) return;
        layer.clearLayers();

        for (const stop of stops) {
            const marker = L.marker([stop.lat, stop.lng], {
                icon: pinIcon(stop),
                keyboard: true,
                title: stop.label,
            }).addTo(layer);

            const subtitle = stop.subtitle ? `<div class="dm-pop__sub">${escaped(stop.subtitle)}</div>` : "";
            marker.bindPopup(
                `<div class="dm-pop">
                   <div class="dm-pop__label">${escaped(stop.label)}</div>
                   ${subtitle}
                 </div>`,
                { closeButton: false, offset: [0, -6] }
            );

            if (onSelectStop) {
                marker.on("click", () => onSelectStop(stop.id));
            }
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [stops]);

    // Route polyline (animated dashed).
    useEffect(() => {
        const layer = routeLayer.current;
        if (!layer || !mapRef.current) return;
        layer.clearLayers();

        if (routePoints.length >= 2) {
            L.polyline(routePoints.map((p) => [p.lat, p.lng] as [number, number]), {
                color: "#e11d48",
                weight: 4,
                opacity: 0.85,
                dashArray: "8 10",
                lineCap: "round",
                className: "dm-route",
            }).addTo(layer);
        }
    }, [routePoints]);

    // Courier position + accuracy circle.
    useEffect(() => {
        const layer = courierLayer.current;
        if (!layer || !mapRef.current) return;
        layer.clearLayers();

        if (courierPosition) {
            const { lat, lng, accuracy } = courierPosition;
            if (accuracy && accuracy > 10) {
                L.circle([lat, lng], {
                    radius: accuracy,
                    color: "#3b82f6",
                    weight: 1,
                    fillColor: "#3b82f6",
                    fillOpacity: 0.12,
                }).addTo(layer);
            }
            L.marker([lat, lng], { icon: courierIcon("#3b82f6"), zIndexOffset: 1000 }).addTo(layer);
        }
    }, [courierPosition]);

    // Fit the view to all data.
    useEffect(() => {
        const map = mapRef.current;
        if (!map || !fitOnDataChange) return;

        const points: Array<[number, number]> = [
            ...stops.map((s) => [s.lat, s.lng] as [number, number]),
            ...routePoints.map((p) => [p.lat, p.lng] as [number, number]),
        ];
        if (courierPosition) points.push([courierPosition.lat, courierPosition.lng]);

        if (points.length === 1) {
            map.setView(points[0], Math.max(map.getZoom(), 15));
        } else if (points.length > 1) {
            map.fitBounds(L.latLngBounds(points), { padding: [48, 48], maxZoom: 16 });
        }
    }, [stops, routePoints, courierPosition, fitOnDataChange]);

    return (
        <div className={cn("relative h-full w-full overflow-hidden", className)} dir="ltr">
            {/* Injected once; marker styles shared by every map instance. */}
            <style>{MAP_CSS}</style>
            <div ref={containerRef} className="h-full w-full" />

            {showControls && (
                <div className="absolute end-3 top-3 z-[1000] flex flex-col gap-2">
                    <Button
                        type="button"
                        size="icon"
                        variant="secondary"
                        className="size-9 rounded-xl bg-background/95 shadow-soft backdrop-blur"
                        onClick={handleFitAll}
                        aria-label="fit all"
                    >
                        <MapPin className="size-4" />
                    </Button>
                    <Button
                        type="button"
                        size="icon"
                        variant="secondary"
                        className="size-9 rounded-xl bg-background/95 shadow-soft backdrop-blur"
                        onClick={handleLocateMe}
                        disabled={locating}
                        aria-label="locate me"
                    >
                        {locating ? (
                            <Crosshair className="size-4 animate-spin" />
                        ) : (
                            <Locate className="size-4" />
                        )}
                    </Button>
                </div>
            )}
        </div>
    );
}

const MAP_CSS = `
  .dm-icon { background: transparent; border: none; }
  .dm-pin {
    position: relative;
    width: 34px;
    height: 34px;
    border-radius: 50% 50% 50% 4px;
    transform: rotate(-45deg);
    background: var(--dm-c);
    border: 3px solid #fff;
    box-shadow: 0 4px 12px rgba(0,0,0,.25);
    display: flex;
    align-items: center;
    justify-content: center;
  }
  .dm-pin--done { filter: grayscale(.35); }
  .dm-pin__num {
    transform: rotate(45deg);
    color: #fff;
    font-weight: 800;
    font-size: 13px;
    line-height: 1;
    font-family: ui-sans-serif, system-ui, sans-serif;
  }
  .dm-pin__dot { transform: rotate(45deg); width: 8px; height: 8px; border-radius: 50%; background: #fff; }
  .dm-pulse {
    position: absolute;
    inset: -8px;
    border-radius: 50% 50% 50% 6px;
    background: var(--dm-c);
    opacity: .45;
    animation: dm-pulse 1.6s ease-out infinite;
  }
  @keyframes dm-pulse {
    0% { transform: scale(.6) rotate(-45deg); opacity: .5; }
    100% { transform: scale(1.55) rotate(-45deg); opacity: 0; }
  }
  .dm-courier { position: relative; width: 26px; height: 26px; }
  .dm-courier__core {
    position: absolute; inset: 0;
    border-radius: 50%;
    background: var(--dm-c);
    border: 3px solid #fff;
    box-shadow: 0 2px 8px rgba(0,0,0,.3);
  }
  .dm-courier__ring {
    position: absolute; inset: -6px;
    border-radius: 50%;
    border: 2px solid var(--dm-c);
    opacity: .5;
    animation: dm-courier-pulse 1.8s ease-out infinite;
  }
  @keyframes dm-courier-pulse {
    0% { transform: scale(.7); opacity: .6; }
    100% { transform: scale(1.5); opacity: 0; }
  }
  .dm-route {
    stroke-dashoffset: 24;
    animation: dm-route-dash 1.1s linear infinite;
  }
  @keyframes dm-route-dash {
    to { stroke-dashoffset: 0; }
  }
  .dm-pop__label { font-weight: 700; font-size: 13px; }
  .dm-pop__sub { font-size: 12px; color: #64748b; margin-top: 2px; }
`;