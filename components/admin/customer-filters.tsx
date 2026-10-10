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

export function CustomerFilters({
    initial,
}: {
    initial: { q?: string; sort?: string };
}) {
    const router = useRouter();
    const t = useTranslations("admin.customers");
    const [q, setQ] = useState(initial.q ?? "");
    const [sort, setSort] = useState(initial.sort ?? "newest");

    function apply() {
        const params = new URLSearchParams();
        if (q.trim()) params.set("q", q.trim());
        if (sort !== "newest") params.set("sort", sort);
        router.push(`/admin/customers?${params.toString()}`);
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

            <Select value={sort} onValueChange={setSort}>
                <SelectTrigger className="w-full md:w-48">
                    <SelectValue placeholder={t("sort")} />
                </SelectTrigger>
                <SelectContent>
                    <SelectItem value="newest">{t("newest")}</SelectItem>
                    <SelectItem value="orders">{t("mostOrders")}</SelectItem>
                    <SelectItem value="total">{t("mostPurchases")}</SelectItem>
                    <SelectItem value="last">{t("lastOrderSort")}</SelectItem>
                </SelectContent>
            </Select>

            <Button type="button" variant="secondary" onClick={apply}>
                {t("filter")}
            </Button>
        </div>
    );
}
