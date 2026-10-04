import Link from "next/link";

import { ArrowLeft, Boxes, Package, ShoppingCart, Users } from "lucide-react";

import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
import { requireAdmin } from "@/lib/auth";

const QUICK_LINKS = [
    {
        href: "/admin/products",
        title: "מוצרים",
        description: "ניהול קטלוג מוצרים",
        icon: Package,
    },
    {
        href: "/admin/inventory",
        title: "מלאי",
        description: "עדכוני מלאי ומלאי נמוך",
        icon: Boxes,
    },
    {
        href: "/admin/orders",
        title: "הזמנות",
        description: "הזמנות חדשות וסטטוסים",
        icon: ShoppingCart,
    },
    {
        href: "/admin/customers",
        title: "לקוחות",
        description: "לקוחות לפי טלפון וכתובת",
        icon: Users,
    },
] as const;

export default async function AdminDashboardPage() {
    const admin = await requireAdmin();

    return (
        <div className="grid gap-6">
            <div>
                <h1 className="text-2xl font-bold">דשבורד</h1>
                <p className="mt-1 text-muted-foreground">
                    ברוך הבא, {admin.email} — כאן תוצג סטטיסטיקת המכירות בקרוב.
                </p>
            </div>

            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                {QUICK_LINKS.map((link) => (
                    <Link key={link.href} href={link.href} className="group">
                        <Card className="h-full transition-colors group-hover:border-primary/40">
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2 text-base">
                                    <link.icon className="size-5 text-primary" />
                                    {link.title}
                                </CardTitle>
                                <CardDescription>{link.description}</CardDescription>
                            </CardHeader>
                            <CardContent>
                                <span className="flex items-center gap-1 text-sm font-medium text-primary">
                                    כניסה
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