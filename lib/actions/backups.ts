"use server";

import { revalidatePath } from "next/cache";
import { getTranslations } from "next-intl/server";

import { requireAdmin } from "@/lib/auth";
import {
    deleteBackup as deleteBackupOnDisk,
    isValidBackupId,
    runBackup,
    runRestore,
    writeBackupConfig,
    DEFAULT_BACKUP_TZ,
} from "@/lib/server/backups";
import {
    backupScheduleSchema,
    type BackupScheduleFormValues,
} from "@/lib/validations/backups";

export type BackupActionResult = { error?: string } | undefined;

/** Creates an immediate manual backup of the database + storage files. */
export async function createBackupNow(): Promise<BackupActionResult> {
    await requireAdmin();
    const t = await getTranslations("admin.backups.errors");

    const res = await runBackup("manual");
    if (!res.ok) {
        if (res.code === "LOCKED") return { error: t("locked") };
        if (res.code === "UNAVAILABLE") return { error: t("unavailable") };
        return { error: t("runFailed") };
    }

    revalidatePath("/admin/backups");
    return undefined;
}

/** Restores a backup (DB dump + storage files) after an automatic safety backup. */
export async function restoreBackup(id: string): Promise<BackupActionResult> {
    await requireAdmin();
    const t = await getTranslations("admin.backups.errors");

    if (!isValidBackupId(id)) return { error: t("invalidId") };

    const res = await runRestore(id);
    if (!res.ok) {
        if (res.code === "LOCKED") return { error: t("locked") };
        if (res.code === "UNAVAILABLE") return { error: t("unavailable") };
        return { error: t("restoreFailed") };
    }

    revalidatePath("/admin/backups");
    return undefined;
}

/** Permanently deletes one backup folder. */
export async function deleteBackup(id: string): Promise<BackupActionResult> {
    await requireAdmin();
    const t = await getTranslations("admin.backups.errors");

    if (!isValidBackupId(id)) return { error: t("invalidId") };

    if (!deleteBackupOnDisk(id)) return { error: t("deleteFailed") };

    revalidatePath("/admin/backups");
    return undefined;
}

/** Persists the backup schedule + retention settings to config.json. */
export async function saveBackupSchedule(
    values: BackupScheduleFormValues
): Promise<BackupActionResult> {
    await requireAdmin();
    const te = await getTranslations("admin.errors");
    const tv = await getTranslations("validation");

    const parsed = backupScheduleSchema(tv).safeParse(values);
    if (!parsed.success) return { error: te("invalidData") };

    writeBackupConfig({
        ...parsed.data,
        timezone: DEFAULT_BACKUP_TZ,
    });

    revalidatePath("/admin/backups");
    return undefined;
}
