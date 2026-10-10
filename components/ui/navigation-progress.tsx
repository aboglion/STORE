"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname, useSearchParams } from "next/navigation";

export function NavigationProgress() {
    return (
        <div className="contents">
            <ProgressBarInner />
        </div>
    );
}

function ProgressBarInner() {
    const pathname = usePathname();
    const searchParams = useSearchParams();
    const [progress, setProgress] = useState(0);
    const [visible, setVisible] = useState(false);
    const timerRef = useRef<NodeJS.Timeout | null>(null);
    const prevUrlRef = useRef<string>("");

    const start = () => {
        if (timerRef.current) clearInterval(timerRef.current);
        setVisible(true);
        setProgress(18);

        timerRef.current = setInterval(() => {
            setProgress((prev) => {
                if (prev < 50) return prev + 12;
                if (prev < 75) return prev + 6;
                if (prev < 88) return prev + 2;
                return prev;
            });
        }, 180);
    };

    const complete = () => {
        if (timerRef.current) clearInterval(timerRef.current);
        setProgress(100);
        setTimeout(() => {
            setVisible(false);
            setTimeout(() => {
                setProgress(0);
            }, 200);
        }, 220);
    };

    // Complete progress when pathname or searchParams change
    useEffect(() => {
        const currentUrl = `${pathname}?${searchParams.toString()}`;
        if (prevUrlRef.current && prevUrlRef.current !== currentUrl) {
            complete();
        }
        prevUrlRef.current = currentUrl;
    }, [pathname, searchParams]);

    // Intercept link clicks & popstate
    useEffect(() => {
        const handleClick = (e: MouseEvent) => {
            const anchor = (e.target as Element)?.closest("a");
            if (!anchor) return;

            const target = anchor.getAttribute("target");
            if (target && target !== "_self") return;

            if (
                e.defaultPrevented ||
                e.button !== 0 ||
                e.metaKey ||
                e.ctrlKey ||
                e.altKey ||
                e.shiftKey
            ) {
                return;
            }

            const href = anchor.getAttribute("href");
            if (
                !href ||
                href.startsWith("#") ||
                href.startsWith("javascript:") ||
                href.startsWith("mailto:") ||
                href.startsWith("tel:") ||
                anchor.hasAttribute("download")
            ) {
                return;
            }

            try {
                const targetUrl = new URL(anchor.href, window.location.href);
                if (targetUrl.origin !== window.location.origin) return;

                const currentUrl = new URL(window.location.href);
                if (
                    targetUrl.pathname === currentUrl.pathname &&
                    targetUrl.search === currentUrl.search
                ) {
                    return;
                }

                start();
            } catch {
                // Ignore malformed URLs
            }
        };

        const handlePopState = () => {
            start();
        };

        document.addEventListener("click", handleClick, { capture: true });
        window.addEventListener("popstate", handlePopState);

        return () => {
            document.removeEventListener("click", handleClick, { capture: true });
            window.removeEventListener("popstate", handlePopState);
            if (timerRef.current) clearInterval(timerRef.current);
        };
    }, []);

    if (!visible && progress === 0) return null;

    return (
        <div
            aria-hidden="true"
            className="fixed top-0 start-0 end-0 z-[99999] h-[3px] pointer-events-none transition-opacity duration-200"
            style={{ opacity: visible ? 1 : 0 }}
        >
            <div
                className="h-full bg-primary transition-all duration-200 ease-out shadow-[0_0_12px_var(--color-primary)]"
                style={{
                    width: `${progress}%`,
                }}
            />
        </div>
    );
}
