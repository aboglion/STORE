import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";

import { SettingsForm } from "@/components/admin/settings-form";
import { Card, CardContent } from "@/components/ui/card";
import { requireAdmin } from "@/lib/auth";
import { getSettings } from "@/lib/data/storefront";

export async function generateMetadata(): Promise<Metadata> {
    const t = await getTranslations("admin.settings");
    return {
        title: t("title"),
    };
}

export default async function AdminSettingsPage() {
    await requireAdmin();
    const t = await getTranslations("admin.settings");
    const settings = await getSettings();

    return (
        <div className="grid max-w-3xl gap-6">
            <div>
                <h1 className="font-display text-2xl font-extrabold tracking-tight">
                    {t("title")}
                </h1>
                <p className="mt-1 text-sm text-muted-foreground">
                    {t("desc")}
                </p>
            </div>

            <Card>
                <CardContent className="pt-6">
                    <SettingsForm settings={settings} />
                </CardContent>
            </Card>
        </div>
    );
}
