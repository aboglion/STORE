"use client";

import { useRef, useState } from "react";

import { demoImageUrl } from "@/lib/utils/images";
import { cn } from "@/lib/utils";
import { ProgressiveImage } from "@/components/ui/progressive-image";

/**
 * A gallery image with its URL already resolved server-side, so the
 * client never needs to know the storage base URL (which differs
 * between the browser and the Docker container).
 */
export interface GalleryImage {
    id: string;
    url: string;
    alt: string | null;
}

export function ProductGallery({
    images,
    productName,
    productSlug,
}: {
    images: GalleryImage[];
    productName: string;
    productSlug: string;
}) {
    const [selected, setSelected] = useState(0);
    const scrollerRef = useRef<HTMLDivElement>(null);

    if (images.length === 0) {
        return (
            <div className="relative h-[250px] sm:h-[300px] md:h-auto md:aspect-square w-full overflow-hidden rounded-2xl sm:rounded-3xl border border-border/70 bg-muted/30 shadow-soft flex items-center justify-center">
                <ProgressiveImage
                    src={demoImageUrl(productSlug)}
                    alt={productName}
                    fill
                    sizes="(max-width: 768px) 100vw, 50vw"
                    className="object-contain p-3 sm:p-4"
                    priority
                />
            </div>
        );
    }

    const scrollToIndex = (index: number) => {
        setSelected(index);
        const el = scrollerRef.current;
        if (el) {
            el.scrollTo({ left: index * el.clientWidth, behavior: "smooth" });
        }
    };

    return (
        <div className="grid gap-2.5 sm:gap-3 w-full max-w-md sm:max-w-lg md:max-w-none mx-auto">
            {/* Main image — swipeable carousel */}
            <div className="relative h-[250px] sm:h-[300px] md:h-auto md:aspect-square w-full overflow-hidden rounded-2xl sm:rounded-3xl border border-border/70 bg-muted/30 shadow-soft">
                <div
                    ref={scrollerRef}
                    className="flex h-full snap-x snap-mandatory overflow-x-auto no-scrollbar"
                    onScroll={(e) => {
                        const el = e.currentTarget;
                        const idx = Math.round(el.scrollLeft / el.clientWidth);
                        if (idx !== selected) setSelected(idx);
                    }}
                >
                    {images.map((image, index) => (
                        <div
                            key={image.id}
                            className="relative h-full w-full shrink-0 snap-center"
                        >
                            <ProgressiveImage
                                src={image.url}
                                alt={image.alt ?? `${productName} ${index + 1}`}
                                fill
                                sizes="(max-width: 768px) 100vw, 50vw"
                                className="object-contain p-3 sm:p-4"
                                priority={index === 0}
                                fallbackSrc={demoImageUrl(productSlug)}
                            />
                        </div>
                    ))}
                </div>

                {/* Dot indicators */}
                {images.length > 1 && (
                    <div className="absolute bottom-3 left-1/2 flex -translate-x-1/2 gap-1.5">
                        {images.map((image, index) => (
                            <button
                                key={image.id}
                                type="button"
                                aria-label={`${productName} ${index + 1}`}
                                onClick={() => scrollToIndex(index)}
                                className={cn(
                                    "size-2 rounded-full transition-all duration-200",
                                    index === selected
                                        ? "w-5 bg-primary"
                                        : "bg-foreground/30 hover:bg-foreground/50"
                                )}
                            />
                        ))}
                    </div>
                )}
            </div>

            {/* Thumbnails */}
            {images.length > 1 && (
                <div className="flex gap-2 overflow-x-auto no-scrollbar py-0.5">
                    {images.map((image, index) => (
                        <button
                            key={image.id}
                            type="button"
                            onClick={() => scrollToIndex(index)}
                            className={cn(
                                "relative aspect-square size-14 sm:size-20 shrink-0 overflow-hidden rounded-xl border transition-all duration-150 active:scale-95",
                                index === selected
                                    ? "border-primary ring-2 ring-primary/30 shadow-soft"
                                    : "border-border/70 hover:border-primary/50"
                            )}
                        >
                            <ProgressiveImage
                                src={image.url}
                                alt={image.alt ?? `${productName} ${index + 1}`}
                                fill
                                sizes="80px"
                                className="object-contain p-1"
                                fallbackSrc={demoImageUrl(productSlug)}
                            />
                        </button>
                    ))}
                </div>
            )}
        </div>
    );
}
