"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
    AlertTriangle,
    CheckCircle2,
    Clock,
    Edit3,
    ExternalLink,
    Loader2,
    MessageSquare,
    Play,
    Power,
    ShieldAlert,
    Store,
    Wrench,
} from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { setStoreMaintenance } from "@/lib/actions/maintenance";
import type { MaintenanceStatus } from "@/types/backups";

interface MaintenanceDashboardWidgetProps {
    initialStatus: MaintenanceStatus;
}

const QUICK_REASONS = [
    "עבודות תחזוקה שוטפות",
    "ספירת מלאי תקופתית",
    "שדרוג מערכת ומחירים",
    "רענון קטלוג ומבצעים",
];

function formatTime(isoString?: string): string {
    if (!isoString) return "";
    try {
        const d = new Date(isoString);
        return new Intl.DateTimeFormat("he-IL", {
            timeZone: "Asia/Jerusalem",
            hour: "2-digit",
            minute: "2-digit",
            day: "2-digit",
            month: "2-digit",
        }).format(d);
    } catch {
        return isoString;
    }
}

export function MaintenanceDashboardWidget({
    initialStatus,
}: MaintenanceDashboardWidgetProps) {
    const router = useRouter();
    const [status, setStatus] = useState<MaintenanceStatus>(initialStatus);
    const [isPending, startTransition] = useTransition();

    // Dialog state
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [reason, setReason] = useState(initialStatus.reason || "עבודות תחזוקה שוטפות");
    const [message, setMessage] = useState(initialStatus.message || "");
    const [expectedDuration, setExpectedDuration] = useState(initialStatus.expectedDuration || "");

    const isActive = status.active;

    const handleOpenDialog = () => {
        setReason(status.reason || "עבודות תחזוקה שוטפות");
        setMessage(status.message || "");
        setExpectedDuration(status.expectedDuration || "");
        setIsDialogOpen(true);
    };

    const handleSaveMaintenance = (shouldActivate: boolean) => {
        startTransition(async () => {
            const res = await setStoreMaintenance({
                active: shouldActivate,
                reason: reason.trim() || "עבודות תחזוקה שוטפות",
                message: message.trim() || undefined,
                expectedDuration: expectedDuration.trim() || undefined,
            });

            if (!res.ok) {
                toast.error(res.error || "הפעולה נכשלה, אנא נסה שנית");
                return;
            }

            if (res.status) {
                setStatus(res.status);
            } else {
                setStatus((prev) => ({ ...prev, active: shouldActivate }));
            }

            setIsDialogOpen(false);

            if (shouldActivate) {
                toast.warning("האתר הושבת לתחזוקה בהצלחה. כניסת מבקרים חסומה כעת.", {
                    duration: 5000,
                });
            } else {
                toast.success("האתר חזר לפעילות מלאה ופתוח לקהל הרחב!", {
                    duration: 5000,
                });
            }

            router.refresh();
        });
    };

    const handleQuickEnable = () => {
        handleSaveMaintenance(true);
    };

    const handleDirectDisable = () => {
        startTransition(async () => {
            const res = await setStoreMaintenance({ active: false });
            if (!res.ok) {
                toast.error(res.error || "הפעולה נכשלה, אנא נסה שנית");
                return;
            }

            setStatus({ active: false });
            toast.success("האתר חזר לפעילות מלאה ופתוח לקהל הרחב!");
            router.refresh();
        });
    };

    return (
        <>
            {!isActive ? (
                /* ================= ACTIVE STATE (Store is Live) ================= */
                <div className="relative overflow-hidden rounded-2xl border border-emerald-500/30 bg-gradient-to-r from-emerald-500/10 via-emerald-500/5 to-transparent p-4 sm:p-5 shadow-soft transition-all duration-200">
                    <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                        <div className="flex items-start gap-3.5">
                            {/* Glowing live status icon */}
                            <div className="relative flex size-12 shrink-0 items-center justify-center rounded-xl bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/25 shadow-soft">
                                <span className="absolute -top-1 -right-1 flex size-3">
                                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                                    <span className="relative inline-flex size-3 rounded-full bg-emerald-500" />
                                </span>
                                <Store className="size-6" />
                            </div>

                            <div>
                                <div className="flex flex-wrap items-center gap-2">
                                    <h2 className="font-display text-base sm:text-lg font-bold text-foreground">
                                        סטטוס האתר: פעיל ופתוח ללקוחות
                                    </h2>
                                    <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/15 px-2.5 py-0.5 text-xs font-bold text-emerald-700 dark:text-emerald-300 border border-emerald-500/30">
                                        <span className="size-1.5 rounded-full bg-emerald-500" />
                                        Live • פתוח להזמנות
                                    </span>
                                </div>
                                <p className="mt-1 text-xs sm:text-sm text-muted-foreground leading-relaxed">
                                    החנות פתוחה לקהל הרחב. לקוחות יכולים לגלוש בקטלוג, להוסיף מוצרים לסל ולבצע הזמנות כרגיל.
                                </p>
                            </div>
                        </div>

                        {/* Action button to disable store */}
                        <div className="flex shrink-0 items-center gap-2 self-start sm:self-center">
                            <Button
                                onClick={handleOpenDialog}
                                disabled={isPending}
                                variant="outline"
                                className="rounded-xl border-amber-500/40 bg-amber-500/10 text-amber-800 hover:bg-amber-500/20 hover:text-amber-900 dark:text-amber-300 dark:hover:bg-amber-500/25 font-bold shadow-soft transition-all duration-200 hover:scale-[1.02]"
                            >
                                {isPending ? (
                                    <Loader2 className="size-4 animate-spin me-2" />
                                ) : (
                                    <Power className="size-4 me-2 text-amber-600 dark:text-amber-400 stroke-[2.5]" />
                                )}
                                <span>השבתת האתר לתחזוקה</span>
                            </Button>
                        </div>
                    </div>
                </div>
            ) : (
                /* ================= MAINTENANCE STATE (Store is Closed) ================= */
                <div className="relative overflow-hidden rounded-2xl border-2 border-amber-500/70 bg-gradient-to-r from-amber-500/20 via-orange-500/15 to-amber-500/10 p-5 sm:p-6 shadow-lift">
                    {/* Background ambient pulse glow */}
                    <div className="pointer-events-none absolute -right-16 -top-16 size-48 rounded-full bg-amber-500/25 blur-3xl animate-pulse" />
                    <div className="pointer-events-none absolute -left-16 -bottom-16 size-48 rounded-full bg-orange-500/20 blur-3xl" />

                    <div className="relative z-10 flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
                        <div className="flex items-start gap-4">
                            {/* Animated glowing wrench beacon */}
                            <div className="relative flex size-14 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-tr from-amber-600 to-amber-400 text-black shadow-lg shadow-amber-500/30">
                                <span className="absolute -inset-1 rounded-2xl bg-amber-400/40 animate-ping opacity-60" />
                                <Wrench className="size-7 text-black stroke-[2.5]" />
                            </div>

                            <div>
                                <div className="flex flex-wrap items-center gap-2.5">
                                    <h2 className="font-display text-lg sm:text-xl font-extrabold tracking-tight text-amber-950 dark:text-amber-100 flex items-center gap-2">
                                        <AlertTriangle className="size-5 text-amber-600 dark:text-amber-400" />
                                        <span>האתר מושבת כעת למצב תחזוקה!</span>
                                    </h2>
                                    <span className="inline-flex items-center gap-1.5 rounded-full bg-rose-500/20 px-3 py-0.5 text-xs font-bold text-rose-700 dark:text-rose-300 border border-rose-500/40 shadow-xs">
                                        <span className="size-2 rounded-full bg-rose-500 animate-pulse" />
                                        סגור למבקרים
                                    </span>
                                </div>

                                <p className="mt-1.5 text-xs sm:text-sm text-amber-950/90 dark:text-amber-100/90 leading-relaxed font-medium max-w-2xl">
                                    החנות חסומה לכניסת מבקרים. כל לקוח שמנסה להיכנס מועבר מיד למסך התחזוקה המעוצב ולא יכול לצפות במוצרים או להזמין.
                                </p>

                                {/* Live metadata pills */}
                                <div className="mt-3 flex flex-wrap items-center gap-2 text-xs">
                                    {status.startedAt && (
                                        <span className="inline-flex items-center gap-1.5 rounded-lg bg-background/90 px-2.5 py-1 text-muted-foreground border border-border/70 shadow-xs">
                                            <Clock className="size-3 text-amber-600" />
                                            <span>הופעל:</span>
                                            <strong className="text-foreground">{formatTime(status.startedAt)}</strong>
                                        </span>
                                    )}

                                    {status.reason && (
                                        <span className="inline-flex items-center gap-1.5 rounded-lg bg-background/90 px-2.5 py-1 text-muted-foreground border border-border/70 shadow-xs">
                                            <span>סיבה:</span>
                                            <strong className="text-foreground">{status.reason}</strong>
                                        </span>
                                    )}

                                    {status.expectedDuration && (
                                        <span className="inline-flex items-center gap-1.5 rounded-lg bg-background/90 px-2.5 py-1 text-muted-foreground border border-border/70 shadow-xs">
                                            <span>זמן משוער:</span>
                                            <strong className="text-foreground">{status.expectedDuration}</strong>
                                        </span>
                                    )}

                                    {status.message && (
                                        <span className="inline-flex items-center gap-1.5 rounded-lg bg-background/90 px-2.5 py-1 text-muted-foreground border border-border/70 shadow-xs max-w-xs truncate">
                                            <MessageSquare className="size-3 text-amber-600" />
                                            <span>הודעה:</span>
                                            <strong className="text-foreground truncate">&ldquo;{status.message}&rdquo;</strong>
                                        </span>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* Action buttons */}
                        <div className="flex shrink-0 flex-wrap items-center gap-2.5 self-start lg:self-center">
                            {/* Reactivate Button */}
                            <Button
                                onClick={handleDirectDisable}
                                disabled={isPending}
                                className="rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold shadow-md transition-all duration-200 hover:scale-[1.02] px-5 py-2.5"
                            >
                                {isPending ? (
                                    <Loader2 className="size-4 animate-spin me-2" />
                                ) : (
                                    <Play className="size-4 me-2 fill-current" />
                                )}
                                <span>החזרת האתר לפעילות</span>
                            </Button>

                            {/* Preview maintenance screen */}
                            <Button
                                asChild
                                variant="outline"
                                size="sm"
                                className="rounded-xl border-amber-500/40 bg-background/90 hover:bg-background text-foreground shadow-soft"
                            >
                                <Link href="/" target="_blank" rel="noopener noreferrer">
                                    <ExternalLink className="size-3.5 me-1.5" />
                                    <span>צפייה במסך התחזוקה</span>
                                </Link>
                            </Button>

                            {/* Edit message button */}
                            <Button
                                onClick={handleOpenDialog}
                                variant="ghost"
                                size="sm"
                                className="rounded-xl hover:bg-amber-500/15 text-amber-950 dark:text-amber-100 font-semibold"
                            >
                                <Edit3 className="size-3.5 me-1.5" />
                                <span>עריכת הודעה</span>
                            </Button>
                        </div>
                    </div>
                </div>
            )}

            {/* ================= CONFIGURATION & CONFIRMATION DIALOG ================= */}
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                <DialogContent className="max-w-lg rounded-2xl p-6" dir="rtl">
                    <DialogHeader className="text-right">
                        <DialogTitle className="flex items-center gap-2 text-xl font-extrabold">
                            <ShieldAlert className="size-5 text-amber-500" />
                            <span>
                                {isActive ? "עריכת הגדרות מצב תחזוקה" : "השבתת האתר למצב תחזוקה"}
                            </span>
                        </DialogTitle>
                        <DialogDescription className="text-right text-xs leading-relaxed text-muted-foreground pt-1">
                            {isActive
                                ? "עדכן את הודעת התחזוקה או זמן החזרה המשוער שמוצגים ללקוחות המבקרים באתר."
                                : "פעולה זו תחסום כניסת מבקרים ולקוחות לחנות באופן מיידי. מבקרים יועברו למסך תחזוקה מעוצב. מנהלים מורשים ימשיכו לגשת לדשבורד כרגיל."}
                        </DialogDescription>
                    </DialogHeader>

                    <div className="space-y-4 py-2 text-right">
                        {/* Quick pick chips */}
                        <div>
                            <Label className="text-xs font-semibold text-muted-foreground block mb-2">
                                סיבות נפוצות לבחירה מהירה:
                            </Label>
                            <div className="flex flex-wrap gap-1.5">
                                {QUICK_REASONS.map((r) => (
                                    <button
                                        key={r}
                                        type="button"
                                        onClick={() => setReason(r)}
                                        className={`rounded-full border px-3 py-1 text-xs font-medium transition-all ${
                                            reason === r
                                                ? "border-amber-500 bg-amber-500/20 text-amber-800 dark:text-amber-200"
                                                : "border-border/80 bg-muted/50 text-muted-foreground hover:bg-muted hover:text-foreground"
                                        }`}
                                    >
                                        {r}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Reason input */}
                        <div className="space-y-1.5">
                            <Label htmlFor="maint-reason" className="text-xs font-bold">
                                סיבת ההשבתה:
                            </Label>
                            <Input
                                id="maint-reason"
                                value={reason}
                                onChange={(e) => setReason(e.target.value)}
                                placeholder="למשל: ספירת מלאי, שדרוג מערכת..."
                                className="rounded-xl"
                            />
                        </div>

                        {/* Custom message textarea */}
                        <div className="space-y-1.5">
                            <Label htmlFor="maint-message" className="text-xs font-bold">
                                הודעה מותאמת אישית ללקוחות (אופציונלי):
                            </Label>
                            <Textarea
                                id="maint-message"
                                value={message}
                                onChange={(e) => setMessage(e.target.value)}
                                placeholder="למשל: אנו משדרגים את מחירי המבצע ונוסיף מגוון מוצרים חדשים, נשוב בעוד כחצי שעה..."
                                rows={3}
                                className="rounded-xl resize-none text-xs leading-relaxed"
                            />
                        </div>

                        {/* Expected duration input */}
                        <div className="space-y-1.5">
                            <Label htmlFor="maint-duration" className="text-xs font-bold">
                                זמן חזרה משוער לפעילות (אופציונלי):
                            </Label>
                            <Input
                                id="maint-duration"
                                value={expectedDuration}
                                onChange={(e) => setExpectedDuration(e.target.value)}
                                placeholder="למשל: כ-30 דקות, עד השעה 16:00, בקרוב"
                                className="rounded-xl"
                            />
                        </div>

                        {/* Notice box */}
                        <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-3 text-xs text-amber-900 dark:text-amber-200">
                            <strong>שים לב:</strong> מנהלי המערכת יכולים להחזיר את האתר לפעילות בכל רגע נתון בלחיצת כפתור אחת מהדשבורד.
                        </div>
                    </div>

                    <DialogFooter className="flex-row-reverse sm:justify-start gap-2 pt-2">
                        <Button
                            type="button"
                            variant="outline"
                            onClick={() => setIsDialogOpen(false)}
                            disabled={isPending}
                            className="rounded-xl"
                        >
                            ביטול
                        </Button>

                        <Button
                            type="button"
                            onClick={handleQuickEnable}
                            disabled={isPending}
                            className={
                                isActive
                                    ? "rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-bold"
                                    : "rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-bold shadow-soft"
                            }
                        >
                            {isPending ? (
                                <Loader2 className="size-4 animate-spin me-2" />
                            ) : isActive ? (
                                <CheckCircle2 className="size-4 me-2" />
                            ) : (
                                <Power className="size-4 me-2" />
                            )}
                            <span>{isActive ? "שמירת שינויים" : "השבת את האתר עכשיו"}</span>
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </>
    );
}
