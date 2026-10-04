"use client";

import { useActionState } from "react";

import { AlertCircle, Lock } from "lucide-react";

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
    const [state, formAction, pending] = useActionState<LoginState, FormData>(
        login,
        null
    );

    return (
        <Card>
            <CardHeader className="items-center text-center">
                <div className="mb-2 flex size-12 items-center justify-center rounded-full bg-primary/10">
                    <Lock className="size-6 text-primary" />
                </div>
                <CardTitle className="text-xl">התחברות מנהל</CardTitle>
                <CardDescription>גישה למערכת הניהול</CardDescription>
            </CardHeader>
            <CardContent>
                <form action={formAction} className="grid gap-4">
                    {state?.error && (
                        <div
                            role="alert"
                            className="flex items-center gap-2 rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive"
                        >
                            <AlertCircle className="size-4 shrink-0" />
                            {state.error}
                        </div>
                    )}
                    <div className="grid gap-2">
                        <Label htmlFor="email">אימייל</Label>
                        <Input
                            id="email"
                            name="email"
                            type="email"
                            autoComplete="email"
                            required
                            dir="ltr"
                            placeholder="admin@example.com"
                        />
                    </div>
                    <div className="grid gap-2">
                        <Label htmlFor="password">סיסמה</Label>
                        <Input
                            id="password"
                            name="password"
                            type="password"
                            autoComplete="current-password"
                            required
                            dir="ltr"
                            placeholder="••••••••"
                        />
                    </div>
                    <Button type="submit" className="mt-2 w-full" disabled={pending}>
                        {pending ? "מתחבר..." : "התחבר"}
                    </Button>
                </form>
            </CardContent>
        </Card>
    );
}