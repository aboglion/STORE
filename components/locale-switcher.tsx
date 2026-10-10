"use client";

import { Languages } from "lucide-react";
import { useLocale } from "next-intl";

import { Button } from "@/components/ui/button";
import { setLocale } from "@/lib/actions/locale";

/**
 * Language switcher — no flags.
 * In Hebrew mode it offers switching to Arabic (انتقل للعربية),
 * in Arabic mode it offers switching to Hebrew (לעברית).
 */
export function LocaleSwitcher() {
    const locale = useLocale();
    const target = locale === "he" ? "ar" : "he";
    const label = locale === "he" ? "انتقل للعربية" : "לעברית";

    return (
        <form action={setLocale.bind(null, target)}>
            <Button
                type="submit"
                variant="ghost"
                size="sm"
                className="gap-1.5 rounded-full text-sm font-medium"
            >
                <Languages className="size-4" />
                {label}
            </Button>
        </form>
    );
}
