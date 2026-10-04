import Link from "next/link";

import { CartProvider } from "@/contexts/cart-context";
import { getSettings } from "@/lib/data/storefront";

import { CartButton } from "./cart-button";

export async function StoreChrome({
    children,
}: {
    children: React.ReactNode;
}) {
    const settings = await getSettings();

    return (
        <CartProvider>
            <div className="flex min-h-screen flex-col bg-background">
                <header className="sticky top-0 z-40 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80">
                    <div className="mx-auto flex h-16 w-full max-w-5xl items-center justify-between px-4">
                        <Link href="/" className="text-lg font-bold">
                            {settings.store_name}
                        </Link>
                        <nav className="flex items-center gap-4">
                            <Link
                                href="/"
                                className="text-sm text-muted-foreground transition-colors hover:text-foreground"
                            >
                                קטלוג
                            </Link>
                            <CartButton />
                        </nav>
                    </div>
                </header>

                <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-8">
                    {children}
                </main>

                <footer className="border-t py-6 text-center text-sm text-muted-foreground">
                    {settings.store_name} © {new Date().getFullYear()}
                </footer>
            </div>
        </CartProvider>
    );
}