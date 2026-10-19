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

let globalDeferredPrompt: BeforeInstallPromptEvent | null = null;

// Capture early beforeinstallprompt at module level
if (typeof window !== "undefined") {
    window.addEventListener("beforeinstallprompt", (e) => {
        e.preventDefault();
        globalDeferredPrompt = e as BeforeInstallPromptEvent;
        window.dispatchEvent(new CustomEvent("pwa-prompt-available"));
    });
}

/**
 * Triggers the install prompt modal manually from any button in the app.
 */
export async function triggerPwaInstall() {
    if (typeof window === "undefined") return;

    // Check if already in standalone mode
    const isStandalone =
        window.matchMedia("(display-mode: standalone)").matches ||
        (window.navigator as unknown as { standalone?: boolean }).standalone === true ||
        document.referrer.includes("android-app://");

    if (isStandalone) {
        toast.info("האפליקציה כבר מותקנת במכשיר שלך ופועלת כאפליקציית ווב! 📱");
        return;
    }

    // 0. If accessed via non-secure HTTP on domain, redirect to HTTPS where Chrome enables native PWA installation!
    const isHttp =
        window.location.protocol === "http:" &&
        window.location.hostname !== "localhost" &&
        window.location.hostname !== "127.0.0.1";

    if (isHttp) {
        window.location.href = `https://${window.location.host}${window.location.pathname}${window.location.search}${window.location.hash}`;
        return;
    }

    // 1. Check if native prompt is already captured
    const promptEvent =
        (window as unknown as { __pwaDeferredPrompt?: BeforeInstallPromptEvent | null }).__pwaDeferredPrompt ||
        globalDeferredPrompt;

    if (promptEvent) {
        try {
            await promptEvent.prompt();
            const choice = await promptEvent.userChoice;
            if (choice?.outcome === "accepted") {
                globalDeferredPrompt = null;
                (window as unknown as { __pwaDeferredPrompt?: BeforeInstallPromptEvent | null }).__pwaDeferredPrompt = null;
                toast.success("האפליקציה הותקנה בהצלחה במסך הבית שלך! 🎉");
            }
            return;
        } catch (err) {
            console.warn("[PWA] Error calling prompt():", err);
        }
    }

    // 2. Wait briefly (up to 800ms) in case beforeinstallprompt is firing right now on page load
    const promptPromise = new Promise<BeforeInstallPromptEvent | null>((resolve) => {
        const timer = setTimeout(() => resolve(null), 800);
        const onPrompt = () => {
            clearTimeout(timer);
            window.removeEventListener("pwa-prompt-available", onPrompt);
            resolve(
                (window as unknown as { __pwaDeferredPrompt?: BeforeInstallPromptEvent | null }).__pwaDeferredPrompt ||
                globalDeferredPrompt
            );
        };
        window.addEventListener("pwa-prompt-available", onPrompt);
    });

    const incoming = await promptPromise;
    if (incoming) {
        try {
            await incoming.prompt();
            const choice = await incoming.userChoice;
            if (choice?.outcome === "accepted") {
                globalDeferredPrompt = null;
                (window as unknown as { __pwaDeferredPrompt?: BeforeInstallPromptEvent | null }).__pwaDeferredPrompt = null;
                toast.success("האפליקציה הותקנה בהצלחה במסך הבית שלך! 🎉");
            }
            return;
        } catch (err) {
            console.warn("[PWA] prompt error:", err);
        }
    }

    // 3. Fallback: If native prompt is unavailable (e.g. iOS Safari or in-app browser), open guidance modal
    window.dispatchEvent(new CustomEvent("open-pwa-install"));
}

export function InstallPrompt() {
    const t = useTranslations("pwa");

    const [deferredPrompt, setDeferredPrompt] =
        useState<BeforeInstallPromptEvent | null>(null);
    const [isOpen, setIsOpen] = useState(false);
    const [isIos, setIsIos] = useState(false);
    const [isStandalone, setIsStandalone] = useState(false);
    const [isMobile, setIsMobile] = useState(false);
    const [isInsecureHttp, setIsInsecureHttp] = useState(false);
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

        // Register Service Worker in production/supporting environments
        if ("serviceWorker" in navigator && process.env.NODE_ENV === "production") {
            navigator.serviceWorker.register("/sw.js").catch(() => {});
        }

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

        const isHttp =
            window.location.protocol === "http:" &&
            window.location.hostname !== "localhost" &&
            window.location.hostname !== "127.0.0.1";
        setIsInsecureHttp(isHttp);

        // 3. Listen for Android Chrome beforeinstallprompt event
        const handleBeforeInstallPrompt = (e: Event) => {
            e.preventDefault();
            const promptEvent = e as BeforeInstallPromptEvent;
            globalDeferredPrompt = promptEvent;
            setDeferredPrompt(promptEvent);

            // Auto-open on mobile if not dismissed recently
            if (isMobileDevice) {
                checkAndAutoOpen();
            }
        };

        // Sync with prompt captured before mount
        const initialPrompt =
            (window as unknown as { __pwaDeferredPrompt?: BeforeInstallPromptEvent | null }).__pwaDeferredPrompt ||
            globalDeferredPrompt;
        if (initialPrompt) {
            setDeferredPrompt(initialPrompt);
        }

        const handlePromptAvailable = () => {
            const currentPrompt =
                (window as unknown as { __pwaDeferredPrompt?: BeforeInstallPromptEvent | null }).__pwaDeferredPrompt ||
                globalDeferredPrompt;
            if (currentPrompt) {
                setDeferredPrompt(currentPrompt);
            }
        };
        window.addEventListener("pwa-prompt-available", handlePromptAvailable);

        window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);

        // 4. Listen for appinstalled event
        const handleAppInstalled = () => {
            setDeferredPrompt(null);
            globalDeferredPrompt = null;
            (window as unknown as { __pwaDeferredPrompt?: BeforeInstallPromptEvent | null }).__pwaDeferredPrompt = null;
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
            window.removeEventListener("pwa-prompt-available", handlePromptAvailable);
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
        const promptToUse =
            deferredPrompt ||
            (window as unknown as { __pwaDeferredPrompt?: BeforeInstallPromptEvent | null }).__pwaDeferredPrompt ||
            globalDeferredPrompt;

        if (!promptToUse) return;

        try {
            await promptToUse.prompt();
            const choiceResult = await promptToUse.userChoice;

            if (choiceResult.outcome === "accepted") {
                toast.success(t("installedSuccess"));
                setDeferredPrompt(null);
                globalDeferredPrompt = null;
                (window as unknown as { __pwaDeferredPrompt?: BeforeInstallPromptEvent | null }).__pwaDeferredPrompt = null;
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
                                <div className="w-full text-center py-1 space-y-2.5">
                                    {isInsecureHttp ? (
                                        <>
                                            <p className="text-xs text-amber-600 dark:text-amber-400 font-medium">
                                                🔒 כדי להתקין את האפליקציה בטלפון יש לעבור לכתובת מאובטחת (HTTPS)
                                            </p>
                                            <Button
                                                type="button"
                                                onClick={() => {
                                                    window.location.href = `https://${window.location.host}${window.location.pathname}${window.location.search}${window.location.hash}`;
                                                }}
                                                className="w-full rounded-2xl py-2.5 text-xs sm:text-sm font-bold shadow-md shadow-primary/25"
                                            >
                                                מעבר לגרסה מאובטחת והתקנה 🚀
                                            </Button>
                                        </>
                                    ) : (
                                        <>
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
                                        </>
                                    )}
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

/**
 * A prominent, modern, dismissible banner that invites mobile users to install the Web App.
 */
export function PwaInstallBanner() {
    const t = useTranslations("pwa");
    const [isStandalone, setIsStandalone] = useState(false);
    const [isMobile, setIsMobile] = useState(false);
    const [isDismissed, setIsDismissed] = useState(false);
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
        if (typeof window === "undefined") return;

        const standaloneCheck =
            window.matchMedia("(display-mode: standalone)").matches ||
            (window.navigator as unknown as { standalone?: boolean }).standalone === true ||
            document.referrer.includes("android-app://");
        setIsStandalone(standaloneCheck);

        const ua = navigator.userAgent || "";
        const mobileCheck =
            /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(ua) ||
            window.innerWidth <= 840;
        setIsMobile(mobileCheck);

        const dismissedSession = sessionStorage.getItem("pwa_banner_dismissed");
        if (dismissedSession) {
            setIsDismissed(true);
        }
    }, []);

    if (!mounted || isStandalone || isDismissed || !isMobile) return null;

    const handleDismiss = () => {
        setIsDismissed(true);
        try {
            sessionStorage.setItem("pwa_banner_dismissed", "1");
        } catch {
            // Ignore storage restrictions
        }
    };

    return (
        <div className="relative mx-auto w-full max-w-5xl px-4 pt-2.5 pb-1">
            <div className="flex items-center justify-between gap-3 rounded-2xl border border-primary/25 bg-gradient-to-r from-primary/10 via-card to-card p-2.5 sm:p-3 shadow-soft backdrop-blur-md">
                <div className="flex items-center gap-2.5 min-w-0">
                    <div className="relative size-10 shrink-0 overflow-hidden rounded-xl border border-primary/25 bg-background shadow-xs">
                        <Image
                            src="/icon-192.png"
                            alt="App Icon"
                            width={40}
                            height={40}
                            className="size-full object-cover"
                        />
                    </div>
                    <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                            <h3 className="text-xs font-bold text-foreground truncate">{t("bannerTitle")}</h3>
                            <span className="inline-flex rounded-full bg-primary/15 px-1.5 py-0.2 text-[9px] font-extrabold text-primary">PWA</span>
                        </div>
                        <p className="text-[11px] text-muted-foreground truncate">{t("bannerSubtitle")}</p>
                    </div>
                </div>

                <div className="flex items-center gap-1.5 shrink-0">
                    <Button
                        type="button"
                        size="sm"
                        onClick={triggerPwaInstall}
                        className="h-8 rounded-xl px-3 text-xs font-bold gap-1.5 shadow-sm"
                    >
                        <Download className="size-3.5" />
                        <span>{t("install")}</span>
                    </Button>
                    <button
                        type="button"
                        onClick={handleDismiss}
                        className="flex size-7 items-center justify-center rounded-full text-muted-foreground hover:bg-muted hover:text-foreground cursor-pointer"
                        aria-label={t("laterButton")}
                    >
                        <X className="size-3.5" />
                    </button>
                </div>
            </div>
        </div>
    );
}

/**
 * A header button that appears on mobile and desktop allowing direct web app installation.
 */
export function PwaInstallHeaderButton({ className }: { className?: string }) {
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

    if (!mounted || isStandalone) return null;

    return (
        <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={triggerPwaInstall}
            className={cn(
                "h-8 sm:h-9 rounded-full border-primary/30 bg-primary/5 text-xs font-bold text-primary hover:bg-primary/10 gap-1.5 px-2.5 sm:px-3 shadow-xs",
                className
            )}
            aria-label={t("installApp")}
        >
            <Download className="size-3.5 shrink-0 text-primary animate-pulse" />
            <span className="hidden sm:inline">{t("installApp")}</span>
            <span className="sm:hidden">{t("install")}</span>
        </Button>
    );
}
