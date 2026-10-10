import Link from "next/link";
import { getTranslations } from "next-intl/server";

import { Button } from "@/components/ui/button";

export default async function NotFound() {
    const t = await getTranslations("common");

    return (
        <main className="flex min-h-screen flex-col items-center justify-center gap-4 p-8 text-center">
            <h1 className="text-4xl font-bold">404</h1>
            <p className="text-muted-foreground">{t("pageNotFound")}</p>
            <Button asChild>
                <Link href="/">{t("backHome")}</Link>
            </Button>
        </main>
    );
}
