import type { Metadata } from "next";
import { getLocale, getTranslations } from "next-intl/server";

import {
    MonthlyBarChart,
    RevenueAreaChart,
    StatusPieChart,
} from "@/components/admin/sales-charts";
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

    return (
        <div className="grid gap-6">
            <div>
                <h1 className="text-2xl font-bold">{t("title")}</h1>
                <p className="mt-1 text-sm text-muted-foreground">
                    {t("desc")}
                </p>
            </div>

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
                        <CardTitle className="text-base">{t("topProducts")}</CardTitle>
                    </CardHeader>
                    <CardContent className="pt-0">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>{t("product")}</TableHead>
                                    <TableHead>{t("units")}</TableHead>
                                    <TableHead>{t("revenue")}</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {stats.topProducts.length === 0 && (
                                    <TableRow>
                                        <TableCell colSpan={3} className="py-6 text-center text-muted-foreground">
                                            {t("noData")}
                                        </TableCell>
                                    </TableRow>
                                )}
                                {stats.topProducts.map((p) => (
                                    <TableRow key={p.product_id ?? p.product_name}>
                                        <TableCell className="font-medium">
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
        </div>
    );
}
