"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";

import { Loader2, Trash2 } from "lucide-react";
import { toast } from "sonner";

import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
    AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { deleteCategory } from "@/lib/actions/products";

export function DeleteCategoryButton({ categoryId }: { categoryId: string }) {
    const router = useRouter();
    const [pending, startTransition] = useTransition();

    function handleDelete() {
        startTransition(async () => {
            const res = await deleteCategory(categoryId);
            if (res?.error) {
                toast.error(res.error);
                return;
            }
            toast.success("הקטגוריה נמחקה");
            router.refresh();
        });
    }

    return (
        <AlertDialog>
            <AlertDialogTrigger asChild>
                <Button variant="ghost" size="icon" disabled={pending}>
                    <Trash2 className="size-4 text-destructive" />
                </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
                <AlertDialogHeader>
                    <AlertDialogTitle>למחוק את הקטגוריה?</AlertDialogTitle>
                    <AlertDialogDescription>
                        מוצרים בקטגוריה יישארו ללא קטגוריה. הפעולה לא ניתנת לביטול.
                    </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                    <AlertDialogCancel>ביטול</AlertDialogCancel>
                    <AlertDialogAction onClick={handleDelete} disabled={pending}>
                        {pending ? <Loader2 className="size-4 animate-spin" /> : "מחיקה"}
                    </AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
    );
}