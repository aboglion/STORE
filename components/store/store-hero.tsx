import { getTranslations } from "next-intl/server";

import { Wheat } from "lucide-react";

export async function StoreHero() {
    const t = await getTranslations("home");

    return (
        <section className="relative overflow-hidden rounded-3xl border border-primary/10 bg-gradient-to-br from-accent via-secondary/70 to-background px-5 py-8 shadow-soft sm:px-8 sm:py-12">
            <div className="pointer-events-none absolute -top-12 -left-12 size-44 rounded-full bg-primary/10 blur-2xl" />
            <div className="pointer-events-none absolute -right-8 -bottom-20 size-56 rounded-full bg-primary-deep/10 blur-2xl" />

            <div className="relative flex items-center justify-between gap-4">
                <div>
                    <h1 className="font-display text-2xl font-extrabold tracking-tight sm:text-4xl">
                        {t("heroTitle")}
                    </h1>
                    <p className="mt-2 max-w-md text-sm leading-relaxed text-muted-foreground sm:text-base">
                        {t("heroSubtitle")}
                    </p>
                </div>

                <div className="hidden size-20 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-primary to-primary-deep text-primary-foreground shadow-lift sm:flex">
                    <Wheat className="size-9" />
                </div>
            </div>
        </section>
    );
}
