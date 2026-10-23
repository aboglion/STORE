"use client";

import Image from "next/image";
import { useCallback, useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import {
    ArrowDown,
    Check,
    CheckCircle2,
    Download,
    Menu,
    MonitorSmartphone,
    Share,
    Smartphone,
    Sparkles,
    X,
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
import { cn } from "@/lib/utils";

interface BeforeInstallPromptEvent extends Event {
    readonly platforms: string[];
    readonly userChoice: Promise<{
        outcome: "accepted" | "dismissed";
        platform: string;
    }>;
    prompt(): Promise<void>;
}

type InstallPlatform = "ios" | "android" | "desktop";

let globalDeferredPrompt: BeforeInstallPromptEvent | null = null;

const GUIDE_OPEN_EVENT = "pwa-open-install-guide";

// Capture early beforeinstallprompt at module level
if (typeof window !== "undefined") {
    window.addEventListener("beforeinstallprompt", (e) => {
        e.preventDefault();
        globalDeferredPrompt = e as BeforeInstallPromptEvent;
        window.dispatchEvent(new CustomEvent("pwa-prompt-available"));
    });
    window.addEventListener("appinstalled", () => {
        globalDeferredPrompt = null;
    });
}

function getDeferredPrompt(): BeforeInstallPromptEvent | null {
    return (
        (window as unknown as { __pwaDeferredPrompt?: BeforeInstallPromptEvent | null }).__pwaDeferredPrompt ||
        globalDeferredPrompt
    );
}

function checkStandalone(): boolean {
    if (typeof window === "undefined") return false;
    return (
        window.matchMedia("(display-mode: standalone)").matches ||
        window.matchMedia("(display-mode: window-controls-overlay)").matches ||
        (window.navigator as unknown as { standalone?: boolean }).standalone === true ||
        document.referrer.includes("android-app://")
    );
}

function detectPlatform(): InstallPlatform {
    const ua = navigator.userAgent || "";
    const isIos =
        /iPad|iPhone|iPod/.test(ua) && !(window as unknown as { MSStream?: unknown }).MSStream;
    if (isIos) return "ios";
    if (/Android/i.test(ua)) return "android";
    return "desktop";
}

type InstallBrowser = "chrome" | "firefox" | "samsung" | "edge" | "other";

function detectBrowser(): InstallBrowser {
    const ua = navigator.userAgent || "";
    if (/Firefox\//i.test(ua) && !/Seamonkey/.test(ua)) return "firefox";
    if (/SamsungBrowser/i.test(ua)) return "samsung";
    if (/Edg\//i.test(ua)) return "edge";
    if (/Chrome\//i.test(ua) && !/CriOS/i.test(ua) && !/OPR\//i.test(ua)) return "chrome";
    if (/OPR\//i.test(ua)) return "other";
    return "other";
}

function isFirefox(): boolean {
    return detectBrowser() === "firefox";
}

async function tryNativePrompt(): Promise<"accepted" | "shown" | "none"> {
    const promptEvent = getDeferredPrompt();
    if (!promptEvent) return "none";
    try {
        await promptEvent.prompt();
        const choice = await promptEvent.userChoice;
        if (choice?.outcome === "accepted") {
            globalDeferredPrompt = null;
            (window as unknown as { __pwaDeferredPrompt?: BeforeInstallPromptEvent | null }).__pwaDeferredPrompt =
                null;
            return "accepted";
        }
        return "shown";
    } catch (err) {
        console.warn("[PWA] Error calling prompt():", err);
        return "none";
    }
}

function waitForPrompt(ms: number): Promise<boolean> {
    return new Promise<boolean>((resolve) => {
        const timer = setTimeout(() => {
            cleanup();
            resolve(Boolean(getDeferredPrompt()));
        }, ms);
        const onAvailable = () => {
            cleanup();
            resolve(Boolean(getDeferredPrompt()));
        };
        const cleanup = () => {
            clearTimeout(timer);
            window.removeEventListener("pwa-prompt-available", onAvailable);
        };
        window.addEventListener("pwa-prompt-available", onAvailable);
    });
}

function openGuideDialog(platform: InstallPlatform) {
    if (typeof window === "undefined") return;
    window.dispatchEvent(new CustomEvent<InstallPlatform>(GUIDE_OPEN_EVENT, { detail: platform }));
}

/**
 * Triggers the install experience: preferred native prompt, and if the browser
 * does not fire it (e.g. iOS Safari or Chrome suppressing prompts), opens a
 * clear step-by-step guide dialog instead of a forgettable toast.
 */
export async function triggerPwaInstall() {
    if (typeof window === "undefined") return;

    if (checkStandalone()) {
        toast.info("האפליקציה כבר מותקנת במכשיר שלך ופועלת כאפליקציית ווב! 📱");
        return;
    }

    const platform = detectPlatform();

    // Firefox and iOS do not support beforeinstallprompt at all — skip the
    // native prompt attempts and go straight to the visual guide.
    if (isFirefox() || platform === "ios") {
        openGuideDialog(platform);
        return;
    }

    // 1. Try the captured native prompt immediately
    const outcome = await tryNativePrompt();
    if (outcome === "accepted" || outcome === "shown") return;

    // 2. Wait briefly in case beforeinstallprompt is firing right on page load
    const available = await waitForPrompt(800);
    if (available) {
        const second = await tryNativePrompt();
        if (second === "accepted" || second === "shown") return;
    }

    // 3. Fallback: open the visual install guide dialog
    openGuideDialog(detectPlatform());
}

/**
 * A clear, platform-aware install guide. Opened automatically by
 * `triggerPwaInstall()` when the native prompt cannot be shown.
 */
const IOS_COACH_SEEN_KEY = "pwa_ios_coach_seen";

function InstallGuideDialog() {
    const t = useTranslations("pwa");
    const [open, setOpen] = useState(false);
    const [platform, setPlatform] = useState<InstallPlatform>("android");
    const [firefox, setFirefox] = useState(false);
    // On iOS we show a two-stage guide: first a "tap the share button" callout
    // that mimics the actual Safari button, then the numbered steps.
    const [iosStage, setIosStage] = useState<"coach" | "steps">("steps");

    const isIos = platform === "ios";
    const isDesktop = platform === "desktop";

    useEffect(() => {
        const onOpen = (e: Event) => {
            const detail = (e as CustomEvent<InstallPlatform>).detail;
            if (detail) setPlatform(detail);
            setOpen(true);
            setFirefox(isFirefox());
            setIosStage("steps");
            if (detail === "ios") {
                let seen = false;
                try {
                    seen = sessionStorage.getItem(IOS_COACH_SEEN_KEY) === "1";
                } catch {
                    /* storage might be blocked */
                }
                // Show the callout only the first time per session.
                if (!seen) {
                    setIosStage("coach");
                    try {
                        sessionStorage.setItem(IOS_COACH_SEEN_KEY, "1");
                    } catch {
                        /* ignore */
                    }
                }
            }
        };
        window.addEventListener(GUIDE_OPEN_EVENT, onOpen);
        return () => window.removeEventListener(GUIDE_OPEN_EVENT, onOpen);
    }, []);

    const handleInstallNow = useCallback(async () => {
        // Firefox and iOS cannot show a native prompt — acknowledge and close.
        if (firefox || isIos) {
            setOpen(false);
            return;
        }
        // If a native prompt is still available (e.g. desktop Chrome), use it.
        const outcome = await tryNativePrompt();
        if (outcome === "accepted" || outcome === "shown") {
            setOpen(false);
            return;
        }
        // Otherwise keep the guide open — the steps are the only way forward.
    }, [firefox, isIos]);

    // ----- iOS first stage: animated "tap the Share button" callout -----
    if (isIos && iosStage === "coach") {
        return (
            <Dialog open={open} onOpenChange={setOpen}>
                <DialogContent className="gap-4 sm:max-w-md">
                    <DialogHeader>
                        <div className="mx-auto flex size-14 items-center justify-center rounded-2xl border border-primary/20 bg-primary/10 shadow-sm">
                            <Smartphone className="size-7 text-primary" />
                        </div>
                        <DialogTitle className="text-center text-lg font-extrabold">
                            {t("iosTitle")}
                        </DialogTitle>
                        <DialogDescription className="text-center">
                            {t("iosSubtitle")}
                        </DialogDescription>
                    </DialogHeader>

                    {/* Fake Safari bottom bar + pulsing Share button */}
                    <div className="relative mx-auto w-full max-w-[280px]">
                        <div className="flex items-center justify-center gap-7 rounded-2xl border border-border bg-card px-6 py-4 shadow-lg">
                            <div className="flex size-11 items-center justify-center rounded-full bg-muted text-muted-foreground">
                                <Menu className="size-5" />
                            </div>
                            <div className="relative flex size-12 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-md">
                                <span className="absolute inset-0 -m-2 animate-ping rounded-full bg-primary/40" />
                                <Share className="size-5" />
                            </div>
                            <div className="flex size-11 items-center justify-center rounded-full bg-muted text-muted-foreground">
                                <Check className="size-5" />
                            </div>
                        </div>
                        <div className="absolute -bottom-5 left-1/2 -translate-x-1/2">
                            <ArrowDown className="size-5 animate-bounce text-primary" />
                        </div>
                    </div>

                    <p className="mx-auto max-w-xs text-center text-sm leading-relaxed text-muted-foreground">
                        {t("iosCoachHint")}
                    </p>

                    <DialogFooter className="gap-2 sm:gap-2">
                        <Button
                            type="button"
                            onClick={() => setIosStage("steps")}
                            className="w-full gap-2 font-bold"
                        >
                            <Share className="size-4" />
                            {t("iosCoachNext")}
                        </Button>
                        <Button
                            type="button"
                            variant="ghost"
                            onClick={() => setIosStage("steps")}
                            className="w-full"
                        >
                            {t("iosCoachBack")}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        );
    }

    // ----- Shared dialog: numbered steps for every platform -----
    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogContent className="gap-5 sm:max-w-md">
                <DialogHeader>
                    <div className="mx-auto flex size-14 items-center justify-center rounded-2xl border border-primary/20 bg-primary/10 shadow-sm">
                        <SmarthphoneIcon platform={platform} />
                    </div>
                    <DialogTitle className="text-center text-lg font-extrabold">
                        {isIos ? t("iosTitle") : isDesktop ? t("desktopTitle") : t("androidTitle")}
                    </DialogTitle>
                    <DialogDescription className="text-center">
                        {isIos ? t("iosSubtitle") : isDesktop ? t("desktopSubtitle") : t("androidSubtitle")}
                    </DialogDescription>
                </DialogHeader>

                <div className="grid gap-2 rounded-2xl border border-primary/15 bg-primary/5 p-3">
                    <div className="flex items-center gap-2 text-xs font-bold text-primary">
                        <Sparkles className="size-3.5" />
                        {t("badge")}
                    </div>
                    <div className="grid gap-1.5 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1.5">
                            <CheckCircle2 className="size-3.5 shrink-0 text-primary" />
                            {t("benefitFast")}
                        </span>
                        <span className="flex items-center gap-1.5">
                            <CheckCircle2 className="size-3.5 shrink-0 text-primary" />
                            {t("benefitStorage")}
                        </span>
                        <span className="flex items-center gap-1.5">
                            <CheckCircle2 className="size-3.5 shrink-0 text-primary" />
                            {t("benefitOrders")}
                        </span>
                    </div>
                </div>

                <ol className="space-y-2.5">
                    {isIos ? (
                        <>
                            <GuideStep
                                step={1}
                                icon={<Share className="size-4" />}
                                text={t("iosStep1")}
                            />
                            <GuideStep
                                step={2}
                                icon={<Smartphone className="size-4" />}
                                text={t("iosStep2")}
                            />
                            <GuideStep
                                step={3}
                                icon={<Check className="size-4" />}
                                text={t("iosStep3")}
                            />
                        </>
                    ) : isDesktop ? (
                        <>
                            <GuideStep
                                step={1}
                                icon={<Download className="size-4" />}
                                text={t("desktopStep1")}
                            />
                            <GuideStep
                                step={2}
                                icon={<Menu className="size-4" />}
                                text={t("desktopStep2")}
                            />
                            <GuideStep
                                step={3}
                                icon={<Check className="size-4" />}
                                text={t("desktopStep3")}
                            />
                        </>
                    ) : (
                        <>
                            <GuideStep
                                step={1}
                                icon={<Menu className="size-4" />}
                                text={t("androidStep1")}
                            />
                            <GuideStep
                                step={2}
                                icon={<Smartphone className="size-4" />}
                                text={firefox ? t("androidFirefoxStep2") : t("androidStep2")}
                            />
                            <GuideStep
                                step={3}
                                icon={<Check className="size-4" />}
                                text={t("androidStep3")}
                            />
                        </>
                    )}
                </ol>

                {isIos ? (
                    <p className="rounded-xl border border-amber-400/30 bg-amber-400/10 px-3 py-2 text-[11px] leading-relaxed text-amber-700 dark:text-amber-300">
                        {t("iosSafariNote")}
                    </p>
                ) : (
                    <p className="rounded-xl bg-muted px-3 py-2 text-[11px] leading-relaxed text-muted-foreground">
                        {firefox ? t("firefoxNote") : t("androidMenuHint")}
                    </p>
                )}

                {firefox && !isIos && (
                    <button
                        type="button"
                        onClick={() => {
                            const url = window.location.href;
                            // Always copy the link first as a reliable fallback.
                            try {
                                if (navigator.clipboard?.writeText) {
                                    navigator.clipboard.writeText(url);
                                    toast.success(t("linkCopied"));
                                }
                            } catch {
                                /* clipboard may be unavailable — ignore */
                            }
                            // Android intent to open the current URL in Chrome.
                            const intent = `intent://${url.replace(/^https?:\/\//, "")}#Intent;scheme=https;package=com.android.chrome;S.browser_fallback_url=${encodeURIComponent(
                                url
                            )};end`;
                            try {
                                window.location.href = intent;
                            } catch {
                                /* ignore navigation failures — the link was copied */
                            }
                            setTimeout(() => setOpen(false), 600);
                        }}
                        className="w-full rounded-xl border border-primary/25 bg-primary/5 px-3 py-2 text-[11px] font-semibold text-primary transition-colors hover:bg-primary/10"
                    >
                        {t("useChrome")}
                    </button>
                )}

                <DialogFooter className="gap-2 sm:gap-2">
                    <Button
                        type="button"
                        onClick={handleInstallNow}
                        className="w-full gap-2 font-bold"
                    >
                        {isIos ? <Share className="size-4" /> : <Download className="size-4" />}
                        {isIos ? t("gotIt") : t("installButton")}
                    </Button>
                    <Button
                        type="button"
                        variant="ghost"
                        onClick={() => setOpen(false)}
                        className="w-full"
                    >
                        {t("laterButton")}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}

function SmarthphoneIcon({ platform }: { platform: InstallPlatform }) {
    if (platform === "desktop") return <MonitorSmartphone className="size-7 text-primary" />;
    return <Smartphone className="size-7 text-primary" />;
}

function GuideStep({
    step,
    icon,
    text,
}: {
    step: number;
    icon: React.ReactNode;
    text: string;
}) {
    return (
        <li className="flex items-center gap-3 rounded-xl border border-border bg-card px-3 py-2.5">
            <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-primary/15 text-xs font-extrabold text-primary">
                {step}
            </span>
            <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                {icon}
            </span>
            <span className="min-w-0 text-sm leading-snug text-foreground/90">{text}</span>
        </li>
    );
}

/**
 * Mounted once in the store shell — hosts the install guide dialog.
 */
export function InstallPrompt() {
    return <InstallGuideDialog />;
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
        setIsStandalone(checkStandalone());
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
        setIsStandalone(checkStandalone());

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
        setIsStandalone(checkStandalone());
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
