"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";

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
import { deletePromotion } from "@/lib/actions/promotions";

export function DeletePromotionButton({ promotionId }: { promotionId: string }) {
    const router = useRouter();
    const t = useTranslations("admin.promotions");
    const [pending, startTransition] = useTransition();

    function handleDelete() {
        startTransition(async () => {
            const res = await deletePromotion(promotionId);
            if (res?.error) {
                toast.error(res.error);
                return;
            }
            toast.success(t("deletedToast"));
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
                    <AlertDialogTitle>{t("deleteTitle")}</AlertDialogTitle>
                    <AlertDialogDescription>
                        {t("deleteDesc")}
                    </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                    <AlertDialogCancel>{t("cancel")}</AlertDialogCancel>
                    <AlertDialogAction onClick={handleDelete} disabled={pending}>
                        {pending ? <Loader2 className="size-4 animate-spin" /> : t("delete")}
                    </AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
    );
}