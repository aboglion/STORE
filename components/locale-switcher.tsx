"use client";

import { useState } from "react";
import { Languages, Loader2 } from "lucide-react";
import { useLocale } from "next-intl";

import { Button } from "@/components/ui/button";
import { setLocale } from "@/lib/actions/locale";
import { LOCALE_COOKIE } from "@/lib/i18n/config";

/**
 * Language switcher — no flags.
 * In Hebrew mode it offers switching to Arabic (انتقل للعربية),
 * in Arabic mode it offers switching to Hebrew (לעברית).
 *
 * When clicked, immediately updates the cookie and reloads the page so the
 * entire application (root layout, translations, and components) switches language instantly.
 */
export function LocaleSwitcher() {
    const locale = useLocale();
    const [isPending, setIsPending] = useState(false);
    const target = locale === "he" ? "ar" : "he";
    const label = locale === "he" ? "انتقل للعربية" : "לעברית";

    const handleSwitch = async () => {
        if (isPending) return;
        setIsPending(true);

        try {
            // 1. Immediately set the cookie in the browser
            document.cookie = `${LOCALE_COOKIE}=${target}; path=/; max-age=${60 * 60 * 24 * 365}; SameSite=Lax`;

            // 2. Sync server-side cookie via server action
            await setLocale(target);
        } catch (err) {
            console.error("Failed to switch locale:", err);
        } finally {
            // 3. Immediately reload the page with the new language
            window.location.reload();
        }
    };

    return (
        <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={handleSwitch}
            disabled={isPending}
            className="gap-1.5 rounded-full text-sm font-medium"
        >
            {isPending ? (
                <Loader2 className="size-4 animate-spin" />
            ) : (
                <Languages className="size-4" />
            )}
            {label}
        </Button>
    );
}


