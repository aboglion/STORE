"use client";

import { useEffect } from "react";

import { Button } from "@/components/ui/button";

export default function GlobalError({
    error,
    reset,
}: {
    error: Error & { digest?: string };
    reset: () => void;
}) {
    useEffect(() => {
        console.error(error);
    }, [error]);

    return (
        <main className="flex min-h-screen flex-col items-center justify-center gap-4 p-8 text-center">
            <h1 className="text-2xl font-bold">אופס, משהו השתבש</h1>
            <p className="text-muted-foreground">
                אירעה שגיאה לא צפויה. נסה שוב.
            </p>
            <Button onClick={reset}>נסה שוב</Button>
        </main>
    );
}