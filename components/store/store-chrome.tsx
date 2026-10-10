import Link from "next/link";
import { getLocale, getTranslations } from "next-intl/server";

import { LocaleSwitcher } from "@/components/locale-switcher";
import { CartProvider } from "@/contexts/cart-context";
import { getSettings, getStoreName } from "@/lib/data/storefront";
import type { Locale } from "@/lib/i18n/config";

import { BottomNav } from "./bottom-nav";
import { CartButton } from "./cart-button";
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
                            <LocaleSwitcher />
                            <CartButton />
                        </nav>
                    </div>
                </header>

                <main className="mx-auto w-full max-w-5xl flex-1 px-4 pb-24 pt-5 sm:pt-8 md:pb-10">
                    {children}
                </main>

                <footer className="hidden border-t border-border/60 py-6 text-center text-xs text-muted-foreground md:block">
                    {storeName} © {new Date().getFullYear()} — {t("footer")}
                </footer>

                <BottomNav />
            </div>
        </CartProvider>
    );
}
