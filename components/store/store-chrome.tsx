import Link from "next/link";
import { getLocale, getTranslations } from "next-intl/server";

import { AccessibilityWidget } from "@/components/accessibility/accessibility-widget";
import { CookieConsentBanner } from "@/components/legal/cookie-consent-banner";
import { LocaleSwitcher } from "@/components/locale-switcher";
import { CartProvider } from "@/contexts/cart-context";
import { getSettings, getStoreName } from "@/lib/data/storefront";
import type { Locale } from "@/lib/i18n/config";

import { BottomNav } from "./bottom-nav";
import { CartButton } from "./cart-button";
import { StoreFooter } from "./store-footer";
import { StoreLogo } from "./store-logo";

export async function StoreChrome({
    children,
}: {
    children: React.ReactNode;
}) {
    const settings = await getSettings();
    const locale = (await getLocale()) as Locale;
    const t = await getTranslations("nav");
    const storeName = getStoreName(settings, locale);

    return (
        <CartProvider>
            <div className="flex min-h-screen flex-col bg-background">
                <AccessibilityWidget />
                <CookieConsentBanner />

                <header className="sticky top-0 z-40 border-b border-border/60 bg-background/80 backdrop-blur-xl supports-[backdrop-filter]:bg-background/70">
                    <div className="mx-auto flex h-14 w-full max-w-5xl items-center justify-between px-4 sm:h-16">
                        <Link
                            href="/"
                            className="flex items-center gap-2.5 transition-transform active:scale-95"
                        >
                            <StoreLogo
                                logoUrl={settings.logo_url}
                                name={storeName}
                            />
                            <span className="font-display text-lg font-extrabold tracking-tight sm:text-xl">
                                {storeName}
                            </span>
                        </Link>

                        <nav className="flex items-center gap-2">
                            <Link
                                href="/"
                                className="hidden rounded-full px-4 py-1.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground sm:inline-flex"
                            >
                                {t("catalog")}
                            </Link>
                            <Link
                                href="/orders"
                                className="hidden rounded-full px-4 py-1.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground sm:inline-flex"
                            >
                                {t("myOrders")}
                            </Link>
                            <Link
                                href="/cancellation"
                                className="hidden rounded-full px-3 py-1.5 text-xs font-semibold text-primary transition-colors hover:bg-primary/10 lg:inline-flex"
                            >
                                ביטול עסקה
                            </Link>
                            <LocaleSwitcher />
                            <CartButton />
                        </nav>
                    </div>
                </header>

                <main id="main-content" className="mx-auto w-full max-w-5xl flex-1 px-4 pb-12 pt-5 sm:pt-8 md:pb-10">
                    {children}
                </main>

                <StoreFooter settings={settings} storeName={storeName} />

                <BottomNav />
            </div>
        </CartProvider>
    );
}
