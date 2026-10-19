"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";

import { z } from "zod";

import { rateLimit } from "@/lib/server/rate-limit";
import { requireAdmin } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

export type LoginState = { error?: string } | null;

export type UpdateAdminCredentialsState = {
    error?: string;
    success?: boolean;
    message?: string;
    newEmail?: string;
} | null;

export async function login(
    _prevState: LoginState,
    formData: FormData
): Promise<LoginState> {
    const te = await getTranslations("admin.errors");

    // Brute-force protection: 5 attempts per minute per IP.
    const limited = await rateLimit({ key: "login", limit: 5, windowMs: 60_000 });
    if (!limited.ok) return { error: te("tooManyAttempts") };

    const loginSchema = z.object({
        email: z.string().email(te("invalidEmail")),
        password: z.string().min(6, te("passwordTooShort")),
    });

    const parsed = loginSchema.safeParse({
        email: formData.get("email"),
        password: formData.get("password"),
    });

    if (!parsed.success) {
        return { error: te("fillValidLogin") };
    }

    const supabase = await createClient();
    const { error } = await supabase.auth.signInWithPassword({
        email: parsed.data.email,
        password: parsed.data.password,
    });

    if (error) {
        return { error: te("invalidCredentials") };
    }

    // Honor the ?next= parameter set by the middleware, but only when it is a
    // safe internal admin path (prevents open-redirect via query injection).
    const rawNext = formData.get("next");
    const redirectPath =
        typeof rawNext === "string" &&
            rawNext.startsWith("/admin/") &&
            !rawNext.startsWith("/admin/login")
            ? rawNext
            : "/admin/dashboard";

    revalidatePath("/admin", "layout");
    redirect(redirectPath);
}

export async function logout() {
    const supabase = await createClient();
    await supabase.auth.signOut();
    revalidatePath("/admin", "layout");
    redirect("/admin/login");
}

export async function updateAdminCredentials(
    _prevState: UpdateAdminCredentialsState,
    formData: FormData
): Promise<UpdateAdminCredentialsState> {
    const admin = await requireAdmin();
    const t = await getTranslations("admin.account");

    const limited = await rateLimit({ key: "admin-credentials", limit: 5, windowMs: 60_000 });
    if (!limited.ok) return { error: t("tooManyAttempts") };

    const currentPassword = String(formData.get("currentPassword") || "").trim();
    const rawNewEmail = String(formData.get("newEmail") || "").trim().toLowerCase();
    const newPassword = String(formData.get("newPassword") || "").trim();
    const confirmPassword = String(formData.get("confirmPassword") || "").trim();

    if (!currentPassword) {
        return { error: t("currentPasswordRequired") };
    }

    const emailChanged = Boolean(rawNewEmail && rawNewEmail !== admin.email.toLowerCase());
    const passwordChanged = Boolean(newPassword.length > 0);

    if (!emailChanged && !passwordChanged) {
        return { error: t("noChangesDetected") };
    }

    if (emailChanged) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(rawNewEmail)) {
            return { error: t("invalidEmail") };
        }
    }

    if (passwordChanged) {
        if (newPassword.length < 6) {
            return { error: t("passwordTooShort") };
        }
        if (newPassword !== confirmPassword) {
            return { error: t("passwordMismatch") };
        }
    }

    // 1. Verify current credentials
    const supabase = await createClient();
    const { error: verifyError } = await supabase.auth.signInWithPassword({
        email: admin.email,
        password: currentPassword,
    });

    if (verifyError) {
        return { error: t("wrongCurrentPassword") };
    }

    const adminClient = createAdminClient();

    // 2. If changing email, check if another admin already uses this email
    if (emailChanged) {
        const { data: existingUser } = await adminClient
            .from("admin_profiles")
            .select("id")
            .eq("email", rawNewEmail)
            .neq("id", admin.id)
            .maybeSingle();

        if (existingUser) {
            return { error: t("emailAlreadyInUse") };
        }
    }

    // 3. Update auth user in PostgreSQL (auth.users)
    const updatePayload: {
        email?: string;
        password?: string;
        email_confirm?: boolean;
    } = {};

    if (emailChanged) {
        updatePayload.email = rawNewEmail;
        updatePayload.email_confirm = true;
    }

    if (passwordChanged) {
        updatePayload.password = newPassword;
    }

    const { error: adminUpdateError } = await adminClient.auth.admin.updateUserById(
        admin.id,
        updatePayload
    );

    if (adminUpdateError) {
        return { error: adminUpdateError.message || t("updateFailed") };
    }

    // 4. If email changed, update admin_profiles table in PostgreSQL as well
    if (emailChanged) {
        const { error: profileError } = await adminClient
            .from("admin_profiles")
            .update({
                email: rawNewEmail,
                updated_at: new Date().toISOString(),
            })
            .eq("id", admin.id);

        if (profileError) {
            return { error: profileError.message || t("profileUpdateFailed") };
        }
    }

    // 5. Refresh session cookie with the updated credentials
    const effectiveEmail = emailChanged ? rawNewEmail : admin.email;
    const effectivePassword = passwordChanged ? newPassword : currentPassword;

    await supabase.auth.signInWithPassword({
        email: effectiveEmail,
        password: effectivePassword,
    });

    revalidatePath("/admin", "layout");
    revalidatePath("/admin/settings");

    return {
        success: true,
        message: t("credentialsUpdatedSuccess"),
        newEmail: effectiveEmail,
    };
}

