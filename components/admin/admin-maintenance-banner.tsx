"use client";

import { useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AlertTriangle, ExternalLink, Loader2, Play } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { setStoreMaintenance } from "@/lib/actions/maintenance";

interface AdminMaintenanceBannerProps {
    active: boolean;
}

export function AdminMaintenanceBanner({ active }: AdminMaintenanceBannerProps) {
    const router = useRouter();
    const [isPending, startTransition] = useTransition();

    if (!active) return null;

    const handleReactivate = () => {
        startTransition(async () => {
            const res = await setStoreMaintenance({ active: false });
            if (!res.ok) {
                toast.error(res.error || "הפעולה נכשלה");
                return;
            }
            toast.success("האתר חזר לפעילות מלאה ופתוח לקהל הרחב!");
            router.refresh();
        });
    };

    return (
        <aside
            aria-label="הודעת מערכת: מצב תחזוקה פעיל"
            className="relative z-30 flex flex-wrap items-center justify-between gap-3 border-b-2 border-amber-500/60 bg-gradient-to-r from-amber-500/20 via-orange-500/15 to-amber-500/20 px-4 py-2.5 text-xs font-medium text-amber-950 dark:text-amber-100 shadow-sm"
        >
            <div className="flex items-center gap-2">
                <span className="relative flex size-2.5 shrink-0">
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-amber-400 opacity-75" />
                    <span className="relative inline-flex size-2.5 rounded-full bg-amber-500" />
                </span>
                <AlertTriangle className="size-4 shrink-0 text-amber-600 dark:text-amber-400" />
                <span>
                    <strong>האתר במצב תחזוקה:</strong> כניסת מבקרים ולקוחות חסומה כעת לחלוטין.
                </span>
            </div>

            <div className="flex items-center gap-2">
                <Button
                    asChild
                    variant="ghost"
                    size="sm"
                    className="h-7 rounded-lg px-2 text-xs text-amber-900 dark:text-amber-200 hover:bg-amber-500/20"
                >
                    <Link href="/" target="_blank" rel="noopener noreferrer">
                        <ExternalLink className="size-3 me-1" />
                        <span>צפייה במסך התחזוקה</span>
                    </Link>
                </Button>

                <Button
                    onClick={handleReactivate}
                    disabled={isPending}
                    size="sm"
                    className="h-7 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-xs px-3"
                >
                    {isPending ? (
                        <Loader2 className="size-3 animate-spin me-1.5" />
                    ) : (
                        <Play className="size-3 me-1.5 fill-current" />
                    )}
                    <span>החזרת האתר לפעילות</span>
                </Button>
            </div>
        </aside>
    );
}
