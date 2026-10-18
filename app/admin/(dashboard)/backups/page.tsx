import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";

import { BackupsView } from "@/components/admin/backups-view";
import { requireAdmin } from "@/lib/auth";
import {
    BACKUP_ROOT,
    formatInTz,
    getBackupsTotalSize,
    getNextScheduledRun,
    getStorageRestoreStatus,
    isBackupSystemAvailable,
    listBackups,
    readBackupConfig,
    readBackupLogs,
} from "@/lib/server/backups";
import type { BackupRuntimeData } from "@/types/backups";

export async function generateMetadata(): Promise<Metadata> {
    const t = await getTranslations("admin.backups");
    return {
        title: t("title"),
    };
}

export default async function AdminBackupsPage() {
    await requireAdmin();

    const available = isBackupSystemAvailable();
    const config = readBackupConfig();
    const backups = listBackups();
    const lastBackup = backups[0] ?? null;
    const nextRun = config.enabled
        ? getNextScheduledRun(config.times, config.timezone)
        : null;

    const runtime: BackupRuntimeData = {
        available,
        backupDir: BACKUP_ROOT,
        config,
        backups,
        lastBackup,
        totalSize: available ? getBackupsTotalSize() : "",
        nextRunLabel: nextRun ? formatInTz(nextRun, config.timezone) : null,
        storageRestore: getStorageRestoreStatus(),
        logs: available ? readBackupLogs(150) : [],
    };

    return <BackupsView runtime={runtime} />;
}
