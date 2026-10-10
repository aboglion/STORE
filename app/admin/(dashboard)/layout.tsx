import { redirect } from "next/navigation";
import { getLocale } from "next-intl/server";

import { AdminMobileHeader } from "@/components/admin/admin-mobile-header";
import { AdminPageTransition } from "@/components/admin/admin-page-transition";
import { AdminSidebar } from "@/components/admin/admin-sidebar";
import { TooltipProvider } from "@/components/ui/tooltip";
import { getAdmin } from "@/lib/auth";
import { getSettings, getStoreName } from "@/lib/data/storefront";
import type { Locale } from "@/lib/i18n/config";

export default async function AdminDashboardLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const admin = await getAdmin();

    if (!admin) {
        redirect("/admin/login");
    }

    const settings = await getSettings();
    const locale = (await getLocale()) as Locale;
    const storeName = getStoreName(settings, locale);

    return (
        <TooltipProvider>
            <div className="flex min-h-screen bg-muted/30">
                <AdminSidebar
                    email={admin.email}
                    storeName={storeName}
                    logoUrl={settings.logo_url}
                />
                <div className="flex min-w-0 flex-1 flex-col">
                    <AdminMobileHeader
                        email={admin.email}
                        storeName={storeName}
                        logoUrl={settings.logo_url}
                    />
                    <main className="min-w-0 flex-1 p-4 md:p-6">
                        <AdminPageTransition>{children}</AdminPageTransition>
                    </main>
                </div>
            </div>
        </TooltipProvider>
    );
}
