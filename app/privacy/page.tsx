import type { Metadata } from "next";
import { Shield, ShieldAlert, UserCheck } from "lucide-react";

import { StoreChrome } from "@/components/store/store-chrome";
import { getSettings } from "@/lib/data/storefront";

export const metadata: Metadata = {
    title: "מדיניות פרטיות ואבטחת מידע | חוק הגנת הפרטיות",
    description: "מדיניות פרטיות רשמית בהתאם לחוק הגנת הפרטיות, התשמ״א-1981 ותקנות אבטחת מידע, סעיף 11, זכויות עיון ותיקון.",
};

export default async function PrivacyPage() {
    const settings = await getSettings();
    const legalName = settings.legal_business_name || settings.store_name;
    const businessId = settings.business_id || "516000000";
    const businessAddress = settings.business_address || "רחוב הרצל 1, תל אביב-יפו";
    const businessPhone = settings.contact_phone || "03-0000000";
    const businessEmail = settings.business_email || "support@store.co.il";

    return (
        <StoreChrome>
            <div id="main-content" className="mx-auto max-w-4xl space-y-8 pb-12">
                {/* Header */}
                <div className="space-y-3">
                    <div className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-3.5 py-1 text-xs font-semibold text-primary">
                        <Shield className="size-3.5" />
                        <span>חוק הגנת הפרטיות, התשמ״א-1981 | תקנות אבטחת מידע</span>
                    </div>
                    <h1 className="font-display text-2xl font-extrabold tracking-tight sm:text-3xl">
                        מדיניות פרטיות ואבטחת מידע
                    </h1>
                    <p className="text-sm text-muted-foreground">
                        עודכן לאחרונה: אוקטובר 2026 | מופעל על ידי {legalName} (ח.פ/ע.מ {businessId})
                    </p>
                </div>

                {/* Mandatory Statutory Notice - Section 11 of Israeli Privacy Protection Law */}
                <div className="rounded-2xl border-2 border-amber-500/30 bg-amber-500/10 p-6 text-amber-950 dark:text-amber-100 shadow-soft">
                    <div className="flex items-start gap-3">
                        <ShieldAlert className="size-6 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                        <div className="space-y-2">
                            <h2 className="font-display text-base font-bold text-amber-900 dark:text-amber-200">
                                הודעת חובה לפי סעיף 11 לחוק הגנת הפרטיות, התשמ״א-1981
                            </h2>
                            <p className="text-sm leading-relaxed">
                                לידיעתך: <strong>לא חלה עליך חובה חוקית למסור את המידע האישי</strong>, ומסירתו נעשית בהסכמתך המלאה ומרצונך החופשי. יחד עם זאת, מסירת הפרטים הנדרשים (כגון שמך המלא, מספר הטלפון, וכתובת האספקה) נחוצה והכרחית לצורך אספקת השירותים, עיבוד ההזמנה, ביצוע המשלוח ומתן שירות לקוחות.
                            </p>
                        </div>
                    </div>
                </div>

                {/* Privacy Sections */}
                <div className="space-y-6 text-sm leading-relaxed text-foreground/90">
                    {/* Section 1 */}
                    <section className="rounded-2xl border border-border/70 bg-card p-6 shadow-soft space-y-3">
                        <h2 className="font-display text-lg font-bold flex items-center gap-2 text-foreground">
                            1. כללי והגדרות
                        </h2>
                        <p>
                            1.1. מדיניות זו מתארת כיצד <strong>{legalName}</strong> (ח.פ/ע.מ {businessId}, להלן: "העסק") אוסף, מעבד, שומר ומגן על המידע האישי של המשתמשים והמזמינים באתר.
                        </p>
                        <p>
                            1.2. העסק פועל בהתאם להוראות חוק הגנת הפרטיות, התשמ״א-1981, תקנות הגנת הפרטיות (אבטחת מידע), התשע״ז-2017, וכל הנחיות הרשות להגנת הפרטיות בישראל.
                        </p>
                    </section>

                    {/* Section 2 */}
                    <section className="rounded-2xl border border-border/70 bg-card p-6 shadow-soft space-y-3">
                        <h2 className="font-display text-lg font-bold flex items-center gap-2 text-foreground">
                            2. סוגי המידע הנאספים באתר
                        </h2>
                        <p>בעת השימוש באתר וביצוע הזמנה, עשוי להיאסף המידע הבא:</p>
                        <ul className="list-disc list-inside space-y-1.5 pe-2 text-xs">
                            <li><strong>פרטי זיהוי והתקשרות:</strong> שם מלא, מספר טלפון נייד, וכתובת דוא״ל.</li>
                            <li><strong>פרטי אספקה:</strong> כתובת מגורים/משלוח (רחוב, מספר בית, עיר, קומה, דירה, והערות כניסה לשליח).</li>
                            <li><strong>מיקום גיאוגרפי:</strong> אם בחרת להפעיל את איתור המיקום האוטומטי בדפדפן, נאספים קואורדינטות ה-GPS בדיוק הנדרש להשלמת הכתובת בלבד.</li>
                            <li><strong>פרטי הזמנות:</strong> היסטוריית מוצרים שהוזמנו, מועדי אספקה, סטטוס תשלום והעדפות משלוח.</li>
                            <li><strong>נתונים טכניים:</strong> כתובת IP, סוג דפדפן, ונתוני שימוש בסיסיים לשם שמירת סל הקניות ומניעת הונאות.</li>
                        </ul>
                    </section>

                    {/* Section 3 */}
                    <section className="rounded-2xl border border-border/70 bg-card p-6 shadow-soft space-y-3">
                        <h2 className="font-display text-lg font-bold flex items-center gap-2 text-foreground">
                            3. מטרות איסוף המידע
                        </h2>
                        <p>המידע האישי שנמסר על ידך ישמש אך ורק למטרות הבאות:</p>
                        <ul className="list-disc list-inside space-y-1 pe-2 text-xs">
                            <li>עיבוד ההזמנה, אפייתה ואספקתה עד לכתובת היעד.</li>
                            <li>יצירת קשר ותיאום מועדי המשלוח מול השליח.</li>
                            <li>הנפקת חשבוניות וקבלות כחוק וניהול רישום חשבונאי.</li>
                            <li>מענה לפניות שירות לקוחות וטיפול בבקשות ביטול עסקה כחוק.</li>
                            <li>אבטחת המידע, מניעת הונאות ושימוש לרעה באתר.</li>
                        </ul>
                    </section>

                    {/* Section 4 */}
                    <section className="rounded-2xl border border-border/70 bg-card p-6 shadow-soft space-y-3">
                        <h2 className="font-display text-lg font-bold flex items-center gap-2 text-foreground">
                            4. העברת מידע לצדדים שלישיים
                        </h2>
                        <p>
                            העסק אינו מוכר, משכיר או סוחר במידע האישי שלך עם צדדים שלישיים. מידע יועבר לצדדים שלישיים אך ורק במידה הנדרשת לצורך ביצוע ההזמנה:
                        </p>
                        <ul className="list-disc list-inside space-y-1 pe-2 text-xs">
                            <li><strong>שליחי החנות:</strong> מקבלים אך ורק את שם הלקוח, הטלפון והכתובת הנדרשים למסירת המשלוח.</li>
                            <li><strong>ספקי סליקה מורשים:</strong> לצורך ביצוע תשלומים בהתאם לתקן אבטחת המידע PCI-DSS (פרטי כרטיס אשראי אינם נשמרים בשרתי העסק).</li>
                            <li><strong>דרישה על פי חוק:</strong> אם יידרש העסק לעשות כן בצו שיפוטי או על פי הוראת רשות מוסמכת בדין.</li>
                        </ul>
                    </section>

                    {/* Section 5 - Rights under Sections 13 and 14 of the Israeli Privacy Protection Law */}
                    <section className="rounded-2xl border-2 border-primary/20 bg-primary/5 p-6 shadow-soft space-y-3">
                        <div className="flex items-center gap-2 text-primary">
                            <UserCheck className="size-5" />
                            <h2 className="font-display text-lg font-bold text-foreground">
                                5. זכות העיון במידע ותיקונו (סעיפים 13 ו-14 לחוק הגנת הפרטיות)
                            </h2>
                        </div>
                        <p>
                            בהתאם לסעיף 13 לחוק הגנת הפרטיות, התשמ״א-1981, כל אדם זכאי לעיין בעצמו, או על ידי בא-כוחו שהרשהו בכתב או על ידי אפוטרופסו, במידע שעליו המוחזק במאגר מידע.
                        </p>
                        <p>
                            בהתאם לסעיף 14 לחוק, אדם שעיין במידע ומצא כי אינו נכון, שלם, ברור או מעודכן, רשאי לפנות לבעל מאגר המידע בבקשה לתקן את המידע או למוחקו.
                        </p>
                        <p>
                            למימוש זכויות אלה, ניתן לפנות אלינו בכתב בדוא״ל: <a href={`mailto:${businessEmail}`} className="text-primary font-semibold underline" dir="ltr">{businessEmail}</a>, ואנו נטפל בפנייתך בתוך המועד הקבוע בדין.
                        </p>
                    </section>

                    {/* Section 6 - Data Security */}
                    <section className="rounded-2xl border border-border/70 bg-card p-6 shadow-soft space-y-3">
                        <h2 className="font-display text-lg font-bold flex items-center gap-2 text-foreground">
                            6. אבטחת מידע
                        </h2>
                        <p>
                            העסק מיישם אמצעי אבטחת מידע מתקדמים, הצפנת תקשורת SSL/TLS (HTTPS), הרשאות גישה מוגבלות ומנגנוני אבטחה בהתאם לתקנות הגנת הפרטיות (אבטחת מידע), התשע״ז-2017. האתר מתוכנן להגן על המידע האישי מפני גישה בלתי מורשית, חשיפה, שינוי או אובדן.
                        </p>
                    </section>

                    {/* Section 7 - Cookies & Local Storage */}
                    <section className="rounded-2xl border border-border/70 bg-card p-6 shadow-soft space-y-3">
                        <h2 className="font-display text-lg font-bold flex items-center gap-2 text-foreground">
                            7. עוגיות (Cookies) ואחסון מקומי
                        </h2>
                        <p>
                            האתר משתמש בקובצי עוגיות ובאחסון מקומי (Local Storage) של הדפדפן לצרכים תפעוליים חיוניים: שמירת פריטי סל הקניות, שמירת הגדרות הנגישות שנבחרו על ידך, וזיהוי סטטוס ההזמנה. באפשרותך למחוק או לחסום קבצים אלה באמצעות הגדרות הדפדפן שלך בכל עת.
                        </p>
                    </section>

                    {/* Section 8 - Contact */}
                    <section className="rounded-2xl border border-border/70 bg-card p-6 shadow-soft space-y-3">
                        <h2 className="font-display text-lg font-bold flex items-center gap-2 text-foreground">
                            8. יצירת קשר בנושאי פרטיות
                        </h2>
                        <p>
                            בכל שאלה או פנייה בנוגע למדיניות הפרטיות או למימוש זכויותיך כנושא מידע, ניתן לפנות אלינו:
                        </p>
                        <p className="text-xs text-muted-foreground">
                            {legalName} | כתובת: {businessAddress} | דוא״ל: <a href={`mailto:${businessEmail}`} className="text-primary font-semibold" dir="ltr">{businessEmail}</a> | טלפון: <span className="font-mono" dir="ltr">{businessPhone}</span>
                        </p>
                    </section>
                </div>
            </div>
        </StoreChrome>
    );
}
