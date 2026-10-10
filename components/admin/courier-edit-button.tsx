"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Pencil } from "lucide-react";

import { CourierDialog } from "@/components/admin/courier-dialog";
import { Button } from "@/components/ui/button";
import type { Courier } from "@/types/database.types";

export function CourierEditButton({ courier }: { courier: Courier }) {
    const t = useTranslations("admin.couriers");
    const [open, setOpen] = useState(false);

    return (
        <>
            <Button
                type="button"
                variant="outline"
                className="rounded-xl"
                onClick={() => setOpen(true)}
            >
                <Pencil className="size-4" />
                {t("edit")}
            </Button>
            <CourierDialog open={open} onOpenChange={setOpen} courier={courier} />
        </>
    );
}