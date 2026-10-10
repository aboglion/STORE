import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export default function RootLoading() {
    return (
        <div className="container mx-auto px-4 py-8 animate-page-enter">
            {/* Top Banner Skeleton */}
            <div className="mb-8 space-y-3">
                <Skeleton className="h-10 w-48" />
                <Skeleton className="h-4 w-96 max-w-full" />
            </div>

            {/* Product Grid Skeleton */}
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:gap-6">
                {Array.from({ length: 8 }).map((_, i) => (
                    <Card key={i} className="overflow-hidden">
                        <Skeleton className="aspect-square w-full rounded-none" />
                        <CardContent className="space-y-2 p-3 sm:p-4">
                            <Skeleton className="h-4 w-3/4" />
                            <Skeleton className="h-4 w-1/2" />
                            <div className="pt-2 flex items-center justify-between">
                                <Skeleton className="h-6 w-16" />
                                <Skeleton className="h-8 w-20 rounded-md" />
                            </div>
                        </CardContent>
                    </Card>
                ))}
            </div>
        </div>
    );
}
