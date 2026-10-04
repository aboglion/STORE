"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

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

const ALL_ORDER_STATUSES = Object.keys(ORDER_STATUS_LABELS) as OrderStatus[];

export function OrderFilters({
    initial,
}: {
    initial: { q?: string; status?: string; payment?: string };
}) {
    const router = useRouter();
    const [q, setQ] = useState(initial.q ?? "");
    const [status, setStatus] = useState(initial.status ?? "all");
    const [payment, setPayment] = useState(initial.payment ?? "all");

    function apply() {
        const params = new URLSearchParams();
        if (q.trim()) params.set("q", q.trim());
        if (status !== "all") params.set("status", status);
        if (payment !== "all") params.set("payment", payment);
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
                    placeholder="חיפוש לפי מספר, שם או טלפון..."
                    className="pr-9"
                />
            </div>

            <Select
                value={status}
                onValueChange={setStatus}
            >
                <SelectTrigger className="w-full md:w-44">
                    <SelectValue placeholder="כל הסטטוסים" />
                </SelectTrigger>
                <SelectContent>
                    <SelectItem value="all">כל הסטטוסים</SelectItem>
                    {ALL_ORDER_STATUSES.map((s) => (
                        <SelectItem key={s} value={s}>
                            {ORDER_STATUS_LABELS[s]}
                        </SelectItem>
                    ))}
                </SelectContent>
            </Select>

            <Select
                value={payment}
                onValueChange={setPayment}
            >
                <SelectTrigger className="w-full md:w-40">
                    <SelectValue placeholder="כל התשלומים" />
                </SelectTrigger>
                <SelectContent>
                    <SelectItem value="all">כל התשלומים</SelectItem>
                    <SelectItem value="paid">שולם</SelectItem>
                    <SelectItem value="unpaid">לא שולם</SelectItem>
                    <SelectItem value="refunded">הוחזר</SelectItem>
                </SelectContent>
            </Select>

            <Button type="button" variant="secondary" onClick={apply}>
                סינון
            </Button>
        </div>
    );
}

export type { PaymentStatus };