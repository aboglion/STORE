import Link from "next/link";

import { Button } from "@/components/ui/button";

export default function NotFound() {
    return (
        <main className="flex min-h-screen flex-col items-center justify-center gap-4 p-8 text-center">
            <h1 className="text-4xl font-bold">404</h1>
            <p className="text-muted-foreground">העמוד שחיפשת לא נמצא</p>
            <Button asChild>
                <Link href="/">חזרה לדף הבית</Link>
            </Button>
        </main>
    );
}