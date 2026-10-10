"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTranslations } from "next-intl";

import {
    BarChart3,
    Boxes,
    LayoutDashboard,
    Loader2,
    LogOut,
    Package,
    Settings,
    ShoppingCart,
    Tags,
    Users,
} from "lucide-react";

import { LocaleSwitcher } from "@/components/locale-switcher";
import { StoreLogo } from "@/components/store/store-logo";
import { Button } from "@/components/ui/button";
import { logout } from "@/lib/actions/auth";
import { cn } from "@/lib/utils";

export const NAV_ITEMS = [
    { href: "/admin/dashboard", labelKey: "dashboard", icon: LayoutDashboard },
    { href: "/admin/products", labelKey: "products", icon: Package },
    { href: "/admin/categories", labelKey: "categories", icon: Tags },
    { href: "/admin/inventory", labelKey: "inventory", icon: Boxes },
    { href: "/admin/orders", labelKey: "orders", icon: ShoppingCart },
    { href: "/admin/customers", labelKey: "customers", icon: Users },
    { href: "/admin/stats", labelKey: "stats", icon: BarChart3 },
    { href: "/admin/settings", labelKey: "settings", icon: Settings },
] as const;

export function AdminSidebar({
    email,
    storeName,
    logoUrl,
}: {
    email: string;
    storeName: string;
    logoUrl: string;
}) {
    const pathname = usePathname();
    const t = useTranslations("admin");
    const tnav = useTranslations("admin.nav");
    const [pendingHref, setPendingHref] = useState<string | null>(null);

    // Reset pending state whenever navigation resolves
    useEffect(() => {
        setPendingHref(null);
    }, [pathname]);

    return (
        <aside className="sticky top-0 hidden h-screen w-64 flex-col border-e border-sidebar-border bg-sidebar px-3 py-5 md:flex select-none">
            <Link
                href="/admin/dashboard"
                onClick={() => {
                    if (pathname !== "/admin/dashboard") {
                        setPendingHref("/admin/dashboard");
                    }
                }}
                className="mb-7 flex items-center gap-2.5 px-2 transition-transform active:scale-95"
            >
                <StoreLogo logoUrl={logoUrl} name={storeName} />
                <div className="min-w-0">
                    <div className="truncate font-display text-base font-extrabold tracking-tight">
                        {storeName}
                    </div>
                    <div className="text-xs text-muted-foreground">{t("panelTitle")}</div>
                </div>
            </Link>

            <nav className="flex flex-1 flex-col gap-1">
                {NAV_ITEMS.map((item) => {
                    const active =
                        pathname === item.href ||
                        (item.href !== "/admin/dashboard" &&
                            pathname.startsWith(`${item.href}/`));
                    const isPending = pendingHref === item.href;

                    return (
                        <Link
                            key={item.href}
                            href={item.href}
                            onClick={() => {
                                if (pathname !== item.href) {
                                    setPendingHref(item.href);
                                }
                            }}
                            className={cn(
                                "group relative flex items-center gap-2.5 rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-150 active:scale-[0.98]",
                                active
                                    ? "bg-sidebar-accent text-sidebar-accent-foreground shadow-soft font-semibold"
                                    : "text-muted-foreground hover:bg-sidebar-accent/60 hover:text-foreground",
                                isPending && "opacity-80"
                            )}
                        >
                            {isPending ? (
                                <Loader2 className="size-4.5 shrink-0 animate-spin text-primary" />
                            ) : (
                                <item.icon className="size-4.5 shrink-0 transition-transform duration-200 group-hover:scale-110" />
                            )}
                            <span className="flex-1 truncate">{tnav(item.labelKey)}</span>
                            {active && (
                                <span className="size-1.5 shrink-0 rounded-full bg-primary" />
                            )}
                        </Link>
                    );
                })}
            </nav>

            <div className="border-t border-sidebar-border pt-3">
                <div className="mb-2 truncate px-2 text-xs text-muted-foreground">
                    {email}
                </div>
                <div className="mb-2 flex justify-center">
                    <LocaleSwitcher />
                </div>
                <form action={logout}>
                    <Button
                        variant="ghost"
                        className="w-full justify-start transition-colors hover:bg-destructive/10 hover:text-destructive"
                        type="submit"
                    >
                        <LogOut className="size-4.5" />
                        {t("logout")}
                    </Button>
                </form>
            </div>
        </aside>
    );
}
