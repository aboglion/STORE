import { z } from "zod";

import type { ValidationMessages } from "@/lib/validations/checkout";

export const BACKUP_ID_PATTERN = /^[0-9]{8}T[0-9]{6}Z_(manual|scheduled|pre-restore)$/;
export const BACKUP_TIME_PATTERN = /^([01]\d|2[0-3]):[0-5]\d$/;

export function backupScheduleSchema(t: ValidationMessages) {
    return z.object({
        enabled: z.boolean(),
        times: z
            .array(z.string().trim().regex(BACKUP_TIME_PATTERN, t("invalidValue")))
            .min(1, t("invalidValue"))
            .max(24, t("invalidValue"))
            .refine((times) => new Set(times).size === times.length, {
                message: t("invalidValue"),
            }),
        retention: z.coerce.number().int().min(1, t("invalidValue")).max(90, t("invalidValue")),
    });
}

export type BackupScheduleFormValues = z.infer<ReturnType<typeof backupScheduleSchema>>;
