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

export function ProductFilters({
    categories,
    initial,
}: {
    categories: { id: string; name_he: string }[];
    initial: { q?: string; category?: string; status?: string };
}) {
    const router = useRouter();
    const [q, setQ] = useState(initial.q ?? "");
    const [category, setCategory] = useState(initial.category ?? "all");
    const [status, setStatus] = useState(initial.status ?? "all");

    function applyFilters() {
        const params = new URLSearchParams();
        if (q.trim()) params.set("q", q.trim());
        if (category !== "all") params.set("category", category);
        if (status !== "all") params.set("status", status);
        router.push(`/admin/products?${params.toString()}`);
    }

    return (
        <div className="flex flex-col gap-2 sm:flex-row">
            <div className="relative flex-1">
                <Search className="absolute top-1/2 right-3 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                    value={q}
                    onChange={(e) => setQ(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && applyFilters()}
                    placeholder="חיפוש לפי שם או slug..."
                    className="pr-9"
                />
            </div>

            <Select
                value={category}
                onValueChange={(v) => {
                    setCategory(v);
                    // apply immediately for selects
                    const params = new URLSearchParams();
                    if (q.trim()) params.set("q", q.trim());
                    if (v !== "all") params.set("category", v);
                    if (status !== "all") params.set("status", status);
                    router.push(`/admin/products?${params.toString()}`);
                }}
            >
                <SelectTrigger className="w-full sm:w-44">
                    <SelectValue placeholder="כל הקטגוריות" />
                </SelectTrigger>
                <SelectContent>
                    <SelectItem value="all">כל הקטגוריות</SelectItem>
                    {categories.map((c) => (
                        <SelectItem key={c.id} value={c.id}>
                            {c.name_he}
                        </SelectItem>
                    ))}
                </SelectContent>
            </Select>

            <Select
                value={status}
                onValueChange={(v) => {
                    setStatus(v);
                    const params = new URLSearchParams();
                    if (q.trim()) params.set("q", q.trim());
                    if (category !== "all") params.set("category", category);
                    if (v !== "all") params.set("status", v);
                    router.push(`/admin/products?${params.toString()}`);
                }}
            >
                <SelectTrigger className="w-full sm:w-40">
                    <SelectValue placeholder="כל הסטטוסים" />
                </SelectTrigger>
                <SelectContent>
                    <SelectItem value="all">כל הסטטוסים</SelectItem>
                    <SelectItem value="active">פעיל</SelectItem>
                    <SelectItem value="inactive">לא פעיל</SelectItem>
                </SelectContent>
            </Select>

            <Button type="button" onClick={applyFilters} variant="secondary">
                סינון
            </Button>
        </div>
    );
}