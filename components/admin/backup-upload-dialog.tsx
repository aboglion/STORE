"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import {
    AlertTriangle,
    CheckCircle2,
    Database,
    FileArchive,
    FileUp,
    FolderArchive,
    ImageIcon,
    Loader2,
    UploadCloud,
    X,
} from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";

function formatFileSize(bytes: number): string {
    if (!Number.isFinite(bytes) || bytes <= 0) return "0 B";
    const units = ["B", "KB", "MB", "GB"];
    let value = bytes;
    let unit = 0;
    while (value >= 1024 && unit < units.length - 1) {
        value /= 1024;
        unit += 1;
    }
    return `${value.toFixed(value >= 10 || unit === 0 ? 0 : 1)} ${units[unit]}`;
}

function uploadFileWithProgress(
    url: string,
    file: File,
    onProgress: (pct: number) => void
): Promise<{ ok: boolean; backupId?: string; restored?: boolean; error?: string; message?: string }> {
    return new Promise((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhr.open("POST", url, true);
        xhr.setRequestHeader("Content-Type", "application/octet-stream");

        xhr.upload.onprogress = (e) => {
            if (e.lengthComputable) {
                const pct = Math.round((e.loaded / e.total) * 100);
                onProgress(pct);
            }
        };

        xhr.onload = () => {
            try {
                const res = JSON.parse(xhr.responseText);
                if (xhr.status >= 200 && xhr.status < 300 && res.ok) {
                    resolve(res);
                } else {
                    reject(new Error(res.message || res.error || `Upload failed with status ${xhr.status}`));
                }
            } catch {
                reject(new Error(`Server error (${xhr.status}): ${xhr.responseText.slice(0, 150)}`));
            }
        };

        xhr.onerror = () => reject(new Error("Network error during file upload"));
        xhr.ontimeout = () => reject(new Error("Upload timed out"));
        xhr.timeout = 15 * 60 * 1000; // 15 mins

        xhr.send(file);
    });
}

export function BackupUploadDialog({
    available,
    onRestoreStart,
    onRestoreDone,
}: {
    available: boolean;
    onRestoreStart?: (id?: string) => void;
    onRestoreDone?: (success: boolean, error?: string) => void;
}) {
    const t = useTranslations("admin.backups.upload");
    const router = useRouter();

    const [open, setOpen] = useState(false);
    const [primaryFile, setPrimaryFile] = useState<File | null>(null);
    const [storageFile, setStorageFile] = useState<File | null>(null);
    const [restoreNow, setRestoreNow] = useState(true);
    const [uploading, setUploading] = useState(false);
    const [progress, setProgress] = useState(0);
    const [phase, setPhase] = useState<"uploading" | "validating" | "restoring">("uploading");

    const primaryInputRef = useRef<HTMLInputElement>(null);
    const storageInputRef = useRef<HTMLInputElement>(null);

    const isBundle =
        primaryFile &&
        (primaryFile.name.endsWith(".zip") ||
            (primaryFile.name.endsWith(".tar.gz") && !primaryFile.name.toLowerCase().includes("storage")));

    const isStorageDirect =
        primaryFile &&
        primaryFile.name.toLowerCase().includes("storage") &&
        primaryFile.name.endsWith(".tar.gz");

    function resetState() {
        setPrimaryFile(null);
        setStorageFile(null);
        setUploading(false);
        setProgress(0);
        setPhase("uploading");
    }

    async function handleSubmit() {
        if (!primaryFile) return;

        setUploading(true);
        setProgress(0);
        setPhase("uploading");

        try {
            // Case 1: Primary file with optional secondary storage file
            const hasSecondary = !!storageFile;

            // 1. Upload primary file
            // If there's a secondary storage file, don't restore yet on step 1
            const step1Restore = restoreNow && !hasSecondary;
            const primaryUrl = `/api/admin/backups/upload?name=${encodeURIComponent(primaryFile.name)}&restoreNow=${step1Restore ? "true" : "false"}`;

            setPhase("uploading");
            const res1 = await uploadFileWithProgress(primaryUrl, primaryFile, (pct) => {
                setProgress(hasSecondary ? Math.round(pct * 0.45) : pct);
                if (pct === 100) {
                    setPhase(step1Restore ? "restoring" : "validating");
                    if (step1Restore && onRestoreStart) {
                        setOpen(false);
                        onRestoreStart(primaryFile.name);
                    }
                }
            });

            const backupId = res1.backupId;
            if (!backupId) throw new Error("No backup ID returned from upload");

            // 2. Upload secondary storage file if provided
            if (hasSecondary && storageFile) {
                setPhase("uploading");
                const secondaryUrl = `/api/admin/backups/upload?name=${encodeURIComponent(storageFile.name)}&targetId=${encodeURIComponent(backupId)}&restoreNow=${restoreNow ? "true" : "false"}`;

                await uploadFileWithProgress(secondaryUrl, storageFile, (pct) => {
                    setProgress(45 + Math.round(pct * 0.5));
                    if (pct === 100) {
                        setPhase(restoreNow ? "restoring" : "validating");
                        if (restoreNow && onRestoreStart) {
                            setOpen(false);
                            onRestoreStart(primaryFile.name);
                        }
                    }
                });
            }

            setProgress(100);
            if (restoreNow && onRestoreDone) {
                onRestoreDone(true);
                resetState();
            } else {
                toast.success(restoreNow ? t("successToast") : t("uploadSuccessToast"));
                setOpen(false);
                resetState();
                router.refresh();
            }
        } catch (err) {
            const msg = err instanceof Error ? err.message : String(err);
            if (restoreNow && onRestoreDone) {
                onRestoreDone(false, msg);
            } else {
                toast.error(msg);
            }
            setUploading(false);
        }
    }

    return (
        <Dialog
            open={open}
            onOpenChange={(v) => {
                if (!uploading) {
                    setOpen(v);
                    if (!v) resetState();
                }
            }}
        >
            <DialogTrigger asChild>
                <Button variant="outline" disabled={!available} className="gap-2">
                    <FileUp className="size-4" />
                    {t("trigger")}
                </Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <UploadCloud className="size-5 text-primary" />
                        {t("title")}
                    </DialogTitle>
                    <DialogDescription>{t("desc")}</DialogDescription>
                </DialogHeader>

                <div className="grid gap-4 py-2">
                    {/* Primary file selection */}
                    <div className="grid gap-2">
                        <label className="text-xs font-semibold text-foreground">
                            {t("selectFile")}
                        </label>

                        {!primaryFile ? (
                            <div
                                onClick={() => primaryInputRef.current?.click()}
                                onDragOver={(e) => e.preventDefault()}
                                onDrop={(e) => {
                                    e.preventDefault();
                                    const file = e.dataTransfer.files?.[0];
                                    if (file) setPrimaryFile(file);
                                }}
                                className="flex cursor-pointer flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-muted-foreground/25 bg-muted/20 p-6 text-center transition-colors hover:border-primary/50 hover:bg-muted/40"
                            >
                                <div className="flex size-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
                                    <FileArchive className="size-5" />
                                </div>
                                <p className="text-sm font-medium">{t("dropzoneHint")}</p>
                                <p className="text-xs text-muted-foreground">{t("supportedFormats")}</p>
                                <input
                                    ref={primaryInputRef}
                                    type="file"
                                    accept=".dump,.sql,.tar.gz,.tgz,.zip,application/gzip,application/zip,application/octet-stream"
                                    className="hidden"
                                    onChange={(e) => {
                                        const file = e.target.files?.[0];
                                        if (file) setPrimaryFile(file);
                                    }}
                                />
                            </div>
                        ) : (
                            <div className="flex items-center justify-between rounded-xl border bg-muted/30 p-3">
                                <div className="flex items-center gap-3 min-w-0">
                                    <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                                        {isBundle ? (
                                            <FolderArchive className="size-5" />
                                        ) : isStorageDirect ? (
                                            <ImageIcon className="size-5" />
                                        ) : (
                                            <Database className="size-5" />
                                        )}
                                    </div>
                                    <div className="min-w-0">
                                        <p className="truncate text-xs font-medium font-mono" dir="ltr">
                                            {primaryFile.name}
                                        </p>
                                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                            <span>{formatFileSize(primaryFile.size)}</span>
                                            <span>•</span>
                                            <span className="text-primary font-medium">
                                                {isBundle
                                                    ? t("fileDetectedBundle")
                                                    : isStorageDirect
                                                      ? t("fileDetectedStorage")
                                                      : t("fileDetectedDb")}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                                {!uploading && (
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        className="size-7 text-muted-foreground hover:text-foreground shrink-0"
                                        onClick={() => setPrimaryFile(null)}
                                    >
                                        <X className="size-4" />
                                    </Button>
                                )}
                            </div>
                        )}
                    </div>

                    {/* Secondary Storage file selection (if primary is db-only) */}
                    {primaryFile && !isBundle && !isStorageDirect && (
                        <div className="rounded-xl border border-dashed border-muted-foreground/30 bg-muted/10 p-3">
                            <div className="flex items-start justify-between gap-2">
                                <div>
                                    <p className="text-xs font-semibold">{t("selectStorageOptional")}</p>
                                    <p className="text-xs text-muted-foreground">{t("storageOptionalDesc")}</p>
                                </div>
                                {!storageFile ? (
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        type="button"
                                        onClick={() => storageInputRef.current?.click()}
                                        className="shrink-0 gap-1.5 text-xs h-8"
                                    >
                                        <ImageIcon className="size-3.5" />
                                        {t("selectFile")}
                                    </Button>
                                ) : (
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        className="size-6 text-muted-foreground shrink-0"
                                        onClick={() => setStorageFile(null)}
                                    >
                                        <X className="size-3.5" />
                                    </Button>
                                )}
                            </div>
                            <input
                                ref={storageInputRef}
                                type="file"
                                accept=".tar.gz,.tgz,application/gzip"
                                className="hidden"
                                onChange={(e) => {
                                    const file = e.target.files?.[0];
                                    if (file) setStorageFile(file);
                                }}
                            />
                            {storageFile && (
                                <div className="mt-2 flex items-center gap-2 rounded-lg bg-background p-2 text-xs font-mono border" dir="ltr">
                                    <ImageIcon className="size-4 text-primary shrink-0" />
                                    <span className="truncate">{storageFile.name}</span>
                                    <span className="ms-auto text-muted-foreground shrink-0">
                                        {formatFileSize(storageFile.size)}
                                    </span>
                                </div>
                            )}
                        </div>
                    )}

                    {/* Restore checkbox & warnings */}
                    <div className="rounded-xl border bg-card p-3">
                        <label className="flex items-start gap-2.5 cursor-pointer">
                            <Checkbox
                                checked={restoreNow}
                                onCheckedChange={(c) => setRestoreNow(c === true)}
                                disabled={uploading}
                                className="mt-0.5"
                            />
                            <div className="grid gap-1">
                                <span className="text-xs font-semibold">{t("restoreNow")}</span>
                                <span className="text-xs text-muted-foreground leading-relaxed">
                                    {t("restoreNowWarning")}
                                </span>
                            </div>
                        </label>
                    </div>

                    {/* Upload progress indicator */}
                    {uploading && (
                        <div className="grid gap-2 rounded-xl border bg-primary/5 p-3.5">
                            <div className="flex items-center justify-between text-xs font-medium">
                                <span className="flex items-center gap-2 text-primary">
                                    <Loader2 className="size-3.5 animate-spin" />
                                    {phase === "uploading" && t("uploading", { percent: progress })}
                                    {phase === "validating" && t("validating")}
                                    {phase === "restoring" && t("restoring")}
                                </span>
                                <span className="font-mono text-muted-foreground">{progress}%</span>
                            </div>
                            <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
                                <div
                                    className="h-full bg-primary transition-all duration-300"
                                    style={{ width: `${progress}%` }}
                                />
                            </div>
                        </div>
                    )}
                </div>

                <DialogFooter className="gap-2 sm:gap-0">
                    <Button
                        variant="ghost"
                        onClick={() => setOpen(false)}
                        disabled={uploading}
                    >
                        {t("cancel")}
                    </Button>
                    <Button
                        onClick={handleSubmit}
                        disabled={!primaryFile || uploading}
                        className="gap-2"
                    >
                        {uploading ? (
                            <Loader2 className="size-4 animate-spin" />
                        ) : (
                            <CheckCircle2 className="size-4" />
                        )}
                        {restoreNow ? t("uploadAndRestore") : t("uploadOnly")}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
