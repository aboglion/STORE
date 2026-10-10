"use client";

import { useEffect } from "react";
import { useTranslations } from "next-intl";

import { Button } from "@/components/ui/button";

export default function GlobalError({
    error,
    reset,
}: {
    error: Error & { digest?: string };
    reset: () => void;
}) {
    const t = useTranslations("common");

    useEffect(() => {
        console.error(error);
    }, [error]);

    return (
        <main className="flex min-h-screen flex-col items-center justify-center gap-4 p-8 text-center">
            <h1 className="text-2xl font-bold">{t("errorTitle")}</h1>
            <p className="text-muted-foreground">
                {t("errorDescription")}
            </p>
            <Button onClick={reset}>{t("retry")}</Button>
        </main>
    );
}
