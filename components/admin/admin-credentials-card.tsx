"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import {
    AlertCircle,
    CheckCircle2,
    Database,
    Eye,
    EyeOff,
    KeyRound,
    Loader2,
    Lock,
    Mail,
    ShieldCheck,
} from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
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
import {
    updateAdminCredentials,
    type UpdateAdminCredentialsState,
} from "@/lib/actions/auth";

interface AdminCredentialsCardProps {
    currentEmail: string;
}

export function AdminCredentialsCard({ currentEmail }: AdminCredentialsCardProps) {
    const t = useTranslations("admin.account");

    const [state, formAction, pending] = useActionState<
        UpdateAdminCredentialsState,
        FormData
    >(updateAdminCredentials, null);

    const [showCurrentPassword, setShowCurrentPassword] = useState(false);
    const [showNewPassword, setShowNewPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);

    const [displayedEmail, setDisplayedEmail] = useState(currentEmail);
    const formRef = useRef<HTMLFormElement>(null);

    useEffect(() => {
        if (state?.success) {
            toast.success(state.message || t("credentialsUpdatedSuccess"));
            if (state.newEmail) {
                setDisplayedEmail(state.newEmail);
            }
            // Clear passwords and new email from inputs on success
            if (formRef.current) {
                const currentPassInput = formRef.current.querySelector<HTMLInputElement>(
                    'input[name="currentPassword"]'
                );
                const newPassInput = formRef.current.querySelector<HTMLInputElement>(
                    'input[name="newPassword"]'
                );
                const confirmPassInput = formRef.current.querySelector<HTMLInputElement>(
                    'input[name="confirmPassword"]'
                );
                const newEmailInput = formRef.current.querySelector<HTMLInputElement>(
                    'input[name="newEmail"]'
                );
                if (currentPassInput) currentPassInput.value = "";
                if (newPassInput) newPassInput.value = "";
                if (confirmPassInput) confirmPassInput.value = "";
                if (newEmailInput) newEmailInput.value = "";
            }
        } else if (state?.error) {
            toast.error(state.error);
        }
    }, [state, t]);

    return (
        <Card id="admin-account" className="overflow-hidden border-border/80 shadow-soft">
            <CardHeader className="bg-gradient-to-r from-muted/40 via-muted/20 to-transparent pb-5">
                <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                        <div className="flex size-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
                            <ShieldCheck className="size-5" />
                        </div>
                        <div>
                            <CardTitle className="font-display text-lg font-bold">
                                {t("title")}
                            </CardTitle>
                            <CardDescription className="text-xs sm:text-sm">
                                {t("desc")}
                            </CardDescription>
                        </div>
                    </div>
                    <Badge
                        variant="outline"
                        className="flex items-center gap-1.5 border-emerald-500/30 bg-emerald-500/10 px-2.5 py-1 text-xs font-medium text-emerald-700 dark:text-emerald-300"
                    >
                        <span className="size-2 rounded-full bg-emerald-500 animate-pulse" />
                        <Database className="size-3.5" />
                        {t("databasePersistedBadge")}
                    </Badge>
                </div>
            </CardHeader>

            <CardContent className="pt-6">
                <form ref={formRef} action={formAction} className="grid gap-5">
                    {state?.error && (
                        <div
                            role="alert"
                            className="flex items-center gap-2.5 rounded-xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive"
                        >
                            <AlertCircle className="size-4 shrink-0" />
                            <span>{state.error}</span>
                        </div>
                    )}

                    {state?.success && (
                        <div
                            role="status"
                            className="flex items-center gap-2.5 rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-700 dark:text-emerald-300"
                        >
                            <CheckCircle2 className="size-4 shrink-0" />
                            <span>{state.message}</span>
                        </div>
                    )}

                    {/* Email section */}
                    <div className="grid gap-4 sm:grid-cols-2">
                        <div className="space-y-1.5">
                            <Label className="text-xs font-semibold text-muted-foreground">
                                {t("currentEmail")}
                            </Label>
                            <div className="flex h-10 items-center gap-2 rounded-lg border border-border/60 bg-muted/30 px-3 text-sm font-medium" dir="ltr">
                                <Mail className="size-4 text-muted-foreground" />
                                <span className="truncate">{displayedEmail}</span>
                            </div>
                        </div>

                        <div className="space-y-1.5">
                            <Label htmlFor="newEmail" className="text-xs font-semibold">
                                {t("newEmail")}
                            </Label>
                            <div className="relative">
                                <Input
                                    id="newEmail"
                                    name="newEmail"
                                    type="email"
                                    dir="ltr"
                                    autoComplete="off"
                                    placeholder={t("newEmailPlaceholder")}
                                    className="h-10 pl-9"
                                    disabled={pending}
                                />
                                <Mail className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                            </div>
                            <p className="text-[11px] text-muted-foreground">
                                {t("newEmailHint")}
                            </p>
                        </div>
                    </div>

                    <div className="my-1 border-t border-border/50" />

                    {/* Password section */}
                    <div className="grid gap-4 sm:grid-cols-2">
                        <div className="space-y-1.5 sm:col-span-2">
                            <div className="flex items-center justify-between">
                                <Label
                                    htmlFor="currentPassword"
                                    className="text-xs font-semibold text-foreground flex items-center gap-1.5"
                                >
                                    <Lock className="size-3.5 text-primary" />
                                    {t("currentPassword")} *
                                </Label>
                                <span className="text-[11px] text-muted-foreground">
                                    {t("currentPasswordHint")}
                                </span>
                            </div>
                            <div className="relative">
                                <Input
                                    id="currentPassword"
                                    name="currentPassword"
                                    type={showCurrentPassword ? "text" : "password"}
                                    dir="ltr"
                                    required
                                    autoComplete="current-password"
                                    placeholder={t("currentPasswordPlaceholder")}
                                    className="h-10 pl-9 pr-10"
                                    disabled={pending}
                                />
                                <KeyRound className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                                <button
                                    type="button"
                                    onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground transition-colors hover:text-foreground"
                                    title={showCurrentPassword ? t("hidePassword") : t("showPassword")}
                                >
                                    {showCurrentPassword ? (
                                        <EyeOff className="size-4" />
                                    ) : (
                                        <Eye className="size-4" />
                                    )}
                                </button>
                            </div>
                        </div>

                        <div className="space-y-1.5">
                            <Label htmlFor="newPassword" className="text-xs font-semibold">
                                {t("newPassword")}
                            </Label>
                            <div className="relative">
                                <Input
                                    id="newPassword"
                                    name="newPassword"
                                    type={showNewPassword ? "text" : "password"}
                                    dir="ltr"
                                    minLength={6}
                                    autoComplete="new-password"
                                    placeholder={t("newPasswordPlaceholder")}
                                    className="h-10 pl-9 pr-10"
                                    disabled={pending}
                                />
                                <Lock className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                                <button
                                    type="button"
                                    onClick={() => setShowNewPassword(!showNewPassword)}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground transition-colors hover:text-foreground"
                                    title={showNewPassword ? t("hidePassword") : t("showPassword")}
                                >
                                    {showNewPassword ? (
                                        <EyeOff className="size-4" />
                                    ) : (
                                        <Eye className="size-4" />
                                    )}
                                </button>
                            </div>
                            <p className="text-[11px] text-muted-foreground">
                                {t("newPasswordHint")} ({t("passwordLengthTip")})
                            </p>
                        </div>

                        <div className="space-y-1.5">
                            <Label htmlFor="confirmPassword" className="text-xs font-semibold">
                                {t("confirmPassword")}
                            </Label>
                            <div className="relative">
                                <Input
                                    id="confirmPassword"
                                    name="confirmPassword"
                                    type={showConfirmPassword ? "text" : "password"}
                                    dir="ltr"
                                    minLength={6}
                                    autoComplete="new-password"
                                    placeholder={t("confirmPasswordPlaceholder")}
                                    className="h-10 pl-9 pr-10"
                                    disabled={pending}
                                />
                                <Lock className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                                <button
                                    type="button"
                                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground transition-colors hover:text-foreground"
                                    title={showConfirmPassword ? t("hidePassword") : t("showPassword")}
                                >
                                    {showConfirmPassword ? (
                                        <EyeOff className="size-4" />
                                    ) : (
                                        <Eye className="size-4" />
                                    )}
                                </button>
                            </div>
                        </div>
                    </div>

                    <div className="rounded-xl border border-border/60 bg-muted/20 p-3 text-xs text-muted-foreground">
                        <div className="flex items-start gap-2">
                            <Database className="mt-0.5 size-4 shrink-0 text-primary" />
                            <span>{t("databasePersistedDesc")}</span>
                        </div>
                    </div>

                    <div className="flex justify-end pt-2">
                        <Button
                            type="submit"
                            disabled={pending}
                            className="min-w-44 font-semibold shadow-soft"
                        >
                            {pending ? (
                                <>
                                    <Loader2 className="me-2 size-4 animate-spin" />
                                    {t("submitting")}
                                </>
                            ) : (
                                <>
                                    <KeyRound className="me-2 size-4" />
                                    {t("submit")}
                                </>
                            )}
                        </Button>
                    </div>
                </form>
            </CardContent>
        </Card>
    );
}
