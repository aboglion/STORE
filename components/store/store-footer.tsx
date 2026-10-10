import Link from "next/link";
import {
    Accessibility,
    Building2,
    FileText,
    Mail,
    MapPin,
    Phone,
    Scale,
    Shield,
} from "lucide-react";

import { StoreLogo } from "@/components/store/store-logo";
import type { AppSettings } from "@/types/database.types";

interface StoreFooterProps {
    settings: AppSettings;
    storeName: string;
}

export function StoreFooter({ settings, storeName }: StoreFooterProps) {
    const year = new Date().getFullYear();
    const legalName = settings.legal_business_name || storeName;
    const businessId = settings.business_id || "516000000";
    const businessAddress = settings.business_address || "רחוב הרצל 1, תל אביב-יפו";
    const businessPhone = settings.contact_phone || "03-0000000";
    const businessEmail = settings.business_email || "support@store.co.il";
    const businessHours = settings.business_hours || "א׳-ה׳ 08:00-20:00, ו׳ 08:00-14:00";
    const officerName = settings.accessibility_officer_name || "שירות לקוחות ונגישות";

    return (
        <footer className="border-t border-border/70 bg-card/60 backdrop-blur-sm text-xs text-muted-foreground pb-20 md:pb-6">
            <div className="mx-auto max-w-5xl px-4 py-8 sm:py-10">
                <div className="grid gap-8 sm:grid-cols-2 md:grid-cols-4">
                    {/* Column 1: Store identity & legal registration */}
                    <div className="space-y-3">
                        <Link href="/" className="flex items-center gap-2 text-foreground font-display font-extrabold text-base">
                            <StoreLogo logoUrl={settings.logo_url} name={storeName} />
                            <span>{storeName}</span>
                        </Link>
                        <p className="text-xs leading-relaxed">
                            טרי מהמאפייה והמעדנייה — אפייה יומיומית, חומרי גלם משובחים ומשלוח עד הבית.
                        </p>
                        <div className="rounded-xl border border-border/80 bg-muted/40 p-2.5 space-y-1 text-[11px]">
                            <div className="font-semibold text-foreground flex items-center gap-1">
                                <Building2 className="size-3 text-primary" />
                                <span>{legalName}</span>
                            </div>
                            <div>ע.מ / ח.פ: <span className="font-mono">{businessId}</span></div>
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
                            <span>מידע צרכני ומשפטי</span>
                        </div>
                        <ul className="space-y-2 text-xs">
                            <li>
                                <Link
                                    href="/cancellation"
                                    className="font-bold text-primary hover:underline flex items-center gap-1.5"
                                >
                                    <FileText className="size-3.5" />
                                    <span>ביטול עסקה (חוק הגנת הצרכן)</span>
                                </Link>
                            </li>
                            <li>
                                <Link href="/terms" className="hover:text-foreground transition-colors flex items-center gap-1.5">
                                    <Shield className="size-3.5 text-muted-foreground" />
                                    <span>תקנון האתר ותנאי שימוש</span>
                                </Link>
                            </li>
                            <li>
                                <Link href="/privacy" className="hover:text-foreground transition-colors flex items-center gap-1.5">
                                    <Shield className="size-3.5 text-muted-foreground" />
                                    <span>מדיניות פרטיות ואבטחת מידע</span>
                                </Link>
                            </li>
                            <li>
                                <Link href="/accessibility" className="hover:text-foreground transition-colors flex items-center gap-1.5">
                                    <Accessibility className="size-3.5 text-muted-foreground" />
                                    <span>הצהרת נגישות (ת״י 5568)</span>
                                </Link>
                            </li>
                            <li>
                                <Link href="/contact" className="hover:text-foreground transition-colors flex items-center gap-1.5">
                                    <Building2 className="size-3.5 text-muted-foreground" />
                                    <span>פרטי העסק ויצירת קשר</span>
                                </Link>
                            </li>
                        </ul>
                    </div>

                    {/* Column 3: Customer service */}
                    <div className="space-y-2.5">
                        <div className="font-semibold text-foreground text-sm flex items-center gap-1.5">
                            <Phone className="size-4 text-primary" />
                            <span>שירות לקוחות ומענה</span>
                        </div>
                        <div className="space-y-2 text-xs">
                            <div className="flex items-center gap-2">
                                <Phone className="size-3.5 text-primary shrink-0" />
                                <div>
                                    <span className="block text-[11px] text-muted-foreground">מענה טלפוני:</span>
                                    <a href={`tel:${businessPhone}`} className="font-mono font-bold text-foreground hover:underline" dir="ltr">
                                        {businessPhone}
                                    </a>
                                </div>
                            </div>
                            <div className="flex items-center gap-2">
                                <Mail className="size-3.5 text-primary shrink-0" />
                                <div>
                                    <span className="block text-[11px] text-muted-foreground">דוא״ל שירות:</span>
                                    <a href={`mailto:${businessEmail}`} className="font-semibold text-foreground hover:underline" dir="ltr">
                                        {businessEmail}
                                    </a>
                                </div>
                            </div>
                            <div className="pt-1 text-[11px]">
                                <span className="block text-muted-foreground">שעות פעילות:</span>
                                <span className="font-medium text-foreground">{businessHours}</span>
                            </div>
                        </div>
                    </div>

                    {/* Column 4: Accessibility badge & Orders tracking */}
                    <div className="space-y-2.5">
                        <div className="font-semibold text-foreground text-sm flex items-center gap-1.5">
                            <Accessibility className="size-4 text-primary" />
                            <span>נגישות ומעקב</span>
                        </div>
                        <div className="rounded-xl border border-primary/20 bg-primary/5 p-3 space-y-1.5 text-[11px]">
                            <div className="font-semibold text-foreground flex items-center gap-1">
                                <span>רכז/ת נגישות:</span>
                                <span className="text-primary font-bold">{officerName}</span>
                            </div>
                            <p className="text-muted-foreground leading-snug">
                                האתר מונגש ברמת AA לפי תקן ת״י 5568. לחץ על כפתור הנגישות בפינת המסך להפעלת התאמות.
                            </p>
                            <Link href="/accessibility" className="text-primary font-bold hover:underline block pt-1">
                                להצהרת הנגישות המלאה ←
                            </Link>
                        </div>
                        <div className="pt-1">
                            <Link
                                href="/orders"
                                className="inline-flex w-full items-center justify-center rounded-xl border border-border bg-background py-2 text-xs font-semibold text-foreground shadow-sm hover:bg-muted"
                            >
                                מעקב אחר סטטוס הזמנה
                            </Link>
                        </div>
                    </div>
                </div>

                {/* Mandatory Statutory Notice line */}
                <div className="mt-8 border-t border-border/60 pt-5 text-center space-y-1.5">
                    <p className="text-xs font-semibold text-foreground/80">
                        כל המחירים באתר כוללים מע״מ כחוק | ביטול עסקה בהתאם להוראות חוק הגנת הצרכן, התשמ״א-1981
                    </p>
                    <p className="text-[11px] text-muted-foreground">
                        {storeName} © {year} — כל הזכויות שמורות ל-{legalName}
                    </p>
                </div>
            </div>
        </footer>
    );
}
