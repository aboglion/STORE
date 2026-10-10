import type { Metadata } from "next";
import Link from "next/link";
import { getLocale, getTranslations } from "next-intl/server";

import { AlertTriangle, Boxes } from "lucide-react";

import { InventoryAdjustDialog } from "@/components/admin/inventory-adjust-dialog";
import { Badge } from "@/components/ui/badge";
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
import {
    getAllProducts,
    getInventoryLogs,
    getLowStockProducts,
} from "@/lib/data/products";
import { localizedText, type Locale } from "@/lib/i18n/config";
import { formatDateTime } from "@/lib/utils/dates";

export async function generateMetadata(): Promise<Metadata> {
    const t = await getTranslations("admin.inventory");
    return {
        title: t("title"),
    };
}

export default async function AdminInventoryPage() {
    await requireAdmin();

    const locale = (await getLocale()) as Locale;
    const t = await getTranslations("admin.inventory");

    const [products, lowStock, logs] = await Promise.all([
        getAllProducts(),
        getLowStockProducts(),
        getInventoryLogs(),
    ]);

    const lowStockIds = new Set(lowStock.map((p) => p.id));

    return (
        <div className="grid gap-6">
            <div>
                <h1 className="text-2xl font-bold">{t("title")}</h1>
                <p className="mt-1 text-sm text-muted-foreground">
                    {t("desc")}
                </p>
            </div>

            {lowStock.length > 0 && (
                <Card className="border-destructive/40">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2 text-base">
                            <AlertTriangle className="size-5 text-destructive" />
                            {t("lowStockAlerts", { count: lowStock.length })}
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="flex flex-wrap gap-2">
                        {lowStock.map((p) => (
                            <Link key={p.id} href={`/admin/products/${p.id}`}>
                                <Badge variant="destructive">
                                    {t("inStockCount", {
                                        name: localizedText(locale, p.name_he, p.name_ar),
                                        count: p.stock_quantity,
                                    })}
                                </Badge>
                            </Link>
                        ))}
                    </CardContent>
                </Card>
            )}

            <div className="overflow-hidden rounded-2xl border border-border/70 bg-card shadow-soft">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>{t("product")}</TableHead>
                            <TableHead>{t("inStock")}</TableHead>
                            <TableHead>{t("lowStockThreshold")}</TableHead>
                            <TableHead>{t("status")}</TableHead>
                            <TableHead className="w-32"></TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {products.map((p) => {
                            const isLow = lowStockIds.has(p.id);
                            return (
                                <TableRow key={p.id}>
                                    <TableCell>
                                        <Link
                                            href={`/admin/products/${p.id}`}
                                            className="font-medium hover:underline"
                                        >
                                            {localizedText(locale, p.name_he, p.name_ar)}
                                        </Link>
                                    </TableCell>
                                    <TableCell>
                                        <Badge variant={isLow ? "destructive" : "secondary"}>
                                            {p.stock_quantity}
                                        </Badge>
                                    </TableCell>
                                    <TableCell>{p.low_stock_threshold}</TableCell>
                                    <TableCell>
                                        {isLow ? (
                                            <span className="text-sm text-destructive">{t("lowStock")}</span>
                                        ) : (
                                            <span className="text-sm text-muted-foreground">{t("ok")}</span>
                                        )}
                                    </TableCell>
                                    <TableCell>
                                        <InventoryAdjustDialog
                                            productId={p.id}
                                            productName={localizedText(locale, p.name_he, p.name_ar)}
                                            currentStock={p.stock_quantity}
                                        />
                                    </TableCell>
                                </TableRow>
                            );
                        })}
                    </TableBody>
                </Table>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-base">
                        <Boxes className="size-5 text-primary" />
                        {t("logTitle")}
                    </CardTitle>
                </CardHeader>
                <CardContent className="pt-0">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>{t("date")}</TableHead>
                                <TableHead>{t("product")}</TableHead>
                                <TableHead>{t("change")}</TableHead>
                                <TableHead>{t("reason")}</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {logs.length === 0 && (
                                <TableRow>
                                    <TableCell colSpan={4} className="py-6 text-center text-muted-foreground">
                                        {t("emptyLog")}
                                    </TableCell>
                                </TableRow>
                            )}
                            {logs.map((log) => {
                                const product = products.find((p) => p.id === log.product_id);
                                return (
                                    <TableRow key={log.id}>
                                        <TableCell className="text-muted-foreground">
                                            {formatDateTime(log.created_at, locale)}
                                        </TableCell>
                                        <TableCell>
                                            {product
                                                ? localizedText(locale, product.name_he, product.name_ar)
                                                : log.product_id}
                                        </TableCell>
                                        <TableCell>
                                            <span
                                                className={
                                                    log.change_quantity > 0
                                                        ? "text-green-600"
                                                        : "text-destructive"
                                                }
                                            >
                                                {log.change_quantity > 0 ? "+" : ""}
                                                {log.change_quantity}
                                            </span>
                                        </TableCell>
                                        <TableCell className="text-muted-foreground">
                                            {log.reason}
                                        </TableCell>
                                    </TableRow>
                                );
                            })}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>
        </div>
    );
}
