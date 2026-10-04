import type { Metadata } from "next";
import Link from "next/link";

import { CheckCircle2, PackageCheck } from "lucide-react";

import { StoreChrome } from "@/components/store/store-chrome";
import { Button } from "@/components/ui/button";
import { formatILS } from "@/lib/utils/currency";

export const metadata: Metadata = {
    title: "ההזמנה התקבלה",
};

export default async function OrderSuccessPage({
    params,
    searchParams,
}: {
    params: Promise<{ orderNumber: string }>;
    searchParams: Promise<{ total?: string }>;
}) {
    const { orderNumber } = await params;
    const { total } = await searchParams;
    const totalAgorot = total ? Number(total) : null;

    return (
        <StoreChrome>
            <div className="mx-auto flex max-w-md flex-col items-center gap-6 py-10 text-center">
                <div className="flex size-20 items-center justify-center rounded-full bg-green-100">
                    <CheckCircle2 className="size-10 text-green-600" />
                </div>
                <div>
                    <h1 className="text-2xl font-bold">ההזמנה התקבלה!</h1>
                    <p className="mt-2 text-muted-foreground">
                        תודה על ההזמנה. נחזור אליך בקרוב לאישור.
                    </p>
                </div>

                <div className="w-full rounded-xl border p-4">
                    <div className="flex items-center justify-between">
                        <span className="text-sm text-muted-foreground">מספר הזמנה</span>
                        <span className="font-mono text-sm font-semibold" dir="ltr">
                            {orderNumber}
                        </span>
                    </div>
                    {totalAgorot != null && (
                        <div className="mt-2 flex items-center justify-between border-t pt-2">
                            <span className="text-sm text-muted-foreground">סה"כ לתשלום</span>
                            <span className="font-semibold">{formatILS(totalAgorot)}</span>
                        </div>
                    )}
                </div>

                <div className="flex flex-col items-center gap-2 text-sm text-muted-foreground">
                    <PackageCheck className="size-5" />
                    שומרים את הסל שלך? ההזמנה שלך כבר בטוחה אצלנו.
                </div>

                <Button asChild>
                    <Link href="/">חזרה לקטלוג</Link>
                </Button>
            </div>
        </StoreChrome>
    );
}