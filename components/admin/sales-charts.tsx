"use client";

import { useLocale, useTranslations } from "next-intl";
import {
    Area,
    AreaChart,
    Bar,
    BarChart,
    CartesianGrid,
    Cell,
    Pie,
    PieChart,
    ResponsiveContainer,
    Tooltip,
    XAxis,
    YAxis,
} from "recharts";

import { ORDER_STATUS_LABELS } from "@/lib/constants";
import type { Locale } from "@/lib/i18n/config";
import { formatILS } from "@/lib/utils/currency";
import type {
    DailySale,
    MonthlySale,
    OrdersByStatus,
} from "@/types/database.types";

const STATUS_COLORS: Record<string, string> = {
    pending: "#a1a1aa",
    confirmed: "#3b82f6",
    preparing: "#f59e0b",
    out_for_delivery: "#8b5cf6",
    delivered: "#22c55e",
    canceled: "#ef4444",
};

function formatDay(value: string, locale: Locale): string {
    const d = new Date(`${value}T00:00:00`);
    return d.toLocaleDateString(locale === "ar" ? "ar" : "he-IL", {
        day: "2-digit",
        month: "2-digit",
    });
}

function formatMonth(value: string, locale: Locale): string {
    const d = new Date(`${value}T00:00:00`);
    return d.toLocaleDateString(locale === "ar" ? "ar" : "he-IL", {
        month: "short",
        year: "2-digit",
    });
}

export function RevenueAreaChart({ data }: { data: DailySale[] }) {
    const locale = useLocale() as Locale;
    const t = useTranslations("admin.stats");
    const chartData = [...data].reverse().map((d) => ({
        day: formatDay(d.day, locale),
        revenue: d.revenue_agorot / 100,
    }));

    return (
        <ResponsiveContainer width="100%" height={260}>
            <AreaChart data={chartData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                <defs>
                    <linearGradient id="revenueFill" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="var(--chart-1)" stopOpacity={0.35} />
                        <stop offset="95%" stopColor="var(--chart-1)" stopOpacity={0} />
                    </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                <XAxis
                    dataKey="day"
                    tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
                    tickLine={false}
                    axisLine={false}
                />
                <YAxis
                    tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
                    tickLine={false}
                    axisLine={false}
                    width={48}
                />
                <Tooltip
                    formatter={(value) => [formatILS(Number(value) * 100, locale), t("revenue")]}
                    contentStyle={{
                        background: "var(--popover)",
                        border: "1px solid var(--border)",
                        borderRadius: 8,
                        fontSize: 12,
                    }}
                />
                <Area
                    type="monotone"
                    dataKey="revenue"
                    stroke="var(--chart-1)"
                    strokeWidth={2}
                    fill="url(#revenueFill)"
                />
            </AreaChart>
        </ResponsiveContainer>
    );
}

export function MonthlyBarChart({ data }: { data: MonthlySale[] }) {
    const locale = useLocale() as Locale;
    const t = useTranslations("admin.stats");
    const chartData = [...data].reverse().map((d) => ({
        month: formatMonth(d.month, locale),
        revenue: d.revenue_agorot / 100,
    }));

    return (
        <ResponsiveContainer width="100%" height={260}>
            <BarChart data={chartData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                <XAxis
                    dataKey="month"
                    tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
                    tickLine={false}
                    axisLine={false}
                />
                <YAxis
                    tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
                    tickLine={false}
                    axisLine={false}
                    width={48}
                />
                <Tooltip
                    formatter={(value) => [formatILS(Number(value) * 100, locale), t("revenue")]}
                    contentStyle={{
                        background: "var(--popover)",
                        border: "1px solid var(--border)",
                        borderRadius: 8,
                        fontSize: 12,
                    }}
                />
                <Bar dataKey="revenue" fill="var(--chart-2)" radius={[4, 4, 0, 0]} />
            </BarChart>
        </ResponsiveContainer>
    );
}

export function StatusPieChart({ data }: { data: OrdersByStatus[] }) {
    const t = useTranslations();
    const chartData = data.map((d) => ({
        name: t(ORDER_STATUS_LABELS[d.status]) ?? d.status,
        value: d.orders_count,
        color: STATUS_COLORS[d.status] ?? "var(--muted-foreground)",
    }));

    return (
        <ResponsiveContainer width="100%" height={240}>
            <PieChart>
                <Pie
                    data={chartData}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    innerRadius={55}
                    outerRadius={85}
                    paddingAngle={2}
                >
                    {chartData.map((entry, index) => (
                        <Cell key={index} fill={entry.color} />
                    ))}
                </Pie>
                <Tooltip
                    contentStyle={{
                        background: "var(--popover)",
                        border: "1px solid var(--border)",
                        borderRadius: 8,
                        fontSize: 12,
                    }}
                />
            </PieChart>
        </ResponsiveContainer>
    );
}
