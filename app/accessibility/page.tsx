import type { Metadata } from "next";
import {
    Accessibility,
    CheckCircle2,
    Eye,
    Keyboard,
    Mail,
    MapPin,
    Phone,
    Shield,
    Sparkles,
} from "lucide-react";

import { StoreChrome } from "@/components/store/store-chrome";
import { getSettings } from "@/lib/data/storefront";

export const metadata: Metadata = {
    title: "הצהרת נגישות | תקן ישראלי ת״י 5568 ברמה AA",
    description: "הצהרת נגישות רשמית של האתר והסדרי נגישות פיזיים בהתאם לחוק שוויון זכויות לאנשים עם מוגבלות ותקן ת״י 5568.",
};

export default async function AccessibilityPage() {
    const settings = await getSettings();
    const legalName = settings.legal_business_name || settings.store_name;
    const businessId = settings.business_id || "516000000";
    const businessAddress = settings.business_address || "רחוב הרצל 1, תל אביב-יפו";
    const officerName = settings.accessibility_officer_name || "שירות לקוחות ונגישות";
    const officerPhone = settings.accessibility_officer_phone || settings.contact_phone || "03-0000000";
    const officerEmail = settings.accessibility_officer_email || settings.business_email || "accessibility@store.co.il";

    return (
        <StoreChrome>
            <div id="main-content" className="mx-auto max-w-4xl space-y-8 pb-12">
                {/* Header */}
                <div className="space-y-3">
                    <div className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-3.5 py-1 text-xs font-semibold text-primary">
                        <Accessibility className="size-3.5" />
                        <span>תקן ישראלי ת״י 5568 | WCAG 2.1 ברמה AA</span>
                    </div>
                    <h1 className="font-display text-2xl font-extrabold tracking-tight sm:text-3xl">
                        הצהרת נגישות
                    </h1>
                    <p className="text-sm text-muted-foreground">
                        עודכן לאחרונה: אוקטובר 2026 | {legalName} (ח.פ/ע.מ {businessId})
                    </p>
                </div>

                {/* Commitment Banner */}
                <div className="rounded-2xl border-2 border-primary/20 bg-primary/5 p-6 shadow-soft space-y-3">
                    <div className="flex items-center gap-2 text-primary">
                        <Shield className="size-5" />
                        <h2 className="font-display text-base font-bold text-foreground">
                            מחויבות לנגישות ושירות שוויוני
                        </h2>
                    </div>
                    <p className="text-sm leading-relaxed text-foreground/90">
                        ב-<strong>{legalName}</strong> אנו רואים חשיבות עליונה במתן שירות שוויוני, מכבד, נגיש ומקצועי לכלל הלקוחות והגולשים, לרבות אנשים עם מוגבלות. אנו משקיעים מאמצים ומשאבים רבים בהנגשת האתר והשירותים בהתאם להוראות חוק שוויון זכויות לאנשים עם מוגבלות, התשנ״ח-1998, תקנות שוויון זכויות לאנשים עם מוגבלות (התאמות נגישות לשירות), התשע״ג-2013, והתקן הישראלי ת״י 5568 ברמה AA.
                    </p>
                </div>

                {/* Main Content */}
                <div className="space-y-6 text-sm leading-relaxed text-foreground/90">
                    {/* Web Accessibility Adjustments */}
                    <section className="rounded-2xl border border-border/70 bg-card p-6 shadow-soft space-y-4">
                        <h2 className="font-display text-lg font-bold flex items-center gap-2 text-foreground">
                            <Sparkles className="size-5 text-primary" />
                            התאמות הנגישות באתר האינטרנט
                        </h2>
                        <p>
                            אתר זה תוכנן ונבנה בהתאם להנחיות הנגישות הבינלאומיות Web Content Accessibility Guidelines (WCAG) 2.1 ברמת AA, ועומד בדרישות התקן הישראלי לנגישות תכנים באינטרנט ת״י 5568.
                        </p>
                        <div className="grid gap-3 sm:grid-cols-2 text-xs">
                            <div className="rounded-xl border border-border/80 bg-muted/40 p-3 space-y-1">
                                <div className="font-semibold text-foreground flex items-center gap-1.5">
                                    <Accessibility className="size-4 text-primary" />
                                    סרגל וכלי נגישות מובנים
                                </div>
                                <p className="text-muted-foreground">
                                    כפתור נגישות צף בכל עמודי האתר המאפשר הגדלת טקסט (+15%, +30%), ניגודיות גבוהה, היפוך צבעים, גווני אפור, גופן קריא, הדגשת קישורים, סמן מוגדל ועצירת הבהובים.
                                </p>
                            </div>

                            <div className="rounded-xl border border-border/80 bg-muted/40 p-3 space-y-1">
                                <div className="font-semibold text-foreground flex items-center gap-1.5">
                                    <Keyboard className="size-4 text-primary" />
                                    ניווט מקלדת ודילוג לתוכן
                                </div>
                                <p className="text-muted-foreground">
                                    קישור ייעודי בראש כל עמוד "דלג לתוכן מרכזי" (Skip to main content), וניווט מקלדת מלא באמצעות מקשי Tab, החצים ו-Enter.
                                </p>
                            </div>

                            <div className="rounded-xl border border-border/80 bg-muted/40 p-3 space-y-1">
                                <div className="font-semibold text-foreground flex items-center gap-1.5">
                                    <Eye className="size-4 text-primary" />
                                    תאימות לקוראי מסך
                                </div>
                                <p className="text-muted-foreground">
                                    שימוש באלמנטים סמנטיים (HTML5), תגיות ARIA, כותרות ברורות ומובנות, ותיאורי טקסט חלופי (Alt text) לכל תמונות המוצרים.
                                </p>
                            </div>

                            <div className="rounded-xl border border-border/80 bg-muted/40 p-3 space-y-1">
                                <div className="font-semibold text-foreground flex items-center gap-1.5">
                                    <CheckCircle2 className="size-4 text-primary" />
                                    עיצוב רספונסיבי וניגודיות צבעים
                                </div>
                                <p className="text-muted-foreground">
                                    התאמה מלאה לכל גדלי המסכים (מחשבים, טאבלטים ומובייל), יחסי ניגודיות תקניים (4.5:1 לפחות לטקסט רגיל), וביטול הנפשות מטרידות.
                                </p>
                            </div>
                        </div>
                    </section>

                    {/* Accessibility Officer - Statutory requirement */}
                    <section className="rounded-2xl border-2 border-primary/30 bg-card p-6 shadow-soft space-y-4">
                        <div className="flex items-center gap-2 text-primary">
                            <Accessibility className="size-5" />
                            <h2 className="font-display text-lg font-bold text-foreground">
                                פרטי רכז/ת הנגישות של העסק
                            </h2>
                        </div>
                        <p className="text-xs text-muted-foreground">
                            בהתאם להוראות החוק, העסק מינה רכז/ת נגישות האמון/ה על הטיפול בנושאי נגישות האתר והסניף הפיזי:
                        </p>
                        <div className="grid gap-3 sm:grid-cols-3 text-xs">
                            <div className="rounded-xl bg-muted/50 p-3 space-y-1">
                                <span className="text-muted-foreground block font-medium">שם רכז/ת הנגישות:</span>
                                <span className="font-bold text-foreground text-sm">{officerName}</span>
                            </div>
                            <div className="rounded-xl bg-muted/50 p-3 space-y-1">
                                <span className="text-muted-foreground block font-medium">טלפון / מענה קולי:</span>
                                <a href={`tel:${officerPhone}`} className="font-mono font-bold text-primary hover:underline" dir="ltr">
                                    {officerPhone}
                                </a>
                            </div>
                            <div className="rounded-xl bg-muted/50 p-3 space-y-1">
                                <span className="text-muted-foreground block font-medium">דוא״ל לפניות נגישות:</span>
                                <a href={`mailto:${officerEmail}`} className="font-semibold text-primary hover:underline" dir="ltr">
                                    {officerEmail}
                                </a>
                            </div>
                        </div>
                    </section>

                    {/* Physical Store Accessibility */}
                    <section className="rounded-2xl border border-border/70 bg-card p-6 shadow-soft space-y-3">
                        <h2 className="font-display text-lg font-bold flex items-center gap-2 text-foreground">
                            <MapPin className="size-5 text-primary" />
                            הסדרי נגישות פיזיים בבית העסק
                        </h2>
                        <p>
                            להלן פירוט הסדרי הנגישות בכתובתנו: <strong>{businessAddress}</strong>:
                        </p>
                        <ul className="list-disc list-inside space-y-1.5 text-xs pe-2">
                            <li><strong>כניסה וגישה:</strong> כניסה נגישה ומפולסת ללא מדרגות, דלת רחבה המאפשרת מעבר כיסא גלגלים ועגלות.</li>
                            <li><strong>חניות נכים:</strong> קיימות חניות נכים ייעודיות בקרבת הכניסה לבית העסק וברחובות הסמוכים.</li>
                            <li><strong>מעברים ושירות:</strong> מעברי החנות רחבים ומאפשרים תנועה נוחה, דלפק שירות מותאם ונגיש.</li>
                            <li><strong>חיות שירות:</strong> כניסה עם חיית שירות (כגון כלב נחייה) מותרת ומבורכת בכל שטח בית העסק.</li>
                            <li><strong>עזרה וסיוע:</strong> צוות העובדים והשליחים מיומן ומסייע לכל לקוח הזקוק לכך בשמחה ובאדיבות.</li>
                        </ul>
                    </section>

                    {/* Feedback and Reporting */}
                    <section className="rounded-2xl border border-border/70 bg-card p-6 shadow-soft space-y-3">
                        <h2 className="font-display text-lg font-bold flex items-center gap-2 text-foreground">
                            פניות, הצעות שיפור ודיווח על תקלות נגישות
                        </h2>
                        <p>
                            אנו ממשיכים לפעול באופן מתמיד לשיפור נגישות האתר כחלק ממחויבותנו לאפשר שימוש נוח ושוויוני לכלל האוכלוסייה. אם נתקלת בקושי בגלישה באתר, באלמנט שאינו נגיש כראוי, או שיש לך הצעה לשיפור הנגישות — נשמח מאוד לשמוע ממך!
                        </p>
                        <div className="pt-2 flex flex-wrap items-center gap-3">
                            <a
                                href={`mailto:${officerEmail}?subject=${encodeURIComponent("פנייה בנושא נגישות האתר")}`}
                                className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2 font-bold text-primary-foreground shadow hover:opacity-90"
                            >
                                <Mail className="size-4" />
                                <span>שליחת פנייה לרכז/ת הנגישות ←</span>
                            </a>
                            <a
                                href={`tel:${officerPhone}`}
                                className="inline-flex items-center gap-2 rounded-xl border border-border px-4 py-2 font-semibold text-foreground hover:bg-muted"
                                dir="ltr"
                            >
                                <Phone className="size-4" />
                                <span>{officerPhone}</span>
                            </a>
                        </div>
                    </section>
                </div>
            </div>
        </StoreChrome>
    );
}
