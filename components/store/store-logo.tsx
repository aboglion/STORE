import Image from "next/image";

import { Wheat } from "lucide-react";

import { storageImageUrl } from "@/lib/utils/images";
import { cn } from "@/lib/utils";

/**
 * Store branding mark — renders the uploaded logo image when available,
 * otherwise falls back to a warm wheat badge in the current theme colors.
 */
export function StoreLogo({
    logoUrl,
    name,
    className,
    iconClassName,
}: {
    logoUrl: string;
    name: string;
    className?: string;
    iconClassName?: string;
}) {
    const src = logoUrl ? storageImageUrl(logoUrl) : "";

    if (src) {
        return (
            <Image
                src={src}
                alt={name}
                width={40}
                height={40}
                className={cn(
                    "size-8 shrink-0 rounded-full border border-border/40 bg-card object-contain p-0.5 shadow-soft sm:size-9",
                    className
                )}
            />
        );
    }

    return (
        <span
            className={cn(
                "flex size-8 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-primary to-primary-deep text-primary-foreground shadow-soft sm:size-9",
                className
            )}
        >
            <Wheat className={cn("size-4 sm:size-5", iconClassName)} />
        </span>
    );
}
