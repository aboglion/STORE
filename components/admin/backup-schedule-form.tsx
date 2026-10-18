"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Clock, Loader2, Plus, Save, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { saveBackupSchedule } from "@/lib/actions/backups";
import type { BackupScheduleConfig } from "@/types/backups";

const TIME_RE = /^([01]\d|2[0-3]):[0-5]\d$/;
const MAX_TIMES = 24;
const MAX_RETENTION = 90;

export function BackupScheduleForm({ config }: { config: BackupScheduleConfig }) {
    const router = useRouter();
    const t = useTranslations("admin.backups.schedule");

    const [enabled, setEnabled] = useState(config.enabled);
    const [times, setTimes] = useState<string[]>(
        config.times.length ? config.times : ["03:00", "16:00"]
    );
    const [retention, setRetention] = useState(String(config.retention));
    const [pending, startTransition] = useTransition();

    const validTimes = times.length > 0 && times.every((time) => TIME_RE.test(time));
    const validRetention = /^\d+$/.test(retention) && +retention >= 1 && +retention <= MAX_RETENTION;

    function updateTime(index: number, value: string) {
        setTimes((prev) => prev.map((time, i) => (i === index ? value : time)));
    }

    function addTime() {
        setTimes((prev) => (prev.length < MAX_TIMES ? [...prev, "03:00"] : prev));
    }

    function removeTime(index: number) {
        setTimes((prev) => prev.filter((_, i) => i !== index));
    }

    function onSubmit() {
        if (!validTimes || !validRetention) return;
        startTransition(async () => {
            const res = await saveBackupSchedule({
                enabled,
                times: [...new Set(times)],
                retention: +retention,
            });
            if (res?.error) {
                toast.error(res.error);
                return;
            }
            toast.success(t("savedToast"));
            router.refresh();
        });
    }

    return (
        <Card>
            <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                    <Clock className="size-4 text-primary" />
                    {t("title")}
                </CardTitle>
                <CardDescription>{t("desc")}</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-5">
                <div className="flex items-center gap-3">
                    <Checkbox
                        id="backup-enabled"
                        checked={enabled}
                        onCheckedChange={(value) => setEnabled(value === true)}
                    />
                    <Label htmlFor="backup-enabled" className="font-medium">
                        {t("enabled")}
                    </Label>
                </div>

                <div className="grid gap-3">
                    <Label>{t("times")}</Label>
                    <div className="grid gap-2 sm:grid-cols-2">
                        {times.map((time, index) => (
                            <div key={index} className="flex items-center gap-2">
                                <Input
                                    type="time"
                                    value={time}
                                    onChange={(e) => updateTime(index, e.target.value)}
                                    className="h-10 rounded-xl font-mono text-sm"
                                    disabled={!enabled}
                                />
                                <Button
                                    type="button"
                                    variant="ghost"
                                    size="icon"
                                    className="text-muted-foreground hover:text-destructive"
                                    onClick={() => removeTime(index)}
                                    disabled={times.length <= 1 || !enabled}
                                    aria-label={t("removeTime")}
                                >
                                    <Trash2 className="size-4" />
                                </Button>
                            </div>
                        ))}
                    </div>
                    <div>
                        <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={addTime}
                            disabled={times.length >= MAX_TIMES || !enabled}
                        >
                            <Plus className="size-4" />
                            {t("addTime")}
                        </Button>
                    </div>
                </div>

                <div className="grid max-w-xs gap-2">
                    <Label htmlFor="backup-retention">{t("retention")}</Label>
                    <Input
                        id="backup-retention"
                        type="number"
                        min={1}
                        max={MAX_RETENTION}
                        value={retention}
                        onChange={(e) => setRetention(e.target.value)}
                        className="h-10 rounded-xl"
                    />
                    <p className="text-xs text-muted-foreground">{t("retentionDesc")}</p>
                </div>

                <div className="flex items-center gap-3">
                    <Button
                        type="button"
                        onClick={onSubmit}
                        disabled={pending || !validTimes || !validRetention}
                        className="gap-2"
                    >
                        {pending ? (
                            <Loader2 className="size-4 animate-spin" />
                        ) : (
                            <Save className="size-4" />
                        )}
                        {t("save")}
                    </Button>
                    {!validTimes && (
                        <span className="text-xs text-destructive">{t("invalidTimes")}</span>
                    )}
                </div>
            </CardContent>
        </Card>
    );
}
