import type { Metadata } from "next";
import Link from "next/link";
import { FileText, Scale } from "lucide-react";

import { StoreChrome } from "@/components/store/store-chrome";
import { getSettings } from "@/lib/data/storefront";

export const metadata: Metadata = {
    title: "תקנון האתר ותנאי שימוש | דיני מדינת ישראל",
    description: "תקנון האתר ותנאי השימוש הרשמיים, תנאי רכישה, אספקה, מדיניות ביטול עסקה לפי חוק הגנת הצרכן.",
};

export default async function TermsPage() {
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
                        <Scale className="size-3.5" />
                        <span>מסמך משפטי מחייב | הדין הישראלי</span>
                    </div>
                    <h1 className="font-display text-2xl font-extrabold tracking-tight sm:text-3xl">
                        תקנון האתר ותנאי שימוש
                    </h1>
                    <p className="text-sm text-muted-foreground">
                        עודכן לאחרונה: אוקטובר 2026 | מופעל על ידי {legalName} (ח.פ/ע.מ {businessId})
                    </p>
                </div>

                {/* Terms Content */}
                <div className="space-y-6 text-sm leading-relaxed text-foreground/90">
                    {/* Section 1 */}
                    <section className="rounded-2xl border border-border/70 bg-card p-6 shadow-soft space-y-3">
                        <h2 className="font-display text-lg font-bold flex items-center gap-2 text-foreground">
                            1. כללי ומבוא
                        </h2>
                        <p>
                            1.1. אתר זה מופעל ומנוהל על ידי <strong>{legalName}</strong> (להלן: "העסק" או "החברה"), ח.פ / ע.מ <strong>{businessId}</strong>, שכתובתה הרשומה היא <strong>{businessAddress}</strong>.
                        </p>
                        <p>
                            1.2. השימוש באתר, לרבות גלישה ו/או ביצוע הזמנות ורכישות, כפוף להוראות תקנון זה. עצם השימוש באתר ו/או ביצוע הזמנה מהווים הסכמה מלאה, מפורשת ובלתי חוזרת לכל תנאי התקנון, ומצהירים כי לא תהא לרוכש או למי מטעמו כל טענה ו/או תביעה כנגד העסק או מנהליו.
                        </p>
                        <p>
                            1.3. התקנון מנוסח בלשון זכר מטעמי נוחות בלבד, ומתייחס לכל המגדרים באופן שווה.
                        </p>
                    </section>

                    {/* Section 2 */}
                    <section className="rounded-2xl border border-border/70 bg-card p-6 shadow-soft space-y-3">
                        <h2 className="font-display text-lg font-bold flex items-center gap-2 text-foreground">
                            2. כשרות משפטית לשימוש באתר
                        </h2>
                        <p>
                            2.1. כל אדם רשאי לבצע הזמנות באתר בתנאי שהוא כשיר לבצע פעולות משפטיות מחייבות, מלאו לו 18 שנים, וברשותו תעודת זהות תקפה ו/או אמצעי תשלום תקף המוכר בישראל.
                        </p>
                        <p>
                            2.2. ביצוע הזמנה על ידי קטין (מתחת לגיל 18) מותנה בהסכמת הוריו ו/או אפוטרופסיו החוקיים.
                        </p>
                    </section>

                    {/* Section 3 */}
                    <section className="rounded-2xl border border-border/70 bg-card p-6 shadow-soft space-y-3">
                        <h2 className="font-display text-lg font-bold flex items-center gap-2 text-foreground">
                            3. מחירים, מע״מ ותשלום
                        </h2>
                        <p className="font-semibold text-primary">
                            3.1. בהתאם לחוק הגנת הצרכן, התשמ״א-1981, כל המחירים המופיעים באתר כוללים מס ערך מוסף (מע״מ) כדין בשיעורו החוקי, אלא אם צוין במפורש אחרת לגבי אזורים פטורים (כגון אילת).
                        </p>
                        <p>
                            3.2. המחיר הסופי והמחייב כולל דמי משלוח יוצג לצרכן באופן ברור ומלא במסך סיכום ההזמנה בטרם אישור ביצוע העסקה.
                        </p>
                        <p>
                            3.3. אמצעי התשלום המקובלים באתר כוללים מזומן במסירה, כרטיס אשראי אצל השליח באמצעות מסוף סליקה מאובטח, או סליקה מקוונת מאובטחת בהתאם לאפשרויות הזמינות בקופה.
                        </p>
                    </section>

                    {/* Section 4 */}
                    <section className="rounded-2xl border border-border/70 bg-card p-6 shadow-soft space-y-3">
                        <h2 className="font-display text-lg font-bold flex items-center gap-2 text-foreground">
                            4. אספקה ומשלוחים
                        </h2>
                        <p>
                            4.1. אספקת המוצרים תתבצע לכתובת שהוזנה על ידי הלקוח בעת ביצוע ההזמנה, ובאזורי החלוקה המוגדרים של העסק בלבד.
                        </p>
                        <p>
                            4.2. זמני האספקה המשוערים יוצגו ללקוח. העסק עושה את מירב המאמצים לספק את המשלוח במועד המהיר ביותר האפשרי, תוך הקפדה על טריות מרבית ואיכות המוצרים.
                        </p>
                        <p>
                            4.3. במקרה שהלקוח לא יהיה נוכח בכתובת בעת הגעת השליח, ייצור השליח קשר טלפוני עם הלקוח. במידה שהלקוח יבקש להשאיר את המשלוח ליד הדלת או במקום אחר, האחריות על טריות המוצרים ושלמותם מרגע הנחתם תחול על הלקוח בלבד.
                        </p>
                    </section>

                    {/* Section 5 - Cancellation & Returns (Israeli Consumer Protection Law) */}
                    <section className="rounded-2xl border-2 border-primary/30 bg-primary/5 p-6 shadow-soft space-y-4">
                        <div className="flex items-center gap-2 text-primary">
                            <Scale className="size-5" />
                            <h2 className="font-display text-lg font-bold text-foreground">
                                5. מדיניות ביטול עסקה והחזרות (חוק הגנת הצרכן)
                            </h2>
                        </div>
                        <p>
                            5.1. <strong>זכות ביטול עסקת מכר מרחוק:</strong> בהתאם להוראות סעיף 14ג לחוק הגנת הצרכן, התשמ״א-1981 (להלן: "החוק"), הצרכן רשאי לבטל עסקת מכר מרחוק בתוך 14 (ארבעה עשר) ימים מיום קבלת המוצר או מיום קבלת מסמך פרטי העסקה, לפי המאוחר מביניהם.
                        </p>
                        <p>
                            5.2. <strong>אוכלוסיות מיוחדות (תיקון 47 לחוק):</strong> צרכן שהוא אדם עם מוגבלות, אזרח ותיק (מגיל 65 ומעלה) או עולה חדש (עד 5 שנים מיום קבלת תעודת עולה), רשאי לבטל את העסקה בתוך <strong>4 (ארבעה) חודשים</strong> מיום עשיית העסקה, מיום קבלת הנכס או מיום קבלת מסמך הגילוי (לפי המאוחר), ובלבד שההתקשרות כללה שיחה/תקשורת אלקטרונית.
                        </p>
                        <p>
                            5.3. <strong>סייגים לזכות הביטול — טובין פסידים (סעיף 14ג(ד) לחוק):</strong> בהתאם להוראות החוק המפורשות, זכות הביטול אינה חלה על "טובין פסידים" — קרי מוצרי מזון טריים, מאפים טריים הנאפים ונמכרים ביום ייצורם ומתקלקלים במהירות. לפיכך, לא ניתן לבטל הזמנה של מוצרי מאפה טריים לאחר תחילת הכנתם או אספקתם, אלא אם נמצא בהם פגם או קלקול. לגבי מוצרים ארוזים שאינם פסידים (כגון פולי קפה סגורים, כלים ואביזרים), זכות הביטול עומדת בעינה כחוק.
                        </p>
                        <p>
                            5.4. <strong>דמי ביטול כחוק:</strong>
                        </p>
                        <ul className="list-disc list-inside space-y-1 pe-2 text-xs">
                            <li>
                                <strong>ביטול עקב פגם, אי-התאמה או אי-אספקה במועד:</strong> לא ייגבו דמי ביטול כלל, ויוחזר מלוא הסכום ששולם תוך 14 יום מקבלת הודעת הביטול.
                            </li>
                            <li>
                                <strong>ביטול שלא עקב פגם (חרטה):</strong> בעסקאות הכשירות לביטול שאינן נוגעות לטובין פסידים, ייגבו דמי ביטול בשיעור שלא יעלה על 5% ממחיר העסקה או 100 ש״ח, לפי הנמוך מביניהם, כקבוע בחוק.
                            </li>
                        </ul>
                        <p>
                            5.5. <strong>טופס ייעודי למסירת הודעת ביטול (סעיף 14ט):</strong> בהתאם לחוק, העסק מעמיד לרשות הצרכן טופס מקוון ייעודי למסירת הודעת ביטול עסקה:
                        </p>
                        <div className="pt-1">
                            <Link
                                href="/cancellation"
                                className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2 font-bold text-primary-foreground shadow transition hover:opacity-95"
                            >
                                <FileText className="size-4" />
                                <span>למעבר לטופס ביטול עסקה מקוון ←</span>
                            </Link>
                        </div>
                    </section>

                    {/* Section 6 */}
                    <section className="rounded-2xl border border-border/70 bg-card p-6 shadow-soft space-y-3">
                        <h2 className="font-display text-lg font-bold flex items-center gap-2 text-foreground">
                            6. הגנת הפרטיות ואבטחת מידע
                        </h2>
                        <p>
                            6.1. העסק מתחייב לפעול בהתאם לחוק הגנת הפרטיות, התשמ״א-1981, ותקנות הגנת הפרטיות (אבטחת מידע), התשע״ז-2017.
                        </p>
                        <p>
                            6.2. פרטי הלקוח ישמשו אך ורק לצורך תפעול ההזמנה, אספקת המוצרים ומתן שירות לקוחות. לקריאת הפירוט המלא, עיינו ב<Link href="/privacy" className="text-primary underline">מדיניות הפרטיות</Link> של האתר.
                        </p>
                    </section>

                    {/* Section 7 */}
                    <section className="rounded-2xl border border-border/70 bg-card p-6 shadow-soft space-y-3">
                        <h2 className="font-display text-lg font-bold flex items-center gap-2 text-foreground">
                            7. נגישות האתר
                        </h2>
                        <p>
                            העסק מחויב להנגשת האתר לאנשים עם מוגבלות בהתאם לחוק שוויון זכויות לאנשים עם מוגבלות ותקן ישראלי ת״י 5568 ברמה AA. לפרטים נוספים, רכז הנגישות והסדרי הנגישות, עיינו ב<Link href="/accessibility" className="text-primary underline">הצהרת הנגישות</Link>.
                        </p>
                    </section>

                    {/* Section 8 - Jurisdiction */}
                    <section className="rounded-2xl border border-border/70 bg-card p-6 shadow-soft space-y-3">
                        <h2 className="font-display text-lg font-bold flex items-center gap-2 text-foreground">
                            8. דין חל וסמכות שיפוט ייחודית
                        </h2>
                        <p>
                            8.1. על תקנון זה, פרשנותו, תוקפו וכל הנובע ממנו יחולו אך ורק <strong>דיני מדינת ישראל</strong>.
                        </p>
                        <p>
                            8.2. סמכות השיפוט הבלעדית והייחודית בכל סכסוך או עניין הנובע משימוש באתר ו/או מביצוע עסקאות בו תהא מסורה לבתי המשפט המוסמכים במחוז תל אביב או במחוז המרכז בישראל.
                        </p>
                    </section>

                    {/* Section 9 - Contact */}
                    <section className="rounded-2xl border border-border/70 bg-card p-6 shadow-soft space-y-3">
                        <h2 className="font-display text-lg font-bold flex items-center gap-2 text-foreground">
                            9. שירות לקוחות ופרטי העסק
                        </h2>
                        <p>
                            בכל שאלה, פנייה, בקשה או בירור, ניתן לפנות אל שירות הלקוחות של העסק:
                        </p>
                        <ul className="space-y-1 text-xs text-muted-foreground pe-2">
                            <li>• <strong>שם העסק:</strong> {legalName} (ח.פ/ע.מ {businessId})</li>
                            <li>• <strong>כתובת:</strong> {businessAddress}</li>
                            <li>• <strong>טלפון:</strong> <a href={`tel:${businessPhone}`} className="text-primary font-mono font-bold" dir="ltr">{businessPhone}</a></li>
                            <li>• <strong>דוא״ל:</strong> <a href={`mailto:${businessEmail}`} className="text-primary" dir="ltr">{businessEmail}</a></li>
                            <li>• <strong>שעות פעילות:</strong> {settings.business_hours || "א׳-ה׳ 08:00-20:00, ו׳ 08:00-14:00"}</li>
                        </ul>
                    </section>
                </div>
            </div>
        </StoreChrome>
    );
}
