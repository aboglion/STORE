"use client";

import { useState, useTransition } from "react";
import Link from "next/link";

import {
    CheckCircle2,
    Mail,
    MapPin,
    MessageSquare,
    Phone,
    Scale,
    Shield,
    Undo2,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { submitCancellationNotice, type CancellationResult } from "@/lib/actions/cancellation";
import type { AppSettings } from "@/types/database.types";

interface CancellationViewProps {
    settings: AppSettings;
}

export function CancellationView({ settings }: CancellationViewProps) {
    const [pending, startTransition] = useTransition();

    const [fullName, setFullName] = useState("");
    const [phone, setPhone] = useState("");
    const [idNumber, setIdNumber] = useState("");
    const [email, setEmail] = useState("");
    const [orderNumber, setOrderNumber] = useState("");
    const [itemsDescription, setItemsDescription] = useState("");
    const [reason, setReason] = useState<
        "defect" | "mismatch" | "not_delivered" | "customer_remorse" | "other"
    >("customer_remorse");
    const [isProtected, setIsProtected] = useState(false);
    const [notes, setNotes] = useState("");
    const [result, setResult] = useState<CancellationResult | null>(null);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        startTransition(async () => {
            const res = await submitCancellationNotice({
                full_name: fullName,
                phone,
                id_number: idNumber,
                email,
                order_number: orderNumber,
                items_description: itemsDescription,
                reason,
                is_protected_population: isProtected,
                notes,
            });
            setResult(res);
            if (res.ok) {
                window.scrollTo({ top: 0, behavior: "smooth" });
            }
        });
    };

    const businessPhone = settings.contact_phone || "03-0000000";
    const businessEmail = settings.business_email || "support@store.co.il";
    const businessAddress = settings.business_address || "רחוב הרצל 1, תל אביב-יפו";
    const legalName = settings.legal_business_name || settings.store_name;

    return (
        <div className="mx-auto max-w-4xl space-y-8 pb-12">
            {/* Header */}
            <div className="space-y-3">
                <div className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-3.5 py-1 text-xs font-semibold text-primary">
                    <Scale className="size-3.5" />
                    <span>חוק הגנת הצרכן, התשמ״א-1981 — סעיף 14ט</span>
                </div>
                <h1 className="font-display text-2xl font-extrabold tracking-tight sm:text-3xl">
                    הודעה על ביטול עסקה ומדיניות ביטולים
                </h1>
                <p className="text-sm leading-relaxed text-muted-foreground sm:text-base">
                    בהתאם להוראות חוק הגנת הצרכן, הינך רשאי/ת למסור הודעת ביטול עסקה באמצעות טופס מקוון זה, או בכל אחת מדרכי ההתקשרות המפורטות להלן.
                </p>
            </div>

            {/* Submission confirmation banner */}
            {result?.ok && (
                <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-6 text-emerald-950 dark:text-emerald-100 animate-pop-in">
                    <div className="flex items-start gap-3">
                        <CheckCircle2 className="size-6 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
                        <div className="space-y-2">
                            <h2 className="font-display text-lg font-bold text-emerald-800 dark:text-emerald-300">
                                הודעת הביטול נקלטה בהצלחה במערכת
                            </h2>
                            <p className="text-sm">
                                הודעת הביטול נמסרה כחוק. פרטי פנייתך הועברו לצוות שירות הלקוחות של {legalName} להמשך טיפול בהתאם להוראות הדין.
                            </p>
                            <div className="mt-3 inline-block rounded-xl bg-background/80 px-4 py-2 font-mono text-sm font-bold text-foreground shadow-sm">
                                מספר אסמכתא לביטול: {result.referenceNumber}
                            </div>
                            <p className="text-xs text-muted-foreground">
                                מומלץ לשמור את מספר האסמכתא או לצלם מסך. נציג שירות ייצור עמך קשר תוך פרק הזמן הקבוע בחוק.
                            </p>
                        </div>
                    </div>
                </div>
            )}

            <div className="grid gap-8 lg:grid-cols-12">
                {/* Form column */}
                <div className="lg:col-span-7">
                    <Card className="rounded-2xl shadow-soft">
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2 text-lg">
                                <Undo2 className="size-5 text-primary" />
                                טופס מקוון למסירת הודעת ביטול עסקה
                            </CardTitle>
                            <CardDescription>
                                מלא/י את הפרטים שלהלן לצורך קליטת הודעת הביטול
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <form onSubmit={handleSubmit} className="space-y-4">
                                <div className="grid gap-4 sm:grid-cols-2">
                                    <div className="space-y-1.5">
                                        <Label htmlFor="c-name">שם מלא של הצרכן *</Label>
                                        <Input
                                            id="c-name"
                                            required
                                            value={fullName}
                                            onChange={(e) => setFullName(e.target.value)}
                                            placeholder="ישראל ישראלי"
                                            className="rounded-xl"
                                        />
                                    </div>
                                    <div className="space-y-1.5">
                                        <Label htmlFor="c-phone">מספר טלפון *</Label>
                                        <Input
                                            id="c-phone"
                                            required
                                            dir="ltr"
                                            value={phone}
                                            onChange={(e) => setPhone(e.target.value)}
                                            placeholder="050-1234567"
                                            className="rounded-xl"
                                        />
                                    </div>
                                </div>

                                <div className="grid gap-4 sm:grid-cols-2">
                                    <div className="space-y-1.5">
                                        <Label htmlFor="c-id">מספר תעודת זהות</Label>
                                        <Input
                                            id="c-id"
                                            dir="ltr"
                                            value={idNumber}
                                            onChange={(e) => setIdNumber(e.target.value)}
                                            placeholder="מספר ת.ז (אופציונלי)"
                                            className="rounded-xl"
                                        />
                                    </div>
                                    <div className="space-y-1.5">
                                        <Label htmlFor="c-order">מספר הזמנה *</Label>
                                        <Input
                                            id="c-order"
                                            required
                                            dir="ltr"
                                            value={orderNumber}
                                            onChange={(e) => setOrderNumber(e.target.value)}
                                            placeholder="לדוגמה: 20261009-000001"
                                            className="rounded-xl font-mono"
                                        />
                                    </div>
                                </div>

                                <div className="space-y-1.5">
                                    <Label htmlFor="c-email">כתובת דוא״ל למענה</Label>
                                    <Input
                                        id="c-email"
                                        type="email"
                                        dir="ltr"
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                        placeholder="your@email.com"
                                        className="rounded-xl"
                                    />
                                </div>

                                <div className="space-y-1.5">
                                    <Label htmlFor="c-items">פרטי המוצר / מוצרים לביטול</Label>
                                    <Input
                                        id="c-items"
                                        value={itemsDescription}
                                        onChange={(e) => setItemsDescription(e.target.value)}
                                        placeholder="כל ההזמנה, או פירוט מוצרים ספציפיים"
                                        className="rounded-xl"
                                    />
                                </div>

                                <div className="space-y-1.5">
                                    <Label htmlFor="c-reason">סיבת הביטול *</Label>
                                    <Select
                                        value={reason}
                                        onValueChange={(v) =>
                                            setReason(
                                                v as
                                                | "defect"
                                                | "mismatch"
                                                | "not_delivered"
                                                | "customer_remorse"
                                                | "other"
                                            )
                                        }
                                    >
                                        <SelectTrigger id="c-reason" className="rounded-xl">
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="customer_remorse">
                                                חרטה / ביטול לבקשת הלקוח
                                            </SelectItem>
                                            <SelectItem value="defect">
                                                פגם או קלקול במוצר
                                            </SelectItem>
                                            <SelectItem value="mismatch">
                                                אי-התאמה בין המוצר לפרטים שנמסרו
                                            </SelectItem>
                                            <SelectItem value="not_delivered">
                                                אי-אספקה במועד שנקבע
                                            </SelectItem>
                                            <SelectItem value="other">סיבה אחרת</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>

                                {/* Protected population checkbox - Amendment 47 to Consumer Protection Law */}
                                <div className="rounded-xl border border-border/80 bg-muted/40 p-3.5 space-y-2">
                                    <div className="flex items-start gap-2.5">
                                        <Checkbox
                                            id="c-protected"
                                            checked={isProtected}
                                            onCheckedChange={(checked) => setIsProtected(Boolean(checked))}
                                            className="mt-0.5"
                                        />
                                        <div className="text-xs space-y-1">
                                            <Label
                                                htmlFor="c-protected"
                                                className="font-semibold text-foreground cursor-pointer"
                                            >
                                                הצהרה על השתייכות לאוכלוסייה מוגנת (סעיף 14ג1 לחוק)
                                            </Label>
                                            <p className="text-muted-foreground leading-relaxed">
                                                אני אדם עם מוגבלות, אזרח ותיק (מעל גיל 65), או עולה חדש (עד 5 שנים מעלייה).
                                                החוק מעניק לאוכלוסיות אלה זכות לביטול עסקה בתוך <strong>4 חודשים</strong>.
                                            </p>
                                        </div>
                                    </div>
                                </div>

                                <div className="space-y-1.5">
                                    <Label htmlFor="c-notes">פירוט והערות נוספות (אופציונלי)</Label>
                                    <Textarea
                                        id="c-notes"
                                        rows={3}
                                        value={notes}
                                        onChange={(e) => setNotes(e.target.value)}
                                        placeholder="הערות או פרטים רלוונטיים נוספים..."
                                        className="rounded-xl"
                                    />
                                </div>

                                <Button
                                    type="submit"
                                    disabled={pending}
                                    size="lg"
                                    className="w-full rounded-xl font-bold"
                                >
                                    {pending ? "שולח הודעת ביטול..." : "שליחת הודעת ביטול עסקה כחוק"}
                                </Button>
                            </form>
                        </CardContent>
                    </Card>
                </div>

                {/* Statutory summary & other contact channels */}
                <div className="space-y-6 lg:col-span-5">
                    {/* Other statutory channels */}
                    <Card className="rounded-2xl shadow-soft">
                        <CardHeader className="pb-3">
                            <CardTitle className="text-base flex items-center gap-2">
                                <Phone className="size-4 text-primary" />
                                דרכים נוספות למסירת הודעת ביטול
                            </CardTitle>
                            <CardDescription className="text-xs">
                                באפשרותך למסור הודעת ביטול בכל אחת מהדרכים הבאות:
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-3 text-xs">
                            <div className="flex items-center gap-3 rounded-xl bg-muted/50 p-2.5">
                                <Phone className="size-4 text-primary shrink-0" />
                                <div>
                                    <span className="font-semibold block">בטלפון / מענה אנושי:</span>
                                    <a href={`tel:${businessPhone}`} className="text-primary font-mono font-bold hover:underline" dir="ltr">
                                        {businessPhone}
                                    </a>
                                </div>
                            </div>

                            <div className="flex items-center gap-3 rounded-xl bg-muted/50 p-2.5">
                                <Mail className="size-4 text-primary shrink-0" />
                                <div>
                                    <span className="font-semibold block">בדוא״ל שירות הלקוחות:</span>
                                    <a href={`mailto:${businessEmail}`} className="text-primary hover:underline" dir="ltr">
                                        {businessEmail}
                                    </a>
                                </div>
                            </div>

                            <div className="flex items-center gap-3 rounded-xl bg-muted/50 p-2.5">
                                <MessageSquare className="size-4 text-primary shrink-0" />
                                <div>
                                    <span className="font-semibold block">בוואטסאפ:</span>
                                    <span className="font-mono" dir="ltr">{businessPhone}</span>
                                </div>
                            </div>

                            <div className="flex items-center gap-3 rounded-xl bg-muted/50 p-2.5">
                                <MapPin className="size-4 text-primary shrink-0" />
                                <div>
                                    <span className="font-semibold block">בדואר רשום או בבית העסק:</span>
                                    <span className="text-muted-foreground">{businessAddress}</span>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Statutory Consumer Protection summary */}
                    <Card className="rounded-2xl border-primary/20 bg-primary/5 shadow-soft">
                        <CardHeader className="pb-3">
                            <CardTitle className="text-base flex items-center gap-2">
                                <Shield className="size-4 text-primary" />
                                תמצית זכויות הצרכן לפי החוק
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-3 text-xs leading-relaxed text-muted-foreground">
                            <div>
                                <strong className="text-foreground block font-semibold mb-0.5">
                                    • מועד הביטול בעסקת מכר מרחוק:
                                </strong>
                                ניתן לבטל עסקת מכר מרחוק תוך 14 יום מיום קבלת המוצר או מיום קבלת מסמך פרטי העסקה, לפי המאוחר מביניהם.
                            </div>

                            <div>
                                <strong className="text-foreground block font-semibold mb-0.5">
                                    • אוכלוסיות מיוחדות (4 חודשים):
                                </strong>
                                אדם עם מוגבלות, אזרח ותיק (מגיל 65) ועולה חדש רשאים לבטל עסקה תוך 4 חודשים מיום קבלת הנכס או מסמך הגילוי (סעיף 14ג1).
                            </div>

                            <div>
                                <strong className="text-foreground block font-semibold mb-0.5">
                                    • דמי ביטול כחוק:
                                </strong>
                                בביטול עקב חרטה ינוכו דמי ביטול בשיעור של עד 5% ממחיר העסקה או 100 ש״ח (לפי הנמוך). בביטול עקב פגם, אי-התאמה או אי-אספקה — לא ייגבו דמי ביטול כלל ויושב מלוא התשלום.
                            </div>

                            <div>
                                <strong className="text-foreground block font-semibold mb-0.5">
                                    • סייגים — טובין פסידים ומזון טרי (סעיף 14ג(ד)):
                                </strong>
                                בהתאם להוראות החוק, מוצרי מזון פסידים הנאפים במיוחד והמתקלקלים במהירות אינם ניתנים לביטול לאחר אפייתם/אספקתם אלא עקב פגם או קלקול. מוצרים שאינם פסידים (כגון קפה ארוז, כלים) ניתנים לביטול מלא.
                            </div>

                            <div className="pt-2 border-t border-border/60">
                                <Link href="/terms" className="text-primary font-semibold hover:underline">
                                    לקריאת התקנון ותנאי השימוש המלאים ←
                                </Link>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    );
}
