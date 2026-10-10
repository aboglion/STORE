"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { List, Map as MapIcon, Plus } from "lucide-react";

import { CourierDialog } from "@/components/admin/courier-dialog";
import { CouriersTable } from "@/components/admin/couriers-table";
import { AdminLiveMap } from "@/components/map/admin-live-map";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { CourierLiveRow, CourierWithStats } from "@/types/database.types";

type Tab = "list" | "map";

interface CouriersViewProps {
    couriers: CourierWithStats[];
    liveRows: CourierLiveRow[];
    locale: "he" | "ar";
}

export function CouriersView({ couriers, liveRows, locale }: CouriersViewProps) {
    const t = useTranslations("admin.couriers");
    const [tab, setTab] = useState<Tab>("list");
    const [createOpen, setCreateOpen] = useState(false);

    return (
        <div className="grid gap-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="inline-flex rounded-2xl border border-border/60 bg-muted/40 p-1">
                    <button
                        type="button"
                        onClick={() => setTab("list")}
                        className={cn(
                            "flex items-center gap-1.5 rounded-xl px-4 py-1.5 text-sm font-semibold transition-all",
                            tab === "list"
                                ? "bg-card text-foreground shadow-soft"
                                : "text-muted-foreground hover:text-foreground"
                        )}
                    >
                        <List className="size-4" />
                        {t("viewList")}
                    </button>
                    <button
                        type="button"
                        onClick={() => setTab("map")}
                        className={cn(
                            "flex items-center gap-1.5 rounded-xl px-4 py-1.5 text-sm font-semibold transition-all",
                            tab === "map"
                                ? "bg-card text-foreground shadow-soft"
                                : "text-muted-foreground hover:text-foreground"
                        )}
                    >
                        <MapIcon className="size-4" />
                        {t("viewMap")}
                    </button>
                </div>

                <Button
                    type="button"
                    className="rounded-xl"
                    onClick={() => setCreateOpen(true)}
                >
                    <Plus className="size-4" />
                    {t("newCourier")}
                </Button>
            </div>

            {tab === "list" ? (
                <CouriersTable couriers={couriers} locale={locale} />
            ) : (
                <AdminLiveMap initialRows={liveRows} />
            )}

            <CourierDialog
                open={createOpen}
                onOpenChange={setCreateOpen}
                courier={null}
            />
        </div>
    );
}