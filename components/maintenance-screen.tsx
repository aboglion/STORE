"use client";

import { useEffect, useState } from "react";
import { Database, Loader2, RefreshCw, ShieldAlert, Sparkles, Wrench } from "lucide-react";

export function MaintenanceScreen() {
    const [checking, setChecking] = useState(false);

    useEffect(() => {
        // Poll maintenance status every 3 seconds
        const interval = setInterval(async () => {
            try {
                setChecking(true);
                const res = await fetch("/api/maintenance/status", { cache: "no-store" });
                if (res.ok) {
                    const data = await res.json();
                    if (!data.active) {
                        // Maintenance has ended! Refresh immediately to show the live store
                        window.location.reload();
                    }
                }
            } catch {
                /* non-fatal: network may be temporarily restarting during DB restore */
            } finally {
                setChecking(false);
            }
        }, 3000);

        return () => clearInterval(interval);
    }, []);

    return (
        <div className="relative min-h-screen w-full flex flex-col items-center justify-center overflow-hidden bg-[#090d16] text-white p-4 font-sans select-none">
            {/* Ambient background glows */}
            <div className="absolute -top-40 -left-40 size-96 rounded-full bg-amber-500/10 blur-[120px] pointer-events-none" />
            <div className="absolute -bottom-40 -right-40 size-96 rounded-full bg-primary/15 blur-[140px] pointer-events-none" />

            <div className="relative z-10 w-full max-w-lg text-center flex flex-col items-center">
                {/* Store badge */}
                <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-amber-500/30 bg-amber-500/10 text-amber-300 text-xs font-medium mb-6">
                    <Sparkles className="size-3.5" />
                    <span>גולדן מארקט • جولدن ماركت</span>
                </div>

                {/* Animated central icon container */}
                <div className="relative mb-6">
                    <div className="absolute -inset-4 rounded-3xl bg-gradient-to-r from-amber-500/20 via-primary/20 to-amber-500/20 blur-xl animate-pulse" />
                    <div className="relative flex size-24 items-center justify-center rounded-3xl border border-amber-500/30 bg-[#121826] shadow-2xl">
                        <Wrench className="size-10 text-amber-400 animate-spin [animation-duration:8s]" />
                        <div className="absolute -bottom-2 -right-2 flex size-8 items-center justify-center rounded-xl bg-amber-500 text-black shadow-lg">
                            <Database className="size-4" />
                        </div>
                    </div>
                </div>

                {/* Titles */}
                <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white mb-2">
                    האתר נמצא כרגע בעדכון נתונים קצר
                </h1>
                <p className="text-base text-amber-200/80 font-medium mb-4" dir="rtl">
                    النظام قيد التحديث المؤقت حاليًا
                </p>

                {/* Descriptions */}
                <p className="text-sm text-slate-300/90 leading-relaxed max-w-md mb-2" dir="rtl">
                    אנו מבצעים פעולת תחזוקה ושחזור נתונים מבוקרת כדי להבטיח את איכות השירות והמלאי. הפעולה אורכת רגעים בודדים בלבד.
                </p>
                <p className="text-xs text-slate-400 leading-relaxed max-w-md mb-8" dir="rtl">
                    نقوم حاليًا بعملية صيانة وتحديث للبيانات لضمان أفضل خدمة. ستكتمل العملية خلال لحظات وسيعود الموقع للعمل تلقائيًا.
                </p>

                {/* Live auto-refresh status pill */}
                <div className="inline-flex items-center gap-3 px-4 py-2.5 rounded-2xl border border-slate-700/60 bg-slate-900/80 backdrop-blur-md text-xs text-slate-300 shadow-inner">
                    <Loader2 className={`size-4 text-amber-400 animate-spin ${checking ? "[animation-duration:0.6s]" : ""}`} />
                    <span>מתחבר מחדש אוטומטית ברגע סיום הפעולה...</span>
                </div>

                {/* Manual retry button */}
                <button
                    onClick={() => window.location.reload()}
                    className="mt-4 inline-flex items-center gap-2 text-xs text-slate-400 hover:text-white transition-colors"
                >
                    <RefreshCw className="size-3" />
                    <span>רענון ידני עכשיו</span>
                </button>
            </div>
        </div>
    );
}
