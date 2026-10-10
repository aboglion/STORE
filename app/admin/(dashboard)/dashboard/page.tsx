import Link from "next/link";
import { getTranslations } from "next-intl/server";

import { ArrowLeft, Boxes, Package, ShoppingCart, Users } from "lucide-react";

import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
import { requireAdmin } from "@/lib/auth";

export default async function AdminDashboardPage() {
    const admin = await requireAdmin();
    const t = await getTranslations("admin.dashboard");

    const QUICK_LINKS = [
        {
            href: "/admin/products",
            title: t("products"),
            description: t("productsDesc"),
            icon: Package,
        },
        {
            href: "/admin/inventory",
            title: t("inventory"),
            description: t("inventoryDesc"),
            icon: Boxes,
        },
        {
            href: "/admin/orders",
            title: t("orders"),
            description: t("ordersDesc"),
            icon: ShoppingCart,
        },
        {
            href: "/admin/customers",
            title: t("customers"),
            description: t("customersDesc"),
            icon: Users,
        },
    ];

    return (
        <div className="grid gap-6">
            <div>
                <h1 className="font-display text-2xl font-extrabold tracking-tight">
                    {t("title")}
                </h1>
                <p className="mt-1 text-sm text-muted-foreground">
                    {t("welcome", { email: admin.email })}
                </p>
            </div>

            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                {QUICK_LINKS.map((link) => (
                    <Link key={link.href} href={link.href} className="group">
                        <Card className="h-full rounded-2xl shadow-soft transition-all duration-200 group-hover:-translate-y-0.5 group-hover:shadow-lift">
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2 text-base">
                                    <span className="flex size-9 items-center justify-center rounded-full bg-gradient-to-br from-primary/15 to-accent text-primary">
                                        <link.icon className="size-4.5" />
                                    </span>
                                    {link.title}
                                </CardTitle>
                                <CardDescription>{link.description}</CardDescription>
                            </CardHeader>
                            <CardContent>
                                <span className="flex items-center gap-1 text-sm font-medium text-primary">
                                    {t("enter")}
                                    <ArrowLeft className="size-4 transition-transform group-hover:-translate-x-0.5" />
                                </span>
                            </CardContent>
                        </Card>
                    </Link>
                ))}
            </div>
        </div>
    );
}
