"use client";

import Image from "next/image";
import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";

import imageCompression from "browser-image-compression";
import {
    ImageIcon,
    Loader2,
    Pencil,
    Plus,
    Trash2,
    Upload,
} from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
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

    const [open, setOpen] = useState(false);
    const [pending, startTransition] = useTransition();
    const [uploading, setUploading] = useState(false);
    const [currentPath, setCurrentPath] = useState(imagePath);
    const [currentTitleHe, setCurrentTitleHe] = useState(titleHe);
    const [currentTitleAr, setCurrentTitleAr] = useState(titleAr);
    const [currentEnabled, setCurrentEnabled] = useState(enabled);
    const [imageFailed, setImageFailed] = useState(false);

    // Form scratch state when dialog is open
    const [draftPath, setDraftPath] = useState(imagePath);
    const [draftTitleHe, setDraftTitleHe] = useState(titleHe);
    const [draftTitleAr, setDraftTitleAr] = useState(titleAr);

    const activeSrc = currentPath && !imageFailed ? storageImageUrl(currentPath) : "";
    const draftSrc = draftPath ? storageImageUrl(draftPath) : "";

    function handleOpenDialog() {
        setDraftPath(currentPath);
        setDraftTitleHe(currentTitleHe);
        setDraftTitleAr(currentTitleAr);
        setOpen(true);
    }

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
                    setDraftPath(res.path);
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
        if (!draftPath.trim()) {
            toast.error("יש להעלות תמונה לבאנר");
            return;
        }

        startTransition(async () => {
            const res = await updatePromotionsBanner({
                image_path: draftPath,
                title_he: draftTitleHe,
                title_ar: draftTitleAr,
                enabled: true,
            });
            if (res?.error) {
                toast.error(res.error);
                return;
            }
            setCurrentPath(draftPath);
            setCurrentTitleHe(draftTitleHe);
            setCurrentTitleAr(draftTitleAr);
            setCurrentEnabled(true);
            toast.success(t("savedToast"));
            setOpen(false);
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
            setDraftPath("");
            setDraftTitleHe("");
            setDraftTitleAr("");
            toast.success(t("removedToast"));
            setOpen(false);
            router.refresh();
        });
    }

    return (
        <>
            <div className="rounded-2xl border border-border/70 bg-card p-4 shadow-soft">
                <div className="flex flex-col gap-3">
                    <div className="flex items-center justify-between gap-2 border-b border-border/50 pb-3">
                        <div className="flex items-center gap-2">
                            <div className="flex size-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
                                <ImageIcon className="size-4" />
                            </div>
                            <div>
                                <h2 className="text-sm font-semibold text-foreground">
                                    {t("title")}
                                </h2>
                                <p className="text-xs text-muted-foreground">
                                    ניהול הבאנר המוצג בחנות בראש עמוד המבצעים, לפני כרטיסי המבצעים
                                </p>
                            </div>
                        </div>

                        {!currentPath && (
                            <Button
                                size="sm"
                                onClick={handleOpenDialog}
                                className="gap-1.5 rounded-full"
                            >
                                <Plus className="size-4" />
                                הוספת באנר
                            </Button>
                        )}
                    </div>

                    {currentPath ? (
                        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                            <div className="flex items-center gap-3 min-w-0">
                                <div className="relative h-18 w-32 shrink-0 overflow-hidden rounded-xl border border-border/70 bg-muted/40 shadow-xs">
                                    {activeSrc ? (
                                        <Image
                                            src={activeSrc}
                                            alt={currentTitleHe || t("previewAlt")}
                                            fill
                                            sizes="128px"
                                            className="object-cover"
                                            onError={() => setImageFailed(true)}
                                        />
                                    ) : (
                                        <div className="flex h-full w-full items-center justify-center text-xs text-muted-foreground">
                                            {t("noImage")}
                                        </div>
                                    )}
                                </div>
                                <div className="flex flex-col gap-1 min-w-0">
                                    <div className="flex flex-wrap items-center gap-2">
                                        <p className="text-sm font-bold text-foreground truncate">
                                            {currentTitleHe || (
                                                <span className="font-normal italic text-muted-foreground">
                                                    ללא כותרת עליונה
                                                </span>
                                            )}
                                        </p>
                                        <Badge
                                            variant="outline"
                                            className="border-emerald-500/30 bg-emerald-500/10 text-xs text-emerald-600 dark:text-emerald-400"
                                        >
                                            מוצג בחנות לפני המבצעים
                                        </Badge>
                                    </div>
                                    {currentTitleAr && (
                                        <p className="text-xs text-muted-foreground truncate">
                                            {currentTitleAr}
                                        </p>
                                    )}
                                </div>
                            </div>

                            <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                                <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    onClick={handleOpenDialog}
                                    className="gap-1.5 rounded-full"
                                >
                                    <Pencil className="size-3.5" />
                                    עריכה / שינוי
                                </Button>
                                <Button
                                    type="button"
                                    variant="ghost"
                                    size="sm"
                                    disabled={pending}
                                    onClick={handleRemove}
                                    className="gap-1.5 rounded-full text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                                >
                                    {pending ? (
                                        <Loader2 className="size-3.5 animate-spin" />
                                    ) : (
                                        <Trash2 className="size-3.5" />
                                    )}
                                    {t("remove")}
                                </Button>
                            </div>
                        </div>
                    ) : (
                        <div className="flex flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-border/80 bg-muted/20 py-6 text-center">
                            <p className="text-xs text-muted-foreground">
                                לא הוגדר באנר לדף המבצעים. לחץ על &quot;הוספת באנר&quot; כדי להגדיר באנר מעוצב.
                            </p>
                        </div>
                    )}
                </div>
            </div>

            {/* Banner Management Modal */}
            <Dialog open={open} onOpenChange={setOpen}>
                <DialogContent className="sm:max-w-lg">
                    <DialogHeader>
                        <DialogTitle>
                            {currentPath ? "עריכת באנר דף מבצעים" : "הוספת באנר דף מבצעים"}
                        </DialogTitle>
                        <DialogDescription>
                            הבאנר יוצג בראש עמוד המבצעים בחנות, מיד לפני כרטיסי המבצעים.
                        </DialogDescription>
                    </DialogHeader>

                    <div className="grid gap-4 py-2">
                        {/* Hidden file input */}
                        <input
                            ref={inputRef}
                            type="file"
                            accept="image/*"
                            className="hidden"
                            onChange={(e) => handleFiles(e.target.files)}
                        />

                        {/* Image Preview / Upload Area */}
                        <div className="space-y-1.5">
                            <Label className="text-xs font-medium">תמונת הבאנר</Label>
                            {draftSrc ? (
                                <div className="space-y-2">
                                    <div className="relative aspect-[16/7] w-full overflow-hidden rounded-xl border border-border/70 bg-muted/40">
                                        <Image
                                            src={draftSrc}
                                            alt={draftTitleHe || t("previewAlt")}
                                            fill
                                            sizes="(max-width: 640px) 100vw, 512px"
                                            className="object-cover"
                                        />
                                    </div>
                                    <Button
                                        type="button"
                                        variant="outline"
                                        size="sm"
                                        disabled={uploading || pending}
                                        onClick={() => inputRef.current?.click()}
                                        className="w-full gap-2 rounded-lg"
                                    >
                                        {uploading ? (
                                            <Loader2 className="size-4 animate-spin" />
                                        ) : (
                                            <Upload className="size-4" />
                                        )}
                                        {t("replaceImage")}
                                    </Button>
                                </div>
                            ) : (
                                <button
                                    type="button"
                                    disabled={uploading || pending}
                                    onClick={() => inputRef.current?.click()}
                                    className="flex w-full flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-border/70 bg-muted/30 p-8 text-center transition hover:border-primary/50 hover:bg-muted/50"
                                >
                                    <div className="flex size-12 items-center justify-center rounded-full bg-primary/10 text-primary">
                                        {uploading ? (
                                            <Loader2 className="size-6 animate-spin" />
                                        ) : (
                                            <Upload className="size-6" />
                                        )}
                                    </div>
                                    <p className="text-sm font-semibold text-foreground">
                                        {uploading ? "מעלה ומבצע אופטימיזציה..." : "לחץ להעלאת תמונת באנר"}
                                    </p>
                                    <p className="text-xs text-muted-foreground">
                                        מומלץ קובץ רוחבי (יחס 16:7 או 21:9), עד 1.5MB
                                    </p>
                                </button>
                            )}
                        </div>

                        {/* Title inputs */}
                        <div className="grid gap-3 sm:grid-cols-2">
                            <div>
                                <Label htmlFor="dialog-banner-title-he" className="text-xs font-medium">
                                    {t("titleHe")}
                                </Label>
                                <Input
                                    id="dialog-banner-title-he"
                                    value={draftTitleHe}
                                    onChange={(e) => setDraftTitleHe(e.target.value)}
                                    placeholder={t("titleHePlaceholder")}
                                    className="mt-1"
                                />
                            </div>
                            <div>
                                <Label htmlFor="dialog-banner-title-ar" className="text-xs font-medium">
                                    {t("titleAr")}
                                </Label>
                                <Input
                                    id="dialog-banner-title-ar"
                                    value={draftTitleAr}
                                    onChange={(e) => setDraftTitleAr(e.target.value)}
                                    placeholder="عنوان البانر"
                                    className="mt-1"
                                />
                            </div>
                        </div>
                    </div>

                    <DialogFooter className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-between">
                        <div>
                            {currentPath && (
                                <Button
                                    type="button"
                                    variant="ghost"
                                    size="sm"
                                    disabled={pending}
                                    onClick={handleRemove}
                                    className="text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                                >
                                    {pending ? (
                                        <Loader2 className="size-4 animate-spin" />
                                    ) : (
                                        <Trash2 className="size-4" />
                                    )}
                                    {t("remove")}
                                </Button>
                            )}
                        </div>
                        <div className="flex items-center gap-2">
                            <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                disabled={pending}
                                onClick={() => setOpen(false)}
                            >
                                ביטול
                            </Button>
                            <Button
                                type="button"
                                size="sm"
                                disabled={pending || uploading || !draftPath.trim()}
                                onClick={handleSave}
                            >
                                {pending && <Loader2 className="size-4 animate-spin" />}
                                {t("save")}
                            </Button>
                        </div>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </>
    );
}