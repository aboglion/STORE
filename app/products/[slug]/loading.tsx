import { Skeleton } from "@/components/ui/skeleton";

export default function ProductPageLoading() {
    return (
        <div className="animate-page-enter">
            {/* Breadcrumb */}
            <div className="mb-4 flex items-center gap-2">
                <Skeleton className="h-4 w-16" />
                <Skeleton className="h-4 w-4 rounded-full" />
                <Skeleton className="h-4 w-28" />
            </div>

            <div className="grid gap-8 md:grid-cols-2">
                {/* Gallery */}
                <div className="grid gap-3">
                    <Skeleton className="aspect-square w-full rounded-3xl" />
                    <div className="flex gap-2">
                        <Skeleton className="size-16 rounded-xl sm:size-20" />
                        <Skeleton className="size-16 rounded-xl sm:size-20" />
                        <Skeleton className="size-16 rounded-xl sm:size-20" />
                    </div>
                </div>

                {/* Details */}
                <div className="flex flex-col gap-4">
                    <div className="space-y-3">
                        <Skeleton className="h-8 w-3/4" />
                        <Skeleton className="h-10 w-40" />
                    </div>
                    <Skeleton className="h-6 w-24 rounded-full" />
                    <Skeleton className="h-px w-full" />
                    <div className="space-y-2">
                        <Skeleton className="h-4 w-full" />
                        <Skeleton className="h-4 w-11/12" />
                        <Skeleton className="h-4 w-4/5" />
                    </div>
                    <Skeleton className="hidden h-14 w-full rounded-full md:block" />
                </div>
            </div>

            {/* Mobile sticky bar placeholder */}
            <div className="fixed inset-x-0 bottom-0 z-40 border-t border-border/60 bg-background/90 pb-safe backdrop-blur-xl md:hidden">
                <div className="mx-auto flex w-full max-w-5xl items-center gap-3 px-4 py-3">
                    <div className="flex shrink-0 flex-col gap-1">
                        <Skeleton className="h-3 w-10" />
                        <Skeleton className="h-5 w-16" />
                    </div>
                    <Skeleton className="h-14 flex-1 rounded-full" />
                </div>
            </div>
        </div>
    );
}