"use client";

import { useState, useRef, useEffect } from "react";
import Image, { type ImageProps } from "next/image";
import { cn } from "@/lib/utils";
import { DEFAULT_BLUR_DATA_URL } from "@/lib/utils/images";

export interface ProgressiveImageProps extends Omit<ImageProps, "placeholder"> {
    containerClassName?: string;
    fallbackSrc?: string;
    blurDataURL?: string;
}

/**
 * ProgressiveImage provides an instant low-resolution blurred placeholder (LQIP)
 * and an ultra-smooth transition from low-res/blurred to crisp full-resolution.
 * 
 * - Immediate visual feedback (0ms wait, zero blank boxes)
 * - Shimmer loading skeleton behind the placeholder
 * - Graceful progressive blur-to-sharp animation on decode
 * - Automatic fallback handling on broken or 404 images
 */
export function ProgressiveImage({
    src,
    alt,
    className,
    containerClassName,
    fallbackSrc,
    blurDataURL,
    priority,
    fill,
    width,
    height,
    sizes,
    onError,
    onLoad,
    ...rest
}: ProgressiveImageProps) {
    const [isLoaded, setIsLoaded] = useState(false);
    const [currentSrc, setCurrentSrc] = useState(src);
    const imgRef = useRef<HTMLImageElement>(null);

    // Keep currentSrc in sync when parent prop changes
    useEffect(() => {
        setCurrentSrc(src);
        setIsLoaded(false);
    }, [src]);

    // If already complete in browser cache on mount, reveal immediately
    useEffect(() => {
        if (imgRef.current && imgRef.current.complete && imgRef.current.naturalWidth > 0) {
            setIsLoaded(true);
        }
    }, [currentSrc]);

    const activeBlurUrl = blurDataURL || DEFAULT_BLUR_DATA_URL;

    return (
        <div
            className={cn(
                "relative overflow-hidden",
                fill ? "h-full w-full" : "inline-block",
                containerClassName
            )}
        >
            {/* Animated shimmer skeleton while image is loading */}
            {!isLoaded && (
                <div
                    aria-hidden="true"
                    className="absolute inset-0 z-0 animate-pulse bg-gradient-to-tr from-muted/90 via-muted/40 to-muted/90"
                />
            )}

            <Image
                ref={imgRef}
                src={currentSrc}
                alt={alt}
                fill={fill}
                width={width}
                height={height}
                sizes={sizes}
                priority={priority}
                placeholder="blur"
                blurDataURL={activeBlurUrl}
                onLoad={(e) => {
                    setIsLoaded(true);
                    onLoad?.(e);
                }}
                onError={(e) => {
                    if (fallbackSrc && currentSrc !== fallbackSrc) {
                        setCurrentSrc(fallbackSrc);
                    }
                    onError?.(e);
                }}
                className={cn(
                    "object-cover transition-all duration-700 cubic-bezier(0.16, 1, 0.3, 1) will-change-[filter,transform,opacity]",
                    !isLoaded
                        ? "scale-[1.04] blur-md opacity-80"
                        : "scale-100 blur-0 opacity-100",
                    className
                )}
                {...rest}
            />
        </div>
    );
}
