"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import {
    AlertTriangle,
    CalendarClock,
    DatabaseBackup,
    Download,
    HardDrive,
    History,
    Loader2,
    Save,
    Terminal,
    Trash2,
    UploadCloud,
} from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
    AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Input } from "@/components/ui/input";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { createBackupNow, deleteBackup, restoreBackup } from "@/lib/actions/backups";
import type { BackupInfo, BackupRuntimeData, BackupType } from "@/types/backups";

import { BackupScheduleForm } from "./backup-schedule-form";

function formatJerusalem(iso: string): string {
    try {
        return new Intl.DateTimeFormat("he-IL", {
            timeZone: "Asia/Jerusalem",
            dateStyle: "medium",
            timeStyle: "short",
        }).format(new Date(iso));
    } catch {
        return iso;
    }
}

// ----------------------------------------------------------------------------
// Main view
// ----------------------------------------------------------------------------

export function BackupsView({ runtime }: { runtime: BackupRuntimeData }) {
    const t = useTranslations("admin.backups");
    const router = useRouter();
    const [pendingBackup, startBackup] = useTransition();

    function onManualBackup() {
        startBackup(async () => {
            const res = await createBackupNow();
            if (res?.error) {
                toast.error(res.error);
                return;
            }
            toast.success(t("backupCreatedToast"));
            router.refresh();
        });
    }

    return (
        <div className="grid max-w-6xl gap-6">
            <div className="flex flex-wrap items-center justify-between gap-4">
                <div>
                    <h1 className="font-display text-2xl font-extrabold tracking-tight">
                        {t("title")}
                    </h1>
                    <p className="mt-1 text-sm text-muted-foreground">{t("desc")}</p>
                </div>
                <Button
                    onClick={onManualBackup}
                    disabled={pendingBackup || !runtime.available}
                    className="gap-2"
                >
                    {pendingBackup ? (
                        <Loader2 className="size-4 animate-spin" />
                    ) : (
                        <DatabaseBackup className="size-4" />
                    )}
                    {t("createBackup")}
                </Button>
            </div>

            {!runtime.available && (
                <div className="flex items-start gap-3 rounded-2xl border border-destructive/30 bg-destructive/5 p-4 text-sm">
                    <AlertTriangle className="mt-0.5 size-5 shrink-0 text-destructive" />
                    <div>
                        <p className="font-semibold text-destructive">{t("unavailableTitle")}</p>
                        <p className="mt-1 text-muted-foreground">
                            {t("unavailableDesc")}{" "}
                            <code className="rounded bg-muted px-1.5 py-0.5 text-xs" dir="ltr">
                                {runtime.backupDir}
                            </code>
                        </p>
                    </div>
                </div>
            )}

            {runtime.storageRestore?.pending && (
                <div className="flex items-start gap-3 rounded-2xl border border-primary/30 bg-primary/5 p-4 text-sm">
                    <Loader2 className="mt-0.5 size-5 shrink-0 animate-spin text-primary" />
                    <div>
                        <p className="font-semibold text-foreground">
                            {t("storageRestorePending")}
                        </p>
                        <p className="mt-1 text-muted-foreground">
                            {t("storageRestorePendingDesc")}
                        </p>
                    </div>
                </div>
            )}

            <StatsGrid runtime={runtime} />

            <BackupScheduleForm config={runtime.config} />

            <BackupsTable backups={runtime.backups} available={runtime.available} />

            {runtime.logs.length > 0 && <LogsCard logs={runtime.logs} />}
        </div>
    );
}

// ----------------------------------------------------------------------------
// Stats
// ----------------------------------------------------------------------------

function StatsGrid({ runtime }: { runtime: BackupRuntimeData }) {
    const t = useTranslations("admin.backups.stats");

    return (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard
                icon={<CalendarClock className="size-4" />}
                label={t("lastBackup")}
                value={runtime.lastBackup?.labelTime || t("never")}
            />
            <StatCard
                icon={<Save className="size-4" />}
                label={t("nextScheduled")}
                value={runtime.nextRunLabel || t("disabled")}
                muted={!runtime.nextRunLabel}
            />
            <StatCard
                icon={<History className="size-4" />}
                label={t("count")}
                value={`${runtime.backups.length}`}
                sub={t("ofRetention", { retention: runtime.config.retention })}
            />
            <StatCard
                icon={<HardDrive className="size-4" />}
                label={t("totalSize")}
                value={runtime.totalSize || "—"}
            />
        </div>
    );
}

function StatCard({
    icon,
    label,
    value,
    sub,
    muted = false,
}: {
    icon: React.ReactNode;
    label: string;
    value: string;
    sub?: string;
    muted?: boolean;
}) {
    return (
        <Card>
            <CardContent className="flex items-start gap-3 p-4">
                <div className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                    {icon}
                </div>
                <div className="min-w-0">
                    <p className="text-xs text-muted-foreground">{label}</p>
                    <p className={`truncate font-semibold ${muted ? "text-muted-foreground" : ""}`}>
                        {value}
                    </p>
                    {sub && <p className="truncate text-xs text-muted-foreground">{sub}</p>}
                </div>
            </CardContent>
        </Card>
    );
}

// ----------------------------------------------------------------------------
// Backups table
// ----------------------------------------------------------------------------

function TypeBadge({ type }: { type: BackupType }) {
    const t = useTranslations("admin.backups.types");
    if (type === "scheduled") {
        return <Badge variant="secondary">{t("scheduled")}</Badge>;
    }
    if (type === "pre-restore") {
        return (
            <Badge variant="outline" className="border-amber-300 text-amber-600">
                {t("preRestore")}
            </Badge>
        );
    }
    return <Badge>{t("manual")}</Badge>;
}

function BackupsTable({ backups, available }: { backups: BackupInfo[]; available: boolean }) {
    const t = useTranslations("admin.backups.table");

    if (backups.length === 0) {
        return (
            <Card>
                <CardContent className="flex flex-col items-center gap-3 p-10 text-center">
                    <DatabaseBackup className="size-10 text-muted-foreground/40" />
                    <p className="font-medium">{t("empty")}</p>
                    <p className="max-w-sm text-sm text-muted-foreground">{t("emptyDesc")}</p>
                </CardContent>
            </Card>
        );
    }

    return (
        <Card>
            <CardHeader>
                <CardTitle className="text-base">{t("title")}</CardTitle>
                <CardDescription>{t("desc")}</CardDescription>
            </CardHeader>
            <CardContent className="p-0">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>{t("time")}</TableHead>
                            <TableHead>{t("type")}</TableHead>
                            <TableHead className="text-end">{t("db")}</TableHead>
                            <TableHead className="text-end">{t("storage")}</TableHead>
                            <TableHead className="text-end">{t("total")}</TableHead>
                            <TableHead className="text-end">{t("actions")}</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {backups.map((backup) => (
                            <TableRow key={backup.id}>
                                <TableCell>
                                    <div className="min-w-0">
                                        <p className="font-medium">
                                            {backup.labelTime || formatJerusalem(backup.createdAt)}
                                        </p>
                                        <p className="font-mono text-xs text-muted-foreground" dir="ltr">
                                            {backup.id}
                                        </p>
                                    </div>
                                </TableCell>
                                <TableCell>
                                    <TypeBadge type={backup.type} />
                                </TableCell>
                                <TableCell className="text-end font-mono text-xs">
                                    {backup.hasDb ? backup.dbSize || "—" : "—"}
                                </TableCell>
                                <TableCell className="text-end font-mono text-xs">
                                    {backup.hasStorage ? backup.storageSize || "—" : "—"}
                                </TableCell>
                                <TableCell className="text-end font-mono text-xs">
                                    {backup.totalSize || "—"}
                                </TableCell>
                                <TableCell className="text-end">
                                    <div className="flex items-center justify-end gap-1.5">
                                        <DownloadButton
                                            href={`/api/admin/backups/${backup.id}/db.dump`}
                                            label={t("downloadDb")}
                                        />
                                        {backup.hasStorage && (
                                            <DownloadButton
                                                href={`/api/admin/backups/${backup.id}/storage.tar.gz`}
                                                label={t("downloadStorage")}
                                            />
                                        )}
                                        <RestoreDialog backup={backup} available={available} />
                                        <DeleteDialog backup={backup} available={available} />
                                    </div>
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </CardContent>
        </Card>
    );
}

function DownloadButton({ href, label }: { href: string; label: string }) {
    return (
        <a
            href={href}
            download
            title={label}
            aria-label={label}
            className="inline-flex size-8 items-center justify-center rounded-lg border border-input text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
        >
            <Download className="size-4" />
        </a>
    );
}

// ----------------------------------------------------------------------------
// Restore dialog (typed confirmation)
// ----------------------------------------------------------------------------

function RestoreDialog({ backup, available }: { backup: BackupInfo; available: boolean }) {
    const t = useTranslations("admin.backups.restore");
    const router = useRouter();
    const [open, setOpen] = useState(false);
    const [confirm, setConfirm] = useState("");
    const [pending, startTransition] = useTransition();

    const ready = confirm === backup.id;

    function onRestore() {
        startTransition(async () => {
            const res = await restoreBackup(backup.id);
            if (res?.error) {
                toast.error(res.error);
                return;
            }
            toast.success(t("successToast"));
            setOpen(false);
            setConfirm("");
            router.refresh();
        });
    }

    return (
        <AlertDialog open={open} onOpenChange={setOpen}>
            <AlertDialogTrigger asChild>
                <Button
                    variant="outline"
                    size="icon"
                    className="size-8"
                    disabled={!available}
                    title={t("trigger")}
                >
                    <UploadCloud className="size-4" />
                </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
                <AlertDialogHeader>
                    <AlertDialogTitle>{t("title")}</AlertDialogTitle>
                    <AlertDialogDescription className="grid gap-2">
                        <p>{t("desc")}</p>
                        <ul className="list-disc ps-4 text-xs leading-relaxed">
                            <li>{t("safety")}</li>
                            <li>{t("disconnect")}</li>
                            <li>{t("storageNote")}</li>
                        </ul>
                        <p className="pt-1 font-semibold text-foreground">{t("typeToConfirm")}</p>
                    </AlertDialogDescription>
                </AlertDialogHeader>
                <Input
                    value={confirm}
                    onChange={(e) => setConfirm(e.target.value)}
                    placeholder={backup.id}
                    className="h-10 rounded-xl font-mono text-xs"
                    dir="ltr"
                />
                <AlertDialogFooter>
                    <AlertDialogCancel disabled={pending}>{t("cancel")}</AlertDialogCancel>
                    <AlertDialogAction
                        onClick={(e) => {
                            e.preventDefault();
                            onRestore();
                        }}
                        disabled={!ready || pending}
                        className="gap-2"
                    >
                        {pending ? (
                            <Loader2 className="size-4 animate-spin" />
                        ) : (
                            <UploadCloud className="size-4" />
                        )}
                        {t("confirm")}
                    </AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
    );
}

// ----------------------------------------------------------------------------
// Delete dialog
// ----------------------------------------------------------------------------

function DeleteDialog({ backup, available }: { backup: BackupInfo; available: boolean }) {
    const t = useTranslations("admin.backups.delete");
    const router = useRouter();
    const [open, setOpen] = useState(false);
    const [pending, startTransition] = useTransition();

    function onDelete() {
        startTransition(async () => {
            const res = await deleteBackup(backup.id);
            if (res?.error) {
                toast.error(res.error);
                return;
            }
            toast.success(t("successToast"));
            setOpen(false);
            router.refresh();
        });
    }

    return (
        <AlertDialog open={open} onOpenChange={setOpen}>
            <AlertDialogTrigger asChild>
                <Button
                    variant="ghost"
                    size="icon"
                    className="size-8 text-muted-foreground hover:text-destructive"
                    disabled={!available}
                    title={t("trigger")}
                >
                    <Trash2 className="size-4" />
                </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
                <AlertDialogHeader>
                    <AlertDialogTitle>{t("title")}</AlertDialogTitle>
                    <AlertDialogDescription>{t("desc")}</AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                    <AlertDialogCancel disabled={pending}>{t("cancel")}</AlertDialogCancel>
                    <AlertDialogAction
                        onClick={(e) => {
                            e.preventDefault();
                            onDelete();
                        }}
                        disabled={pending}
                        className="gap-2 bg-destructive text-white hover:bg-destructive/90"
                    >
                        {pending ? <Loader2 className="size-4 animate-spin" /> : null}
                        {t("confirm")}
                    </AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
    );
}

// ----------------------------------------------------------------------------
// Logs
// ----------------------------------------------------------------------------

function LogsCard({ logs }: { logs: string[] }) {
    const t = useTranslations("admin.backups.logs");
    const [expanded, setExpanded] = useState(false);
    const visible = expanded ? logs : logs.slice(-25);

    return (
        <Card>
            <CardHeader className="flex-row items-center justify-between">
                <CardTitle className="flex items-center gap-2 text-base">
                    <Terminal className="size-4 text-primary" />
                    {t("title")}
                </CardTitle>
                <Button variant="ghost" size="sm" onClick={() => setExpanded((v) => !v)}>
                    {expanded ? t("collapse") : t("expand")}
                </Button>
            </CardHeader>
            <CardContent>
                <pre
                    dir="ltr"
                    className="max-h-64 overflow-auto rounded-xl bg-muted/50 p-4 font-mono text-xs leading-relaxed"
                >
                    {visible.join("\n")}
                </pre>
            </CardContent>
        </Card>
    );
}
