import type { Metadata } from "next";

import { ContactView } from "@/components/legal/contact-view";
import { StoreChrome } from "@/components/store/store-chrome";
import { getSettings } from "@/lib/data/storefront";

export const metadata: Metadata = {
    title: "יצירת קשר ושירות לקוחות | פרטי העסק",
    description: "פרטי העסק הרשמיים, שעות פעילות שירות הלקוחות, טופס פנייה ישיר ודרכי התקשרות.",
};

export default async function ContactPage() {
    const settings = await getSettings();

    return (
        <StoreChrome>
            <div id="main-content">
                <ContactView settings={settings} />
            </div>
        </StoreChrome>
    );
}
