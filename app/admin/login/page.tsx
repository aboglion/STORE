import type { Metadata } from "next";

import { AdminLoginForm } from "@/components/admin/login-form";

export const metadata: Metadata = {
    title: "התחברות מנהל",
};

export default function AdminLoginPage() {
    return (
        <main className="flex min-h-screen items-center justify-center bg-muted/30 p-6">
            <div className="w-full max-w-sm">
                <AdminLoginForm />
            </div>
        </main>
    );
}