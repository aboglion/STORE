import type { Metadata } from "next";

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
import { formatILS } from "@/lib/utils/currency";

export const metadata: Metadata = {
    title: "סטטיסטיקות",
};

export default async function AdminStatsPage() {
    await requireAdmin();

    const stats = await getStats();
    const averageOrder =
        stats.totalOrders > 0
            ? Math.round(stats.totalRevenueAgorot / stats.totalOrders)
            : 0;

    return (
        <div className="grid gap-6">
            <div>
                <h1 className="text-2xl font-bold">סטטיסטיקות</h1>
                <p className="mt-1 text-sm text-muted-foreground">
                    סיכום מכירות, מוצרים והזמנות
                </p>
            </div>

            <div className="grid gap-4 sm:grid-cols-3">
                <Card>
                    <CardHeader>
                        <CardTitle className="text-sm text-muted-foreground">
                            סה"כ הכנסות (30 יום)
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="pt-0 text-2xl font-bold">
                        {formatILS(stats.totalRevenueAgorot)}
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader>
                        <CardTitle className="text-sm text-muted-foreground">
                            הזמנות (30 יום)
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="pt-0 text-2xl font-bold">
                        {stats.totalOrders}
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader>
                        <CardTitle className="text-sm text-muted-foreground">
                            ממוצע הזמנה
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="pt-0 text-2xl font-bold">
                        {formatILS(averageOrder)}
                    </CardContent>
                </Card>
            </div>

            <div className="grid gap-6 lg:grid-cols-2">
                <Card>
                    <CardHeader>
                        <CardTitle className="text-base">הכנסות יומיות</CardTitle>
                    </CardHeader>
                    <CardContent className="pt-0">
                        <RevenueAreaChart data={stats.daily} />
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle className="text-base">הכנסות חודשיות</CardTitle>
                    </CardHeader>
                    <CardContent className="pt-0">
                        <MonthlyBarChart data={stats.monthly} />
                    </CardContent>
                </Card>
            </div>

            <div className="grid gap-6 lg:grid-cols-2">
                <Card>
                    <CardHeader>
                        <CardTitle className="text-base">הזמנות לפי סטטוס</CardTitle>
                    </CardHeader>
                    <CardContent className="pt-0">
                        <StatusPieChart data={stats.ordersByStatus} />
                        <div className="mt-2 grid grid-cols-2 gap-1 text-sm">
                            {stats.ordersByStatus.map((s) => (
                                <div key={s.status} className="flex justify-between">
                                    <span className="text-muted-foreground">
                                        {ORDER_STATUS_LABELS[s.status] ?? s.status}
                                    </span>
                                    <span className="font-medium">{s.orders_count}</span>
                                </div>
                            ))}
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle className="text-base">המוצרים הנמכרים ביותר</CardTitle>
                    </CardHeader>
                    <CardContent className="pt-0">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>מוצר</TableHead>
                                    <TableHead>יחידות</TableHead>
                                    <TableHead>הכנסה</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {stats.topProducts.length === 0 && (
                                    <TableRow>
                                        <TableCell colSpan={3} className="py-6 text-center text-muted-foreground">
                                            אין נתונים עדיין
                                        </TableCell>
                                    </TableRow>
                                )}
                                {stats.topProducts.map((p) => (
                                    <TableRow key={p.product_id ?? p.product_name}>
                                        <TableCell className="font-medium">
                                            {p.product_name}
                                        </TableCell>
                                        <TableCell>{p.units_sold}</TableCell>
                                        <TableCell>{formatILS(p.revenue_agorot)}</TableCell>
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