export function MobileStickyBar({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <div className="fixed inset-x-0 bottom-0 z-40 border-t border-border/60 bg-background/90 pb-safe backdrop-blur-xl supports-[backdrop-filter]:bg-background/80 md:hidden">
            <div className="mx-auto flex w-full max-w-5xl items-center gap-3 px-4 py-3">
                {children}
            </div>
        </div>
    );
}
