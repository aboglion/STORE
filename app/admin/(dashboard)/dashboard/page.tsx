import type { Metadata } from "next";
import Link from "next/link";
import { getLocale, getTranslations } from "next-intl/server";
import {
    ArrowRight,
    BarChart3,
    Bike,
    Boxes,
    Clock,
    DollarSign,
    ExternalLink,
    Package,
    Plus,
    Receipt,
    Settings,
    ShoppingCart,
    Tags,
    TrendingUp,
    Users,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { requireAdmin } from "@/lib/auth";
import { getDashboardMetrics, type DashboardMetrics } from "@/lib/data/stats";
import type { Locale } from "@/lib/i18n/config";
import { cn } from "@/lib/utils";
import { formatILS } from "@/lib/utils/currency";

export async function generateMetadata(): Promise<Metadata> {
    const t = await getTranslations("admin.dashboard");
    return {
        title: t("title"),
    };
}

interface ModuleCardDef {
    href: string;
    key:
        | "orders"
        | "products"
        | "categories"
        | "inventory"
        | "receipts"
        | "finance"
        | "couriers"
        | "customers"
        | "stats"
        | "settings";
    icon: React.ComponentType<{ className?: string }>;
    iconBg: string;
    gradientBg: string;
    accentHover: string;
    badge?: (
        metrics: DashboardMetrics,
        t: (key: string, values?: Record<string, string | number>) => string
    ) => { text: string; className: string } | null;
}

const MODULE_CARDS: ModuleCardDef[] = [
    {
        href: "/admin/orders",
        key: "orders",
        icon: ShoppingCart,
        iconBg: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20",
        gradientBg: "from-amber-500/10 via-orange-500/5 to-transparent",
        accentHover: "hover:border-amber-500/40",
        badge: (metrics, t) =>
            metrics.pendingOrders > 0
                ? {
                      text: t("pendingBadge", { count: metrics.pendingOrders }),
                      className:
                          "bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/30",
                  }
                : {
                      text: t("totalBadge", { count: metrics.totalOrders }),
                      className:
                          "bg-muted/80 text-muted-foreground border-border/60",
                  },
    },
    {
        href: "/admin/products",
        key: "products",
        icon: Package,
        iconBg: "bg-violet-500/10 text-violet-600 dark:text-violet-400 border border-violet-500/20",
        gradientBg: "from-violet-500/10 via-indigo-500/5 to-transparent",
        accentHover: "hover:border-violet-500/40",
        badge: (metrics, t) => ({
            text: t("totalBadge", { count: metrics.totalProducts }),
            className: "bg-muted/80 text-muted-foreground border-border/60",
        }),
    },
    {
        href: "/admin/categories",
        key: "categories",
        icon: Tags,
        iconBg: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20",
        gradientBg: "from-emerald-500/10 via-teal-500/5 to-transparent",
        accentHover: "hover:border-emerald-500/40",
        badge: (metrics, t) => ({
            text: t("totalBadge", { count: metrics.totalCategories }),
            className: "bg-muted/80 text-muted-foreground border-border/60",
        }),
    },
    {
        href: "/admin/inventory",
        key: "inventory",
        icon: Boxes,
        iconBg: "bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20",
        gradientBg: "from-blue-500/10 via-sky-500/5 to-transparent",
        accentHover: "hover:border-blue-500/40",
        badge: (metrics, t) =>
            metrics.lowStockCount > 0
                ? {
                      text: t("lowStockBadge", {
                          count: metrics.lowStockCount,
                      }),
                      className:
                          "bg-rose-500/15 text-rose-700 dark:text-rose-300 border-rose-500/30",
                  }
                : null,
    },
    {
        href: "/admin/receipts",
        key: "receipts",
        icon: Receipt,
        iconBg: "bg-teal-500/10 text-teal-600 dark:text-teal-400 border border-teal-500/20",
        gradientBg: "from-teal-500/10 via-emerald-500/5 to-transparent",
        accentHover: "hover:border-teal-500/40",
    },
    {
        href: "/admin/couriers",
        key: "couriers",
        icon: Bike,
        iconBg: "bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20",
        gradientBg: "from-rose-500/10 via-pink-500/5 to-transparent",
        accentHover: "hover:border-rose-500/40",
        badge: (metrics, t) =>
            metrics.activeCouriers > 0
                ? {
                      text: t("activeBadge", { count: metrics.activeCouriers }),
                      className:
                          "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30",
                  }
                : null,
    },
    {
        href: "/admin/customers",
        key: "customers",
        icon: Users,
        iconBg: "bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/20",
        gradientBg: "from-purple-500/10 via-fuchsia-500/5 to-transparent",
        accentHover: "hover:border-purple-500/40",
        badge: (metrics, t) => ({
            text: t("totalBadge", { count: metrics.totalCustomers }),
            className: "bg-muted/80 text-muted-foreground border-border/60",
        }),
    },
    {
        href: "/admin/finance",
        key: "finance",
        icon: TrendingUp,
        iconBg: "bg-lime-500/10 text-lime-600 dark:text-lime-500 border border-lime-500/20",
        gradientBg: "from-lime-500/10 via-emerald-500/5 to-transparent",
        accentHover: "hover:border-lime-500/40",
    },
    {
        href: "/admin/stats",
        key: "stats",
        icon: BarChart3,
        iconBg: "bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20",
        gradientBg: "from-indigo-500/10 via-blue-500/5 to-transparent",
        accentHover: "hover:border-indigo-500/40",
    },
    {
        href: "/admin/settings",
        key: "settings",
        icon: Settings,
        iconBg: "bg-slate-500/10 text-slate-600 dark:text-slate-400 border border-slate-500/20",
        gradientBg: "from-slate-500/10 via-zinc-500/5 to-transparent",
        accentHover: "hover:border-slate-500/40",
    },
];

export default async function AdminDashboardPage() {
    const admin = await requireAdmin();
    const locale = (await getLocale()) as Locale;
    const t = await getTranslations("admin.dashboard");
    const tnav = await getTranslations("admin.nav");

    const metrics = await getDashboardMetrics();

    return (
        <div className="grid gap-6">
            {/* Header & Quick Action Shortcuts */}
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                    <h1 className="font-display text-2xl font-extrabold tracking-tight md:text-3xl">
                        {t("title")}
                    </h1>
                    <p className="mt-1 text-sm text-muted-foreground">
                        {t("welcomeSubtitle")}
                    </p>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                    <Button
                        asChild
                        variant="outline"
                        size="sm"
                        className="rounded-xl shadow-soft"
                    >
                        <Link href="/" target="_blank" rel="noopener noreferrer">
                            <ExternalLink className="size-4" />
                            {t("viewStore")}
                        </Link>
                    </Button>

                    <Button
                        asChild
                        variant="outline"
                        size="sm"
                        className="rounded-xl shadow-soft"
                    >
                        <Link href="/admin/products/new">
                            <Plus className="size-4" />
                            {t("newProduct")}
                        </Link>
                    </Button>

                    {metrics.pendingOrders > 0 && (
                        <Button
                            asChild
                            variant="default"
                            size="sm"
                            className="rounded-xl shadow-soft bg-amber-600 hover:bg-amber-700 text-white"
                        >
                            <Link href="/admin/orders?status=pending">
                                <Clock className="size-4" />
                                <span>{t("pendingOrders")}</span>
                                <span className="ms-1.5 rounded-full bg-white/25 px-1.5 py-0.5 text-xs font-bold leading-none">
                                    {metrics.pendingOrders}
                                </span>
                            </Link>
                        </Button>
                    )}
                </div>
            </div>

            {/* Top KPI Metric Highlights Ribbon */}
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                {/* 30-Day Revenue */}
                <Card className="rounded-2xl border border-border/70 bg-card p-4 shadow-soft transition-all duration-200 hover:shadow-lift">
                    <div className="flex items-center justify-between">
                        <span className="text-xs font-medium text-muted-foreground">
                            {t("kpiRevenue")}
                        </span>
                        <span className="flex size-8 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                            <DollarSign className="size-4" />
                        </span>
                    </div>
                    <div className="mt-2 font-display text-2xl font-extrabold tracking-tight">
                        {formatILS(metrics.totalRevenueAgorot, locale)}
                    </div>
                    <div className="mt-1 text-xs text-muted-foreground">
                        {t("totalBadge", { count: metrics.totalOrders })}
                    </div>
                </Card>

                {/* Orders */}
                <Card className="rounded-2xl border border-border/70 bg-card p-4 shadow-soft transition-all duration-200 hover:shadow-lift">
                    <div className="flex items-center justify-between">
                        <span className="text-xs font-medium text-muted-foreground">
                            {t("kpiOrders")}
                        </span>
                        <span className="flex size-8 items-center justify-center rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400">
                            <ShoppingCart className="size-4" />
                        </span>
                    </div>
                    <div className="mt-2 font-display text-2xl font-extrabold tracking-tight">
                        {metrics.totalOrders}
                    </div>
                    <div className="mt-1 text-xs text-muted-foreground">
                        {metrics.pendingOrders > 0 ? (
                            <span className="font-semibold text-amber-600 dark:text-amber-400">
                                {t("pendingBadge", { count: metrics.pendingOrders })}
                            </span>
                        ) : (
                            tnav("orders")
                        )}
                    </div>
                </Card>

                {/* Products */}
                <Card className="rounded-2xl border border-border/70 bg-card p-4 shadow-soft transition-all duration-200 hover:shadow-lift">
                    <div className="flex items-center justify-between">
                        <span className="text-xs font-medium text-muted-foreground">
                            {t("kpiProducts")}
                        </span>
                        <span className="flex size-8 items-center justify-center rounded-lg bg-violet-500/10 text-violet-600 dark:text-violet-400">
                            <Package className="size-4" />
                        </span>
                    </div>
                    <div className="mt-2 font-display text-2xl font-extrabold tracking-tight">
                        {metrics.totalProducts}
                    </div>
                    <div className="mt-1 text-xs text-muted-foreground">
                        {metrics.lowStockCount > 0 ? (
                            <span className="font-semibold text-rose-600 dark:text-rose-400">
                                {t("lowStockBadge", { count: metrics.lowStockCount })}
                            </span>
                        ) : (
                            t("totalBadge", { count: metrics.totalCategories })
                        )}
                    </div>
                </Card>

                {/* Couriers & Customers */}
                <Card className="rounded-2xl border border-border/70 bg-card p-4 shadow-soft transition-all duration-200 hover:shadow-lift">
                    <div className="flex items-center justify-between">
                        <span className="text-xs font-medium text-muted-foreground">
                            {t("kpiCouriers")}
                        </span>
                        <span className="flex size-8 items-center justify-center rounded-lg bg-rose-500/10 text-rose-600 dark:text-rose-400">
                            <Bike className="size-4" />
                        </span>
                    </div>
                    <div className="mt-2 font-display text-2xl font-extrabold tracking-tight">
                        {metrics.activeCouriers}
                    </div>
                    <div className="mt-1 text-xs text-muted-foreground">
                        {t("totalBadge", { count: metrics.totalCustomers })}{" "}
                        {tnav("customers")}
                    </div>
                </Card>
            </div>

            {/* All Menu Modules Navigation Cards Section */}
            <div>
                <div className="mb-4">
                    <h2 className="font-display text-lg font-bold tracking-tight">
                        {t("allModules")}
                    </h2>
                    <p className="text-xs text-muted-foreground">
                        {t("allModulesDesc")}
                    </p>
                </div>

                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                    {MODULE_CARDS.map((module) => {
                        const badge = module.badge?.(metrics, t);
                        return (
                            <Link
                                key={module.href}
                                href={module.href}
                                className="group block focus-visible:outline-none"
                            >
                                <Card
                                    className={cn(
                                        "relative flex h-full flex-col justify-between overflow-hidden rounded-2xl border border-border/70 bg-card p-5 shadow-soft transition-all duration-200 group-hover:-translate-y-1 group-hover:shadow-lift",
                                        module.accentHover
                                    )}
                                >
                                    {/* Subtle gradient hover wash */}
                                    <div
                                        className={cn(
                                            "pointer-events-none absolute inset-0 bg-gradient-to-br opacity-0 transition-opacity duration-300 group-hover:opacity-100",
                                            module.gradientBg
                                        )}
                                    />

                                    <div className="relative z-10 flex flex-col gap-3">
                                        <div className="flex items-center justify-between gap-2">
                                            <span
                                                className={cn(
                                                    "flex size-11 items-center justify-center rounded-xl transition-transform duration-200 group-hover:scale-105",
                                                    module.iconBg
                                                )}
                                            >
                                                <module.icon className="size-5" />
                                            </span>
                                            {badge && (
                                                <span
                                                    className={cn(
                                                        "rounded-full border px-2.5 py-0.5 text-xs font-medium tracking-tight",
                                                        badge.className
                                                    )}
                                                >
                                                    {badge.text}
                                                </span>
                                            )}
                                        </div>

                                        <div>
                                            <h3 className="font-display text-base font-bold tracking-tight text-foreground transition-colors group-hover:text-primary">
                                                {tnav(module.key)}
                                            </h3>
                                            <p className="mt-1 text-xs leading-relaxed text-muted-foreground line-clamp-2">
                                                {t(`${module.key}Desc`)}
                                            </p>
                                        </div>
                                    </div>

                                    <div className="relative z-10 mt-4 flex items-center justify-between border-t border-border/50 pt-3 text-xs font-semibold text-primary">
                                        <span>{t("enter")}</span>
                                        <ArrowRight className="size-4 transition-transform duration-200 group-hover:translate-x-1 rtl:rotate-180 rtl:group-hover:-translate-x-1" />
                                    </div>
                                </Card>
                            </Link>
                        );
                    })}
                </div>
            </div>
        </div>
    );
}
