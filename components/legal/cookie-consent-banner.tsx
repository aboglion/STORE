"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useLocale } from "next-intl";
import { Cookie, X } from "lucide-react";

import { Button } from "@/components/ui/button";

const COOKIE_CONSENT_KEY = "israeli_store_cookie_consent_v1";

export function CookieConsentBanner() {
    const locale = useLocale();
    const isAr = locale === "ar";
    const [visible, setVisible] = useState(false);

    useEffect(() => {
        try {
            const consent = localStorage.getItem(COOKIE_CONSENT_KEY);
            if (!consent) {
                // Show banner after brief delay so it doesn't jarringly block initial render
                const timer = setTimeout(() => setVisible(true), 800);
                return () => clearTimeout(timer);
            }
        } catch {
            // Ignore storage errors
        }
    }, []);

    const handleAccept = () => {
        try {
            localStorage.setItem(COOKIE_CONSENT_KEY, "accepted");
        } catch {
            // Ignore
        }
        setVisible(false);
    };

    if (!visible) return null;

    return (
        <aside
            aria-label={isAr ? "إشعار الخصوصية وملفات تعريف الارتباط" : "הודעת פרטיות וקבצי עוגיות"}
            className="fixed bottom-20 inset-x-4 z-40 mx-auto max-w-xl animate-pop-in md:bottom-5 md:left-20 md:right-auto md:max-w-md"
        >
            <div className="rounded-2xl border border-border/80 bg-background/95 p-4 shadow-2xl backdrop-blur-md">
                <div className="flex items-start gap-3">
                    <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                        <Cookie className="size-5" />
                    </span>
                    <div className="flex-1 text-xs text-muted-foreground">
                        <p className="font-semibold text-foreground">
                            {isAr ? "الخصوصية وملفات تعريف الارتباط (Cookies)" : "פרטיות ושימוש בעוגיות (Cookies)"}
                        </p>
                        <p className="mt-1 leading-relaxed">
                            {isAr
                                ? "نستخدم ملفات تعريف الارتباط والذاكرة المحلية لتحسين تجربة التسوق، وحفظ سلة المشتريات، وتأمين طلباتك وفقًا لقانون حماية الخصوصية."
                                : "אנו משתמשים בקבצי עוגיות ובאחסון מקומי לצורך תפעול תקין של האתר, שמירת סל הקניות ואבטחת פרטיך בהתאם לחוק הגנת הפרטיות, התשמ\"א-1981."}
                        </p>
                        <div className="mt-3 flex flex-wrap items-center gap-2">
                            <Button
                                type="button"
                                size="sm"
                                onClick={handleAccept}
                                className="h-8 rounded-xl px-4 text-xs font-semibold"
                            >
                                {isAr ? "موافق والمتابعة" : "הבנתי ומאשר/ת"}
                            </Button>
                            <Link
                                href="/privacy"
                                className="text-xs font-medium text-primary underline underline-offset-4 hover:opacity-80"
                            >
                                {isAr ? "سياسة الخصوصية" : "מדיניות פרטיות"}
                            </Link>
                        </div>
                    </div>
                    <button
                        type="button"
                        onClick={handleAccept}
                        className="text-muted-foreground hover:text-foreground"
                        aria-label={isAr ? "إغلاق" : "סגירה"}
                    >
                        <X className="size-4" />
                    </button>
                </div>
            </div>
        </aside>
    );
}
