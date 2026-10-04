"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import {
    BarChart3,
    Boxes,
    LayoutDashboard,
    LogOut,
    Package,
    PackagePlus,
    Settings,
    ShoppingCart,
    Tags,
    Users,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import {
    Tooltip,
    TooltipContent,
    TooltipTrigger,
} from "@/components/ui/tooltip";
import { logout } from "@/lib/actions/auth";
import { cn } from "@/lib/utils";

const NAV_ITEMS = [
    { href: "/admin/dashboard", label: "דשבורד", icon: LayoutDashboard },
    { href: "/admin/products", label: "מוצרים", icon: Package },
    { href: "/admin/categories", label: "קטגוריות", icon: Tags },
    { href: "/admin/inventory", label: "מלאי", icon: Boxes },
    { href: "/admin/orders", label: "הזמנות", icon: ShoppingCart },
    { href: "/admin/customers", label: "לקוחות", icon: Users },
    { href: "/admin/stats", label: "סטטיסטיקות", icon: BarChart3 },
    { href: "/admin/settings", label: "הגדרות", icon: Settings },
] as const;

export function AdminSidebar({ email }: { email: string }) {
    const pathname = usePathname();

    return (
        <aside className="sticky top-0 flex h-screen w-16 flex-col items-center border-e bg-sidebar py-4 md:w-56 md:items-stretch md:px-3">
            <Link href="/admin/dashboard" className="mb-6 flex items-center gap-2 px-2">
                <PackagePlus className="size-6 shrink-0 text-primary" />
                <span className="hidden text-sm font-bold md:block">ניהול חנות</span>
            </Link>

            <nav className="flex flex-1 flex-col gap-1">
                {NAV_ITEMS.map((item) => {
                    const active =
                        pathname === item.href ||
                        (item.href !== "/admin/dashboard" &&
                            pathname.startsWith(`${item.href}/`));

                    const link = (
                        <Link
                            key={item.href}
                            href={item.href}
                            className={cn(
                                "flex items-center gap-2 rounded-md px-2 py-2 text-sm font-medium transition-colors",
                                active
                                    ? "bg-sidebar-accent text-sidebar-accent-foreground"
                                    : "text-muted-foreground hover:bg-sidebar-accent/60 hover:text-foreground"
                            )}
                        >
                            <item.icon className="size-4.5 shrink-0" />
                            <span className="hidden md:block">{item.label}</span>
                        </Link>
                    );

                    return (
                        <Tooltip key={item.href}>
                            <TooltipTrigger asChild>
                                <span className="flex md:hidden">{link}</span>
                            </TooltipTrigger>
                            <TooltipContent side="right">{item.label}</TooltipContent>
                        </Tooltip>
                    );
                })}
            </nav>

            <div className="border-t pt-3">
                <div className="mb-2 hidden truncate px-2 text-xs text-muted-foreground md:block">
                    {email}
                </div>
                <form action={logout}>
                    <Button
                        variant="ghost"
                        className="w-full justify-start"
                        type="submit"
                    >
                        <LogOut className="size-4.5" />
                        <span className="hidden md:block">התנתק</span>
                    </Button>
                </form>
            </div>
        </aside>
    );
}