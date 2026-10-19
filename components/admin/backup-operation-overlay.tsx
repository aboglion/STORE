"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import {
    CheckCircle2,
    Database,
    HardDrive,
    Loader2,
    ShieldCheck,
    Sparkles,
    UploadCloud,
} from "lucide-react";

export type BackupOperationType = "backup" | "restore" | "upload-restore";

interface BackupOperationOverlayProps {
    open: boolean;
    type: BackupOperationType;
    backupId?: string;
    isDone?: boolean;
    onCompleted?: () => void;
}

const BACKUP_STEPS = [
    { id: 1, text: "בדיקת משאבים ונעילת תהליך", textAr: "فحص الموارد وقفل العملية" },
    { id: 2, text: "יצירת גיבוי מלא של בסיס הנתונים (pg_dump)", textAr: "إنشاء نسخة كاملة لقاعدة البيانات" },
    { id: 3, text: "בדיקת שינויי תמונות ודה-דופליקציה חכמה (0MB כפילות)", textAr: "فحص تغييرات الصور وإلغاء التكرار الذكي" },
    { id: 4, text: "אימות תקינות הארכיון וכתיבת מטא-דאטה", textAr: "التحقق من سلامة الأرشيف وكتابة البيانات" },
];

const RESTORE_STEPS = [
    { id: 1, text: "נעילת האתר למצב תחזוקה (הגנה על מבקרים)", textAr: "تفعيل وضع الصيانة في المتجر لحماية الزوار" },
    { id: 2, text: "יצירת שמירת ביטחון מקדימה (Pre-restore)", textAr: "إنشاء نسخة أمان تلقائية للحالة الحالية" },
    { id: 3, text: "שחזור נתוני בסיס הנתונים (pg_restore)", textAr: "استعادة بيانات قاعدة البيانات بالكامل" },
    { id: 4, text: "רענון schema cache ותזמון שחזור תמונות", textAr: "تحديث ذاكرة التخزين المؤقت ומزامنة الصور" },
    { id: 5, text: "פתיחת האתר מחדש וסיום בהצלחה", textAr: "إلغاء وضع الصيانة واكتمال العملية بنجاح" },
];

export function BackupOperationOverlay({
    open,
    type,
    backupId,
    isDone = false,
    onCompleted: _onCompleted,
}: BackupOperationOverlayProps) {
    const isRestore = type === "restore" || type === "upload-restore";
    const steps = isRestore ? RESTORE_STEPS : BACKUP_STEPS;

    const [mounted, setMounted] = useState(() => typeof document !== "undefined");
    const [currentStep, setCurrentStep] = useState(1);
    const [isSuccess, setIsSuccess] = useState(false);

    useEffect(() => {
        setMounted(true);
    }, []);

    useEffect(() => {
        if (!open) {
            setCurrentStep(1);
            setIsSuccess(false);
            return;
        }

        if (isDone) {
            setIsSuccess(true);
            setCurrentStep(steps.length);
            return;
        }

        // Advance steps smoothly over time while operation runs
        const stepInterval = setInterval(() => {
            setCurrentStep((prev) => {
                if (prev < steps.length - 1) {
                    return prev + 1;
                }
                return prev;
            });
        }, isRestore ? 1800 : 1200);

        return () => clearInterval(stepInterval);
    }, [open, isRestore, isDone, steps.length]);

    if (!open || !mounted) return null;

    return createPortal(
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/80 backdrop-blur-md p-4 transition-all duration-300 animate-in fade-in select-none">
            {/* Glowing ambient background lights */}
            <div className={`absolute -top-32 -left-32 size-80 rounded-full blur-[100px] pointer-events-none ${isRestore ? "bg-amber-500/20" : "bg-primary/20"}`} />
            <div className={`absolute -bottom-32 -right-32 size-80 rounded-full blur-[100px] pointer-events-none ${isRestore ? "bg-primary/20" : "bg-emerald-500/20"}`} />

            {/* Floating Card */}
            <div className="relative w-full max-w-lg overflow-hidden rounded-3xl border border-white/10 bg-[#0e1422]/95 p-6 sm:p-8 shadow-2xl text-center">
                {/* Header Badge */}
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-white/10 bg-white/5 text-xs text-muted-foreground mb-4">
                    <Sparkles className="size-3 text-amber-400" />
                    <span>{isRestore ? "שחזור מערכת • استعادة النظام" : "גיבוי מערכת • نسخ احتياطي"}</span>
                    {backupId && <span className="font-mono text-[10px] text-white/50">({backupId})</span>}
                </div>

                {/* Central Floating Animation */}
                <div className="relative mx-auto my-3 flex size-28 items-center justify-center">
                    {/* Pulsing glow ring */}
                    <div
                        className={`absolute -inset-3 rounded-full blur-xl animate-pulse ${
                            isSuccess
                                ? "bg-emerald-500/30"
                                : isRestore
                                  ? "bg-amber-500/25"
                                  : "bg-primary/25"
                        }`}
                    />

                    {/* Rotating dashed SVG aura */}
                    <svg className="absolute inset-0 size-full animate-[spin_8s_linear_infinite]" viewBox="0 0 100 100">
                        <circle
                            cx="50"
                            cy="50"
                            r="46"
                            fill="none"
                            stroke={isSuccess ? "#10b981" : isRestore ? "#f59e0b" : "#3b82f6"}
                            strokeWidth="2.5"
                            strokeDasharray="16 12"
                            strokeOpacity="0.6"
                        />
                    </svg>

                    {/* Inner glowing container */}
                    <div className="relative flex size-20 items-center justify-center rounded-2xl border border-white/15 bg-gradient-to-b from-[#1c2438] to-[#121828] shadow-2xl">
                        {isSuccess ? (
                            <CheckCircle2 className="size-10 text-emerald-400 animate-in zoom-in-75 duration-300" />
                        ) : isRestore ? (
                            <>
                                <Database className="size-9 text-amber-400 animate-pulse" />
                                <div className="absolute -bottom-1 -right-1 flex size-6 items-center justify-center rounded-lg bg-amber-500 text-black shadow">
                                    <UploadCloud className="size-3.5" />
                                </div>
                            </>
                        ) : (
                            <>
                                <HardDrive className="size-9 text-primary animate-pulse" />
                                <div className="absolute -bottom-1 -right-1 flex size-6 items-center justify-center rounded-lg bg-primary text-white shadow">
                                    <Database className="size-3.5" />
                                </div>
                            </>
                        )}
                    </div>
                </div>

                {/* Main Titles */}
                <h3 className="text-xl sm:text-2xl font-extrabold tracking-tight text-white mt-3">
                    {isSuccess
                        ? "הפעולה הושלמה בהצלחה!"
                        : isRestore
                          ? "משחזר נתונים ומסד נתונים..."
                          : "יוצר גיבוי מערכת חדש..."}
                </h3>
                <p className="text-xs text-slate-300/80 mt-1 max-w-sm mx-auto" dir="rtl">
                    {isRestore
                        ? "האתר ננעל זמנית למצב תחזוקה למניעת שיבושים, וייפתח אוטומטית מיד עם סיום הפעולה."
                        : "מתבצעת דחיסה מלאה ואימות של מסד הנתונים והתמונות. אנא המתן לסיום."}
                </p>

                {/* Step-by-Step Animated Checklist */}
                <div className="mt-5 space-y-2 text-start rounded-2xl border border-white/5 bg-black/30 p-4" dir="rtl">
                    {steps.map((s, idx) => {
                        const isDone = isSuccess || currentStep > idx + 1;
                        const isCurrent = !isSuccess && currentStep === idx + 1;

                        return (
                            <div
                                key={s.id}
                                className={`flex items-center gap-3 text-xs transition-colors duration-200 ${
                                    isDone
                                        ? "text-emerald-400"
                                        : isCurrent
                                          ? "text-amber-300 font-semibold"
                                          : "text-slate-500"
                                }`}
                            >
                                <div className="flex size-5 shrink-0 items-center justify-center">
                                    {isDone ? (
                                        <CheckCircle2 className="size-4 text-emerald-400" />
                                    ) : isCurrent ? (
                                        <Loader2 className="size-4 animate-spin text-amber-400" />
                                    ) : (
                                        <div className="size-2 rounded-full bg-slate-700" />
                                    )}
                                </div>
                                <span className="truncate">{s.text}</span>
                            </div>
                        );
                    })}
                </div>

                {/* Safety note / warning footer */}
                <div className="mt-4 flex items-center justify-center gap-2 text-[11px] text-slate-400" dir="rtl">
                    <ShieldCheck className="size-3.5 text-amber-400/80 shrink-0" />
                    <span>תהליך מאובטח — נא להשאיר את הדפדפן פתוח עד לסיום</span>
                </div>
            </div>
        </div>,
        document.body
    );
}
