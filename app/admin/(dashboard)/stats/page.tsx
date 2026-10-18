import type { Metadata } from "next";
import { getLocale, getTranslations } from "next-intl/server";

import {
    MonthlyBarChart,
    RevenueAreaChart,
    StatusPieChart,
    TopCategoriesChart,
} from "@/components/admin/sales-charts";
import { ProductPerformanceView } from "@/components/admin/product-performance";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { requireAdmin } from "@/lib/auth";
import { getStats } from "@/lib/data/stats";
import { ORDER_STATUS_LABELS } from "@/lib/constants";
import type { Locale } from "@/lib/i18n/config";
import { formatILS } from "@/lib/utils/currency";

export async function generateMetadata(): Promise<Metadata> {
    const t = await getTranslations("admin.stats");
    return {
        title: t("title"),
    };
}

export default async function AdminStatsPage() {
    await requireAdmin();

    const locale = (await getLocale()) as Locale;
    const t = await getTranslations("admin.stats");
    const tRoot = await getTranslations();

    const stats = await getStats();
    const averageOrder =
        stats.totalOrders > 0
            ? Math.round(stats.totalRevenueAgorot / stats.totalOrders)
            : 0;

    const activeProducts = stats.productPerformance.filter((p) => p.is_active);
    const unsoldCount = activeProducts.filter((p) => p.units_sold === 0).length;
    const lowStockCount = activeProducts.filter(
        (p) => p.stock_quantity > 0 && p.stock_quantity <= p.low_stock_threshold
    ).length;
    const outOfStockCount = activeProducts.filter(
        (p) => p.stock_quantity === 0
    ).length;

    return (
        <div className="grid gap-6">
            <div>
                <h1 className="text-2xl font-bold">{t("title")}</h1>
                <p className="mt-1 text-sm text-muted-foreground">
                    {t("desc")}
                </p>
            </div>

            {/* KPI cards */}
            <div className="grid gap-4 sm:grid-cols-3">
                <Card>
                    <CardHeader>
                        <CardTitle className="text-sm text-muted-foreground">
                            {t("revenue30")}
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="pt-0 text-2xl font-bold">
                        {formatILS(stats.totalRevenueAgorot, locale)}
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader>
                        <CardTitle className="text-sm text-muted-foreground">
                            {t("orders30")}
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="pt-0 text-2xl font-bold">
                        {stats.totalOrders}
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader>
                        <CardTitle className="text-sm text-muted-foreground">
                            {t("avgOrder")}
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="pt-0 text-2xl font-bold">
                        {formatILS(averageOrder, locale)}
                    </CardContent>
                </Card>
            </div>

            {/* Revenue charts */}
            <div className="grid gap-6 lg:grid-cols-2">
                <Card>
                    <CardHeader>
                        <CardTitle className="text-base">{t("dailyRevenue")}</CardTitle>
                    </CardHeader>
                    <CardContent className="pt-0">
                        <RevenueAreaChart data={stats.daily} />
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle className="text-base">{t("monthlyRevenue")}</CardTitle>
                    </CardHeader>
                    <CardContent className="pt-0">
                        <MonthlyBarChart data={stats.monthly} />
                    </CardContent>
                </Card>
            </div>

            {/* Top categories + top products */}
            <div className="grid gap-6 lg:grid-cols-2">
                <Card>
                    <CardHeader>
                        <CardTitle className="text-base">{t("topCategories")}</CardTitle>
                    </CardHeader>
                    <CardContent className="pt-0">
                        {stats.topCategories.length === 0 ? (
                            <div className="py-10 text-center text-sm text-muted-foreground">
                                {t("noData")}
                            </div>
                        ) : (
                            <>
                                <TopCategoriesChart data={stats.topCategories} />
                                <div className="mt-4 space-y-1.5">
                                    {stats.topCategories.map((c, i) => (
                                        <div
                                            key={c.category_id ?? c.category_name}
                                            className="flex items-center justify-between gap-2 text-sm"
                                        >
                                            <span className="flex min-w-0 items-center gap-2">
                                                <span className="w-5 shrink-0 text-xs font-bold text-muted-foreground">
                                                    {i + 1}
                                                </span>
                                                <span className="truncate font-medium">
                                                    {c.category_name}
                                                </span>
                                            </span>
                                            <span className="shrink-0 text-muted-foreground">
                                                {c.units_sold} {t("units")} ·{" "}
                                                {formatILS(c.revenue_agorot, locale)}
                                            </span>
                                        </div>
                                    ))}
                                </div>
                            </>
                        )}
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle className="text-base">{t("topProducts")}</CardTitle>
                    </CardHeader>
                    <CardContent className="pt-0">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead className="w-10">{t("perf.rank")}</TableHead>
                                    <TableHead>{t("product")}</TableHead>
                                    <TableHead>{t("units")}</TableHead>
                                    <TableHead>{t("revenue")}</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {stats.topProducts.length === 0 && (
                                    <TableRow>
                                        <TableCell colSpan={4} className="py-6 text-center text-muted-foreground">
                                            {t("noData")}
                                        </TableCell>
                                    </TableRow>
                                )}
                                {stats.topProducts.map((p, i) => (
                                    <TableRow key={p.product_id ?? p.product_name}>
                                        <TableCell className="text-muted-foreground">
                                            {i + 1}
                                        </TableCell>
                                        <TableCell className="max-w-[200px] truncate font-medium">
                                            {p.product_name}
                                        </TableCell>
                                        <TableCell>{p.units_sold}</TableCell>
                                        <TableCell>{formatILS(p.revenue_agorot, locale)}</TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </CardContent>
                </Card>
            </div>

            {/* Product performance — best sellers / unsold / stock problems */}
            <Card>
                <CardHeader>
                    <CardTitle className="text-base">{t("perf.title")}</CardTitle>
                </CardHeader>
                <CardContent className="pt-0">
                    <ProductPerformanceView products={stats.productPerformance} />
                </CardContent>
            </Card>

            {/* Orders by status */}
            <div className="grid gap-6 lg:grid-cols-2">
                <Card>
                    <CardHeader>
                        <CardTitle className="text-base">{t("ordersByStatus")}</CardTitle>
                    </CardHeader>
                    <CardContent className="pt-0">
                        <StatusPieChart data={stats.ordersByStatus} />
                        <div className="mt-2 grid grid-cols-2 gap-1 text-sm">
                            {stats.ordersByStatus.map((s) => (
                                <div key={s.status} className="flex justify-between">
                                    <span className="text-muted-foreground">
                                        {tRoot(ORDER_STATUS_LABELS[s.status]) ?? s.status}
                                    </span>
                                    <span className="font-medium">{s.orders_count}</span>
                                </div>
                            ))}
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle className="text-base">{t("perf.insights")}</CardTitle>
                    </CardHeader>
                    <CardContent className="pt-0">
                        <div className="grid gap-3 sm:grid-cols-2">
                            <InsightStat
                                label={t("perf.unsoldCount")}
                                value={unsoldCount}
                                tone="amber"
                            />
                            <InsightStat
                                label={t("perf.lowStockCount")}
                                value={lowStockCount}
                                tone="orange"
                            />
                            <InsightStat
                                label={t("perf.outOfStockCount")}
                                value={outOfStockCount}
                                tone="rose"
                            />
                            <InsightStat
                                label={t("perf.activeProducts")}
                                value={activeProducts.length}
                                tone="emerald"
                            />
                        </div>
                        <p className="mt-4 text-sm text-muted-foreground">
                            {t("perf.insightsDesc")}
                        </p>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}

function InsightStat({
    label,
    value,
    tone,
}: {
    label: string;
    value: number;
    tone: "amber" | "orange" | "rose" | "emerald";
}) {
    const tones: Record<string, string> = {
        amber: "bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/30",
        orange: "bg-orange-500/10 text-orange-700 dark:text-orange-300 border-orange-500/30",
        rose: "bg-rose-500/10 text-rose-700 dark:text-rose-300 border-rose-500/30",
        emerald: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/30",
    };
    return (
        <div className="rounded-xl border border-border/60 bg-muted/30 p-3">
            <div className="text-xs text-muted-foreground">{label}</div>
            <div className={`mt-1 inline-flex rounded-full border px-2 py-0.5 text-lg font-bold ${tones[tone]}`}>
                {value}
            </div>
        </div>
    );
}
