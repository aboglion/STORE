"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Bike, Check, Loader2 } from "lucide-react";
import { toast } from "sonner";

import {
    createCourierAction,
    updateCourierAction,
} from "@/lib/actions/couriers";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import type { Courier, CourierVehicle } from "@/types/database.types";

const VEHICLES: CourierVehicle[] = ["car", "scooter", "bike", "foot"];

const COLOR_PRESETS = [
    "#e11d48",
    "#2563eb",
    "#16a34a",
    "#d97706",
    "#7c3aed",
    "#0891b2",
    "#db2777",
    "#4f46e5",
];

interface CourierDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    courier?: Courier | null;
}

export function CourierDialog({
    open,
    onOpenChange,
    courier = null,
}: CourierDialogProps) {
    const t = useTranslations("admin.couriers");
    const router = useRouter();

    const [fullName, setFullName] = useState("");
    const [phone, setPhone] = useState("");
    const [vehicle, setVehicle] = useState<CourierVehicle>("car");
    const [color, setColor] = useState(COLOR_PRESETS[0]);
    const [isActive, setIsActive] = useState(true);
    const [notes, setNotes] = useState("");
    const [pending, setPending] = useState(false);

    // Pre-fill when editing.
    useEffect(() => {
        if (!open) return;
        setFullName(courier?.full_name ?? "");
        setPhone(courier?.phone_display ?? "");
        setVehicle(courier?.vehicle_type ?? "car");
        setColor(courier?.color ?? COLOR_PRESETS[0]);
        setIsActive(courier?.is_active ?? true);
        setNotes(courier?.notes ?? "");
    }, [open, courier]);

    async function handleSave() {
        if (fullName.trim().length < 2 || phone.trim().length < 7) {
            toast.error(t("errors.invalidData"));
            return;
        }
        setPending(true);
        const values = {
            full_name: fullName.trim(),
            phone: phone.trim(),
            vehicle_type: vehicle,
            color,
            is_active: isActive,
            notes: notes.trim() || null,
        };

        const res = courier
            ? await updateCourierAction({ id: courier.id, values })
            : await createCourierAction(values);
        setPending(false);

        if (res?.error) {
            toast.error(res.error);
            return;
        }

        toast.success(courier ? t("updatedToast") : t("createdToast"));
        onOpenChange(false);
        router.refresh();
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <Bike className="size-4 text-primary" />
                        {courier ? t("editTitle") : t("newTitle")}
                    </DialogTitle>
                    <DialogDescription>{t("formHint")}</DialogDescription>
                </DialogHeader>

                <div className="grid gap-4">
                    <div className="grid gap-2">
                        <Label htmlFor="courier-name">{t("name")}</Label>
                        <Input
                            id="courier-name"
                            value={fullName}
                            onChange={(e) => setFullName(e.target.value)}
                            placeholder={t("namePlaceholder")}
                            dir="auto"
                        />
                    </div>

                    <div className="grid gap-2">
                        <Label htmlFor="courier-phone">{t("phone")}</Label>
                        <Input
                            id="courier-phone"
                            value={phone}
                            onChange={(e) => setPhone(e.target.value)}
                            placeholder="050-123-4567"
                            dir="ltr"
                            inputMode="tel"
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                        <div className="grid gap-2">
                            <Label>{t("vehicle")}</Label>
                            <Select
                                value={vehicle}
                                onValueChange={(v) => setVehicle(v as CourierVehicle)}
                            >
                                <SelectTrigger>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    {VEHICLES.map((v) => (
                                        <SelectItem key={v} value={v}>
                                            {t(`vehicleTypes.${v}`)}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="grid gap-2">
                            <Label>{t("color")}</Label>
                            <div className="flex h-9 flex-wrap items-center gap-1.5">
                                {COLOR_PRESETS.map((c) => (
                                    <button
                                        key={c}
                                        type="button"
                                        aria-label={c}
                                        className={cn(
                                            "size-6 rounded-full transition-transform",
                                            color === c && "scale-110 ring-2 ring-offset-1 ring-foreground"
                                        )}
                                        style={{ backgroundColor: c }}
                                        onClick={() => setColor(c)}
                                    >
                                        {color === c && (
                                            <Check className="mx-auto size-3.5 text-white" />
                                        )}
                                    </button>
                                ))}
                                <input
                                    type="color"
                                    value={color}
                                    onChange={(e) => setColor(e.target.value)}
                                    className="size-6 cursor-pointer rounded-full border-0 bg-transparent p-0"
                                    aria-label={t("customColor")}
                                />
                            </div>
                        </div>
                    </div>

                    <div className="grid gap-2">
                        <Label>{t("notes")}</Label>
                        <Textarea
                            value={notes}
                            onChange={(e) => setNotes(e.target.value)}
                            rows={2}
                            placeholder={t("notesPlaceholder")}
                            dir="auto"
                        />
                    </div>

                    <label className="flex items-center gap-2 text-sm">
                        <Checkbox
                            checked={isActive}
                            onCheckedChange={(v) => setIsActive(v === true)}
                        />
                        {t("isActive")}
                    </label>
                </div>

                <DialogFooter>
                    <Button
                        type="button"
                        variant="ghost"
                        onClick={() => onOpenChange(false)}
                        disabled={pending}
                    >
                        {t("cancel")}
                    </Button>
                    <Button
                        type="button"
                        onClick={handleSave}
                        disabled={pending}
                    >
                        {pending && <Loader2 className="size-4 animate-spin" />}
                        {courier ? t("saveChanges") : t("create")}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}