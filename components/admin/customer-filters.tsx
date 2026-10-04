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

export function CustomerFilters({
    initial,
}: {
    initial: { q?: string; sort?: string };
}) {
    const router = useRouter();
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
                    placeholder="חיפוש לפי שם או טלפון..."
                    className="pr-9"
                />
            </div>

            <Select value={sort} onValueChange={setSort}>
                <SelectTrigger className="w-full md:w-48">
                    <SelectValue placeholder="מיון" />
                </SelectTrigger>
                <SelectContent>
                    <SelectItem value="newest">חדשים ביותר</SelectItem>
                    <SelectItem value="orders">הכי הרבה הזמנות</SelectItem>
                    <SelectItem value="total">הכי הרבה רכישות</SelectItem>
                    <SelectItem value="last">הזמנה אחרונה</SelectItem>
                </SelectContent>
            </Select>

            <Button type="button" variant="secondary" onClick={apply}>
                סינון
            </Button>
        </div>
    );
}