"use client";

import { useEffect, useRef, useState } from "react";
import { useLocale } from "next-intl";
import { Check, ChevronDown, Loader2, MapPin, Search, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
    ISRAEL_CITIES,
    searchIsraelCities,
    type IsraelCity,
} from "@/lib/data/israel-cities";
import { geocodeSearch, type GeocodeClientResult } from "@/lib/utils/geocode-client";
import { cn } from "@/lib/utils";

export interface CityComboboxProps {
    value: string;
    onChange: (cityName: string, city: IsraelCity | null) => void;
    placeholder?: string;
    className?: string;
    disabled?: boolean;
    id?: string;
}

const FALLBACK_MIN_CHARS = 3;
const FALLBACK_DEBOUNCE_MS = 500;

/** Builds a synthetic IsraelCity from a Nominatim fallback result. */
function fallbackToCity(result: GeocodeClientResult): IsraelCity {
    const name = result.display_name?.split(",")[0]?.trim() || "";
    return {
        nameHe: name,
        nameAr: name,
        lat: result.lat ?? 0,
        lng: result.lng ?? 0,
    };
}

export function CityCombobox({
    value,
    onChange,
    placeholder = "בחר עיר או כפר בישראל...",
    className,
    disabled = false,
    id,
}: CityComboboxProps) {
    const locale = useLocale();
    const isAr = locale === "ar";

    const [open, setOpen] = useState(false);
    const [query, setQuery] = useState(value || "");
    const [matches, setMatches] = useState<IsraelCity[]>(() =>
        searchIsraelCities(value || "", 12)
    );
    // Nominatim fallback results when the local list has no match.
    const [fallbackResults, setFallbackResults] = useState<GeocodeClientResult[]>([]);
    const [fallbackLoading, setFallbackLoading] = useState(false);

    const containerRef = useRef<HTMLDivElement | null>(null);
    const fallbackDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const fallbackSeq = useRef(0);

    // Sync external value changes
    useEffect(() => {
        setQuery(value || "");
    }, [value]);

    // Update suggestions on query change
    useEffect(() => {
        const results = searchIsraelCities(query, 12);
        setMatches(results);
    }, [query]);

    // Close dropdown on outside click
    useEffect(() => {
        function handleClickOutside(e: MouseEvent) {
            if (
                containerRef.current &&
                !containerRef.current.contains(e.target as Node)
            ) {
                setOpen(false);
            }
        }
        document.addEventListener("mousedown", handleClickOutside);
        return () => {
            document.removeEventListener("mousedown", handleClickOutside);
        };
    }, []);

    // Cleanup debounce on unmount
    useEffect(() => {
        return () => {
            if (fallbackDebounceRef.current) clearTimeout(fallbackDebounceRef.current);
        };
    }, []);

    function runFallbackSearch(next: string) {
        if (fallbackDebounceRef.current) clearTimeout(fallbackDebounceRef.current);
        const trimmed = next.trim();
        if (trimmed.length < FALLBACK_MIN_CHARS) {
            setFallbackResults([]);
            setFallbackLoading(false);
            return;
        }
        const seq = ++fallbackSeq.current;
        setFallbackLoading(true);
        fallbackDebounceRef.current = setTimeout(async () => {
            const found = await geocodeSearch(`${trimmed}, ישראל`, 5);
            if (seq !== fallbackSeq.current) return;
            // Keep only locality-type results (city/town/village/hamlet...).
            const localities = found.filter((r) => r.confidence === "low");
            setFallbackResults(localities);
            setFallbackLoading(false);
        }, FALLBACK_DEBOUNCE_MS);
    }

    function handleSelect(city: IsraelCity) {
        const chosenName = isAr ? city.nameAr : city.nameHe;
        setQuery(chosenName);
        setOpen(false);
        setFallbackResults([]);
        onChange(chosenName, city);
    }

    function selectFallback(result: GeocodeClientResult) {
        const city = fallbackToCity(result);
        setQuery(city.nameHe);
        setOpen(false);
        setFallbackResults([]);
        onChange(city.nameHe, city);
    }

    function handleInputChange(next: string) {
        setQuery(next);
        setOpen(true);
        // Find best match if exact, else pass null city
        const found = searchIsraelCities(next, 1)[0] ?? null;
        const isMatch =
            found &&
            (found.nameHe === next.trim() ||
                found.nameAr === next.trim() ||
                (found.aliases && found.aliases.includes(next.trim())));
        onChange(next, isMatch ? found : null);

        // No local match → ask the map for settlements not in the static list.
        const localMatches = searchIsraelCities(next, 1);
        if (localMatches.length === 0) {
            runFallbackSearch(next);
        } else {
            if (fallbackDebounceRef.current) clearTimeout(fallbackDebounceRef.current);
            setFallbackResults([]);
            setFallbackLoading(false);
        }
    }

    function handleClear() {
        setQuery("");
        setMatches(ISRAEL_CITIES.slice(0, 12));
        setFallbackResults([]);
        setFallbackLoading(false);
        if (fallbackDebounceRef.current) clearTimeout(fallbackDebounceRef.current);
        onChange("", null);
    }

    const showFallback =
        matches.length === 0 &&
        query.trim().length >= FALLBACK_MIN_CHARS &&
        (fallbackLoading || fallbackResults.length > 0);

    return (
        <div ref={containerRef} className={cn("relative w-full", className)}>
            <div className="relative">
                <Input
                    id={id}
                    type="text"
                    value={query}
                    onChange={(e) => handleInputChange(e.target.value)}
                    onFocus={() => setOpen(true)}
                    placeholder={placeholder}
                    disabled={disabled}
                    className="h-11 rounded-xl pe-16 ps-9 text-start font-medium"
                    autoComplete="off"
                />

                <MapPin className="pointer-events-none absolute start-3 top-3.5 size-4 text-primary/70" />

                <div className="absolute end-2 top-2 flex items-center gap-1">
                    {query ? (
                        <button
                            type="button"
                            onClick={handleClear}
                            className="flex size-7 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground"
                            aria-label="clear"
                        >
                            <X className="size-3.5" />
                        </button>
                    ) : null}

                    <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="size-7 rounded-lg text-muted-foreground"
                        onClick={() => setOpen((prev) => !prev)}
                        tabIndex={-1}
                    >
                        <ChevronDown
                            className={cn(
                                "size-4 transition-transform duration-200",
                                open && "rotate-180"
                            )}
                        />
                    </Button>
                </div>
            </div>

            {open && (
                <div
                    className="absolute z-[1050] mt-1 max-h-64 w-full overflow-y-auto rounded-xl border border-border/70 bg-popover/95 p-1.5 shadow-xl backdrop-blur-md"
                    dir={isAr ? "rtl" : "rtl"}
                >
                    {matches.length === 0 && !showFallback ? (
                        <div className="px-3 py-2.5 text-center text-xs text-muted-foreground">
                            {isAr
                                ? "لم يتم العثور على مدينة أو قرية مطابقة — جرّب البحث في الخريطة"
                                : "לא נמצא יישוב ברשימה — מחפש במפה..."}
                        </div>
                    ) : (
                        <>
                            {matches.map((city) => {
                                const primaryName = isAr ? city.nameAr : city.nameHe;
                                const secondaryName = isAr ? city.nameHe : city.nameAr;
                                const isSelected =
                                    query.trim() === primaryName ||
                                    query.trim() === secondaryName;

                                return (
                                    <button
                                        key={`${city.lat}-${city.lng}-${city.nameHe}`}
                                        type="button"
                                        onClick={() => handleSelect(city)}
                                        className={cn(
                                            "flex w-full items-center justify-between gap-2 rounded-lg px-3 py-2 text-start text-sm transition-colors",
                                            isSelected
                                                ? "bg-primary/10 font-semibold text-primary"
                                                : "hover:bg-accent/60"
                                        )}
                                    >
                                        <div className="flex items-center gap-2">
                                            <MapPin className="size-3.5 text-muted-foreground" />
                                            <span>{primaryName}</span>
                                            {secondaryName && secondaryName !== primaryName && (
                                                <span className="text-xs text-muted-foreground">
                                                    ({secondaryName})
                                                </span>
                                            )}
                                        </div>
                                        {isSelected && <Check className="size-4 text-primary" />}
                                    </button>
                                );
                            })}

                            {showFallback && (
                                <>
                                    <div className="my-1 flex items-center gap-2 px-3">
                                        <span className="h-px flex-1 bg-border/70" />
                                        <span className="text-[11px] font-medium text-muted-foreground">
                                            {isAr
                                                ? "نتائج إضافية من الخريطة"
                                                : "תוצאות נוספות מהמפה"}
                                        </span>
                                        <span className="h-px flex-1 bg-border/70" />
                                    </div>

                                    {fallbackLoading ? (
                                        <div className="flex items-center justify-center gap-2 px-3 py-2.5 text-xs text-muted-foreground">
                                            <Loader2 className="size-3.5 animate-spin" />
                                            {isAr ? "جارٍ البحث..." : "מחפש במפה..."}
                                        </div>
                                    ) : (
                                        fallbackResults.map((result, i) => {
                                            const name =
                                                result.display_name?.split(",")[0]?.trim() ||
                                                "—";
                                            return (
                                                <button
                                                    key={`${result.lat}-${result.lng}-${i}`}
                                                    type="button"
                                                    onClick={() => selectFallback(result)}
                                                    className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-start text-sm transition-colors hover:bg-accent/60"
                                                >
                                                    <Search className="size-3.5 text-muted-foreground" />
                                                    <span className="truncate">{name}</span>
                                                </button>
                                            );
                                        })
                                    )}
                                </>
                            )}
                        </>
                    )}
                </div>
            )}
        </div>
    );
}
