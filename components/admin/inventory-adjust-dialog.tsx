"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import { Loader2, PackagePlus } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { adjustStock } from "@/lib/actions/products";

export function InventoryAdjustDialog({
    productId,
    productName,
    currentStock,
}: {
    productId: string;
    productName: string;
    currentStock: number;
}) {
    const router = useRouter();
    const [open, setOpen] = useState(false);
    const [pending, startTransition] = useTransition();
    const [quantity, setQuantity] = useState(String(currentStock));
    const [reason, setReason] = useState("");

    function handleSubmit() {
        const parsed = Number(quantity);
        if (!Number.isInteger(parsed) || parsed < 0) {
            toast.error("נא להזין כמות תקינה");
            return;
        }

        startTransition(async () => {
            const res = await adjustStock(productId, parsed, reason);
            if (res?.error) {
                toast.error(res.error);
                return;
            }
            toast.success("המלאי עודכן");
            setOpen(false);
            router.refresh();
        });
    }

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button variant="outline" size="sm">
                    <PackagePlus className="size-4" />
                    עדכון
                </Button>
            </DialogTrigger>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>עדכון מלאי</DialogTitle>
                    <DialogDescription>
                        {productName} — כמות נוכחית: {currentStock}
                    </DialogDescription>
                </DialogHeader>

                <div className="grid gap-4">
                    <div className="grid gap-2">
                        <Label htmlFor="quantity">כמות חדשה במלאי</Label>
                        <Input
                            id="quantity"
                            type="number"
                            min={0}
                            value={quantity}
                            onChange={(e) => setQuantity(e.target.value)}
                        />
                    </div>
                    <div className="grid gap-2">
                        <Label htmlFor="reason">סיבת השינוי (אופציונלי)</Label>
                        <Input
                            id="reason"
                            value={reason}
                            onChange={(e) => setReason(e.target.value)}
                            placeholder="למשל: הגעת סחורה"
                        />
                    </div>
                </div>

                <DialogFooter>
                    <Button onClick={handleSubmit} disabled={pending}>
                        {pending && <Loader2 className="size-4 animate-spin" />}
                        שמירת מלאי
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}