import Image from "next/image";
import Link from "next/link";

import { storageImageUrl } from "@/lib/utils/images";

/**
 * Storefront category card — a tappable tile with the category's
 * generic image and its localized name. Links to the filtered
 * catalog view (?category=<slug>).
 */
export function CategoryCard({
    slug,
    name,
    imagePath,
}: {
    slug: string;
    name: string;
    imagePath: string | null;
}) {
    const src = imagePath ? storageImageUrl(imagePath) : "";

    return (
        <Link
            href={`/?category=${slug}`}
            className="group relative block aspect-[4/3] overflow-hidden rounded-2xl border border-border/70 bg-muted shadow-soft transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lift active:scale-[0.98]"
        >
            {src ? (
                <Image
                    src={src}
                    alt={name}
                    fill
                    sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
                    className="object-cover transition-transform duration-300 group-hover:scale-105"
                />
            ) : (
                <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-primary/20 to-secondary/40 p-4">
                    <span className="text-center text-lg font-bold text-primary">
                        {name}
                    </span>
                </div>
            )}
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/10 to-transparent" />
            <span className="absolute bottom-3 right-3 left-3 text-sm font-bold text-white drop-shadow">
                {name}
            </span>
        </Link>
    );
}