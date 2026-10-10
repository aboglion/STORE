"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

import { createClient } from "@/lib/supabase/client";

/**
 * Subscribes to the public order status feed and refreshes the current
 * admin page whenever an order changes (new order, claim, status, ETA,
 * cancellation). Renders nothing.
 */
export function OrdersRealtime() {
    const router = useRouter();

    useEffect(() => {
        const supabase = createClient();
        const channel = supabase
            .channel("admin-orders-feed")
            .on(
                "postgres_changes",
                {
                    event: "*",
                    schema: "public",
                    table: "order_status_updates",
                },
                () => {
                    router.refresh();
                }
            )
            .subscribe();

        return () => {
            void supabase.removeChannel(channel);
        };
    }, [router]);

    return null;
}