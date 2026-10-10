"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useLocale } from "next-intl";
import {
    Accessibility,
    Check,
    Contrast,
    Eye,
    MousePointer,
    Pause,
    RotateCcw,
    Sparkles,
    SunMedium,
    Type,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";

interface A11yState {
    textSize: "normal" | "lg" | "xl";
    highContrast: boolean;
    invertColors: boolean;
    grayscale: boolean;
    readableFont: boolean;
    highlightLinks: boolean;
    bigCursor: boolean;
    stopAnimations: boolean;
}

const DEFAULT_STATE: A11yState = {
    textSize: "normal",
    highContrast: false,
    invertColors: false,
    grayscale: false,
    readableFont: false,
    highlightLinks: false,
    bigCursor: false,
    stopAnimations: false,
};

const STORAGE_KEY = "store_a11y_settings_v1";

export function AccessibilityWidget() {
    const locale = useLocale();
    const isAr = locale === "ar";
    const [open, setOpen] = useState(false);
    const [state, setState] = useState<A11yState>(DEFAULT_STATE);
    const [mounted, setMounted] = useState(false);

    // Load saved settings
    useEffect(() => {
        setMounted(true);
        try {
            const raw = localStorage.getItem(STORAGE_KEY);
            if (raw) {
                const parsed = JSON.parse(raw) as Partial<A11yState>;
                setState((prev) => ({ ...prev, ...parsed }));
            }
        } catch {
            // Ignore storage errors
        }
    }, []);

    // Apply classes to documentElement
    useEffect(() => {
        if (!mounted) return;
        const root = document.documentElement;

        root.classList.toggle("a11y-text-lg", state.textSize === "lg");
        root.classList.toggle("a11y-text-xl", state.textSize === "xl");
        root.classList.toggle("a11y-high-contrast", state.highContrast);
        root.classList.toggle("a11y-invert", state.invertColors);
        root.classList.toggle("a11y-grayscale", state.grayscale);
        root.classList.toggle("a11y-readable-font", state.readableFont);
        root.classList.toggle("a11y-highlight-links", state.highlightLinks);
        root.classList.toggle("a11y-big-cursor", state.bigCursor);
        root.classList.toggle("a11y-stop-anim", state.stopAnimations);

        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
        } catch {
            // Ignore storage errors
        }
    }, [state, mounted]);

    const toggle = (key: keyof Omit<A11yState, "textSize">) => {
        setState((prev) => ({ ...prev, [key]: !prev[key] }));
    };

    const setTextSize = (size: "normal" | "lg" | "xl") => {
        setState((prev) => ({ ...prev, textSize: size }));
    };

    const resetAll = () => {
        setState(DEFAULT_STATE);
    };

    const hasActiveAdjustments =
        state.textSize !== "normal" ||
        state.highContrast ||
        state.invertColors ||
        state.grayscale ||
        state.readableFont ||
        state.highlightLinks ||
        state.bigCursor ||
        state.stopAnimations;

    return (
        <>
            {/* Skip to main content link for keyboard navigation (WCAG 2.4.1) */}
            <a href="#main-content" className="skip-to-content">
                {isAr ? "الانتقال إلى المحتوى الرئيسي" : "דלג לתוכן מרכזי"}
            </a>

            {/* Accessibility floating toggle button */}
            <aside aria-label={isAr ? "إمكانية الوصول" : "כלי נגישות"}>
                <button
                    type="button"
                    onClick={() => setOpen(true)}
                    className="fixed bottom-20 left-4 z-40 flex size-12 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg transition-transform hover:scale-105 active:scale-95 focus:outline-none focus:ring-4 focus:ring-primary/40 md:bottom-6"
                    aria-label={isAr ? "فتح قائمة إمكانية الوصول" : "פתח תפריט נגישות"}
                    title={isAr ? "إمكانية الوصول (ת״י 5568)" : "סרגל נגישות (ת״י 5568)"}
                >
                    <Accessibility className="size-6" />
                    {hasActiveAdjustments && (
                        <span className="absolute -top-1 -right-1 flex size-4 items-center justify-center rounded-full bg-emerald-500 text-[10px] font-bold text-white ring-2 ring-background">
                            ✓
                        </span>
                    )}
                </button>
            </aside>

            {/* Accessibility Modal Dialog */}
            <Dialog open={open} onOpenChange={setOpen}>
                <DialogContent className="max-w-md rounded-3xl p-6 sm:max-w-lg">
                    <DialogHeader className="text-start">
                        <div className="flex items-center gap-2">
                            <span className="flex size-9 items-center justify-center rounded-xl bg-primary/10 text-primary">
                                <Accessibility className="size-5" />
                            </span>
                            <div>
                                <DialogTitle className="font-display text-lg font-bold">
                                    {isAr ? "إمكانية الوصول للموقع" : "תפריט נגישות האתר"}
                                </DialogTitle>
                                <DialogDescription className="text-xs">
                                    {isAr
                                        ? "تعديل الموقع وفقًا للمعيار الإسرائيلي ת״י 5568 (AA)"
                                        : "התאמת האתר לפי תקן ישראלי ת״י 5568 ו-WCAG 2.1 AA"}
                                </DialogDescription>
                            </div>
                        </div>
                    </DialogHeader>

                    <div className="mt-4 grid gap-3">
                        {/* Text size controls */}
                        <div className="rounded-2xl border border-border/80 bg-muted/40 p-3.5">
                            <div className="mb-2 flex items-center justify-between text-xs font-semibold">
                                <span className="flex items-center gap-1.5">
                                    <Type className="size-4 text-primary" />
                                    {isAr ? "حجم الخط" : "גודל הטקסט"}
                                </span>
                                <span className="text-muted-foreground">
                                    {state.textSize === "normal"
                                        ? isAr
                                            ? "عادي"
                                            : "רגיל"
                                        : state.textSize === "lg"
                                            ? "+15%"
                                            : "+30%"}
                                </span>
                            </div>
                            <div className="grid grid-cols-3 gap-2">
                                <Button
                                    type="button"
                                    size="sm"
                                    variant={state.textSize === "normal" ? "default" : "outline"}
                                    onClick={() => setTextSize("normal")}
                                    className="rounded-xl text-xs"
                                >
                                    {isAr ? "א (רגיל)" : "א (רגיל)"}
                                </Button>
                                <Button
                                    type="button"
                                    size="sm"
                                    variant={state.textSize === "lg" ? "default" : "outline"}
                                    onClick={() => setTextSize("lg")}
                                    className="rounded-xl text-sm font-semibold"
                                >
                                    א+
                                </Button>
                                <Button
                                    type="button"
                                    size="sm"
                                    variant={state.textSize === "xl" ? "default" : "outline"}
                                    onClick={() => setTextSize("xl")}
                                    className="rounded-xl text-base font-bold"
                                >
                                    א++
                                </Button>
                            </div>
                        </div>

                        {/* Accessibility toggles grid */}
                        <div className="grid grid-cols-2 gap-2 text-xs">
                            <button
                                type="button"
                                onClick={() => toggle("highContrast")}
                                className={`flex items-center justify-between rounded-xl border p-3 text-start transition-colors ${state.highContrast
                                        ? "border-primary bg-primary/10 font-bold text-primary"
                                        : "border-border/80 bg-card hover:bg-muted/50"
                                    }`}
                            >
                                <span className="flex items-center gap-2">
                                    <Contrast className="size-4 shrink-0" />
                                    <span>{isAr ? "تباين عالي" : "ניגודיות גבוהה"}</span>
                                </span>
                                {state.highContrast && <Check className="size-4 shrink-0" />}
                            </button>

                            <button
                                type="button"
                                onClick={() => toggle("invertColors")}
                                className={`flex items-center justify-between rounded-xl border p-3 text-start transition-colors ${state.invertColors
                                        ? "border-primary bg-primary/10 font-bold text-primary"
                                        : "border-border/80 bg-card hover:bg-muted/50"
                                    }`}
                            >
                                <span className="flex items-center gap-2">
                                    <SunMedium className="size-4 shrink-0" />
                                    <span>{isAr ? "عكس الألوان" : "ניגודיות הפוכה"}</span>
                                </span>
                                {state.invertColors && <Check className="size-4 shrink-0" />}
                            </button>

                            <button
                                type="button"
                                onClick={() => toggle("grayscale")}
                                className={`flex items-center justify-between rounded-xl border p-3 text-start transition-colors ${state.grayscale
                                        ? "border-primary bg-primary/10 font-bold text-primary"
                                        : "border-border/80 bg-card hover:bg-muted/50"
                                    }`}
                            >
                                <span className="flex items-center gap-2">
                                    <Eye className="size-4 shrink-0" />
                                    <span>{isAr ? "تدرج رمادي" : "גווני אפור"}</span>
                                </span>
                                {state.grayscale && <Check className="size-4 shrink-0" />}
                            </button>

                            <button
                                type="button"
                                onClick={() => toggle("readableFont")}
                                className={`flex items-center justify-between rounded-xl border p-3 text-start transition-colors ${state.readableFont
                                        ? "border-primary bg-primary/10 font-bold text-primary"
                                        : "border-border/80 bg-card hover:bg-muted/50"
                                    }`}
                            >
                                <span className="flex items-center gap-2">
                                    <Type className="size-4 shrink-0" />
                                    <span>{isAr ? "خط سهل القراءة" : "גופן קריא"}</span>
                                </span>
                                {state.readableFont && <Check className="size-4 shrink-0" />}
                            </button>

                            <button
                                type="button"
                                onClick={() => toggle("highlightLinks")}
                                className={`flex items-center justify-between rounded-xl border p-3 text-start transition-colors ${state.highlightLinks
                                        ? "border-primary bg-primary/10 font-bold text-primary"
                                        : "border-border/80 bg-card hover:bg-muted/50"
                                    }`}
                            >
                                <span className="flex items-center gap-2">
                                    <Sparkles className="size-4 shrink-0" />
                                    <span>{isAr ? "تمييز الروابط" : "הדגשת קישורים"}</span>
                                </span>
                                {state.highlightLinks && <Check className="size-4 shrink-0" />}
                            </button>

                            <button
                                type="button"
                                onClick={() => toggle("bigCursor")}
                                className={`flex items-center justify-between rounded-xl border p-3 text-start transition-colors ${state.bigCursor
                                        ? "border-primary bg-primary/10 font-bold text-primary"
                                        : "border-border/80 bg-card hover:bg-muted/50"
                                    }`}
                            >
                                <span className="flex items-center gap-2">
                                    <MousePointer className="size-4 shrink-0" />
                                    <span>{isAr ? "مؤشر كبير" : "סמן עכבר מוגדל"}</span>
                                </span>
                                {state.bigCursor && <Check className="size-4 shrink-0" />}
                            </button>

                            <button
                                type="button"
                                onClick={() => toggle("stopAnimations")}
                                className={`col-span-2 flex items-center justify-between rounded-xl border p-3 text-start transition-colors ${state.stopAnimations
                                        ? "border-primary bg-primary/10 font-bold text-primary"
                                        : "border-border/80 bg-card hover:bg-muted/50"
                                    }`}
                            >
                                <span className="flex items-center gap-2">
                                    <Pause className="size-4 shrink-0" />
                                    <span>{isAr ? "إيقاف الرسوم المتحركة والوميض" : "ביטול הבהובים ואנימציות"}</span>
                                </span>
                                {state.stopAnimations && <Check className="size-4 shrink-0" />}
                            </button>
                        </div>
                    </div>

                    {/* Actions and statement link */}
                    <div className="mt-4 flex flex-col gap-2 pt-2 border-t border-border/80">
                        <div className="flex items-center justify-between">
                            <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                onClick={resetAll}
                                disabled={!hasActiveAdjustments}
                                className="gap-1.5 text-xs text-muted-foreground hover:text-foreground"
                            >
                                <RotateCcw className="size-3.5" />
                                {isAr ? "إعادة تعيين الكل" : "איפוס כל ההתאמות"}
                            </Button>
                            <Button
                                type="button"
                                size="sm"
                                onClick={() => setOpen(false)}
                                className="rounded-xl px-5"
                            >
                                {isAr ? "إغلاق" : "סגירה"}
                            </Button>
                        </div>
                        <div className="text-center pt-1">
                            <Link
                                href="/accessibility"
                                onClick={() => setOpen(false)}
                                className="text-xs font-semibold text-primary underline underline-offset-4 hover:opacity-80"
                            >
                                {isAr ? "قراءة تصريح إمكانية الوصول الكامل ←" : "צפייה בהצהרת הנגישות המלאה של האתר ←"}
                            </Link>
                        </div>
                    </div>
                </DialogContent>
            </Dialog>
        </>
    );
}
