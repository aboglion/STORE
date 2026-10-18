"use client";

import { useEffect } from "react";

/**
 * Registers the PWA service worker on the client side in supported browsers.
 * This ensures standard compliance for PWA installability and background caching.
 */
export function PwaRegister() {
    useEffect(() => {
        if (
            typeof window === "undefined" ||
            !("serviceWorker" in navigator) ||
            !window.location.protocol.startsWith("http")
        ) {
            return;
        }

        const registerWorker = () => {
            navigator.serviceWorker
                .register("/sw.js")
                .then((registration) => {
                    registration.addEventListener("updatefound", () => {
                        const newWorker = registration.installing;
                        if (newWorker) {
                            newWorker.addEventListener("statechange", () => {
                                if (
                                    newWorker.state === "installed" &&
                                    navigator.serviceWorker.controller
                                ) {
                                    // New SW version is available
                                }
                            });
                        }
                    });
                })
                .catch((err) => {
                    // Non-fatal, keep console clean
                    console.debug("[PWA] SW registration notice:", err);
                });
        };

        if (document.readyState === "complete") {
            registerWorker();
        } else {
            window.addEventListener("load", registerWorker, { once: true });
        }
    }, []);

    return null;
}
