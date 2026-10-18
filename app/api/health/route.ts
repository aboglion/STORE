import { NextResponse } from "next/server";
import { createPublicClient } from "@/lib/supabase/public";

export const dynamic = "force-dynamic";

export async function GET() {
    try {
        const supabase = createPublicClient();
        const { error } = await supabase.from("settings").select("key").limit(1);

        if (error) {
            return NextResponse.json(
                { status: "error", error: error.message },
                { status: 500 }
            );
        }

        return NextResponse.json({
            status: "ok",
            timestamp: new Date().toISOString(),
        });
    } catch (err: unknown) {
        const message = err instanceof Error ? err.message : String(err);
        return NextResponse.json(
            { status: "error", error: message },
            { status: 500 }
        );
    }
}
