import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";

import { AdminLoginForm } from "@/components/admin/login-form";

export async function generateMetadata(): Promise<Metadata> {
    const t = await getTranslations("admin.login");
    return {
        title: t("title"),
    };
}

export default function AdminLoginPage() {
    return (
        <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-gradient-to-br from-accent via-secondary/60 to-background p-6">
            <div className="pointer-events-none absolute -top-24 -right-24 size-80 rounded-full bg-primary/10 blur-3xl" />
            <div className="pointer-events-none absolute -bottom-28 -left-20 size-96 rounded-full bg-[oklch(0.62_0.11_60)]/10 blur-3xl" />
            <div className="relative w-full max-w-sm">
                <AdminLoginForm />
            </div>
        </main>
    );
}
