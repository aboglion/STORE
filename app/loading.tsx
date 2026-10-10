import { Skeleton } from "@/components/ui/skeleton";

export default function RootLoading() {
    return (
        <div className="animate-page-enter">
            {/* Hero */}
            <div className="mb-6 space-y-3">
                <Skeleton className="h-10 w-48" />
                <Skeleton className="h-4 w-96 max-w-full" />
            </div>

            {/* Category chips */}
            <div className="-mx-4 mb-6 flex gap-2 overflow-hidden px-4">
                <Skeleton className="h-9 w-20 shrink-0 rounded-full" />
                <Skeleton className="h-9 w-24 shrink-0 rounded-full" />
                <Skeleton className="h-9 w-28 shrink-0 rounded-full" />
                <Skeleton className="h-9 w-20 shrink-0 rounded-full" />
            </div>

            {/* Product Grid Skeleton */}
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 lg:grid-cols-4">
                {Array.from({ length: 8 }).map((_, i) => (
                    <div
                        key={i}
                        className="flex flex-col overflow-hidden rounded-2xl border border-border/70 bg-card shadow-soft"
                    >
                        <Skeleton className="aspect-square w-full rounded-none" />
                        <div className="flex flex-1 flex-col gap-2 p-3">
                            <Skeleton className="h-4 w-3/4" />
                            <div className="mt-auto flex items-center justify-between gap-2">
                                <Skeleton className="h-5 w-16" />
                                <Skeleton className="h-8 w-8 rounded-full" />
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
