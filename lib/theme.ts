import type { StoreThemeKey } from "@/types/database.types";

/**
 * Metadata for the storefront color themes.
 * The actual CSS palettes live in globals.css under `html[data-theme="..."]`.
 * `swatches` are approximate display colors used by the admin picker.
 */
export const STORE_THEMES: Record<
    StoreThemeKey,
    { label: string; description: string; swatches: [string, string] }
> = {
    caramel: {
        label: "קרמל",
        description: "חם ואומנותי — מאפייה",
        swatches: ["#F7F1E5", "#95582B"],
    },
    forest: {
        label: "יער",
        description: "ירוק רענן ובריא",
        swatches: ["#EFF6EC", "#4E7A45"],
    },
    ocean: {
        label: "אוקיינוס",
        description: "טורקיז קריר ונקי",
        swatches: ["#EBF5F6", "#1F7A8C"],
    },
    berry: {
        label: "פטל",
        description: "בוטיק ורוד ועז",
        swatches: ["#F8EEF3", "#A63D5C"],
    },
    midnight: {
        label: "חצות",
        description: "כהה וזהב — יוקרתי",
        swatches: ["#1B1825", "#D9A83C"],
    },
};

export const STORE_THEME_KEYS = Object.keys(STORE_THEMES) as StoreThemeKey[];

export const DEFAULT_STORE_THEME: StoreThemeKey = "caramel";
