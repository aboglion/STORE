import { z } from "zod";

export const cancellationFormSchema = z.object({
    full_name: z.string().trim().min(2, "נא להזין שם מלא"),
    phone: z.string().trim().min(9, "נא להזין מספר טלפון תקין"),
    id_number: z.string().trim().max(15).optional().default(""),
    email: z.string().trim().email("כתובת דוא\"ל לא תקינה").optional().or(z.literal("")),
    order_number: z.string().trim().min(3, "נא להזין מספר הזמנה"),
    items_description: z.string().trim().max(300).optional().default(""),
    reason: z.enum([
        "defect",
        "mismatch",
        "not_delivered",
        "customer_remorse",
        "other",
    ]),
    is_protected_population: z.boolean().default(false),
    notes: z.string().trim().max(1000).optional().default(""),
});

export type CancellationFormValues = z.infer<typeof cancellationFormSchema>;
