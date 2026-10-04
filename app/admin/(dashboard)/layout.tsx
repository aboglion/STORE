import { redirect } from "next/navigation";

import { AdminSidebar } from "@/components/admin/admin-sidebar";
import { TooltipProvider } from "@/components/ui/tooltip";
import { getAdmin } from "@/lib/auth";

export default async function AdminDashboardLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const admin = await getAdmin();

    if (!admin) {
        redirect("/admin/login");
    }

    return (
        <TooltipProvider>
            <div className="flex min-h-screen bg-muted/20">
                <AdminSidebar email={admin.email} />
                <main className="min-w-0 flex-1 p-4 md:p-8">{children}</main>
            </div>
        </TooltipProvider>
    );
}