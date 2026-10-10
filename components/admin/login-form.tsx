"use client";

import { useActionState } from "react";
import { useTranslations } from "next-intl";

import { AlertCircle, PackagePlus } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { login, type LoginState } from "@/lib/actions/auth";

export function AdminLoginForm() {
    const t = useTranslations("admin.login");
    const [state, formAction, pending] = useActionState<LoginState, FormData>(
        login,
        null
    );

    return (
        <Card className="rounded-3xl border-border/70 shadow-lift">
            <CardHeader className="items-center text-center">
                <div className="mb-2 flex size-14 items-center justify-center rounded-2xl bg-gradient-to-br from-primary to-primary-deep text-primary-foreground shadow-soft">
                    <PackagePlus className="size-7" />
                </div>
                <CardTitle className="font-display text-2xl font-extrabold">
                    {t("title")}
                </CardTitle>
                <CardDescription>{t("description")}</CardDescription>
            </CardHeader>
            <CardContent>
                <form action={formAction} className="grid gap-4">
                    {state?.error && (
                        <div
                            role="alert"
                            className="flex items-center gap-2 rounded-xl border border-destructive/30 bg-destructive/10 px-3 py-2.5 text-sm text-destructive"
                        >
                            <AlertCircle className="size-4 shrink-0" />
                            {state.error}
                        </div>
                    )}
                    <div className="grid gap-2">
                        <Label htmlFor="email">{t("email")}</Label>
                        <Input
                            id="email"
                            name="email"
                            type="email"
                            autoComplete="email"
                            required
                            dir="ltr"
                            placeholder="admin@example.com"
                            className="h-11 rounded-xl"
                        />
                    </div>
                    <div className="grid gap-2">
                        <Label htmlFor="password">{t("password")}</Label>
                        <Input
                            id="password"
                            name="password"
                            type="password"
                            autoComplete="current-password"
                            required
                            dir="ltr"
                            placeholder="••••••••"
                            className="h-11 rounded-xl"
                        />
                    </div>
                    <Button
                        type="submit"
                        className="mt-2 w-full rounded-full"
                        size="lg"
                        disabled={pending}
                    >
                        {pending ? t("submitting") : t("submit")}
                    </Button>
                </form>
            </CardContent>
        </Card>
    );
}
