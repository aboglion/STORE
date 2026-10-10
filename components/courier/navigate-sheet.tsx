"use client";

import { useMemo } from "react";
import { useTranslations } from "next-intl";
import { ExternalLink, Navigation } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
    Sheet,
    SheetContent,
    SheetHeader,
    SheetTitle,
} from "@/components/ui/sheet";
import {
    isIosDevice,
    navigationTargets,
    sortedNavigationTargets,
} from "@/lib/utils/navigation";
import type { CourierOrder } from "@/types/database.types";

interface NavigateSheetProps {
    order: CourierOrder | null;
    open: boolean;
    onOpenChange: (open: boolean) => void;
}

const APP_ICONS: Record<string, { glyph: string }> = {
    waze: { glyph: "W" },
    google: { glyph: "G" },
    apple: { glyph: "⌖" },
};

export function NavigateSheet({ order, open, onOpenChange }: NavigateSheetProps) {
    const t = useTranslations("courier");

    const targets = useMemo(() => {
        if (!order) return [];
        return sortedNavigationTargets(
            navigationTargets(
                order.address_lat,
                order.address_lng,
                order.address_text
            ),
            isIosDevice()
        );
    }, [order]);

    return (
        <Sheet open={open} onOpenChange={onOpenChange}>
            <SheetContent side="bottom" className="rounded-t-3xl">
                <SheetHeader>
                    <SheetTitle className="flex items-center gap-2 text-base">
                        <Navigation className="size-4 text-primary" />
                        {t("navigateTo", { order: order?.order_number ?? "" })}
                    </SheetTitle>
                </SheetHeader>

                <div className="mt-4 space-y-2.5">
                    {targets.map((target) => (
                        <Button
                            key={target.app}
                            type="button"
                            variant="outline"
                            size="lg"
                            className="h-12 w-full justify-between rounded-2xl px-4 text-sm font-semibold"
                            onClick={() => {
                                window.open(target.url, "_blank", "noopener,noreferrer");
                                onOpenChange(false);
                            }}
                        >
                            <span className="flex items-center gap-3">
                                <span className="flex size-8 items-center justify-center rounded-lg bg-primary/10 font-display font-extrabold text-primary">
                                    {APP_ICONS[target.app]?.glyph ?? "•"}
                                </span>
                                {t(target.labelKey as "nav.waze")}
                            </span>
                            <ExternalLink className="size-4 text-muted-foreground" />
                        </Button>
                    ))}
                </div>

                <p className="mt-4 text-center text-xs text-muted-foreground">
                    {t("navigateHint")}
                </p>
            </SheetContent>
        </Sheet>
    );
}