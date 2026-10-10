"use client";

/**
 * Interactive map pin picker for checkout / admin / courier flows.
 *
 * Client-side only — load via next/dynamic(() => import(...), { ssr: false }).
 *
 * Features:
 *   * Draggable pin (drag the marker or tap anywhere on the map).
 *   * "Use my location" button (GPS) with an accuracy circle.
 *   * Debounced address search → Nominatim via our proxy → moves the pin.
 *   * On pin settle: reverse-geocodes and reports the resolved address text
 *     through onReverseGeocode so the parent can autofill the address form.
 */

import { useEffect, useRef, useState } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import {
    geocodeReverse,
    geocodeSearch,
    type GeocodeClientResult,
} from "@/lib/utils/geocode-client";
import { Crosshair, Locate, Search, X } from "lucide-react";

export interface PinPickerValue {
    lat: number | null;
    lng: number | null;
    accuracy?: number | null;
}

export interface AddressPinPickerProps {
    className?: string;
    /** Initial pin position (e.g. a saved address or GPS fix). */
    value?: PinPickerValue;
    /** Called whenever the pin settles on a new position. */
    onChange?: (value: PinPickerValue) => void;
    /** Called with the reverse-geocoded address text after a pin settle. */
    onReverseGeocode?: (displayName: string | null) => void;
    /** Placeholder for the address search input. */
    searchPlaceholder?: string;
    /** Tailwind height class for the map area (default h-64). */
    heightClassName?: string;
}

const DEFAULT_CENTER = { lat: 31.91, lng: 34.85 };
const DEFAULT_ZOOM = 10;
const PIN_ZOOM = 16;
const PIN_SIZE = 36;
const SEARCH_MIN_CHARS = 3;
const SEARCH_DEBOUNCE_MS = 500;
const REVERSE_DEBOUNCE_MS = 350;

function pinIcon(): L.DivIcon {
    return L.divIcon({
        className: "app-icon",
        html: `<div class="app-pin"><span class="app-pin__dot"></span></div>`,
        iconSize: [PIN_SIZE, PIN_SIZE],
        iconAnchor: [PIN_SIZE / 2, PIN_SIZE - 4],
        popupAnchor: [0, -PIN_SIZE + 8],
    });
}

export function AddressPinPicker({
    className,
    value,
    onChange,
    onReverseGeocode,
    searchPlaceholder,
    heightClassName = "h-64",
}: AddressPinPickerProps) {
    const containerRef = useRef<HTMLDivElement | null>(null);
    const mapRef = useRef<L.Map | null>(null);
    const pinRef = useRef<L.Marker | null>(null);
    const accuracyLayer = useRef<L.LayerGroup | null>(null);

    const [locating, setLocating] = useState(false);
    const [searching, setSearching] = useState(false);
    const [query, setQuery] = useState("");
    const [results, setResults] = useState<GeocodeClientResult[]>([]);
    const [showResults, setShowResults] = useState(false);
    const [pinned, setPinned] = useState(false);

    // Keep the latest callbacks in refs so the one-time map effect never
    // captures a stale closure.
    const onChangeRef = useRef(onChange);
    onChangeRef.current = onChange;
    const onReverseGeocodeRef = useRef(onReverseGeocode);
    onReverseGeocodeRef.current = onReverseGeocode;

    const searchDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const reverseDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const searchSeq = useRef(0);
    const reverseSeq = useRef(0);
    // Last position this picker emitted — used to ignore echoed value props.
    const lastEmittedRef = useRef<PinPickerValue | null>(null);

    /**
     * Moves (or creates) the pin, redraws the accuracy circle and notifies
     * the parent. `notify=false` is used for the initial seed so we don't
     * echo a value the parent already knows.
     */
    function setPin(
        lat: number,
        lng: number,
        accuracy: number | null,
        notify = true
    ) {
        const map = mapRef.current;
        if (!map) return;

        lastEmittedRef.current = { lat, lng, accuracy: accuracy ?? null };

        if (pinRef.current) {
            pinRef.current.setLatLng([lat, lng]);
        } else {
            const marker = L.marker([lat, lng], {
                icon: pinIcon(),
                draggable: true,
                keyboard: true,
                title: "pin",
            }).addTo(map);
            // Leaflet 1.x dragend carries no position — read it from the marker.
            marker.on("dragend", () => {
                const pos = marker.getLatLng();
                setPin(pos.lat, pos.lng, null);
            });
            pinRef.current = marker;
        }

        accuracyLayer.current?.clearLayers();
        if (accuracy && accuracy > 10) {
            L.circle([lat, lng], {
                radius: accuracy,
                color: "#3b82f6",
                weight: 1,
                fillColor: "#3b82f6",
                fillOpacity: 0.12,
            }).addTo(accuracyLayer.current!);
        }

        setPinned(true);

        if (!notify) return;

        onChangeRef.current?.({ lat, lng, accuracy: accuracy ?? null });

        // Reverse geocode (debounced + stale-guarded) so the parent can
        // autofill the address text from the resolved place.
        const seq = ++reverseSeq.current;
        if (reverseDebounceRef.current) clearTimeout(reverseDebounceRef.current);
        reverseDebounceRef.current = setTimeout(async () => {
            const result = await geocodeReverse(lat, lng);
            if (seq !== reverseSeq.current) return;
            onReverseGeocodeRef.current?.(result?.display_name ?? null);
        }, REVERSE_DEBOUNCE_MS);
    }

    function handleLocate() {
        const map = mapRef.current;
        if (!map || typeof navigator === "undefined") return;
        setLocating(true);
        navigator.geolocation.getCurrentPosition(
            (pos) => {
                const { latitude, longitude, accuracy } = pos.coords;
                map.setView([latitude, longitude], Math.max(map.getZoom(), PIN_ZOOM));
                setPin(latitude, longitude, accuracy ?? null);
                setLocating(false);
            },
            () => setLocating(false),
            { enableHighAccuracy: true, timeout: 8000 }
        );
    }

    function handleQueryChange(next: string) {
        setQuery(next);
        if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current);

        if (next.trim().length < SEARCH_MIN_CHARS) {
            setResults([]);
            setShowResults(false);
            setSearching(false);
            return;
        }

        const seq = ++searchSeq.current;
        setSearching(true);
        searchDebounceRef.current = setTimeout(async () => {
            const found = await geocodeSearch(next.trim(), 5);
            if (seq !== searchSeq.current) return;
            setSearching(false);
            setResults(found);
            setShowResults(true);
        }, SEARCH_DEBOUNCE_MS);
    }

    function selectResult(result: GeocodeClientResult) {
        if (result.lat === null || result.lng === null) return;
        const map = mapRef.current;
        if (map) map.setView([result.lat, result.lng], Math.max(map.getZoom(), PIN_ZOOM));
        setPin(result.lat, result.lng, null);
        setResults([]);
        setShowResults(false);
        setQuery(result.display_name ?? query);
    }

    function clearQuery() {
        setQuery("");
        setResults([]);
        setShowResults(false);
        if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current);
    }

    // Initialise the map once.
    useEffect(() => {
        if (!containerRef.current || mapRef.current) return;

        const map = L.map(containerRef.current, {
            center:
                value?.lat !== null && value?.lng !== null
                    ? [value!.lat!, value!.lng!]
                    : [DEFAULT_CENTER.lat, DEFAULT_CENTER.lng],
            zoom:
                value?.lat !== null && value?.lng !== null
                    ? PIN_ZOOM
                    : DEFAULT_ZOOM,
            zoomControl: true,
            attributionControl: true,
        });
        mapRef.current = map;

        L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
            maxZoom: 19,
            attribution: "&copy; OpenStreetMap contributors",
        }).addTo(map);

        accuracyLayer.current = L.layerGroup().addTo(map);

        // Tap anywhere on the map to move the pin.
        map.on("click", (e) => {
            const { lat, lng } = e.latlng;
            setPin(lat, lng, null);
        });

        // Seed the initial pin without echoing it back to the parent.
        if (value?.lat !== null && value?.lng !== null) {
            setPin(value!.lat!, value!.lng!, value?.accuracy ?? null, false);
        }

        return () => {
            map.remove();
            mapRef.current = null;
            accuracyLayer.current = null;
            pinRef.current = null;
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // React to external value changes (e.g. the checkout's locate button)
    // without fighting the user's own drags — skip positions we emitted.
    useEffect(() => {
        if (value?.lat == null || value?.lng == null) return;
        const last = lastEmittedRef.current;
        if (last && last.lat === value.lat && last.lng === value.lng) return;
        const map = mapRef.current;
        if (!map) return;
        map.setView([value.lat, value.lng], Math.max(map.getZoom(), PIN_ZOOM));
        setPin(value.lat, value.lng, value.accuracy ?? null, false);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [value?.lat, value?.lng]);

    return (
        <div
            className={cn(
                "relative overflow-hidden rounded-xl border border-border/70",
                className
            )}
            dir="ltr"
        >
            <style>{PIN_CSS}</style>

            {/* Search box */}
            <div className="relative z-[1001]">
                <Input
                    type="text"
                    value={query}
                    onChange={(e) => handleQueryChange(e.target.value)}
                    placeholder={searchPlaceholder}
                    className="h-9 w-full pe-9"
                    aria-label="search address"
                />
                {query ? (
                    <button
                        type="button"
                        className="absolute end-2 top-1.5 text-muted-foreground hover:text-foreground"
                        onClick={clearQuery}
                        aria-label="clear search"
                    >
                        <X className="size-4" />
                    </button>
                ) : searching ? (
                    <Search className="absolute end-2.5 top-2.5 size-4 animate-pulse" />
                ) : (
                    <Search className="absolute end-2.5 top-2.5 size-4 text-muted-foreground" />
                )}

                {showResults && results.length > 0 && (
                    <div className="absolute z-[1002] mt-1 w-full overflow-hidden rounded-lg border border-border/70 bg-background shadow-lg">
                        {results.map((result, i) => (
                            <button
                                key={i}
                                type="button"
                                className="block w-full truncate px-3 py-2 text-start text-sm hover:bg-muted"
                                onClick={() => selectResult(result)}
                            >
                                {result.display_name ?? "—"}
                            </button>
                        ))}
                    </div>
                )}
            </div>

            {/* Map */}
            <div ref={containerRef} className={cn("w-full", heightClassName)} />

            {/* Locate-me control */}
            <div className="absolute end-3 top-12 z-[1000] flex flex-col gap-2">
                <Button
                    type="button"
                    size="icon"
                    variant="secondary"
                    className="size-9 rounded-xl bg-background/95 shadow-soft backdrop-blur"
                    onClick={handleLocate}
                    disabled={locating}
                    aria-label="use my location"
                >
                    {locating ? (
                        <Crosshair className="size-4 animate-spin" />
                    ) : (
                        <Locate className="size-4" />
                    )}
                </Button>
            </div>

            {/* Pin status chip */}
            {pinned && (
                <div className="absolute bottom-2 start-2 z-[1000] flex items-center gap-1.5 rounded-md bg-background/90 px-2 py-1 text-[11px] shadow">
                    <span className="size-1.5 rounded-full bg-rose-600" />
                    <span className="text-muted-foreground">pin set</span>
                </div>
            )}
        </div>
    );
}

const PIN_CSS = `
  .app-icon { background: transparent; border: none; }
  .app-pin {
    position: relative;
    width: 34px;
    height: 34px;
    border-radius: 50% 50% 50% 4px;
    transform: rotate(-45deg);
    background: #e11d48;
    border: 3px solid #fff;
    box-shadow: 0 4px 12px rgba(0,0,0,.25);
    display: flex;
    align-items: center;
    justify-content: center;
  }
  .app-pin__dot {
    transform: rotate(45deg);
    width: 8px;
    height: 8px;
    border-radius: 50%;
    background: #fff;
  }
`;