import Link from "next/link";

import { ChevronLeft, ChevronRight } from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function Pagination({
    page,
    totalPages,
    buildHref,
}: {
    page: number;
    totalPages: number;
    buildHref: (page: number) => string;
}) {
    if (totalPages <= 1) return null;

    const prev = page > 1 ? buildHref(page - 1) : null;
    const next = page < totalPages ? buildHref(page + 1) : null;

    return (
        <div className="flex items-center justify-center gap-2 pt-4">
            <Link href={prev ?? "#"} aria-disabled={!prev} tabIndex={prev ? 0 : -1}>
                <Button
                    variant="outline"
                    size="sm"
                    disabled={!prev}
                    className={cn(!prev && "pointer-events-none opacity-50")}
                >
                    <ChevronRight className="size-4" />
                    הקודם
                </Button>
            </Link>

            <span className="text-sm text-muted-foreground">
                עמוד {page} מתוך {totalPages}
            </span>

            <Link href={next ?? "#"} aria-disabled={!next} tabIndex={next ? 0 : -1}>
                <Button
                    variant="outline"
                    size="sm"
                    disabled={!next}
                    className={cn(!next && "pointer-events-none opacity-50")}
                >
                    הבא
                    <ChevronLeft className="size-4" />
                </Button>
            </Link>
        </div>
    );
}