import type { Metadata } from "next";
import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { ShieldAlert } from "lucide-react";
import { redirect } from "next/navigation";

import { CourierApp } from "@/components/courier/courier-app";
import { StoreLogo } from "@/components/store/store-logo";
import { Button } from "@/components/ui/button";
import { getCourierByToken } from "@/lib/data/couriers";
import { getSettings } from "@/lib/data/storefront";

export const dynamic = "force-dynamic";

export async function generateMetadata({
    params,
}: {
    params: Promise<{ token: string }>;
}): Promise<Metadata> {
    const { token } = await params;
    const t = await getTranslations("courier");
    const data = await getCourierByToken(token);
    if (!data) return { title: t("portalTitle") };
    return { title: t("portalTitle") };
}

export default async function CourierPortalPage({
    params,
}: {
    params: Promise<{ token: string }>;
}) {
    const { token } = await params;
    const t = await getTranslations("courier");
    const data = await getCourierByToken(token);

    if (!data) {
        const settings = await getSettings();
        return (
            <div className="flex min-h-dvh flex-col items-center justify-center gap-4 bg-background px-6 text-center">
                <span className="flex size-16 items-center justify-center rounded-3xl bg-destructive/10 text-destructive">
                    <ShieldAlert className="size-8" />
                </span>
                <div className="space-y-1">
                    <h1 className="font-display text-xl font-extrabold">
                        {t("linkExpired")}
                    </h1>
                    <p className="text-sm text-muted-foreground">
                        {t("linkExpiredHint")}
                    </p>
                </div>
                {settings.contact_phone && (
                    <Button asChild variant="outline" className="rounded-xl">
                        <a href={`tel:${settings.contact_phone}`}>
                            {t("contactStore")} ·{" "}
                            <span dir="ltr">{settings.contact_phone}</span>
                        </a>
                    </Button>
                )}
                <Link
                    href="/"
                    className="text-xs text-muted-foreground hover:underline"
                >
                    {t("backToStore")}
                </Link>
            </div>
        );
    }

    // Safety: never render the portal for an inactive token.
    if (!data.courier.is_active) {
        redirect("/");
    }

    return (
        <div className="flex min-h-dvh flex-col bg-background pb-20">
            <CourierApp token={token} initialData={data} />

            <footer className="pointer-events-none fixed inset-x-0 bottom-20 z-0 mx-auto flex w-full max-w-3xl justify-between px-6 text-[10px] text-muted-foreground/70">
                <span>
                    <StoreLogo
                        logoUrl={data.store.logo_url ?? ""}
                        name={data.store.name}
                        iconClassName="size-4"
                    />
                </span>
            </footer>
        </div>
    );
}