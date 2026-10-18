import "server-only";

import { execFile } from "child_process";
import { createReadStream, existsSync, readFileSync, readdirSync, statSync, writeFileSync } from "fs";
import { chmodSync, mkdirSync, rmSync } from "fs";
import path from "path";

import type {
    BackupInfo,
    BackupMeta,
    BackupScheduleConfig,
    BackupType,
    StorageRestoreStatus,
} from "@/types/backups";

// ----------------------------------------------------------------------------
// Paths & environment
// ----------------------------------------------------------------------------

export const BACKUP_ID_PATTERN = /^[0-9]{8}T[0-9]{6}Z_(manual|scheduled|pre-restore)$/;
export const DEFAULT_BACKUP_TZ = "Asia/Jerusalem";
export const DOWNLOADABLE_FILES = ["db.dump", "storage.tar.gz", "meta.json"] as const;

const BACKUP_TIMEOUT_MS = 15 * 60 * 1000; // 15 minutes max per operation

function resolveBackupRoot(): string {
    if (process.env.BACKUP_DIR) return process.env.BACKUP_DIR;
    // Inside the production container the host backup dir is mounted at /backups.
    if (process.env.NODE_ENV === "production") return "/backups";
    // Local development fallback so the admin page is usable without Docker.
    return path.join(process.cwd(), ".backups-dev");
}

function resolveStorageRoot(): string {
    if (process.env.BACKUP_STORAGE_DIR) return process.env.BACKUP_STORAGE_DIR;
    if (process.env.NODE_ENV === "production") return "/supabase-storage";
    return path.join(process.cwd(), ".storage-dev");
}

function resolveScript(name: string): string {
    // Production container: /app/scripts/<name>. Local dev: <project>/scripts/<name>.
    const inContainer = process.env.NODE_ENV === "production";
    return inContainer ? `/app/scripts/${name}` : path.join(process.cwd(), "scripts", name);
}

export const BACKUP_ROOT = resolveBackupRoot();
export const STORAGE_ROOT = resolveStorageRoot();
export const BACKUP_SCRIPT = resolveScript("db-backup.sh");
export const RESTORE_SCRIPT = resolveScript("db-restore.sh");
export const CONFIG_FILE = path.join(BACKUP_ROOT, "config.json");
export const LOG_FILE = path.join(BACKUP_ROOT, "backups.log");
export const QUEUE_DIR = path.join(BACKUP_ROOT, ".queue");

export const DEFAULT_BACKUP_CONFIG: BackupScheduleConfig = {
    enabled: true,
    times: ["03:00", "16:00"],
    retention: 30,
    timezone: DEFAULT_BACKUP_TZ,
};

// ----------------------------------------------------------------------------
// Availability & validation
// ----------------------------------------------------------------------------

export function isBackupSystemAvailable(): boolean {
    try {
        mkdirSync(BACKUP_ROOT, { recursive: true });
        const probe = path.join(BACKUP_ROOT, ".probe");
        writeFileSync(probe, "ok");
        rmSync(probe, { force: true });
        return true;
    } catch {
        return false;
    }
}

export function isValidBackupId(id: string): boolean {
    return BACKUP_ID_PATTERN.test(id);
}

/** Resolves the absolute path of a downloadable file inside a backup, or null. */
export function getBackupFilePath(id: string, file: string): string | null {
    if (!isValidBackupId(id)) return null;
    if (!(DOWNLOADABLE_FILES as readonly string[]).includes(file)) return null;
    const p = path.join(BACKUP_ROOT, id, file);
    try {
        const st = statSync(p);
        return st.isFile() ? p : null;
    } catch {
        return null;
    }
}

// ----------------------------------------------------------------------------
// Config
// ----------------------------------------------------------------------------

export function normalizeConfig(c: Partial<BackupScheduleConfig>): BackupScheduleConfig {
    const times = Array.isArray(c.times)
        ? c.times.filter(
            (t): t is string => typeof t === "string" && /^([01]\d|2[0-3]):[0-5]\d$/.test(t)
        )
        : [];
    const retention =
        typeof c.retention === "number" && Number.isInteger(c.retention)
            ? Math.min(90, Math.max(1, c.retention))
            : DEFAULT_BACKUP_CONFIG.retention;
    return {
        enabled: c.enabled !== false,
        times: times.length ? [...new Set(times)].sort() : [...DEFAULT_BACKUP_CONFIG.times],
        retention,
        timezone: c.timezone || DEFAULT_BACKUP_TZ,
    };
}

export function readBackupConfig(): BackupScheduleConfig {
    try {
        const raw = readFileSync(CONFIG_FILE, "utf8");
        return normalizeConfig(JSON.parse(raw));
    } catch {
        return { ...DEFAULT_BACKUP_CONFIG };
    }
}

export function writeBackupConfig(cfg: Partial<BackupScheduleConfig>): void {
    const normalized = normalizeConfig(cfg);
    mkdirSync(BACKUP_ROOT, { recursive: true });
    writeFileSync(CONFIG_FILE, `${JSON.stringify(normalized, null, 2)}\n`);
    try {
        // World-readable so the host scheduler can read it.
        chmodSync(CONFIG_FILE, 0o644);
    } catch {
        /* non-fatal */
    }
}

// ----------------------------------------------------------------------------
// Listing backups
// ----------------------------------------------------------------------------

function parseIdDate(id: string): Date {
    // "20261017T203000Z" -> Date
    const year = +id.slice(0, 4);
    const month = +id.slice(4, 6);
    const day = +id.slice(6, 8);
    const hour = +id.slice(9, 11);
    const minute = +id.slice(11, 13);
    const second = +id.slice(13, 15);
    return new Date(Date.UTC(year, month - 1, day, hour, minute, second));
}

function guessType(id: string): BackupType {
    if (id.endsWith("_pre-restore")) return "pre-restore";
    if (id.endsWith("_scheduled")) return "scheduled";
    return "manual";
}

function readMeta(dir: string): BackupMeta | null {
    try {
        const raw = readFileSync(path.join(dir, "meta.json"), "utf8");
        const parsed = JSON.parse(raw) as Partial<BackupMeta>;
        return {
            id: parsed.id || "",
            type: parsed.type || "manual",
            started_at: parsed.started_at || "",
            finished_at: parsed.finished_at || "",
            label_time: parsed.label_time,
            db_size: parsed.db_size,
            storage_size: parsed.storage_size,
            total_size: parsed.total_size,
            pg_version: parsed.pg_version,
        };
    } catch {
        return null;
    }
}

function formatBytes(bytes: number): string {
    if (!Number.isFinite(bytes) || bytes <= 0) return "";
    const units = ["B", "KB", "MB", "GB", "TB"];
    let value = bytes;
    let unit = 0;
    while (value >= 1024 && unit < units.length - 1) {
        value /= 1024;
        unit += 1;
    }
    return `${value.toFixed(value >= 10 || unit === 0 ? 0 : 1)} ${units[unit]}`;
}

function dirSizeBytes(dir: string): number {
    let total = 0;
    try {
        for (const entry of readdirSync(dir)) {
            const p = path.join(dir, entry);
            const st = statSync(p);
            total += st.isDirectory() ? dirSizeBytes(p) : st.size;
        }
    } catch {
        /* ignore */
    }
    return total;
}

export function listBackups(): BackupInfo[] {
    let names: string[] = [];
    try {
        names = readdirSync(BACKUP_ROOT);
    } catch {
        return [];
    }

    const result: BackupInfo[] = [];
    for (const name of names) {
        if (!BACKUP_ID_PATTERN.test(name)) continue;
        const dir = path.join(BACKUP_ROOT, name);
        try {
            const st = statSync(dir);
            if (!st.isDirectory()) continue;
        } catch {
            continue;
        }

        const meta = readMeta(dir);
        const dbPath = path.join(dir, "db.dump");
        const storagePath = path.join(dir, "storage.tar.gz");
        const hasDb = existsSync(dbPath);
        const hasStorage = existsSync(storagePath);

        result.push({
            id: name,
            type: meta?.type ?? guessType(name),
            createdAt: parseIdDate(name).toISOString(),
            labelTime: meta?.label_time,
            dbSize: meta?.db_size ?? (hasDb ? formatBytes(statSync(dbPath).size) : undefined),
            storageSize:
                meta?.storage_size ??
                (hasStorage ? formatBytes(statSync(storagePath).size) : undefined),
            totalSize: meta?.total_size ?? formatBytes(dirSizeBytes(dir)),
            hasDb,
            hasStorage,
            hasMeta: !!meta,
        });
    }

    result.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    return result;
}

export function getBackupsTotalSize(): string {
    let total = 0;
    for (const b of listBackups()) {
        total += dirSizeBytes(path.join(BACKUP_ROOT, b.id));
    }
    return formatBytes(total);
}

export function deleteBackup(id: string): boolean {
    if (!isValidBackupId(id)) return false;
    const p = path.join(BACKUP_ROOT, id);
    try {
        const st = statSync(p);
        if (!st.isDirectory()) return false;
        rmSync(p, { recursive: true, force: true });
        return true;
    } catch {
        return false;
    }
}

// ----------------------------------------------------------------------------
// Timezone-aware scheduling
// ----------------------------------------------------------------------------

interface TzParts {
    year: number;
    month: number;
    day: number;
    hour: number;
    minute: number;
    second: number;
}

function tzParts(date: Date, tz: string): TzParts {
    const fmt = new Intl.DateTimeFormat("en-US", {
        timeZone: tz,
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
        hour12: false,
    });
    const parts = fmt.formatToParts(date);
    const get = (type: Intl.DateTimeFormatPartTypes) =>
        parts.find((p) => p.type === type)?.value ?? "0";
    return {
        year: +get("year"),
        month: +get("month"),
        day: +get("day"),
        hour: +get("hour"),
        minute: +get("minute"),
        second: +get("second"),
    };
}

/**
 * Converts a wall-clock time (HH:MM) on a given calendar date (in `tz`) to the
 * actual UTC instant. Returns null when that wall time does not exist on that
 * date (DST spring-forward skips an hour).
 */
function wallToUtc(
    year: number,
    month: number,
    day: number,
    hour: number,
    minute: number,
    tz: string
): Date | null {
    const candidate = new Date(Date.UTC(year, month - 1, day, hour, minute, 0));
    const p = tzParts(candidate, tz);
    const deltaMin = (p.hour - hour) * 60 + (p.minute - minute);
    const corrected = new Date(candidate.getTime() - deltaMin * 60_000);
    // Verify the corrected instant really has the requested wall time.
    const check = tzParts(corrected, tz);
    if (check.hour === hour && check.minute === minute) return corrected;
    return null;
}

/** Next scheduled wall-clock time strictly after `now` (or null). DST-safe. */
export function getNextScheduledRun(
    times: string[],
    tz: string = DEFAULT_BACKUP_TZ,
    now: Date = new Date()
): Date | null {
    const unique = [...new Set(times.filter((t) => /^([01]\d|2[0-3]):[0-5]\d$/.test(t)))].sort();
    if (!unique.length) return null;

    for (let offset = 0; offset < 366; offset++) {
        const day = new Date(now.getTime() + offset * 86_400_000);
        const local = tzParts(day, tz);
        for (const t of unique) {
            const [h, m] = t.split(":").map(Number);
            const utc = wallToUtc(local.year, local.month, local.day, h, m, tz);
            if (utc && utc.getTime() > now.getTime()) return utc;
        }
    }
    return null;
}

export function formatInTz(date: Date, tz: string = DEFAULT_BACKUP_TZ, locale = "he-IL"): string {
    return new Intl.DateTimeFormat(locale, {
        timeZone: tz,
        dateStyle: "medium",
        timeStyle: "short",
    }).format(date);
}

export function formatTimeInTz(date: Date, tz: string = DEFAULT_BACKUP_TZ, locale = "he-IL"): string {
    return new Intl.DateTimeFormat(locale, {
        timeZone: tz,
        hour: "2-digit",
        minute: "2-digit",
    }).format(date);
}

// ----------------------------------------------------------------------------
// Running backup / restore scripts
// ----------------------------------------------------------------------------

export type BackupRunResult =
    | { ok: true; backupId?: string }
    | { ok: false; code: "LOCKED" | "RUN_FAILED" | "UNAVAILABLE"; message?: string };

function buildPgEnv(): NodeJS.ProcessEnv {
    const inContainer = process.env.NODE_ENV === "production";
    return {
        ...process.env,
        BACKUP_DIR: BACKUP_ROOT,
        BACKUP_STORAGE_DIR: STORAGE_ROOT,
        BACKUP_TZ: process.env.BACKUP_TZ || DEFAULT_BACKUP_TZ,
        PGHOST: process.env.PGHOST || (inContainer ? "host.docker.internal" : "127.0.0.1"),
        PGPORT: process.env.PGPORT || "54322",
        PGUSER: process.env.PGUSER || "postgres",
        PGPASSWORD: process.env.PGPASSWORD || "postgres",
        PGDATABASE: process.env.PGDATABASE || "postgres",
    };
}

function execFileAsync(
    file: string,
    args: string[],
    env: NodeJS.ProcessEnv
): Promise<{ code: number; stdout: string; stderr: string }> {
    return new Promise((resolve) => {
        execFile(
            file,
            args,
            { timeout: BACKUP_TIMEOUT_MS, maxBuffer: 8 * 1024 * 1024, env },
            (error, stdout, stderr) => {
                if (error) {
                    const code = typeof (error as { code?: unknown }).code === "number"
                        ? ((error as { code: number }).code)
                        : 1;
                    resolve({ code, stdout: stdout || "", stderr: stderr || "" });
                    return;
                }
                resolve({ code: 0, stdout: stdout || "", stderr: stderr || "" });
            }
        );
    });
}

export async function runBackup(type: BackupType = "manual"): Promise<BackupRunResult> {
    if (!isBackupSystemAvailable()) return { ok: false, code: "UNAVAILABLE" };
    const res = await execFileAsync(BACKUP_SCRIPT, [type], buildPgEnv());
    const stderr = res.stderr.trim();
    if (stderr === "LOCKED") return { ok: false, code: "LOCKED" };
    if (res.code === 0) return { ok: true, backupId: res.stdout.trim() };
    return {
        ok: false,
        code: "RUN_FAILED",
        message: stderr || (res.code === -1 ? "timeout" : `exit ${res.code}`),
    };
}

export async function runRestore(id: string): Promise<BackupRunResult> {
    if (!isValidBackupId(id)) return { ok: false, code: "RUN_FAILED", message: "invalid id" };
    if (!isBackupSystemAvailable()) return { ok: false, code: "UNAVAILABLE" };
    const res = await execFileAsync(RESTORE_SCRIPT, [id], buildPgEnv());
    const stderr = res.stderr.trim();
    if (stderr === "LOCKED") return { ok: false, code: "LOCKED" };
    if (res.code === 0) return { ok: true };
    return {
        ok: false,
        code: "RUN_FAILED",
        message: stderr || (res.code === -1 ? "timeout" : `exit ${res.code}`),
    };
}

// ----------------------------------------------------------------------------
// Queue status & logs
// ----------------------------------------------------------------------------

export function getStorageRestoreStatus(): StorageRestoreStatus | null {
    try {
        if (!existsSync(QUEUE_DIR)) return null;
        const files = readdirSync(QUEUE_DIR).filter((f) => f.startsWith("storage-restore-"));
        const pendingFile = files.find((f) => f.endsWith(".json"));
        if (pendingFile) {
            let backupId: string | undefined;
            try {
                const parsed = JSON.parse(readFileSync(path.join(QUEUE_DIR, pendingFile), "utf8"));
                if (typeof parsed.backup_id === "string") backupId = parsed.backup_id;
            } catch {
                /* ignore */
            }
            return {
                pending: true,
                requestId: pendingFile.replace("storage-restore-", "").replace(/\.json$/, ""),
                backupId,
            };
        }
        return null;
    } catch {
        return null;
    }
}

export function readBackupLogs(lines = 80): string[] {
    try {
        const raw = readFileSync(LOG_FILE, "utf8");
        return raw.split("\n").filter(Boolean).slice(-lines);
    } catch {
        return [];
    }
}

export { createReadStream };
