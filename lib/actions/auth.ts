"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { z } from "zod";

import { createClient } from "@/lib/supabase/server";

const loginSchema = z.object({
    email: z.string().email("נא להזין אימייל תקין"),
    password: z.string().min(6, "סיסמה קצרה מדי"),
});

export type LoginState = { error?: string } | null;

export async function login(
    _prevState: LoginState,
    formData: FormData
): Promise<LoginState> {
    const parsed = loginSchema.safeParse({
        email: formData.get("email"),
        password: formData.get("password"),
    });

    if (!parsed.success) {
        return { error: "נא למלא אימייל וסיסמה תקינים" };
    }

    const supabase = await createClient();
    const { error } = await supabase.auth.signInWithPassword({
        email: parsed.data.email,
        password: parsed.data.password,
    });

    if (error) {
        return { error: "אימייל או סיסמה שגויים" };
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