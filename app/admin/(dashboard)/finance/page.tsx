import type { Metadata } from "next";
import { getLocale, getTranslations } from "next-intl/server";

import { AlertTriangle, Coins, PackageOpen, Receipt, TrendingUp } from "lucide-react";

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
import { getProfitLoss } from "@/lib/data/finance";
import type { Locale } from "@/lib/i18n/config";
import { formatILS } from "@/lib/utils/currency";

export async function generateMetadata(): Promise<Metadata> {
    const t = await getTranslations("admin.finance");
    return {
        title: t("title"),
    };
}

export default async function AdminFinancePage() {
    await requireAdmin();

    const locale = (await getLocale()) as Locale;
    const t = await getTranslations("admin.finance");

    const data = await getProfitLoss();
    const { totals } = data;

    const marginPercent =
        totals.revenue_agorot > 0
            ? Math.round((totals.gross_profit_agorot / totals.revenue_agorot) * 1000) / 10
            : 0;

    return (
        <div className="grid gap-6">
            <div>
                <h1 className="text-2xl font-bold">{t("title")}</h1>
                <p className="mt-1 text-sm text-muted-foreground">
                    {t("desc")}
                </p>
            </div>

            {data.hasMissingCosts && (
                <div className="flex items-start gap-3 rounded-2xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-700">
                    <AlertTriangle className="mt-0.5 size-4 shrink-0" />
                    <span>{t("missingCostsHint")}</span>
                </div>
            )}

            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2 text-sm text-muted-foreground">
                            <Receipt className="size-4 text-primary" />
                            {t("revenue")}
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="pt-0 text-2xl font-bold">
                        {formatILS(totals.revenue_agorot, locale)}
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2 text-sm text-muted-foreground">
                            <PackageOpen className="size-4 text-destructive" />
                            {t("cogs")}
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="pt-0 text-2xl font-bold text-destructive">
                        -{formatILS(totals.cogs_agorot, locale)}
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2 text-sm text-muted-foreground">
                            <TrendingUp className="size-4 text-emerald-600" />
                            {t("grossProfit")}
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="pt-0 text-2xl font-bold text-emerald-600">
                        {formatILS(totals.gross_profit_agorot, locale)}
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2 text-sm text-muted-foreground">
                            <Coins className="size-4 text-primary" />
                            {t("margin")}
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="pt-0 text-2xl font-bold">
                        {marginPercent}%
                    </CardContent>
                </Card>
            </div>

            <div className="grid gap-6 lg:grid-cols-2">
                <Card>
                    <CardHeader>
                        <CardTitle className="text-base">{t("breakdown")}</CardTitle>
                    </CardHeader>
                    <CardContent className="pt-0">
                        <div className="grid gap-2 text-sm">
                            <div className="flex justify-between">
                                <span className="text-muted-foreground">
                                    {t("ordersCount")}
                                </span>
                                <span className="font-medium">{totals.orders_count}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-muted-foreground">
                                    {t("revenue")}
                                </span>
                                <span className="font-medium">
                                    {formatILS(totals.revenue_agorot, locale)}
                                </span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-muted-foreground">
                                    {t("deliveryFees")}
                                </span>
                                <span className="font-medium">
                                    {formatILS(totals.delivery_fees_agorot, locale)}
                                </span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-muted-foreground">
                                    {t("discounts")}
                                </span>
                                <span className="font-medium text-destructive">
                                    -{formatILS(totals.discounts_agorot, locale)}
                                </span>
                            </div>
                            <div className="flex justify-between border-t border-border/60 pt-2">
                                <span className="text-muted-foreground">
                                    {t("cogs")}
                                </span>
                                <span className="font-medium text-destructive">
                                    -{formatILS(totals.cogs_agorot, locale)}
                                </span>
                            </div>
                            <div className="flex justify-between border-t border-border/60 pt-2 text-base font-bold">
                                <span>{t("grossProfit")}</span>
                                <span className="text-emerald-600">
                                    {formatILS(totals.gross_profit_agorot, locale)}
                                </span>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle className="text-base">{t("monthly")}</CardTitle>
                    </CardHeader>
                    <CardContent className="pt-0">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>{t("month")}</TableHead>
                                    <TableHead>{t("orders")}</TableHead>
                                    <TableHead>{t("revenue")}</TableHead>
                                    <TableHead>{t("cogs")}</TableHead>
                                    <TableHead>{t("profit")}</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {data.monthly.length === 0 && (
                                    <TableRow>
                                        <TableCell
                                            colSpan={5}
                                            className="py-6 text-center text-muted-foreground"
                                        >
                                            {t("noData")}
                                        </TableCell>
                                    </TableRow>
                                )}
                                {data.monthly.map((row) => (
                                    <TableRow key={row.month}>
                                        <TableCell className="font-medium">
                                            {new Date(
                                                `${row.month}T00:00:00`
                                            ).toLocaleDateString(locale === "ar" ? "ar-EG" : "he-IL", {
                                                month: "long",
                                                year: "numeric",
                                            })}
                                        </TableCell>
                                        <TableCell>{row.orders_count}</TableCell>
                                        <TableCell>
                                            {formatILS(row.revenue_agorot, locale)}
                                        </TableCell>
                                        <TableCell className="text-destructive">
                                            -{formatILS(row.cogs_agorot, locale)}
                                        </TableCell>
                                        <TableCell
                                            className={
                                                row.gross_profit_agorot >= 0
                                                    ? "font-medium text-emerald-600"
                                                    : "font-medium text-destructive"
                                            }
                                        >
                                            {formatILS(row.gross_profit_agorot, locale)}
                                        </TableCell>
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