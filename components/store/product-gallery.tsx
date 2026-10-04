"use client";

import Image from "next/image";
import { useState } from "react";

import { storageImageUrl } from "@/lib/utils/images";
import type { ProductImage } from "@/types/database.types";
import { cn } from "@/lib/utils";

export function ProductGallery({
    images,
    productName,
}: {
    images: ProductImage[];
    productName: string;
}) {
    const [selected, setSelected] = useState(0);

    if (images.length === 0) {
        return (
            <div className="flex aspect-square items-center justify-center rounded-xl border bg-muted text-muted-foreground">
                אין תמונה
            </div>
        );
    }

    const current = images[selected];

    return (
        <div className="grid gap-3">
            <div className="relative aspect-square overflow-hidden rounded-xl border bg-muted">
                <Image
                    src={storageImageUrl(current.storage_path)}
                    alt={current.alt_text ?? productName}
                    fill
                    sizes="(max-width: 768px) 100vw, 50vw"
                    className="object-cover"
                    priority
                />
            </div>

            {images.length > 1 && (
                <div className="flex gap-2">
                    {images.map((image, index) => (
                        <button
                            key={image.id}
                            type="button"
                            onClick={() => setSelected(index)}
                            className={cn(
                                "relative aspect-square size-16 overflow-hidden rounded-md border transition-colors",
                                index === selected
                                    ? "border-primary ring-2 ring-primary/30"
                                    : "border-border hover:border-primary/50"
                            )}
                        >
                            <Image
                                src={storageImageUrl(image.storage_path)}
                                alt={image.alt_text ?? `${productName} ${index + 1}`}
                                fill
                                sizes="64px"
                                className="object-cover"
                            />
                        </button>
                    ))}
                </div>
            )}
        </div>
    );
}