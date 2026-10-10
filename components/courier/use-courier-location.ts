"use client";

import { useEffect, useRef, useState } from "react";

import { reportCourierLocationAction } from "@/lib/actions/courier-portal";

export type LocationStatus =
    | "unsupported"
    | "idle"
    | "locating"
    | "active"
    | "denied"
    | "error";

export interface GeoPosition {
    lat: number;
    lng: number;
    accuracy: number;
}

/** Min interval between location reports (ms). */
const MIN_REPORT_INTERVAL = 15_000;
/** Min movement that forces a new report (m), regardless of interval. */
const MIN_MOVEMENT_METERS = 25;
/** Hard cap: force a report at least this often. */
const MAX_REPORT_INTERVAL = 60_000;

function metersBetween(a: GeoPosition, b: GeoPosition): number {
    const toRad = (deg: number) => (deg * Math.PI) / 180;
    const R = 6_371_000;
    const dLat = toRad(b.lat - a.lat);
    const dLng = toRad(b.lng - a.lng);
    const s =
        Math.sin(dLat / 2) ** 2 +
        Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2;
    return 2 * R * Math.asin(Math.min(1, Math.sqrt(s)));
}

/**
 * Watches the browser geolocation, feeds the portal's route re-planning,
 * and reports throttled positions to the server so the admin live map stays
 * in sync. Reporting pauses while the tab is hidden and stops entirely when
 * `enabled` is false (no active orders left).
 */
export function useCourierLocation({
    token,
    enabled,
}: {
    token: string;
    enabled: boolean;
}) {
    const [position, setPosition] = useState<GeoPosition | null>(null);
    const [status, setStatus] = useState<LocationStatus>("idle");

    const enabledRef = useRef(enabled);
    enabledRef.current = enabled;
    const tokenRef = useRef(token);
    tokenRef.current = token;

    const lastSentAtRef = useRef(0);
    const lastSignificantRef = useRef<GeoPosition | null>(null);

    useEffect(() => {
        if (typeof navigator === "undefined" || !navigator.geolocation) {
            setStatus("unsupported");
            return;
        }
        if (!enabled) return;

        setStatus("locating");

        const watchId = navigator.geolocation.watchPosition(
            (pos) => {
                const next: GeoPosition = {
                    lat: pos.coords.latitude,
                    lng: pos.coords.longitude,
                    accuracy: pos.coords.accuracy ?? 0,
                };
                setPosition(next);
                setStatus((s) => (s === "denied" ? s : "active"));

                if (!enabledRef.current || document.hidden) return;

                const now = Date.now();
                const sinceLast = now - lastSentAtRef.current;
                const lastSig = lastSignificantRef.current;
                const moved = lastSig
                    ? metersBetween(lastSig, next)
                    : Number.POSITIVE_INFINITY;

                const shouldSend =
                    sinceLast >= MIN_REPORT_INTERVAL &&
                    (moved >= MIN_MOVEMENT_METERS ||
                        sinceLast >= MAX_REPORT_INTERVAL ||
                        lastSig === null);

                if (shouldSend) {
                    lastSentAtRef.current = now;
                    lastSignificantRef.current = next;
                    void reportCourierLocationAction({
                        token: tokenRef.current,
                        lat: next.lat,
                        lng: next.lng,
                        accuracy: next.accuracy,
                    }).then((res) => {
                        if (res?.error === "invalid_link") setStatus("error");
                    });
                }
            },
            () => setStatus("denied"),
            { enableHighAccuracy: true, maximumAge: 30_000, timeout: 15_000 }
        );

        return () => {
            navigator.geolocation.clearWatch(watchId);
        };
    }, [token, enabled]);

    return { position, status };
}