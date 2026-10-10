import { Suspense } from "react";
import type { Metadata, Viewport } from "next";
import {
    Cairo,
    Frank_Ruhl_Libre,
    Noto_Sans_Arabic,
    Noto_Sans_Hebrew,
} from "next/font/google";
import { NextIntlClientProvider } from "next-intl";
import { getLocale, getMessages } from "next-intl/server";

import { AccessibilityWidget } from "@/components/accessibility/accessibility-widget";
import { NavigationProgress } from "@/components/ui/navigation-progress";
import { Toaster } from "@/components/ui/sonner";
import { getPublicSettings } from "@/lib/data/storefront";
import { DEFAULT_STORE_THEME } from "@/lib/theme";

import "./globals.css";

const notoSansHebrew = Noto_Sans_Hebrew({
    subsets: ["hebrew"],
    variable: "--font-hebrew",
});

const frankRuhlLibre = Frank_Ruhl_Libre({
    subsets: ["hebrew"],
    weight: ["400", "500", "600", "700", "800", "900"],
    style: ["normal"],
    variable: "--font-display-hebrew",
});

const notoSansArabic = Noto_Sans_Arabic({
    subsets: ["arabic"],
    variable: "--font-arabic",
});

const cairo = Cairo({
    subsets: ["arabic"],
    weight: ["400", "500", "600", "700", "800", "900"],
    variable: "--font-display-arabic",
});

export async function generateMetadata(): Promise<Metadata> {
    const locale = await getLocale();
    const isAr = locale === "ar";

    let storeName = isAr ? "متجري" : "החנות שלי";
    try {
        const settings = await getPublicSettings();
        storeName = isAr
            ? settings.store_name_ar || settings.store_name || storeName
            : settings.store_name || storeName;
    } catch {
        // Keep the default name when settings are unavailable.
    }

    return {
        title: {
            default: storeName,
            template: `%s | ${storeName}`,
        },
        description: isAr
            ? "متجر إلكتروني — طلب سهل وتوصيل حتى البيت"
            : "חנות מקוונת — הזמנה קלה ומשלוח עד הבית",
        manifest: "/manifest.webmanifest",
        appleWebApp: {
            capable: true,
            statusBarStyle: "default",
            title: storeName,
        },
    };
}

export const viewport: Viewport = {
    width: "device-width",
    initialScale: 1,
    viewportFit: "cover",
    themeColor: "#95582b",
};

export default async function RootLayout({
    children,
}: Readonly<{
    children: React.ReactNode;
}>) {
    const locale = await getLocale();
    const messages = await getMessages();

    let theme = DEFAULT_STORE_THEME;
    try {
        const settings = await getPublicSettings();
        theme = settings.theme;
    } catch {
        theme = DEFAULT_STORE_THEME;
    }

    return (
        <html
            lang={locale}
            dir="rtl"
            data-theme={theme}
            className={`${notoSansHebrew.variable} ${frankRuhlLibre.variable} ${notoSansArabic.variable} ${cairo.variable}`}
        >
            <body className="min-h-screen font-sans antialiased">
                <NextIntlClientProvider locale={locale} messages={messages}>
                    <Suspense fallback={null}>
                        <NavigationProgress />
                    </Suspense>
                    <AccessibilityWidget />
                    {children}
                    <Toaster position="top-center" richColors />
                </NextIntlClientProvider>
            </body>
        </html>
    );
}
