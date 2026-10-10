"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTranslations } from "next-intl";

import { LogOut, Menu } from "lucide-react";

import { NAV_ITEMS } from "@/components/admin/admin-sidebar";
import { LocaleSwitcher } from "@/components/locale-switcher";
import { StoreLogo } from "@/components/store/store-logo";
import { Button } from "@/components/ui/button";
import {
    Sheet,
    SheetContent,
    SheetHeader,
    SheetTitle,
    SheetTrigger,
} from "@/components/ui/sheet";
import { logout } from "@/lib/actions/auth";
import { cn } from "@/lib/utils";

export function AdminMobileHeader({
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

    return (
        <header className="sticky top-0 z-40 flex h-14 items-center justify-between border-b border-border/60 bg-background/85 px-4 backdrop-blur-xl supports-[backdrop-filter]:bg-background/75 md:hidden">
            <Link
                href="/admin/dashboard"
                className="flex min-w-0 items-center gap-2 transition-transform active:scale-95"
            >
                <StoreLogo logoUrl={logoUrl} name={storeName} />
                <span className="truncate font-display text-sm font-extrabold tracking-tight">
                    {storeName}
                </span>
            </Link>

            <div className="flex items-center gap-1">
                <LocaleSwitcher />
                <Sheet>
                    <SheetTrigger asChild>
                        <Button
                            variant="outline"
                            size="icon"
                            className="rounded-xl"
                            aria-label={t("openMenu")}
                        >
                            <Menu className="size-5" />
                        </Button>
                    </SheetTrigger>
                    <SheetContent side="right" className="w-80 gap-0 p-0">
                        <SheetHeader className="border-b border-border/60 px-4 py-4">
                            <SheetTitle>{t("menuTitle")}</SheetTitle>
                        </SheetHeader>

                        <nav className="grid gap-1 p-3">
                            {NAV_ITEMS.map((item) => {
                                const active =
                                    pathname === item.href ||
                                    (item.href !== "/admin/dashboard" &&
                                        pathname.startsWith(`${item.href}/`));

                                return (
                                    <Link
                                        key={item.href}
                                        href={item.href}
                                        className={cn(
                                            "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-150 active:scale-[0.98]",
                                            active
                                                ? "bg-primary/10 text-primary font-semibold"
                                                : "text-muted-foreground hover:bg-accent hover:text-foreground"
                                        )}
                                    >
                                        <item.icon className="size-4.5 shrink-0" />
                                        {tnav(item.labelKey)}
                                        {active && (
                                            <span className="ms-auto size-1.5 shrink-0 rounded-full bg-primary" />
                                        )}
                                    </Link>
                                );
                            })}
                        </nav>

                        <div className="mt-auto border-t border-border/60 p-3">
                            <div className="mb-2 truncate px-2 text-xs text-muted-foreground">
                                {email}
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
                    </SheetContent>
                </Sheet>
            </div>
        </header>
    );
}
