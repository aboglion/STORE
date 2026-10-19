"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { Download, Smartphone, X } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

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

    // 3. If accessed via non-secure HTTP, navigate to secure HTTPS where Chrome enables native PWA install
    if (window.location.protocol === "http:" && window.location.hostname !== "localhost" && window.location.hostname !== "127.0.0.1") {
        window.location.href = `https://139.162.159.19.sslip.io${window.location.pathname}${window.location.search}${window.location.hash}`;
        return;
    }

    // 4. On iOS where Apple restricts programmatic installation API
    const ua = navigator.userAgent || "";
    const isIos = /iPad|iPhone|iPod/.test(ua) && !(window as unknown as { MSStream?: unknown }).MSStream;
    if (isIos) {
        toast.info("ב-iPhone: יש ללחוץ על ⎋ (שיתוף) בתחתית Safari ואז 'הוסף למסך הבית' 📲");
    }
}

/**
 * Kept as a clean no-op so no instruction guide or modal is ever displayed to the user.
 */
export function InstallPrompt() {
    return null;
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
