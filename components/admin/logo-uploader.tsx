"use client";

import Image from "next/image";
import { useRef, useState, useTransition } from "react";
import { useTranslations } from "next-intl";

import imageCompression from "browser-image-compression";
import { Loader2, Trash2, Upload } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { removeStoreLogo, uploadStoreLogo } from "@/lib/actions/settings";
import { storageImageUrl } from "@/lib/utils/images";

export function LogoUploader({
    value,
    storeName,
    onChange,
}: {
    /** Current logo storage path ("" when none). */
    value: string;
    storeName: string;
    onChange: (path: string) => void;
}) {
    const inputRef = useRef<HTMLInputElement>(null);
    const t = useTranslations("admin.settings");
    const [pending, startTransition] = useTransition();
    const [uploading, setUploading] = useState(false);

    async function handleFiles(files: FileList | null) {
        const file = files?.[0];
        if (!file) return;

        if (!file.type.startsWith("image/")) {
            toast.error(t("notImageToast"));
            return;
        }

        setUploading(true);
        try {
            const compressed = await imageCompression(file, {
                maxSizeMB: 1,
                maxWidthOrHeight: 512,
                useWebWorker: true,
            });

            startTransition(async () => {
                const res = await uploadStoreLogo(compressed);
                if (res?.error) {
                    toast.error(res.error);
                } else if (res?.path) {
                    onChange(res.path);
                    toast.success(t("logoUploadedToast"));
                }
            });
        } catch {
            toast.error(t("compressFailedToast"));
        } finally {
            setUploading(false);
            if (inputRef.current) inputRef.current.value = "";
        }
    }

    function handleRemove() {
        startTransition(async () => {
            const res = await removeStoreLogo();
            if (res?.error) {
                toast.error(res.error);
            } else {
                onChange("");
                toast.success(t("logoRemovedToast"));
            }
        });
    }

    const src = value ? storageImageUrl(value) : "";

    return (
        <div className="flex flex-wrap items-center gap-4">
            <div className="flex size-16 shrink-0 items-center justify-center overflow-hidden rounded-2xl border border-border/70 bg-card shadow-soft">
                {src ? (
                    <Image
                        src={src}
                        alt={storeName}
                        width={64}
                        height={64}
                        className="size-full object-contain p-1"
                    />
                ) : (
                    <span className="text-xs font-medium text-muted-foreground">
                        {t("noLogo")}
                    </span>
                )}
            </div>

            <div className="grid gap-2">
                <input
                    ref={inputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => handleFiles(e.target.files)}
                />
                <div className="flex flex-wrap gap-2">
                    <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="rounded-full"
                        disabled={uploading || pending}
                        onClick={() => inputRef.current?.click()}
                    >
                        {uploading ? (
                            <Loader2 className="size-4 animate-spin" />
                        ) : (
                            <Upload className="size-4" />
                        )}
                        {value ? t("replaceLogo") : t("uploadLogo")}
                    </Button>
                    {value && (
                        <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="rounded-full text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
                            disabled={pending}
                            onClick={handleRemove}
                        >
                            <Trash2 className="size-4" />
                            {t("remove")}
                        </Button>
                    )}
                </div>
                <p className="text-xs text-muted-foreground">
                    {t("logoHint")}
                </p>
            </div>
        </div>
    );
}
