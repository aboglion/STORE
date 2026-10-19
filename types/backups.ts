/**
 * Shared types for the database backup system.
 *
 * These types are imported by BOTH server code (lib/server/backups.ts) and
 * client components (components/admin/*) — keep them free of any node-only
 * imports so client bundles can type-check against them.
 */

export type BackupType = "manual" | "scheduled" | "pre-restore" | "uploaded";

/** Contents of the meta.json written inside each backup folder. */
export interface BackupMeta {
    id: string;
    type: BackupType;
    started_at: string;
    finished_at: string;
    label_time?: string;
    db_size?: string;
    storage_size?: string;
    storage_unchanged?: boolean;
    storage_hash?: string;
    total_size?: string;
    pg_version?: string;
}

/** A single backup listed in the admin panel. */
export interface BackupInfo {
    id: string;
    type: BackupType;
    /** UTC ISO timestamp parsed from the folder name. */
    createdAt: string;
    /** Human-friendly Israel-time label (from meta.json). */
    labelTime?: string;
    dbSize?: string;
    storageSize?: string;
    storageUnchanged?: boolean;
    totalSize?: string;
    hasDb: boolean;
    hasStorage: boolean;
    hasMeta: boolean;
}

/** Schedule + retention configuration persisted to config.json. */
export interface BackupScheduleConfig {
    enabled: boolean;
    /** Wall-clock times ("HH:MM") in the configured timezone. */
    times: string[];
    /** How many of the most recent backups to keep. */
    retention: number;
    timezone: string;
}

/** Status of the async host-side storage-restore queue. */
export interface StorageRestoreStatus {
    pending: boolean;
    backupId?: string;
    requestId?: string;
}

/** Aggregated data rendered by the admin backups page. */
export interface BackupRuntimeData {
    available: boolean;
    backupDir: string;
    config: BackupScheduleConfig;
    backups: BackupInfo[];
    totalSize: string;
    lastBackup: BackupInfo | null;
    nextRunLabel: string | null;
    storageRestore: StorageRestoreStatus | null;
    logs: string[];
}
