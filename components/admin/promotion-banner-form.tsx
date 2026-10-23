"use client";

import Image from "next/image";
import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";

import imageCompression from "browser-image-compression";
import { ImageIcon, Loader2, Trash2, Upload } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
    removePromotionsBanner,
    updatePromotionsBanner,
    uploadPromotionsBannerImage,
} from "@/lib/actions/promotions";
import { storageImageUrl } from "@/lib/utils/images";

export function PromotionBannerForm({
    imagePath,
    titleHe,
    titleAr,
    enabled,
}: {
    imagePath: string;
    titleHe: string;
    titleAr: string;
    enabled: boolean;
}) {
    const router = useRouter();
    const t = useTranslations("admin.promotions.banner");
    const inputRef = useRef<HTMLInputElement>(null);
    const [pending, startTransition] = useTransition();
    const [uploading, setUploading] = useState(false);
    const [currentPath, setCurrentPath] = useState(imagePath);
    const [currentTitleHe, setCurrentTitleHe] = useState(titleHe);
    const [currentTitleAr, setCurrentTitleAr] = useState(titleAr);
    const [currentEnabled, setCurrentEnabled] = useState(enabled);
    const [imageFailed, setImageFailed] = useState(false);

    const src = currentPath && !imageFailed ? storageImageUrl(currentPath) : "";

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
                maxSizeMB: 1.5,
                maxWidthOrHeight: 1920,
                useWebWorker: true,
            });

            startTransition(async () => {
                const res = await uploadPromotionsBannerImage(compressed);
                if (res?.error) {
                    toast.error(res.error);
                } else if (res?.path) {
                    setCurrentPath(res.path);
                    setImageFailed(false);
                    toast.success(t("imageUploadedToast"));
                }
            });
        } catch {
            toast.error(t("compressFailedToast"));
        } finally {
            setUploading(false);
            if (inputRef.current) inputRef.current.value = "";
        }
    }

    function handleSave() {
        startTransition(async () => {
            const res = await updatePromotionsBanner({
                image_path: currentPath,
                title_he: currentTitleHe,
                title_ar: currentTitleAr,
                enabled: currentEnabled,
            });
            if (res?.error) {
                toast.error(res.error);
                return;
            }
            toast.success(t("savedToast"));
            router.refresh();
        });
    }

    function handleRemove() {
        startTransition(async () => {
            const res = await removePromotionsBanner();
            if (res?.error) {
                toast.error(res.error);
                return;
            }
            setCurrentPath("");
            setCurrentTitleHe("");
            setCurrentTitleAr("");
            setCurrentEnabled(false);
            toast.success(t("removedToast"));
            router.refresh();
        });
    }

    return (
        <div className="grid gap-4 rounded-2xl border border-border/70 bg-card p-4 shadow-soft">
            <div className="flex items-center gap-2 text-sm font-semibold text-muted-foreground">
                <ImageIcon className="size-4 text-primary" />
                {t("title")}
            </div>

            {/* Banner preview */}
            <div className="relative aspect-[16/7] w-full overflow-hidden rounded-xl border border-border/70 bg-muted/40">
                {src ? (
                    <Image
                        src={src}
                        alt={t("previewAlt")}
                        fill
                        sizes="(max-width: 640px) 100vw, 1024px"
                        className="object-cover"
                        onError={() => setImageFailed(true)}
                    />
                ) : (
                    <div className="flex items-center justify-center text-sm text-muted-foreground">
                        {t("noImage")}
                    </div>
                )}
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
                <div>
                    <Label htmlFor="banner-title-he" className="text-xs font-medium">
                        {t("titleHe")}
                    </Label>
                    <Input
                        id="banner-title-he"
                        value={currentTitleHe}
                        onChange={(e) => setCurrentTitleHe(e.target.value)}
                        placeholder={t("titleHePlaceholder")}
                        className="mt-1"
                    />
                </div>
                <div>
                    <Label htmlFor="banner-title-ar" className="text-xs font-medium">
                        {t("titleAr")}
                    </Label>
                    <Input
                        id="banner-title-ar"
                        value={currentTitleAr}
                        onChange={(e) => setCurrentTitleAr(e.target.value)}
                        placeholder="عنوان البانر"
                        className="mt-1"
                    />
                </div>
            </div>

            <div className="flex items-center gap-2">
                <Checkbox
                    id="banner-enabled"
                    checked={currentEnabled}
                    onCheckedChange={(c) => setCurrentEnabled(Boolean(c))}
                />
                <Label htmlFor="banner-enabled" className="text-sm font-medium">
                    {t("enabled")}
                </Label>
            </div>

            <div className="flex flex-wrap items-center gap-2">
                <input
                    ref={inputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => handleFiles(e.target.files)}
                />
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
                    {currentPath ? t("replaceImage") : t("uploadImage")}
                </Button>
                {currentPath && (
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
                <Button
                    type="button"
                    size="sm"
                    className="rounded-full"
                    disabled={pending}
                    onClick={handleSave}
                >
                    {pending && <Loader2 className="size-4 animate-spin" />}
                    {t("save")}
                </Button>
            </div>
        </div>
    );
}