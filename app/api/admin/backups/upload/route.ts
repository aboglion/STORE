import { createWriteStream, mkdirSync } from "fs";
import path from "path";
import { Readable } from "stream";
import { pipeline } from "stream/promises";

import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

import { requireAdmin } from "@/lib/auth";
import {
    BACKUP_ROOT,
    processUploadedBackup,
    runRestore,
} from "@/lib/server/backups";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Admin-only backup upload endpoint.
 * Streams the uploaded file chunk-by-chunk directly to disk, avoiding memory bloat
 * for large storage archives or dumps.
 *
 * Query params:
 *   - name: Original filename (e.g. "db.dump", "storage.tar.gz", "backup.tar.gz", "backup.zip")
 *   - targetId: Optional existing backup ID to append storage files to
 *   - restoreNow: "true" to trigger runRestore immediately after successful upload & validation
 */
export async function POST(request: NextRequest) {
    try {
        await requireAdmin();
    } catch {
        return NextResponse.json({ ok: false, error: "UNAUTHORIZED" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const filename = searchParams.get("name") || "db.dump";
    const targetId = searchParams.get("targetId") || undefined;
    const restoreNow = searchParams.get("restoreNow") === "true";

    if (!request.body) {
        return NextResponse.json(
            { ok: false, error: "NO_BODY", message: "No file content received" },
            { status: 400 }
        );
    }

    const stagingDir = path.join(BACKUP_ROOT, ".staging");
    try {
        mkdirSync(stagingDir, { recursive: true });
    } catch (err) {
        return NextResponse.json(
            { ok: false, error: "DIR_ERROR", message: String(err) },
            { status: 500 }
        );
    }

    const tempFilePath = path.join(
        stagingDir,
        `upload_${Date.now()}_${Math.random().toString(36).slice(2, 8)}.tmp`
    );

    try {
        // Stream directly to disk
        const fileStream = createWriteStream(tempFilePath);
        // Cast request.body to Web ReadableStream
        await pipeline(Readable.fromWeb(request.body as unknown as import("stream/web").ReadableStream), fileStream);

        // Process archive or dump
        const result = await processUploadedBackup({
            tempFilePath,
            originalFileName: filename,
            targetBackupId: targetId,
        });

        if (!result.ok || !result.backupId) {
            return NextResponse.json(result, { status: 400 });
        }

        // If user requested immediate restore, execute restore right now
        if (restoreNow) {
            const restoreResult = await runRestore(result.backupId);
            if (!restoreResult.ok) {
                return NextResponse.json({
                    ok: true,
                    backupId: result.backupId,
                    restored: false,
                    restoreError: restoreResult.code,
                    message: restoreResult.message,
                });
            }
            return NextResponse.json({
                ok: true,
                backupId: result.backupId,
                restored: true,
            });
        }

        return NextResponse.json({
            ok: true,
            backupId: result.backupId,
            hasDb: result.hasDb,
            hasStorage: result.hasStorage,
            restored: false,
        });
    } catch (error) {
        return NextResponse.json(
            {
                ok: false,
                error: "UPLOAD_FAILED",
                message: error instanceof Error ? error.message : String(error),
            },
            { status: 500 }
        );
    }
}
