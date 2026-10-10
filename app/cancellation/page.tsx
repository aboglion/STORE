import type { Metadata } from "next";

import { CancellationView } from "@/components/legal/cancellation-view";
import { StoreChrome } from "@/components/store/store-chrome";
import { getSettings } from "@/lib/data/storefront";

export const metadata: Metadata = {
    title: "ביטול עסקה ומדיניות החזרות | חוק הגנת הצרכן",
    description: "טופס מקוון למסירת הודעת ביטול עסקה ומדיניות ביטולים והחזרות בהתאם לחוק הגנת הצרכן, התשמ״א-1981.",
};

export default async function CancellationPage() {
    const settings = await getSettings();

    return (
        <StoreChrome>
            <div id="main-content">
                <CancellationView settings={settings} />
            </div>
        </StoreChrome>
    );
}
