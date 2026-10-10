"use client";

import { useLocale, useTranslations } from "next-intl";
import { Lightbulb, Route as RouteIcon, Sparkles } from "lucide-react";

import type { Locale } from "@/lib/i18n/config";
import {
    metersToKm,
    roundMinutes,
    type RoutePlan,
} from "@/lib/utils/route";
import type { CourierOrder } from "@/types/database.types";

interface RecommendationsPanelProps {
    plan: RoutePlan;
    ordersById: Map<string, CourierOrder>;
    locationStatus: string;
}

export function RecommendationsPanel({
    plan,
    ordersById,
    locationStatus,
}: RecommendationsPanelProps) {
    const t = useTranslations("courier");
    const locale = (useLocale() as Locale) ?? "he";

    const first = plan.ordered[0] ? ordersById.get(plan.ordered[0].id) : null;
    const locatedCount = plan.ordered.length;
    const driving = roundMinutes(
        (plan.totalMeters / ((25 * 1000) / 60)) // drive only, service shown separately
    );
    void locale;

    if (plan.ordered.length === 0) return null;

    return (
        <div className="overflow-hidden rounded-2xl border border-primary/20 bg-gradient-to-br from-primary/10 via-card to-card shadow-soft">
            <div className="flex items-center gap-2 px-4 pb-2 pt-3">
                <span className="flex size-7 items-center justify-center rounded-full bg-primary/15 text-primary">
                    <Lightbulb className="size-4" />
                </span>
                <div className="text-sm font-bold">{t("recommendedRoute")}</div>
                {locationStatus === "active" && (
                    <span className="ms-auto inline-flex items-center gap-1 rounded-full bg-emerald-500/15 px-2 py-0.5 text-[11px] font-semibold text-emerald-700">
                        <Sparkles className="size-3" />
                        {t("liveOptimized")}
                    </span>
                )}
            </div>

            {first && (
                <div className="mx-4 rounded-xl bg-primary px-3 py-2.5 text-primary-foreground shadow-soft">
                    <div className="text-[11px] font-semibold opacity-80">
                        {t("startHere")}
                    </div>
                    <div className="mt-0.5 flex items-center justify-between gap-2">
                        <span className="truncate text-sm font-bold">
                            {first.order_number} · {first.customer_name}
                        </span>
                        <span className="shrink-0 rounded-full bg-white/20 px-2 py-0.5 text-[11px] font-bold">
                            {t("firstStopDistance", {
                                km: metersToKm(plan.legsMeters[0] ?? 0).toLocaleString(
                                    "en-US"
                                ),
                            })}
                        </span>
                    </div>
                </div>
            )}

            <div className="flex items-center gap-2 px-4 pb-3 pt-2.5 text-xs text-muted-foreground">
                <RouteIcon className="size-3.5" />
                {t("routeSummary", {
                    stops: locatedCount,
                    km: metersToKm(plan.totalMeters).toLocaleString("en-US"),
                    min: driving,
                    unlocated: plan.unlocated.length,
                })}
            </div>
        </div>
    );
}