/**
 * Pure route-optimization helpers for the courier portal.
 *
 * Deliberately dependency-free and deterministic:
 *   * haversine great-circle distance (meters)
 *   * nearest-neighbor construction from the courier's live position
 *   * 2-opt local search to untangle crossings
 *   * simple ETA model (urban driving speed + per-stop service time)
 *
 * Works fully client-side — no external routing API needed.
 */

export interface LatLng {
    lat: number;
    lng: number;
}

export interface RouteStop {
    id: string;
    lat?: number | null;
    lng?: number | null;
    /** Extra minutes spent at this stop (defaults to SERVICE_MINUTES). */
    serviceMinutes?: number;
}

export interface RoutePlan {
    /** Located stops in the suggested visit order. */
    ordered: RouteStop[];
    /**
     * Leg distances in meters. When an origin was provided:
     *   legsMeters[0] = origin -> first stop
     *   legsMeters[i] = stop[i-1] -> stop[i]
     * Without an origin the first leg is 0.
     */
    legsMeters: number[];
    totalMeters: number;
    /** Estimated minutes = driving + service time. */
    totalMinutes: number;
    /** Stops without usable coordinates (appended to the plan). */
    unlocated: RouteStop[];
}

const EARTH_RADIUS_METERS = 6_371_000;

export const ROUTING_CONSTANTS = {
    /** Urban average driving speed used for ETA estimates (km/h). */
    driveKmh: 25,
    /** Default time spent per stop before moving on (minutes). */
    serviceMinutes: 3,
} as const;

const toRad = (deg: number): number => (deg * Math.PI) / 180;

export function haversineMeters(a: LatLng, b: LatLng): number {
    const dLat = toRad(b.lat - a.lat);
    const dLng = toRad(b.lng - a.lng);
    const s =
        Math.sin(dLat / 2) ** 2 +
        Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2;
    return 2 * EARTH_RADIUS_METERS * Math.asin(Math.min(1, Math.sqrt(s)));
}

function hasCoords(stop: RouteStop): stop is RouteStop & { lat: number; lng: number } {
    return (
        typeof stop.lat === "number" &&
        typeof stop.lng === "number" &&
        Number.isFinite(stop.lat) &&
        Number.isFinite(stop.lng)
    );
}

function toLatLng(stop: RouteStop & { lat: number; lng: number }): LatLng {
    return { lat: stop.lat, lng: stop.lng };
}

/** Greedy nearest-neighbor tour starting from origin (or the first stop). */
function nearestNeighbor(origin: LatLng | null, stops: RouteStop[]): RouteStop[] {
    if (stops.length <= 1) return [...stops];

    const remaining = [...stops];
    const tour: (RouteStop & { lat: number; lng: number })[] = [];
    let current: LatLng = origin ?? toLatLng(remaining[0] as RouteStop & { lat: number; lng: number });

    // When there is no origin, the first chosen stop is the tour head.
    if (!origin) {
        const first = remaining.shift() as RouteStop & { lat: number; lng: number };
        tour.push(first);
        current = toLatLng(first);
    }

    while (remaining.length > 0) {
        let bestIndex = 0;
        let bestDistance = Infinity;
        for (let i = 0; i < remaining.length; i += 1) {
            const d = haversineMeters(current, toLatLng(remaining[i] as RouteStop & { lat: number; lng: number }));
            if (d < bestDistance) {
                bestDistance = d;
                bestIndex = i;
            }
        }
        const next = remaining.splice(bestIndex, 1)[0] as RouteStop & { lat: number; lng: number };
        tour.push(next);
        current = toLatLng(next);
    }

    return tour;
}

/** Total route length, including the origin->first leg when present. */
function tourDistanceMeters(origin: LatLng | null, tour: RouteStop[]): number {
    if (tour.length === 0) return 0;
    let current: LatLng | null = origin;
    let total = 0;
    for (const stop of tour) {
        if (current) total += haversineMeters(current, toLatLng(stop as RouteStop & { lat: number; lng: number }));
        current = toLatLng(stop as RouteStop & { lat: number; lng: number });
    }
    return total;
}

/**
 * 2-opt local search over the tour. Reverses every segment and keeps the
 * change whenever it shortens the tour. Restarts after each improvement
 * (small n -> instant, n is typically fewer than 40 stops).
 */
function twoOpt(origin: LatLng | null, tour: RouteStop[]): RouteStop[] {
    if (tour.length < 4) return tour;

    const best = [...tour];
    let improved = true;
    while (improved) {
        improved = false;
        outer: for (let i = 1; i < best.length - 1; i += 1) {
            for (let j = i + 1; j < best.length; j += 1) {
                const candidate = [...best];
                // Reverse the segment [i..j].
                const segment = candidate.slice(i, j + 1).reverse();
                candidate.splice(i, segment.length, ...segment);

                if (tourDistanceMeters(origin, candidate) < tourDistanceMeters(origin, best)) {
                    best.splice(0, best.length, ...candidate);
                    improved = true;
                    break outer;
                }
            }
        }
    }
    return best;
}

export function optimizeRoute(origin: LatLng | null, stops: RouteStop[]): RoutePlan {
    const located = stops.filter(hasCoords);
    const unlocated = stops.filter((s) => !hasCoords(s));

    const tour = twoOpt(origin, nearestNeighbor(origin, located));

    // Build legs.
    const legsMeters: number[] = [];
    let totalMeters = 0;
    if (tour.length > 0) {
        let current: LatLng | null = origin;
        for (const stop of tour) {
            const point = toLatLng(stop as RouteStop & { lat: number; lng: number });
            const leg = current ? haversineMeters(current, point) : 0;
            legsMeters.push(leg);
            totalMeters += leg;
            current = point;
        }
    }

    const driveMinutes =
        totalMeters / ((ROUTING_CONSTANTS.driveKmh * 1000) / 60);
    const serviceMinutes = tour.reduce(
        (sum, stop) => sum + (stop.serviceMinutes ?? ROUTING_CONSTANTS.serviceMinutes),
        0
    );

    return {
        ordered: tour,
        legsMeters,
        totalMeters,
        totalMinutes: driveMinutes + serviceMinutes,
        unlocated,
    };
}

/** Convenience: driver-friendly "X.X km" value (one decimal). */
export function metersToKm(meters: number): number {
    return Math.round((meters / 1000) * 10) / 10;
}

/** Convenience: rounded minutes, at least 1. */
export function roundMinutes(minutes: number): number {
    return Math.max(1, Math.round(minutes));
}