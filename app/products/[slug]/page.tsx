import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { AddToCartButton } from "@/components/store/add-to-cart-button";
import { ProductGallery } from "@/components/store/product-gallery";
import { StoreChrome } from "@/components/store/store-chrome";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { getPublicProductBySlug } from "@/lib/data/storefront";
import { formatILS } from "@/lib/utils/currency";

export async function generateMetadata({
    params,
}: {
    params: Promise<{ slug: string }>;
}): Promise<Metadata> {
    const { slug } = await params;
    const product = await getPublicProductBySlug(slug);

    if (!product) return { title: "מוצר לא נמצא" };

    return {
        title: product.name_he,
        description: product.description_he ?? undefined,
    };
}

export default async function ProductPage({
    params,
}: {
    params: Promise<{ slug: string }>;
}) {
    const { slug } = await params;
    const product = await getPublicProductBySlug(slug);

    if (!product) notFound();

    const outOfStock = product.stock_quantity <= 0;
    const lowStock =
        !outOfStock && product.stock_quantity <= product.low_stock_threshold;

    return (
        <StoreChrome>
            <div className="grid gap-8 md:grid-cols-2">
                <ProductGallery images={product.images} productName={product.name_he} />

                <div className="flex flex-col gap-4">
                    <div>
                        <h1 className="text-2xl font-bold">{product.name_he}</h1>
                        <div className="mt-2 flex items-center gap-3">
                            <span className="text-3xl font-bold">
                                {formatILS(product.price_agorot)}
                            </span>
                            {product.compare_at_price_agorot != null &&
                                product.compare_at_price_agorot > product.price_agorot && (
                                    <span className="text-lg text-muted-foreground line-through">
                                        {formatILS(product.compare_at_price_agorot)}
                                    </span>
                                )}
                        </div>
                    </div>

                    <div className="flex items-center gap-2">
                        {outOfStock ? (
                            <Badge variant="destructive">אזל מהמלאי</Badge>
                        ) : lowStock ? (
                            <Badge variant="secondary">נשארו רק {product.stock_quantity}</Badge>
                        ) : (
                            <Badge variant="secondary">במלאי</Badge>
                        )}
                    </div>

                    {product.description_he && (
                        <>
                            <Separator />
                            <p className="whitespace-pre-line text-muted-foreground">
                                {product.description_he}
                            </p>
                        </>
                    )}

                    <div className="mt-2">
                        <AddToCartButton
                            productId={product.id}
                            size="lg"
                            fullWidth
                        />
                    </div>
                </div>
            </div>
        </StoreChrome>
    );
}