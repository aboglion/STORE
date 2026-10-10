"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { useTranslations } from "next-intl";

import { Search } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { ORDER_STATUS_LABELS } from "@/lib/constants";
import type { OrderStatus, PaymentStatus } from "@/types/database.types";
import type { AssignableCourier } from "@/components/admin/order-assign-dialog";

const ALL_ORDER_STATUSES = Object.keys(ORDER_STATUS_LABELS) as OrderStatus[];

export function OrderFilters({
    initial,
    couriers,
}: {
    initial: { q?: string; status?: string; payment?: string; courier?: string };
    couriers: AssignableCourier[];
}) {
    const router = useRouter();
    const t = useTranslations("admin.orders");
    const tRoot = useTranslations();
    const [q, setQ] = useState(initial.q ?? "");
    const [status, setStatus] = useState(initial.status ?? "all");
    const [payment, setPayment] = useState(initial.payment ?? "all");
    const [courier, setCourier] = useState(initial.courier ?? "all");

    function apply() {
        const params = new URLSearchParams();
        if (q.trim()) params.set("q", q.trim());
        if (status !== "all") params.set("status", status);
        if (payment !== "all") params.set("payment", payment);
        if (courier !== "all") params.set("courier", courier);
        router.push(`/admin/orders?${params.toString()}`);
    }

    return (
        <div className="flex flex-col gap-2 md:flex-row">
            <div className="relative flex-1">
                <Search className="absolute top-1/2 right-3 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                    value={q}
                    onChange={(e) => setQ(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && apply()}
                    placeholder={t("searchPlaceholder")}
                    className="pr-9"
                />
            </div>

            <Select
                value={status}
                onValueChange={setStatus}
            >
                <SelectTrigger className="w-full md:w-44">
                    <SelectValue placeholder={t("allStatuses")} />
                </SelectTrigger>
                <SelectContent>
                    <SelectItem value="all">{t("allStatuses")}</SelectItem>
                    {ALL_ORDER_STATUSES.map((s) => (
                        <SelectItem key={s} value={s}>
                            {tRoot(ORDER_STATUS_LABELS[s])}
                        </SelectItem>
                    ))}
                </SelectContent>
            </Select>

            <Select
                value={payment}
                onValueChange={setPayment}
            >
                <SelectTrigger className="w-full md:w-40">
                    <SelectValue placeholder={t("allPayments")} />
                </SelectTrigger>
                <SelectContent>
                    <SelectItem value="all">{t("allPayments")}</SelectItem>
                    <SelectItem value="paid">{t("paid")}</SelectItem>
                    <SelectItem value="unpaid">{t("unpaid")}</SelectItem>
                    <SelectItem value="refunded">{t("refunded")}</SelectItem>
                </SelectContent>
            </Select>

            {couriers.length > 0 && (
                <Select value={courier} onValueChange={setCourier}>
                    <SelectTrigger className="w-full md:w-44">
                        <SelectValue placeholder={t("allCouriers")} />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">{t("allCouriers")}</SelectItem>
                        <SelectItem value="unassigned">
                            {t("unassigned")}
                        </SelectItem>
                        {couriers.map((c) => (
                            <SelectItem key={c.id} value={c.id}>
                                {c.full_name}
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            )}

            <Button type="button" variant="secondary" onClick={apply}>
                {t("filter")}
            </Button>
        </div>
    );
}

export type { PaymentStatus };
