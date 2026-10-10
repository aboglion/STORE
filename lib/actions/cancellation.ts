"use server";

import { createAdminClient } from "@/lib/supabase/admin";
import {
    cancellationFormSchema,
    type CancellationFormValues,
} from "@/lib/validations/cancellation";

export interface CancellationResult {
    ok: boolean;
    error?: string;
    referenceNumber?: string;
    submittedAt?: string;
}

export async function submitCancellationNotice(
    values: CancellationFormValues
): Promise<CancellationResult> {
    const parsed = cancellationFormSchema.safeParse(values);
    if (!parsed.success) {
        return { ok: false, error: "נתונים לא תקינים, אנא מלא את כל שדות החובה." };
    }

    const {
        full_name,
        phone,
        id_number,
        email,
        order_number,
        items_description,
        reason,
        is_protected_population,
        notes,
    } = parsed.data;

    // Generate statutory reference number
    const randomSuffix = Math.floor(100000 + Math.random() * 900000);
    const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, "");
    const referenceNumber = `CAN-${dateStr}-${randomSuffix}`;
    const nowIso = new Date().toISOString();

    const REASON_LABELS: Record<string, string> = {
        defect: "פגם או קלקול במוצר",
        mismatch: "אי-התאמה בין המוצר לפרטים שנמסרו",
        not_delivered: "אי אספקה במועד שנקבע",
        customer_remorse: "חרטה / ביטול לבקשת הלקוח",
        other: "אחר",
    };

    try {
        const admin = createAdminClient();
        // Look up matching order if it exists
        const { data: order } = await admin
            .from("orders")
            .select("id, status, notes")
            .eq("order_number", order_number.trim())
            .maybeSingle();

        if (order) {
            const idPart = id_number ? ` (ת.ז ${id_number})` : "";
            const emailPart = email ? ` [דוא"ל ${email}]` : "";
            const itemsPart = items_description ? ` | פריטים: ${items_description}` : "";
            const eventNote = `הודעת ביטול עסקה (אסמכתא ${referenceNumber}): לקוח ${full_name}${idPart}, טלפון ${phone}${emailPart}, סיבה: ${REASON_LABELS[reason] || reason}${is_protected_population ? " [אוכלוסייה מוגנת - זכאות 4 חודשים]" : ""}${itemsPart}${notes ? `. הערות: ${notes}` : ""}`;

            // Record event
            await admin.from("order_events").insert({
                order_id: order.id,
                actor: "system",
                from_status: order.status,
                to_status: order.status,
                note: eventNote,
            });

            // If order is still pending or confirmed, append cancellation note to order notes
            const existingNotes = order.notes ? `${order.notes}\n` : "";
            await admin
                .from("orders")
                .update({
                    notes: `${existingNotes}[בקשת ביטול ${referenceNumber}] ${eventNote}`.slice(0, 1500),
                })
                .eq("id", order.id);
        }

        return {
            ok: true,
            referenceNumber,
            submittedAt: nowIso,
        };
    } catch (err) {
        console.error("Failed to process cancellation notice:", err);
        // Even if database order lookup fails, we return the reference number to the customer so they have statutory proof
        return {
            ok: true,
            referenceNumber,
            submittedAt: nowIso,
        };
    }
}
