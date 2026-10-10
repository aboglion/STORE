import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export default function AdminDashboardLoading() {
    return (
        <div className="grid gap-6 animate-page-enter">
            {/* Page Header Skeleton */}
            <div className="flex flex-wrap items-center justify-between gap-4">
                <div className="space-y-2">
                    <Skeleton className="h-8 w-40" />
                    <Skeleton className="h-4 w-64" />
                </div>
                <Skeleton className="h-9 w-28 rounded-md" />
            </div>

            {/* Quick Metrics Skeletons */}
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                {Array.from({ length: 4 }).map((_, i) => (
                    <Card key={i} className="overflow-hidden">
                        <CardHeader className="space-y-2 pb-2">
                            <div className="flex items-center justify-between">
                                <Skeleton className="h-4 w-24" />
                                <Skeleton className="size-5 rounded-full" />
                            </div>
                        </CardHeader>
                        <CardContent className="space-y-2">
                            <Skeleton className="h-7 w-20" />
                            <Skeleton className="h-3 w-32" />
                        </CardContent>
                    </Card>
                ))}
            </div>

            {/* Filter Bar Skeleton */}
            <div className="flex flex-wrap items-center gap-3">
                <Skeleton className="h-10 flex-1 min-w-[200px] max-w-sm rounded-md" />
                <Skeleton className="h-10 w-36 rounded-md" />
                <Skeleton className="h-10 w-32 rounded-md" />
            </div>

            {/* Table / Content Skeleton */}
            <div className="rounded-md border bg-card p-4">
                <div className="space-y-4">
                    {/* Table Header */}
                    <div className="flex items-center justify-between border-b pb-3">
                        <Skeleton className="h-4 w-20" />
                        <Skeleton className="h-4 w-32" />
                        <Skeleton className="h-4 w-24" />
                        <Skeleton className="h-4 w-20" />
                        <Skeleton className="h-4 w-16" />
                    </div>

                    {/* Table Rows */}
                    {Array.from({ length: 6 }).map((_, i) => (
                        <div
                            key={i}
                            className="flex items-center justify-between py-2 border-b last:border-b-0"
                        >
                            <div className="flex items-center gap-3">
                                <Skeleton className="size-10 rounded-md shrink-0" />
                                <div className="space-y-1.5">
                                    <Skeleton className="h-4 w-36" />
                                    <Skeleton className="h-3 w-24" />
                                </div>
                            </div>
                            <Skeleton className="h-4 w-24 hidden md:block" />
                            <Skeleton className="h-5 w-20" />
                            <Skeleton className="h-6 w-16 rounded-full" />
                            <Skeleton className="size-8 rounded-md" />
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}
