"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
    Clock,
    Headphones,
    Loader2,
    Lock,
    MessageCircle,
    Phone,
    RefreshCw,
    Shield,
    Sparkles,
    Wrench,
} from "lucide-react";

import type { MaintenanceStatus } from "@/types/backups";

export interface MaintenanceScreenProps {
    initialStatus?: MaintenanceStatus | null;
    storeName?: string;
    contactPhone?: string;
}

export function MaintenanceScreen({
    initialStatus,
    storeName = "גולדן מארקט",
    contactPhone = "08-6000000",
}: MaintenanceScreenProps) {
    const [status, setStatus] = useState(
        initialStatus ?? {
            active: true,
            reason: "manual",
        }
    );
    const [checking, setChecking] = useState(false);

    useEffect(() => {
        // Poll maintenance status every 3 seconds
        const interval = setInterval(async () => {
            try {
                setChecking(true);
                const res = await fetch("/api/maintenance/status", {
                    cache: "no-store",
                });
                if (res.ok) {
                    const data = await res.json();
                    if (!data.active) {
                        // Maintenance has ended! Refresh immediately to show the live store
                        window.location.reload();
                        return;
                    }
                    setStatus(data);
                }
            } catch {
                /* non-fatal: network may be temporarily restarting during DB restore */
            } finally {
                setChecking(false);
            }
        }, 3000);

        return () => clearInterval(interval);
    }, []);

    const isRestore = status?.reason === "restore" || Boolean(status?.backupId);

    // Format phone for tel: and whatsapp:
    const cleanPhone = (contactPhone || "").replace(/[^0-9]/g, "");
    const waNumber = cleanPhone.startsWith("0")
        ? `972${cleanPhone.slice(1)}`
        : cleanPhone;

    return (
        <div className="relative min-h-screen w-full flex flex-col items-center justify-between overflow-x-hidden bg-[#070a13] text-white p-4 sm:p-6 font-sans select-none">
            {/* Ambient background glows */}
            <div className="pointer-events-none fixed -top-40 -left-40 size-[500px] rounded-full bg-amber-500/15 blur-[140px]" />
            <div className="pointer-events-none fixed -bottom-40 -right-40 size-[500px] rounded-full bg-orange-600/15 blur-[150px]" />
            <div className="pointer-events-none fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 size-[600px] rounded-full bg-amber-400/5 blur-[160px]" />

            {/* Subtle grid pattern overlay */}
            <div
                className="pointer-events-none fixed inset-0 opacity-[0.07]"
                style={{
                    backgroundImage: `radial-gradient(circle at 1px 1px, #f59e0b 1px, transparent 0)`,
                    backgroundSize: "28px 28px",
                }}
            />

            {/* Header pill / Logo */}
            <header className="relative z-10 w-full max-w-xl pt-4 flex flex-col sm:flex-row items-center justify-between gap-3 text-center sm:text-right">
                <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full border border-amber-500/30 bg-amber-500/10 text-amber-300 text-xs font-semibold shadow-soft">
                    <Sparkles className="size-3.5 text-amber-400" />
                    <span>{storeName} • جولدن ماركت</span>
                </div>

                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-amber-500/25 bg-[#121828]/80 text-amber-200/90 text-[11px] font-medium backdrop-blur-md">
                    <span className="relative flex size-2">
                        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-amber-400 opacity-75" />
                        <span className="relative inline-flex size-2 rounded-full bg-amber-500" />
                    </span>
                    <span>עבודות תחזוקה • أعمال صيانة</span>
                </div>
            </header>

            {/* Central Card */}
            <main className="relative z-10 my-auto w-full max-w-xl py-6">
                <div className="relative rounded-3xl border border-amber-500/30 bg-[#0d1322]/85 p-6 sm:p-10 shadow-2xl backdrop-blur-xl text-center flex flex-col items-center overflow-hidden">
                    {/* Top gradient highlight strip */}
                    <div className="pointer-events-none absolute top-0 inset-x-8 h-[2px] bg-gradient-to-r from-transparent via-amber-400/80 to-transparent" />

                    {/* Animated central icon container */}
                    <div className="relative mb-6">
                        <div className="absolute -inset-4 rounded-3xl bg-gradient-to-r from-amber-500/25 via-orange-500/20 to-amber-500/25 blur-xl animate-pulse" />
                        <div className="relative flex size-24 items-center justify-center rounded-3xl border border-amber-500/40 bg-gradient-to-b from-[#182035] to-[#0f1627] shadow-2xl">
                            <Wrench className="size-11 text-amber-400 animate-spin [animation-duration:12s]" />
                            <div className="absolute -bottom-2 -right-2 flex size-8 items-center justify-center rounded-xl bg-gradient-to-tr from-amber-600 to-amber-400 text-black shadow-lg">
                                <Shield className="size-4 text-black stroke-[2.5]" />
                            </div>
                        </div>
                    </div>

                    {/* Titles */}
                    <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white mb-2 leading-tight">
                        {isRestore
                            ? "האתר נמצא כרגע בעדכון נתונים קצר"
                            : "האתר בהפסקת שירות לצורך עבודות תחזוקה"}
                    </h1>
                    <p className="text-sm sm:text-base text-amber-300/90 font-medium mb-5" dir="rtl">
                        {isRestore
                            ? "النظام قيد التحديث المؤقت للبيانات حالياً"
                            : "الموقع في فترة صيانة وتطوير مؤقتة"}
                    </p>

                    {/* Descriptions */}
                    <p className="text-sm text-slate-300 leading-relaxed max-w-md mb-2" dir="rtl">
                        {isRestore
                            ? "אנו מבצעים פעולת תחזוקה ושחזור נתונים מבוקרת כדי להבטיח את איכות השירות והמלאי. הפעולה אורכת רגעים בודדים בלבד."
                            : "אנו מבצעים שדרוג מערכת, רענון קטלוג ובדיקות מלאי מקיפות כדי להעניק לכם את חוויית הקנייה הטובה, המהירה והבטוחה ביותר."}
                    </p>
                    <p className="text-xs text-slate-400 leading-relaxed max-w-md mb-6" dir="rtl">
                        {isRestore
                            ? "نقوم بعملية صيانة وتحديث للبيانات لضمان أفضل خدمة. ستكتمل العملية خلال لحظات وسيعود الموقع للعمل تلقائيًا."
                            : "نقوم بأعمال صيانة وتطوير شاملة لضمان تقديم أفضل خدمة وتجربة تسوق سريعة ومثالية. سيعود الموقع للعمل قريباً جداً."}
                    </p>

                    {/* Custom admin message / reason highlight if provided */}
                    {(status?.message || (status?.reason && status.reason !== "manual" && status.reason !== "restore")) && (
                        <div className="w-full max-w-md mb-5 rounded-2xl border border-amber-500/30 bg-amber-500/10 p-3.5 text-right" dir="rtl">
                            <div className="flex items-center gap-2 text-xs font-bold text-amber-300 mb-1">
                                <MessageCircle className="size-3.5" />
                                <span>הודעת צוות החנות:</span>
                            </div>
                            <p className="text-xs sm:text-sm text-amber-100 font-medium leading-relaxed">
                                {status.message || status.reason}
                            </p>
                        </div>
                    )}

                    {/* Expected duration pill */}
                    {status?.expectedDuration && (
                        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full border border-slate-700 bg-slate-800/80 text-xs text-slate-200 mb-6">
                            <Clock className="size-3.5 text-amber-400" />
                            <span>זמן חזרה משוער לפעילות:</span>
                            <strong className="text-amber-300 font-bold">{status.expectedDuration}</strong>
                        </div>
                    )}

                    {/* Live auto-refresh status pill */}
                    <div className="w-full max-w-md flex flex-col items-center gap-2 p-3.5 rounded-2xl border border-slate-700/60 bg-slate-900/80 backdrop-blur-md text-xs text-slate-300 shadow-inner">
                        <div className="flex items-center gap-2.5">
                            <Loader2
                                className={`size-4 text-amber-400 animate-spin ${
                                    checking ? "[animation-duration:0.6s]" : "[animation-duration:2s]"
                                }`}
                            />
                            <span className="font-medium text-slate-200">
                                המערכת תתחבר מחדש אוטומטית ברגע סיום העבודות
                            </span>
                        </div>
                        <span className="text-[11px] text-slate-400">
                            سيتم تحديث الصفحة وإعادة فتح الموقع تلقائياً فور انتهاء الصيانة
                        </span>
                    </div>

                    {/* Contact & Support Section */}
                    {contactPhone && (
                        <div className="mt-6 pt-5 border-t border-slate-800/80 w-full flex flex-col sm:flex-row items-center justify-center gap-3">
                            <span className="text-xs text-slate-400 flex items-center gap-1.5">
                                <Headphones className="size-3.5 text-amber-400" />
                                <span>לבירורים דחופים:</span>
                            </span>

                            <div className="flex items-center gap-2">
                                <a
                                    href={`tel:${contactPhone}`}
                                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-700 bg-slate-800/80 text-xs font-semibold text-slate-200 hover:text-white hover:border-amber-500/50 transition-colors"
                                >
                                    <Phone className="size-3 text-amber-400" />
                                    <span dir="ltr">{contactPhone}</span>
                                </a>

                                {waNumber && (
                                    <a
                                        href={`https://wa.me/${waNumber}`}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-emerald-500/30 bg-emerald-500/10 text-xs font-semibold text-emerald-300 hover:bg-emerald-500/20 transition-colors"
                                    >
                                        <span>וואטסאפ</span>
                                    </a>
                                )}
                            </div>
                        </div>
                    )}

                    {/* Manual retry button */}
                    <button
                        onClick={() => window.location.reload()}
                        className="mt-4 inline-flex items-center gap-1.5 text-xs text-slate-400 hover:text-amber-300 transition-colors"
                    >
                        <RefreshCw className="size-3" />
                        <span>רענון ידני עכשיו</span>
                    </button>
                </div>
            </main>

            {/* Footer with admin login link */}
            <footer className="relative z-10 w-full max-w-xl pb-3 flex items-center justify-between text-xs text-slate-500">
                <span>© {new Date().getFullYear()} {storeName}</span>

                <Link
                    href="/admin/login"
                    className="inline-flex items-center gap-1 text-slate-500 hover:text-amber-400 transition-colors"
                >
                    <Lock className="size-3" />
                    <span>כניסת מנהלים</span>
                </Link>
            </footer>
        </div>
    );
}
