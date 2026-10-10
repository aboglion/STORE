"use client";

import Link from "next/link";
import { useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import {
    Accessibility,
    Building2,
    ChevronDown,
    ChevronUp,
    FileText,
    Mail,
    MapPin,
    Phone,
    Scale,
    Shield,
} from "lucide-react";

import { AccessibilityFooterButton } from "@/components/accessibility/accessibility-widget";
import { StoreLogo } from "@/components/store/store-logo";
import type { AppSettings } from "@/types/database.types";
import type { Locale } from "@/lib/i18n/config";

interface StoreFooterProps {
    settings: AppSettings;
    storeName: string;
}

export function StoreFooter({ settings, storeName }: StoreFooterProps) {
    const [isExpanded, setIsExpanded] = useState(false);
    const t = useTranslations("footer");
    const locale = useLocale() as Locale;
    const isAr = locale === "ar";
    const year = new Date().getFullYear();

    const legalName =
        isAr && (!settings.legal_business_name || settings.legal_business_name === "מאפיית הבוטיק בע״מ")
            ? t("defaultLegalName")
            : (settings.legal_business_name || storeName);

    const businessId = settings.business_id || "516000000";

    const businessAddress =
        isAr && (!settings.business_address || settings.business_address === "רחוב הרצל 1, תל אביב-יפו")
            ? t("defaultAddress")
            : (settings.business_address || t("defaultAddress"));

    const businessPhone = settings.contact_phone || "03-0000000";
    const businessEmail = settings.business_email || "support@store.co.il";

    const businessHours =
        isAr && (!settings.business_hours || settings.business_hours === "א׳-ה׳ 08:00-20:00, ו׳ 08:00-14:00")
            ? t("defaultBusinessHours")
            : (settings.business_hours || t("defaultBusinessHours"));

    const officerName =
        isAr && (!settings.accessibility_officer_name || settings.accessibility_officer_name === "שירות לקוחות ונגישות")
            ? t("defaultOfficerName")
            : (settings.accessibility_officer_name || t("defaultOfficerName"));

    if (!isExpanded) {
        return (
            <footer className="border-t border-border/70 bg-card/60 backdrop-blur-sm text-xs text-muted-foreground pb-20 md:pb-6">
                <div className="mx-auto max-w-5xl px-4 py-4 sm:py-5">
                    <div className="flex flex-col sm:flex-row items-center justify-between gap-3 text-center sm:text-start">
                        <div className="space-y-0.5">
                            <p className="text-[11px] sm:text-xs font-medium text-foreground/85">
                                {storeName} © {year} • {t("statutoryShortNotice")}
                            </p>
                            <p className="text-[10px] sm:text-[11px] text-muted-foreground">
                                {t("allRightsReserved", { name: legalName })}
                            </p>
                        </div>

                        <button
                            type="button"
                            onClick={() => setIsExpanded(true)}
                            className="inline-flex items-center gap-1.5 rounded-full border border-border/80 bg-background/80 px-3.5 py-1.5 text-xs font-semibold text-foreground transition-all hover:bg-muted active:scale-95 shadow-2xs cursor-pointer"
                            aria-expanded={false}
                        >
                            <span>{t("toggleShow")}</span>
                            <ChevronDown className="size-3.5 text-primary" />
                        </button>
                    </div>
                </div>
            </footer>
        );
    }

    return (
        <footer className="border-t border-border/70 bg-card/60 backdrop-blur-sm text-xs text-muted-foreground pb-24 md:pb-8 transition-all duration-300">
            <div className="mx-auto max-w-5xl px-4 py-6 sm:py-8">
                {/* Header bar of expanded footer with collapse button */}
                <div className="mb-6 flex items-center justify-between border-b border-border/60 pb-3">
                    <span className="text-xs font-bold text-foreground">
                        {t("shopInfo")} • {t("legalAndConsumer")}
                    </span>
                    <button
                        type="button"
                        onClick={() => setIsExpanded(false)}
                        className="inline-flex items-center gap-1.5 rounded-full border border-border/80 bg-background/80 px-3 py-1 text-xs font-semibold text-foreground transition-all hover:bg-muted active:scale-95 shadow-2xs cursor-pointer"
                        aria-expanded={true}
                    >
                        <span>{t("toggleHide")}</span>
                        <ChevronUp className="size-3.5 text-primary" />
                    </button>
                </div>

                <div className="grid gap-8 sm:grid-cols-2 md:grid-cols-4">
                    {/* Column 1: Store identity & legal registration */}
                    <div className="space-y-3">
                        <Link href="/" className="flex items-center gap-2 text-foreground font-display font-extrabold text-base">
                            <StoreLogo logoUrl={settings.logo_url} name={storeName} />
                            <span>{storeName}</span>
                        </Link>
                        <p className="text-xs leading-relaxed">
                            {t("tagline")}
                        </p>
                        <div className="rounded-xl border border-border/80 bg-muted/40 p-2.5 space-y-1 text-[11px]">
                            <div className="font-semibold text-foreground flex items-center gap-1">
                                <Building2 className="size-3 text-primary" />
                                <span>{legalName}</span>
                            </div>
                            <div>{t("businessIdLabel")} <span className="font-mono">{businessId}</span></div>
                            <div className="flex items-start gap-1">
                                <MapPin className="size-3 shrink-0 text-muted-foreground mt-0.5" />
                                <span>{businessAddress}</span>
                            </div>
                        </div>
                    </div>

                    {/* Column 2: Legal & Consumer Links (Israeli statutory requirement) */}
                    <div className="space-y-2.5">
                        <div className="font-semibold text-foreground text-sm flex items-center gap-1.5">
                            <Scale className="size-4 text-primary" />
                            <span>{t("legalAndConsumer")}</span>
                        </div>
                        <ul className="space-y-2 text-xs">
                            <li>
                                <Link
                                    href="/cancellation"
                                    className="font-bold text-primary hover:underline flex items-center gap-1.5"
                                >
                                    <FileText className="size-3.5" />
                                    <span>{t("cancellation")}</span>
                                </Link>
                            </li>
                            <li>
                                <Link href="/terms" className="hover:text-foreground transition-colors flex items-center gap-1.5">
                                    <Shield className="size-3.5 text-muted-foreground" />
                                    <span>{t("terms")}</span>
                                </Link>
                            </li>
                            <li>
                                <Link href="/privacy" className="hover:text-foreground transition-colors flex items-center gap-1.5">
                                    <Shield className="size-3.5 text-muted-foreground" />
                                    <span>{t("privacy")}</span>
                                </Link>
                            </li>
                            <li>
                                <Link href="/accessibility" className="hover:text-foreground transition-colors flex items-center gap-1.5">
                                    <Accessibility className="size-3.5 text-muted-foreground" />
                                    <span>{t("accessibility")}</span>
                                </Link>
                            </li>
                            <li>
                                <Link href="/contact" className="hover:text-foreground transition-colors flex items-center gap-1.5">
                                    <Building2 className="size-3.5 text-muted-foreground" />
                                    <span>{t("contact")}</span>
                                </Link>
                            </li>
                        </ul>
                    </div>

                    {/* Column 3: Customer service */}
                    <div className="space-y-2.5">
                        <div className="font-semibold text-foreground text-sm flex items-center gap-1.5">
                            <Phone className="size-4 text-primary" />
                            <span>{t("customerService")}</span>
                        </div>
                        <div className="space-y-2 text-xs">
                            <div className="flex items-center gap-2">
                                <Phone className="size-3.5 text-primary shrink-0" />
                                <div>
                                    <span className="block text-[11px] text-muted-foreground">{t("phoneLabel")}</span>
                                    <a href={`tel:${businessPhone}`} className="font-mono font-bold text-foreground hover:underline" dir="ltr">
                                        {businessPhone}
                                    </a>
                                </div>
                            </div>
                            <div className="flex items-center gap-2">
                                <Mail className="size-3.5 text-primary shrink-0" />
                                <div>
                                    <span className="block text-[11px] text-muted-foreground">{t("emailLabel")}</span>
                                    <a href={`mailto:${businessEmail}`} className="font-semibold text-foreground hover:underline" dir="ltr">
                                        {businessEmail}
                                    </a>
                                </div>
                            </div>
                            <div className="pt-1 text-[11px]">
                                <span className="block text-muted-foreground">{t("hoursLabel")}</span>
                                <span className="font-medium text-foreground">{businessHours}</span>
                            </div>
                        </div>
                    </div>

                    {/* Column 4: Accessibility badge & Orders tracking */}
                    <div className="space-y-2.5">
                        <div className="font-semibold text-foreground text-sm flex items-center gap-1.5">
                            <Accessibility className="size-4 text-primary" />
                            <span>{t("accessibilityAndTracking")}</span>
                        </div>
                        <div className="rounded-xl border border-primary/20 bg-primary/5 p-3 space-y-2 text-[11px]">
                            <div className="font-semibold text-foreground flex items-center gap-1">
                                <span>{t("accessibilityOfficer")}</span>
                                <span className="text-primary font-bold">{officerName}</span>
                            </div>
                            {settings.accessibility_officer_phone && (
                                <div className="text-muted-foreground">
                                    {t("officerPhoneLabel")} <a href={`tel:${settings.accessibility_officer_phone}`} className="font-mono text-foreground hover:underline" dir="ltr">{settings.accessibility_officer_phone}</a>
                                </div>
                            )}
                            <p className="text-muted-foreground leading-snug">
                                {t("accessibilityStandard")}
                            </p>
                            <div className="pt-1">
                                <AccessibilityFooterButton />
                            </div>
                            <Link href="/accessibility" className="text-primary font-bold hover:underline block pt-0.5 text-[11px]">
                                {t("fullAccessibilityStatement")}
                            </Link>
                        </div>
                        <div className="pt-1">
                            <Link
                                href="/orders"
                                className="inline-flex w-full items-center justify-center rounded-xl border border-border bg-background py-2 text-xs font-semibold text-foreground shadow-sm hover:bg-muted"
                            >
                                {t("trackOrder")}
                            </Link>
                        </div>
                    </div>
                </div>

                {/* Mandatory Statutory Notice line */}
                <div className="mt-8 border-t border-border/60 pt-5 text-center space-y-1.5">
                    <p className="text-xs font-semibold text-foreground/80">
                        {t("statutoryNotice")}
                    </p>
                    <p className="text-[11px] text-muted-foreground">
                        {storeName} © {year} — {t("allRightsReserved", { name: legalName })}
                    </p>
                </div>
            </div>
        </footer>
    );
}
