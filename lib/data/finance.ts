import "server-only";

import type {
    InventoryBalanceRow,
    ProfitLossRow,
    ProfitLossTotals,
} from "@/types/database.types";
import { createAdminClient } from "@/lib/supabase/admin";

export interface ProfitLossData {
    totals: ProfitLossTotals;
    monthly: ProfitLossRow[];
    /** True when at least one product has no cost set (COGS is partial). */
    hasMissingCosts: boolean;
}

/**
 * Profit & loss: revenue, delivery fees, discounts, COGS and gross profit
 * for all delivered orders (all-time totals + monthly breakdown).
 */
export async function getProfitLoss(): Promise<ProfitLossData> {
    const admin = createAdminClient();

    const [totalsRes, monthlyRes, missingCostsRes] = await Promise.all([
        admin.from("profit_loss_totals").select("*").maybeSingle(),
        admin
            .from("profit_loss_summary")
            .select("*")
            .order("month", { ascending: false })
            .limit(24),
        admin
            .from("products")
            .select("id")
            .is("cost_agorot", null)
            .limit(1),
    ]);

    const totals = (totalsRes.data ?? {
        orders_count: 0,
        revenue_agorot: 0,
        delivery_fees_agorot: 0,
        discounts_agorot: 0,
        cogs_agorot: 0,
        gross_profit_agorot: 0,
    }) as ProfitLossTotals;

    return {
        totals,
        monthly: (monthlyRes.data ?? []) as ProfitLossRow[],
        hasMissingCosts: (missingCostsRes.data ?? []).length > 0,
    };
}

export interface InventoryBalanceData {
    rows: InventoryBalanceRow[];
    totalUnits: number;
    totalRetailValueAgorot: number;
    totalCostValueAgorot: number;
    lowStockCount: number;
    outOfStockCount: number;
    activeCount: number;
}

/**
 * Full inventory balance: per-product stock, retail value, cost value,
 * plus aggregate totals for the summary cards.
 */
export async function getInventoryBalance(): Promise<InventoryBalanceData> {
    const admin = createAdminClient();

    const { data, error } = await admin
        .from("inventory_balance")
        .select("*")
        .order("name_he", { ascending: true });

    if (error) throw new Error(`getInventoryBalance: ${error.message}`);

    const rows = (data ?? []) as InventoryBalanceRow[];

    return {
        rows,
        totalUnits: rows.reduce((sum, r) => sum + r.stock_quantity, 0),
        totalRetailValueAgorot: rows.reduce(
            (sum, r) => sum + r.retail_value_agorot,
            0
        ),
        totalCostValueAgorot: rows.reduce(
            (sum, r) => sum + r.cost_value_agorot,
            0
        ),
        lowStockCount: rows.filter(
            (r) => r.stock_quantity <= r.low_stock_threshold
        ).length,
        outOfStockCount: rows.filter((r) => r.stock_quantity === 0).length,
        activeCount: rows.filter((r) => r.is_active).length,
    };
}