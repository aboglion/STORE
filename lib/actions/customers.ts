"use server";

import { revalidatePath } from "next/cache";
import { getTranslations } from "next-intl/server";

import { z } from "zod";

import { requireAdmin } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { updateCustomerNotesSchema } from "@/lib/validations/customer";

export type CustomerActionResult = { error?: string } | undefined;

export async function updateCustomerNotes(
    values: z.infer<typeof updateCustomerNotesSchema>
): Promise<CustomerActionResult> {
    await requireAdmin();

    const te = await getTranslations("admin.errors");

    const parsed = updateCustomerNotesSchema.safeParse(values);
    if (!parsed.success) return { error: te("invalidDataShort") };

    const { error } = await createAdminClient()
        .from("customers")
        .update({ notes: parsed.data.notes || null })
        .eq("id", parsed.data.customer_id);

    if (error) return { error: te("saveNotesFailed") };

    revalidatePath(`/admin/customers/${parsed.data.customer_id}`);
    return undefined;
}
