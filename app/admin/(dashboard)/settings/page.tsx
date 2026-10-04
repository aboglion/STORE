import type { Metadata } from "next";

import { SettingsForm } from "@/components/admin/settings-form";
import { Card, CardContent } from "@/components/ui/card";
import { requireAdmin } from "@/lib/auth";
import { getSettings } from "@/lib/data/storefront";

export const metadata: Metadata = {
    title: "הגדרות",
};

export default async function AdminSettingsPage() {
    await requireAdmin();
    const settings = await getSettings();

    return (
        <div className="grid max-w-3xl gap-6">
            <div>
                <h1 className="text-2xl font-bold">הגדרות</h1>
                <p className="mt-1 text-sm text-muted-foreground">
                    הגדרות כלליות של החנות
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