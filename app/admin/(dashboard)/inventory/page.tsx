import type { Metadata } from "next";
import Link from "next/link";

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
import { formatDateTime } from "@/lib/utils/dates";

export const metadata: Metadata = {
    title: "מלאי",
};

export default async function AdminInventoryPage() {
    await requireAdmin();

    const [products, lowStock, logs] = await Promise.all([
        getAllProducts(),
        getLowStockProducts(),
        getInventoryLogs(),
    ]);

    const lowStockIds = new Set(lowStock.map((p) => p.id));

    return (
        <div className="grid gap-6">
            <div>
                <h1 className="text-2xl font-bold">מלאי</h1>
                <p className="mt-1 text-sm text-muted-foreground">
                    ניהול מלאי, התראות מלאי נמוך ויומן שינויים
                </p>
            </div>

            {lowStock.length > 0 && (
                <Card className="border-destructive/40">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2 text-base">
                            <AlertTriangle className="size-5 text-destructive" />
                            התראות מלאי נמוך ({lowStock.length})
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="flex flex-wrap gap-2">
                        {lowStock.map((p) => (
                            <Link key={p.id} href={`/admin/products/${p.id}`}>
                                <Badge variant="destructive">
                                    {p.name_he} — {p.stock_quantity} במלאי
                                </Badge>
                            </Link>
                        ))}
                    </CardContent>
                </Card>
            )}

            <div className="rounded-md border">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>מוצר</TableHead>
                            <TableHead>במלאי</TableHead>
                            <TableHead>סף מלאי נמוך</TableHead>
                            <TableHead>סטטוס</TableHead>
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
                                            {p.name_he}
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
                                            <span className="text-sm text-destructive">מלאי נמוך</span>
                                        ) : (
                                            <span className="text-sm text-muted-foreground">תקין</span>
                                        )}
                                    </TableCell>
                                    <TableCell>
                                        <InventoryAdjustDialog
                                            productId={p.id}
                                            productName={p.name_he}
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
                        יומן שינויי מלאי
                    </CardTitle>
                </CardHeader>
                <CardContent className="pt-0">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>תאריך</TableHead>
                                <TableHead>מוצר</TableHead>
                                <TableHead>שינוי</TableHead>
                                <TableHead>סיבה</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {logs.length === 0 && (
                                <TableRow>
                                    <TableCell colSpan={4} className="py-6 text-center text-muted-foreground">
                                        אין שינויי מלאי עדיין
                                    </TableCell>
                                </TableRow>
                            )}
                            {logs.map((log) => {
                                const product = products.find((p) => p.id === log.product_id);
                                return (
                                    <TableRow key={log.id}>
                                        <TableCell className="text-muted-foreground">
                                            {formatDateTime(log.created_at)}
                                        </TableCell>
                                        <TableCell>
                                            {product?.name_he ?? log.product_id}
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