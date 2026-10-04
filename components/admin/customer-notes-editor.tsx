"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import { Loader2, Save } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { updateCustomerNotes } from "@/lib/actions/customers";

export function CustomerNotesEditor({
    customerId,
    initialNotes,
}: {
    customerId: string;
    initialNotes: string | null;
}) {
    const router = useRouter();
    const [notes, setNotes] = useState(initialNotes ?? "");
    const [pending, startTransition] = useTransition();

    function handleSave() {
        startTransition(async () => {
            const res = await updateCustomerNotes({
                customer_id: customerId,
                notes,
            });
            if (res?.error) {
                toast.error(res.error);
                return;
            }
            toast.success("ההערות נשמרו");
            router.refresh();
        });
    }

    return (
        <div className="grid gap-2">
            <Textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="הערות פנימיות על הלקוח..."
                rows={4}
            />
            <div>
                <Button
                    size="sm"
                    variant="outline"
                    onClick={handleSave}
                    disabled={pending}
                >
                    {pending ? (
                        <Loader2 className="size-4 animate-spin" />
                    ) : (
                        <Save className="size-4" />
                    )}
                    שמירת הערות
                </Button>
            </div>
        </div>
    );
}