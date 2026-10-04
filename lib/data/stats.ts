import "server-only";

import type {
    DailySale,
    MonthlySale,
    OrdersByStatus,
    TopProduct,
} from "@/types/database.types";
import { createAdminClient } from "@/lib/supabase/admin";

export interface StatsData {
    daily: DailySale[];
    monthly: MonthlySale[];
    topProducts: TopProduct[];
    ordersByStatus: OrdersByStatus[];
    totalRevenueAgorot: number;
    totalOrders: number;
}

export async function getStats(): Promise<StatsData> {
    const admin = createAdminClient();

    const [dailyRes, monthlyRes, topRes, byStatusRes] = await Promise.all([
        admin
            .from("daily_sales")
            .select("*")
            .order("day", { ascending: false })
            .limit(30),
        admin
            .from("monthly_sales")
            .select("*")
            .order("month", { ascending: false })
            .limit(12),
        admin.from("top_products").select("*").limit(10),
        admin.from("orders_by_status").select("*"),
    ]);

    const daily = (dailyRes.data ?? []) as DailySale[];
    const monthly = (monthlyRes.data ?? []) as MonthlySale[];
    const topProducts = (topRes.data ?? []) as TopProduct[];
    const ordersByStatus = (byStatusRes.data ?? []) as OrdersByStatus[];

    const totalRevenueAgorot = daily.reduce(
        (sum, d) => sum + d.revenue_agorot,
        0
    );
    const totalOrders = daily.reduce((sum, d) => sum + d.orders_count, 0);

    return {
        daily,
        monthly,
        topProducts,
        ordersByStatus,
        totalRevenueAgorot,
        totalOrders,
    };
}