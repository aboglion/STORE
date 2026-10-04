import Image from "next/image";
import Link from "next/link";

import type { ProductWithImages } from "@/types/database.types";
import { formatILS } from "@/lib/utils/currency";
import { productImageUrl } from "@/lib/utils/images";

import { AddToCartButton } from "./add-to-cart-button";

export function ProductCard({
    product,
    priority = false,
}: {
    product: ProductWithImages;
    priority?: boolean;
}) {
    const image = product.images[0];
    const outOfStock = product.stock_quantity <= 0;
    const imageSrc = productImageUrl(image?.storage_path, product.slug);

    return (
        <div className="group flex flex-col overflow-hidden rounded-xl border bg-card transition-shadow hover:shadow-md">
            <Link
                href={`/products/${product.slug}`}
                className="relative block aspect-square overflow-hidden bg-muted"
            >
                <Image
                    src={imageSrc}
                    alt={image?.alt_text ?? product.name_he}
                    fill
                    sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
                    priority={priority}
                    className="object-cover transition-transform group-hover:scale-105"
                />
                {outOfStock && (
                    <div className="absolute inset-0 flex items-center justify-center bg-black/50 text-sm font-medium text-white">
                        אזל מהמלאי
                    </div>
                )}
            </Link>

            <div className="flex flex-1 flex-col gap-2 p-3">
                <Link
                    href={`/products/${product.slug}`}
                    className="line-clamp-2 text-sm font-medium hover:underline"
                >
                    {product.name_he}
                </Link>
                <div className="mt-auto flex items-center justify-between gap-2">
                    <span className="font-bold">{formatILS(product.price_agorot)}</span>
                    {!outOfStock && <AddToCartButton productId={product.id} size="sm" />}
                </div>
            </div>
        </div>
    );
}