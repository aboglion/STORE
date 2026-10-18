"use client";

import { useMemo, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { AlertTriangle, PackageX, TrendingUp, Boxes } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import type { Locale } from "@/lib/i18n/config";
import { cn } from "@/lib/utils";
import { formatILS } from "@/lib/utils/currency";
import type { ProductPerformance } from "@/types/database.types";

type TabKey = "best" | "unsold" | "lowStock" | "outOfStock";

interface TabDef {
    key: TabKey;
    icon: React.ComponentType<{ className?: string }>;
    activeClass: string;
}

const TABS: TabDef[] = [
    {
        key: "best",
        icon: TrendingUp,
        activeClass:
            "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30",
    },
    {
        key: "unsold",
        icon: PackageX,
        activeClass:
            "bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/30",
    },
    {
        key: "lowStock",
        icon: AlertTriangle,
        activeClass:
            "bg-orange-500/15 text-orange-700 dark:text-orange-300 border-orange-500/30",
    },
    {
        key: "outOfStock",
        icon: Boxes,
        activeClass:
            "bg-rose-500/15 text-rose-700 dark:text-rose-300 border-rose-500/30",
    },
];

export function ProductPerformanceView({
    products,
}: {
    products: ProductPerformance[];
}) {
    const locale = useLocale() as Locale;
    const t = useTranslations("admin.stats");
    const [tab, setTab] = useState<TabKey>("best");

    const rows = useMemo(() => {
        const active = products.filter((p) => p.is_active);
        const best = [...active]
            .sort((a, b) => b.units_sold - a.units_sold)
            .slice(0, 10);
        const unsold = active
            .filter((p) => p.units_sold === 0)
            .sort((a, b) => a.product_name.localeCompare(b.product_name, "he"))
            .slice(0, 10);
        const lowStock = active
            .filter(
                (p) =>
                    p.stock_quantity > 0 &&
                    p.stock_quantity <= p.low_stock_threshold
            )
            .sort((a, b) => a.stock_quantity - b.stock_quantity)
            .slice(0, 10);
        const outOfStock = active
            .filter((p) => p.stock_quantity === 0)
            .sort((a, b) => b.units_sold - a.units_sold)
            .slice(0, 10);

        return { best, unsold, lowStock, outOfStock };
    }, [products]);

    const counts = {
        best: rows.best.length,
        unsold: rows.unsold.length,
        lowStock: rows.lowStock.length,
        outOfStock: rows.outOfStock.length,
    };

    const current = rows[tab];

    return (
        <div className="space-y-4">
            {/* Segmented tab control */}
            <div className="flex flex-wrap gap-2">
                {TABS.map(({ key, icon: Icon, activeClass }) => (
                    <button
                        key={key}
                        type="button"
                        onClick={() => setTab(key)}
                        className={cn(
                            "inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium transition-colors",
                            tab === key
                                ? activeClass
                                : "border-border/60 bg-muted/40 text-muted-foreground hover:bg-muted/70 hover:text-foreground"
                        )}
                    >
                        <Icon className="size-3.5" />
                        {t(`perf.${key}`)}
                        <span
                            className={cn(
                                "rounded-full px-1.5 py-0.5 text-[10px] font-bold leading-none",
                                tab === key
                                    ? "bg-black/10 dark:bg-white/15"
                                    : "bg-muted-foreground/10"
                            )}
                        >
                            {counts[key]}
                        </span>
                    </button>
                ))}
            </div>

            {current.length === 0 ? (
                <div className="py-10 text-center text-sm text-muted-foreground">
                    {t("noData")}
                </div>
            ) : (
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead className="w-10">{t("perf.rank")}</TableHead>
                            <TableHead>{t("product")}</TableHead>
                            <TableHead className="hidden md:table-cell">
                                {t("perf.category")}
                            </TableHead>
                            <TableHead>{t("units")}</TableHead>
                            <TableHead>{t("revenue")}</TableHead>
                            <TableHead>{t("perf.stock")}</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {current.map((p, index) => (
                            <TableRow key={p.product_id}>
                                <TableCell className="text-muted-foreground">
                                    {index + 1}
                                </TableCell>
                                <TableCell className="max-w-[220px] truncate font-medium">
                                    {p.product_name}
                                </TableCell>
                                <TableCell className="hidden text-muted-foreground md:table-cell">
                                    {p.category_name}
                                </TableCell>
                                <TableCell>{p.units_sold}</TableCell>
                                <TableCell>
                                    {formatILS(p.revenue_agorot, locale)}
                                </TableCell>
                                <TableCell>
                                    <StockBadge
                                        stock={p.stock_quantity}
                                        threshold={p.low_stock_threshold}
                                        sold={p.units_sold}
                                        t={t}
                                    />
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            )}
        </div>
    );
}

function StockBadge({
    stock,
    threshold,
    sold,
    t,
}: {
    stock: number;
    threshold: number;
    sold: number;
    t: (key: string, values?: Record<string, string | number>) => string;
}) {
    if (stock === 0) {
        return <Badge variant="destructive">{t("perf.outOfStockBadge")}</Badge>;
    }
    if (stock <= threshold) {
        return (
            <Badge
                variant="outline"
                className="border-orange-500/40 bg-orange-500/10 text-orange-700 dark:text-orange-300"
            >
                {t("perf.lowStockBadge", { count: stock })}
            </Badge>
        );
    }
    if (sold === 0) {
        return (
            <Badge
                variant="outline"
                className="border-amber-500/40 bg-amber-500/10 text-amber-700 dark:text-amber-300"
            >
                {t("perf.unsoldBadge")}
            </Badge>
        );
    }
    return (
        <Badge
            variant="outline"
            className="border-emerald-500/40 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"
        >
            {t("perf.inStockBadge", { count: stock })}
        </Badge>
    );
}