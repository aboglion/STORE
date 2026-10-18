"use client";

import Image from "next/image";
import { useCallback, useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import {
    CheckCircle2,
    Download,
    PlusSquare,
    Share,
    Smartphone,
    Sparkles,
    X,
    Zap,
} from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const DISMISS_KEY = "store_pwa_prompt_dismissed_at";
const DISMISS_DURATION_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

interface BeforeInstallPromptEvent extends Event {
    readonly platforms: string[];
    readonly userChoice: Promise<{
        outcome: "accepted" | "dismissed";
        platform: string;
    }>;
    prompt(): Promise<void>;
}

/**
 * Triggers the install prompt modal manually from any button in the app.
 */
export function triggerPwaInstall() {
    if (typeof window !== "undefined") {
        window.dispatchEvent(new CustomEvent("open-pwa-install"));
    }
}

export function InstallPrompt() {
    const t = useTranslations("pwa");

    const [deferredPrompt, setDeferredPrompt] =
        useState<BeforeInstallPromptEvent | null>(null);
    const [isOpen, setIsOpen] = useState(false);
    const [isIos, setIsIos] = useState(false);
    const [isStandalone, setIsStandalone] = useState(false);
    const [isMobile, setIsMobile] = useState(false);
    const [mounted, setMounted] = useState(false);

    const handleDismiss = useCallback(() => {
        setIsOpen(false);
        try {
            localStorage.setItem(DISMISS_KEY, Date.now().toString());
        } catch {
            // Ignore storage restrictions
        }
    }, []);

    // Check device and environment
    useEffect(() => {
        setMounted(true);

        if (typeof window === "undefined") return;

        // 1. Detect standalone mode
        const standaloneCheck =
            window.matchMedia("(display-mode: standalone)").matches ||
            (window.navigator as unknown as { standalone?: boolean }).standalone === true ||
            document.referrer.includes("android-app://");

        setIsStandalone(standaloneCheck);
        if (standaloneCheck) return; // Already installed!

        // 2. Detect mobile device
        const ua = navigator.userAgent || "";
        const isIosDevice =
            /iPad|iPhone|iPod/.test(ua) &&
            !(window as unknown as { MSStream?: unknown }).MSStream;
        setIsIos(isIosDevice);

        const isMobileDevice =
            /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(ua) ||
            (window.innerWidth <= 840 &&
                ("ontouchstart" in window || navigator.maxTouchPoints > 0));
        setIsMobile(isMobileDevice);

        // 3. Listen for Android Chrome beforeinstallprompt event
        const handleBeforeInstallPrompt = (e: Event) => {
            e.preventDefault();
            const promptEvent = e as BeforeInstallPromptEvent;
            setDeferredPrompt(promptEvent);

            // Auto-open on mobile if not dismissed recently
            if (isMobileDevice) {
                checkAndAutoOpen();
            }
        };

        window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);

        // 4. Listen for appinstalled event
        const handleAppInstalled = () => {
            setDeferredPrompt(null);
            setIsOpen(false);
            setIsStandalone(true);
            toast.success(t("installedSuccess"));
        };

        window.addEventListener("appinstalled", handleAppInstalled);

        // 5. Listen for manual trigger events from header/footer
        const handleManualOpen = () => {
            setIsOpen(true);
        };

        window.addEventListener("open-pwa-install", handleManualOpen);

        // 6. For iOS mobile: since iOS never fires beforeinstallprompt, auto-open if mobile
        if (isMobileDevice && isIosDevice) {
            checkAndAutoOpen();
        }

        function checkAndAutoOpen() {
            try {
                const dismissedAt = localStorage.getItem(DISMISS_KEY);
                if (dismissedAt) {
                    const elapsed = Date.now() - parseInt(dismissedAt, 10);
                    if (elapsed < DISMISS_DURATION_MS) {
                        return; // Snoozed
                    }
                }
            } catch {
                // Ignore localStorage errors
            }

            // Delay to allow the user to see the page first
            const timer = setTimeout(() => {
                setIsOpen(true);
            }, 2000);

            return () => clearTimeout(timer);
        }

        return () => {
            window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
            window.removeEventListener("appinstalled", handleAppInstalled);
            window.removeEventListener("open-pwa-install", handleManualOpen);
        };
    }, [t]);

    // Handle Escape key
    useEffect(() => {
        if (!isOpen) return;

        const onKeyDown = (e: KeyboardEvent) => {
            if (e.key === "Escape") {
                handleDismiss();
            }
        };

        window.addEventListener("keydown", onKeyDown);
        return () => window.removeEventListener("keydown", onKeyDown);
    }, [isOpen, handleDismiss]);

    const handleInstallClick = async () => {
        if (!deferredPrompt) return;

        try {
            await deferredPrompt.prompt();
            const choiceResult = await deferredPrompt.userChoice;

            if (choiceResult.outcome === "accepted") {
                toast.success(t("installedSuccess"));
                setDeferredPrompt(null);
                setIsOpen(false);
            } else {
                handleDismiss();
            }
        } catch (err) {
            console.error("Install prompt error:", err);
            handleDismiss();
        }
    };

    // Don't render if not mounted, already running standalone, or not open
    if (!mounted || isStandalone || !isOpen) {
        return null;
    }

    return (
        <div
            role="presentation"
            onClick={handleDismiss}
            className="fixed inset-0 z-50 flex items-end justify-center bg-black/45 backdrop-blur-xs p-3 pb-safe sm:items-center sm:p-4 animate-in fade-in duration-200"
        >
            <aside
                role="dialog"
                aria-modal="true"
                aria-labelledby="pwa-prompt-title"
                onClick={(e) => e.stopPropagation()}
                className="relative w-full max-w-md overflow-hidden rounded-3xl border border-primary/25 bg-background/95 p-5 shadow-2xl backdrop-blur-2xl ring-1 ring-black/5 dark:ring-white/10 animate-in slide-in-from-bottom-8 duration-300"
            >
                {/* Decorative warm glow backdrop */}
                <div
                    aria-hidden="true"
                    className="absolute -top-12 -left-12 size-36 rounded-full bg-primary/15 blur-2xl pointer-events-none"
                />

                {/* Close Button */}
                <button
                    type="button"
                    onClick={handleDismiss}
                    aria-label={t("laterButton")}
                    className="absolute top-4 left-4 z-10 flex size-8 items-center justify-center rounded-full bg-muted/80 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground active:scale-95"
                >
                    <X className="size-4" />
                </button>

                {/* Header with App Icon */}
                <div className="flex items-start gap-3.5 pr-2">
                    <div className="relative size-13 shrink-0 overflow-hidden rounded-2xl border border-primary/20 bg-primary/10 shadow-md">
                        <Image
                            src="/icon-192.png"
                            alt="App Icon"
                            width={52}
                            height={52}
                            className="size-full object-cover"
                        />
                    </div>

                    <div className="flex-1 min-w-0 pr-6">
                        <div className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2.5 py-0.5 text-[10px] font-bold text-primary">
                            <Sparkles className="size-3" />
                            <span>{t("badge")}</span>
                        </div>
                        <h2
                            id="pwa-prompt-title"
                            className="mt-1 font-display text-base font-extrabold tracking-tight text-foreground sm:text-lg"
                        >
                            {isIos ? t("iosTitle") : t("title")}
                        </h2>
                    </div>
                </div>

                {/* Body Content */}
                {isIos ? (
                    // iOS Safari step-by-step installation instructions
                    <div className="mt-3.5 space-y-2.5 text-xs">
                        <p className="text-muted-foreground leading-snug">
                            {t("iosSubtitle")}
                        </p>

                        <div className="space-y-2 rounded-2xl bg-muted/50 p-3 border border-border/50">
                            {/* Step 1 */}
                            <div className="flex items-center gap-2.5">
                                <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-primary/15 text-primary font-bold text-xs">
                                    1
                                </span>
                                <div className="flex flex-1 items-center justify-between text-foreground">
                                    <span>{t("iosStep1")}</span>
                                    <span className="flex size-6 items-center justify-center rounded-md bg-background border border-border text-primary shadow-xs">
                                        <Share className="size-3.5" />
                                    </span>
                                </div>
                            </div>

                            {/* Step 2 */}
                            <div className="flex items-center gap-2.5">
                                <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-primary/15 text-primary font-bold text-xs">
                                    2
                                </span>
                                <div className="flex flex-1 items-center justify-between text-foreground">
                                    <span>{t("iosStep2")}</span>
                                    <span className="flex size-6 items-center justify-center rounded-md bg-background border border-border text-primary shadow-xs">
                                        <PlusSquare className="size-3.5" />
                                    </span>
                                </div>
                            </div>

                            {/* Step 3 */}
                            <div className="flex items-center gap-2.5">
                                <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-primary/15 text-primary font-bold text-xs">
                                    3
                                </span>
                                <div className="flex flex-1 items-center justify-between text-foreground">
                                    <span>{t("iosStep3")}</span>
                                    <CheckCircle2 className="size-4 text-emerald-600 dark:text-emerald-400" />
                                </div>
                            </div>
                        </div>

                        <div className="pt-1">
                            <Button
                                type="button"
                                onClick={handleDismiss}
                                className="w-full rounded-2xl py-2.5 text-sm font-bold shadow-md shadow-primary/20"
                            >
                                {t("gotIt")}
                            </Button>
                        </div>
                    </div>
                ) : (
                    // Android / Chromium / Generic mobile prompt
                    <div className="mt-3 space-y-3">
                        <p className="text-xs text-muted-foreground leading-relaxed">
                            {t("subtitle")}
                        </p>

                        {/* Benefits list */}
                        <div className="grid grid-cols-2 gap-2 text-[11px] text-foreground">
                            <div className="flex items-center gap-1.5 rounded-xl bg-muted/40 p-2">
                                <Zap className="size-3.5 shrink-0 text-amber-500" />
                                <span className="font-medium truncate">{t("benefitFast")}</span>
                            </div>
                            <div className="flex items-center gap-1.5 rounded-xl bg-muted/40 p-2">
                                <Smartphone className="size-3.5 shrink-0 text-primary" />
                                <span className="font-medium truncate">{t("benefitStorage")}</span>
                            </div>
                        </div>

                        {/* Actions */}
                        <div className="flex items-center gap-2 pt-1">
                            {deferredPrompt ? (
                                <Button
                                    type="button"
                                    onClick={handleInstallClick}
                                    className="flex-1 gap-2 rounded-2xl py-2.5 text-xs sm:text-sm font-bold shadow-lg shadow-primary/25 transition-transform active:scale-95"
                                >
                                    <Download className="size-4 animate-bounce" />
                                    <span>{t("installButton")}</span>
                                </Button>
                            ) : (
                                <div className="w-full text-center py-1">
                                    <p className="text-[11px] text-muted-foreground mb-2">
                                        {isMobile
                                            ? t("androidMenuHint")
                                            : t("subtitle")}
                                    </p>
                                    <Button
                                        type="button"
                                        onClick={handleDismiss}
                                        className="w-full rounded-2xl py-2 text-xs font-bold"
                                    >
                                        {t("gotIt")}
                                    </Button>
                                </div>
                            )}

                            {deferredPrompt && (
                                <Button
                                    type="button"
                                    variant="ghost"
                                    onClick={handleDismiss}
                                    className="rounded-2xl px-3 text-xs text-muted-foreground hover:text-foreground"
                                >
                                    {t("laterButton")}
                                </Button>
                            )}
                        </div>
                    </div>
                )}
            </aside>
        </div>
    );
}

/**
 * A small install trigger button that can be embedded into footers, headers, or menus.
 */
export function PwaInstallTriggerButton({
    className,
    variant = "outline",
}: {
    className?: string;
    variant?: "default" | "outline" | "ghost";
}) {
    const t = useTranslations("pwa");
    const [isStandalone, setIsStandalone] = useState(false);
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
        if (typeof window === "undefined") return;
        const standaloneCheck =
            window.matchMedia("(display-mode: standalone)").matches ||
            (window.navigator as unknown as { standalone?: boolean }).standalone === true ||
            document.referrer.includes("android-app://");
        setIsStandalone(standaloneCheck);
    }, []);

    if (!mounted || isStandalone) {
        return null;
    }

    return (
        <button
            type="button"
            onClick={triggerPwaInstall}
            className={cn(
                "inline-flex items-center gap-2 rounded-xl px-3 py-1.5 text-xs font-semibold transition-all hover:scale-102 active:scale-98",
                variant === "outline" &&
                    "border border-primary/30 bg-primary/5 text-primary hover:bg-primary/10",
                variant === "default" &&
                    "bg-primary text-primary-foreground shadow-sm hover:bg-primary/90",
                variant === "ghost" &&
                    "text-muted-foreground hover:bg-muted hover:text-foreground",
                className
            )}
        >
            <Smartphone className="size-3.5 text-primary" />
            <span>{t("installOnPhone")}</span>
        </button>
    );
}
