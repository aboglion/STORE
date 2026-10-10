"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";

import { z } from "zod";

import { rateLimit } from "@/lib/server/rate-limit";
import { createClient } from "@/lib/supabase/server";

export type LoginState = { error?: string } | null;

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

    revalidatePath("/admin", "layout");
    redirect("/admin/dashboard");
}

export async function logout() {
    const supabase = await createClient();
    await supabase.auth.signOut();
    revalidatePath("/admin", "layout");
    redirect("/admin/login");
}
