"use client";

import Image from "next/image";
import { useState } from "react";

import { demoImageUrl, productImageUrl } from "@/lib/utils/images";
import type { ProductImage } from "@/types/database.types";
import { cn } from "@/lib/utils";

export function ProductGallery({
    images,
    productName,
    productSlug,
}: {
    images: ProductImage[];
    productName: string;
    productSlug: string;
}) {
    const [selected, setSelected] = useState(0);

    if (images.length === 0) {
        return (
            <div className="relative aspect-square overflow-hidden rounded-xl border bg-muted">
                <Image
                    src={demoImageUrl(productSlug)}
                    alt={productName}
                    fill
                    sizes="(max-width: 768px) 100vw, 50vw"
                    className="object-cover"
                    priority
                />
            </div>
        );
    }

    const current = images[selected];

    return (
        <div className="grid gap-3">
            <div className="relative aspect-square overflow-hidden rounded-xl border bg-muted">
                <Image
                    src={productImageUrl(current.storage_path, productSlug)}
                    alt={current.alt_text ?? productName}
                    fill
                    sizes="(max-width: 768px) 100vw, 50vw"
                    className="object-cover"
                    priority
                    onError={(e) => {
                        const target = e.currentTarget;
                        const fallback = demoImageUrl(productSlug);
                        if (!target.src.endsWith(fallback)) target.src = fallback;
                    }}
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
                                src={productImageUrl(image.storage_path, productSlug)}
                                alt={image.alt_text ?? `${productName} ${index + 1}`}
                                fill
                                sizes="64px"
                                className="object-cover"
                                onError={(e) => {
                                    const target = e.currentTarget;
                                    const fallback = demoImageUrl(productSlug);
                                    if (!target.src.endsWith(fallback)) {
                                        target.src = fallback;
                                    }
                                }}
                            />
                        </button>
                    ))}
                </div>
            )}
        </div>
    );
}