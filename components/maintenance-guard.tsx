"use client";

import { useEffect, useState } from "react";
import type { MaintenanceStatus } from "@/types/backups";
import { MaintenanceScreen } from "./maintenance-screen";

/**
 * Global client-side maintenance guard.
 *
 * For visitors already on the site during a restore operation:
 * - Polls /api/maintenance/status every 3 seconds.
 * - When active, smoothly displays the full-screen luxury maintenance overlay.
 * - Automatically reloads the site when the restore finishes.
 */
export function MaintenanceGuard() {
    const [inMaintenance, setInMaintenance] = useState(false);
    const [status, setStatus] = useState<MaintenanceStatus | null>(null);

    useEffect(() => {
        let mounted = true;

        async function checkStatus() {
            try {
                const res = await fetch("/api/maintenance/status", { cache: "no-store" });
                if (res.ok) {
                    const data = await res.json();
                    if (mounted) {
                        const active = Boolean(data.active);
                        setInMaintenance(active);
                        if (active) setStatus(data);
                    }
                }
            } catch {
                /* non-fatal */
            }
        }

        checkStatus();
        const interval = setInterval(checkStatus, 3000);

        return () => {
            mounted = false;
            clearInterval(interval);
        };
    }, []);

    if (!inMaintenance) return null;

    return (
        <div className="fixed inset-0 z-[9999] overflow-y-auto bg-[#070a13]">
            <MaintenanceScreen initialStatus={status} />
        </div>
    );
}
