"use client";

import Image from "next/image";
import { useRef, useState, useTransition } from "react";

import imageCompression from "browser-image-compression";
import { Loader2, Trash2, Upload } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
    deleteProductImage,
    uploadProductImage,
} from "@/lib/actions/products";
import { storageImageUrl } from "@/lib/utils/images";
import type { ProductImage } from "@/types/database.types";

export function ImageUploader({
    productId,
    images,
}: {
    productId: string;
    images: ProductImage[];
}) {
    const inputRef = useRef<HTMLInputElement>(null);
    const [pending, startTransition] = useTransition();
    const [uploading, setUploading] = useState(false);

    async function handleFiles(files: FileList | null) {
        const file = files?.[0];
        if (!file) return;

        if (!file.type.startsWith("image/")) {
            toast.error("הקובץ שנבחר אינו תמונה");
            return;
        }

        setUploading(true);
        try {
            const compressed = await imageCompression(file, {
                maxSizeMB: 1,
                maxWidthOrHeight: 1600,
                useWebWorker: true,
            });

            startTransition(async () => {
                const res = await uploadProductImage(productId, file.name, compressed);
                if (res?.error) {
                    toast.error(res.error);
                } else {
                    toast.success("התמונה הועלתה");
                }
            });
        } catch {
            toast.error("דחיסת התמונה נכשלה");
        } finally {
            setUploading(false);
            if (inputRef.current) inputRef.current.value = "";
        }
    }

    function handleDelete(imageId: string) {
        startTransition(async () => {
            const res = await deleteProductImage(imageId, productId);
            if (res?.error) toast.error(res.error);
            else toast.success("התמונה נמחקה");
        });
    }

    return (
        <div className="grid gap-3">
            <div className="grid grid-cols-3 gap-3 sm:grid-cols-4">
                {images.map((image, index) => (
                    <div
                        key={image.id}
                        className="group relative aspect-square overflow-hidden rounded-md border bg-muted"
                    >
                        <Image
                            src={storageImageUrl(image.storage_path)}
                            alt={image.alt_text ?? `תמונה ${index + 1}`}
                            fill
                            sizes="120px"
                            className="object-cover"
                        />
                        <Button
                            type="button"
                            variant="destructive"
                            size="icon"
                            className="absolute top-1 right-1 size-7 opacity-0 transition-opacity group-hover:opacity-100"
                            disabled={pending}
                            onClick={() => handleDelete(image.id)}
                        >
                            <Trash2 className="size-3.5" />
                        </Button>
                    </div>
                ))}

                <button
                    type="button"
                    onClick={() => inputRef.current?.click()}
                    disabled={pending || uploading}
                    className="flex aspect-square flex-col items-center justify-center gap-1 rounded-md border border-dashed text-sm text-muted-foreground transition-colors hover:border-primary hover:text-primary disabled:opacity-50"
                >
                    {uploading ? (
                        <Loader2 className="size-5 animate-spin" />
                    ) : (
                        <Upload className="size-5" />
                    )}
                    <span>{uploading ? "מעלה..." : "הוסף תמונה"}</span>
                </button>
            </div>

            <input
                ref={inputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => handleFiles(e.target.files)}
            />
        </div>
    );
}