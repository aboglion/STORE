import type { Metadata } from "next";
import { Noto_Sans_Hebrew } from "next/font/google";

import { Toaster } from "@/components/ui/sonner";

import "./globals.css";

const notoSansHebrew = Noto_Sans_Hebrew({
    subsets: ["hebrew"],
    variable: "--font-hebrew",
});

export const metadata: Metadata = {
    title: {
        default: "החנות שלי",
        template: "%s | החנות שלי",
    },
    description: "חנות מקוונת — הזמנה קלה ומשלוח עד הבית",
    manifest: "/manifest.webmanifest",
};

export default function RootLayout({
    children,
}: Readonly<{
    children: React.ReactNode;
}>) {
    return (
        <html lang="he" dir="rtl" className={notoSansHebrew.variable}>
            <body className="min-h-screen font-sans antialiased">
                {children}
                <Toaster position="top-center" richColors />
            </body>
        </html>
    );
}
