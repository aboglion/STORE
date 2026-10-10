"use client";

import { useState } from "react";
import Link from "next/link";
import {
    Accessibility,
    Building2,
    CheckCircle2,
    Clock,
    FileText,
    Mail,
    MapPin,
    MessageSquare,
    Phone,
    Send,
    Shield,
} from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { AppSettings } from "@/types/database.types";

interface ContactViewProps {
    settings: AppSettings;
}

export function ContactView({ settings }: ContactViewProps) {
    const [name, setName] = useState("");
    const [phone, setPhone] = useState("");
    const [email, setEmail] = useState("");
    const [message, setMessage] = useState("");
    const [submitted, setSubmitted] = useState(false);

    const legalName = settings.legal_business_name || settings.store_name;
    const businessId = settings.business_id || "516000000";
    const businessAddress = settings.business_address || "רחוב הרצל 1, תל אביב-יפו";
    const businessPhone = settings.contact_phone || "03-0000000";
    const businessEmail = settings.business_email || "support@store.co.il";
    const businessHours = settings.business_hours || "א׳-ה׳ 08:00-20:00, ו׳ 08:00-14:00";

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        setSubmitted(true);
        toast.success("פנייתך התקבלה בהצלחה! ניצור עמך קשר בהקדם.");
    };

    return (
        <div className="mx-auto max-w-4xl space-y-8 pb-12">
            {/* Header */}
            <div className="space-y-3">
                <div className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-3.5 py-1 text-xs font-semibold text-primary">
                    <Building2 className="size-3.5" />
                    <span>שירות לקוחות ופרטי העסק הרשמיים</span>
                </div>
                <h1 className="font-display text-2xl font-extrabold tracking-tight sm:text-3xl">
                    יצירת קשר ושירות לקוחות
                </h1>
                <p className="text-sm text-muted-foreground">
                    אנו כאן לשירותך לכל שאלה, בירור הזמנה, משוב או פנייה.
                </p>
            </div>

            <div className="grid gap-8 lg:grid-cols-12">
                {/* Contact Form */}
                <div className="lg:col-span-7">
                    <Card className="rounded-2xl shadow-soft">
                        <CardHeader>
                            <CardTitle className="text-lg flex items-center gap-2">
                                <MessageSquare className="size-5 text-primary" />
                                שליחת הודעה לשירות הלקוחות
                            </CardTitle>
                            <CardDescription>
                                מלא/י את הפרטים ונחזור אליך בהקדם
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            {submitted ? (
                                <div className="rounded-2xl bg-emerald-500/10 p-6 text-center text-emerald-950 dark:text-emerald-100 space-y-3">
                                    <CheckCircle2 className="size-10 text-emerald-600 dark:text-emerald-400 mx-auto" />
                                    <h3 className="font-bold text-base">תודה רבה! פנייתך התקבלה בהצלחה</h3>
                                    <p className="text-xs text-muted-foreground">
                                        צוות שירות הלקוחות של {legalName} יחזור אליך בהקדם בשעות הפעילות.
                                    </p>
                                    <Button
                                        type="button"
                                        variant="outline"
                                        size="sm"
                                        onClick={() => {
                                            setSubmitted(false);
                                            setMessage("");
                                        }}
                                        className="rounded-xl mt-2"
                                    >
                                        שליחת פנייה נוספת
                                    </Button>
                                </div>
                            ) : (
                                <form onSubmit={handleSubmit} className="space-y-4">
                                    <div className="space-y-1.5">
                                        <Label htmlFor="cont-name">שם מלא *</Label>
                                        <Input
                                            id="cont-name"
                                            required
                                            value={name}
                                            onChange={(e) => setName(e.target.value)}
                                            placeholder="ישראל ישראלי"
                                            className="rounded-xl"
                                        />
                                    </div>

                                    <div className="grid gap-4 sm:grid-cols-2">
                                        <div className="space-y-1.5">
                                            <Label htmlFor="cont-phone">מספר טלפון *</Label>
                                            <Input
                                                id="cont-phone"
                                                required
                                                dir="ltr"
                                                value={phone}
                                                onChange={(e) => setPhone(e.target.value)}
                                                placeholder="050-1234567"
                                                className="rounded-xl"
                                            />
                                        </div>
                                        <div className="space-y-1.5">
                                            <Label htmlFor="cont-email">דוא״ל</Label>
                                            <Input
                                                id="cont-email"
                                                type="email"
                                                dir="ltr"
                                                value={email}
                                                onChange={(e) => setEmail(e.target.value)}
                                                placeholder="your@email.com"
                                                className="rounded-xl"
                                            />
                                        </div>
                                    </div>

                                    <div className="space-y-1.5">
                                        <Label htmlFor="cont-msg">תוכן ההודעה / הפנייה *</Label>
                                        <Textarea
                                            id="cont-msg"
                                            required
                                            rows={4}
                                            value={message}
                                            onChange={(e) => setMessage(e.target.value)}
                                            placeholder="כיצד נוכל לעזור?"
                                            className="rounded-xl"
                                        />
                                    </div>

                                    <Button type="submit" size="lg" className="w-full rounded-xl font-bold gap-2">
                                        <Send className="size-4" />
                                        שליחת הודעה
                                    </Button>
                                </form>
                            )}
                        </CardContent>
                    </Card>
                </div>

                {/* Business Info Details */}
                <div className="space-y-6 lg:col-span-5">
                    <Card className="rounded-2xl shadow-soft">
                        <CardHeader className="pb-3">
                            <CardTitle className="text-base flex items-center gap-2">
                                <Building2 className="size-4 text-primary" />
                                פרטי העסק המלאים
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-3.5 text-xs">
                            <div className="rounded-xl bg-muted/40 p-3 space-y-1">
                                <span className="text-muted-foreground block font-medium">שם העסק הרשמי:</span>
                                <span className="font-bold text-foreground text-sm">{legalName}</span>
                                <span className="text-muted-foreground block">ח.פ / ע.מ: {businessId}</span>
                            </div>

                            <div className="flex items-center gap-3 rounded-xl bg-muted/40 p-3">
                                <Phone className="size-4 text-primary shrink-0" />
                                <div>
                                    <span className="text-muted-foreground block font-medium">טלפון שירות לקוחות:</span>
                                    <a href={`tel:${businessPhone}`} className="text-primary font-mono font-bold text-sm hover:underline" dir="ltr">
                                        {businessPhone}
                                    </a>
                                </div>
                            </div>

                            <div className="flex items-center gap-3 rounded-xl bg-muted/40 p-3">
                                <Mail className="size-4 text-primary shrink-0" />
                                <div>
                                    <span className="text-muted-foreground block font-medium">דוא״ל רשמי:</span>
                                    <a href={`mailto:${businessEmail}`} className="text-primary font-semibold hover:underline" dir="ltr">
                                        {businessEmail}
                                    </a>
                                </div>
                            </div>

                            <div className="flex items-center gap-3 rounded-xl bg-muted/40 p-3">
                                <MapPin className="size-4 text-primary shrink-0" />
                                <div>
                                    <span className="text-muted-foreground block font-medium">כתובת העסק:</span>
                                    <span className="font-medium text-foreground">{businessAddress}</span>
                                </div>
                            </div>

                            <div className="flex items-center gap-3 rounded-xl bg-muted/40 p-3">
                                <Clock className="size-4 text-primary shrink-0" />
                                <div>
                                    <span className="text-muted-foreground block font-medium">שעות מענה ופעילות:</span>
                                    <span className="font-medium text-foreground">{businessHours}</span>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Quick Consumer Navigation */}
                    <Card className="rounded-2xl border-primary/20 bg-primary/5 shadow-soft">
                        <CardContent className="p-4 space-y-2 text-xs">
                            <div className="font-bold text-foreground mb-1">קישורים ישירים לצרכן:</div>
                            <div className="flex flex-col gap-1.5">
                                <Link href="/cancellation" className="text-primary font-semibold hover:underline flex items-center gap-1.5">
                                    <FileText className="size-3.5" />
                                    טופס הודעה על ביטול עסקה (חוק הגנת הצרכן) ←
                                </Link>
                                <Link href="/accessibility" className="text-primary font-semibold hover:underline flex items-center gap-1.5">
                                    <Accessibility className="size-3.5" />
                                    הצהרת נגישות ורכז נגישות (ת״י 5568) ←
                                </Link>
                                <Link href="/terms" className="text-primary font-semibold hover:underline flex items-center gap-1.5">
                                    <Shield className="size-3.5" />
                                    תקנון האתר ותנאי שימוש מלאים ←
                                </Link>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    );
}
