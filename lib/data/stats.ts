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

export interface DashboardMetrics {
    totalOrders: number;
    pendingOrders: number;
    totalProducts: number;
    totalCategories: number;
    totalCustomers: number;
    activeCouriers: number;
    lowStockCount: number;
    totalRevenueAgorot: number;
}

export async function getDashboardMetrics(): Promise<DashboardMetrics> {
    const admin = createAdminClient();

    const [
        ordersRes,
        pendingRes,
        productsRes,
        categoriesRes,
        customersRes,
        couriersRes,
        lowStockRes,
        statsRes,
    ] = await Promise.allSettled([
        admin.from("orders").select("id", { count: "exact", head: true }),
        admin
            .from("orders")
            .select("id", { count: "exact", head: true })
            .eq("status", "pending"),
        admin.from("products").select("id", { count: "exact", head: true }),
        admin.from("categories").select("id", { count: "exact", head: true }),
        admin.from("customers").select("id", { count: "exact", head: true }),
        admin
            .from("couriers")
            .select("id", { count: "exact", head: true })
            .eq("is_active", true),
        admin
            .from("products")
            .select("id", { count: "exact", head: true })
            .lt("stock_quantity", 5),
        getStats(),
    ]);

    const totalOrders =
        ordersRes.status === "fulfilled" ? ordersRes.value.count ?? 0 : 0;
    const pendingOrders =
        pendingRes.status === "fulfilled" ? pendingRes.value.count ?? 0 : 0;
    const totalProducts =
        productsRes.status === "fulfilled" ? productsRes.value.count ?? 0 : 0;
    const totalCategories =
        categoriesRes.status === "fulfilled"
            ? categoriesRes.value.count ?? 0
            : 0;
    const totalCustomers =
        customersRes.status === "fulfilled" ? customersRes.value.count ?? 0 : 0;
    const activeCouriers =
        couriersRes.status === "fulfilled" ? couriersRes.value.count ?? 0 : 0;
    const lowStockCount =
        lowStockRes.status === "fulfilled" ? lowStockRes.value.count ?? 0 : 0;
    const totalRevenueAgorot =
        statsRes.status === "fulfilled"
            ? statsRes.value.totalRevenueAgorot
            : 0;

    return {
        totalOrders,
        pendingOrders,
        totalProducts,
        totalCategories,
        totalCustomers,
        activeCouriers,
        lowStockCount,
        totalRevenueAgorot,
    };
}