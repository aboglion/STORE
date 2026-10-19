import { NextResponse } from "next/server";

import { getMaintenanceStatus } from "@/lib/server/backups";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Public status endpoint to check if the store is currently under maintenance.
 * Used by the maintenance screen's heartbeat to auto-refresh the customer
 * as soon as a restore finishes.
 */
export async function GET() {
    const status = getMaintenanceStatus();
    return NextResponse.json(status, {
        headers: {
            "Cache-Control": "no-store, no-cache, must-revalidate",
        },
    });
}
