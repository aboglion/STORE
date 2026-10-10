"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import {
    Bike,
    Car,
    Footprints,
    MoreHorizontal,
    Pencil,
    Share2,
    Truck,
    UserRound,
    UserRoundCheck,
    UserRoundX,
} from "lucide-react";
import { toast } from "sonner";

import { CourierDialog } from "@/components/admin/courier-dialog";
import { CourierShareDialog } from "@/components/admin/courier-share-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { setCourierActiveAction } from "@/lib/actions/couriers";
import type { CourierVehicle, CourierWithStats } from "@/types/database.types";
import { relativeTime } from "@/lib/utils/dates";

const VEHICLE_ICONS: Record<CourierVehicle, typeof Car> = {
    car: Car,
    scooter: Truck,
    bike: Bike,
    foot: Footprints,
};

function isRecent(iso: string | null): boolean {
    if (!iso) return false;
    return Date.now() - new Date(iso).getTime() < 60_000;
}

interface CouriersTableProps {
    couriers: CourierWithStats[];
    locale: "he" | "ar";
}

export function CouriersTable({ couriers, locale }: CouriersTableProps) {
    const t = useTranslations("admin.couriers");
    const router = useRouter();

    const [editCourier, setEditCourier] = useState<CourierWithStats | null>(null);
    const [shareCourier, setShareCourier] = useState<CourierWithStats | null>(null);
    const [, forceTick] = useState(0);

    // Refresh "last seen" labels every 15 seconds.
    useEffect(() => {
        const id = setInterval(() => forceTick((v) => v + 1), 15_000);
        return () => clearInterval(id);
    }, []);

    async function toggleActive(c: CourierWithStats) {
        const res = await setCourierActiveAction({
            id: c.id,
            isActive: !c.is_active,
        });
        if (res?.error) {
            toast.error(res.error);
            return;
        }
        toast.success(!c.is_active ? t("activatedToast") : t("deactivatedToast"));
        router.refresh();
    }

    const lastSeen = (c: CourierWithStats) => {
        if (!c.last_location_at) return <span className="text-xs text-muted-foreground">—</span>;
        return (
            <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <span
                    className={`size-1.5 rounded-full ${isRecent(c.last_location_at) ? "animate-pulse bg-emerald-500" : "bg-muted-foreground/40"
                        }`}
                />
                {isRecent(c.last_location_at) ? t("online") : relativeTime(c.last_location_at, locale)}
            </span>
        );
    };

    const vehicleBadge = (c: CourierWithStats) => {
        const Icon = VEHICLE_ICONS[c.vehicle_type];
        return (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-muted/50 px-2 py-0.5 text-xs font-medium text-muted-foreground">
                <Icon className="size-3.5" />
                {t(`vehicleTypes.${c.vehicle_type}`)}
            </span>
        );
    };

    const actions = (c: CourierWithStats) => (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="size-8 rounded-lg"
                    aria-label={t("actions")}
                >
                    <MoreHorizontal className="size-4" />
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-52">
                <DropdownMenuItem asChild>
                    <Link href={`/admin/couriers/${c.id}`}>
                        <UserRound className="size-4" />
                        {t("openProfile")}
                    </Link>
                </DropdownMenuItem>
                <DropdownMenuItem onSelect={() => setShareCourier(c)}>
                    <Share2 className="size-4" />
                    {t("shareLink")}
                </DropdownMenuItem>
                <DropdownMenuItem onSelect={() => setEditCourier(c)}>
                    <Pencil className="size-4" />
                    {t("edit")}
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                    className={c.is_active ? "text-destructive focus:text-destructive" : "text-emerald-600"}
                    onSelect={() => toggleActive(c)}
                >
                    {c.is_active ? (
                        <UserRoundX className="size-4" />
                    ) : (
                        <UserRoundCheck className="size-4" />
                    )}
                    {c.is_active ? t("deactivate") : t("activate")}
                </DropdownMenuItem>
            </DropdownMenuContent>
        </DropdownMenu>
    );

    return (
        <>
            {/* Desktop */}
            <div className="hidden overflow-hidden rounded-2xl border border-border/70 bg-card shadow-soft md:block">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>{t("courier")}</TableHead>
                            <TableHead>{t("vehicle")}</TableHead>
                            <TableHead>{t("activeOrders")}</TableHead>
                            <TableHead>{t("deliveredToday")}</TableHead>
                            <TableHead>{t("lastSeen")}</TableHead>
                            <TableHead>{t("statusShort")}</TableHead>
                            <TableHead className="w-12" />
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {couriers.map((c) => (
                            <TableRow key={c.id} className={!c.is_active ? "opacity-60" : ""}>
                                <TableCell>
                                    <div className="flex items-center gap-2.5">
                                        <span
                                            className="size-3.5 shrink-0 rounded-full ring-2 ring-white"
                                            style={{ backgroundColor: c.color }}
                                        />
                                        <div className="min-w-0">
                                            <Link
                                                href={`/admin/couriers/${c.id}`}
                                                className="block truncate font-medium hover:underline"
                                            >
                                                {c.full_name}
                                            </Link>
                                            <div className="text-xs text-muted-foreground" dir="ltr">
                                                {c.phone_display}
                                            </div>
                                        </div>
                                    </div>
                                </TableCell>
                                <TableCell>{vehicleBadge(c)}</TableCell>
                                <TableCell className="font-semibold">
                                    {c.active_orders_count}
                                </TableCell>
                                <TableCell>{c.delivered_today_count}</TableCell>
                                <TableCell>{lastSeen(c)}</TableCell>
                                <TableCell>
                                    <Badge variant={c.is_active ? "default" : "outline"}>
                                        {c.is_active ? t("active") : t("inactive")}
                                    </Badge>
                                </TableCell>
                                <TableCell>{actions(c)}</TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </div>

            {/* Mobile */}
            <div className="grid gap-3 md:hidden">
                {couriers.map((c) => (
                    <div
                        key={c.id}
                        className={`rounded-2xl border border-border/70 bg-card p-4 shadow-soft ${!c.is_active ? "opacity-60" : ""
                            }`}
                    >
                        <div className="flex items-center gap-3">
                            <span
                                className="size-4 shrink-0 rounded-full ring-2 ring-white"
                                style={{ backgroundColor: c.color }}
                            />
                            <div className="min-w-0 flex-1">
                                <Link
                                    href={`/admin/couriers/${c.id}`}
                                    className="block truncate font-semibold hover:underline"
                                >
                                    {c.full_name}
                                </Link>
                                <div className="text-xs text-muted-foreground" dir="ltr">
                                    {c.phone_display}
                                </div>
                            </div>
                            {actions(c)}
                        </div>
                        <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-border/50 pt-2.5">
                            {vehicleBadge(c)}
                            <Badge variant={c.is_active ? "default" : "outline"}>
                                {c.is_active ? t("active") : t("inactive")}
                            </Badge>
                            <span className="ms-auto">{lastSeen(c)}</span>
                        </div>
                        <div className="mt-2 flex gap-4 text-xs text-muted-foreground">
                            <span>
                                {t("activeOrders")}:{" "}
                                <b className="text-foreground">{c.active_orders_count}</b>
                            </span>
                            <span>
                                {t("deliveredToday")}:{" "}
                                <b className="text-foreground">{c.delivered_today_count}</b>
                            </span>
                        </div>
                    </div>
                ))}
            </div>

            {editCourier && (
                <CourierDialog
                    open={Boolean(editCourier)}
                    onOpenChange={(open) => !open && setEditCourier(null)}
                    courier={editCourier}
                />
            )}

            {shareCourier && (
                <CourierShareDialog
                    open={Boolean(shareCourier)}
                    onOpenChange={(open) => !open && setShareCourier(null)}
                    courierId={shareCourier.id}
                    courierName={shareCourier.full_name}
                    accessToken={shareCourier.access_token}
                />
            )}
        </>
    );
}