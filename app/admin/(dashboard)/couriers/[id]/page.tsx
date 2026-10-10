import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getLocale, getTranslations } from "next-intl/server";
import {
    ChevronRight,
    Clock,
    History,
    MapPin,
    PackageCheck,
    Phone,
    ShoppingBag,
    Wallet,
} from "lucide-react";

import { CourierEditButton } from "@/components/admin/courier-edit-button";
import { CourierOrdersTable } from "@/components/admin/courier-orders-table";
import { CourierPositionMap } from "@/components/admin/courier-position-map";
import { CourierShareCard } from "@/components/admin/courier-share-card";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { requireAdmin } from "@/lib/auth";
import { getCourierById, getCouriers } from "@/lib/data/couriers";
import type { Locale } from "@/lib/i18n/config";
import { formatILS } from "@/lib/utils/currency";
import { formatDateTime, relativeTime } from "@/lib/utils/dates";
import type { CourierEventType } from "@/types/database.types";

export async function generateMetadata(): Promise<Metadata> {
    const t = await getTranslations("admin.couriers");
    return {
        title: t("profileTitle"),
    };
}

const EVENT_LABEL_KEYS: Record<CourierEventType, string> = {
    courier_created: "events.courierCreated",
    courier_updated: "events.courierUpdated",
    courier_deactivated: "events.deactivated",
    courier_activated: "events.activated",
    token_regenerated: "events.tokenRegenerated",
    assigned: "events.assigned",
    transferred: "events.transferred",
    returned_to_store: "events.returnedToStore",
    status_changed: "events.statusChanged",
    problem_reported: "events.problemReported",
};

export default async function CourierDetailPage({
    params,
}: {
    params: Promise<{ id: string }>;
}) {
    await requireAdmin();

    const locale = (await getLocale()) as Locale;
    const t = await getTranslations("admin.couriers");

    const { id } = await params;
    const [detail, courierRows] = await Promise.all([
        getCourierById(id),
        getCouriers(),
    ]);

    if (!detail) notFound();
    const { courier, active_orders, delivered_today, events, stats } = detail;

    const assignableCouriers = courierRows.map((c) => ({
        id: c.id,
        full_name: c.full_name,
        color: c.color,
        is_active: c.is_active,
        active_orders_count: c.active_orders_count,
    }));

    const hasPosition =
        typeof courier.last_lat === "number" && typeof courier.last_lng === "number";

    const statCard = (
        icon: React.ReactNode,
        label: string,
        value: string,
        sub?: string
    ) => (
        <Card className="shadow-soft">
            <CardContent className="flex items-start gap-3 p-4">
                <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                    {icon}
                </span>
                <div className="min-w-0">
                    <div className="truncate text-[11px] font-semibold text-muted-foreground">
                        {label}
                    </div>
                    <div className="font-display text-lg font-extrabold">{value}</div>
                    {sub && <div className="text-xs text-muted-foreground">{sub}</div>}
                </div>
            </CardContent>
        </Card>
    );

    return (
        <div className="grid gap-6">
            {/* Header */}
            <div>
                <Link
                    href="/admin/couriers"
                    className="mb-2 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
                >
                    <ChevronRight className="size-4" />
                    {t("backToCouriers")}
                </Link>
                <div className="flex flex-wrap items-center gap-3">
                    <span
                        className="size-4 shrink-0 rounded-full ring-2 ring-white"
                        style={{ backgroundColor: courier.color }}
                    />
                    <h1 className="font-display text-2xl font-extrabold tracking-tight">
                        {courier.full_name}
                    </h1>
                    <Badge variant={courier.is_active ? "default" : "outline"}>
                        {courier.is_active ? t("active") : t("inactive")}
                    </Badge>
                    <span className="ms-auto">
                        <CourierEditButton courier={courier} />
                    </span>
                </div>
                <div className="mt-1.5 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted-foreground">
                    <span className="flex items-center gap-1.5" dir="ltr">
                        <Phone className="size-3.5" />
                        {courier.phone_display}
                    </span>
                    <span>{t(`vehicleTypes.${courier.vehicle_type}`)}</span>
                    {courier.notes && <span className="text-xs">· {courier.notes}</span>}
                </div>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
                {statCard(
                    <ShoppingBag className="size-4" />,
                    t("activeOrders"),
                    String(stats.active_orders_count)
                )}
                {statCard(
                    <PackageCheck className="size-4" />,
                    t("deliveredToday"),
                    String(stats.delivered_today_count)
                )}
                {statCard(
                    <History className="size-4" />,
                    t("deliveredTotal"),
                    String(stats.delivered_total_count)
                )}
                {statCard(
                    <Clock className="size-4" />,
                    t("avgDelivery"),
                    stats.avg_delivery_minutes != null
                        ? `${Math.round(stats.avg_delivery_minutes)}`
                        : "—",
                    t("minutes")
                )}
                {statCard(
                    <Wallet className="size-4" />,
                    t("cashToday"),
                    formatILS(stats.cash_to_collect_today_agorot, locale)
                )}
            </div>

            {/* Share + live position */}
            <div className="grid gap-6 lg:grid-cols-2">
                <CourierShareCard
                    courierId={courier.id}
                    courierName={courier.full_name}
                    accessToken={courier.access_token}
                />

                <Card className="shadow-soft">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2 text-base">
                            <MapPin className="size-4 text-primary" />
                            {t("livePosition")}
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="pt-0">
                        {hasPosition ? (
                            <>
                                <CourierPositionMap
                                    name={courier.full_name}
                                    color={courier.color}
                                    lat={courier.last_lat as number}
                                    lng={courier.last_lng as number}
                                />
                                <p className="mt-2 text-xs text-muted-foreground">
                                    {courier.last_location_at
                                        ? `${t("lastSeen")}: ${relativeTime(
                                            courier.last_location_at,
                                            locale
                                        )}`
                                        : t("noPosition")}
                                </p>
                            </>
                        ) : (
                            <div className="grid h-40 place-items-center rounded-2xl border border-dashed border-border/70 text-sm text-muted-foreground">
                                {t("noPosition")}
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>

            {/* Active orders */}
            <div>
                <h2 className="mb-3 font-display text-lg font-bold">
                    {t("activeOrdersTitle")}
                </h2>
                <CourierOrdersTable
                    orders={active_orders}
                    couriers={assignableCouriers}
                    currentCourierId={courier.id}
                    locale={locale}
                />
            </div>

            {/* Delivered today */}
            <Card className="shadow-soft">
                <CardHeader>
                    <CardTitle className="text-base">{t("deliveredTodayTitle")}</CardTitle>
                </CardHeader>
                <CardContent className="pt-0">
                    {delivered_today.length === 0 ? (
                        <p className="py-6 text-center text-sm text-muted-foreground">
                            {t("noDeliveredToday")}
                        </p>
                    ) : (
                        <div className="divide-y divide-border/50">
                            {delivered_today.map((order) => (
                                <div
                                    key={order.id}
                                    className="flex items-center justify-between gap-3 py-2.5"
                                >
                                    <div className="min-w-0">
                                        <Link
                                            href={`/admin/orders/${order.id}`}
                                            className="font-mono text-sm font-semibold hover:underline"
                                            dir="ltr"
                                        >
                                            {order.order_number}
                                        </Link>
                                        <div className="truncate text-xs text-muted-foreground">
                                            {order.customer_name_snapshot}
                                        </div>
                                    </div>
                                    <div className="shrink-0 text-end">
                                        <div className="font-semibold" dir="ltr">
                                            {formatILS(order.total_agorot, locale)}
                                        </div>
                                        <div className="text-xs text-muted-foreground" dir="ltr">
                                            {order.delivered_at
                                                ? formatDateTime(order.delivered_at, locale)
                                                : "—"}
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Event timeline */}
            <Card className="shadow-soft">
                <CardHeader>
                    <CardTitle className="text-base">{t("timelineTitle")}</CardTitle>
                </CardHeader>
                <CardContent className="pt-0">
                    {events.length === 0 ? (
                        <p className="py-6 text-center text-sm text-muted-foreground">
                            {t("noEvents")}
                        </p>
                    ) : (
                        <ol className="relative ms-1.5 space-y-4 border-s border-border/60 ps-5">
                            {events.map((event) => (
                                <li key={event.id} className="relative">
                                    <span
                                        className={`absolute start-[-29px] top-1.5 size-2.5 rounded-full ring-2 ring-background ${event.event_type === "problem_reported"
                                            ? "bg-amber-500"
                                            : event.event_type === "returned_to_store"
                                                ? "bg-muted-foreground"
                                                : event.event_type === "assigned" ||
                                                    event.event_type === "transferred"
                                                    ? "bg-primary"
                                                    : "bg-emerald-500"
                                            }`}
                                    />
                                    <div className="text-sm font-semibold">
                                        {t(EVENT_LABEL_KEYS[event.event_type])}
                                    </div>
                                    <div className="flex flex-wrap items-center gap-x-2 text-xs text-muted-foreground">
                                        <span dir="ltr">
                                            {formatDateTime(event.created_at, locale)}
                                        </span>
                                        {event.order_id && (
                                            <Link
                                                href={`/admin/orders/${event.order_id}`}
                                                className="text-primary hover:underline"
                                            >
                                                {t("viewOrder")}
                                            </Link>
                                        )}
                                        {event.note && (
                                            <span className="truncate" dir="auto">
                                                · {event.note}
                                            </span>
                                        )}
                                    </div>
                                </li>
                            ))}
                        </ol>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}