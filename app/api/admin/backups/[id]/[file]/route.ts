import { stat } from "fs/promises";
import { createReadStream } from "fs";
import { Readable } from "stream";

import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

import { requireAdmin } from "@/lib/auth";
import { getBackupFilePath } from "@/lib/server/backups";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const CONTENT_TYPES: Record<string, string> = {
    "db.dump": "application/octet-stream",
    "storage.tar.gz": "application/gzip",
    "meta.json": "application/json",
};

/**
 * Admin-only backup download.
 * Path is strictly validated server-side (id pattern + file whitelist),
 * preventing any path traversal. Streams the file to the browser.
 */
export async function GET(
    _request: NextRequest,
    { params }: { params: Promise<{ id: string; file: string }> }
) {
    await requireAdmin();

    const { id, file } = await params;
    const filePath = getBackupFilePath(id, file);
    if (!filePath) {
        return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 });
    }

    const info = await stat(filePath);
    const stream = Readable.toWeb(createReadStream(filePath)) as ReadableStream;

    return new Response(stream, {
        headers: {
            "Content-Type": CONTENT_TYPES[file] ?? "application/octet-stream",
            "Content-Length": String(info.size),
            "Content-Disposition": `attachment; filename="${file}"`,
            "Cache-Control": "private, no-store",
        },
    });
}
